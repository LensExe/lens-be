#!/usr/bin/env bash
set -euo pipefail

client_command="$(command -v socketio-test-client || true)"
if [[ -z "$client_command" ]]; then
  echo "socketio-test-client is not installed or not on PATH" >&2
  exit 127
fi

client_script="$(sed -n 's/^# cmd-shim-target=//p' "$client_command" | head -n 1)"
if [[ -z "$client_script" || ! -f "$client_script" ]]; then
  echo "Could not locate the installed socketio-test-client package." >&2
  exit 1
fi

script_dir="$(cd "$(dirname "$0")" && pwd)"
client_dist="$(cd "$(dirname "$client_script")/../dist" && pwd)"
profile_file="$script_dir/socketio-notification-local-profile.json"

exec node "$script_dir/serve-with-profile.mjs" "$client_dist" "$profile_file"
