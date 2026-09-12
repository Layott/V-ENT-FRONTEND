'use client';

// The author's side: make a comic, upload a chapter, boost it, write to your
// readers.
//
// This screen has no design in `docs/wip` because the wip set was drawn for
// READERS. It is built on the shape of the tournament console, which is the
// nearest built thing: a list of what you run down one side and the controls
// for the one you picked beside it.
//
// Everything here is a press with an effect, not a form that posts and hopes:
// creating a comic drops you into it, uploading a chapter shows the chapter
// count go up, boosting says the date it runs to, and the promo says how many
// people it reached.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { call, fill, tokenFrom, useAnimeCatalogue, useAnimeOpen } from '@/lib/anime';
import { formatDate, localInputToISO } from '@/lib/datetime';
import { useViewer, signInHref } from '@/lib/gating';
import styles from './studio.module.css';

/** The field the API keeps this comic's price in, or nothing when it is free. */
const PRICE_FIELD = {
  per_chapter: 'chapter_price_vc',
  subscription: 'subscription_price_vc',
};

/** What a comic costs now, whichever of the two fields holds it. */
const priceOf = series => (
  series?.pricing === 'per_chapter' ? series.chapter_price_vc
    : series?.pricing === 'subscription' ? series.subscription_price_vc
      : 0);

/** The one price field a pricing uses, ready to spread into a request body. */
const priceBody = (pricing, value) => {
  const field = PRICE_FIELD[pricing];
  if (!field) return {};
  return { [field]: Number(value) || 0 };
};

const Studio = () => {
  const tt = useT();
  const open = useAnimeOpen();
  const { data: session } = useSession();
  const viewer = useViewer();
  const token = tokenFrom(session);
  const { catalogue } = useAnimeCatalogue(open === true);

  const [mine, setMine] = useState([]);
  const [picked, setPicked] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // Creating a comic
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('manga');
  const [pricing, setPricing] = useState('free');
  const [price, setPrice] = useState('');
  const [synopsis, setSynopsis] = useState('');

  // What the comic already picked costs, so it can be changed after the day it
  // was made. The create form choosing a paid pricing and sending no number
  // made a comic that says it is paid and costs nothing, and there was no
  // second screen to correct it on.
  const [editPricing, setEditPricing] = useState('free');
  const [editPrice, setEditPrice] = useState('');

  // Uploading a chapter. The FILES are held here rather than in a draft: a
  // data URL in state is how the wizard uploads broke once.
  const pagesRef = useRef(null);
  const [number, setNumber] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [earlyVc, setEarlyVc] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [inVolume, setInVolume] = useState('');

  // Grouping chapters into volumes, which the spec asks for by name.
  const [volumeNumber, setVolumeNumber] = useState('');
  const [volumeTitle, setVolumeTitle] = useState('');

  // Writing to readers
  const [subject, setSubject] = useState('');
  const [promoBody, setPromoBody] = useState('');

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await call('/series/?mine=1', { token });
      setMine(data.series || []);
      setPicked(p => data.series?.find(s => s.slug === p?.slug) || data.series?.[0] || null);
    } catch (err) {
      setError(apiMessage(tt, err, 'anime.loadFailed', 'We could not load your comics.'));
    } finally {
      setLoading(false);
    }
  }, [token, tt]);

  useEffect(() => {
    if (open !== true || viewer.loading) return undefined;
    load();
    return undefined;
  }, [open, viewer.loading, load]);

  // The comic picked on the left decides what the pricing editor shows, and
  // picking another one has to move it, or the author edits the price of the
  // comic they were looking at a moment ago.
  useEffect(() => {
    if (!picked) return;
    setEditPricing(picked.pricing || 'free');
    setEditPrice(String(priceOf(picked) || ''));
  }, [picked]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setToast(null);
    try {
      const made = await call('/series/', {
        method: 'POST', token,
        body: { title, kind, pricing, synopsis, ...priceBody(pricing, price) },
      });
      setTitle(''); setSynopsis(''); setPrice('');
      setToast(tt('anime.comicCreated', 'Your comic is created. It is private until you publish it.'));
      await load();
      setPicked(made);
    } catch (err) {
      setToast(apiMessage(tt, err, 'anime.didNotWork', 'That did not work.'));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!picked) return;
    setBusy(true);
    setToast(null);
    try {
      const form = new FormData();
      form.append('number', number);
      if (chapterTitle) form.append('title', chapterTitle);
      if (earlyVc) form.append('early_access_vc', earlyVc);
      if (inVolume) form.append('volume', inVolume);
      // The typed value carries no zone, so it becomes an instant here, where
      // the browser is the only thing that knows which zone it was typed in.
      if (publishAt) form.append('published_at', localInputToISO(publishAt));
      const files = pagesRef.current?.files || [];
      for (const file of files) form.append('pages', file);

      await call(`/series/${picked.slug}/chapters/`, {
        method: 'POST', token, body: form, isForm: true,
      });
      setNumber(''); setChapterTitle(''); setEarlyVc(''); setPublishAt('');
      if (pagesRef.current) pagesRef.current.value = '';
      setToast(tt('anime.chapterUploaded', 'Chapter uploaded.'));
      await load();
    } catch (err) {
      setToast(apiMessage(tt, err, 'anime.didNotWork', 'That did not work.'));
    } finally {
      setBusy(false);
    }
  };

  const addVolume = async (e) => {
    e.preventDefault();
    if (!picked) return;
    setBusy(true);
    try {
      await call(`/series/${picked.slug}/volumes/`, {
        method: 'POST', token,
        body: { number: Number(volumeNumber), title: volumeTitle } });
      setVolumeNumber(''); setVolumeTitle('');
      setToast(tt('anime.volumeSaved', 'Volume saved.'));
      await load();
    } catch (err) {
      setToast(apiMessage(tt, err, 'anime.didNotWork', 'That did not work.'));
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await call(`/series/${picked.slug}/`, {
        method: 'PATCH', token,
        body: { visibility: picked.visibility === 'public' ? 'private' : 'public' },
      });
      setToast(picked.visibility === 'public'
        ? tt('anime.nowPrivate', 'It is private again.')
        : tt('anime.nowPublic', 'It is public. Anybody can find it.'));
      await load();
    } catch (err) {
      setToast(apiMessage(tt, err, 'anime.didNotWork', 'That did not work.'));
    } finally {
      setBusy(false);
    }
  };

  const savePricing = async (e) => {
    e.preventDefault();
    if (!picked) return;
    setBusy(true);
    setToast(null);
    try {
      await call(`/series/${picked.slug}/`, {
        method: 'PATCH', token,
        body: { pricing: editPricing, ...priceBody(editPricing, editPrice) },
      });
      setToast(editPricing === 'free'
        ? tt('anime.nowFree', 'It is free to read.')
        : fill(tt('anime.priceSaved', 'Saved. It costs {n} VENT COINS.'),
          { n: Number(editPrice) || 0 }));
      await load();
    } catch (err) {
      setToast(apiMessage(tt, err, 'anime.didNotWork', 'That did not work.'));
    } finally {
      setBusy(false);
    }
  };

  const boost = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      const res = await call(`/series/${picked.slug}/boost/`, {
        method: 'POST', token, body: { days: 7 } });
      setToast(fill(tt('anime.boostedUntil', 'It shows first until {d}.'),
        { d: formatDate(res.boosted_until) }));
      await load();
    } catch (err) {
      setToast(err.code === 'PREMIUM_REQUIRED'
        ? tt('anime.boostPremium', 'Boosting a comic is a premium feature.')
        : err.message);
    } finally {
      setBusy(false);
    }
  };

  const sendPromo = async (e) => {
    e.preventDefault();
    if (!picked) return;
    setBusy(true);
    try {
      const res = await call(`/series/${picked.slug}/promo/`, {
        method: 'POST', token, body: { subject, body: promoBody } });
      setSubject(''); setPromoBody('');
      setToast(fill(tt('anime.promoSent', 'Sent to {n} readers.'),
        { n: res.sent_to }));
    } catch (err) {
      setToast(err.code === 'PREMIUM_REQUIRED'
        ? tt('anime.promoPremium',
          'Writing to your readers is a premium feature.')
        : err.message);
    } finally {
      setBusy(false);
    }
  };

  if (open === null) return null;
  if (open === false) {
    return <ComingSoon phase="Phase 5"
      title={tt('anime.comingTitle', 'Anime hub')}
      blurb={tt('anime.comingBlurb',
        'Manga reading, co-reading rooms and character battles are built and '
        + 'not open yet. Nothing here is live.')}
      alternatives={[{ href: '/tournaments', label: tt('nav.tournaments', 'Tournaments') }]} />;
  }

  const shell = inner => (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <Link href="/anime" className={styles.backLink}>
            {tt('anime.backToHub', 'Back to anime')}
          </Link>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>{tt('anime.studio', 'Your comics')}</h1>
            <p className={styles.pageSub}>
              {tt('anime.studioSub',
                'Upload chapters, decide what they cost, and write to the '
                + 'people reading them.')}
            </p>
          </div>
          {inner}
        </div>
      </main>
      <BottomMenu />
      {toast ? <p className={styles.toast} role="status">{toast}</p> : null}
    </div>
  );

  if (viewer.loading) return shell(<div className={styles.skeleton} />);

  if (!viewer.signedIn) {
    return shell(
      <div className={styles.empty}>
        <p>{tt('anime.studioSignedOut',
          'Sign in to upload a comic and see what you have published.')}</p>
        <Link href={signInHref('/anime/studio')} className={styles.primaryBtn}>
          {tt('needsAccount.signIn', 'Log in')}
        </Link>
      </div>);
  }

  if (loading) return shell(<div className={styles.skeleton} />);
  if (error) {
    return shell(
      <div className={styles.empty}>
        <p>{error}</p>
        <button type="button" className={styles.quietBtn} onClick={load}>
          {tt('common.tryAgain', 'Try again')}
        </button>
      </div>);
  }

  const kinds = Object.entries(catalogue?.kinds || {});
  const pricings = Object.entries(catalogue?.pricing || {});

  return shell(
    <div className={styles.columns}>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{tt('anime.yours', 'Yours')}</h2>
        {mine.length === 0 ? (
          <p className={styles.empty}>
            {tt('anime.noneOfYours', 'You have not made one yet.')}
          </p>
        ) : (
          <ul className={styles.list}>
            {mine.map(s => (
              <li key={s.slug}>
                <button type="button"
                        aria-pressed={picked?.slug === s.slug}
                        className={picked?.slug === s.slug
                          ? styles.rowActive : styles.row}
                        onClick={() => setPicked(s)}>
                  <span className={styles.rowTitle}>{s.title}</span>
                  <span className={styles.rowMeta}>
                    {fill(tt('anime.chapterCount', '{n} chapters'),
                      { n: s.chapters })}
                    {s.visibility === 'public'
                      ? ` ${tt('anime.public', 'public')}`
                      : ` ${tt('anime.private', 'private')}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className={styles.form} onSubmit={create}>
          <h3 className={styles.cardTitle}>{tt('anime.newComic', 'A new comic')}</h3>
          <label className={styles.label} htmlFor="anime-title">
            {tt('anime.titleField', 'Title')}
          </label>
          <input id="anime-title" className={styles.input} value={title}
                 onChange={e => setTitle(e.target.value)} required />

          <label className={styles.label} htmlFor="anime-kind">
            {tt('anime.kind', 'Kind')}
          </label>
          <select id="anime-kind" className={styles.input} value={kind}
                  onChange={e => setKind(e.target.value)}>
            {kinds.map(([key, word]) => (
              <option key={key} value={key}>{word}</option>
            ))}
          </select>

          <label className={styles.label} htmlFor="anime-pricing">
            {tt('anime.pricingField', 'How it is paid for')}
          </label>
          <select id="anime-pricing" className={styles.input} value={pricing}
                  onChange={e => setPricing(e.target.value)}>
            {pricings.map(([key, word]) => (
              <option key={key} value={key}>{word}</option>
            ))}
          </select>

          {pricing !== 'free' && (
            <>
              <label className={styles.label} htmlFor="anime-price">
                {pricing === 'per_chapter'
                  ? tt('anime.priceChapter', 'What a chapter costs, in VENT COINS')
                  : tt('anime.priceMonth', 'What a month costs, in VENT COINS')}
              </label>
              <input id="anime-price" className={styles.input} value={price}
                     inputMode="numeric" required
                     onChange={e => setPrice(e.target.value)} />
            </>
          )}

          <label className={styles.label} htmlFor="anime-synopsis">
            {tt('anime.synopsis', 'What it is about')}
          </label>
          <textarea id="anime-synopsis" className={styles.textarea} rows={3}
                    value={synopsis} onChange={e => setSynopsis(e.target.value)} />

          <button type="submit" className={styles.primaryBtn}
                  disabled={busy || !title.trim()
                    || (pricing !== 'free' && !(Number(price) > 0))}>
            {tt('anime.createComic', 'Create it')}
          </button>
        </form>
      </section>

      {picked && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{picked.title}</h2>
          <p className={styles.rowMeta}>
            {picked.visibility === 'public'
              ? tt('anime.publicNote', 'Anybody can find this one.')
              : tt('anime.privateNote', 'Only you can see this one.')}
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.quietBtn} disabled={busy}
                    onClick={publish}>
              {picked.visibility === 'public'
                ? tt('anime.makePrivate', 'Make it private')
                : tt('anime.publish', 'Publish it')}
            </button>
            <Link href={`/anime/manga/${picked.slug}`} className={styles.quietBtn}>
              {tt('anime.viewPublic', 'See the public page')}
            </Link>
            <button type="button" className={styles.quietBtn} disabled={busy}
                    onClick={boost}>
              {picked.boosted
                ? tt('anime.boostAgain', 'Boost it for another week')
                : tt('anime.boost', 'Boost it for a week')}
            </button>
          </div>

          <form className={styles.form} onSubmit={savePricing}>
            <h3 className={styles.cardTitle}>
              {tt('anime.whatItCosts', 'What it costs')}
            </h3>
            <p className={styles.rowMeta}>
              {tt('anime.whatItCostsSub',
                'Readers pay this in VENT COINS, and it lands in your wallet. '
                + 'Change it whenever you like; anybody who already paid keeps '
                + 'what they paid for.')}
            </p>
            <label className={styles.label} htmlFor="edit-pricing">
              {tt('anime.pricingField', 'How it is paid for')}
            </label>
            <select id="edit-pricing" className={styles.input} value={editPricing}
                    onChange={e => setEditPricing(e.target.value)}>
              {pricings.map(([key, word]) => (
                <option key={key} value={key}>{word}</option>
              ))}
            </select>
            {editPricing !== 'free' && (
              <>
                <label className={styles.label} htmlFor="edit-price">
                  {editPricing === 'per_chapter'
                    ? tt('anime.priceChapter', 'What a chapter costs, in VENT COINS')
                    : tt('anime.priceMonth', 'What a month costs, in VENT COINS')}
                </label>
                <input id="edit-price" className={styles.input} value={editPrice}
                       inputMode="numeric" required
                       onChange={e => setEditPrice(e.target.value)} />
              </>
            )}
            <button type="submit" className={styles.primaryBtn}
                    disabled={busy
                      || (editPricing !== 'free' && !(Number(editPrice) > 0))}>
              {tt('anime.savePricing', 'Save what it costs')}
            </button>
          </form>

          <form className={styles.form} onSubmit={addVolume}>
            <h3 className={styles.cardTitle}>
              {tt('anime.volumes', 'Volumes')}
            </h3>
            <p className={styles.rowMeta}>
              {tt('anime.volumesSub',
                'Optional. Group chapters into books, and a chapter can name '
                + 'which one it belongs to when you upload it.')}
            </p>
            <label className={styles.label} htmlFor="vol-number">
              {tt('anime.volumeNumber', 'Which volume')}
            </label>
            <input id="vol-number" className={styles.input} value={volumeNumber}
                   inputMode="numeric"
                   onChange={e => setVolumeNumber(e.target.value)} required />
            <label className={styles.label} htmlFor="vol-title">
              {tt('anime.volumeTitle', 'Call it something')}
            </label>
            <input id="vol-title" className={styles.input} value={volumeTitle}
                   onChange={e => setVolumeTitle(e.target.value)} />
            <button type="submit" className={styles.primaryBtn}
                    disabled={busy || !volumeNumber}>
              {tt('anime.saveVolume', 'Save the volume')}
            </button>
          </form>

          <form className={styles.form} onSubmit={upload}>
            <h3 className={styles.cardTitle}>
              {tt('anime.uploadChapter', 'Upload a chapter')}
            </h3>
            <label className={styles.label} htmlFor="ch-number">
              {tt('anime.number', 'No.')}
            </label>
            <input id="ch-number" className={styles.input} value={number}
                   onChange={e => setNumber(e.target.value)}
                   inputMode="decimal" required />

            <label className={styles.label} htmlFor="ch-title">
              {tt('anime.chapterTitle', 'Title')}
            </label>
            <input id="ch-title" className={styles.input} value={chapterTitle}
                   onChange={e => setChapterTitle(e.target.value)} />

            {picked.volumes?.length > 0 && (
              <>
                <label className={styles.label} htmlFor="ch-volume">
                  {tt('anime.inVolume', 'In which volume')}
                </label>
                <select id="ch-volume" className={styles.input} value={inVolume}
                        onChange={e => setInVolume(e.target.value)}>
                  <option value="">{tt('anime.noVolume', 'No volume')}</option>
                  {picked.volumes.map(v => (
                    <option key={v.number} value={v.number}>
                      {v.title || fill(tt('anime.volumeN', 'Volume {n}'),
                        { n: v.number })}
                    </option>
                  ))}
                </select>
              </>
            )}
            <label className={styles.label} htmlFor="ch-pages">
              {tt('anime.pageFiles', 'The pages, in order')}
            </label>
            <input id="ch-pages" className={styles.input} type="file"
                   ref={pagesRef} multiple accept="image/*" />

            <label className={styles.label} htmlFor="ch-when">
              {tt('anime.releaseDate', 'Out on (leave empty for now)')}
            </label>
            <input id="ch-when" className={styles.input} type="datetime-local"
                   value={publishAt} onChange={e => setPublishAt(e.target.value)} />

            <label className={styles.label} htmlFor="ch-early">
              {tt('anime.earlyPrice', 'Early access, in VENT COINS')}
            </label>
            <input id="ch-early" className={styles.input} value={earlyVc}
                   onChange={e => setEarlyVc(e.target.value)} inputMode="numeric" />

            <button type="submit" className={styles.primaryBtn}
                    disabled={busy || !number}>
              {tt('anime.uploadIt', 'Upload it')}
            </button>
          </form>

          <form className={styles.form} onSubmit={sendPromo}>
            <h3 className={styles.cardTitle}>
              {tt('anime.writeToReaders', 'Write to your readers')}
            </h3>
            <p className={styles.rowMeta}>
              {tt('anime.writeToReadersSub',
                'Everybody following or subscribed to this comic gets it as a '
                + 'notification. Premium.')}
            </p>
            <label className={styles.label} htmlFor="promo-subject">
              {tt('anime.subject', 'Subject')}
            </label>
            <input id="promo-subject" className={styles.input} value={subject}
                   onChange={e => setSubject(e.target.value)} />
            <label className={styles.label} htmlFor="promo-body">
              {tt('anime.message', 'What to say')}
            </label>
            <textarea id="promo-body" className={styles.textarea} rows={3}
                      value={promoBody}
                      onChange={e => setPromoBody(e.target.value)} />
            <button type="submit" className={styles.primaryBtn}
                    disabled={busy || !subject.trim() || !promoBody.trim()}>
              {tt('anime.send', 'Send it')}
            </button>
          </form>
        </section>
      )}
    </div>
  );
};

export default Studio;
