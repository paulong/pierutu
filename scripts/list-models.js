const fs = require('fs');
const path = require('path');
const { fetch } = require('node:undici');

function readEnv(file) {
  const content = fs.readFileSync(file, 'utf8');
  return content.split(/\r?\n/).reduce((acc, line) => {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!match) return acc;
    let [, key, value] = match;
    value = value.replace(/^"|"$/g, '');
    acc[key] = value;
    return acc;
  }, {});
}

const env = readEnv(path.join(__dirname, '../.env.local'));
console.log('KEY:', env.GOOGLE_GENERATIVE_AI_API_KEY ? env.GOOGLE_GENERATIVE_AI_API_KEY.slice(0, 20) + '...' : 'missing');
const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error('No API key configured');
  process.exit(1);
}

const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(apiKey);

fetch(url)
  .then(res => res.text().then(text => ({ status: res.status, text })))
  .then(r => {
    console.log('STATUS', r.status);
    console.log(r.text);
  })
  .catch(err => {
    console.error('ERR', err.message);
    console.error(err);
  });
