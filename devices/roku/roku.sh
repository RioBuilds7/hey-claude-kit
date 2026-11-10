#!/bin/bash
# Roku TV control over the local network (Roku External Control Protocol, port 8060).
# Usage: roku.sh on|off|home|back|select|up|down|left|right|play|pause|mute|volup [n]|voldown [n]
#        roku.sh netflix <titleId> [movie|series] [profilePos] | playing | apps | active | info | launch <appId|name> | search "<title>" | text "<string>" | key <Key>
DIR="$(cd "$(dirname "$0")" && pwd)"; ROOT="$DIR/../.."
IP=$(jq -r '.roku.ip // empty' "$ROOT/config.json")
[ -z "$IP" ] && { echo "Roku IP not set in config.json"; exit 1; }
U="http://$IP:8060"
key() { curl -s -m 5 -X POST "$U/keypress/$1" -o /dev/null -w "%{http_code}"; }
case "$1" in
  on) key PowerOn ;; off) key PowerOff ;; home) key Home ;; back) key Back ;; select) key Select ;;
  up|down|left|right) key "$(tr '[:lower:]' '[:upper:]' <<< "${1:0:1}")${1:1}" ;;
  play|pause) key Play ;; mute) key VolumeMute ;;
  volup) for _ in $(seq "${2:-3}"); do key VolumeUp >/dev/null; sleep 0.15; done; echo ok ;;
  voldown) for _ in $(seq "${2:-3}"); do key VolumeDown >/dev/null; sleep 0.15; done; echo ok ;;
  apps) curl -s -m 5 "$U/query/apps" | sed -n 's/.*id="\([0-9a-zA-Z_.]*\)"[^>]*>\(.*\)<\/app>/\1 \2/p' ;;
  active) curl -s -m 5 "$U/query/active-app" ;;
  info) curl -s -m 5 "$U/query/device-info" | grep -E "friendly-device-name|power-mode|model-name|is-tv" ;;
  launch)
    ID="$2"
    if ! [[ "$ID" =~ ^[0-9]+$ ]]; then
      ID=$(curl -s -m 5 "$U/query/apps" | sed -n 's/.*id="\([0-9]*\)"[^>]*>\(.*\)<\/app>/\1|\2/p' | grep -i "|.*$2" | head -1 | cut -d'|' -f1)
      [ -z "$ID" ] && { echo "No app matching $2"; exit 1; }
    fi
    curl -s -m 5 -X POST "$U/launch/$ID" -o /dev/null -w "%{http_code}" ;;
  search)
    # search "<title>" [app name or id]: with an app, opens that title inside the app
    Q="keyword=$(jq -rn --arg s "$2" '$s|@uri')&launch=true&match-any=true"
    if [ -n "$3" ]; then
      PID="$3"
      if ! [[ "$PID" =~ ^[0-9]+$ ]]; then
        PID=$(curl -s -m 5 "$U/query/apps" | sed -n 's/.*id="\([0-9]*\)"[^>]*>\(.*\)<\/app>/\1|\2/p' | grep -i "|.*$3" | head -1 | cut -d'|' -f1)
      fi
      [ -n "$PID" ] && Q="$Q&provider-id=$PID"
    fi
    curl -s -m 5 -X POST "$U/search/browse?$Q" -o /dev/null -w "%{http_code}" ;;
  netflix)
    # netflix <netflix title id> [movie|series] [profile position]: open a title straight inside Netflix.
    # If Netflix was not already open it stops at "Who's watching", so the profile is picked in the background.
    WAS=$(curl -s -m 5 "$U/query/active-app" | grep -c 'id="12"')
    key PowerOn >/dev/null
    curl -s -m 6 -X POST "$U/launch/12?contentId=$2&mediaType=${3:-series}" -o /dev/null -w "%{http_code}"
    if [ "$WAS" = "0" ]; then
      POS="${4:-4}"
      ( sleep 14; for _ in $(seq $((POS-1))); do key Right >/dev/null; sleep 0.4; done; key Select >/dev/null ) >/dev/null 2>&1 &
      disown; echo " (Netflix was closed: picking profile $POS in about 15 seconds, then the title opens)"
    else echo " (Netflix already open: title page should be showing)"; fi ;;
  playing) curl -s -m 5 "$U/query/media-player" | grep -o 'state="[a-z]*"' ;;
  text) for ((i=0;i<${#2};i++)); do key "Lit_$(jq -rn --arg c "${2:$i:1}" '$c|@uri')" >/dev/null; done; echo ok ;;
  key) key "$2" ;;
  *) echo "unknown command: $1"; exit 1 ;;
esac
echo
