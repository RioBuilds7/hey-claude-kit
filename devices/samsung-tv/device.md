### Samsung TV
- Control: `node devices/samsung-tv/samsung.js <cmd>`
- Commands: `status`, `on` (Wake-on-LAN), `off`, `volup [steps]`, `voldown [steps]`, `mute`,
  `home`, `back`, `enter`, `up|down|left|right`, `play`, `pause`, `source`, `key KEY_<NAME>`,
  `apps` (installed apps + IDs), `app <name or appId>`, `browser <url>`.
- App names that work: netflix, youtube, prime, disney, hulu, max, spotify, plex, apple tv, tubi,
  youtube tv, peacock, paramount. Anything else: run `apps` and use the ID.
- No absolute volume; ~3 steps is a noticeable change.
- `on` waits by itself until the TV answers (up to ~8s) and prints the result. Never add sleep or a status check after it.
- "Not reachable" on other commands = TV is off: run `on` first in the same command line (`on; app netflix`).
