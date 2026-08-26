'use client';

import { apiMessage } from '@/lib/apiMessage';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './email-verified.module.css';
import CircularProgress from '@mui/material/CircularProgress';
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar';
import { VENT } from '@/app/api/auth/[...nextauth]/route';
import { VENTT } from '@/constants/vent';
import { signOut } from "next-auth/react";
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const EmailVerified = () => {
  const tx = useTx();
  const tt = useT();
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
      setSnackbarMessage(tt("msg.invalidVerificationLinkFormat", "Invalid verification link format."));
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
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok) {
        setVerificationStatus('success');
      } else {
        setVerificationStatus('error');
        setSnackbarMessage(apiMessage(tt, data, "api.verificationFailed", "Verification failed."));
        setSnackbarType('error');
        setOpen(true);
      }
    } catch (error) {
      setVerificationStatus('error');
      setSnackbarMessage(tt("msg.anErrorOccurredPleaseTry", "An error occurred. Please try again."));
      setSnackbarType('error');
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };
  const handleAction = async () => {
    await signOut({
      redirect: false
    });
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
        setSnackbarMessage(apiMessage(tt, data, "api.verificationEmailSent", "Verification email sent!"));
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
      setResendLoadingg(false);
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
        {verificationStatus === "success" && <>
            <h1>{tt("ui.email.verified.successfully.26d2", "Email Verified Successfully")}</h1>
            <p>{tt("ui.email.has.been.successfully.23f3", "Your email has been successfully verified.")}</p>
            <p>{tt("ui.can.now.proceed.2c08", "You can now proceed.")}</p>

            <button className={`btn goldBTN ${styles.resendBTN}`} onClick={handleAction} disabled={resendLoading}>
              {resendLoading ? <CircularProgress size={20} sx={{
            color: 'green'
          }} /> : 'Continue'}
            </button>
          </>}

        {verificationStatus === "error" && <>
            <h1>{tt("ui.verification.link.expired.52d7", "Verification Link Expired")}</h1>
            <p>{tt("ui.click.button.receive.new.2c79", "Click the button to receive a new verification link.")}</p>

            <button className={`btn redBTN ${styles.resendBTN}`} onClick={handleResend} disabled={resendLoadingg}>
              {resendLoadingg ? <CircularProgress size={24} sx={{
            color: 'red'
          }} /> : tx("Resend Verification Link")}
            </button>
          </>}
      </main>
      <MessageSnackbar open={open} handleClose={handleCloseSnackbar} message={snackbarMessage} type={snackbarType} />
    </div>;
};
export default EmailVerified;