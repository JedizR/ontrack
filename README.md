# Ontrack

A calorie and training tracker for iPhone, installed from Safari with Add to Home Screen. A local first Svelte 5 app on Vite, with Supabase for sign in and sync and Vercel for hosting.

## Run it

```sh
nvm use            # Node from .nvmrc
corepack enable pnpm
pnpm install
pnpm dev           # http://localhost:5173 with the mock backend, no accounts needed
pnpm verify        # check, unit tests, build and the end to end smoke tests
```

`pnpm dev:live` runs against real Supabase and Gemini with keys from `.env.local` (copy `.env.example`).

## Where things are

`CLAUDE.md` lists every command and the rules that are easy to break. The specs are in `docs/`, the design tokens and brand in `design/`.
