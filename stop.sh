#!/bin/bash
# Turn hey-claude off and remove auto-start. Run: bash stop.sh
for s in poller watcher; do
  launchctl bootout gui/$(id -u)/com.heyclaude.$s 2>/dev/null
  rm -f ~/Library/LaunchAgents/com.heyclaude.$s.plist
done
pkill -f "hey-claude/core/watch.sh"; echo "hey-claude is OFF"
