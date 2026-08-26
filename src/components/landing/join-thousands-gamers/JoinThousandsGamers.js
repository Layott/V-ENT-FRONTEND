"use client";

import { apiMessage } from '@/lib/apiMessage';
import joinThousandsGamers from '@/images/join_thousands.jpeg';
import profileStyles from '@/styles/profile/profile-page.module.css';
import landingStyles from '@/styles/landing/landing.module.css';
import styles from './join-thousands-gamers.module.css';
import axios from 'axios';
import React, { useState } from 'react';
import Link from 'next/link';
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar';
import CircularProgress from '@mui/material/CircularProgress';
import { useT } from '@/i18n/LanguageProvider';
const JoinThousandsGamers = () => {
  const tt = useT();
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [loading, setLoading] = useState(false); // Add loading state

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); // Set loading to true when starting the request

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmail('');
      setSnackbarMessage(tt("msg.pleaseEnterAValidEmail", "Please enter a valid email address"));
      setSnackbarType('error');
      setOpen(true);
      setLoading(false);
      return;
    }
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/add-email-to-waitlist/`, {
        email
      });
      setSnackbarMessage(apiMessage(tt, response.data, "api.successfullyJoinedTheWaitlist", "Successfully joined the waitlist!"));
      setSnackbarType('success');
      setEmail('');
    } catch (error) {
      setSnackbarMessage(apiMessage(tt, error.response.data, "api.somethingWentWrong", "Something went wrong"));
      setSnackbarType('error');
      setEmail('');
    } finally {
      setLoading(false);
      setOpen(true);
    }
  };
  const handleCloseSnackbar = () => {
    setOpen(false);
  };
  return <div className={`${landingStyles.joinThousandsGamersContainer} ${styles.joinThousandsGamersContainer}`}>
        <div className={styles.innerJoinThousandsGamersContainer} style={{
      backgroundImage: `url(${joinThousandsGamers.src})`,
      backgroundSize: 'cover',
      backgroundColor: 'rgba(0, 0, 0, 1)'
    }}>
          <div className={styles.joinThousandsGamersContent}>
            <div className={styles.joinThousandsGamersTop}>
              <h2>
                {tt("ui.join.thousands.gamers.anime.f79d", "Join thousands of gamers and anime fans waiting for the ultimate platform launch.")}
              </h2>
            </div>
            <div className={styles.joinThousandsGamersBottom}>
              <div className={styles.joinThousandsGamersTextContainer}>
                <p>{tt("ui.don.t.miss.chance.b54e", "Don’t miss your chance to be part of something epic!")}</p>
              </div>
              <div className={styles.joinThousandsGamersInputContainer}>
                <form onSubmit={handleSubmit} className={styles.formContainer}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="">{tt("ui.email.address.852c", "Email Address:")}</label>
                    <input type="text" placeholder={tt("ui.enter.email.address.c099", "Enter your email address")} value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <Link href={'/signup'} className={`${profileStyles.waitlistBTN} ${profileStyles.loginBTN}`}>
                    {tt("ui.signup.894b", "Signup")}
                  </Link>
                </form>
              </div>
            </div>
          </div>
        </div>
        <MessageSnackbar open={open} handleClose={handleCloseSnackbar} message={snackbarMessage} type={snackbarType} />
      </div>;
};
export default JoinThousandsGamers;