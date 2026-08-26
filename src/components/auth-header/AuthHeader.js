import Link from "next/link";
import Image from "next/image";
import logoRed from "@/images/logo_mark_red.png";
import styles from './auth-header.module.css'

const AuthHeader = () => {
  return (
    <div className={styles.headerLogoContainer}>
        <Link className={styles.logoLink} href={'/'}>
            <div className={styles.innerLogoContainer}>
                <Image src={logoRed} alt="V-ENT" width={24} height={25} className={styles.vEntLogo} />
            </div>
            <span className={styles.wordmark}>v-ent</span>
        </Link>
    </div>
  )
}

export default AuthHeader