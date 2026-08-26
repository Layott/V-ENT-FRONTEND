'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './verify-email.module.css';
import CircularProgress from '@mui/material/CircularProgress';
import MessageSnackbar from '../../components/Snackbar/MessageSnackbar';
import { VENT } from '@/app/api/auth/[...nextauth]/route';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const VerifyEmail = () => {
  const tx = useTx();
  const tt = useT();
  const [resendLoading, setResendLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const handleResend = async () => {
    setResendLoading(true);
    const storedSignupData = JSON.parse(localStorage.getItem('signupData'));
    if (!storedSignupData) {
      setSnackbarMessage(tt("msg.noSignupDataFoundPlease", "No signup data found. Please try signing up again."));
      setSnackbarType('error');
      setOpen(true);
      setResendLoading(false);
      return;
    }
    try {
      const response = await fetch(VENT.RESEND_LINK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: storedSignupData.email
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSnackbarMessage(data.message || tt("api.verificationEmailSent", "Verification email sent!"));
        setSnackbarType('success');
      } else {
        setSnackbarMessage(data.error || tt("msg.failedToResendVerification", "Failed to resend verification email."));
        setSnackbarType('error');
      }
    } catch (error) {
      setSnackbarMessage(tt("msg.anErrorOccurredPleaseTry", "An error occurred. Please try again."));
      setSnackbarType('error');
    } finally {
      setOpen(true);
      setResendLoading(false);
    }
  };
  const handleCloseSnackbar = () => {
    setOpen(false);
  };
  return <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <span className={styles.wordmark}>v-ent</span>
      </header>

      <main className={styles.mainContainer}>
        <h1>{tt("ui.verify.email.84fd", "Verify your email")}</h1>
        <p>{tt("ui.verification.email.has.been.a364", "A verification email has been sent to the provided email. Click on the link in your email to verify your account.")}</p>

        <button className={`btn redBTN ${styles.resendBTN}`} onClick={handleResend} disabled={resendLoading}>
          {resendLoading ? <CircularProgress size={24} sx={{
          color: 'white'
        }} /> : tx("Resend Link")}
        </button> 
      </main>

      <MessageSnackbar open={open} handleClose={handleCloseSnackbar} message={snackbarMessage} type={snackbarType} />
    </div>;
};
export default VerifyEmail;