'use client';

// The last boundary: it replaces the root layout itself, so it runs when the
// layout, the language provider or the shell has failed (owner rule R79).
// Nothing the layout provides can be assumed here, so it brings its own html,
// body and sentences. The sentences are the site's own `error.*` keys, copied,
// because a crash page that imports every dictionary is a crash page that can
// fail to load. The language comes from the address, which still exists.
//
// No exception text is ever shown: the digest is an opaque reference, safe to
// show and the one thing that makes a report actionable.
import { useEffect } from 'react';
import './globals.css';
// The same screen as every other boundary, from the same stylesheet.
import styles from '@/components/error-screen/error-screen.module.css';

const COPY = {
  en: {
    title: 'This page did not load',
    body: 'Something on our side failed while putting this page together. It is not something you did, and trying again often works.',
    retry: 'Try again',
    home: 'Go home',
    reference: 'Reference',
  },
  fr: {
    title: "Cette page ne s'est pas chargée",
    body: 'Quelque chose a échoué de notre côté en assemblant cette page. Cela ne vient pas de vous, et réessayer suffit souvent.',
    retry: 'Réessayer',
    home: "Aller à l'accueil",
    reference: 'Référence',
  },
  pt: {
    title: 'Esta página não carregou',
    body: 'Algo do nosso lado falhou ao montar esta página. Não foi nada que tenha feito, e tentar de novo costuma resolver.',
    retry: 'Tentar de novo',
    home: 'Ir para o início',
    reference: 'Referência',
  },
};

function localeFromAddress() {
  if (typeof window === 'undefined') return 'en';
  const first = window.location.pathname.split('/')[1];
  return first === 'fr' || first === 'pt' ? first : 'en';
}

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // For whoever is debugging, in the console. Never on the page.
    if (error) console.error('[v-ent] root layout error', error);
  }, [error]);

  const locale = localeFromAddress();
  const copy = COPY[locale];
  const reference = error?.digest || '';

  return (
    <html lang={locale}>
      <body>
        <main className={styles.wrap}>
          <div className={styles.card}>
            <h1 className={styles.title}>{copy.title}</h1>
            <p className={styles.body}>{copy.body}</p>
            {reference && (
              <p className={styles.reference}>
                {copy.reference} <span className={styles.code}>{reference}</span>
              </p>
            )}
            <div className={styles.actions}>
              <button type="button" className={`${styles.primary} goldBTN`} onClick={() => reset()}>
                {copy.retry}
              </button>
              <a href={locale === 'en' ? '/' : `/${locale}`} className={styles.secondary}>
                {copy.home}
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
