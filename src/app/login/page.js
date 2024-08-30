'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import googleLogo from '../../../public/images/google.svg'
import facebookLogo from '../../../public/images/facebook.svg'
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa";
import styles from './login.module.css'

const Login = () => {
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
                    <h3>Welcome Back</h3>
                    <p>Please sign into your account</p>
                </section>

                <form className={styles.loginForm}>
                    <div className={styles.inputGroup}>
                        <label>Email or Username:</label>
                        <input
                            type="text"
                            placeholder="Enter your email address or username"
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

                    <Link href={'/forgot-password'}>Forgot password?</Link>

                    <button className={`btn redBTN ${styles.loginBTN}`}>
                        Login
                    </button>
                </form>

                <div className={styles.alternativeLoginContainer}>
                    <p>Or sign in with</p>
                    <div className={styles.logoContainer}>
                        <Image
                            src={googleLogo}
                            alt="Google Logo"
                            className={`${styles.googleLogo} ${styles.signInLogo}`}
                        />

                        <Image
                            src={facebookLogo}
                            alt="Facebook Logo"
                            className={`${styles.facebookLogo} ${styles.signInLogo}`}
                        />
                    </div>
                </div>

                <div className={styles.noAccountContainer}>
                    <p>Don&#39;t have an account?&nbsp;</p>
                    <Link href={'/signup'}>Create one</Link>
                </div>

            </div>

        </main>

    </div>
  )
}

export default Login