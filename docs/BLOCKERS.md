# For the owner

Everything that needs you, in one place. Newest first within each section.

## Needs your action

Each entry: what is blocked, what Claude tried, the exact steps for you, and what to tell Claude afterwards.

### Supabase MCP for Claude (M0, optional)

- **Blocked:** the Supabase MCP server at project scope. Nothing else waits on it; the Supabase CLI covers migrations and advisors.
- **Tried:** nothing. The run's rules forbid adding an MCP server that needs a browser sign in, and Supabase's hosted MCP always opens one.
- **Steps:** in a terminal in the repository, run
  `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=sbexrpzbzkzofnbpaauu"`
  then start `claude`, type `/mcp`, pick supabase and choose Authenticate. Sign in with the account that owns the `ontrack` project.
- **Then tell Claude:** "The Supabase MCP is connected."

## Needs your eyes

Each entry: what to look at (URL or screenshot paths), what to look for, and which milestone it belongs to.

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
