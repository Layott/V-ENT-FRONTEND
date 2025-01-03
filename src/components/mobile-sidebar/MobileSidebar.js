import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiHome, FiSettings } from "react-icons/fi";
import { MdOutlineEvent } from "react-icons/md";
import { FaTrophy, FaUsers, FaShoppingCart, FaTv } from 'react-icons/fa';
import { PiRankingBold } from "react-icons/pi";
import { IoWalletOutline } from "react-icons/io5";
import { FiShoppingBag } from "react-icons/fi";
import logoRed from "@/images/logo_mark_red.svg"
import styles from './mobile-sidebar.module.css'

const MobileSidebar = ({ isOpen }) => {
    const pathname = usePathname()      // Gets the current pathname

    // Function to Check if the Route is Active
    const isActive = (href) => {
        if (href === '/') {
            return pathname === '/';
        }
        return pathname === href || pathname.startsWith(href);
    }

  return (
    <div className={`${styles.mobileSidebar} ${isOpen ? styles.open : ''}`}>
    {/* <div className={styles.mobileSidebar}> */}
        {/* <div className={styles.logoContainer}>
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
        </div> */}

        <nav className={styles.sidebarNav}>
            <ul className={styles.sidebarList}>
                <li className={`${styles.sidebarItem} ${isActive('/') ? styles.activeLink : ''}`}>
                    <Link href={'/'} className={styles.iconTextLink}>
                        Home <FiHome className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/tournaments') ? styles.activeLink : ''}`}>
                    <Link href={'/tournaments'} className={styles.iconTextLink}>
                        Tournaments <FaTrophy className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/events') ? styles.activeLink : ''}`}>
                    <Link href={'/events'} className={styles.iconTextLink}>
                        Events <MdOutlineEvent className={styles.sidebarIcon} />
                    </Link>
                </li>
                
                <li className={`${styles.sidebarItem} ${isActive('/anime') ? styles.activeLink : ''}`}>
                    <Link href={'/anime'} className={styles.iconTextLink}>
                        Animne <FaTv className={styles.sidebarIcon} />
                    </Link>
                </li>
                
                <li className={`${styles.sidebarItem} ${isActive('/rankings') ? styles.activeLink : ''}`}>
                    <Link href={'/rankings'} className={styles.iconTextLink}>
                        Rankings <PiRankingBold className={styles.sidebarIcon} />
                    </Link>
                </li>
                
                <li className={`${styles.sidebarItem} ${isActive('/teams') ? styles.activeLink : ''}`}>
                    <Link href={'/teams'} className={styles.iconTextLink}>
                        Teams <FaUsers className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/wallets') ? styles.activeLink : ''}`}>
                    <Link href={'/wallets'} className={styles.iconTextLink}>
                        Wallets <IoWalletOutline className={styles.sidebarIcon} />
                    </Link>
                </li>
                            
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.comingSoon}>Coming Soon</span>
                        <span className={styles.iconMarketplaceSpan}>Marketplace <FaShoppingCart className={styles.sidebarIcon} /></span>
                    </span>
                </li>
            
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.comingSoon}>Coming Soon</span>
                        <span className={styles.iconShopSpan}>Shop <FiShoppingBag className={styles.sidebarIcon} /></span>
                    </span>
                </li>
            
                <li className={`${styles.sidebarItem} ${isActive('/settings') ? styles.activeLink : ''}`}>
                    <Link href={'/settings'} className={styles.iconTextLink}>
                        Settings <FiSettings className={styles.sidebarIcon} />
                    </Link>
                </li>
            </ul>
        </nav>
    </div>
  )
}

export default MobileSidebar