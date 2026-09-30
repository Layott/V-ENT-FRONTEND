'use client';
/**
 * The console tab "Website and embeds" (inbox 360).
 *
 * CEO, 29 September 2026: "we can have ifram embeds available also, we can
 * also allow people be able to like create their own event pages that looks
 * like a site or event just use our ticketing software on their own siite,
 * those options should be available."
 *
 * All three options in one place: publish and style the event's own website,
 * and copy the code that puts the tickets on a site the organiser already
 * has. The settings are the `site` block of the event payload; saving posts
 * the named fields to /event/<ref>/site/.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IoArrowDown, IoArrowUp } from 'react-icons/io5';
import { useT } from '@/i18n/LanguageProvider';
import apiMessage from '@/lib/apiMessage';
import { embedSnippets } from '@/lib/embed';
import { DEFAULT_ACCENT } from '@/lib/siteTheme';
import styles from './event-site-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const SECTION_LABELS = {
  about: ['site.about', 'About'],
  tickets: ['site.tickets', 'Tickets'],
  schedule: ['site.when', 'When'],
  venue: ['site.where', 'Where'],
  tournaments: ['site.tournaments', 'Tournaments at this event'],
  sponsors: ['site.sponsors', 'With thanks to'],
};

const HEX = /^#[0-9a-f]{6}$/i;

function CopyRow({ label, hint, code }) {
  const tt = useT();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Blocked clipboard: the code is on screen and selectable.
    }
  };
  return (
    <div className={styles.snippet}>
      <div className={styles.snippetHead}>
        <p className={styles.snippetLabel}>{label}</p>
        <button type="button" className={styles.chip} onClick={copy}>
          {copied ? tt('siteConsole.copied', 'Copied') : tt('siteConsole.copy', 'Copy')}
        </button>
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
      <pre className={styles.code}><code>{code}</code></pre>
    </div>
  );
}

export default function EventSitePanel({ eventRef, token, showToast }) {
  const tt = useT();
  const [status, setStatus] = useState('loading');
  const [slug, setSlug] = useState(eventRef);
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  useEffect(() => {
    if (!eventRef) return undefined;
    let cancelled = false;
    setStatus('loading');
    fetch(`${API}/event/view-event/${encodeURIComponent(eventRef)}/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((b) => {
        if (cancelled) return;
        // Renamed since the console opened: read it again at its new address.
        if (b?.status === 'moved' && b?.data?.slug && b.data.slug !== eventRef) {
          setSlug(b.data.slug);
          return fetch(`${API}/event/view-event/${encodeURIComponent(b.data.slug)}/`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            cache: 'no-store',
          }).then((r) => r.json());
        }
        return b;
      })
      .then((b) => {
        if (cancelled) return;
        const e = b?.data?.event || b?.data;
        if (b?.status !== 'success' || !e?.site) throw new Error('site');
        setSlug(e.slug || eventRef);
        setSaved(e.site);
        setForm(e.site);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('failed'); });
    return () => { cancelled = true; };
  }, [eventRef, token, attempt]);

  const set = useCallback((key, value) => setForm((f) => ({ ...f, [key]: value })), []);

  const move = useCallback((index, by) => {
    setForm((f) => {
      const sections = [...f.sections];
      const to = index + by;
      if (to < 0 || to >= sections.length) return f;
      [sections[index], sections[to]] = [sections[to], sections[index]];
      return { ...f, sections };
    });
  }, []);

  const toggle = useCallback((index) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) => (i === index ? { ...s, visible: !s.visible } : s)),
    }));
  }, []);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const accentOk = !form?.accent || HEX.test(form.accent);

  const save = useCallback(async (overrides = {}) => {
    const body = { ...form, ...overrides };
    setSaving(true);
    setError('');
    try {
      const r = await fetch(`${API}/event/${encodeURIComponent(slug)}/site/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          enabled: body.enabled,
          headline: body.headline,
          accent: body.accent,
          theme: body.theme,
          layout: body.layout,
          sections: body.sections,
        }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok || b?.status !== 'success') {
        setError(apiMessage(tt, b, 'siteConsole.saveFailed', 'The website could not be saved. Try again.'));
        return;
      }
      setSaved(b.data);
      setForm(b.data);
      showToast?.(b.data.enabled
        ? tt('siteConsole.savedLive', 'Saved. The website is live.')
        : tt('siteConsole.saved', 'Saved.'));
    } catch {
      setError(tt('siteConsole.saveFailed', 'The website could not be saved. Try again.'));
    } finally {
      setSaving(false);
    }
  }, [form, slug, token, tt, showToast]);

  if (status === 'loading') {
    return <section className={styles.card} aria-busy="true"><div className={styles.skeleton} /></section>;
  }
  if (status === 'failed' || !form) {
    return (
      <section className={styles.card}>
        <p className={styles.hint}>{tt('siteConsole.loadFailed', 'The website settings could not be loaded.')}</p>
        <button type="button" className={styles.chip} onClick={() => setAttempt((n) => n + 1)}>
          {tt('embed.tryAgain', 'Try again')}
        </button>
      </section>
    );
  }

  const siteUrl = `${origin}/events/${encodeURIComponent(slug)}/site`;
  const snippets = embedSnippets('event', slug, origin, {
    button: tt('siteConsole.buttonText', 'Get tickets'),
  });

  return (
    <>
      <section className={styles.card}>
        <h3 className={styles.heading}>{tt('siteConsole.title', 'Your event website')}</h3>
        <p className={styles.hint}>
          {tt('siteConsole.intro', 'A page for this event on its own, without the rest of V-ENT around it, in your colours. Tickets on it sell through V-ENT.')}
        </p>

        <div className={styles.statusRow}>
          <p className={styles.state}>
            {saved?.enabled
              ? tt('siteConsole.live', 'Published. Anybody with the address can open it.')
              : tt('siteConsole.off', 'Not published. Only a preview link opens it.')}
          </p>
          <button type="button" className={saved?.enabled ? styles.chip : styles.primaryBtn}
                  disabled={saving} onClick={() => save({ enabled: !saved?.enabled })}>
            {saved?.enabled ? tt('siteConsole.unpublish', 'Unpublish') : tt('siteConsole.publish', 'Publish the website')}
          </button>
        </div>
        <p className={styles.address}>
          <a href={saved?.enabled ? siteUrl : `${siteUrl}?preview=1`} target="_blank" rel="noopener">
            {saved?.enabled ? siteUrl : tt('siteConsole.preview', 'Open a preview')}
          </a>
        </p>

        <label className={styles.field}>
          <span className={styles.label}>{tt('siteConsole.headline', 'Headline under the name')}</span>
          <input className={styles.input} value={form.headline} maxLength={120}
                 onChange={(ev) => set('headline', ev.target.value)}
                 placeholder={tt('siteConsole.headlineHint', 'One line that says what the day is')} />
        </label>

        <div className={styles.field}>
          <span className={styles.label} id="site-accent">{tt('siteConsole.accent', 'Your colour')}</span>
          <div className={styles.accentRow}>
            {/* The browser draws its own colour picker; the text box beside it
                is for pasting a brand colour exactly. */}
            <input type="color" className={styles.swatch} aria-labelledby="site-accent"
                   value={HEX.test(form.accent) ? form.accent : DEFAULT_ACCENT}
                   onChange={(ev) => set('accent', ev.target.value)} />
            <input className={styles.input} value={form.accent} maxLength={7}
                   aria-labelledby="site-accent" placeholder={DEFAULT_ACCENT}
                   onChange={(ev) => set('accent', ev.target.value.trim())} />
            {form.accent && (
              <button type="button" className={styles.chip} onClick={() => set('accent', '')}>
                {tt('siteConsole.accentReset', 'Use V-ENT gold')}
              </button>
            )}
          </div>
          {!accentOk && <p className={styles.error}>{tt('siteConsole.accentBad', 'A colour is # and six letters or numbers, like #d4af37.')}</p>}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>{tt('siteConsole.theme', 'Page')}</span>
          <div className={styles.chips}>
            {[['dark', 'siteConsole.themeDark', 'Dark'], ['light', 'siteConsole.themeLight', 'Light']].map(([v, k, en]) => (
              <button key={v} type="button" aria-pressed={form.theme === v}
                      className={form.theme === v ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                      onClick={() => set('theme', v)}>{tt(k, en)}</button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>{tt('siteConsole.layout', 'Opening')}</span>
          <div className={styles.chips}>
            {[['poster', 'siteConsole.layoutPoster', 'Picture across the top'],
              ['split', 'siteConsole.layoutSplit', 'Picture beside the name']].map(([v, k, en]) => (
              <button key={v} type="button" aria-pressed={form.layout === v}
                      className={form.layout === v ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                      onClick={() => set('layout', v)}>{tt(k, en)}</button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>{tt('siteConsole.sections', 'Sections, in order')}</span>
          <ol className={styles.sections}>
            {form.sections.map((s, i) => {
              const [k, en] = SECTION_LABELS[s.key] || [s.key, s.key];
              return (
                <li key={s.key} className={s.visible ? styles.sectionRow : `${styles.sectionRow} ${styles.sectionOff}`}>
                  <span className={styles.sectionName}>{tt(k, en)}</span>
                  <div className={styles.sectionActions}>
                    <button type="button" className={styles.iconBtn} disabled={i === 0}
                            aria-label={tt('siteConsole.up', 'Move {name} up').replace('{name}', tt(k, en))}
                            onClick={() => move(i, -1)}><IoArrowUp aria-hidden="true" /></button>
                    <button type="button" className={styles.iconBtn} disabled={i === form.sections.length - 1}
                            aria-label={tt('siteConsole.down', 'Move {name} down').replace('{name}', tt(k, en))}
                            onClick={() => move(i, 1)}><IoArrowDown aria-hidden="true" /></button>
                    <button type="button" aria-pressed={s.visible}
                            className={s.visible ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                            onClick={() => toggle(i)}>
                      {s.visible ? tt('siteConsole.shown', 'Shown') : tt('siteConsole.hidden', 'Hidden')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.saveRow}>
          <button type="button" className={styles.primaryBtn} disabled={!dirty || saving || !accentOk}
                  onClick={() => save()}>
            {saving ? tt('siteConsole.saving', 'Saving...') : tt('siteConsole.save', 'Save the website')}
          </button>
          {dirty && !saving && (
            <button type="button" className={styles.chip} onClick={() => setForm(saved)}>
              {tt('siteConsole.discard', 'Undo changes')}
            </button>
          )}
        </div>
      </section>

      <section className={styles.card}>
        <h3 className={styles.heading}>{tt('siteConsole.embedTitle', 'Sell tickets on your own website')}</h3>
        <p className={styles.hint}>
          {tt('siteConsole.embedIntro', 'Paste one of these into your site. Buyers see your tickets there and pay on V-ENT, in a new tab, with the wallet, a card or Flutterwave.')}
        </p>
        <CopyRow label={tt('siteConsole.embedScript', 'Ticket box (recommended)')}
                 hint={tt('siteConsole.embedScriptHint', 'Sizes itself to fit. Works on WordPress, Wix, Squarespace and hand-written pages.')}
                 code={snippets.script} />
        <CopyRow label={tt('siteConsole.embedFrame', 'Ticket box as a plain frame')}
                 hint={tt('siteConsole.embedFrameHint', 'For site builders that do not allow scripts. The height is fixed.')}
                 code={snippets.iframe} />
        <CopyRow label={tt('siteConsole.embedButton', 'A button to the checkout')}
                 hint={tt('siteConsole.embedButtonHint', 'A link, styled by your site. Opens V-ENT on the tickets.')}
                 code={snippets.button} />
        <p className={styles.label}>{tt('siteConsole.embedPreview', 'What your visitors will see')}</p>
        <iframe className={styles.preview} src={snippets.frameUrl} title={tt('siteConsole.embedPreview', 'What your visitors will see')} />
      </section>
    </>
  );
}
