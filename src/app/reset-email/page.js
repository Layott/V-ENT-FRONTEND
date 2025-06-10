"use client";

import { useState, useRef, useEffect, } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VENT } from '@/app/api/auth/[...nextauth]/route';
import AuthHeader from '@/components/auth-header/AuthHeader'
import MessageSnackbar from '../../components/Snackbar/MessageSnackbar';
import generalStyles from "@/styles/auth/auth.module.css"

const ResetEmail = () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = values.join('');
    const email = typeof window !== 'undefined' ? localStorage.getItem('forgotPasswordEmail') : '';

    if (!email) {
      setSnackbarMessage('Email not found. Please try again from the Forgot Password page.');
      setSnackbarType('error');
      setOpen(true);
      return;
    }

    if (token.length !== 6) {
      setSnackbarMessage('Please enter a 6-digit token');
      setSnackbarType('error');
      setOpen(true);
      return;
    }

    try {
      const response = await fetch(VENT.FORGOT_PASSWORD_TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        setSnackbarMessage('Token verified successfully');
        setSnackbarType('success');
        setOpen(true);
      } else {
        setSnackbarMessage(data.message || 'Invalid token');
        setSnackbarType('error');
        setOpen(true);
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      setSnackbarMessage('Something went wrong. Please try again.');
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

    return (
    <div className={generalStyles.pageContainer}>
        <header className={generalStyles.pageHeader}>
            <AuthHeader />
        </header>

        <main className={generalStyles.mainContainer}>
          <div className={generalStyles.formContainer}>
            <section className={generalStyles.formHeader}>
            <h3 className={generalStyles.formHeaderH3}>Check your email</h3>
            <p>We just sent you a link to your email address.</p>
            <p>Enter the 6-digit code to reset your password</p>
            </section>

          <form className={generalStyles.resetForm} onSubmit={handleSubmit}>
          <div className={generalStyles.pinForm}>
            {values.map((val, i) => (
              <input
                className={generalStyles.pinInputStyle}
                key={i}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={val}
                onChange={(e) => handleChange(e, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                ref={(el) => (inputsRef.current[i] = el)}
              />
            ))}
          </div>
          <br />
          <button
            type="submit"
            className={`btn redBTN ${generalStyles.formBTN}`}
          >
            Submit
          </button>

          </form>
              <div className={generalStyles.formHelperContainer}>
                  <p>Didn&apos;t get the code?&nbsp;<Link href={'/forgot-password'}>Resend Code</Link></p>
              </div>

              <div className={generalStyles.formHelperContainer}>
                  <p>Remember password?&nbsp;<Link href={'/login'}>Login</Link></p>
              </div>
          </div>
        </main>

        <MessageSnackbar
                open={open}
                handleClose={handleCloseSnackbar}
                message={snackbarMessage}
                type={snackbarType}
            />
    </div>
  )
}

export default ResetEmail