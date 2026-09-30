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

export const HEIGHT_MESSAGE = 'vent:embed-height';

/** Where a frame sends somebody to buy: the event page's own checkout. */
export const checkoutPath = (slug, tierId) =>
  `/events/${encodeURIComponent(slug)}?tab=tickets${tierId ? `&tier=${encodeURIComponent(tierId)}` : ''}`;

/**
 * The code an organiser pastes. `kind` is 'event' or 'tournament'; `origin`
 * is where V-ENT is served, so a snippet copied from a local build points at
 * that build and one copied from v-ent.co points at v-ent.co. `labels.button`
 * is the button's words, already translated by the caller, because the
 * organiser pastes it onto a page in their own language.
 */
export function embedSnippets(kind, slug, origin, labels = {}) {
  const base = (origin || '').replace(/\/$/, '');
  const path = kind === 'tournament' ? 'tournaments' : 'events';
  const frame = `${base}/embed/${path}/${encodeURIComponent(slug)}`;
  return {
    frameUrl: frame,
    script: `<div data-vent-${kind}="${slug}"></div>\n<script src="${base}/embed.js" async></script>`,
    iframe: `<iframe src="${frame}" title="V-ENT" width="100%" height="560" style="border:0;max-width:640px" loading="lazy"></iframe>`,
    button: kind === 'tournament'
      ? `<a href="${base}/tournaments/${encodeURIComponent(slug)}" target="_blank" rel="noopener">${labels.button || ''}</a>`
      : `<a href="${base}${checkoutPath(slug)}" target="_blank" rel="noopener">${labels.button || ''}</a>`,
  };
}

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
