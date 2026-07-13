# Subscription Plan — What Changes When Master Touch Goes Paid

How to introduce a subscription without breaking the app, the website's SEO, or the "free" positioning that currently drives conversions. Written 2026-07-13, before any payment work has started.

## Positioning rule (read this first)

The entire website and keyword strategy is built on one competitive wedge: **competitors charge $5–$38/month, Master Touch is free.** When a subscription launches, do NOT flip to "paid app" messaging. The winning reposition is:

> **Free to start. Free forever for the core.** Touch tracking, streaks, daily challenges, and your team leaderboard stay free. Premium adds [advanced stats / Vinnie AI coaching / multi-player family accounts / custom team challenges].

Keep the free tier genuinely useful — it's the top of the funnel and the whole SEO story. Premium should sell depth, not remove the floor.

## App-side implementation (recommended stack)

- **RevenueCat** (`react-native-purchases`) on top of Apple In-App Purchase. Apple requires IAP for unlocking digital features — Stripe inside the app is not an option.
- Install with `npx expo install react-native-purchases`. Requires an EAS dev/production build — **IAP does not work in Expo Go**.
- Entitlement flow: RevenueCat webhook → Supabase (edge function is unavoidable here, or use RevenueCat's direct Supabase integration) → sets `is_premium` on `profiles`. The app already reads toward an `is_premium` concept (see PLANNING.md invite-code idea: invite code → auto `is_premium = true` + team join). Keep that flag as the single source of truth so invite codes and paid subs coexist.
- Gate features in the app by reading `is_premium` from the profile query (`['profile', userId]`), not by calling RevenueCat on every screen.
- RevenueCat is free until ~$2.5k/month tracked revenue.
- Phase two (optional, US only): external purchase links to Stripe web checkout on mastertouch.app to avoid Apple's commission. Higher friction, do it only once IAP conversion is measured.

## Website changes checklist (when subscription ships)

Every "free" claim on the site, and what to do with it:

### index.html
- [ ] Line ~7 `meta description` — "the free soccer training app" → "free to download" or "free to start"
- [ ] Lines ~15–21 OG/Twitter titles and descriptions — same softening
- [ ] FAQPage JSON-LD: "Is Master Touch free?" answer — rewrite to describe free tier + what Premium adds. Keep the question; it's a search query.
- [ ] MobileApplication JSON-LD `offers` — price stays `0` (the download is free) but consider adding `AggregateOffer` for subscription tiers
- [ ] Hero note "Free download. Built for players and parents." — fine as-is (download is still free)
- [ ] Stats strip: **"Free / No subscription needed" — this is the one outright lie post-launch. Change to "Free to start / Core features free forever."**
- [ ] Download section: "Most soccer training apps charge $5–$38 a month..." paragraph — reframe: core is free, Premium is cheaper than competitors
- [ ] FAQ visible answers ("Is Master Touch free?", "What is Master Touch?") — match the JSON-LD rewrite exactly (Google checks consistency)
- [ ] CTA band "Download Master Touch free" — fine as-is
- [ ] Footer tagline "The free soccer training app" → "The soccer training app that's free to start"
- [ ] **Add a Pricing section (or pricing.html)** — free vs Premium comparison table, and add it to nav, sitemap.xml, and footer

### guides/soccer-training-app-for-kids.html (the heavy one)
- [ ] Meta description + OG: "why free plus fun wins" — reframe to "free to start"
- [ ] Answer box: "Master Touch is free" → "Master Touch's core is free"
- [ ] Section 4 "Price that matches reality" — rewrite: free tier removes the bet, Premium exists for players who outgrow it; undercut the $5–$38 range with your price
- [ ] App callout "track the touches, make it fun, keep it free" → "keep the core free"
- [ ] Closing "Try the free option first" — actually gets STRONGER with a sub: "start free, upgrade only if the habit sticks"

### All other guide callouts
- [ ] "Free on the App Store" / "Download Free" phrasing in app-callouts and header nav buttons across all 8 guides — still literally true (free download); leave unless legal review says otherwise. Sweep with: `grep -rn -i "free" website/`

### New pages worth adding at subscription launch
- [ ] `pricing.html` — targets "soccer training app cost / price" queries; comparison table vs Techne, Anytime Soccer, Train Effective
- [ ] FAQ additions: "How much does Master Touch Premium cost?", "How do I cancel?" (required for App Store review goodwill and reduces support email)
- [ ] Update sitemap.xml with any new pages

## Launch-order recommendation

1. Ship RevenueCat + paywall in-app behind a feature flag; verify webhook → `is_premium` end to end in TestFlight
2. Decide the free/premium feature split (protect: touch logging, streaks, one team leaderboard)
3. Same week the App Store build goes live: run this website checklist in one commit
4. Then add pricing.html and resubmit sitemap in Search Console
