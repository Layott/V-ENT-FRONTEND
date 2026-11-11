'use client';

// Sideways rows say when there is more (Apple review S22, inbox 569).
//
// Event console tabs, the events filters, the My list tabs and the partner
// docs code blocks scroll sideways on a phone and gave no sign there was more
// past the edge. Anything marked `data-edge-fade` gets `data-more` set to
// "left", "right" or both while content waits on that side, and globals.css
// softens that edge with a mask (a fade in the content, never a line). It is
// kept current on scroll, on resize and when the contents change.

import { useEffect } from 'react';

function measure(el) {
  const max = el.scrollWidth - el.clientWidth;
  const more = [];
  if (max > 1) {
    if (el.scrollLeft > 1) more.push('left');
    if (el.scrollLeft < max - 1) more.push('right');
  }
  const value = more.join(' ');
  if ((el.getAttribute('data-more') || '') !== value) {
    if (value) el.setAttribute('data-more', value); else el.removeAttribute('data-more');
  }
}

export default function EdgeFade() {
  useEffect(() => {
    const watched = new Set();
    const onScroll = (e) => measure(e.currentTarget);
    const sizes = new ResizeObserver((entries) => entries.forEach((en) => measure(en.target)));
    const scan = () => {
      document.querySelectorAll('[data-edge-fade]').forEach((el) => {
        if (watched.has(el)) { measure(el); return; }
        watched.add(el);
        el.addEventListener('scroll', onScroll, { passive: true });
        sizes.observe(el);
        measure(el);
      });
      for (const el of [...watched]) {
        if (!el.isConnected) {
          watched.delete(el);
          el.removeEventListener('scroll', onScroll);
          sizes.unobserve(el);
        }
      }
    };
    let queued = false;
    const changes = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; scan(); });
    });
    scan();
    changes.observe(document.body, { childList: true, subtree: true });
    return () => {
      changes.disconnect();
      sizes.disconnect();
      watched.forEach((el) => el.removeEventListener('scroll', onScroll));
    };
  }, []);
  return null;
}
