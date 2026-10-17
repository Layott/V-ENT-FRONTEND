'use client';
/**
 * The tournament console tab "On your website" (P8).
 *
 * CEO, inbox 480: "we want people to be able to whitelist v-ent on their site
 * or put tournament registrations and brackets system under their own website
 * from v-ent."
 *
 * Pick a widget (registration, bracket, standings, schedule), pick its look,
 * copy one of three snippets, and see it as visitors will. The look starts
 * from the event's website colours when the tournament runs inside an event;
 * only what the organiser changes here is written into the snippet.
 *
 * Below the snippets, the approved sites (P8b): which proven websites may show
 * it, and how often each has. Drawn with the event console's "Website and
 * embeds" stylesheet and its copy rows, so the two tabs read as one
 * designer's work.
 */
import { useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { THEMED_WIDGETS, WIDGETS, embedSnippets, readLook } from '@/lib/embedLook';
import { DEFAULT_ACCENT } from '@/lib/siteTheme';
import CopyRow from './CopyRow';
import ApprovedSites from './ApprovedSites';
import styles from '@/components/event-site/event-site-panel.module.css';

const HEX = /^#[0-9a-f]{6}$/i;

const WIDGET_LABELS = {
  card: ['embedBuilder.card', 'Registration'],
  bracket: ['embedBuilder.bracket', 'Bracket'],
  standings: ['embedBuilder.standings', 'Standings'],
  schedule: ['embedBuilder.schedule', 'Schedule'],
};

const WIDGET_HINTS = {
  card: ['embedBuilder.cardHint', 'The tournament, its places and its entry. Register opens V-ENT in a new window, where people sign in and pay.'],
  bracket: ['embedBuilder.bracketHint', 'Every stage, drawn as on the tournament page, updating as results come in.'],
  standings: ['embedBuilder.standingsHint', 'The tables, ranked by the same rules as the tournament page.'],
  schedule: ['embedBuilder.scheduleHint', 'Your running order, day by day, in each visitor\'s own time zone.'],
};

export default function TournamentEmbedPanel({ tournament, token, showToast, canManage = false }) {
  const tt = useT();
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const slug = tournament?.slug || '';
  // Primitives, not the site object: the console reloads the tournament in
  // the background, and a new object each time would reset what the
  // organiser is choosing here.
  const siteTheme = tournament?.event?.site?.theme;
  const siteAccent = tournament?.event?.site?.accent;
  const base = useMemo(() => readLook({}, { theme: siteTheme, accent: siteAccent }), [siteTheme, siteAccent]);
  const [widget, setWidget] = useState('card');
  const [look, setLook] = useState(base);
  const [accentText, setAccentText] = useState(base.accent);
  useEffect(() => { setLook(base); setAccentText(base.accent); }, [base]);

  const themed = THEMED_WIDGETS.includes(widget);
  const [hintKey, hintEn] = WIDGET_HINTS[widget];
  const accentOk = !accentText || HEX.test(accentText);
  const snippets = embedSnippets('tournament', slug, origin,
    { button: tt('embedBuilder.buttonText', 'Register') },
    { widget, look: themed ? look : { ...look, theme: base.theme }, base });

  const set = (key, value) => setLook((l) => ({ ...l, [key]: value }));
  const typeAccent = (value) => {
    setAccentText(value);
    if (!value) set('accent', base.accent);
    else if (HEX.test(value)) set('accent', value.toLowerCase());
  };

  if (!slug) {
    return <section className={styles.card}><p className={styles.hint}>{tt('embedBuilder.noSlug', 'This tournament has no public address yet. Publish it first.')}</p></section>;
  }

  return (
    <>
      <section className={styles.card}>
        <h3 className={styles.heading}>{tt('embedBuilder.title', 'Put this tournament on your website')}</h3>
        <p className={styles.hint}>
          {tt('embedBuilder.intro', 'Paste a snippet into any page of your own site. It shows live from V-ENT, and registering and paying always happen on V-ENT.')}
        </p>

        <div className={styles.field}>
          <span className={styles.label}>{tt('embedBuilder.widget', 'What to show')}</span>
          <div className={styles.chips}>
            {WIDGETS.map((w) => {
              const [key, en] = WIDGET_LABELS[w];
              return (
                <button key={w} type="button" aria-pressed={widget === w}
                        className={widget === w ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                        onClick={() => setWidget(w)}>{tt(key, en)}</button>
              );
            })}
          </div>
          <p className={styles.hint}>{tt(hintKey, hintEn)}</p>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>{tt('siteConsole.theme', 'Page')}</span>
          {themed ? (
            <div className={styles.chips}>
              {[['dark', 'siteConsole.themeDark', 'Dark'], ['light', 'siteConsole.themeLight', 'Light']].map(([v, k, en]) => (
                <button key={v} type="button" aria-pressed={look.theme === v}
                        className={look.theme === v ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                        onClick={() => set('theme', v)}>{tt(k, en)}</button>
              ))}
            </div>
          ) : (
            <p className={styles.hint}>{tt('embedBuilder.darkOnly', 'Drawn on a dark surface, as on the tournament page. Your colour and font still apply.')}</p>
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label} id="embed-accent">{tt('siteConsole.accent', 'Your colour')}</span>
          <div className={styles.accentRow}>
            <input type="color" className={styles.swatch} aria-labelledby="embed-accent"
                   value={HEX.test(look.accent) ? look.accent : DEFAULT_ACCENT}
                   onChange={(ev) => typeAccent(ev.target.value)} />
            <input className={styles.input} value={accentText} maxLength={7}
                   aria-labelledby="embed-accent" placeholder={DEFAULT_ACCENT}
                   onChange={(ev) => typeAccent(ev.target.value.trim())} />
            {look.accent !== base.accent && (
              <button type="button" className={styles.chip} onClick={() => typeAccent(base.accent)}>
                {base.accent ? tt('embedBuilder.accentEvent', 'Use the event\'s colour') : tt('siteConsole.accentReset', 'Use V-ENT gold')}
              </button>
            )}
          </div>
          {!accentOk && <p className={styles.error}>{tt('siteConsole.accentBad', 'A colour is # and six letters or numbers, like #d4af37.')}</p>}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>{tt('embedBuilder.font', 'Lettering')}</span>
          <div className={styles.chips}>
            {[['clash', 'embedBuilder.fontClash', 'V-ENT\'s'], ['system', 'embedBuilder.fontSystem', 'Plain, close to your site\'s']].map(([v, k, en]) => (
              <button key={v} type="button" aria-pressed={look.font === v}
                      className={look.font === v ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                      onClick={() => set('font', v)}>{tt(k, en)}</button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <h3 className={styles.heading}>{tt('embedBuilder.codeTitle', 'The code to paste')}</h3>
        <CopyRow label={tt('embedBuilder.script', 'Sizes itself (recommended)')}
                 hint={tt('siteConsole.embedScriptHint', 'Sizes itself to fit. Works on WordPress, Wix, Squarespace and hand-written pages.')}
                 code={snippets.script} />
        <CopyRow label={tt('embedBuilder.frame', 'A plain frame')}
                 hint={tt('siteConsole.embedFrameHint', 'For site builders that do not allow scripts. The height is fixed.')}
                 code={snippets.iframe} />
        <CopyRow label={tt('embedBuilder.button', 'A link to the tournament')}
                 hint={tt('embedBuilder.buttonHint', 'A link, styled by your site. Opens the tournament on V-ENT.')}
                 code={snippets.button} />
        <p className={styles.label}>{tt('siteConsole.embedPreview', 'What your visitors will see')}</p>
        <iframe className={widget === 'card' ? styles.preview : `${styles.preview} ${styles.previewWide}`}
                src={snippets.frameUrl}
                title={tt('siteConsole.embedPreview', 'What your visitors will see')} />
      </section>

      {/* Which sites may show it (P8b): its managers choose; the API holds it. */}
      {canManage && <ApprovedSites kind="tournament" slug={slug} token={token} showToast={showToast} />}
    </>
  );
}
