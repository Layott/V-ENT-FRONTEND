'use client'
import { useState, useEffect } from 'react'
import { FaRegEyeSlash } from "react-icons/fa";
import CircularProgress from '@mui/material/CircularProgress';
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { useRouter } from 'next/navigation';
import PasswordStrength from './passwordStrength';
import MessageSnackbar from '../../components/Snackbar/MessageSnackbar';
import AuthHeader from '@/components/auth-header/AuthHeader';
import generalStyles from "@/styles/auth/auth.module.css"
import { VENT } from '../api/auth/[...nextauth]/route';
import styles from './reset-password.module.css';

const ResetPassword = () => {
    const [showPassword, setShowPassword] = useState(true)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [showError, setShowError] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState('success');
    const router = useRouter();

    const togglePasswordVisibility = () => {
        setShowPassword((prevState) => !prevState)
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        if (name === 'password') setPassword(value)
        if (name === 'confirmPassword') setConfirmPassword(value)
    }

    const handleSubmit = async (e) =>  {
        e.preventDefault(); 
        setShowError(false)
        const email = typeof window !== 'undefined' ? localStorage.getItem('forgotPasswordEmail') : '';
        const ticket = typeof window !== 'undefined' ? localStorage.getItem('resetTicket') : '';

        if (!ticket) {
            setSnackbarMessage('This reset has expired. Start again from Forgot Password.');
            setSnackbarType('error');
            setOpen(true);
            return;
        }

        if (!email) {
            setSnackbarMessage('Email not found. Please try again from the Forgot Password page.');
            setSnackbarType('error');
            setOpen(true);
            return;
        }

        if (password !== confirmPassword){
            setShowError(true);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch (VENT.RESET_PASSWORD, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, new_password: password, ticket }),
            });

            const data = await response.json();

            if (response.ok) {
                setSnackbarMessage(data.message || 'Done!');
                setSnackbarType('success');
                localStorage.removeItem('forgotPasswordEmail');
                localStorage.removeItem('resetTicket');
              } else {
                setSnackbarMessage(data.error || data.message || 'Failed!');
                setSnackbarType('error');
              }
            } catch (error) {
              setSnackbarMessage('An error occurred. Please try again.');
              setSnackbarType('error');
            } finally {
              setOpen(true);
              setResendLoading(false); 
            }

    //     setSnackbarMessage('Password reset successfuly!');
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

    const isPasswordValid = (password) => {
        return (
          password.length >= 8 &&
          /[a-z]/.test(password) &&
          /[A-Z]/.test(password)
        );
      };

    const handleCloseSnackbar = () => setOpen(false);

    return (
        <div className={generalStyles.pageContainer}>
            <header className={generalStyles.pageHeader}>
                <AuthHeader />
            </header>

            <main className={generalStyles.mainContainer}>
                <div className={generalStyles.formContainer}>
                    <section className={generalStyles.formHeader}>
                        <h3 className={generalStyles.formHeaderH3}>Reset password?</h3>
                        <p>Enter your new password</p>
                    </section>

                    <form className={`${generalStyles.generalForm}`} onSubmit={handleSubmit}>

                        <div className={generalStyles.inputGroup}>
                            <label>New Password:</label>
                            <div className={generalStyles.passwordContainer}>
                                <input
                                    type={showPassword ? "password" : "text"}
                                    name="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={handleInputChange}
                                    required
                                />
                                <span
                                    onClick={togglePasswordVisibility}
                                    className={generalStyles.togglePassword}>
                                    {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                                </span>
                            </div>
                            {password && <PasswordStrength password={password} />}
                        </div>

                        <div className={generalStyles.inputGroup}>
                            <label>Confirm Password:</label>
                            <div className={generalStyles.passwordContainer}>
                                <input
                                    type={showPassword ? "password" : "text"}
                                    name="confirmPassword"
                                    placeholder="Confirm your new password"
                                    value={confirmPassword}
                                    onChange={handleInputChange}
                                    required
                                    disabled={!isPasswordValid(password)} 
                                />
                                <span
                                    onClick={togglePasswordVisibility}
                                    className={generalStyles.togglePassword}
                                >
                                    {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                                </span>
                            </div>

                            {showError && (
                                <div className={styles.errorMessageContainer}>
                                    <p className={styles.errorMessage}>Passwords do not match!</p>
                                </div>                            
                            )}
                        </div>

                        <button className={`btn redBTN ${generalStyles.formBTN}`} disabled={loading}>
                            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Reset Password'}
                        </button>
                    </form>
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

export default ResetPassword;
