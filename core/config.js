// Shared config loader: config.json at the project root.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'config.json');
function load() { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
function save(cfg) { fs.writeFileSync(FILE, JSON.stringify(cfg, null, 2) + '\n'); }
module.exports = { ROOT, load, save };
