'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { VENT } from '@/app/api/auth/[...nextauth]/route';
import MessageSnackbar from '../../components/Snackbar/MessageSnackbar';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter, useSearchParams } from 'next/navigation';
import generalStyles from "@/styles/auth/auth.module.css";
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const ForgotPassword = () => {
  const tx = useTx();
  const tt = useT();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const [emailError, setEmailError] = useState('');
  const router = useRouter();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  // const { data: session } = useSession();
  // const searchParams = useSearchParams();
  // const cameFromEditProfile = searchParams?.get('from') === 'edit-profile';

  // useEffect(() => {
  //     //if the user is authenticated and did'nt come from the edit profile page, redirect to the home pagge
  //     if (session && ! cameFromEditProfile) {
  //         router.push('/user-profile');
  //     }
  // }, [session, router, cameFromEditProfile])

  //     useEffect(() => {
  //   const isFromEditProfile = searchParams?.get("from") === "edit-profile";

  //   // If user is authenticated and came from edit profile, sign them out to avoid redirect loop
  //   if (session && isFromEditProfile) {
  //     // signOut({ redirect: false });
  //   }
  // }, [session, searchParams]);

  const handleInputChange = e => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!emailRegex.test(email.trim())) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError('');
    setLoading(true);
    try {
      const response = await fetch(VENT.FORGOT_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email
        })
      });
      const data = await response.json();
      if (response.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('forgotPasswordEmail', email);
        }
        setSnackbarMessage(data.message);
        setSnackbarType('success');
        await signOut({
          redirect: false
        });
        router.push('/reset-email');
      } else {
        setSnackbarMessage(data.message);
        setSnackbarType('error');
      }
      setOpen(true);
    } catch (error) {
      setSnackbarMessage(tt("msg.anErrorOccurredPleaseTry", "An error occurred. Please try again."));
      setSnackbarType('error');
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };
  const handleCloseSnackbar = () => {
    setOpen(false);
  };
  return <div className={generalStyles.pageContainer}>
            <header className={generalStyles.pageHeader}>
                <span className={generalStyles.wordmark}>v-ent</span>
            </header>

            <main className={generalStyles.mainContainer}>
                <div className={generalStyles.formContainer}>
                    <section className={generalStyles.formHeader}>
                        <h1 className={generalStyles.formHeading}>{tt("ui.forgot.password.a2f0", "Forgot your password?")}</h1>
                        <p>{tt("ui.enter.email.address.associated.7977", "Enter the email address associated with your account.")}</p>
                    </section>
            {/* method="post" is not there to be used - onSubmit handles the
                request. It is there because a form defaults to GET, and a
                submit that lands before React has hydrated puts whatever was
                typed into the URL. On these pages that means a password in the
                address bar, in history, and in any referrer. */}

                    <form method="post" className={generalStyles.generalForm} onSubmit={handleSubmit}>
                        <div className={generalStyles.inputGroup}>
                            <label>{tt("ui.email.address.852c", "Email Address:")}</label>
                            <input type="email" placeholder={tt("ui.enter.email.address.c099", "Enter your email address")} value={email} onChange={handleInputChange} required />
                            {emailError && <p className={generalStyles.errorMessage}>{emailError}</p>}
                        </div>
    
                        <button type="submit" className={`btn redBTN ${generalStyles.formBTN}`} disabled={loading}>
                            {loading ? <CircularProgress size={24} sx={{
              color: 'white'
            }} /> : tx("Send Reset Link")}
                        </button>
                    </form>

                    <div className={generalStyles.formHelperContainer}>
                        <p>{tt("ui.remember.password.62ad", "Remember password?")} </p>
                        <Link href={'/login'}>{tt("ui.login.4e5a", "Login")}</Link>
                    </div>

                </div>

            </main>

            <MessageSnackbar open={open} handleClose={handleCloseSnackbar} message={snackbarMessage} type={snackbarType} />
        </div>;
};
export default ForgotPassword;