#!/bin/sh
# Runs a command against the real Supabase project and Gemini. Keys come from the Supabase CLI (`supabase login`,
# linked project) and the Gemini key file straight into the environment, so none is written to disk or printed.
set -eu
REF=sbexrpzbzkzofnbpaauu
KEYS=$(supabase projects api-keys --reveal -o json 2>/dev/null)
key() { printf '%s' "$KEYS" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(JSON.parse(s).find(k=>k.type==='$1').api_key))"; }
export VITE_BACKEND=supabase
export SUPABASE_URL="https://$REF.supabase.co"
export VITE_SUPABASE_URL="$SUPABASE_URL"
export VITE_SUPABASE_PUBLISHABLE_KEY="$(key publishable)"
export SUPABASE_SECRET_KEY="$(key secret)"
# the development Gemini key, outside the repository; without it, photos go to the mock provider
GEMINI_KEY_FILE="$HOME/.config/ontrack/gemini-api-key"
if [ -z "${GEMINI_API_KEY:-}" ] && [ -r "$GEMINI_KEY_FILE" ]; then export GEMINI_API_KEY="$(cat "$GEMINI_KEY_FILE")"; fi
if [ -n "${GEMINI_API_KEY:-}" ]; then export VISION_PROVIDER="${VISION_PROVIDER:-gemini}"; else export VISION_PROVIDER="${VISION_PROVIDER:-mock}"; fi
export GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.6-flash}"
export GEMINI_FALLBACK_MODEL="${GEMINI_FALLBACK_MODEL:-gemini-3.5-flash-lite}"
exec "$@"
