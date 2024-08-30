'use client'

import Link from 'next/link'
import styles from './forgot-password.module.css'

const ForgotPassword = () => {

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

                <form className={styles.forgotPasswordForm}>
                    <div className={styles.inputGroup}>
                        <label>Email Address:</label>
                        <input
                            type="text"
                            placeholder="Enter your email address"
                        />
                    </div>
    
                    <button className={`btn redBTN ${styles.sendResetLinkBTN}`}>
                        Send Reset Link
                    </button>
                </form>

                <div className={styles.rememberPassword}>
                    <p>Remember password?&nbsp;</p>
                    <Link href={'/login'}>Login</Link>
                </div>

            </div>

        </main>

    </div>
  )
}

export default ForgotPassword