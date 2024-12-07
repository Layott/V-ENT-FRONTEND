import Link from 'next/link'
import AuthHeader from '@/components/auth-header/AuthHeader'
import generalStyles from "@/styles/auth/auth.module.css"

const ResetEmail = () => {
  return (
    <div className={generalStyles.pageContainer}>
        <header className={generalStyles.pageHeader}>
            <AuthHeader />
        </header>

        <main className={generalStyles.formContainer}>
            <h3 className={generalStyles.formHeaderH3}>Check your email</h3>
            <p>We just sent you a link to reset your password.</p>

            <div className={generalStyles.formHelperContainer}>
                <p>Remember password?&nbsp;</p>
                <Link href={'/login'}>Login</Link>
            </div>

        </main>

    </div>
  )
}

export default ResetEmail