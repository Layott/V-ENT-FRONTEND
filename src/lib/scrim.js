/* A pop-up's backdrop closes it only when the press began AND ended on the
   backdrop (Apple review F6, inbox 569).

   The browser sends a click to the nearest element that holds both ends of a
   press. So a press that starts inside the box (selecting text, dragging a
   slider, a finger that slips) and ends over the dark backdrop arrives as a
   click ON the backdrop, and `e.target === e.currentTarget` closed the pop-up
   with whatever was typed in it. Measured on the fixture detail at 390px: a
   downward drag from the box released over the scrim shut it.

   Use both halves on the backdrop element:
     <div className={styles.overlay} onPointerDown={markScrimDown} data-scrim=""
          onClick={(e) => { if (isScrimClick(e)) onClose(); }}>
   scripts/check-scrim-close.mjs fails on a backdrop that closes without them. */

export function markScrimDown(e) {
  e.currentTarget.dataset.scrimDown = e.target === e.currentTarget ? '1' : '';
}

export function isScrimClick(e) {
  const el = e.currentTarget;
  const began = el.dataset.scrimDown === '1';
  el.dataset.scrimDown = '';
  return e.target === el && began;
}
