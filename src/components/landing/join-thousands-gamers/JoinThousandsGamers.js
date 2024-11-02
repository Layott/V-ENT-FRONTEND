import joinThousandsGamers from '@/images/join_thousands.jpeg';
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import styles from './join-thousands-gamers.module.css'
import React from 'react'

const JoinThousandsGamers = () => {
  return (
    <div className={`${landingStyles.joinThousandsGamersContainer} ${styles.joinThousandsGamersContainer}`}>
        <div
            className={styles.innerJoinThousandsGamersContainer}
            style={{
                backgroundImage: `url(${joinThousandsGamers.src})`,
                backgroundSize: 'cover',
                backgroundColor: 'rgba(0, 0, 0, 1)'
            }}
        >
            <div className={styles.joinThousandsGamersContent}>
                <div className={styles.joinThousandsGamersTop}>
                    <h1>
                        Join thousands of gamers and anime fans waiting for the ultimate platform launch.
                    </h1>
                </div>
                <div className={styles.joinThousandsGamersBottom}>
                    <div className={styles.joinThousandsGamersTextContainer}>
                        <p>
                        Don’t miss your chance to be part of something epic!
                        </p>
                    </div>
                    <div className={styles.joinThousandsGamersInputContainer}>
                        <form action="" className={styles.formContainer}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="">Email Address:</label>
                                <input type="text" placeholder='Enter your email address' />
                            </div>
                            <button
                                type='submit'
                                className={`${profileStyles.waitlistBTN} ${landingStyles.waitlistBTN}`}
                            >
                                Join the waitlist
                            </button>
                        </form>
                    </div>
                </div>
            </div>

        </div>
    </div>
  )
}

export default JoinThousandsGamers