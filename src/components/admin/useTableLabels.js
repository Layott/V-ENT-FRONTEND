'use client';

// Each console table cell carries its column's name, for the stacked phone
// layout (Apple review S11 / F4, inbox 569).
//
// At 720px and under, admin.module.css draws every row of the shared .table as
// a card with each cell on its own line, and a cell shows its column's name in
// front of it from `data-label`. Twenty-six tables in eighteen pages would
// each have had to write the label into every <td> by hand, and a table built
// next month would forget. So the console layout runs this once: it reads
// each table's <th> texts and copies them onto the cells of every row, again
// whenever rows arrive (filters, paging, a refresh).

import { useEffect } from 'react';
import shared from '@/components/admin/admin.module.css';

function label(table) {
  const heads = [...table.querySelectorAll(':scope > thead > tr > th')]
    .map((th) => th.textContent.trim());
  if (!heads.length) return;
  for (const row of table.querySelectorAll(':scope > tbody > tr')) {
    [...row.children].forEach((cell, i) => {
      const name = heads[i];
      if (name && cell.getAttribute('data-label') !== name) cell.setAttribute('data-label', name);
      if (!name && cell.hasAttribute('data-label')) cell.removeAttribute('data-label');
    });
  }
}

export default function useTableLabels() {
  useEffect(() => {
    const selector = `table.${CSS.escape(shared.table)}`;
    let queued = false;
    const run = () => {
      queued = false;
      document.querySelectorAll(selector).forEach(label);
    };
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(run);
    };
    run();
    const watcher = new MutationObserver(schedule);
    watcher.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => watcher.disconnect();
  }, []);
}
