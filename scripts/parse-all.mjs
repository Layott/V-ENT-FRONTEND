// Every .js under src/ must still parse. A codemod that edits JSX by hand is
// exactly the kind of change that produces plausible-looking broken files.
import { parse } from '../node_modules/.pnpm/@babel+parser@7.29.2/node_modules/@babel/parser/lib/index.js';
import fs from 'fs';
import path from 'path';

const bad = [];
let n = 0;
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) {
      n++;
      try { parse(fs.readFileSync(p, 'utf8'), { sourceType: 'module', plugins: ['jsx'] }); }
      catch (err) { bad.push(`${p}: ${err.message}`); }
    }
  }
};
walk('src');
console.log(`parsed ${n}, ${bad.length} failed`);
bad.slice(0, 10).forEach((b) => console.log('  ' + b));
process.exit(bad.length ? 1 : 0);
