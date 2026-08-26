'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/i18n/LanguageProvider';
import styles from './sign-in-to-engage.module.css';

// What a signed-out visitor sees where a signed-in one gets a control.
//
// The community pages are deliberately readable without an account: somebody
// who lands on a thread from a search result should be able to read it, and a
// wall in front of the content is how a community stays invisible. What they
// cannot do is write - post, reply, like, join a club, offer a scrim.
//
// The compose box used to render for them anyway, with a live Post button. It
// looked available, and pressing it produced a 401 from the API. Being told
// what you need after typing is worse than being told before.
//
// So the control is replaced rather than disabled. A disabled field invites
// you to work out why; a sentence with a link says what to do. The link
// carries the page you were on, so signing in returns you here rather than
// dropping you on a dashboard.

const SignInToEngage = ({ action, className = '' }) => {
  const t = useT();
  const pathname = usePathname() || '/community';
  const next = encodeURIComponent(pathname);

  return (
    <p className={`${styles.prompt} ${className}`}>
      <Link href={`/login?next=${next}`} className={styles.link}>
        {t('community.signIn', 'Sign in')}
      </Link>
      {' '}
      {action || t('community.toEngage', 'to post, reply and join in.')}
    </p>
  );
};

export default SignInToEngage;
