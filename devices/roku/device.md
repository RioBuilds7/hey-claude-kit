### Roku TV
- Control: `bash devices/roku/roku.sh <cmd>`
- Commands: `on`, `off`, `home`, `back`, `select`, `up|down|left|right`, `play` (toggles play/pause),
  `mute`, `volup [steps]`, `voldown [steps]` (no absolute volume on Roku; ~3 steps is noticeable),
  `apps` (installed apps with IDs), `active` (what's on now), `info` (power state),
  `launch <appId or name>` (e.g. `launch Netflix`, `launch YouTube`),
  `search "<show or movie>" [app]` (e.g. `search "Black Mirror" Netflix` opens that show inside Netflix; do NOT
  launch the app first, the search does it; without an app it opens Roku's own search), `text "<string>"` (types into a search box), `key <RokuKey>`.
- Common IDs: Netflix 12, YouTube 837, Prime Video 13, Disney+ 291097, Hulu 2285, Max 61322, Spotify 22297.
- HTTP 200 means it worked. 403 means "Control by mobile apps" is off in Roku settings.
- Commands return at once; 200 = done. No sleep, no follow-up check needed. `on; launch Netflix` works in one line.
- Netflix may stop at its "Who's watching" profile screen: `select` picks the highlighted profile. Which profile to pick is in CLAUDE.md (if it isn't and the user tells you, save it there).
- A specific show or movie ON NETFLIX: `netflix <Netflix title id> [movie|series] [profile position]`, e.g.
  `bash devices/roku/roku.sh netflix 70264888 series 4` = Black Mirror on profile 4. It turns the TV on, opens the
  title page directly, and handles the profile screen by itself in the background: reply right away, don't wait.
  Find the id with a web search for "<title> netflix.com/title" (the number in netflix.com/title/NNN). Known ids are
  in CLAUDE.md; add each new one you look up. Then `select` starts playing from the title page.
  Roku's own `search` cannot open a title inside Netflix (it lands on Roku's search page): use this instead.
- `playing` prints the player state (play, pause, close).
