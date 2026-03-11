# RevenueCat Setup — MasterTouch Pro

Complete checklist for wiring up RevenueCat subscriptions end-to-end.
Do these steps in order — each one depends on the previous.

---

## 1. App Store Connect

### 1a. Sign the Paid Applications Agreement
- Go to **App Store Connect → Agreements, Tax, and Banking**
- Sign the **Paid Applications** agreement (required before creating any IAP)
- Fill in banking and tax details if not already done

### 1b. Create the Subscription Group
- Go to your app → **Monetization → Subscriptions**
- Click **+** to create a new subscription group
- Name: `MasterTouch Pro`
- Reference name: `mastertouch_pro`

### 1c. Add Subscription Products
Create two products inside the group:

| Product ID | Display Name | Price | Duration | Free Trial |
|---|---|---|---|---|
| `mastertouch_pro_monthly` | MasterTouch Pro Monthly | $4.99/mo | 1 month | 7 days |
| `mastertouch_pro_annual` | MasterTouch Pro Annual | $34.99/yr | 1 year | 7 days |

For each product:
1. Click **+** inside the subscription group
2. Set the **Product ID** exactly as shown above
3. Set price and duration
4. Under **Subscription Prices**, select your price tier
5. Add English localization:
   - **Subscription Name**: `MasterTouch Pro`
   - **Description**: `Unlimited timers, drills, and AI touch counting`

### 1d. Create a Sandbox Tester
- Go to **Users & Access → Sandbox Testers**
- Click **+** → create a test Apple ID (use a fresh email, e.g. `tim+sandbox@...`)
- Use this account on your test device to purchase without being charged

---

## 2. RevenueCat Dashboard

### 2a. Create the Project
- Go to [app.revenuecat.com](https://app.revenuecat.com)
- **New Project** → name: `MasterTouch`
- **Add iOS app** → Bundle ID: `com.timmparsons.mastertouch`

### 2b. Connect App Store Connect API
- In RevenueCat project settings → **App Store Connect API**
- In App Store Connect → **Users & Access → Integrations → App Store Connect API**
  - Create a key with **App Manager** role
  - Download the `.p8` file and note the Key ID + Issuer ID
- Back in RevenueCat: upload the `.p8`, enter Key ID and Issuer ID

### 2c. Create the Entitlement
- **Entitlements → +**
- Identifier: `pro`
- Display name: `MasterTouch Pro`

### 2d. Create Products
- **Products → +** → Add both product IDs from App Store Connect:
  - `mastertouch_pro_monthly`
  - `mastertouch_pro_annual`
- Attach both to the `pro` entitlement

### 2e. Create Offering & Packages
- **Offerings → +**
  - Identifier: `default`
  - Description: `Default offering`
- Inside the offering, create two packages:
  - `$rc_monthly` → attach `mastertouch_pro_monthly`
  - `$rc_annual` → attach `mastertouch_pro_annual`

### 2f. Copy the iOS SDK Key
- **Project Settings → API Keys**
- Copy the **Public iOS SDK key** (starts with `appl_...`)

---

## 3. Codebase

### 3a. Add the API key to `.env`
```
EXPO_PUBLIC_RC_IOS_KEY=appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3b. Flip the dev override off
In `hooks/usePremium.ts`, set the override to `null` before shipping:
```typescript
const DEV_PREMIUM_OVERRIDE: boolean | null = null;
```
Leave it as `true` or `false` during local development to preview Pro/free UI without a real purchase.

### 3c. Add the Supabase `is_premium` column
Run this migration in the Supabase SQL editor:
```sql
ALTER TABLE profiles
ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE;
```

### 3d. Deploy the RevenueCat webhook edge function
The webhook keeps `profiles.is_premium` in sync when a subscription is purchased, renewed, or expires.

Create `supabase/functions/revenuecat-webhook/index.ts`:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const payload = await req.json();
  const event = payload.event;
  const appUserId = event?.app_user_id;
  const isPremium = [
    'INITIAL_PURCHASE',
    'RENEWAL',
    'PRODUCT_CHANGE',
    'UNCANCELLATION',
  ].includes(event?.type);

  if (!appUserId) return new Response('missing app_user_id', { status: 400 });

  await supabase
    .from('profiles')
    .update({ is_premium: isPremium })
    .eq('id', appUserId);

  return new Response('ok');
});
```

Deploy it:
```bash
npx supabase functions deploy revenuecat-webhook
```

### 3e. Add the webhook URL to RevenueCat
- RevenueCat dashboard → **Project Settings → Integrations → Webhooks**
- URL: `https://<your-project-ref>.supabase.co/functions/v1/revenuecat-webhook`
- Add the Supabase function's auth header if you have JWT verification enabled

---

## 4. Testing

1. On your test device, sign in with the **Sandbox Tester** Apple ID (Settings → App Store → Sandbox Account)
2. Build the app: `npx expo run:ios`
3. Open the app → navigate to any Pro-gated feature → tap the paywall
4. Purchase a subscription — sandbox purchases complete instantly
5. Verify:
   - `usePremium()` returns `isPremium: true`
   - Pro features unlock (advanced drills, all timer options, AI camera toggle)
   - Supabase `profiles.is_premium` is set to `true` via the webhook
6. To test expiration: sandbox subscriptions expire in 5 minutes (1 month = 5 min in sandbox)

---

## 5. Pre-submission Checklist

- [ ] `DEV_PREMIUM_OVERRIDE = null` in `usePremium.ts`
- [ ] `EXPO_PUBLIC_RC_IOS_KEY` set in EAS secrets (not just local `.env`)
- [ ] Paid Applications agreement signed in App Store Connect
- [ ] Both subscription products have English localizations
- [ ] Webhook deployed and verified in RevenueCat dashboard
- [ ] Tested purchase + restore flow on a real device with sandbox account
- [ ] Privacy policy URL added to App Store Connect listing (required for IAP)

---

## EAS Secrets (for CI builds)

The API key must be available in production builds via EAS:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_RC_IOS_KEY --value "appl_xxxx"
```
