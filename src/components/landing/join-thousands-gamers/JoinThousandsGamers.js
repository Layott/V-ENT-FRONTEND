"use client";
import joinThousandsGamers from '@/images/join_thousands.jpeg';
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import styles from './join-thousands-gamers.module.css'
import axios from 'axios';
import React, { useState } from 'react';
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar';
import CircularProgress from '@mui/material/CircularProgress';


const JoinThousandsGamers = () => {
    const [email, setEmail] = useState('');
    const [open, setOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState('success');
    const [loading, setLoading] = useState(false);  // Add loading state
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);  // Set loading to true when starting the request

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
        setLoading(false); 
        setOpen(true);
      }
    };
  
    const handleCloseSnackbar = () => {
      setOpen(false); 
    };
  
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
                <p>Don’t miss your chance to be part of something epic!</p>
              </div>
              <div className={styles.joinThousandsGamersInputContainer}>
                <form onSubmit={handleSubmit} className={styles.formContainer}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="">Email Address:</label>
                    <input
                      type="text"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className={`${profileStyles.waitlistBTN} ${landingStyles.waitlistBTN}`}
                    disabled={loading}  // Disable button while loading 
                  >
                    {loading ? <CircularProgress size={12} color="inherit" /> : 'Join the waitlist'}
                  </button>
                </form>
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
  
  export default JoinThousandsGamers;