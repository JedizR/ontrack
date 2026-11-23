# What the owner supplied

Accounts, keys and references the owner set up, and where each one lives. Never paste a secret into chat, a doc or a commit; never read `.env.local`. Ask the owner when a key is needed.

## 1. Services

| Service | What | Notes |
| --- | --- | --- |
| GitHub | `JedizR/ontrack`, private | GitHub Free: no branch protection, so `main` is held by habit and CI |
| Vercel | `jedizrs-projects/ontrack`, Hobby | Git connected: a merge to `main` deploys https://ontrack-black.vercel.app. Previews sit behind Vercel Authentication (`vercel curl`, or `VERCEL_AUTOMATION_BYPASS_SECRET`) |
| Supabase | project `ontrack`, ref `sbexrpzbzkzofnbpaauu`, Singapore, free plan | Migrations `0001` to `0006` applied. The Supabase MCP is connected. Leaked password protection is off (a Pro feature; Ontrack has no passwords) |
| Google sign in | OAuth client in Google Cloud project `ontrack-514502`, in Testing | Only listed test users can sign in with Google; email codes work for anyone |
| Email codes | 6 digit codes over Gmail SMTP from team.ontrackapp@gmail.com, the product's support and sender address | The app password is in `~/.config/ontrack/smtp-app-password`. Google and SMTP are set in the Supabase dashboard, not in `supabase/config.toml`, so a config push leaves them alone |
| Gemini | `gemini-3.6-flash` (minimal thinking), Flash-Lite as the fallback | Paid tier on the owner's Google Cloud credits (a 150 baht prepayment sits on the billing account). The key is in `~/.config/ontrack/gemini-api-key`; `scripts/live-env.sh` reads it for `dev:live` and `eval:vision` |
| Open Food Facts | barcode lookups | Sent with `Ontrack/<version>` and the site URL, no email |

## 2. Environment variables

Set in Vercel for production and preview; names only here (`vercel env ls` lists them).

- Server: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `CRON_SECRET`, `VISION_PROVIDER` (`gemini`), `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `AI_DAILY_USER_LIMIT` (default 40 a user a day, photos and coach together), `AI_DAILY_GLOBAL_CAP` (code default 400; set to 150 a day on 13 Nov when the paid tier went on, about 60 baht a day at most). R5: `AI_DAILY_USER_LIMIT` is now Pro's fair use cap (code default 100), `AI_DAILY_FREE_LIMIT` the free plan's (default 3), `STRIPE_SECRET_KEY` a Stripe test mode secret key (`sk_test_...`, not set yet: the owner adds it; without it Checkout answers unavailable), `GEMINI_THINKING` (minimal, low or medium; default minimal).
- Client (public, `VITE_` prefix): `VITE_BACKEND` (`supabase`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPPORT_EMAIL`.
- `vercel env add NAME env < file` takes the value from one stdin redirect. Confirm with `vercel env pull` into a scratch file, never into `.env.local`.

## 3. Real data

- The owner uses the app daily on production with their own Google account. Their data has to survive every release: check a release that touches stored data against their records first (the R2 check is in `docs/archive/HANDOFF-R2.md`).
- The landing page's demo screens may use the owner's day and food photos (the owner's call, 20 Nov), exported to a scratch folder and passed with `LANDING_SEED` and `LANDING_PHOTOS`. Never commit them.
- Downloading other users' storage objects with the server key is not allowed.

## 4. Design references

| Reference | Where |
| --- | --- |
| OneFin, the identity source | https://creative-hands-463340.framer.app/, its Framer project "OneFin - Finance SaaS (copy)", extracted to `/Users/admin/destination/ontrack-design/onefin/` |
| The owner's picks from OneFin | `ontrack-design/onefin/owner-picks/` (the most direct answer to what to adopt) |
| Liquid glass | Figma "iOS 26 Liquid Glass (Community)" and https://github.com/callstack/liquid-glass |
| Phone frame | Figma "iPhone 16 and 16 Plus Mockups (Community)"; built from Apple's sizes, 71.6 by 147.6 mm |
| Meal app UI kit | Figma "Meal AI - AI Calorie Tracking - Mobile Apps UI Kit" |
| Research | Mobbin (Cal AI, Strava, Bevel, Alma, Apple Health, Airbnb, Shop); notes in `ontrack-design/research/` |
| Owner feedback images | `ontrack-design/feedback/` |
| Thai nutrition the owner found | `data/thai/owner/` |

## 5. Brand

- Accent violet `#381ac9` and light violet `#bebeff`, with the wider palette in `design/tokens.css`.
- `design/brand/app-icon.svg` (frozen), `mark.svg`, `wordmark.svg` (the mark as the O).
- Name and short name: Ontrack.
