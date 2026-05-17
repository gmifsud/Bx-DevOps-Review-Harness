import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/text-text-secondary/g, 'text-muted-foreground');
code = code.replace(/bg-text-primary/g, 'bg-foreground');
code = code.replace(/border-text-primary/g, 'border-foreground');
code = code.replace(/ring-text-primary/g, 'ring-foreground');
code = code.replace(/bg-text-secondary/g, 'bg-muted-foreground');
fs.writeFileSync('src/App.tsx', code);
