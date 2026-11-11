# For the owner

Everything that needs you, in one place. Newest first within each section.

## Needs your action

Each entry: what is blocked, what Claude tried, the exact steps for you, and what to tell Claude afterwards.

### Google sign in (M3)

- **Blocked:** the Google OAuth client, so the Google provider in Supabase is off and the app hides "Continue with Google" on the live backend. Everything else for Google is built and tested against the mock.
- **Tried:** the CLI (there is no `gcloud` on this Mac, and gcloud cannot create OAuth web clients anyway), then your browser through Yab: every tab, even `example.com`, stayed blank and timed out, so the console never loaded. Nothing was created in Google Cloud.
- **Steps:**
  1. In the Google Cloud console create a project `ontrack` (no billing account).
  2. Google Auth Platform: Branding, app name Ontrack, your address as support and developer contact. Audience: External, leave it in Testing, add your address as a test user.
  3. Clients, Create client, Web application, name "Ontrack Supabase". Authorized redirect URI: `https://sbexrpzbzkzofnbpaauu.supabase.co/auth/v1/callback`. Download the JSON when it shows the secret.
  4. In Supabase, Authentication, Sign In / Providers, Google: turn it on and paste the client id and secret. Or tell Claude where the JSON is and it pushes it with the CLI.
- **Then tell Claude:** "The Google client is set up."

### Email codes need SMTP (M3)

- **Blocked:** email code sign in on the live backend. Supabase's free built in mailer refuses edits to its email templates, and the default template sends a link, not the 6 digit code. A link opens Safari, which does not share storage with the installed app, so it cannot sign the app in. Until this or Google works, nobody can sign in on production, so nothing can be saved there yet (the device store is per account). Both paths work against the mock with `pnpm dev`.
- **Tried:** `supabase config push` with a code template (`supabase/templates/code.html`): refused with "Email template modification is not available for free tier projects using the default email provider". There is no other route on the free plan.
- **Steps:** create a Gmail app password (Google account, Security, App passwords). In Supabase, Authentication, Emails, SMTP Settings: host `smtp.gmail.com`, port 587, your Gmail address as user and sender, the app password. Then in `supabase/config.toml` uncomment the two `[auth.email.template.*]` blocks and run `supabase config push`, or ask Claude to.
- **Then tell Claude:** "SMTP is set up, push the code template."

### Supabase MCP for Claude (M0, optional)

- **Blocked:** the Supabase MCP server at project scope. Nothing else waits on it; the Supabase CLI covers migrations and advisors.
- **Tried:** nothing. The run's rules forbid adding an MCP server that needs a browser sign in, and Supabase's hosted MCP always opens one.
- **Steps:** in a terminal in the repository, run
  `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=sbexrpzbzkzofnbpaauu"`
  then start `claude`, type `/mcp`, pick supabase and choose Authenticate. Sign in with the account that owns the `ontrack` project.
- **Then tell Claude:** "The Supabase MCP is connected."

## Needs your eyes

Each entry: what to look at (URL or screenshot paths), what to look for, and which milestone it belongs to.

### M3: sign in and sync on your iPhone

- **Where:** after both entries above are done, the pull request's Vercel preview or `https://ontrack-black.vercel.app` once merged, installed to the home screen. Until then, `pnpm dev` on the Mac shows the same flow against the mock (code 123456). Screenshots: `screenshots/signin/`, `screenshots/account/`, `screenshots/today/session-expired-*` and `bringing-*` after `pnpm screenshots`.
- **Look for:** in the installed app: tap the avatar, Continue with Google, and check it comes back into the app (not Safari) signed in. Close the app fully and reopen: still signed in. Avatar, Sign out. Then sign in with an email code: the code arrives, iOS offers it above the keyboard, and it signs in. Report anything that opens Safari or loses the session. Also look at the sign in sheet with the keyboard up, the six code boxes, and the shake on a wrong code.
- **Decided for you:** the M3 list in `docs/DECISIONS.md`, notably the account sheet on the avatar until Settings, typing your email to delete the account, and no Privacy and Terms line until M9.

### M2: three science calls kept against their source (optional)

- **Where:** `docs/SOURCES.md`, the rows marked Working assumption, and the M2 list in `docs/DECISIONS.md`. Nothing to see in the app yet.
- **Look for:** whether you agree with keeping these. (1) Movement factors 1.20 to 1.60: FAO/WHO/UNU puts even a sedentary office worker at 1.53, but that includes all activity, and Ontrack adds workouts separately. If the seated start feels low, 1.40 is the alternative. (2) 7,700 kcal per kg: Hall (2008) says it overstates the energy of weight change for leaner people; the weekly check-in corrects from your weigh-ins. (3) The 1,200 and 1,500 kcal floors are not stated in the NHLBI guide, which gives 1,000 to 1,200 (women) and 1,200 to 1,600 (men) for low calorie diets; the floors are the safer end. Corrections that changed behaviour: moderate walking is 3.8 MET, low weekly volume is under 5 sets, advanced lifters gaining get the lean pace and a 10 percent surplus cap.
- **Then tell Claude:** "Keep the science as is", or which value to change.

### M1: the design system on your iPhone

- **Where:** the pull request's Vercel preview (it asks for your Vercel login), at `/gallery` for every component and `/gallery/today` for Today built from them. The gallery is not in production builds. Screenshots: branch `pr-assets`, folder `m1/`, and after `pnpm screenshots` in `screenshots/gallery/`, `screenshots/today/` (composed and the reference mock side by side) and `screenshots/xl/` (largest text on the SE).
- **Look for:** does it look like Ontrack to you: the lime, the type, the spacing, the track bar. On `/gallery/today`, compare with `design/reference-today.html`. Then on the phone only: the dock's blur (the test browser does not draw it), the press feel of buttons, chips and keypad keys, a light haptic on chips, the theme control and the keypad's save, holding the stepper's plus, dragging a sheet down to close it, and the sheet staying above the keyboard. Switch Theme and Text size at the top of `/gallery`.
- **Decided for you:** every choice is listed under M1 in `docs/DECISIONS.md`, for example unselected tabs in `--ink-2` and macro values on two lines. Approve, or tell Claude what to change.

### M0: the installed shell on your iPhone

- **Where:** `https://ontrack-black.vercel.app` once M0 is merged to `main`. Previews (each pull request's Vercel link) ask for your Vercel login. Screenshots: branch `pr-assets`, folder `m0/`, and `screenshots/shell/` after `pnpm screenshots`.
- **Look for:** open it in Safari, Share, Add to Home Screen. The icon is the lime track on an ink tile. It opens full screen with no Safari bars. The header reads Today with the round avatar on the right. The floating dock shows Today, Train, Progress and the lime plus. Tapping or swiping changes the tab and its title. Switch the phone to dark mode and back. The plus and the avatar do nothing yet.
