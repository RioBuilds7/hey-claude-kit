# "Claude Home" Alexa skill (private, development stage)

Build the same skill on each Amazon account you connect (developer.amazon.com > Alexa console > Create skill > Custom > Alexa-hosted Node.js).
Sign in with the same Amazon account the Echos use. Skill IDs are per account; keep yours in config notes, not in git.

Invocation name: "claude". Say "Alexa, ask Claude to ..." or "Alexa, open Claude".
To change: Build > JSON Editor (paste interactionModel.json, Save, Build skill);
Code tab (paste lambda/index.js, Save, Deploy); Test tab must stay on "Development".
