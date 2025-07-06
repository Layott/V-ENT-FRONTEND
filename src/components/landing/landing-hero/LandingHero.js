"use client";

import axios from 'axios';
import React, { useState } from 'react';
import Image from "next/image"
import Link from 'next/link'
import logoRed from "@/images/logo_mark_red.png"
import topLeftImage from '@/images/top_left.jpeg'
import topRightImage from '@/images/top_right.jpg'
import bottomRightImage from '@/images/bottom_right.jpg'
import bottomLeftImage from '@/images/bottom_left.jpg'
import tunnelPattern from '@/images/tunnel_pattern.svg'
import landingStyles from '@/styles/landing/landing.module.css'
import profileStyles from '@/styles/profile/profile-page.module.css'
import styles from './landing-hero.module.css'
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar';
import CircularProgress from '@mui/material/CircularProgress';

const LandingHero = ({ formRef }) => {
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [loading, setLoading] = useState(false);  // Add loading state

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);  // Start loading

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            setEmail('');
            setSnackbarMessage('Please enter a valid email address');
            setSnackbarType('error');
            setOpen(true);
            setLoading(false);
        return;  
        }

    try {
      const response = await axios.post('https://vermillionent.pythonanywhere.com/auth/add-email-to-waitlist/', { email });
      setSnackbarMessage(response.data.message || 'Successfully joined the waitlist!');
      setSnackbarType('success');
      setEmail('');
    } catch (error) {
      setSnackbarMessage(error.response?.data.message || 'Something went wrong');
      setSnackbarType('error');
      setEmail('');
    } finally {
      setLoading(false);  // End loading
      setOpen(true);
    }
  };

  const handleCloseSnackbar = () => {
    setOpen(false); 
  };
  
  return (
    <div className={styles.landingHeroContainer}>
      <Image src={tunnelPattern} alt="Tunnel Pattern" />

      <div className={styles.innerLandingHeroContainer}>
        <header className={styles.headerContainer}>
          <div className={styles.headerLogoContainer}>
            <Link className={styles.logoLink} href={'/'}>
              <div className={styles.innerLogoContainer}>
                <Image src={logoRed} alt="Logo" width={24} height={25} className={styles.vEntLogo} />
              </div>
              <h1>v-ent</h1>
            </Link>
          </div>

          <div className={styles.authButtonsWrapper}>
            <Link
              href="/login"
              className={`${profileStyles.waitlistBTN} ${styles.signupBTN}`}
            >
              Login
            </Link>

            <Link
              href="/signup"
              className={`${profileStyles.waitlistBTN} ${styles.loginBTN}`}
            >
              Signup
            </Link>
          </div>
        </header>

        <div className={styles.heroContent}>
          <div className={`${styles.heroContentTop}`}>
            <div className={styles.gamingAnimeTribeContainer}>
              <h1>Gaming</h1>
              <h1 className={styles.h1Anime}>Anime</h1>
              <h1 className={styles.h1Tribe}>Tribe</h1>
            </div>
            <div className={styles.heroWelcomeTextContainer}>
              <p>Welcome to V-ENT, the ultimate platform where gaming, anime, and community converge. Whether you&apos;re a competitive esports player, a casual gamer, or an anime enthusiast, V-ENT offers tournaments, a vibrant marketplace, and unique features to help you immerse yourself in what you love most. Connect, compete, and engage in a community built for fans by fans.</p>
              <div className={styles.formContainer} ref={formRef} >
                <form onSubmit={handleSubmit} className={styles.form}>
                  <input
                    type="text"
                    placeholder="Enter your email address"
                    className={styles.inputText}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Link
                    href={'/login'}
                      className={`${profileStyles.waitlistBTN} ${profileStyles.loginBTN}`}
                    >
                    Login
                  </Link>
                </form>
              </div>
            </div>
          </div>

          <div className={styles.heroContentBottom}>
            <div className={styles.topImageContainer}>
              <div className={`${styles.topLeftImageContainer}`}>
                <Image src={topLeftImage} alt="Top Left Image" />
              </div>

              <div className={`${styles.topRightImageContainer}`}>
                <Image src={topRightImage} alt="Top Right Image" />
              </div>
            </div>

            <div className={styles.bottomImageContainer}>
              <div className={`${styles.bottomLeftImageContainer}`}>
                <Image src={bottomLeftImage} alt="Bottom Left Image" />
              </div>

              <div className={`${styles.bottomRightImageContainer}`}>
                <Image src={bottomRightImage} alt="Bottom Right Image" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MessageSnackbar
        open={open}
        handleClose={handleCloseSnackbar}
        message={snackbarMessage}
        type={snackbarType}
      />
    </div>
  );
};

export default LandingHero;
