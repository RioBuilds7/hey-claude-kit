#!/usr/bin/env node
// Sonos speaker control (local network).
// Usage: node sonos.js status|play|pause|next|previous|volume <0-100>|volup [n]|voldown [n]|mute|unmute|
//                      uri <url>
const { Sonos } = require('sonos');
const { load } = require('../../core/config');
const cfg = load().sonos || {};
const [cmd = 'status', arg] = process.argv.slice(2);
if (!cfg.ip) { console.error('Sonos IP not set in config.json'); process.exit(1); }
const s = new Sonos(cfg.ip);
const out = v => { console.log(typeof v === 'string' ? v : JSON.stringify(v)); process.exit(0); };
const fail = e => { console.error('Error:', e.message || e); process.exit(1); };
(async () => {
  switch (cmd) {
    case 'status': {
      const [state, vol, track] = await Promise.all([s.getCurrentState(), s.getVolume(), s.currentTrack().catch(() => ({}))]);
      return out(`${state} | volume ${vol} | ${track.artist || ''} - ${track.title || ''}`);
    }
    case 'play': await s.play(); return out('playing');
    case 'pause': await s.pause(); return out('paused');
    case 'next': await s.next(); return out('next');
    case 'previous': await s.previous(); return out('previous');
    case 'volume': await s.setVolume(Number(arg)); return out('volume ' + arg);
    case 'volup': case 'voldown': {
      const v = await s.getVolume(); const n = Math.max(0, Math.min(100, v + (cmd === 'volup' ? 1 : -1) * (Number(arg) || 10)));
      await s.setVolume(n); return out('volume ' + n);
    }
    case 'mute': await s.setMuted(true); return out('muted');
    case 'unmute': await s.setMuted(false); return out('unmuted');
    case 'uri': await s.play(arg); return out('playing ' + arg);
    default: fail('unknown command ' + cmd);
  }
})().catch(fail);
