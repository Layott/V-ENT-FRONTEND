'use client'
import { useState } from 'react';
import Link from 'next/link';
import { VENT } from '@/app/api/auth/route';
import styles from './forgot-password.module.css';
import MessageSnackbar from '../../components/Snackbar/MessageSnackbar'
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter } from 'next/navigation';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState('success');
    const router = useRouter();

    const handleInputChange = (e) => {
        setEmail(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(VENT.FORGOT_PASSWORD, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSnackbarMessage(data.message);
                setSnackbarType('success');
                router.push('/reset-email');
            } else {
                setSnackbarMessage(data.message);
                setSnackbarType('error');
            }
            setOpen(true);
        } catch (error) {
            console.error('Error during forgot password request:', error);
            setSnackbarMessage('An error occurred. Please try again.');
            setSnackbarType('error');
            setOpen(true);
        } finally {
            setLoading(false);
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
                <div className={styles.formContainer}>
                    <section className={styles.formHeader}>
                        <h3>Forgot your password?</h3>
                        <p>Enter the email address associated with your account.</p>
                    </section>

                    <form className={styles.forgotPasswordForm} onSubmit={handleSubmit}>
                        <div className={styles.inputGroup}>
                            <label>Email Address:</label>
                            <input
                                type="email"
                                placeholder="Enter your email address"
                                value={email}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
    
                        <button 
                            type="submit" 
                            className={`btn redBTN ${styles.sendResetLinkBTN}`} 
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className={styles.rememberPassword}>
                        <p>Remember password?&nbsp;</p>
                        <Link href={'/login'}>Login</Link>
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
    );
};

export default ForgotPassword;
