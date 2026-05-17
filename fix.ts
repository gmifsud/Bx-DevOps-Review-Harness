import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Find the line that is exactly `            )` right before the fallback mockup
const targetRegex = /\s*\)\s*\{\/\* Fallback mockup/m;
code = code.replace(targetRegex, `\n            )}\n\n            {/* Fallback mockup`);

fs.writeFileSync('src/App.tsx', code);
