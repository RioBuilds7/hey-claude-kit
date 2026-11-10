#!/bin/bash
# Turn hey-claude on (and auto-start at login). Run: bash start.sh
D="$(cd "$(dirname "$0")" && pwd)"
NODE="$(command -v node)"; [ -z "$NODE" ] && { echo "Node.js not found. Install it first (https://nodejs.org)."; exit 1; }
[ -f "$D/config.json" ] || { echo "config.json is missing. Copy config.example.json to config.json and fill it in."; exit 1; }
mkdir -p "$D/logs" ~/Library/LaunchAgents
for s in poller watcher; do
  sed -e "s|__ROOT__|$D|g" -e "s|__HOME__|$HOME|g" -e "s|__NODE__|$NODE|g" \
    "$D/launchd/com.heyclaude.$s.plist" > ~/Library/LaunchAgents/com.heyclaude.$s.plist
  launchctl bootout gui/$(id -u)/com.heyclaude.$s 2>/dev/null
  launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.heyclaude.$s.plist
done
sleep 3; launchctl list | grep heyclaude && echo "hey-claude is ON"
