# Multilingual Support (i18n)

## Current State

The app uses **i18next + react-i18next**. The infrastructure exists but coverage is minimal:

- `locales/en-US.json` — 21 keys (mostly onboarding/auth strings)
- `utils/i18n.ts` — initialised with a single `en-US` resource, no language detection
- ~122 `t()` calls exist, heavily concentrated in `app/(tabs)/coach.tsx`
- **~85% of visible UI strings are still hardcoded in English**

---

## What Needs to Happen

### Phase 1 — String Extraction (biggest lift, ~2–3 days)

Go screen by screen, move every hardcoded user-facing string into `locales/en-US.json`, and replace it with a `t('key')` call.

Priority order (most user-visible first):

| File | Hardcoded strings (examples) |
|------|------------------------------|
| `components/HomePage/index.tsx` | "Today's Progress", "Ready to get some touches?", "This Week", "Resets Sunday", "Goal hit!" |
| `components/TrainPage/index.tsx` | "Log Practice Session", "Best Juggles", "Add minutes to track…" |
| `components/ProgressPage/index.tsx` | "Progress", "This Week", "Recent Sessions", "Past Challenges" |
| `components/ProfilePage/index.tsx` | All goal labels, badge names, section headers, alert messages |
| `app/(tabs)/coach.tsx` | "Needs Attention", "Team", "Week", player stat labels |
| `components/modals/LogSessionModal.tsx` | All button labels and hint text |
| `components/modals/BadgeEarnedModal.tsx` | "Badge Earned!", "AWESOME!", "NEXT BADGE →" |
| `components/TeamBadgeEarnedModal.tsx` | "TEAM ACHIEVEMENT", "Your whole team earned this!" |
| `lib/teamBadges.ts` | All badge names and descriptions |
| `components/common/VinnieCard.tsx` | All Vinnie messages |

**Convention:** Use dot-notation keys grouped by screen, e.g.:
```json
{
  "home": {
    "greeting": "Ready to get some touches?",
    "todayProgress": "Today's Progress",
    "goalHit": "Goal hit!"
  },
  "train": {
    "logSession": "Log Practice Session"
  }
}
```

---

### Phase 2 — Language Detection

Update `utils/i18n.ts` to auto-detect the device locale using `expo-localization`:

```typescript
import * as Localization from 'expo-localization';

i18n.init({
  lng: Localization.locale,        // e.g. "es-ES", "fr-FR"
  fallbackLng: 'en-US',
  resources: { 'en-US': { translation: enUS } },
});
```

Install if not already present:
```bash
npx expo install expo-localization
```

---

### Phase 3 — Add a Translation

Once Phase 1 is done, adding a language is just:

1. Copy `locales/en-US.json` → `locales/es.json` (or `fr.json`, etc.)
2. Translate all values (can use DeepL, Google Translate API, or a human translator)
3. Register it in `utils/i18n.ts`:
   ```typescript
   import es from '@/locales/es.json';
   resources: {
     'en-US': { translation: enUS },
     'es':    { translation: es },
   }
   ```

---

### Phase 4 — Language Picker (optional)

Add a language selector in `components/ProfilePage/index.tsx` settings section:

```typescript
import i18n from '@/utils/i18n';
i18n.changeLanguage('es');
```

Persist the selection to `AsyncStorage` so it survives app restarts.

---

## Dynamic strings (interpolation)

Some strings include variable values and need interpolation. i18next handles this natively:

```json
"weekTouches": "{{count}} touches this week"
```
```typescript
t('weekTouches', { count: weekTouches.toLocaleString() })
```

Watch for these patterns in the codebase — template literals like `` `${count} touches` `` need to become interpolated keys.

---

## Things that do NOT need translating

- Vinnie AI responses (generated dynamically from Supabase Edge Functions — translate at the prompt level if needed)
- Date/time formatting — use `toLocaleDateString` with the current locale already
- Number formatting — `toLocaleString()` already handles this

---

## Effort estimate

| Phase | Effort |
|-------|--------|
| String extraction | ~2–3 days |
| Language detection | ~1 hour |
| First translation (e.g. Spanish) | ~1 day (with AI assistance) |
| Language picker UI | ~2 hours |
| **Total** | **~3–4 days** |
