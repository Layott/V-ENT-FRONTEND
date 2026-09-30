/**
 * The colours of an organiser's event website and of the embed (inbox 360).
 *
 * The organiser picks one accent; everything else is ours, so a page in
 * anybody's colour still reads as a page. Two themes: a real dark surface and
 * an off-white one, never pure black or pure white. The ink on the accent is
 * chosen from the accent's own lightness, so a pale yellow gets dark text and
 * a deep red gets light text without the organiser having to know why.
 */
export const DEFAULT_ACCENT = '#d4af37'; // --v-ent-gold

const SURFACES = {
  dark: {
    '--page': '#131316',
    '--surface-1': '#212225',
    '--surface-2': '#2a2b30',
    '--surface-3': '#33343a',
    '--ink': '#f2f2f3',
    '--ink-muted': '#a9aab0',
  },
  light: {
    '--page': '#f4f2ee',
    '--surface-1': '#ebe8e1',
    '--surface-2': '#e2ded5',
    '--surface-3': '#d6d1c6',
    '--ink': '#1b1b1f',
    '--ink-muted': '#5c5d64',
  },
};

const HEX = /^#[0-9a-f]{6}$/i;

/** Relative luminance, WCAG's formula. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Dark ink or light ink, whichever reads better on this accent. */
export function inkFor(accent) {
  const hex = HEX.test(accent || '') ? accent : DEFAULT_ACCENT;
  const l = luminance(hex);
  // Contrast against #131316 (L about 0.007) and #f2f2f3 (L about 0.89).
  const withDark = (l + 0.05) / (0.007 + 0.05);
  const withLight = (0.89 + 0.05) / (l + 0.05);
  return withDark >= withLight ? '#131316' : '#f2f2f3';
}

/** The CSS variables for a page, as a React style object. */
export function siteStyle(site) {
  const theme = site?.theme === 'light' ? 'light' : 'dark';
  const accent = HEX.test(site?.accent || '') ? site.accent : DEFAULT_ACCENT;
  return {
    ...SURFACES[theme],
    // globals.css colours EVERY element with `* { color: var(--primary-bg) }`,
    // so text does not inherit from the page. Pointing that variable at this
    // page's ink is what makes a light page's words dark, all the way down.
    '--primary-bg': SURFACES[theme]['--ink'],
    '--accent': accent,
    '--accent-ink': inkFor(accent),
  };
}

/**
 * Paint the document behind a page drawn with siteStyle(). A frame taller
 * than its content (a plain iframe snippet has a fixed height) otherwise shows
 * the app's own background under a light page.
 */
export function paintDocument(site) {
  if (typeof document === 'undefined') return undefined;
  const page = siteStyle(site)['--page'];
  // Both: the root element has its own dark background, and a frame whose
  // height rounds up by a pixel shows it as a line under the page.
  const nodes = [document.documentElement, document.body];
  const before = nodes.map((n) => n.style.backgroundColor);
  nodes.forEach((n) => { n.style.backgroundColor = page; });
  return () => nodes.forEach((n, i) => { n.style.backgroundColor = before[i]; });
}
