import fs from 'fs';

const urls = [
  'https://tweakcn.com/r/themes/modern-minimal.json',
  'https://tweakcn.com/r/themes/amber-minimal.json',
  'https://tweakcn.com/r/themes/claude.json',
  'https://tweakcn.com/r/themes/northern-lights.json',
  'https://tweakcn.com/r/themes/darkmatter.json'
];
async function run() {
  for (const url of urls) {
    const res = await fetch(url);
    const json = await res.json();
    const name = url.split('/').pop().replace('.json', '');
    fs.writeFileSync(name + '.css', `
.theme-${name} {
${Object.entries(json.cssVars?.light || json.cssVars?.root || {}).map(([k,v]) => `  --${k}: ${v};`).join('\n')}
}
.theme-${name}.dark, .dark .theme-${name} {
${Object.entries(json.cssVars?.dark || {}).map(([k,v]) => `  --${k}: ${v};`).join('\n')}
}
`);
  }
}
run();
