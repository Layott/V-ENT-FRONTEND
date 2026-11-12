'use client';

// One way every pop-up behaves (Apple review S2, S3, inbox 569).
//
// The review opened 36 pop-ups 902 times. Every one except the phone menu
// appeared and vanished in a single frame; focus moved into 9, stayed inside
// none (Tab walked into the page behind, even under aria-modal) and came back
// to the button on 5; Escape failed on most; the page scrolled behind 41 to
// 100 percent of openings; and on a phone Back left the page instead of
// closing what was open.
//
// Every backdrop on the site closes through src/lib/scrim.js and carries
// `data-scrim`. This is mounted once in the root layout and watches for one
// to appear with a box in it. While it is there:
//   - focus moves to the first control in the box, and everything outside it
//     is `inert` (no clicks, no Tab, no screen reader), so focus stays inside;
//     on close it goes back to the control that opened it;
//   - Escape closes it, and so does Back: opening pushes a history entry and
//     Back pops that entry instead of leaving the page;
//   - the page under it does not scroll;
//   - it grows out of the control that opened it and leaves the same way
//     (data-dialog="open" then "closing"; the look is in globals.css);
//   - on a phone it is a bottom sheet with a handle, and a downward drag from
//     its top edge follows the finger and closes it on release when it went
//     far enough or fast enough.
// Closing always goes through the backdrop's own click handler (a press that
// began and ended on the scrim), so each pop-up keeps deciding what closing
// means for it (a busy PIN prompt still refuses). A backdrop with no box in
// it (the console's phone-menu shade) is left alone.
//
// Two cases that need care, both walked: a flow that swaps one pop-up for the
// next (register: team, review, pay) hands its history entry on instead of
// popping it, or the pop for the old one would close the new one; and a
// pop-up opened over another (the PIN prompt over a checkout) lifts the inert
// the first one put on its own path, and puts it back when it closes.

import { useEffect } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
const EXIT_MS = 180;
const PHONE = '(max-width: 720px)';

function boxOf(scrim) {
  return scrim.querySelector(':scope > [role="dialog"]') || scrim.firstElementChild;
}

function visible(el) {
  const cs = getComputedStyle(el);
  return cs.display !== 'none' && cs.visibility !== 'hidden';
}

// Ask the pop-up to close the way a press on its backdrop does.
function pressScrim(scrim) {
  scrim.dataset.scrimDown = '1';
  scrim.click();
}

export default function DialogManager() {
  useEffect(() => {
    const open = new Map(); // scrim -> state, in the order they opened
    const inertBy = new Map(); // element -> Set of scrims that made it inert
    let savedOverflow = '';
    // Backs this manager takes itself, to drop an entry a pop-up no longer
    // needs; their popstate is not a person pressing Back.
    let ourBacks = 0;

    const addInert = (el, scrim) => {
      if (!inertBy.has(el)) {
        if (el.hasAttribute('inert')) return; // the page's own; not ours to manage
        inertBy.set(el, new Set());
      }
      inertBy.get(el).add(scrim);
      el.setAttribute('inert', '');
    };
    const dropInert = (scrim) => {
      for (const [el, owners] of inertBy) {
        if (!owners.delete(scrim)) continue;
        if (owners.size === 0) {
          inertBy.delete(el);
          el.removeAttribute('inert');
        }
      }
    };
    const makeOutsideInert = (scrim) => {
      // A pop-up opened over another must not sit inside the first one's inert.
      const lifted = [];
      for (let n = scrim; n && n !== document.body; n = n.parentElement) {
        if (inertBy.has(n)) { n.removeAttribute('inert'); lifted.push(n); }
      }
      for (let node = scrim; node && node.parentElement && node !== document.body; node = node.parentElement) {
        for (const sibling of node.parentElement.children) {
          if (sibling === node || /^(SCRIPT|STYLE|LINK|META)$/.test(sibling.tagName)) continue;
          addInert(sibling, scrim);
        }
      }
      return lifted;
    };

    const requestClose = (scrim) => {
      const st = open.get(scrim);
      if (!st || st.closing) return;
      st.closing = true;
      const box = boxOf(scrim);
      if (box) box.setAttribute('data-dialog', 'closing');
      window.setTimeout(() => {
        if (!scrim.isConnected) return;
        st.closing = false;
        const b = boxOf(scrim);
        if (b) b.setAttribute('data-dialog', 'shown');
        pressScrim(scrim);
      }, EXIT_MS);
    };

    const attach = (scrim, takeEntry) => {
      const box = boxOf(scrim);
      if (!box || !visible(scrim)) return;
      const trigger = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        && !scrim.contains(document.activeElement) ? document.activeElement : null;
      const phone = window.matchMedia(PHONE).matches;
      if (trigger && !phone) {
        const t = trigger.getBoundingClientRect();
        const b = box.getBoundingClientRect();
        box.style.transformOrigin = `${Math.round(t.left + t.width / 2 - b.left)}px ${Math.round(t.top + t.height / 2 - b.top)}px`;
      }
      box.setAttribute('data-dialog', 'open');
      box.setAttribute('data-sheet', '');
      scrim.setAttribute('data-sheet-scrim', '');
      // One dialog role per pop-up: some backdrops already carry it.
      if (scrim.getAttribute('role') !== 'dialog') {
        if (!box.hasAttribute('role')) box.setAttribute('role', 'dialog');
        if (!box.hasAttribute('aria-modal')) box.setAttribute('aria-modal', 'true');
      }
      if (!box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1');
      const settle = window.setTimeout(() => {
        const b = boxOf(scrim);
        if (b && b.getAttribute('data-dialog') === 'open') b.setAttribute('data-dialog', 'shown');
      }, 300);

      if (open.size === 0) {
        savedOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
      }
      const lifted = makeOutsideInert(scrim);
      const first = box.querySelector('[autofocus]') || box.querySelector(FOCUSABLE);
      (first || box).focus({ preventScroll: true });

      let ownEntry = takeEntry();
      if (!ownEntry) {
        try {
          window.history.pushState({ ...(window.history.state || {}), ventDialog: true }, '');
          ownEntry = true;
        } catch { /* a sandboxed frame: Back stays the browser's */ }
      }

      // Drag the sheet down by its top edge to close it.
      let drag = null;
      const down = (e) => {
        if (!window.matchMedia(PHONE).matches) return;
        const b = boxOf(scrim);
        if (!b || !b.contains(e.target)) return;
        const r = b.getBoundingClientRect();
        if (e.clientY - r.top > 40) return;
        drag = { box: b, y0: e.clientY, last: e.clientY, t: performance.now(), v: 0 };
        b.setAttribute('data-dragging', '');
      };
      const move = (e) => {
        if (!drag) return;
        const now = performance.now();
        drag.v = (e.clientY - drag.last) / Math.max(1, now - drag.t);
        drag.last = e.clientY;
        drag.t = now;
        const dy = e.clientY - drag.y0;
        drag.box.style.translate = `0 ${dy > 0 ? dy : dy / 4}px`;
      };
      const up = () => {
        if (!drag) return;
        const { box: b, last, y0, v } = drag;
        drag = null;
        b.removeAttribute('data-dragging');
        b.style.translate = '';
        const dy = last - y0;
        if (dy > 120 || (v > 0.5 && dy > 24)) requestClose(scrim);
      };
      scrim.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);

      open.set(scrim, {
        closing: false,
        get ownEntry() { return ownEntry; },
        set ownEntry(v) { ownEntry = v; },
        detach() {
          window.clearTimeout(settle);
          scrim.removeEventListener('pointerdown', down);
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          dropInert(scrim);
          // Put back what this one lifted, where another pop-up still wants it.
          lifted.forEach((el) => { if (inertBy.get(el)?.size) el.setAttribute('inert', ''); });
          if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
          const had = ownEntry;
          ownEntry = false;
          return had;
        },
      });
    };

    const scan = () => {
      // Entries freed by pop-ups that closed in this same change, handed to
      // any that opened in it (a flow swapping one pop-up for the next).
      let spare = 0;
      for (const scrim of [...open.keys()]) {
        if (scrim.isConnected && boxOf(scrim) && visible(scrim)) continue;
        const st = open.get(scrim);
        open.delete(scrim);
        if (st.detach() && window.history.state?.ventDialog) spare += 1;
      }
      document.querySelectorAll('[data-scrim]').forEach((scrim) => {
        if (open.has(scrim)) return;
        attach(scrim, () => {
          if (spare > 0) { spare -= 1; return true; }
          return false;
        });
      });
      for (; spare > 0; spare -= 1) { ourBacks += 1; window.history.back(); }
      // A pop-up that swaps its own content (checkout step 1 to 2) unmounts the
      // control that had focus, and focus falls to <body>, behind the inert.
      // Put it back on the first control of the newest pop-up.
      const newest = [...open.keys()].pop();
      if (newest) {
        const b = boxOf(newest);
        const a = document.activeElement;
        if (b && (!a || a === document.body || !document.contains(a))) {
          (b.querySelector(FOCUSABLE) || b).focus({ preventScroll: true });
        }
      }
      if (open.size === 0 && document.documentElement.style.overflow === 'hidden') {
        document.documentElement.style.overflow = savedOverflow;
      }
    };

    // The newest pop-up answers the keys and Back.
    const top = () => [...open.keys()].pop();
    const onKey = (e) => {
      const scrim = top();
      if (!scrim) return;
      const box = boxOf(scrim);
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose(scrim);
        return;
      }
      if (e.key !== 'Tab' || !box) return;
      const items = [...box.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const onPop = () => {
      if (ourBacks > 0) { ourBacks -= 1; return; }
      const scrim = top();
      if (!scrim) return;
      const st = open.get(scrim);
      if (!st.ownEntry) return;
      st.ownEntry = false;
      requestClose(scrim);
    };

    let queued = false;
    const changes = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; scan(); });
    });
    changes.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('popstate', onPop);
    scan();
    return () => {
      changes.disconnect();
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('popstate', onPop);
      for (const [scrim, st] of open) { open.delete(scrim); st.detach(); }
    };
  }, []);
  return null;
}
