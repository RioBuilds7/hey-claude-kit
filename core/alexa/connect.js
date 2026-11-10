// Opens a logged-in alexa-remote2 session using the saved cookie and config.json region.
const fs = require('fs');
const path = require('path');
const Alexa = require('alexa-remote2');
const { load } = require('../config');

const COOKIE_FILE = path.join(__dirname, 'cookie_data.json');
// Extra Amazon accounts keep their own login file: cookie_data.<name>.json
const cookieFile = account => (!account || account === 'default') ? COOKIE_FILE : path.join(__dirname, `cookie_data.${account.replace(/[^a-z0-9_-]/gi, '')}.json`);

// Purchase guard at the shared sink: every text command sent to Alexa through this project passes here,
// whichever script sends it. Speech ("speak", "announcement") is not affected.
const MONEY = /\b(buy\w*|bought|order\w*|reorder\w*|purchas\w*|check\s*out|checkout|cart|basket|subscrib\w*|donat\w*|pay\w*|send (some )?money|gift ?card|shop for|ship (it|me)|deliver me|prime now|place (an|the|my) order)\b/i;
// Allowlist: a text command must START with one of these safe request types. Confirmations ("yes", "sure",
// a PIN) and anything unrecognised are refused, so nothing sent from here can approve a purchase prompt.
const SAFE_START = /^(show|hide|play|pause|resume|stop|turn (on|off|up|down)|dim|brighten|mute|unmute|next|previous|skip|volume|set (a |an |the )?(timer|alarm|volume|brightness)|cancel (the |my )?(timer|alarm)|what|what's|whats|who|when|where|how|why|is|are|tell me|go home)\b/i;
const isTextCmd = c => typeof c === 'string' && /^textcommand$/i.test(c);
function blocked(command, value) {
  if (isTextCmd(command)) {
    const v = String(value || '').trim();
    if (/[^\x20-\x7e]/.test(v)) return 'Blocked text command (purchase guard): unusual characters';
    if (!SAFE_START.test(v) || MONEY.test(v)) return `Blocked text command (purchase guard): "${v.slice(0, 60)}"`;
  }
  if (command && typeof command === 'object') {
    const j = JSON.stringify(command);
    if (/TextCommand|Alexa\.Shopping|Alexa\.Buy/i.test(j) && (MONEY.test(j) || /Alexa\.(Shopping|Buy)/i.test(j))) return 'Blocked sequence (purchase guard)';
  }
  return null;
}
function guard(alexa) {
  const seq = alexa.sendSequenceCommand.bind(alexa);
  alexa.sendSequenceCommand = (dev, command, value, a, b) => {
    const why = blocked(command, typeof value === 'function' ? null : value);
    if (why) { const cb = [value, a, b].find(x => typeof x === 'function'); console.error(why); return cb && cb(new Error(why), null); }
    return seq(dev, command, value, a, b);
  };
  const multi = alexa.sendMultiSequenceCommand.bind(alexa);
  alexa.sendMultiSequenceCommand = (dev, commands, type, a, b) => {
    const why = (commands || []).map(c => blocked(c.command, c.value)).find(Boolean);
    if (why) { const cb = [type, a, b].find(x => typeof x === 'function'); console.error(why); return cb && cb(new Error(why), null); }
    return multi(dev, commands, type, a, b);
  };
  return alexa;
}

function connect(cb, account) {
  const COOKIE_FILE = cookieFile(account);
  if (!fs.existsSync(COOKIE_FILE)) return cb(new Error(`No login for account "${account || 'default'}". Run: node core/alexa/auth.js ${account || ''}`));
  const cfg = load();
  const saved = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
  const alexa = guard(new Alexa());
  alexa.on('cookie', (cookie, csrf, macDms) => {
    fs.writeFileSync(COOKIE_FILE, JSON.stringify({ cookie: alexa.cookieData || cookie, csrf, macDms }, null, 2));
  });
  alexa.init({
    cookie: saved.cookie, macDms: saved.macDms, formerRegistrationData: saved.cookie,
    proxyOnly: false, bluetooth: false, useWsMqtt: false,
    alexaServiceHost: cfg.alexa.alexaServiceHost || 'pitangui.amazon.com',
    amazonPage: cfg.alexa.amazonDomain || 'amazon.com',
    logger: false, cookieRefreshInterval: 3 * 24 * 60 * 60 * 1000, // renew login every 3 days
  }, (err) => cb(err, alexa, cfg));
}
module.exports = { connect, COOKIE_FILE, cookieFile };
