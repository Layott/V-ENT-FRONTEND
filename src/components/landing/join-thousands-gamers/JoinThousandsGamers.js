"use client";

// The last section of the home page: what an account is for, and the way in.
//
// It was a waitlist: "Join thousands of gamers and anime fans waiting for the
// ultimate platform launch", with an email box. The platform has launched, the
// number was never measured, and a waitlist for something open is a dead end
// (apple-design review, inbox 547, 25 October 2026). Somebody signed in is sent
// to their own home instead of being asked to sign up again.

import Link from 'next/link';
import joinThousandsGamers from '@/images/join_thousands.jpeg';
import landingStyles from '@/styles/landing/landing.module.css';
import styles from './join-thousands-gamers.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useViewer } from '@/lib/gating';

const JoinThousandsGamers = () => {
  const tt = useT();
  const viewer = useViewer();
  return <div className={`${landingStyles.joinThousandsGamersContainer} ${styles.joinThousandsGamersContainer}`}>
        <div className={styles.innerJoinThousandsGamersContainer} style={{
      backgroundImage: `url(${joinThousandsGamers.src})`,
      backgroundSize: 'cover'
    }}>
          <div className={styles.joinThousandsGamersContent}>
            <div className={styles.joinThousandsGamersTop}>
              <h2>{tt('landing.joinHeading', 'Enter tournaments, buy event tickets and follow your teams.')}</h2>
            </div>
            <div className={styles.joinThousandsGamersBottom}>
              <div className={styles.joinThousandsGamersTextContainer}>
                <p>{tt('landing.joinBody', 'A free account is all it takes. Organisers run their tournaments and events from the same account.')}</p>
              </div>
              <div className={styles.joinActions}>
                {viewer.signedIn ? (
                  <Link href="/home" className="btn redBTN">{tt('landing.openApp', 'Go to my V-ENT')}</Link>
                ) : !viewer.loading && (
                  <>
                    <Link href="/signup" className="btn redBTN">{tt('landing.createAccount', 'Create a free account')}</Link>
                    <Link href="/tournaments" className={`btn ${styles.quietBtn}`}>{tt('landing.browse', 'Browse tournaments')}</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>;
};
export default JoinThousandsGamers;
