'use client'
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import googleLogo from '../../../public/images/google.svg';
import facebookLogo from '../../../public/images/facebook.svg';
import { signIn, getSession } from 'next-auth/react';
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa";
import { countries } from './countries';
import PasswordStrength from './passwordStrength';
import { VENT } from '@/app/api/auth/route';
import MessageSnackbar from '../../components/Snackbar/MessageSnackbar';
import CircularProgress from '@mui/material/CircularProgress'; 
import { useRouter } from 'next/navigation';
import generalStyles from "@/styles/auth/auth.module.css"
import styles from './signup.module.css';

const Signup = () => {
    const [open, setOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState('success');
    const [showPassword, setShowPassword] = useState(true);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [password, setPassword] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        email: '',
        country: '',
        password: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const togglePasswordVisibility = () => {
        setShowPassword((prevState) => !prevState);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleCountrySelection = (event) => {
        setSelectedCountry(event.target.value);
        setFormData({ ...formData, country: event.target.value });
    };

    const handlePasswordChange = (e) => {
        const { value } = e.target;
        setPassword(value);
        setFormData({ ...formData, password: value });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setSnackbarMessage("Passwords do not match");
            setSnackbarType('error');
            setOpen(true);
            setLoading(false); 
            return;
        }

        try {
            const response = await fetch(VENT.SIGNUP, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json()

            if (response.ok) {
                setSnackbarMessage(data.message ||'Account created successfully!');
                setSnackbarType('success');
                setOpen(true);
                router.push('/login');
            } else {
                setSnackbarMessage(data.error ||'Failed to create account');
                setSnackbarType('error');
                setOpen(true);
            }
        } catch (error) {
            console.error('Error during signup:', error);
            setSnackbarMessage('An error occurred. Please try again.');
            setSnackbarType('error');
            setOpen(true);
        } finally {
            setLoading(false); 
        }
    };

    const handleOAuthSignUp = async (provider) => {
        try {
            setLoading(true);
            const result = await signIn(provider, { redirect: false });
            if (result?.error) {
                console.error('Error during sign-in:', result.error);
                setSnackbarMessage('Error during sign-in');
                setSnackbarType('error');
                setOpen(true);
            } else {
                const session = await getSession();
                if (session) {
                    const response = await fetch(VENT.SIGNUP, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            token: session.accessToken,
                            provider,
                        }),
                    });
                    if (response.ok) {
                        setSnackbarMessage('Account created successfully!');
                        setSnackbarType('success');
                        setOpen(true);
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 2000);
                    } else {
                        setSnackbarMessage('Failed to sign up with OAuth');
                        setSnackbarType('error');
                        setOpen(true);
                    }
                }
            }
        } catch (error) {
            console.error('Error during OAuth signup:', error);
            setSnackbarMessage('Error during OAuth signup');
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
                        <h3 className={generalStyles.formHeaderH3}>Create an account</h3>
                        <p>Please complete your account details</p>
                    </section>

                    <form className={generalStyles.generalForm} onSubmit={handleFormSubmit}>

                        <div className={generalStyles.inputGroup}>
                            <label>Email Address:</label>
                            <input
                                type="email"
                                name="email"
                                placeholder="Enter your email address"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                            />
                        </div>


                        <div className={generalStyles.inputGroup}>
                            <label>Username:</label>
                            <input
                                type="text"
                                name="username"
                                placeholder="Enter a username"
                                value={formData.username}
                                onChange={handleInputChange}
                                required
                            />
                            <p className={styles.toolTip}>This will be your display name across V-ent, so choose a cool one! (Max. 30 characters)</p>
                        </div>

                        <div className={generalStyles.inputGroup}>
                            <label>Full name:</label>
                            <input
                                type="text"
                                name="fullName"
                                placeholder="Enter your name"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className={generalStyles.inputGroup}>
                            <label>Country:</label>
                            <select
                                value={selectedCountry}
                                onChange={handleCountrySelection}
                                className={styles.countryDropdown}
                                required
                            >
                                <option value="">Select your country</option>
                                {countries.map((country) => (
                                    <option key={country.code} value={country.code}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={generalStyles.inputGroup}>
                            <label>Password:</label>
                            <div className={generalStyles.passwordContainer}>
                                <input
                                    type={showPassword ? "password" : "text"}
                                    name="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={handlePasswordChange}
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
                                    placeholder="Re-enter your password"
                                    value={formData.confirmPassword}
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

                        <button type="submit" className={`btn redBTN ${generalStyles.formBTN}`}>
                            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Create account'}
                        </button>
                        <p className={styles.termsAndPrivacy}>By creating an account, you agree to our&nbsp;
                            <Link href={'/term-of-use'}>Terms of Use</Link>
                            &nbsp;&amp;&nbsp;
                            <Link href={'/privacy-policy'}>Privacy Policy</Link>
                        </p>
                    </form>

                    <div className={generalStyles.alternativeAuthContainer}>
                        <p>Or sign up with</p>
                        <div className={generalStyles.logoContainer}>
                            <Image
                                src={googleLogo}
                                alt="Google Logo"
                                className={`${styles.googleLogo} ${generalStyles.authLogo}`}
                                onClick={() => handleOAuthSignUp('google')}
                            />

                            <Image
                                src={facebookLogo}
                                alt="Facebook Logo"
                                className={`${styles.facebookLogo} ${generalStyles.authLogo}`}
                                onClick={() => handleOAuthSignUp('facebook')}
                            />
                        </div>
                    </div>

                    <div className={generalStyles.formHelperContainer}>
                        <p>Already have an account?&nbsp;</p>
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
}

export default Signup;
