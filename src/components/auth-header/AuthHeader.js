import Link from "next/link";
import Image from "next/image";
import logoRed from "@/images/logo_mark_red.png";
import styles from './auth-header.module.css'

const AuthHeader = () => {
  return (
    <div className={styles.headerLogoContainer}>
        <Link className={styles.logoLink} href={'/'}>
            <div className={styles.innerLogoContainer}>
                <Image src={logoRed} alt="Logo" width={24} height={25} className={styles.vEntLogo} />
            </div>
            <h1>v-ent</h1>
        </Link>
    </div>
  )
}

export default AuthHeader