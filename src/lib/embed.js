'use client';
/**
 * Using V-ENT on somebody else's website (inbox 360).
 *
 * CEO, 29 September 2026: "we can have ifram embeds available also, we can
 * also allow people be able to like create their own event pages that looks
 * like a site or event just use our ticketing software on their own siite,
 * those options should be available."
 *
 * One place for the three snippets an organiser copies, and for the two ends
 * of the conversation between a frame and the page holding it:
 *
 *   useReportHeight   inside /embed/..., tells the host page how tall it is
 *   public/embed.js   on the host page, listens and sizes the frame
 *
 * The message is `{type: 'vent:embed-height', id, height}`. embed.js checks
 * that it came from the frame it made and from V-ENT's origin, so another
 * frame on the same page cannot resize it.
 */
import { useEffect } from 'react';

// The snippets and the look live in embedLook.js, which has no React in it so
// scripts/test-embed.mjs can prove them. Re-exported here so every caller
// keeps one import.
export { checkoutPath, embedSnippets } from './embedLook';

export const HEIGHT_MESSAGE = 'vent:embed-height';

/**
 * Inside a frame: report the embed's height to the page holding it, whenever
 * it changes. Does nothing when the page is not framed.
 *
 * Measures `ref`, the embed's own root, never the document: a document is at
 * least as tall as the frame showing it, so a frame that started taller than
 * its content would report its own height back for ever and never shrink.
 */
export function useReportHeight(ref) {
  useEffect(() => {
    const node = ref?.current;
    if (!node || typeof window === 'undefined' || window.parent === window) return undefined;
    const id = new URLSearchParams(window.location.search).get('vent_frame') || '';
    let last = 0;
    const send = () => {
      const height = Math.ceil(node.getBoundingClientRect().height);
      if (!height || height === last) return;
      last = height;
      // '*' because the host page can be any site; the message carries a
      // height and nothing else, so there is nothing in it to leak.
      window.parent.postMessage({ type: HEIGHT_MESSAGE, id, height }, '*');
    };
    send();
    const observer = new ResizeObserver(send);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
}
