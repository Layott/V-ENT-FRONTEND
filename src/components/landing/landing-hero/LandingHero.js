"use client";

import axios from 'axios';
import React, { useState } from 'react';
import Image from "next/image";
import Link from 'next/link';
import logoRed from "@/images/logo_mark_red.png";
import topLeftImage from '@/images/top_left.jpeg';
import topRightImage from '@/images/top_right.jpg';
import bottomRightImage from '@/images/bottom_right.jpg';
import bottomLeftImage from '@/images/bottom_left.jpg';
import tunnelPattern from '@/images/tunnel_pattern.svg';
import landingStyles from '@/styles/landing/landing.module.css';
import profileStyles from '@/styles/profile/profile-page.module.css';
import styles from './landing-hero.module.css';
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar';
import CircularProgress from '@mui/material/CircularProgress';
import { useT } from '@/i18n/LanguageProvider';
const LandingHero = ({
  formRef
}) => {
  const tt = useT();
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [loading, setLoading] = useState(false); // Add loading state

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); // Start loading

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
      setSnackbarMessage(response.data.message || tt("api.successfullyJoinedTheWaitlist", "Successfully joined the waitlist!"));
      setSnackbarType('success');
      setEmail('');
    } catch (error) {
      setSnackbarMessage(error.response?.data.message || tt("api.somethingWentWrong", "Something went wrong"));
      setSnackbarType('error');
      setEmail('');
    } finally {
      setLoading(false); // End loading
      setOpen(true);
    }
  };
  const handleCloseSnackbar = () => {
    setOpen(false);
  };
  return <div className={styles.landingHeroContainer}>
      <Image src={tunnelPattern} alt="" aria-hidden="true" />

      <div className={styles.innerLandingHeroContainer}>
        <header className={styles.headerContainer}>
          <div className={styles.headerLogoContainer}>
            <Link className={styles.logoLink} href={'/'}>
              <div className={styles.innerLogoContainer}>
                <Image src={logoRed} alt="V-ENT" width={24} height={25} className={styles.vEntLogo} />
              </div>
              <span className={styles.wordmark}>v-ent</span>
            </Link>
          </div>

          <div className={styles.authButtonsWrapper}>
            <Link href="/login" className={`${profileStyles.waitlistBTN} ${styles.signupBTN}`}>
              {tt("ui.login.4e5a", "Login")}
            </Link>

            <Link href="/signup" className={`${profileStyles.waitlistBTN} ${styles.loginBTN}`}>
              {tt("ui.signup.894b", "Signup")}
            </Link>
          </div>
        </header>

        <div className={styles.heroContent}>
          <div className={`${styles.heroContentTop}`}>
            <div className={styles.gamingAnimeTribeContainer}>
              <h1 className={styles.heroHeadline}>
                <span className={styles.headlineWord}>{tt("ui.gaming.c0ec", "Gaming")}</span>
                <span className={`${styles.headlineWord} ${styles.h1Anime}`}>{tt("ui.anime.f1b3", "Anime")}</span>
                <span className={`${styles.headlineWord} ${styles.h1Tribe}`}>{tt("ui.tribe.3b07", "Tribe")}</span>
              </h1>
            </div>
            <div className={styles.heroWelcomeTextContainer}>
              <p>{tt("ui.welcome.v.ent.ultimate.3370", "Welcome to V-ENT, the ultimate platform where gaming, anime, and community converge. Whether you're a competitive esports player, a casual gamer, or an anime enthusiast, V-ENT offers tournaments, a vibrant marketplace, and unique features to help you immerse yourself in what you love most. Connect, compete, and engage in a community built for fans by fans.")}</p>
              {/* <div className={styles.formContainer} ref={formRef} >
                <form onSubmit={handleSubmit} className={styles.form}>
                  <input
                    type="text"
                    placeholder="Enter your email address"
                    className={styles.inputText}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Link
                    href={'/signup'}
                      className={`${profileStyles.waitlistBTN} ${profileStyles.loginBTN}`}
                    >
                    Signup
                  </Link>
                </form>
               </div> */}
            </div>
          </div>

          <div className={styles.heroContentBottom}>
            <div className={styles.topImageContainer}>
              <div className={`${styles.topLeftImageContainer}`}>
                <Image src={topLeftImage} alt={tt("landing.alt.topLeft", "Five players in a gaming lounge stacking their hands together before a match")} />
              </div>

              <div className={`${styles.topRightImageContainer}`}>
                <Image src={topRightImage} alt={tt("landing.alt.topRight", "A player in a headset concentrating on a match at a gaming PC")} />
              </div>
            </div>

            <div className={styles.bottomImageContainer}>
              <div className={`${styles.bottomLeftImageContainer}`}>
                <Image src={bottomLeftImage} alt={tt("landing.alt.bottomLeft", "A row of players at a LAN event, each at a monitor in headsets")} />
              </div>

              <div className={`${styles.bottomRightImageContainer}`}>
                <Image src={bottomRightImage} alt={tt("landing.alt.bottomRight", "Three anime characters in school uniforms, drawn in colour")} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MessageSnackbar open={open} handleClose={handleCloseSnackbar} message={snackbarMessage} type={snackbarType} />
    </div>;
};
export default LandingHero;