### Alexa smart home (lights, plugs, switches, locks, cameras linked in the Alexa app)
- Control: `node devices/alexa-smarthome/smarthome.js <cmd> "<device name>" [value]`
- Commands: `list` (refresh device names), `on`, `off`, `brightness <0-100>`, `color <name>`,
  `temp <warm_white|soft_white|white|daylight_white|cool_white>`, `lock`, `unlock`, `state`,
  `raw '<json>'`.
- Names are the names in the Alexa app, case-insensitive; a unique partial name works. `on`/`off`
  with a partial name hits every match (e.g. "bedroom" turns on all bedroom lights).
- If unsure of a name, run `list` first. Known names are kept in CLAUDE.md under "Device nicknames".
- Cameras: Alexa can only show camera feeds on an Echo Show or Fire TV, not on the Samsung or Roku.
  To show one, use Alexa text command: `cd core/alexa && node control.js textcommand "show <camera name>"` (text commands only accept safe request types: show, play, pause, timers, questions; anything else is refused)
  only if the user asked to see it on an Echo Show/Fire TV. Otherwise say it can't be cast to that TV.
