import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { BiHomeCircle } from "react-icons/bi";
import { MdOutlineEvent } from "react-icons/md";
import { BsBroadcast } from "react-icons/bs";
import { FaUsers, FaTv, FaUserFriends, FaDice } from 'react-icons/fa';
import { PiRankingBold } from "react-icons/pi";
import { IoWalletOutline } from "react-icons/io5";
import { FiShoppingBag } from "react-icons/fi";
import { RiShoppingCart2Line } from "react-icons/ri";
import { LuGamepad2 } from "react-icons/lu";
import { MdOutlineSettings, MdBusiness } from "react-icons/md";
import { MdLogout } from "react-icons/md";
import logoRed from "@/images/logo_mark_red.svg"
import styles from './sidebar.module.css'
import { signOut } from "next-auth/react";  // Import signOut function from next-auth
import { PiUserCircle } from "react-icons/pi";


const Sidebar = ({ customClass }) => {
    const pathname = usePathname()      // Gets the current pathname
    const { status } = useSession();
    const logoHref = status === 'authenticated' ? '/home' : '/';

    // Function to Check if the Route is Active
    const isActive = (href) => {
        if (href === '/') {
            return pathname === '/';
        }
        return pathname === href || pathname.startsWith(href);
    }

    const handleLogout = async () => {
        try {
            // First clear all local storage items
            localStorage.removeItem('userProfile');
            localStorage.removeItem('authToken');
            sessionStorage.clear();

            // Set the logged out cookie
            document.cookie = "isLoggedOut=true; path=/; max-age=60";

            // Use NextAuth signOut but handle it properly
            await signOut({
                redirect: false // Change this to false
            }).then(() => {
                // Manual redirect after successful signOut
                window.location.href = '/login';
            });
        } catch (error) {
            console.error("Error during logout:", error);
            // Still redirect even if there was an error
            window.location.href = '/login';
        }
    }

  return (
    <div className={`${styles.desktopSidebar} ${customClass ? customClass : ''}`}>
        <div className={styles.logoContainer}>
            <Link className={styles.logoLink} href={logoHref}>
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

        <nav className={styles.sidebarNav}>
            <ul className={styles.sidebarList}>
                <li className={`${styles.sidebarItem} ${isActive('/home') ? styles.activeLink : ''}`}>
                    <Link href={'/home'} className={styles.iconTextLink}>
                        <BiHomeCircle className={styles.sidebarIcon} /> Home
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/user-profile') ? styles.activeLink : ''}`}>
                    <Link href={'/user-profile'} className={styles.iconTextLink}>
                        <PiUserCircle className={styles.sidebarIcon} /> Profile
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/tournaments') ? styles.activeLink : ''}`}>
                    <Link href={'/tournaments'} className={styles.iconTextLink}>
                        <LuGamepad2 className={styles.sidebarIcon} /> Tournaments
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/events') ? styles.activeLink : ''}`}>
                    <Link href={'/events'} className={styles.iconTextLink}>
                        <MdOutlineEvent className={styles.sidebarIcon} /> Events
                    </Link>
                </li>

                {/* Production is off. Nothing behind it works yet, so the row
                    is not a link at all - a disabled control that still
                    navigates is just a slower disappointment. */}
                <li className={`${styles.sidebarItem} ${styles.unavailableItem}`} aria-disabled="true">
                    <span className={styles.iconTextLink} title="Production is not available yet">
                        <BsBroadcast className={styles.sidebarIcon} /> Production
                        <span className={styles.unavailableTag}>Unavailable</span>
                    </span>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/teams') ? styles.activeLink : ''}`}>
                    <Link href={'/teams'} className={styles.iconTextLink}>
                        <FaUsers className={styles.sidebarIcon} /> Teams
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/rankings') ? styles.activeLink : ''}`}>
                    <Link href={'/rankings'} className={styles.iconTextLink}>
                        <PiRankingBold className={styles.sidebarIcon} /> Rankings
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/wallets') ? styles.activeLink : ''}`}>
                    <Link href={'/wallets'} className={styles.iconTextLink}>
                        <IoWalletOutline className={styles.sidebarIcon} /> Wallets
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/wager') ? styles.activeLink : ''}`}>
                    <Link href={'/wager'} className={styles.iconTextLink}>
                        <span className={styles.iconMarketplaceSpan}><FaDice className={styles.sidebarIcon} /> Wager</span>
                        <span className={styles.betaPill}>Beta</span>
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/anime') ? styles.activeLink : ''}`}>
                    <Link href={'/anime'} className={styles.iconTextLink}>
                        <FaTv className={styles.sidebarIcon} /> Anime
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/community') ? styles.activeLink : ''}`}>
                    <Link href={'/community'} className={styles.iconTextLink}>
                        <FaUserFriends className={styles.sidebarIcon} /> Community
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/organizations') ? styles.activeLink : ''}`}>
                    <Link href={'/organizations'} className={styles.iconTextLink}>
                        <MdBusiness className={styles.sidebarIcon} /> Organizations
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/marketplace') ? styles.activeLink : ''}`}>
                    <Link href={'/marketplace'} className={styles.iconTextLink}>
                        <RiShoppingCart2Line className={styles.sidebarIcon} /> Marketplace
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/shop') ? styles.activeLink : ''}`}>
                    <Link href={'/shop'} className={styles.iconTextLink}>
                        <FiShoppingBag className={styles.sidebarIcon} /> Shop
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/settings') ? styles.activeLink : ''}`}>
                    <Link href={'/settings'} className={styles.iconTextLink}>
                        <MdOutlineSettings className={styles.sidebarIcon} /> Settings
                    </Link>
                </li>

                <li className={`${styles.sidebarItem}`}>
                    <button onClick={handleLogout} className={styles.logoutButtonLink}>
                        <MdLogout className={styles.sidebarIcon} /> Logout
                    </button>
                </li>
            </ul>
        </nav>
    </div>
  )
}

export default Sidebar;
