import fs from 'fs';
const files = ['modern-minimal.css', 'amber-minimal.css', 'claude.css', 'northern-lights.css', 'darkmatter.css'];
let out = '';
for (const f of files) {
  out += fs.readFileSync(f, 'utf8') + '\n';
}
fs.writeFileSync('src/themes.css', out);
