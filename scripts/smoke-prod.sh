#!/bin/sh
# Production smoke test after a release (M9b):  pnpm smoke:prod [url]   (default https://ontrack-black.vercel.app)
# The pages and headers, the version this checkout says it shipped, the server functions refusing a stranger, then
# installability and the offline reload in Chrome (check:pwa). Sign in, logging and sync against the real backend are
# `pnpm test:live` and the owner's check on the iPhone.
set -u
U="${1:-https://ontrack-black.vercel.app}"
U="${U%/}"
fail=0
check() { if [ "$2" = "$3" ]; then echo "ok    $1"; else echo "FAIL  $1: got $2, want $3"; fail=1; fi; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

check "the app" "$(code "$U/")" 200
check "privacy" "$(code "$U/privacy.html")" 200
check "terms" "$(code "$U/terms.html")" 200
check "manifest" "$(code "$U/manifest.webmanifest")" 200
check "analyze, no session" "$(code -X POST -H 'content-type: application/json' -d '{}' "$U/api/analyze")" 401
check "account deletion, no session" "$(code -X DELETE "$U/api/account")" 401
check "keep-alive, no secret" "$(code "$U/api/cron/keepalive")" 401
check "location allowed for the food map" "$(curl -sI "$U/" | grep -ci 'geolocation=(self)')" 1
v=$(node -p "require('./package.json').version")
entry=$(curl -s "$U/" | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -1)
settings=$(curl -s "$U$entry" | grep -o 'SettingsSheet-[A-Za-z0-9_-]*\.js' | head -1)
check "Settings shows version $v" "$(curl -s "$U/assets/$settings" | grep -cF "$v")" 1
pnpm -s check:pwa "$U/" || fail=1
exit $fail
