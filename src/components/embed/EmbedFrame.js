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
 *   - it counts one view per load on the site holding it (approved sites,
 *     P8b: "views counted per domain"), never V-ENT's own console preview
 *
 * `appTokens` is for widgets drawn by the tournament page's own components
 * (the bracket, the standings), which read the app's variables: the
 * organiser's accent becomes their highlight colour.
 */
import { useEffect, useRef } from 'react';
import { useReportHeight } from '@/lib/embed';
import { paintDocument, siteStyle } from '@/lib/siteTheme';
import styles from './embed.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

/** Records already counted on this page load, so a re-render never counts twice. */
const counted = new Set();

/**
 * The origin of the page holding this frame: null when it is not framed or is
 * framed by V-ENT itself, '' when it is framed by a page that hides where it
 * is (no referrer, and a browser without ancestorOrigins).
 */
function framingOrigin() {
  if (window.parent === window) return null;
  let origin = '';
  try {
    origin = window.location.ancestorOrigins?.[0] || '';
  } catch {
    origin = '';
  }
  if (!origin && document.referrer) {
    try { origin = new URL(document.referrer).origin; } catch { origin = ''; }
  }
  if (!origin) return '';
  try {
    if (new URL(origin).hostname === window.location.hostname) return null;
  } catch {
    return '';
  }
  return origin;
}

function useCountView(kind, slug) {
  useEffect(() => {
    if (!API || !kind || !slug) return;
    const key = `${kind}:${slug}`;
    if (counted.has(key)) return;
    const origin = framingOrigin();
    if (origin === null) return;
    counted.add(key);
    // A count, not a result anybody waits for: a failure changes nothing on
    // the page and is not retried.
    fetch(`${API}/sites/view/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, ref: slug, host: origin }),
      keepalive: true,
    }).catch(() => {});
  }, [kind, slug]);
}

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

export default function EmbedFrame({ kind, slug, look, appTokens = false, wide = false, children }) {
  const root = useRef(null);
  useReportHeight(root);
  useLinksOpenOutside(root);
  useCountView(kind, slug);
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
    // data-vent-embed tells globals.css this page has no bottom menu, so the
    // room it keeps for one under 1024px is not kept here (walk, 17 Oct 2026).
    <main ref={root} className={classes.join(' ')} style={style} data-vent-embed="" data-theme={theme}>
      {children}
    </main>
  );
}
