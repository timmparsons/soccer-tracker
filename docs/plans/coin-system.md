# Plan: Coach Coin-Awarding System

## Context
Coaches need a way to reward players who perform well with virtual "coins." Coins are awarded manually by a coach (coach picks the amount), stored on the player's profile, and displayed to the player on their profile screen. No redemption flow yet — just the award and balance display. A `coin_transactions` table provides an audit trail.

---

## Step 1 — DB Migrations (run in Supabase SQL editor)

**A: Add coins column to profiles**
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 0;
```

**B: Create coin_transactions table**
```sql
CREATE TABLE IF NOT EXISTS coin_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  player_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      integer NOT NULL CHECK (amount > 0),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_player_id
  ON coin_transactions (player_id, created_at DESC);

ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_insert_own" ON coin_transactions
  FOR INSERT WITH CHECK (coach_id = auth.uid());

CREATE POLICY "player_read_own" ON coin_transactions
  FOR SELECT USING (player_id = auth.uid() OR coach_id = auth.uid());
```

---

## Step 2 — Types (`types/index.ts`)

Append two new types:

```typescript
export type CoinTransaction = {
  id: string;
  coach_id: string;
  player_id: string;
  amount: number;
  note: string | null;
  created_at: string;
};

export type AwardCoinsInput = {
  coachId: string;
  playerId: string;
  amount: number;
  note: string | null;
  playerPushToken: string | null;
  playerName: string;
};
```

---

## Step 3 — New hook: `hooks/useCoins.ts`

Mirror the pattern in `hooks/useCoachChallenges.ts`.

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AwardCoinsInput } from '@/types';

export function usePlayerCoins(playerId: string | undefined) {
  return useQuery({
    queryKey: ['coins', playerId],
    enabled: !!playerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', playerId!)
        .single();
      if (error) throw error;
      return (data?.coins ?? 0) as number;
    },
  });
}

export function useAwardCoins() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ coachId, playerId, amount, note, playerPushToken }: AwardCoinsInput) => {
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', playerId)
        .single();
      if (fetchError || !profileData) throw fetchError ?? new Error('Profile not found');

      const newBalance = (profileData.coins ?? 0) + amount;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coins: newBalance })
        .eq('id', playerId);
      if (updateError) throw updateError;

      const { error: txError } = await supabase
        .from('coin_transactions')
        .insert({ coach_id: coachId, player_id: playerId, amount, note });
      if (txError) throw txError;

      if (playerPushToken) {
        supabase.functions
          .invoke('send-push', {
            body: {
              to: playerPushToken,
              title: 'You earned coins! 🪙',
              body: note
                ? `Your coach awarded you ${amount} coin${amount !== 1 ? 's' : ''}: ${note}`
                : `Your coach awarded you ${amount} coin${amount !== 1 ? 's' : ''}!`,
            },
          })
          .catch((err: unknown) => console.warn('Push notification failed:', err));
      }

      return newBalance;
    },
    onSuccess: (_newBalance, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coins', vars.playerId] });
      queryClient.invalidateQueries({ queryKey: ['profile', vars.playerId] });
    },
  });
}
```

---

## Step 4 — Coach UI (`app/(tabs)/coach.tsx`)

### 4a. Add imports
```typescript
import { useAwardCoins, usePlayerCoins } from '@/hooks/useCoins';
```

### 4b. Expand `modalTab` type (line 61)
```typescript
// Before:
const [modalTab, setModalTab] = useState<'log' | 'edit'>('log');
// After:
const [modalTab, setModalTab] = useState<'log' | 'edit' | 'coins'>('log');
```

### 4c. Add coin state vars (near line 61)
```typescript
const [coinAmount, setCoinAmount] = useState('');
const [coinNote, setCoinNote] = useState('');
const [awardingCoins, setAwardingCoins] = useState(false);
```

### 4d. Add hook calls (unconditionally, before any early returns)
```typescript
const { mutateAsync: awardCoins } = useAwardCoins();
const { data: selectedPlayerCoins = 0 } = usePlayerCoins(selectedPlayer?.id);
```

### 4e. Reset coin state in `handlePlayerPress` and `closeModal`
```typescript
setCoinAmount('');
setCoinNote('');
```

### 4f. Add `handleAwardCoins` handler
```typescript
const handleAwardCoins = async () => {
  const amount = parseInt(coinAmount, 10);
  if (!amount || amount <= 0 || isNaN(amount)) {
    Alert.alert('Invalid Amount', 'Please enter a valid coin amount.');
    return;
  }
  if (!selectedPlayer || !user?.id) return;

  setAwardingCoins(true);
  try {
    const { data: playerProfile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', selectedPlayer.id)
      .single();

    await awardCoins({
      coachId: user.id,
      playerId: selectedPlayer.id,
      amount,
      note: coinNote.trim() || null,
      playerPushToken: playerProfile?.expo_push_token ?? null,
      playerName: selectedPlayer.display_name || selectedPlayer.name,
    });

    Alert.alert(
      'Coins Awarded!',
      `${amount} coin${amount !== 1 ? 's' : ''} sent to ${selectedPlayer.display_name || selectedPlayer.name}`
    );
    setCoinAmount('');
    setCoinNote('');
    setModalVisible(false);
  } catch {
    Alert.alert('Error', 'Failed to award coins. Please try again.');
  } finally {
    setAwardingCoins(false);
  }
};
```

### 4g. Add "Coins" tab to modal tab bar (line ~793)
Add a third tab alongside "Log" and "Edit". Shorten existing labels to "Log" and "Edit" to avoid crowding:

```tsx
<TouchableOpacity
  style={[styles.modalTab, modalTab === 'coins' && styles.modalTabActive]}
  onPress={() => setModalTab('coins')}
>
  <Text style={[styles.modalTabText, modalTab === 'coins' && styles.modalTabTextActive]}>
    Coins
  </Text>
</TouchableOpacity>
```

### 4h. Add Coins tab content panel (after the 'edit' conditional block)
```tsx
{modalTab === 'coins' && (
  <>
    <View style={styles.coinBalanceRow}>
      <Text style={styles.coinBalanceLabel}>Current Balance</Text>
      <Text style={styles.coinBalanceValue}>🪙 {selectedPlayerCoins}</Text>
    </View>
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Coin Amount *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 5"
        placeholderTextColor="#9CA3AF"
        keyboardType="number-pad"
        value={coinAmount}
        onChangeText={setCoinAmount}
      />
    </View>
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Reason (optional)</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="e.g. Great effort in training today"
        placeholderTextColor="#9CA3AF"
        value={coinNote}
        onChangeText={setCoinNote}
        multiline
        numberOfLines={2}
      />
    </View>
    <TouchableOpacity
      style={[styles.saveButton, awardingCoins && styles.saveButtonDisabled]}
      onPress={handleAwardCoins}
      disabled={awardingCoins}
    >
      {awardingCoins ? (
        <ActivityIndicator color="#FFF" />
      ) : (
        <Text style={styles.saveButtonText}>Award Coins</Text>
      )}
    </TouchableOpacity>
  </>
)}
```

### 4i. New styles
```typescript
coinBalanceRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#FFF9E6',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 12,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#FFE082',
},
coinBalanceLabel: {
  fontSize: 14,
  fontWeight: '700',
  color: '#92400E',
},
coinBalanceValue: {
  fontSize: 18,
  fontWeight: '900',
  color: '#92400E',
},
inputMultiline: {
  height: 72,
  textAlignVertical: 'top',
},
```

---

## Step 5 — Player profile: `components/ProfilePage/index.tsx`

No new hook needed — `profile?.coins` is available from the existing `useProfile` query once the DB column exists.

Inside the `!profile?.is_coach` guard in the header section, add after the XP/level block:

```tsx
<View style={styles.coinPill}>
  <Text style={styles.coinPillText}>🪙 {(profile?.coins ?? 0).toLocaleString()} Coins</Text>
</View>
```

New styles:
```typescript
coinPill: {
  backgroundColor: '#FFF9E6',
  borderRadius: 20,
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderWidth: 1,
  borderColor: '#FFE082',
  marginTop: 8,
  alignSelf: 'center',
},
coinPillText: {
  fontSize: 14,
  fontWeight: '800',
  color: '#92400E',
},
```

---

## Step 6 — i18n (`locales/en-US.json`)

Add a `"coins"` namespace:

```json
"coins": {
  "tabLabel": "Coins",
  "currentBalance": "Current Balance",
  "amountLabel": "Coin Amount",
  "amountPlaceholder": "e.g. 5",
  "noteLabel": "Reason (optional)",
  "notePlaceholder": "e.g. Great effort in training today",
  "awardButton": "Award Coins",
  "successTitle": "Coins Awarded!",
  "invalidAmount": "Please enter a valid coin amount."
}
```

---

## Critical files
- `app/(tabs)/coach.tsx` — tabs, handler, styles
- `components/ProfilePage/index.tsx` — balance display
- `hooks/useCoins.ts` — new file
- `types/index.ts` — two new types
- `locales/en-US.json` — i18n strings

---

## Verification
1. Run both SQL migrations in Supabase dashboard
2. `npm start` → open coach view → tap a player → confirm "Coins" tab appears
3. Enter an amount + optional note → tap "Award Coins" → confirm success alert
4. Switch to player account → profile tab → confirm coin balance shows correctly
5. Re-open coach modal for same player → confirm "Current Balance" reflects the award
6. Check Supabase `coin_transactions` table for the audit row
