'use client'
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { VENT } from '@/app/api/auth/[...nextauth]/route';
import MessageSnackbar from '../../components/Snackbar/MessageSnackbar'
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter, useSearchParams } from 'next/navigation';
import generalStyles from "@/styles/auth/auth.module.css"

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState('success');
    const router = useRouter();
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
                if (typeof window !== 'undefined') {
                    localStorage.setItem('forgotPasswordEmail', email);
                }

                setSnackbarMessage(data.message);
                setSnackbarType('success');
                 await signOut({ redirect: false });
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
        <div className={generalStyles.pageContainer}>
            <header className={generalStyles.pageHeader}>
                <h1>v-ent</h1>
            </header>

            <main className={generalStyles.mainContainer}>
                <div className={generalStyles.formContainer}>
                    <section className={generalStyles.formHeader}>
                        <h3 className={generalStyles.formHeaderH3}>Forgot your password?</h3>
                        <p>Enter the email address associated with your account.</p>
                    </section>

                    <form className={generalStyles.generalForm} onSubmit={handleSubmit}>
                        <div className={generalStyles.inputGroup}>
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
                            className={`btn redBTN ${generalStyles.formBTN}`} 
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className={generalStyles.formHelperContainer}>
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
