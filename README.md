# hey-claude kit

**Talk to Claude through the Echos in your home.** Claude hears what was said, controls the TVs, speakers, lights and the Mac, and answers out loud.

A starter kit to build your own: an always-on core, device scripts and a private Alexa skill.

## How it works

1. Someone speaks to an Echo: *"Alexa, tell Claude to put on Black Mirror."*
2. A small program on the Mac (the **brain**, `core/brain.js`) watches Alexa's voice history (one or more Amazon accounts).
3. If the sentence is meant for Claude, it goes to a Claude session that stays warm, so it answers in a few seconds and remembers the conversation.
4. Claude runs the right device script and speaks the reply on the Echo that heard it.

What counts as "meant for Claude":

- Said through the private **Claude Home** Alexa skill ("Alexa, ask Claude…", "Alexa, tell Claude to…").
- The name "Claude" is in the sentence (common mishearings are covered).
- A follow-up within 75 seconds of Claude's last reply.
- It names a device only Claude controls.
- Alexa failed ("Sorry, I don't know that").

## What it controls

| Folder | Device |
|---|---|
| `devices/roku` | Roku TV: power, apps, search, Netflix titles by deep link |
| `devices/samsung-tv` | Samsung TV: power, volume, keys, apps |
| `devices/sonos` | Sonos speaker |
| `devices/mac` | This Mac: volume, music, open apps and pages, lock, battery |
| `devices/alexa-smarthome` | Lights and plugs that are set up in Alexa |
| `devices/household` | Intercom between Echos, timers, lists, routines |
| `devices-disabled` | Extra device scripts that are switched off (LG TV, DVR camera, set-top box) |

Each folder has a `device.md` that tells Claude how to use it. Add a folder with a `device.md` and Claude picks it up.

**Which TV:** "the TV" means the TV in the room of the Echo that heard it. That map lives in `config.json` under `echoes`.

## Safety

- **No purchases.** Every text command sent to Alexa passes a guard in `core/alexa/connect.js` that only allows safe command types.
- **Open access otherwise.** Voice Claude can run anything on the Mac. That is a choice: read `core/brain.js` (the `--dangerously-skip-permissions` flag) and tighten it if you want.
- **Private files stay out of git:** Amazon logins, TV tokens, `config.json`, household notes (`CLAUDE.md`), and all conversation history.

## History

Every turn is kept forever in `history/turns-YYYY-MM.jsonl` (what was heard, what Claude did, what it said, how long it took). Credentials are masked. New sessions start with the last 15 turns as background.

## Setup (new home)

You need: a Mac that stays on, Node.js 18+, at least one Echo, and [Claude Code](https://claude.com/claude-code) installed and signed in (`claude` works in the terminal).

```bash
git clone https://github.com/RioBuilds7/hey-claude-kit.git && cd hey-claude-kit
npm install && (cd core/alexa && npm install)
cp config.example.json config.json      # your device addresses (see below)
cp CLAUDE.md.example CLAUDE.md          # household notes for Claude
node core/alexa/auth.js                 # opens a local page: log in to Amazon there
bash start.sh                           # turn it on (stays on after restarts)
bash stop.sh                            # turn it off
```

Then:

1. **`config.json`:** put in the IP addresses of your TVs and speakers (your router's device list or each device's network settings shows them). Delete the blocks for devices you don't have, and move their folder from `devices/` to `devices-disabled/`. Under `echoes`, map each Echo's exact name to the TV in its room.
2. **Alexa skill (optional but recommended):** follow `alexa-skill/README.md`. Without it, Claude still answers when you say its name or when Alexa fails.
3. **Samsung TV:** the first command shows an "Allow" prompt on the TV. Accept it with the remote.
4. **Second Amazon account:** `node core/alexa/auth.js account2`, then add `"account2"` to `alexa.accounts` in `config.json`.
5. **Turn off Voice Purchasing** in the Alexa app as a second layer on top of the purchase guard.

Watch it work: `tail -f brain.log`. Easiest way to adapt it to your home: open this folder in Claude Code and ask it to set things up for your devices.

If your Claude login lives in a non-default folder, set `claudeConfigDir` in `config.json`.

## Files

- `core/brain.js`: the always-on brain (routing, Claude session, speaking, history).
- `core/alexa/`: Amazon login, connection with the purchase guard, command-line control, intercom.
- `launchd/`: the macOS background jobs that keep it running.
