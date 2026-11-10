#!/usr/bin/env node
// Control smart-home devices linked to the Alexa account (lights, plugs, locks, cameras...).
// Usage:
//   node smarthome.js list                      -> name | type | entityId
//   node smarthome.js on "<name>"               -> turn on
//   node smarthome.js off "<name>"
//   node smarthome.js brightness "<name>" 0-100
//   node smarthome.js color "<name>" <colorName>   (e.g. red, blue, warm_white)
//   node smarthome.js temp "<name>" <warm_white|soft_white|white|daylight_white|cool_white>
//   node smarthome.js lock|unlock "<name>"
//   node smarthome.js state "<name>"
//   node smarthome.js raw "<name>" '<json parameters>'   e.g. '{"action":"turnOn"}'
// "<name>" matches the Alexa app name, case-insensitive; partial match if unique.
const fs = require('fs');
const path = require('path');
const { connect } = require('../../core/alexa/connect');

const CACHE = path.join(__dirname, '.devices_cache.json');
const [cmd = 'list', name, value] = process.argv.slice(2);

function done(err, out) {
  if (err) { console.error('Error:', err.message || err); process.exit(1); }
  if (out !== undefined) console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
  process.exit(0);
}

function loadDevices(alexa, fresh, cb) {
  if (!fresh && fs.existsSync(CACHE) && Date.now() - fs.statSync(CACHE).mtimeMs < 6 * 3600e3) {
    return cb(null, JSON.parse(fs.readFileSync(CACHE, 'utf8')));
  }
  alexa.getSmarthomeDevicesV2((err, items) => {
    if (err) return cb(err);
    const list = items.map(d => {
      const la = d.legacyAppliance || {};
      return {
        name: d.friendlyName || la.friendlyName,
        entityId: la.applianceId || la.entityId || d.id,
        description: la.friendlyDescription || '',
        applianceId: la.applianceId,
        types: la.applianceTypes || [],
        actions: la.actions || [],
      };
    }).filter(d => d.name && d.entityId);
    fs.writeFileSync(CACHE, JSON.stringify(list, null, 2));
    cb(null, list);
  });
}

function find(list, n) {
  const q = (n || '').toLowerCase().trim();
  const exact = list.filter(d => d.name.toLowerCase() === q);
  if (exact.length) return exact;
  const part = list.filter(d => d.name.toLowerCase().includes(q));
  return part;
}

connect((err, alexa) => {
  if (err) return done(err);
  loadDevices(alexa, cmd === 'list', (err, list) => {
    if (err) return done(err);
    if (cmd === 'list') {
      return done(null, list.map(d => `${d.name} | ${d.types.join(',')} | ${d.description}`).join('\n') || '(no smart-home devices)');
    }
    const matches = find(list, name);
    if (!matches.length) return done(new Error(`No device named "${name}". Run: list`));
    if (matches.length > 1 && !['on', 'off'].includes(cmd)) {
      return done(new Error(`Ambiguous "${name}": ${matches.map(m => m.name).join(', ')}`));
    }
    const ids = matches.map(m => m.entityId);
    let params;
    switch (cmd) {
      case 'on': params = { action: 'turnOn' }; break;
      case 'off': params = { action: 'turnOff' }; break;
      case 'brightness': params = { action: 'setBrightness', brightness: Number(value) }; break;
      case 'color': params = { action: 'setColor', colorName: value }; break;
      case 'temp': params = { action: 'setColorTemperature', colorTemperatureName: value }; break;
      case 'lock': params = { action: 'lockAction', targetLockState: { value: 'LOCKED' } }; break;
      case 'unlock': params = { action: 'lockAction', targetLockState: { value: 'UNLOCKED' } }; break;
      case 'raw': params = JSON.parse(value); break;
      case 'state':
        return alexa.querySmarthomeDevices(ids, 'APPLIANCE', (e, res) => {
          if (e) return done(e);
          if (res.errors && res.errors.length && !(res.deviceStates || []).length) return done(null, `${name}: ${res.errors.map(x => x.code).join(', ')}`);
          const states = (res.deviceStates || []).map(st => (JSON.parse(st.capabilityStates ? '[' + st.capabilityStates.join(',') + ']' : '[]'))
            .map(c => `${c.name}=${typeof c.value === 'object' ? JSON.stringify(c.value) : c.value}`).join(' '));
          done(null, states.join('\n') || JSON.stringify(res));
        });
      default: return done(new Error('Unknown command ' + cmd));
    }
    alexa.executeSmarthomeDeviceAction(ids, params, 'APPLIANCE', (e, res) => {
      if (e) return done(e);
      if (res && res.errors && res.errors.length) {
        const codes = res.errors.map(x => x.code).join(', ');
        return done(new Error(codes.includes('UNREACHABLE') ? `${matches.map(m => m.name).join(', ')} is offline (unplugged or disconnected from its app)` : codes));
      }
      done(null, `OK: ${matches.map(m => m.name).join(', ')} -> ${params.action}`);
    });
  });
});
