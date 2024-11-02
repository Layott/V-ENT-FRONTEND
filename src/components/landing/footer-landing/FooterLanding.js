import Link from "next/link";
import Image from "next/image";
import logoRed from "@/images/logo_mark_red.svg"
// import logoRed from '@/images/'
import { BsEnvelope } from "react-icons/bs";
import { SiFacebook } from "react-icons/si";
import { FaInstagram } from "react-icons/fa";
import { IoCallOutline } from "react-icons/io5";
import styles from './footer-landing.module.css'

const FooterLanding = () => {
  return (
    <div className={styles.footerContainer}>

        <div className={styles.footerTop}>
            <div className={styles.aboutVENTContainer}>
                <div className={styles.footerLogoContainer}>
                    <Link className={styles.logoLink} href={'/'}>
                        <div className={styles.innerLogoContainer}>
                            <Image
                                src={logoRed}
                                alt='Logo'
                                className={styles.logo}
                            />
                        </div>
                        <h1>v-ent</h1>
                    </Link>
                </div>

                <div className={styles.aboutVENTParagraphContainer}>
                    <p>
                        V-ent is the ultimate esports hub, designed for gamers and enthusiasts alike. It&#39;s a place where competitive energy meets community vibes, offering top-tier gaming experiences, tournaments and events.
                    </p>
                </div>
            </div>

            <div className={styles.contactFollowUsContainer}>
                <div className={styles.contactContainer}>
                    <h3>Contact</h3>
                    <div className={styles.innerContactContainer}>
                        <p className={styles.emailParagraph}>
                            <span className={styles.envelopeSpan}><BsEnvelope /></span>
                            <span>info@vermillionent.com</span>
                        </p>
                        <p className={styles.emailParagraph}>
                            <span className={styles.envelopeSpan}><IoCallOutline /></span>
                            <span>+234 913 601 7004</span>
                        </p>
                    </div>
                </div>

                <div className={styles.socialsContainer}>
                    <h3>Follow Us</h3>
                    <div className={styles.innerSocialsContainer}>
                        <p className={styles.emailParagraph}>
                            <span className={styles.envelopeSpan}><SiFacebook /></span>
                            <span>Facebook</span>
                        </p>
                        <p className={styles.emailParagraph}>
                            <span className={styles.envelopeSpan}><FaInstagram /></span>
                            <span>Instagram</span>
                        </p>
                    </div>
                </div>
            </div>


        </div>

        <div className={styles.footerBottom}>
            <p>
                &copy; 2024 V-ent  Esports
            </p>
            
            <p>
                All rights reserved
            </p>
        </div>

    </div>
  )
}

export default FooterLanding