#!/bin/sh
# Runs a command against the real Supabase project. Keys come from the Supabase CLI (`supabase login`, linked
# project) straight into the environment, so none is written to disk or printed.
set -eu
REF=sbexrpzbzkzofnbpaauu
KEYS=$(supabase projects api-keys --reveal -o json 2>/dev/null)
key() { printf '%s' "$KEYS" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(JSON.parse(s).find(k=>k.type==='$1').api_key))"; }
export VITE_BACKEND=supabase
export SUPABASE_URL="https://$REF.supabase.co"
export VITE_SUPABASE_URL="$SUPABASE_URL"
export VITE_SUPABASE_PUBLISHABLE_KEY="$(key publishable)"
export SUPABASE_SECRET_KEY="$(key secret)"
exec "$@"
