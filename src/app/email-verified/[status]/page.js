'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './email-verified.module.css';
import CircularProgress from '@mui/material/CircularProgress';
import MessageSnackbar from '../../../components/Snackbar/MessageSnackbar';
import { VENT } from '@/app/api/auth/[...nextauth]/route';

const EmailVerified = () => {
  const { status } = useParams(); 
  const router = useRouter();

  const token = status && status.length >= 5 ? status[4] : null;

  const [resendLoading, setResendLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [resendLoadingg, setResendLoadingg] = useState(false);
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');

  
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (token) => {
    try {
      const response = await fetch('', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationStatus("success");
      } else {
        setVerificationStatus("error");
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      setVerificationStatus("success");
    }
  };

  const handleAction = () => {
    setResendLoading(true);

    setTimeout(() => {
      if (verificationStatus === "success") {
        router.push('/login');
      } else if (verificationStatus === "error") {
        router.push('/verify-email');
      }
    }, 1000);
  };

  const handleResend = async () => {
    setResendLoadingg(true); 

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
              className={`btn grnBTN ${styles.resendBTN}`}
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


 

