'use client';
/**
 * The one frame every embed is drawn in (inbox 360, extended by P8).
 *
 * CEO, inbox 480: "we want people to be able to whitelist v-ent on their site
 * or put tournament registrations and brackets system under their own website
 * from v-ent."
 *
 * Everything a page inside somebody else's website has to get right, written
 * once rather than per widget:
 *
 *   - it tells the page holding it how tall it is (useReportHeight)
 *   - it paints the document behind it, so a frame taller than its content
 *     shows the frame's own colour and not the app's
 *   - it draws in the look the frame was asked for (siteStyle), and in the
 *     system font when the organiser chose it so the frame sits in their page
 *   - a link to V-ENT opens in a new tab: V-ENT's own pages refuse to be
 *     framed (X-Frame-Options), so a link followed inside the frame would
 *     leave a blank box on the organiser's page
 *
 * `appTokens` is for widgets drawn by the tournament page's own components
 * (the bracket, the standings), which read the app's variables: the
 * organiser's accent becomes their highlight colour.
 */
import { useEffect, useRef } from 'react';
import { useReportHeight } from '@/lib/embed';
import { paintDocument, siteStyle } from '@/lib/siteTheme';
import styles from './embed.module.css';

/** Whether a path is another embed, which may load inside the frame. */
const isEmbedPath = (pathname) => /^\/(?:(?:fr|pt)\/)?embed\//.test(pathname);

function useLinksOpenOutside(ref) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    // Capture phase, so it runs before a Next <Link> turns the click into a
    // navigation inside the frame.
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0
        || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target?.closest?.('a[href]');
      if (!link || !node.contains(link) || link.target === '_blank') return;
      let url;
      try { url = new URL(link.getAttribute('href'), window.location.href); } catch { return; }
      if (url.origin === window.location.origin && isEmbedPath(url.pathname)) return;
      if (!/^https?:$/.test(url.protocol)) return;
      event.preventDefault();
      event.stopPropagation();
      window.open(url.href, '_blank', 'noopener');
    };
    node.addEventListener('click', onClick, true);
    return () => node.removeEventListener('click', onClick, true);
  }, [ref]);
}

export default function EmbedFrame({ look, appTokens = false, wide = false, children }) {
  const root = useRef(null);
  useReportHeight(root);
  useLinksOpenOutside(root);
  const theme = look?.theme;
  const accent = look?.accent;
  useEffect(() => paintDocument({ theme, accent }), [theme, accent]);

  const style = siteStyle(look);
  if (appTokens) {
    style['--overlay-gray'] = style['--surface-1'];
    if (accent) style['--v-ent-light-gold'] = accent;
  }
  const classes = [styles.frame];
  if (wide) classes.push(styles.frameWide);
  if (look?.font === 'system') classes.push(styles.systemFont);

  return (
    <main ref={root} className={classes.join(' ')} style={style}>
      {children}
    </main>
  );
}
