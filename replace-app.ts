import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/bg-obsidian/g, 'bg-background');
code = code.replace(/text-text-primary/g, 'text-foreground');
code = code.replace(/border-divider/g, 'border-border');
code = code.replace(/text-text-secondary/g, 'text-muted-foreground');
code = code.replace(/bg-surface-hover/g, 'bg-accent');
code = code.replace(/bg-surface/g, 'bg-card');
code = code.replace(/bg-accent/g, 'bg-primary');
code = code.replace(/text-accent-text/g, 'text-primary-foreground');
code = code.replace(/border-l-accent-text/g, 'border-l-primary-foreground');
code = code.replace(/border-l-accent/g, 'border-l-primary');
code = code.replace(/rounded-none/g, 'rounded-md'); // wait, Shadcn defaults to nicely rounded. Let's make it rounded-md.
code = code.replace(/uppercase tracking-\[0.05em\]/g, 'tracking-tight'); // replace with something nicer or remove it
code = code.replace(/transition-none/g, 'transition-colors'); // make transitions smooth

fs.writeFileSync('src/App.tsx', code);
