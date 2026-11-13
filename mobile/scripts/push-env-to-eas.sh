#!/usr/bin/env bash
#
# Uploads the EXPO_PUBLIC_FIREBASE_* values from mobile/.env to EAS so cloud
# builds can see them.
#
# This is needed because .env is gitignored and therefore never reaches an EAS
# build. Without it, a production build compiles with an empty Firebase config
# and the app throws at startup.
#
# Visibility is "plaintext" on purpose: these are Firebase *client* config
# values, which are compiled into the app bundle and are already public in the
# deployed web app. They are not credentials. Marking them "secret" would stop
# EAS from inlining them at build time, which is exactly what we need it to do.
#
# Usage:  npm run eas:push-env        (after `eas login`)

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "error: mobile/.env not found. Copy .env.example and fill it in first." >&2
  exit 1
fi

ENVIRONMENTS=(development preview production)

while IFS='=' read -r name value; do
  # Skip blanks, comments, and any name outside the expected prefix.
  [[ -z "$name" || "$name" == \#* ]] && continue
  [[ "$name" != EXPO_PUBLIC_FIREBASE_* ]] && continue
  [[ -z "$value" ]] && { echo "skipping $name (empty)"; continue; }

  for env_name in "${ENVIRONMENTS[@]}"; do
    # Name only is echoed — never the value.
    echo "setting $name -> $env_name"
    npx eas-cli env:set "$env_name" \
      --name "$name" \
      --value "$value" \
      --type string \
      --visibility plaintext \
      --scope project \
      --non-interactive >/dev/null
  done
done < .env

echo
echo "Done. Verify with: npx eas-cli env:list"
