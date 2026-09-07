'use client';

import { useState } from 'react';
import { FaBell, FaCheckCircle } from 'react-icons/fa';
import styles from './coming-soon.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

/**
 * ComingSoonModule
 * Reusable hero + feature-grid + email-capture for Phase X preview pages.
 *
 * Props:
 *  - title         : string     - H1
 *  - tagline       : string     - supporting paragraph under the H1
 *  - badge         : string     - top pill label (e.g. "COMING IN PHASE 5")
 *  - description   : string     - longer intro paragraph under tagline (optional)
 *  - features      : [{ icon: ReactNode, title: string, desc: string }]
 *  - ctaText       : string     - email capture button label (default "Notify me")
 *  - phaseLabel    : string     - small bottom-line phase hint
 *  - accentColor   : 'red' | 'grn'  - which V-ENT accent drives headline highlight + button
 */
const ComingSoonModule = ({
  title,
  tagline,
  badge,
  description,
  features = [],
  ctaText = 'Notify me',
  phaseLabel,
  accentColor = 'red'
}) => {
  const tx = useTx();
  const tt = useT();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = e => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError(tt("msg.pleaseEnterYourEmail", "Please enter your email."));
      return;
    }
    // Lightweight email sanity check (UI-only, no API)
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!valid) {
      setError(tt("msg.pleaseEnterAValidEmail", "Please enter a valid email address."));
      return;
    }
    setError('');
    setSubmitted(true);
    setEmail('');
  };
  const ctaClass = accentColor === 'grn' ? 'goldBTN' : 'redBTN';
  const accentVar = accentColor === 'grn' ? 'var(--v-ent-gold)' : 'var(--v-ent-red)';
  return <div>
      {/* ── Hero ── */}
      <section>
        {badge && <span>{badge}</span>}
        <h1 className={styles.title}>
          {title}
          <span style={{
          background: accentVar
        }} aria-hidden="true" />
        </h1>
        <p>{tagline}</p>
        {description && <p>{description}</p>}
      </section>

      {/* ── Feature grid ── */}
      {features.length > 0 && <section>
          <h2>{tt("ui.what.expect.ed98", "What to expect")}</h2>
          <div>
            {features.map((f, i) => <div key={i}>
                <div style={{
            color: accentVar
          }}>
                  {f.icon}
                </div>
                <h3>{tx(f.title)}</h3>
                <p>{tx(f.desc)}</p>
              </div>)}
          </div>
        </section>}

      {/* ── Email capture ── */}
      <section>
        <div>
          <div>
            <div style={{
            color: accentVar
          }}>
              <FaBell />
            </div>
            <div>
              <h2>{tt("ui.first.know.be67", "Be first to know")}</h2>
              <p>
                {tt("ui.drop.email.we'll.notify.9bd6", "Drop your email and we'll notify you the moment this goes live.")}
              </p>
            </div>
          </div>

          {submitted ? <div>
              <FaCheckCircle />
              <p>
                {tt("ui.we'll.email.when.it.29b7", "We'll email you when it launches. Welcome to the early-access list.")}
              </p>
            </div> : <form onSubmit={handleSubmit} noValidate>
              <input type="email" placeholder={tt("ui.example.com.50e2", "you@example.com")} value={email} onChange={e => {
            setEmail(e.target.value);
            if (error) setError('');
          }} aria-label={tt("ui.email.address.c94d", "Email address")} />
              <button type="submit" className={`btn ${ctaClass}`}>
                {ctaText}
              </button>
            </form>}

          {!submitted && error && <p>{error}</p>}
        </div>
      </section>

      {/* ── Phase footer ── */}
      {phaseLabel && <p>{phaseLabel}</p>}
    </div>;
};
export default ComingSoonModule;