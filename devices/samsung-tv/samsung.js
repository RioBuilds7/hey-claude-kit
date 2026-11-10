#!/usr/bin/env node
// Samsung smart TV (Tizen, 2016+) control over the local network.
// First use: the TV shows an "Allow" prompt; accept it with the remote. The token is saved.
// Usage: node samsung.js on|off|status|key <KEY_...>|volup [n]|voldown [n]|mute|home|back|enter|
//                        up|down|left|right|play|pause|source|app <name|appId>|apps|browser <url>
const fs = require('fs');
const path = require('path');
const dgram = require('dgram');
const http = require('http');
const tls = require('tls');
const crypto = require('crypto');
const WebSocket = require('ws');
const { load } = require('../../core/config');

const cfg = load().samsung || {};
const TOKEN_FILE = path.join(__dirname, '.token');
const CERT_FILE = path.join(__dirname, '.tv_cert.pem'); // TV's self-signed cert, pinned on first pairing
const [cmd = 'status', arg] = process.argv.slice(2);
const APPS = {
  netflix: '3201907018807', youtube: '111299001912', prime: '3201910019365', 'prime video': '3201910019365',
  disney: '3201901017640', 'disney+': '3201901017640', hulu: '3201601007625', max: '3202301029760',
  spotify: '3201606009684', plex: '3201512006963', 'apple tv': '3201807016597', tubi: '3201504001965',
  browser: 'org.tizen.browser', 'youtube tv': '3201707014489', peacock: '3202006020991', paramount: '3201710015037',
};
const KEYS = { home: 'KEY_HOME', back: 'KEY_RETURN', enter: 'KEY_ENTER', up: 'KEY_UP', down: 'KEY_DOWN',
  left: 'KEY_LEFT', right: 'KEY_RIGHT', mute: 'KEY_MUTE', play: 'KEY_PLAY', pause: 'KEY_PAUSE',
  source: 'KEY_SOURCE', off: 'KEY_POWER' };

if (!cfg.ip) { console.error('Samsung IP not set in config.json'); process.exit(1); }
const exit = (code, msg) => { if (msg) console.log(msg); process.exit(code); };

function getInfo(cb) {
  const req = http.get({ host: cfg.ip, port: 8001, path: '/api/v2/', timeout: 2500 }, res => {
    let b = ''; res.on('data', d => b += d); res.on('end', () => { try { cb(null, JSON.parse(b)); } catch (e) { cb(e); } });
  });
  req.on('timeout', () => req.destroy(new Error('timeout'))); req.on('error', cb);
}

function wake(cb) {
  if (!cfg.mac) return cb(new Error('Samsung MAC not set in config.json (needed to turn on)'));
  const mac = Buffer.from(cfg.mac.replace(/[:-]/g, ''), 'hex');
  const pkt = Buffer.concat([Buffer.alloc(6, 0xff), ...Array(16).fill(mac)]);
  const s = dgram.createSocket('udp4');
  s.bind(() => { s.setBroadcast(true); let n = 0;
    const send = () => s.send(pkt, 9, '255.255.255.255', () => { if (++n < 5) setTimeout(send, 200); else { s.close(); cb(); } });
    send(); });
}

// Trust-on-first-use: save the TV's certificate the first time, then only talk to that exact cert.
function pinnedCert(cb) {
  if (fs.existsSync(CERT_FILE)) return cb(null, fs.readFileSync(CERT_FILE, 'utf8'));
  const sock = tls.connect({ host: cfg.ip, port: 8002, rejectUnauthorized: false, timeout: 5000 }, () => {
    // Save the whole chain the TV presents (leaf + Samsung CA certs) as the only trusted CAs.
    const pems = []; const seen = new Set();
    for (let c = sock.getPeerCertificate(true); c && c.raw && !seen.has(c.fingerprint256); c = c.issuerCertificate) {
      seen.add(c.fingerprint256);
      pems.push('-----BEGIN CERTIFICATE-----\n' + c.raw.toString('base64').match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----\n');
    }
    sock.end();
    if (!pems.length) return cb(new Error('TV sent no certificate'));
    fs.writeFileSync(CERT_FILE, pems.join('')); cb(null, pems.join(''));
  });
  sock.on('error', cb); sock.on('timeout', () => sock.destroy(new Error('timeout')));
}
const fp = pem => crypto.createHash('sha256').update(new crypto.X509Certificate(pem.split('-----END CERTIFICATE-----')[0] + '-----END CERTIFICATE-----\n').raw).digest('hex');

function ws(onOpen) {
  pinnedCert((err, pem) => err ? exit(1, 'TV not reachable: ' + err.message) : wsPinned(pem, onOpen));
}
function wsPinned(pem, onOpen) {
  const token = fs.existsSync(TOKEN_FILE) ? fs.readFileSync(TOKEN_FILE, 'utf8').trim() : '';
  const name = Buffer.from('HeyClaude').toString('base64');
  const url = `wss://${cfg.ip}:8002/api/v2/channels/samsung.remote.control?name=${name}` + (token ? `&token=${token}` : '');
  const want = fp(pem);
  const sock = new WebSocket(url, { ca: pem, handshakeTimeout: 5000,
    // Cert is self-signed for a name we can't predict, so check the pinned fingerprint instead of the hostname.
    checkServerIdentity: (_h, cert) => (crypto.createHash('sha256').update(cert.raw).digest('hex') === want ? undefined
      : new Error('TV certificate changed. If you replaced/reset the TV, delete devices/samsung-tv/.tv_cert.pem and pair again.')) });
  const timer = setTimeout(() => exit(1, 'No answer from TV (if a prompt is on screen, press Allow and retry)'), 30000);
  sock.on('message', m => {
    const msg = JSON.parse(m.toString());
    if (msg.event === 'ms.channel.connect') {
      if (msg.data && msg.data.token) fs.writeFileSync(TOKEN_FILE, String(msg.data.token));
      clearTimeout(timer); onOpen(sock);
    } else if (msg.event === 'ms.channel.unauthorized') exit(1, 'TV refused: press Allow on the TV prompt, or re-enable in TV settings > Connected devices');
  });
  sock.on('error', e => exit(1, 'TV not reachable: ' + e.message));
}
const sendKey = (sock, key) => sock.send(JSON.stringify({ method: 'ms.remote.control',
  params: { Cmd: 'Click', DataOfCmd: key, Option: 'false', TypeOfRemote: 'SendRemoteKey' } }));
function keys(list) {
  ws(sock => { let i = 0; const next = () => { if (i >= list.length) return setTimeout(() => exit(0, 'ok'), 300);
    sendKey(sock, list[i++]); setTimeout(next, 250); }; next(); });
}

switch (cmd) {
  case 'status':
    getInfo((e, info) => e ? exit(0, 'off (not reachable)') :
      exit(0, `${(info.device && info.device.PowerState) || 'on'} | ${info.device && info.device.name} | ${info.device && info.device.modelName}`));
    break;
  case 'on':
    getInfo((e, info) => {
      if (!e && (!info.device || info.device.PowerState !== 'standby')) return exit(0, 'already on');
      if (!e) return keys(['KEY_POWER']); // standby with network still up
      wake(err => {
        if (err) return exit(1, err.message);
        const t0 = Date.now();
        const check = () => getInfo(e2 => {
          if (!e2) return exit(0, 'on');
          if (Date.now() - t0 > 7000) return exit(0, 'wake signal sent, but the TV has not answered yet (it may be fully powered off)');
          setTimeout(check, 700);
        });
        setTimeout(check, 1500);
      });
    });
    break;
  case 'volup': case 'voldown':
    keys(Array(Number(arg) || 3).fill(cmd === 'volup' ? 'KEY_VOLUP' : 'KEY_VOLDOWN')); break;
  case 'key': keys([arg]); break;
  case 'apps':
    ws(sock => { sock.send(JSON.stringify({ method: 'ms.channel.emit', params: { event: 'ed.installedApp.get', to: 'host' } }));
      sock.on('message', m => { const msg = JSON.parse(m.toString());
        if (msg.event === 'ed.installedApp.get') exit(0, msg.data.data.map(a => `${a.appId} ${a.name}`).join('\n')); });
      setTimeout(() => exit(0, 'This TV does not list apps. Known names: ' + Object.keys(APPS).join(', ')), 6000); });
    break;
  case 'app': case 'browser': {
    const id = cmd === 'browser' ? 'org.tizen.browser' : (APPS[(arg || '').toLowerCase()] || arg);
    ws(sock => { sock.send(JSON.stringify({ method: 'ms.channel.emit', params: { event: 'ed.apps.launch', to: 'host',
      data: { appId: id, action_type: id.includes('.') ? 'NATIVE_LAUNCH' : 'DEEP_LINK', ...(cmd === 'browser' ? { metaTag: arg } : {}) } } }));
      setTimeout(() => exit(0, 'launched ' + id), 800); });
    break; }
  default:
    if (KEYS[cmd]) keys([KEYS[cmd]]); else exit(1, 'unknown command ' + cmd);
}
