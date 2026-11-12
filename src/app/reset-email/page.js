"use client";

import { apiMessage } from '@/lib/apiMessage';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VENT } from '@/app/api/auth/[...nextauth]/route';
import AuthHeader from '@/components/auth-header/AuthHeader';
import MessageSnackbar from '../../components/Snackbar/MessageSnackbar';
import generalStyles from "@/styles/auth/auth.module.css";
import styles from './reset-email.module.css';
import useCooldown, { maskEmail } from '@/lib/useCooldown';
import { useT } from '@/i18n/LanguageProvider';
const ResetEmail = () => {
  const tt = useT();
  const router = useRouter();
  const [values, setValues] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef([]);
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const handleChange = (e, index) => {
    const val = e.target.value;
    if (!/^\d?$/.test(val)) return;
    const newValues = [...values];
    newValues[index] = val;
    setValues(newValues);
    if (val && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };
  // Sending the code again.
  //
  // `auth/resend-forgot-password-token/` has existed since the reset flow was
  // written and no screen called it, so somebody whose code never arrived, or
  // who let it expire, had to start the whole flow again from the beginning.
  const [resending, setResending] = useState(false);
  const cooldown = useCooldown(30);
  // The address the code went to, masked, so a typo can be spotted before
  // waiting for a code that is never coming (Apple review P121-5).
  const [sentTo, setSentTo] = useState('');
  useEffect(() => {
    try { setSentTo(maskEmail(localStorage.getItem('forgotPasswordEmail'))); } catch { /* storage refused */ }
  }, []);
  const handleResend = async () => {
    const email = typeof window !== 'undefined'
      ? localStorage.getItem('forgotPasswordEmail') : '';
    if (!email) {
      setSnackbarMessage(tt('msg.emailNotFoundPleaseTry',
        'Email not found. Please try again from the Forgot Password page.'));
      setSnackbarType('error');
      setOpen(true);
      return;
    }
    setResending(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-forgot-password-token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSnackbarMessage(tt('reset.codeResent', 'A new code is on its way to your email.'));
        cooldown.start();
        setSnackbarType('success');
      } else {
        setSnackbarMessage(apiMessage(tt, data, 'api.couldNotResendCode',
          'That code could not be sent again. Try once more in a moment.'));
        setSnackbarType('error');
      }
    } catch {
      setSnackbarMessage(tt('api.couldNotResendCode',
        'That code could not be sent again. Try once more in a moment.'));
      setSnackbarType('error');
    } finally {
      setOpen(true);
      setResending(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const token = values.join('');
    const email = typeof window !== 'undefined' ? localStorage.getItem('forgotPasswordEmail') : '';
    if (!email) {
      setSnackbarMessage(tt("msg.emailNotFoundPleaseTry", "Email not found. Please try again from the Forgot Password page."));
      setSnackbarType('error');
      setOpen(true);
      return;
    }
    if (token.length !== 6) {
      setSnackbarMessage(tt("msg.pleaseEnterADigitToken", "Please enter a 6-digit token"));
      setSnackbarType('error');
      setOpen(true);
      return;
    }
    try {
      const response = await fetch(VENT.FORGOT_PASSWORD_TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          token
        })
      });
      const data = await response.json();
      if (response.ok) {
        // The ticket is what proves, on the next screen, that this code was
        // entered correctly. Without it the server refuses the change, so a
        // stranger who only knows an email address can do nothing.
        if (data.ticket) {
          localStorage.setItem('resetTicket', data.ticket);
        }
        setSnackbarMessage(tt("msg.tokenVerifiedSuccessfully", "Token verified successfully"));
        setSnackbarType('success');
        setOpen(true);
      } else {
        setSnackbarMessage(apiMessage(tt, data, "api.invalidToken", "Invalid token"));
        setSnackbarType('error');
        setOpen(true);
      }
    } catch (error) {
      setSnackbarMessage(tt("msg.somethingWentWrongPleaseTry", "Something went wrong. Please try again."));
      setSnackbarType('error');
      setOpen(true);
    }

    // setSnackbarMessage(`Token submitted: ${token}  Successful`);
    // setSnackbarType('success');
    // setOpen(true);
  };
  useEffect(() => {
    if (open && snackbarType === 'success') {
      const timer = setTimeout(() => {
        router.push('/reset-password');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [open, snackbarType, router]);
  const handleCloseSnackbar = () => setOpen(false);
  return <div className={generalStyles.pageContainer}>
        <header className={generalStyles.pageHeader}>
            <AuthHeader />
        </header>

        <main className={generalStyles.mainContainer}>
          <div className={generalStyles.formContainer}>
            <section className={generalStyles.formHeader}>
            <h1 className={generalStyles.formHeading}>{tt("ui.check.email.fab9", "Check your email")}</h1>
            <p>{sentTo
              ? tt('reset.codeSentTo', 'We just sent a 6-digit code to {email}.').replace('{email}', sentTo)
              : tt("reset.codeSent", "We just sent a 6-digit code to your email address.")}</p>
            <p>{tt("ui.enter.digit.code.reset.f571", "Enter the 6-digit code to reset your password")}</p>
            </section>
            {/* method="post" is not there to be used - onSubmit handles the
                request. It is there because a form defaults to GET, and a
                submit that lands before React has hydrated puts whatever was
                typed into the URL. On these pages that means a password in the
                address bar, in history, and in any referrer. */}

          <form method="post" className={generalStyles.resetForm} onSubmit={handleSubmit}>
          <div className={generalStyles.pinForm}>
            {values.map((val, i) => <input className={styles.codeBox} key={i} type="text" inputMode="numeric" maxLength="1" value={val} onChange={e => handleChange(e, i)} onKeyDown={e => handleKeyDown(e, i)} ref={el => inputsRef.current[i] = el} />)}
          </div>
          <br />
          {/* Nothing to check until all six digits are in (Apple review P121-2). */}
          <button type="submit" className={`btn redBTN ${generalStyles.formBTN}`} disabled={values.join('').length < 6}>
            {tt('resetEmail.checkCode', 'Check the code')}
          </button>

          <button type="button" className={generalStyles.resendBtn}
            onClick={handleResend} disabled={resending || cooldown.waiting}>
            {resending
              ? tt('reset.resending', 'Sending...')
              : cooldown.waiting
                ? tt('reset.resendIn', 'You can send a new code in {n} seconds').replace('{n}', String(cooldown.left))
                : tt('reset.resendCode', 'Send the code again')}
          </button>

          </form>
              {/* This used to read "Didn't get the code? Resend Code" and
                  link back to /forgot-password, which resends nothing: it
                  makes somebody type the address they just typed. Resending
                  is the button above now, so this link says what it is
                  really for, which is correcting a wrong address. Two
                  controls for one job, one of which does not do it, is
                  worse than one. */}
              <div className={generalStyles.formHelperContainer}>
                  <p>{tt('reset.wrongAddress', 'Wrong email address?')} <Link href={'/forgot-password'}>{tt('reset.startAgain', 'Start again')}</Link></p>
              </div>

              <div className={generalStyles.formHelperContainer}>
                  <p>{tt("ui.remember.password.62ad", "Remember password?")} <Link href={'/login'}>{tt("ui.login.4e5a", "Log in")}</Link></p>
              </div>
          </div>
        </main>

        <MessageSnackbar open={open} handleClose={handleCloseSnackbar} message={snackbarMessage} type={snackbarType} />
    </div>;
};
export default ResetEmail;