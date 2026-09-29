/*
 * Paste into a page (or run through Chrome's javascript tool) to list every
 * control that sits closer than MIN px under the text or block above it.
 *
 * CEO, 29 September 2026, with the sign-in email's button touching its
 * paragraph: "ensure this is not happening across the entire webiste also".
 * A static read of CSS cannot see this, because the gap is the sum of two
 * margins on two different elements, so it is measured on the rendered page.
 *
 * Returns [{control, above, gap}] for controls whose nearest block above,
 * overlapping horizontally, ends less than MIN px before the control starts.
 */
(() => {
  const MIN = 8;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const label = (el) => (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 50);
  const controls = [...document.querySelectorAll('button, a.btn, a.grnBTN, a.redBTN, [role="button"], input[type="submit"]')]
    .filter(visible);
  // A label sits close to its field on purpose, so it is not "text above".
  const blocks = [...document.querySelectorAll('p, h1, h2, h3, h4, input, textarea, select, ul, ol, table')]
    .filter(visible);
  const fields = [...document.querySelectorAll('input, textarea, select')].filter(visible);
  // A control on the same line as a field (Save beside the name box, an info
  // tip beside a heading) belongs to that row.
  const inRow = (r) => fields.some((f) => {
    const q = f.getBoundingClientRect();
    return Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > r.height / 2
      && (q.right <= r.left + 1 || q.left >= r.right - 1);
  });
  const inline = (c) => {
    const d = getComputedStyle(c).display;
    const p = c.parentElement && getComputedStyle(c.parentElement).display;
    return c.getBoundingClientRect().width < 40 && (d.startsWith('inline') || /flex/.test(p || ''));
  };
  const out = [];
  for (const c of controls) {
    const r = c.getBoundingClientRect();
    if (r.height < 24) continue; // inline links and icons
    if (inRow(r) || inline(c)) continue;
    // Icon-only controls (an info tip beside a label) are not the fault; a
    // worded button under a paragraph is.
    if (!(c.innerText || c.value || '').trim()) continue;
    let best = null;
    for (const b of blocks) {
      if (b.contains(c) || c.contains(b)) continue;
      const q = b.getBoundingClientRect();
      const overlap = Math.min(r.right, q.right) - Math.max(r.left, q.left);
      if (overlap <= 0) continue;
      const gap = r.top - q.bottom;
      if (gap < -1) continue; // not above it
      if (!best || gap < best.gap) best = { gap, b };
    }
    if (best && best.gap < MIN) {
      out.push({ control: label(c), above: label(best.b), gap: Math.round(best.gap * 10) / 10 });
    }
  }
  return out;
})();
