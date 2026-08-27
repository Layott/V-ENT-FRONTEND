// Move every info tip onto the row of the label it explains.
//
// A codemod appended `<InfoTip/>` as the LAST child of `<label>`, after the
// input and after the error message. Every `.label` here is
// `display:flex; flex-direction:column`, so each child becomes its own row and
// the mark landed on a bare row underneath the field, detached from the thing
// it explains and below the error text.
//
// Moving it is not enough on its own: a flex column gives every child a row, so
// the label text and the mark would still be two rows. The text run and the
// mark have to share one inline container, which is what `.fieldLabelRow` in
// globals.css is for. That also fixes the "(optional)" marker, which was being
// pushed onto a line of its own by the same rule.
//
// Done against the AST rather than by line, because 60 of the 127 sites put the
// whole label on a single physical line - `<label>{text}<input/><InfoTip/></label>`
// - where a line-based edit is guessing. Edits are applied as text splices at
// exact offsets, from the end of the file backwards, so nothing outside the
// moved fragment is reformatted.
import { parse } from '../node_modules/.pnpm/@babel+parser@7.29.2/node_modules/@babel/parser/lib/index.js';
import fs from 'fs';
import path from 'path';

const CONTROLS = new Set(['input', 'select', 'textarea']);
const WRAP_CLASS = 'fieldLabelRow';

const elementName = (node) => {
  const n = node?.openingElement?.name;
  if (!n) return null;
  if (n.type === 'JSXIdentifier') return n.name;
  if (n.type === 'JSXMemberExpression') return n.property?.name || null;
  return null;
};

const isWhitespaceText = (c) => c.type === 'JSXText' && c.value.trim() === '';

/** Does this subtree render a form control anywhere inside it? */
const containsControl = (node) => {
  let found = false;
  walk(node, (el) => { if (CONTROLS.has(elementName(el))) found = true; });
  return found;
};

/** Walk every node, calling fn on JSXElements. No traverse dependency. */
const walk = (node, fn, seen = new Set()) => {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const child of node) walk(child, fn, seen);
    return;
  }
  if (node.type === 'JSXElement') fn(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range' || key === 'leadingComments'
        || key === 'trailingComments') continue;
    walk(node[key], fn, seen);
  }
};

const collectEdits = (ast, src, report) => {
  const edits = [];

  walk(ast, (node) => {
    if (elementName(node) !== 'label') return;

    const kids = node.children || [];
    const tipIdx = kids.findIndex((c) => c.type === 'JSXElement' && elementName(c) === 'InfoTip');
    if (tipIdx === -1) return;
    const tip = kids[tipIdx];

    // Where the label's own text stops and its control begins. Everything
    // before that is what a person reads as the label.
    //
    // The control is not always a direct child. `{games.length > 0 ? <select/>
    // : <input/>}` hides one inside a ternary, and the first version of this
    // looked only at direct children, so it wrapped the select INSIDE the
    // label-row span. That parses perfectly and is structurally wrong, which is
    // the whole reason a parse check is not a correctness check.
    let stopIdx = kids.findIndex((c, i) => i !== tipIdx && containsControl(c));

    if (stopIdx === -1) {
      // Genuinely no control in this label: fall back to the first element
      // child that is not the tip and not the label's own text span.
      stopIdx = kids.findIndex((c, i) => c.type === 'JSXElement'
        && i !== tipIdx && elementName(c) !== 'span');
    }
    if (stopIdx === -1) stopIdx = tipIdx;

    // The leading run: everything before the control, minus the tip itself.
    const leading = kids.slice(0, stopIdx).filter((c, i) => i !== tipIdx);
    const meaningful = leading.filter((c) => !isWhitespaceText(c));
    if (meaningful.length === 0) {
      report.skipped.push({ reason: 'no label text before the control', start: node.start });
      return;
    }
    if (tipIdx < stopIdx) {
      // Already inside the text run. Still needs wrapping so the run shares a
      // row, but nothing moves.
      report.alreadyInline += 1;
    }

    const from = meaningful[0].start;
    const to = meaningful[meaningful.length - 1].end;
    const runText = src.slice(from, to).trim();
    const tipText = src.slice(tip.start, tip.end);

    // Guard: never wrap something that already carries the class.
    if (runText.includes(WRAP_CLASS)) {
      report.skipped.push({ reason: 'already wrapped', start: node.start });
      return;
    }

    // Remove the tip where it stands (only when it is outside the run).
    if (tipIdx >= stopIdx) {
      edits.push({ start: tip.start, end: tip.end, text: '' });
    }

    edits.push({
      start: from,
      end: to,
      text: `<span className="${WRAP_CLASS}">${runText} ${tipText}</span>`,
    });

    report.moved += 1;
  });

  return edits;
};

const apply = (src, edits) => {
  // Last first, so earlier offsets stay valid. Overlaps would corrupt the file,
  // so refuse rather than produce something that merely parses.
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].start < sorted[i + 1].end) {
      throw new Error(`overlapping edits at ${sorted[i + 1].end}..${sorted[i].start}`);
    }
  }
  let out = src;
  for (const e of sorted) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
};

/** Drop lines left holding nothing but whitespace by a removal. */
const tidy = (text) => text.replace(/\n[ \t]+\n/g, '\n\n').replace(/\n{3,}/g, '\n\n');

const report = { moved: 0, alreadyInline: 0, skipped: [], files: 0, failed: [] };
const only = process.argv[2] || null;

const walkFiles = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, out);
    else if (e.name.endsWith('.js')) out.push(p.split(path.sep).join('/'));
  }
  return out;
};

for (const file of walkFiles('src')) {
  if (only && !file.includes(only)) continue;
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('<InfoTip')) continue;

  let ast;
  try {
    ast = parse(src, { sourceType: 'module', plugins: ['jsx'] });
  } catch (err) {
    report.failed.push(`${file}: parse: ${err.message}`);
    continue;
  }

  const before = report.moved;
  let edits;
  try {
    edits = collectEdits(ast, src, report);
  } catch (err) {
    report.failed.push(`${file}: ${err.message}`);
    continue;
  }
  if (!edits.length) continue;

  let out;
  try {
    out = tidy(apply(src, edits));
  } catch (err) {
    report.failed.push(`${file}: ${err.message}`);
    report.moved = before;
    continue;
  }

  // Never write a file that no longer parses.
  try {
    parse(out, { sourceType: 'module', plugins: ['jsx'] });
  } catch (err) {
    report.failed.push(`${file}: result does not parse: ${err.message}`);
    report.moved = before;
    continue;
  }

  fs.writeFileSync(file, out);
  report.files += 1;
}

console.log(`${report.moved} tips wrapped onto their label row, across ${report.files} files`);
console.log(`${report.alreadyInline} were already inside the text run (wrapped, not moved)`);
if (report.skipped.length) {
  console.log(`${report.skipped.length} skipped:`);
  const byReason = {};
  for (const s of report.skipped) byReason[s.reason] = (byReason[s.reason] || 0) + 1;
  for (const [r, n] of Object.entries(byReason)) console.log(`   ${n}  ${r}`);
}
if (report.failed.length) {
  console.log(`${report.failed.length} FAILED:`);
  report.failed.slice(0, 10).forEach((f) => console.log('   ' + f));
  process.exitCode = 1;
}
