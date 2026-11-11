'use client';

// Every control answers the press, at once (Apple review S1, inbox 569).
//
// Only the four shared button classes had a pressed look. Tabs, header icons,
// sidebar links, share, watch and every module button changed nothing when a
// finger landed on them, and on a phone, which has no hover, that reads as a
// page that did not hear the tap. Even where :active existed the browser
// applied it 120 to 250ms after touch-down, while it decided between a tap and
// a scroll (measured on the Android emulator with a real finger).
//
// So the press is set here, on pointerdown, on the nearest pressable thing:
// `data-pressed` goes on, one rule in globals.css dims it and draws it a
// little smaller, and it comes off on release, on cancel (the browser taking
// the gesture for a scroll), when the pointer leaves it, and once the finger
// has travelled more than 10px, which is a drag (the phone menu, a sideways
// row) rather than a press. A region that should never show it opts out with
// `data-press="none"` on itself or any parent.

import { useEffect } from 'react';

const PRESSABLE = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="option"], summary, label[for]';

export default function PressState() {
  useEffect(() => {
    let held = null;
    let x0 = 0;
    let y0 = 0;
    const release = () => {
      if (held) { held.removeAttribute('data-pressed'); held = null; }
    };
    const down = (e) => {
      if (e.button && e.button !== 0) return;
      const el = e.target instanceof Element ? e.target.closest(PRESSABLE) : null;
      if (!el || el.closest('[data-press="none"]')) return;
      if (el.matches(':disabled, [aria-disabled="true"]')) return;
      release();
      held = el;
      x0 = e.clientX;
      y0 = e.clientY;
      el.setAttribute('data-pressed', '');
    };
    const move = (e) => {
      if (held && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) release();
    };
    const out = (e) => {
      if (held && e.target === held && !held.contains(e.relatedTarget)) release();
    };
    document.addEventListener('pointerdown', down, true);
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('dragstart', release, true);
    window.addEventListener('blur', release);
    document.addEventListener('pointerout', out, true);
    window.addEventListener('pointermove', move, { capture: true, passive: true });
    return () => {
      release();
      document.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('dragstart', release, true);
      window.removeEventListener('blur', release);
      document.removeEventListener('pointerout', out, true);
      window.removeEventListener('pointermove', move, { capture: true });
    };
  }, []);
  return null;
}
