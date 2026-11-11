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

### M0: the installed shell on your iPhone

- **Where:** `https://ontrack-black.vercel.app` once M0 is merged to `main`. Previews (each pull request's Vercel link) ask for your Vercel login. Screenshots: branch `pr-assets`, folder `m0/`, and `screenshots/shell/` after `pnpm screenshots`.
- **Look for:** open it in Safari, Share, Add to Home Screen. The icon is the lime track on an ink tile. It opens full screen with no Safari bars. The header reads Today with the round avatar on the right. The floating dock shows Today, Train, Progress and the lime plus. Tapping or swiping changes the tab and its title. Switch the phone to dark mode and back. The plus and the avatar do nothing yet.
