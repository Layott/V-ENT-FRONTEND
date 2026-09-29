import Image from 'next/image';
import logoRed from '@/images/logo_mark_red.svg';
import styles from './RouteLoading.module.css';

// What a page shows between the press and the page (CEO, 28 September 2026,
// inbox 310: "add a better loading animation for when pages are loading").
// Option A of docs/mockups/loading-options.html, the one chosen: a red line
// under the header says the press worked, and beneath it the outline of the
// page that is coming, in the page's own surfaces.
//
// It replaces a blank surface at the root, gold spinners on pure black
// ("Loading events..."), and a listing skeleton that every tournament page
// borrowed. No pulse, shimmer or glow: the line is the only motion, and it
// stands still for anybody who asked for reduced motion.
//
// A server component with no hooks, so it renders before any JavaScript
// arrives, which is exactly when it is needed. The shell outline (header,
// sidebar, bottom bar) keeps the frame steady; pages draw their own shell.

const Block = ({ className }) => <span className={`${styles.block} ${className || ''}`} />;

const SHAPES = {
  // a tournament, an event: banner, stats, tabs, sections beside a side card
  detail: () => (
    <>
      <Block className={styles.hero} />
      <Block className={styles.strip} />
      <div className={styles.chips}>{[1, 2, 3, 4, 5].map(i => <Block key={i} className={styles.chip} />)}</div>
      <div className={styles.split}>
        <div className={styles.column}><Block className={styles.card} /><Block className={styles.cardShort} /></div>
        <Block className={styles.side} />
      </div>
    </>
  ),
  // a listing: title, filters, a grid of cards
  list: () => (
    <>
      <Block className={styles.title} />
      <Block className={styles.subtitle} />
      <div className={styles.chips}>{[1, 2, 3, 4].map(i => <Block key={i} className={styles.chip} />)}</div>
      <div className={styles.grid}>{[1, 2, 3, 4, 5, 6].map(i => <Block key={i} className={styles.tile} />)}</div>
    </>
  ),
  // an organiser's console: back link, title, its tabs, one large panel
  console: () => (
    <>
      <Block className={styles.back} />
      <Block className={styles.title} />
      <div className={styles.chips}>{[1, 2, 3, 4, 5, 6, 7].map(i => <Block key={i} className={styles.chip} />)}</div>
      <Block className={styles.panel} />
    </>
  ),
  // a wizard or a long form: steps, then fields
  form: () => (
    <>
      <Block className={styles.title} />
      <div className={styles.chips}>{[1, 2, 3, 4, 5].map(i => <Block key={i} className={styles.step} />)}</div>
      {[1, 2, 3].map(i => (
        <div key={i} className={styles.field}><Block className={styles.label} /><Block className={styles.input} /></div>
      ))}
    </>
  ),
  // a person, a team, an organisation: banner, face, name, tabs, cards
  profile: () => (
    <>
      <Block className={styles.banner} />
      <div className={styles.identity}><Block className={styles.face} /><Block className={styles.name} /></div>
      <div className={styles.chips}>{[1, 2, 3, 4].map(i => <Block key={i} className={styles.chip} />)}</div>
      <div className={styles.grid}>{[1, 2, 3].map(i => <Block key={i} className={styles.tile} />)}</div>
    </>
  ),
  // anything else: a title and two sections
  page: () => (
    <>
      <Block className={styles.title} />
      <Block className={styles.subtitle} />
      <Block className={styles.card} />
      <Block className={styles.cardShort} />
    </>
  ),
};

export default function RouteLoading({ kind = 'page', label = 'Loading' }) {
  const Shape = SHAPES[kind] || SHAPES.page;
  return (
    <div className={styles.page} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.header}>
        <Image src={logoRed} alt="" className={styles.logo} priority />
      </div>
      <div className={styles.line} aria-hidden="true"><i /></div>
      <div className={styles.sidebar} aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Block key={i} className={styles.navItem} />)}
      </div>
      <div className={styles.pane}>
        <Shape />
        <p className={styles.say}>{label}</p>
      </div>
      <div className={styles.bottomBar} aria-hidden="true" />
    </div>
  );
}
