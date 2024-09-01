'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import googleLogo from '../../../public/images/google.svg'
import facebookLogo from '../../../public/images/facebook.svg'
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa";
import styles from './login.module.css'
import { signIn } from 'next-auth/react'; 
import { VENT } from '@/app/api/auth/route';
import MessageSnackbar from '../../components/Snackbar/MessageSnackbar'; 
import CircularProgress from '@mui/material/CircularProgress'; 
import { useRouter } from 'next/navigation';

const Login = () => {
    const [showPassword, setShowPassword] = useState(true)
    const [emailOrUsername, setEmailOrUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [snackbarMessage, setSnackbarMessage] = useState('')
    const [snackbarType, setSnackbarType] = useState('success')
    const router = useRouter();

    const togglePasswordVisibility = () => {
        setShowPassword((prevState) => !prevState)
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        if (name === 'emailOrUsername') setEmailOrUsername(value)
        if (name === 'password') setPassword(value)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch(VENT.LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ emailOrUsername, password }),
            })

            const data = await response.json()

            if (response.ok) {
                setSnackbarMessage(data.message || 'Login successful!')
                setSnackbarType('success')
                setOpen(true)
                router.push('/verify-email');
                
            } else {
                setSnackbarMessage(data.message || 'Failed to log in')
                setSnackbarType('error')
                setOpen(true)
            }
        } catch (error) {
            console.error('Error during login:', error)
            setSnackbarMessage('An error occurred. Please try again.')
            setSnackbarType('error')
            setOpen(true)
        } finally {
            setLoading(false)
        }
    }

    const handleOAuthSignIn = async (provider) => {
        try {
            setLoading(true)
            const result = await signIn(provider, { redirect: false })

            if (result?.error) {
                console.error('Error during sign-in:', result.error)
                setSnackbarMessage(result.error || 'Error during sign-in')
                setSnackbarType('error')
                setOpen(true)
            } else {
                
                setSnackbarMessage('Login successful!')
                setSnackbarType('success')
                setOpen(true)
            }
        } catch (error) {
            console.error('Error during OAuth sign-in:', error)
            setSnackbarMessage('An error occurred. Please try again.')
            setSnackbarType('error')
            setOpen(true)
        } finally {
            setLoading(false)
        }
    }

    const handleCloseSnackbar = () => {
        setOpen(false)
    }

    return (
        <div className={styles.pageContainer}>
            <header className={styles.pageHeader}>
                <h1>v-ent</h1>
            </header>

            <main className={styles.mainContainer}>
                <div className={styles.formContainer}>
                    <section className={styles.formHeader}>
                        <h3>Welcome Back</h3>
                        <p>Please sign into your account</p>
                    </section>

                    <form className={styles.loginForm} onSubmit={handleSubmit}>
                        <div className={styles.inputGroup}>
                            <label>Email or Username:</label>
                            <input
                                type="text"
                                name="emailOrUsername"
                                placeholder="Enter your email address or username"
                                value={emailOrUsername}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Password:</label>
                            <div className={styles.passwordContainer}>
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
                                    className={styles.togglePassword}
                                >
                                    {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                                </span>
                            </div>
                        </div>

                        <Link href={'/forgot-password'}>Forgot password?</Link>

                        <button className={`btn redBTN ${styles.loginBTN}`} disabled={loading}>
                            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Login'}
                        </button>
                    </form>

                    <div className={styles.alternativeLoginContainer}>
                        <p>Or sign in with</p>
                        <div className={styles.logoContainer}>
                            <Image
                                src={googleLogo}
                                alt="Google Logo"
                                className={`${styles.googleLogo} ${styles.signInLogo}`}
                                onClick={() => handleOAuthSignIn('google')}
                            />
                            <Image
                                src={facebookLogo}
                                alt="Facebook Logo"
                                className={`${styles.facebookLogo} ${styles.signInLogo}`}
                                onClick={() => handleOAuthSignIn('facebook')}
                            />
                        </div>
                    </div>

                    <div className={styles.noAccountContainer}>
                        <p>Don&#39;t have an account?&nbsp;</p>
                        <Link href={'/signup'}>Create one</Link>
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

export default Login
