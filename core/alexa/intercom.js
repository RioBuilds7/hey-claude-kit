#!/usr/bin/env node
// Speak on any Echo in the house, across both Amazon accounts.
// Usage: node core/alexa/intercom.js list
//        node core/alexa/intercom.js "<echo name or part of it | all>" "message"
const { connect } = require('./connect');
const { load } = require('../config');
const [target = 'list', message] = process.argv.slice(2);
setTimeout(() => { console.error('timed out'); process.exit(2); }, 20000);
const accounts = load().alexa.accounts || ['default'];
let left = accounts.length; const found = [];
accounts.forEach(name => connect((err, alexa) => {
  if (!err) for (const s of Object.keys(alexa.serialNumbers)) {
    const d = alexa.find(s);
    if (['ECHO', 'KNIGHT', 'ROOK'].includes(d.deviceFamily)) found.push({ name, alexa, dev: d });
  }
  if (--left === 0) run();
}, name));
function run() {
  if (target === 'list') { found.forEach(f => console.log(`${f.dev.accountName} (${f.name} account)`)); process.exit(0); }
  const q = target.toLowerCase();
  const hits = q === 'all' ? found : found.filter(f => f.dev.accountName.toLowerCase().includes(q));
  if (!hits.length) { console.error(`No Echo matching "${target}". Have: ${found.map(f => f.dev.accountName).join(', ')}`); process.exit(1); }
  if (!message) { console.error('No message given'); process.exit(1); }
  let n = hits.length;
  const text = `<voice name="Matthew">${message.replace(/&/g, 'and').replace(/[<>]/g, ' ')}</voice>`;
  hits.forEach(f => f.alexa.sendSequenceCommand(f.dev.serialNumber, 'speak', text, e => {
    console.log(e ? `failed on ${f.dev.accountName}: ${e.message}` : `said on ${f.dev.accountName}`);
    if (--n === 0) process.exit(0);
  }));
}
