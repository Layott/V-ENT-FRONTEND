'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './email-verified.module.css';
import CircularProgress from '@mui/material/CircularProgress';
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar';
import { VENT } from '@/app/api/auth/[...nextauth]/route';
import { VENTT } from '@/constants/vent';
import { signOut } from "next-auth/react";

const EmailVerified = () => {
  const params = useParams(); 
  const router = useRouter();
  const key = params?.key;
  const value = params?.value;

  

  const [resendLoading, setResendLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [resendLoadingg, setResendLoadingg] = useState(false);
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');

  
  
  useEffect(() => {
    // For a route like /email-verified/1234/abcd
    const keys = Object.values(params);
    if (keys.length === 2) {
      verifyToken(keys[0], keys[1]);
    } else {
      setVerificationStatus('error');
      setSnackbarMessage('Invalid verification link format.');
      setSnackbarType('error');
      setOpen(true);
    }
  }, [params]);

  const verifyToken = async (key, value) => {
    setLoading(true);
    try {
      const response = await fetch(`${VENTT.EMAIL_VERIFICATION}/${key}/${value}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

     if (response.ok) {
      setVerificationStatus('success');
    } else {
      setVerificationStatus('error');
      setSnackbarMessage(data.message || 'Verification failed.');
      setSnackbarType('error');
      setOpen(true);
    }
  } catch (error) {
    setVerificationStatus('error');
    setSnackbarMessage('An error occurred. Please try again.');
    setSnackbarType('error');
    setOpen(true);
  } finally {
    setLoading(false);
  }
};

  const handleAction = async () => {
    await signOut({ redirect: false });
    if (verificationStatus === 'success') {
      router.push('/login');
    } else {
      router.push('/verify-email');
    }
  };

  const handleResend = async () => {
    setResendLoadingg(true); 

    const raw = localStorage.getItem('signupData');
    const storedSignupData = raw ? JSON.parse(raw) : null;

    if (!storedSignupData) {
      setSnackbarMessage('No signup data found. Please try signing up again.');
      setSnackbarType('error');
      setOpen(true);
      setResendLoading(false); 
      return;
    }

    try {
      const response = await fetch(VENT.RESEND_LINK, {
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
      setSnackbarMessage('An error occurred. Please try again.');
      setSnackbarType('error');
    } finally {
      setOpen(true);
      setResendLoadingg(false);
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
        {verificationStatus === "success" && (
          <>
            <h3>Email Verified Successfully</h3>
            <p>Your email has been successfully verified.</p>
            <p>You can now proceed.</p>

            <button
              className={`btn goldBTN ${styles.resendBTN}`}
              onClick={handleAction}
              disabled={resendLoading}
            >
              {resendLoading ? <CircularProgress size={20} sx={{ color: 'green' }} /> : 'Continue'}
            </button>
          </>
        )}

        {verificationStatus === "error" && (
          <>
            <h3>Verification Link Expired</h3>
            <p>Click the button to receive a new verification link.</p>

            <button
              className={`btn redBTN ${styles.resendBTN}`}
              onClick={handleResend}
              disabled={resendLoadingg}
            >
              {resendLoadingg ? <CircularProgress size={24} sx={{ color: 'red' }} /> : 'Resend Verification Link'}
            </button>
          </>
        )}
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

export default EmailVerified;


 

