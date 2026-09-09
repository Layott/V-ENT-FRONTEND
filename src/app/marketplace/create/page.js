'use client';

// Listing something.
//
// The form asks what the KIND asks for and nothing else. Which fields those
// are comes from `/marketplace/catalogue/`, which is the same table the server
// validates against, so this form cannot ask for something that will be
// dropped and cannot omit something that will be refused.
//
// Three steps, because the preserved design had three and they are the right
// three: what it is, what it costs, and a look at it before it goes live.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { HiPlus } from 'react-icons/hi';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import { useT } from '@/i18n/LanguageProvider';
import { call, fill, useCatalogue, useMarketplaceOpen } from '@/lib/marketplace';
import styles from './create.module.css';

// The label for each field, in the reader's language. The KEY comes from the
// catalogue; only the words live here.
const FIELD_WORDS = {
  price: ['mk.f.price', 'Price in VENT COINS'],
  price_kind: ['mk.f.priceKind', 'Charged as'],
  quantity: ['mk.f.quantity', 'How many are there'],
  duration_minutes: ['mk.f.duration', 'How long, in minutes'],
  experience: ['mk.f.experience', 'Your experience'],
  delivery: ['mk.f.delivery', 'How it is delivered'],
  location: ['mk.f.location', 'Where'],
  offered: ['mk.f.offered', 'What you are offering'],
  wanted: ['mk.f.wanted', 'What you want for it'],
  trade_value: ['mk.f.tradeValue', 'What it is worth'],
  condition: ['mk.f.condition', 'Condition'],
  payment_methods: ['mk.f.payment', 'How you accept payment'],
  tags: ['mk.f.tags', 'Tags, one per line'],
  available_from: ['mk.f.from', 'Available from'],
  available_to: ['mk.f.to', 'Available until'],
};

const CreateListing = () => {
  const tt = useT();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = session?.user?.sessionToken;

  const open = useMarketplaceOpen();
  const { catalogue } = useCatalogue(open);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ kind: 'sale', category: '', title: '',
                                     description: '', tags: '' });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [madeSlug, setMadeSlug] = useState('');

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const uses = catalogue?.fields?.[form.kind]?.uses || [];
  const required = catalogue?.fields?.[form.kind]?.required || [];

  const publish = async () => {
    setBusy(true);
    setProblem('');
    try {
      const body = { kind: form.kind, category: form.category,
                     title: form.title, description: form.description,
                     publish: true,
                     tags: (form.tags || '').split('\n').map(t => t.trim()).filter(Boolean) };
      uses.forEach(field => {
        if (form[field] !== undefined && form[field] !== '') body[field] = form[field];
      });

      const data = await call('/listings/new/', { method: 'POST', token, body });
      const slug = data.listing.slug;

      // The pictures go up after the listing exists, because they belong to it.
      for (const file of files) {
        const payload = new FormData();
        payload.append('file', file);
        // eslint-disable-next-line no-await-in-loop
        await call(`/listings/${slug}/media/`, {
          method: 'POST', token, body: payload, isForm: true,
        }).catch(() => null);
      }

      setMadeSlug(slug);
    } catch (err) {
      setProblem(err.message);
      // Send them back to the step the refusal is about, rather than leaving
      // them looking at a review screen with an error about a field two steps
      // behind it.
      if (err.field && ['kind', 'category', 'title'].includes(err.field)) setStep(1);
      else if (err.field) setStep(2);
    } finally {
      setBusy(false);
    }
  };

  if (open === null) return null;
  if (!open) {
    return <ComingSoon
      phase="Phase 4"
      title={tt('mk.title', 'Vermillion City')}
      blurb={tt('mk.comingSoon', 'Player to player listings, offers and escrow are built and not open yet.')}
      alternatives={[{ href: '/tournaments', label: tt('ui.tournaments.fee2', 'Tournaments') }]} />;
  }

  if (status === 'unauthenticated') {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <h1 className={styles.title}>{tt('mk.create', 'List something')}</h1>
            <p className={styles.sub}>
              {tt('mk.signInToList', 'You need an account to list something.')}
            </p>
            <Link href="/login" className={styles.nextBtn}>
              {tt('ui.log.in.2f3d', 'Log in')}
            </Link>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Link href="/marketplace" className={styles.backLink}>
            {tt('mk.back', 'Back to Vermillion City')}
          </Link>

          {madeSlug ? (
            <div className={styles.success}>
              <span className={styles.successIcon} aria-hidden="true">+</span>
              <h1 className={styles.successTitle}>{tt('mk.listed', 'It is listed.')}</h1>
              <p className={styles.successSub}>
                {tt('mk.listedSub', 'People can find it now. You will be told when somebody asks about it or buys it.')}
              </p>
              <div className={styles.actions}>
                <Link href={`/marketplace/listing/${madeSlug}`} className={styles.nextBtn}>
                  {tt('mk.seeIt', 'See it')}
                </Link>
                <Link href="/marketplace/dashboard" className={styles.backBtn}>
                  {tt('mk.dashboard', 'What I am selling')}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>{tt('mk.create', 'List something')}</h1>
                <p className={styles.sub}>
                  {tt('mk.createSub', 'A free account keeps one listing live at a time.')}
                </p>
              </div>

              <div className={styles.stepper}>
                {[1, 2, 3].map(n => (
                  <div key={n} className={styles.stepDot}>
                    <span className={`${styles.dotNum} ${step === n ? styles.dotActive : ''} ${step > n ? styles.dotDone : ''}`}>
                      {n}
                    </span>
                    <span className={`${styles.dotLabel} ${step === n ? styles.dotLabelActive : ''}`}>
                      {[tt('mk.step1', 'What it is'),
                        tt('mk.step2', 'What it costs'),
                        tt('mk.step3', 'A look at it')][n - 1]}
                    </span>
                    {n < 3 && <span className={styles.stepConnector} />}
                  </div>
                ))}
              </div>

              {problem && <p className={styles.errorBanner} role="alert">{problem}</p>}

              {step === 1 && (
                <div className={styles.panel}>
                  <p className={styles.panelTitle}>{tt('mk.whatKind', 'What are you listing?')}</p>
                  <div className={styles.modeToggle}>
                    {(catalogue?.kinds || []).map(k => (
                      <button key={k.key} type="button"
                              aria-pressed={form.kind === k.key}
                              className={`${styles.modeBtn} ${form.kind === k.key ? styles.modeBtnActive : ''}`}
                              onClick={() => set('kind', k.key)}>
                        {tt(`mk.kind.${k.key}`, k.label)}
                      </button>
                    ))}
                  </div>

                  <p className={styles.panelTitle}>{tt('mk.categories', 'Categories')}</p>
                  <div className={styles.optionGrid}>
                    {(catalogue?.categories || []).map(c => (
                      <button key={c.key} type="button"
                              aria-pressed={form.category === c.key}
                              className={`${styles.optionBtn} ${form.category === c.key ? styles.optionBtnActive : ''}`}
                              onClick={() => set('category', c.key)}>
                        {tt(`mk.cat.${c.key}`, c.label)}
                      </button>
                    ))}
                  </div>

                  <label className={styles.label} htmlFor="mkTitle">
                    {tt('mk.f.title', 'A title people will search for')}
                  </label>
                  <input id="mkTitle" className={styles.input} value={form.title}
                         onChange={e => set('title', e.target.value)} />

                  <label className={styles.label} htmlFor="mkDesc">
                    {tt('mk.f.description', 'What it is, in your own words')}
                  </label>
                  <textarea id="mkDesc" className={styles.textarea} rows={5}
                            value={form.description}
                            onChange={e => set('description', e.target.value)} />

                  <div className={styles.actions}>
                    <button type="button" className={styles.nextBtn}
                            disabled={!form.title.trim() || !form.category}
                            onClick={() => setStep(2)}>
                      {tt('ui.next.bc98', 'Next')}
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className={styles.panel}>
                  <p className={styles.panelTitle}>{tt('mk.step2', 'What it costs')}</p>

                  {uses.map(field => {
                    const words = FIELD_WORDS[field] || [`mk.f.${field}`, field];
                    const label = tt(words[0], words[1])
                      + (required.includes(field) ? '' : ` ${tt('mk.optional', '(optional)')}`);

                    if (field === 'price_kind' || field === 'delivery' || field === 'condition') {
                      const options = { price_kind: catalogue?.pricing,
                                        delivery: catalogue?.delivery,
                                        condition: catalogue?.conditions }[field] || [];
                      return (
                        <div key={field} className={styles.row}>
                          <label className={styles.label} htmlFor={`mk-${field}`}>{label}</label>
                          <select id={`mk-${field}`} className={styles.selectInput}
                                  value={form[field] || ''}
                                  onChange={e => set(field, e.target.value)}>
                            <option value="">{tt('mk.choose', 'Choose')}</option>
                            {options.map(o => (
                              <option key={o.key} value={o.key}>
                                {tt(`mk.opt.${o.key}`, o.label)}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    const numeric = ['price', 'quantity', 'duration_minutes', 'trade_value']
                      .includes(field);
                    return (
                      <div key={field} className={styles.row}>
                        <label className={styles.label} htmlFor={`mk-${field}`}>{label}</label>
                        <input id={`mk-${field}`} className={styles.input}
                               type={numeric ? 'number' : 'text'}
                               value={form[field] || ''}
                               onChange={e => set(field, numeric
                                 ? e.target.value.replace(/[^0-9]/g, '')
                                 : e.target.value)} />
                      </div>
                    );
                  })}

                  <label className={styles.label} htmlFor="mkTags">
                    {tt('mk.f.tags', 'Tags, one per line')}
                  </label>
                  <textarea id="mkTags" className={styles.textarea} rows={3} value={form.tags}
                            placeholder={'League of Legends coaching'}
                            onChange={e => set('tags', e.target.value)} />

                  <p className={styles.panelTitle}>{tt('mk.pictures', 'Pictures')}</p>
                  <div className={styles.mediaGrid}>
                    {files.map((file, i) => (
                      <div key={i} className={styles.mediaTile}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(file)} alt={file.name} />
                        <button type="button" className={styles.mediaRemove}
                                aria-label={tt('mk.removePicture', 'Remove this picture')}
                                onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                          x
                        </button>
                      </div>
                    ))}
                    <label className={styles.mediaUpload}>
                      <HiPlus aria-hidden="true" />
                      <span>{tt('mk.addPicture', 'Add a picture')}</span>
                      <input type="file" accept="image/*" hidden
                             onChange={e => {
                               const chosen = e.target.files?.[0];
                               if (chosen) setFiles(prev => [...prev, chosen]);
                               e.target.value = '';
                             }} />
                    </label>
                  </div>

                  <div className={styles.actions}>
                    <button type="button" className={styles.backBtn} onClick={() => setStep(1)}>
                      {tt('ui.back.b52b', 'Back')}
                    </button>
                    <button type="button" className={styles.nextBtn} onClick={() => setStep(3)}>
                      {tt('ui.next.bc98', 'Next')}
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className={styles.panel}>
                  <p className={styles.panelTitle}>{tt('mk.step3', 'A look at it')}</p>
                  <div className={styles.reviewCard}>
                    <div className={styles.reviewRow}>
                      <span className={styles.reviewLabel}>{tt('mk.f.title', 'A title people will search for')}</span>
                      <span className={styles.reviewValue}>{form.title}</span>
                    </div>
                    <div className={styles.reviewRow}>
                      <span className={styles.reviewLabel}>{tt('mk.whatKind', 'What are you listing?')}</span>
                      <span className={styles.reviewValue}>
                        {tt(`mk.kind.${form.kind}`, form.kind)}
                        {form.category ? `, ${tt(`mk.cat.${form.category}`, form.category)}` : ''}
                      </span>
                    </div>
                    {uses.filter(f => form[f]).map(f => (
                      <div key={f} className={styles.reviewRow}>
                        <span className={styles.reviewLabel}>
                          {tt((FIELD_WORDS[f] || [])[0] || `mk.f.${f}`,
                              (FIELD_WORDS[f] || [])[1] || f)}
                        </span>
                        <span className={styles.reviewValue}>{String(form[f])}</span>
                      </div>
                    ))}
                    {files.length > 0 && (
                      <div className={styles.reviewImagesRow}>
                        {files.map((file, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={URL.createObjectURL(file)} alt={file.name}
                               className={styles.reviewImageThumb} />
                        ))}
                      </div>
                    )}
                  </div>

                  <p className={styles.hint}>
                    {tt('mk.publishHint', 'It goes live straight away. You can pause it at any time.')}
                  </p>

                  <div className={styles.actions}>
                    <button type="button" className={styles.backBtn} onClick={() => setStep(2)}>
                      {tt('ui.back.b52b', 'Back')}
                    </button>
                    <button type="button" className={styles.nextBtn} disabled={busy}
                            onClick={publish}>
                      {busy ? tt('mk.listing', 'Listing it…') : tt('mk.publish', 'List it')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

export default CreateListing;
