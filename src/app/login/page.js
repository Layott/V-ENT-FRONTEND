    'use client'
    import { useState } from 'react'
    import Link from 'next/link'
    import Image from 'next/image'
    import googleLogo from '../../../public/images/google.svg'
    import facebookLogo from '../../../public/images/facebook.svg'
    import { MdOutlineRemoveRedEye } from "react-icons/md";
    import { FaRegEyeSlash } from "react-icons/fa";
    import { signIn } from 'next-auth/react'; 
    import CircularProgress from '@mui/material/CircularProgress'; 
    import { useRouter } from 'next/navigation';
    import MessageSnackbar from '../../components/Snackbar/MessageSnackbar'; 
    import generalStyles from "@/styles/auth/auth.module.css"
    import styles from './login.module.css'
    import { VENT } from '@/app/api/auth/[...nextauth]/route';

    const Login = () => {
        const [showPassword, setShowPassword] = useState(true)
        const [username_or_email, setEmailOrUsername] = useState('')
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
            if (name === 'username_or_email') setEmailOrUsername(value)
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
                    body: JSON.stringify({ username_or_email, password }),
                })
        
                const data = await response.json()
        
                if (response.ok) {
                    localStorage.setItem('session_token', data.session_token);
                    localStorage.setItem('user_id', data.user_id);
                    router.replace('/profile')
                    
                    setSnackbarMessage(data.message || 'Login successful!')
                    setSnackbarType('success')
                    setOpen(true)
        
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
            setLoading(true);
            try {
                const result = await signIn(provider, { redirect: false });
                if (result.error) {
                    setSnackbarMessage('Failed to log in with ' + provider);
                    setSnackbarType('error');
                    setOpen(true);
                } else {
                    router.replace('/'); 
                }
            } catch (error) {
                // setSnackbarMessage(`An error occurred with ${provider} sign-in.`);
                setSnackbarType('error');
                // setOpen(true);
            } finally {
                setLoading(false);
            } 
        };

        const handleCloseSnackbar = () => {
            setOpen(false)
        }

        return (
            <div className={generalStyles.pageContainer}>
                <header className={generalStyles.pageHeader}>
                    <h1>v-ent</h1>
                </header>

                <main className={generalStyles.mainContainer}>
                    <div className={generalStyles.formContainer}>
                        <section className={generalStyles.formHeader}>
                            <h3 className={generalStyles.formHeaderH3}>Welcome Back</h3>
                            <p>Please sign into your account</p>
                        </section>

                        <form className={`${generalStyles.generalForm} ${styles.loginForm}`} onSubmit={handleSubmit}>
                            <div className={generalStyles.inputGroup}>
                                <label>Email or Username:</label>
                                <input
                                    type="text"
                                    name="username_or_email"
                                    placeholder="Enter your email address or username"
                                    value={username_or_email}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className={generalStyles.inputGroup}>
                                <label>Password:</label>
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
                                        className={generalStyles.togglePassword}
                                    >
                                        {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                                    </span>
                                </div>
                            </div>

                            <Link href={'/forgot-password'}>Forgot password?</Link>

                            <button className={`btn redBTN ${generalStyles.formBTN}`} disabled={loading}>
                                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Login'}
                            </button>
                        </form>

                        <div className={generalStyles.alternativeAuthContainer}>
                            <p>Or sign in with</p>
                            <div className={generalStyles.logoContainer}>
                                <Image
                                    src={googleLogo}
                                    alt="Google Logo"
                                    className={`${styles.googleLogo} ${generalStyles.authLogo}`}
                                    onClick={() => handleOAuthSignIn('google')}
                                />
                                <Image
                                    src={facebookLogo}
                                    alt="Facebook Logo"
                                    className={`${styles.facebookLogo} ${generalStyles.authLogo}`}
                                    onClick={() => handleOAuthSignIn('facebook')}
                                />
                            </div>
                        </div>

                        <div className={generalStyles.formHelperContainer}>
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
