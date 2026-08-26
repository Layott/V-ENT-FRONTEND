'use client';

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect } from 'react';
import { FaRegEyeSlash } from "react-icons/fa";
import CircularProgress from '@mui/material/CircularProgress';
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { useRouter } from 'next/navigation';
import PasswordStrength from './passwordStrength';
import MessageSnackbar from '../../components/Snackbar/MessageSnackbar';
import AuthHeader from '@/components/auth-header/AuthHeader';
import generalStyles from "@/styles/auth/auth.module.css";
import { VENT } from '../api/auth/[...nextauth]/route';
import styles from './reset-password.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const ResetPassword = () => {
  const tx = useTx();
  const tt = useT();
  const [showPassword, setShowPassword] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');
  const router = useRouter();
  const togglePasswordVisibility = () => {
    setShowPassword(prevState => !prevState);
  };
  const handleInputChange = e => {
    const {
      name,
      value
    } = e.target;
    if (name === 'password') setPassword(value);
    if (name === 'confirmPassword') setConfirmPassword(value);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setShowError(false);
    const email = typeof window !== 'undefined' ? localStorage.getItem('forgotPasswordEmail') : '';
    const ticket = typeof window !== 'undefined' ? localStorage.getItem('resetTicket') : '';
    if (!ticket) {
      setSnackbarMessage(tt("msg.thisResetHasExpiredStart", "This reset has expired. Start again from Forgot Password."));
      setSnackbarType('error');
      setOpen(true);
      return;
    }
    if (!email) {
      setSnackbarMessage(tt("msg.emailNotFoundPleaseTry", "Email not found. Please try again from the Forgot Password page."));
      setSnackbarType('error');
      setOpen(true);
      return;
    }
    if (password !== confirmPassword) {
      setShowError(true);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(VENT.RESET_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          new_password: password,
          ticket
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSnackbarMessage(apiMessage(tt, data, "api.done", "Done!"));
        setSnackbarType('success');
        localStorage.removeItem('forgotPasswordEmail');
        localStorage.removeItem('resetTicket');
      } else {
        setSnackbarMessage(data.error || apiMessage(tt, data, "api.failed", "Failed!"));
        setSnackbarType('error');
      }
    } catch (error) {
      setSnackbarMessage(tt("msg.anErrorOccurredPleaseTry", "An error occurred. Please try again."));
      setSnackbarType('error');
    } finally {
      setOpen(true);
      setResendLoading(false);
    }

    //     setSnackbarMessage(tt("msg.passwordResetSuccessfuly", "Password reset successfuly!"));
    // setSnackbarType('success');
    // setOpen(true);
  };
  useEffect(() => {
    if (open && snackbarType === 'success') {
      const timer = setTimeout(() => {
        router.push('/login');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [open, snackbarType, router]);
  const isPasswordValid = password => {
    return password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password);
  };
  const handleCloseSnackbar = () => setOpen(false);
  return <div className={generalStyles.pageContainer}>
            <header className={generalStyles.pageHeader}>
                <AuthHeader />
            </header>

            <main className={generalStyles.mainContainer}>
                <div className={generalStyles.formContainer}>
                    <section className={generalStyles.formHeader}>
                        <h1 className={generalStyles.formHeading}>{tt("ui.reset.password.2a11", "Reset password?")}</h1>
                        <p>{tt("ui.enter.new.password.7bec", "Enter your new password")}</p>
                    </section>
            {/* method="post" is not there to be used - onSubmit handles the
                request. It is there because a form defaults to GET, and a
                submit that lands before React has hydrated puts whatever was
                typed into the URL. On these pages that means a password in the
                address bar, in history, and in any referrer. */}

                    <form method="post" className={`${generalStyles.generalForm}`} onSubmit={handleSubmit}>

                        <div className={generalStyles.inputGroup}>
                            <label>{tt("ui.new.password.5353", "New Password:")}</label>
                            <div className={generalStyles.passwordContainer}>
                                <input type={showPassword ? "password" : "text"} name="password" placeholder={tt("ui.enter.password.1378", "Enter your password")} value={password} onChange={handleInputChange} required />
                                <span onClick={togglePasswordVisibility} className={generalStyles.togglePassword}>
                                    {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                                </span>
                            </div>
                            {password && <PasswordStrength password={password} />}
                        </div>

                        <div className={generalStyles.inputGroup}>
                            <label>{tt("ui.confirm.password.7fdb", "Confirm Password:")}</label>
                            <div className={generalStyles.passwordContainer}>
                                <input type={showPassword ? "password" : "text"} name="confirmPassword" placeholder={tt("ui.confirm.new.password.9c2e", "Confirm your new password")} value={confirmPassword} onChange={handleInputChange} required disabled={!isPasswordValid(password)} />
                                <span onClick={togglePasswordVisibility} className={generalStyles.togglePassword}>
                                    {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                                </span>
                            </div>

                            {showError && <div className={styles.errorMessageContainer}>
                                    <p className={styles.errorMessage}>{tt("ui.passwords.do.not.match.e983", "Passwords do not match!")}</p>
                                </div>}
                        </div>

                        <button className={`btn redBTN ${generalStyles.formBTN}`} disabled={loading}>
                            {loading ? <CircularProgress size={24} sx={{
              color: 'white'
            }} /> : tx("Reset Password")}
                        </button>
                    </form>
                </div>
            </main>
            <MessageSnackbar open={open} handleClose={handleCloseSnackbar} message={snackbarMessage} type={snackbarType} />
        </div>;
};
export default ResetPassword;