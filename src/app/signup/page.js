'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import googleLogo from '../../../public/images/google.svg'
import facebookLogo from '../../../public/images/facebook.svg'
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa";
import styles from './signup.module.css'

const Signup = () => {
    const [showPassword, setShowPassword] = useState(true)

    const togglePasswordVisibility = () => {
        setShowPassword((prevState) => !prevState)
    }

  return (
    <div className={styles.pageContainer}>
        <header className={styles.pageHeader}>
            <h1>v-ent</h1>
        </header>

        <main className={styles.mainContainer}>
            <div className={styles.formContainer}>
                <section className={styles.formHeader}>
                    <h2>Create an account</h2>
                    <p>Please complete your account details</p>
                </section>

                <form className={styles.signUpForm}>
                    <div className={styles.inputGroup}>
                        <label>Username:</label>
                        <input
                            type="text"
                            placeholder="Enter a username"
                        />
                        <p className={styles.toolTip}>This will be your display name across V-ent, so choose a cool one! (Max. 30 characters)</p>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Full name:</label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Email Address:</label>
                        <input
                            type="text"
                            placeholder="Enter your email address"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Country:</label>
                        <input
                            type="text"
                            placeholder="Create a drop down for fetching country"
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Password:</label>
                        <div className={styles.passwordContainer}>
                            <input
                                type={showPassword ? "password" : "text"}
                                placeholder="Enter your password"
                            />

                            <span
                                onClick={togglePasswordVisibility}
                                className={styles.togglePassword}
                            >
                                {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye /> }
                            </span>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Confirm Password:</label>
                        <div className={styles.passwordContainer}>
                            <input
                                type={showPassword ? "password" : "text"}
                                placeholder="Re-enter your password"
                            />

                            <span
                                onClick={togglePasswordVisibility}
                                className={styles.togglePassword}
                            >
                                {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye /> }
                            </span>
                        </div>
                    </div>

                    <button className={`btn redBTN ${styles.loginBTN}`}>
                        Create account
                    </button>
                    <p className={styles.termsAndPrivacy}>By creating an account, you agree to our&nbsp;
                        <Link href={'/term-of-use'}>Terms of Use</Link>
                        &nbsp;&amp;&nbsp;
                        <Link href={'/privacy-policy'}>Privacy Policy</Link>
                    </p>
                </form>

                <div className={styles.alternativeSignUpContainer}>
                    <p>Or sign up with</p>
                    <div className={styles.logoContainer}>
                        <Image
                            src={googleLogo}
                            alt="Google Logo"
                            className={`${styles.googleLogo} ${styles.signUpLogo}`}
                        />

                        <Image
                            src={facebookLogo}
                            alt="Facebook Logo"
                            className={`${styles.facebookLogo} ${styles.signUpLogo}`}
                        />
                    </div>
                </div>

                <div className={styles.alreadyHaveAccount}>
                    <p>Already have an account?&nbsp;</p>
                    <Link href={'/login'}>Login</Link>
                </div>

            </div>

        </main>

    </div>
  )
}

export default Signup