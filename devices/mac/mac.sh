#!/bin/bash
# Control this Mac.
# Usage: mac.sh volume <0-100> | mute | unmute | say "<text>" | open <App Name> | url <https://...> |
#        music play|pause|next|previous|status | spotify play|pause|next|previous|status|uri <spotify:...> |
#        lock | sleep-display | battery | notify "<text>"
case "$1" in
  volume) osascript -e "set volume output volume $2" && echo "volume $2" ;;
  mute) osascript -e "set volume with output muted" && echo muted ;;
  unmute) osascript -e "set volume without output muted" && echo unmuted ;;
  say) say "$2" && echo said ;;
  open) open -a "$2" && echo "opened $2" ;;
  url) open "$2" && echo "opened $2" ;;
  music|spotify)
    APP=$([ "$1" = music ] && echo Music || echo Spotify)
    case "$2" in
      play|pause) osascript -e "tell application \"$APP\" to $2" && echo "$APP $2" ;;
      next|previous) osascript -e "tell application \"$APP\" to $2 track" && echo "$APP $2" ;;
      status) osascript -e "tell application \"$APP\" to (player state as text) & \" | \" & (artist of current track) & \" - \" & (name of current track)" ;;
      uri) osascript -e "tell application \"Spotify\" to play track \"$3\"" && echo "playing $3" ;;
    esac ;;
  lock) pmset displaysleepnow && echo locked ;;
  sleep-display) pmset displaysleepnow && echo "display off" ;;
  battery) pmset -g batt | tail -1 ;;
  notify) osascript -e "display notification \"$2\" with title \"Hey Claude\"" && echo shown ;;
  *) echo "unknown: $1"; exit 1 ;;
esac
