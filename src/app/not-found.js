import Link from 'next/link';
import { getT } from '@/i18n/server';
import styles from './not-found.module.css';

// A page for an address that does not exist.
//
// There was none, so Next rendered its bare default: a white screen with a line
// of black text, which is what /team-profile showed. Anything mistyped, any old
// link, any renamed route looked like the site had broken.

export const metadata = {
  title: 'Page not found | V-ENT',
};

const NotFound = () => {
  const t = getT();
  return (
  <main className={styles.wrap}>
    <div className={styles.card}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>{t('notFound.title', 'That page does not exist')}</h1>
      <p className={styles.body}>
        {t('notFound.body',
          'The link may be out of date, or the address may have a typo in it. '
          + 'These are the places people usually mean:')}
      </p>

      <div className={styles.links}>
        <Link href="/home" className={styles.primary}>{t('notFound.home', 'Home')}</Link>
        <Link href="/tournaments" className={styles.link}>{t('notFound.tournaments', 'Tournaments')}</Link>
        <Link href="/events" className={styles.link}>{t('notFound.events', 'Events')}</Link>
        <Link href="/teams" className={styles.link}>{t('notFound.teams', 'Teams')}</Link>
      </div>
    </div>
  </main>
);
};

export default NotFound;
