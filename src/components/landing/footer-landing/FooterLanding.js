'use client';

import { useT } from '@/i18n/LanguageProvider';
import Link from "next/link";
import Image from "next/image";
import logoRed from "@/images/logo_mark_red.svg"
import { BsEnvelope } from "react-icons/bs";
import { IoCallOutline } from "react-icons/io5";
import { socialLinks } from "./SocialList";
import styles from './footer-landing.module.css'

const FooterLanding = () => {
  const tt = useT();
  return (
    <div className={styles.footerContainer}>

        <div className={styles.footerTop}>
            <div className={styles.aboutVENTContainer}>
                <div className={styles.footerLogoContainer}>
                    <Link className={styles.logoLink} href={'/'}>
                        <div className={styles.innerLogoContainer}>
                            <Image
                                src={logoRed}
                                alt="V-ENT"
                                className={styles.logo}
                            />
                        </div>
                        <span className={styles.wordmark}>v-ent</span>
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
                    <h3>{tt('landing.contact', 'Contact')}</h3>
                    <div className={styles.innerContactContainer}>
                        <p className={styles.emailParagraph}>
                            <span className={styles.envelopeSpan}><BsEnvelope /></span>
                            <span>support@v-ent.co</span>
                        </p>
                        <p className={styles.emailParagraph}>
                            <span className={styles.envelopeSpan}><IoCallOutline /></span>
                            <span>+234 913 601 7004</span>
                        </p>
                    </div>
                </div>

                <div className={styles.socialsContainer}>
                    <h3>{tt('landing.followUs', 'Follow us')}</h3>
                    <div className={styles.innerSocialsContainer}>
                    {socialLinks.map((socialLink, index) => (
                        <a key={index} href={socialLink.href} target="_blank" rel="noopener noreferrer" className={styles.socialParagraph}>
                            <span className={styles.envelopeSpan}>{socialLink.icon}</span>
                            <span>{socialLink.name}</span>
                        </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className={styles.footerLinks}>
            <Link href={'/partners'} className={styles.footerLink}>
                {tt('landing.forPartners', 'Partners')}
            </Link>
            <Link href={'/partners/docs'} className={styles.footerLink}>
                {tt('landing.apiDocs', 'API documentation')}
            </Link>
            <Link href={'/privacy-policy'} className={styles.footerLink}>
                {tt('landing.privacyPolicy', 'Privacy policy')}
            </Link>
        </div>

        <div className={styles.footerBottom}>
            <p>
                &copy; 2026 Vermillion Enterprise (V-ENT)
            </p>
            <p>
                {tt("landing.rightsReserved", "All rights reserved")}
            </p>
        </div>

    </div>
  )
}

export default FooterLanding