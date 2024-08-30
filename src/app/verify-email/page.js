import styles from './verify-email.module.css'

const VerifyEmail = () => {
  return (
    <div className={styles.pageContainer}>
        <header className={styles.pageHeader}>
            <h1>v-ent</h1>
        </header>

        <main className={styles.mainContainer}>
            <h6>Verify your email</h6>
            <p>A verification email has been sent to the provided email. Click on the link to verify your account.</p>

            <button className={`btn redBTN ${styles.resendBTN}`}>
                Resend
            </button>
        </main>

    </div>
  )
}

export default VerifyEmail