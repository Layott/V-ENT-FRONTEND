'use client';

import { uploadHint } from '@/lib/uploadSpecs';
import { useState, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthHeader from '@/components/auth-header/AuthHeader';
import generalStyles from '@/styles/auth/auth.module.css';
import styles from './onboarding.module.css';
import useGames from '@/hooks/useGames';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const STEPS = [{
  id: 'profile',
  label: 'Profile'
}, {
  id: 'games',
  label: 'Games'
}, {
  id: 'region',
  label: 'Region'
}, {
  id: 'wallet',
  label: 'Wallet'
}, {
  id: 'done',
  label: 'Done'
}];
const REGIONS = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Other'];
const OnboardingContent = () => {
  const tx = useTx();
  const tt = useT();
  const {
    gameTitles: GAME_CHOICES
  } = useGames();
  const router = useRouter();
  const {
    data: session
  } = useSession();
  const [step, setStep] = useState(0);
  const [handle, setHandle] = useState(session?.user?.username || session?.user?.name || '');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [games, setGames] = useState([]);
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const avatarInputRef = useRef(null);
  const isLast = step === STEPS.length - 1;
  const goNext = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep(s => Math.max(0, s - 1));
  const finish = () => {
    // Persist choices locally so the app can pick them up later. No required
    // network call - onboarding must work in mock mode with no backend.
    try {
      localStorage.setItem('onboarding', JSON.stringify({
        handle,
        games,
        region,
        city,
        completed: true
      }));
      localStorage.removeItem('needsOnboarding');
    } catch {}
    router.push('/home');
  };
  const handleAvatar = file => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
  };
  const toggleGame = name => {
    setGames(prev => {
      if (prev.includes(name)) return prev.filter(g => g !== name);
      if (prev.length >= 15) return prev;
      return [...prev, name];
    });
  };
  const initials = (handle || 'V').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  return <div className={generalStyles.pageContainer}>
      <header className={generalStyles.pageHeader}>
        <AuthHeader />
      </header>

      <main className={generalStyles.mainContainer}>
        <div className={`${generalStyles.formContainer} ${styles.wizard}`}>
          {/* Progress stepper */}
          <div className={styles.stepper} role="tablist" aria-label={tt("ui.onboarding.steps.3bd1", "Onboarding steps")}>
            {STEPS.map((s, i) => <div key={s.id} className={styles.stepItem}>
                <div className={`${styles.stepDot} ${i === step ? styles.stepDotActive : ''} ${i < step ? styles.stepDotDone : ''}`}>
                  {i < step ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg> : i + 1}
                </div>
                <span className={`${styles.stepLabel} ${i === step ? styles.stepLabelActive : ''}`}>{tx(s.label)}</span>
              </div>)}
          </div>

          {/* STEP 1 - Profile */}
          {step === 0 && <section className={styles.stepBody}>
              <h1 className={styles.stepTitle}>{tt("ui.welcome.v.ent.b1eb", "Welcome to V-ENT")}</h1>
              <p className={styles.stepSub}>{tt("ui.let's.set.up.profile.9684", "Let's set up your profile. You can skip anything and change it later.")}</p>

              <div className={styles.avatarRow}>
                <div className={styles.avatarCircle}>
                  {avatarPreview ? <img src={avatarPreview} alt={tt("ui.avatar.preview.9d0a", "Avatar preview")} /> : <span>{initials}</span>}
                </div>
                <div>
                  <button type="button" className={`btn goldBTN ${styles.smallBtn}`} onClick={() => avatarInputRef.current?.click()}>
                    {tt("ui.upload.photo.69ab", "Upload photo")}
                  </button>
                  <p className={styles.hint}>{uploadHint(tt, 'avatar')}</p>
                  <input ref={avatarInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={e => handleAvatar(e.target.files?.[0])} />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="handle">{tt("ui.handle.56b7", "Your handle")}</label>
                <input id="handle" className={styles.input} type="text" placeholder={tt("ui.yourhandle.2b7f", "@yourhandle")} value={handle} onChange={e => setHandle(e.target.value)} />
              </div>
            </section>}

          {/* STEP 2 - Favorite games */}
          {step === 1 && <section className={styles.stepBody}>
              <h1 className={styles.stepTitle}>{tt("ui.pick.favorite.games.6b24", "Pick your favorite games")}</h1>
              <p className={styles.stepSub}>{tt("ui.we'll.use.these.surface.512c", "We'll use these to surface the right tournaments. Choose as many as you like.")}</p>

              <div className={styles.gameGrid}>
                {GAME_CHOICES.map(g => {
              const on = games.includes(g);
              return <button type="button" key={g} className={`${styles.gameChip} ${on ? styles.gameChipOn : ''}`} onClick={() => toggleGame(g)} aria-pressed={on}>
                      {on && <svg className={styles.gameCheck} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                      {g}
                    </button>;
            })}
              </div>
              <p className={styles.hint}>{games.length} {tt("ui.selected.835f", "selected")}</p>
            </section>}

          {/* STEP 3 - Region */}
          {step === 2 && <section className={styles.stepBody}>
              <h1 className={styles.stepTitle}>{tt("ui.where.playing.from.799f", "Where are you playing from?")}</h1>
              <p className={styles.stepSub}>{tt("ui.helps.us.match.local.3013", "Helps us match you with local events and payment options.")}</p>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="region">{tt("ui.country.region.e9ff", "Country / Region")}</label>
                <select id="region" className={styles.select} value={region} onChange={e => setRegion(e.target.value)}>
                  <option value="">{tt("ui.select.region.08c8", "Select your region")}</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="city">{tt("ui.state.city.optional.d14f", "State / City (optional)")}</label>
                <input id="city" className={styles.input} type="text" placeholder={tt("ui.e.g.lagos.81a0", "e.g. Lagos")} value={city} onChange={e => setCity(e.target.value)} />
              </div>
            </section>}

          {/* STEP 4 - Wallet + PIN intro */}
          {step === 3 && <section className={styles.stepBody}>
              <h1 className={styles.stepTitle}>{tt("ui.vent.coins.wallet.b6d6", "Your VENT COINS wallet")}</h1>
              <p className={styles.stepSub}>
                {tt("ui.vent.coins.vc.app.974a", "VENT COINS (VC) are the in-app currency for entry fees, prizes, and payouts.")}
                <strong> {tt("ui.ngn.vc.f0cb", "1,000 NGN = 1 VC.")}</strong>
              </p>

              <div className={styles.walletCard}>
                <div className={styles.walletHead}>{tt("ui.starting.balance.7d54", "Starting balance")}</div>
                <div className={styles.walletAmount}>
                  <span className={styles.coinDot} />
                  {tt("onboarding.startingZero", "0 VC")}
                </div>
                <p className={styles.walletNote}>{tt("ui.top.up.any.time.4e2d", "Top up any time from your wallet to register for paid tournaments.")}</p>
              </div>

              <div className={styles.pinBlock}>
                <label className={styles.label}>{tt("ui.wallet.pin.2cdf", "Wallet PIN")}</label>
                <div className={styles.pinRow} aria-hidden="true">
                  {[0, 1, 2, 3].map(i => <div key={i} className={styles.pinBox} />)}
                </div>
                <p className={styles.hint}>{tt("ui.you'll.set.digit.pin.8fdd", "You'll set a 4-digit PIN to authorize payments. You can do this later in your wallet.")}</p>
              </div>
            </section>}

          {/* STEP 5 - Done */}
          {step === 4 && <section className={styles.stepBody}>
              <div className={styles.doneIcon}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h1 className={styles.stepTitle}>{tt("ui.you're.all.set.0efc", "You're all set")}</h1>
              <p className={styles.stepSub}>{tt("ui.here's.what.we've.got.4d01", "Here's what we've got. You can change any of it from your profile and wallet.")}</p>

              <ul className={styles.recap}>
                <li><span>{tt("ui.handle.c039", "Handle")}</span><strong>{handle ? `@${handle.replace(/^@/, '')}` : tx("Not set")}</strong></li>
                <li><span>{tt("ui.favorite.games.84cc", "Favorite games")}</span><strong>{games.length > 0 ? games.join(', ') : tx("None yet")}</strong></li>
                <li><span>{tt("ui.region.0f21", "Region")}</span><strong>{region || tx("Not set")}{city ? ` · ${city}` : ''}</strong></li>
                <li><span>{tt("ui.wallet.pin.2cdf", "Wallet PIN")}</span><strong>{tt("ui.set.up.later.6a3a", "Set up later")}</strong></li>
              </ul>
            </section>}

          {/* Controls */}
          <div className={styles.controls}>
            <div className={styles.controlsLeft}>
              {step > 0 && <button type="button" className={styles.ghostBtn} onClick={goBack}>{tt("ui.back.b52b", "Back")}</button>}
            </div>
            <div className={styles.controlsRight}>
              {!isLast && <button type="button" className={styles.ghostBtn} onClick={step === STEPS.length - 2 ? finish : goNext}>
                  {tt("ui.skip.3da4", "Skip")}
                </button>}
              {isLast ? <button type="button" className={`btn ${styles.primaryBtn}`} onClick={finish}>
                  {tt("ui.go.dashboard.e5fa", "Go to dashboard")}
                </button> : <button type="button" className={`btn ${styles.primaryBtn}`} onClick={goNext}>
                  {tt("ui.continue.2e02", "Continue")}
                </button>}
            </div>
          </div>
        </div>
      </main>
    </div>;
};
const Onboarding = () => {
  const tt = useT();
  return <Suspense fallback={<div style={{
    minHeight: '100vh',
    backgroundColor: '#131316',
    color: '#A7A6A6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
      {tt("ui.loading.33ce", "Loading…")}
    </div>}>
    <OnboardingContent />
  </Suspense>;
};
export default Onboarding;