import Link from 'next/link'
import styles from './reset-email.module.css'

const ResetEmail = () => {
  return (
    <div className={styles.pageContainer}>
        <header className={styles.pageHeader}>
            <h1>v-ent</h1>
        </header>

        <main className={styles.mainContainer}>
            <h3>Check your email</h3>
            <p>We just sent you a link to reset your password.</p>

            <div className={styles.rememberPassword}>
                <p>Remember password?&nbsp;</p>
                <Link href={'/login'}>Login</Link>
            </div>

        </main>

    </div>
  )
}

export default ResetEmail