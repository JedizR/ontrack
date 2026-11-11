# What you supply

Fill in what you have. Every slot has a default, so nothing here blocks the build except the rows marked needed. Claude reads this file at the start of M0 and again at M1.

## 1. Accounts and keys

| Item | Needed by | What to do | Done |
| --- | --- | --- | --- |
| GitHub CLI | M0, needed | `gh auth login`. Claude creates the private repo `ontrack` | [ ] |
| Vercel CLI | M0, needed | `pnpm dlx vercel login`. Hobby plan, no domain | [ ] |
| Supabase CLI | M0, needed | `pnpm dlx supabase login`. Claude creates project `ontrack` in Singapore (`ap-southeast-1`) | [ ] |
| Google sign-in client | M3, needed | Google Cloud console, Auth, create an OAuth client of type Web. Redirect URI is the callback URL Claude gives you from Supabase. Paste the client id and secret into Supabase, Authentication, Providers, Google. Set the consent screen to External and publish it (basic scopes need no review) | [ ] |
| Email codes | M3, optional | Supabase's built in mailer only reaches project members. To email anyone without owning a domain: create a Gmail app password and enter it in Supabase, Authentication, Emails, SMTP (host `smtp.gmail.com`, port 587). Skip this and sign-in is Google only for non-members | [ ] |
| Gemini key, development | M6, needed | Google AI Studio, key in a project with no billing. Put it in `.env.local` as `GEMINI_API_KEY` | [ ] |
| Gemini key, production | M9 | A key in the project linked to the billing account that holds your Developer Program credits. Claude adds it to Vercel. Set a budget alert of 2,000 baht | [ ] |

Never paste a secret into the chat. Put it in `.env.local` or the provider's dashboard and tell Claude it is there.

## 2. Design references

Ontrack has a complete default design in `docs/DESIGN.md` and `design/`. Anything you add here refines it.

| Slot | Put it here | Default if empty |
| --- | --- | --- |
| Figma design system | Link: ______ . Or export it as `design/DESIGN-figma.md` the way you did for watermelon | `docs/DESIGN.md` tokens and components |
| Figma screens | Links to frames, one per line, with the Ontrack screen each one informs: ______ | `docs/SCREENS.md` layouts |
| Screenshots you like | Drop images in `design/references/`, named `screen-what-you-like.png`, for example `today-luma-card-spacing.png` | The Luma and Higgsfield reading in `docs/DESIGN.md` |
| Things you dislike | One line each: ______ | The banned list in `docs/DESIGN.md` |

Precedence when sources disagree: what you say in chat, then your Figma screens, then your Figma design system, then `docs/DESIGN.md`. Three things hold unless you say otherwise: the name, the lime, and the copy rules. As on watermelon, the design system is a baseline, not a cage: Claude may deviate for better UX and must list each deviation in `docs/DECISIONS.md`.

## 3. Brand overrides

| Slot | Default |
| --- | --- |
| Lime | `#D1FE17`, the Higgsfield reference value. Change `--lime` in `design/tokens.css` |
| Logo | `design/brand/mark.svg` and `design/brand/app-icon.svg`. Replace the files to use your own |
| Home screen name | Ontrack |

## 4. Product switches

| Switch | Default | Change to |
| --- | --- | --- |
| Language | English only, Thai ready through the string catalog | Write "add Thai now" and Claude ships both |
| Units | Metric, imperial available in Settings | |
| Photo analyses per user per day | 40 | |
| Sign-in | Google and email code | |
| Hosting | Vercel Hobby (personal, non commercial). Move to Pro or Cloudflare before charging money | |

## 5. Decisions you may want to veto before M0

These shape everything after them. Tell Claude now if you want a different call.

1. Plain Vite single page app, like watermelon, not SvelteKit or Astro. The app is fully client side. The only server code is three small Vercel functions.
2. Local first with background sync, ported from watermelon, with Supabase replacing Google Sheets.
3. One generic `records` table in Postgres holding JSON documents, not a table per entity.
4. Photo logging uses Gemini Flash. The model names foods and estimates grams. Calories come from a bundled USDA food table when there is a match and are labelled as estimates when there is not.
5. Thai dishes are estimates in v1. A Thai food table and Thai language are the first items on the later list.
6. Training input is a weekly program with optional exercises. There is no set by set workout logging in v1.
7. Targets change on training days by default. One setting makes them the same every day.
8. Adults only, no weight loss goal below BMI 18.5, and a screening step at onboarding.
9. Three tabs (Today, Train, Progress) and a plus button. Settings open from the avatar.
