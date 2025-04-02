'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './verify-email.module.css';
import CircularProgress from '@mui/material/CircularProgress';
import MessageSnackbar from '../../components/Snackbar/MessageSnackbar';
import { VENT } from '@/app/api/auth/[...nextauth]/route';

const VerifyEmail = () => {
  const [resendLoading, setResendLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');


  const handleResend = async () => {
    setResendLoading(true); 

    const storedSignupData = JSON.parse(localStorage.getItem('signupData'));

    if (!storedSignupData) {
      setSnackbarMessage('No signup data found. Please try signing up again.');
      setSnackbarType('error');
      setOpen(true);
      setResendLoading(false); 
      return;
    }

    try {
      const response = await fetch(VENT.SIGNUP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: storedSignupData.email }), 
      });

      const data = await response.json();

      if (response.ok) {
        setSnackbarMessage(data.message || 'Verification email sent!');
        setSnackbarType('success');
      } else {
        setSnackbarMessage(data.error || 'Failed to resend verification email.');
        setSnackbarType('error');
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      setSnackbarMessage('An error occurred. Please try again.');
      setSnackbarType('error');
    } finally {
      setOpen(true);
      setResendLoading(false); 
    }
  };


  const handleCloseSnackbar = () => {
    setOpen(false);
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>v-ent</h1>
      </header>

      <main className={styles.mainContainer}>
        <h3>Verify your email</h3>
        <p>A verification email has been sent to the provided email. Click on the link in your email to verify your account.</p>

        <button
          className={`btn redBTN ${styles.resendBTN}`}
          onClick={handleResend}
          disabled={resendLoading} 
          >
          {resendLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Resend Link'}
        </button> 
      </main>

      <MessageSnackbar
        open={open}
        handleClose={handleCloseSnackbar}
        message={snackbarMessage}
        type={snackbarType}
      />
    </div>
  );
};

export default VerifyEmail;
