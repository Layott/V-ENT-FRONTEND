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
import { MdOutlineSettings, MdBusiness, MdShield } from "react-icons/md";
import { MdLogout } from "react-icons/md";
import logoRed from "@/images/logo_mark_red.svg";
import styles from './sidebar.module.css';
import { signOut } from "next-auth/react"; // Import signOut function from next-auth
import { PiUserCircle } from "react-icons/pi";
import { useT } from '@/i18n/LanguageProvider';
const Sidebar = ({
  customClass
}) => {
  const tt = useT();
  const t = useT();
  const pathname = usePathname(); // Gets the current pathname
  const {
    data: session,
    status
  } = useSession();
  const logoHref = status === 'authenticated' ? '/home' : '/';

  // Function to Check if the Route is Active
  const isActive = href => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(href);
  };
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
  };
  return <div className={`${styles.desktopSidebar} ${customClass ? customClass : ''}`} data-tour="sidebar">
        <div className={styles.logoContainer}>
            <Link className={styles.logoLink} href={logoHref}>
                <div className={styles.innerLogoContainer}>
                    <Image src={logoRed} alt="V-ENT" className={styles.logo} />
                </div>
                <span className={styles.wordmark}>v-ent</span>
            </Link>
        </div>

        <nav className={styles.sidebarNav}>
            <ul className={styles.sidebarList}>
                <li className={`${styles.sidebarItem} ${isActive('/home') ? styles.activeLink : ''}`}>
                    <Link href={'/home'} className={styles.iconTextLink}>
                        <BiHomeCircle className={styles.sidebarIcon} /> {tt("ui.home.70f8", "Home")}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/user-profile') ? styles.activeLink : ''}`}>
                    <Link href={'/user-profile'} className={styles.iconTextLink} data-tour="nav-profile">
                        <PiUserCircle className={styles.sidebarIcon} /> {t('nav.profile')}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/tournaments') ? styles.activeLink : ''}`}>
                    <Link href={'/tournaments'} className={styles.iconTextLink} data-tour="nav-tournaments">
                        <LuGamepad2 className={styles.sidebarIcon} /> {t('nav.tournaments')}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/events') ? styles.activeLink : ''}`}>
                    <Link href={'/events'} className={styles.iconTextLink} data-tour="nav-events">
                        <MdOutlineEvent className={styles.sidebarIcon} /> {t('nav.events')}
                    </Link>
                </li>

                {/* Production is off. Nothing behind it works yet, so the row
                    is not a link at all - a disabled control that still
                    navigates is just a slower disappointment. */}
                <li className={`${styles.sidebarItem} ${styles.unavailableItem}`} aria-disabled="true">
                    <span className={styles.iconTextLink} title={tt("ui.production.not.available.yet.c87f", "Production is not available yet")}>
                        <BsBroadcast className={styles.sidebarIcon} /> {t('nav.production')}
                        <span className={styles.unavailableTag}>{tt("ui.unavailable.2c9c", "Unavailable")}</span>
                    </span>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/teams') ? styles.activeLink : ''}`}>
                    <Link href={'/teams'} className={styles.iconTextLink} data-tour="nav-teams">
                        <FaUsers className={styles.sidebarIcon} /> {t('nav.teams')}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/rankings') ? styles.activeLink : ''}`}>
                    <Link href={'/rankings'} className={styles.iconTextLink}>
                        <PiRankingBold className={styles.sidebarIcon} /> {t('nav.rankings')}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/wallets') ? styles.activeLink : ''}`}>
                    <Link href={'/wallets'} className={styles.iconTextLink} data-tour="nav-wallets">
                        <IoWalletOutline className={styles.sidebarIcon} /> {t('nav.wallets')}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/wager') ? styles.activeLink : ''}`}>
                    <Link href={'/wager'} className={styles.iconTextLink}>
                        <span className={styles.iconMarketplaceSpan}><FaDice className={styles.sidebarIcon} /> {tt("ui.wager.aee1", "Wager")}</span>
                        <span className={styles.betaPill}>{tt("ui.beta.f03b", "Beta")}</span>
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/anime') ? styles.activeLink : ''}`}>
                    <Link href={'/anime'} className={styles.iconTextLink}>
                        <FaTv className={styles.sidebarIcon} /> {t('nav.anime')}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/community') ? styles.activeLink : ''}`}>
                    <Link href={'/community'} className={styles.iconTextLink} data-tour="nav-community">
                        <FaUserFriends className={styles.sidebarIcon} /> {tt("ui.community.bfd5", "Community")}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/organizations') ? styles.activeLink : ''}`}>
                    <Link href={'/organizations'} className={styles.iconTextLink}>
                        <MdBusiness className={styles.sidebarIcon} /> {tt("ui.organizations.0760", "Organizations")}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/marketplace') ? styles.activeLink : ''}`}>
                    <Link href={'/marketplace'} className={styles.iconTextLink}>
                        <RiShoppingCart2Line className={styles.sidebarIcon} /> {tt("ui.marketplace.9830", "Marketplace")}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/shop') ? styles.activeLink : ''}`}>
                    <Link href={'/shop'} className={styles.iconTextLink}>
                        <FiShoppingBag className={styles.sidebarIcon} /> {tt("ui.shop.55de", "Shop")}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/settings') ? styles.activeLink : ''}`}>
                    <Link href={'/settings'} className={styles.iconTextLink} data-tour="nav-settings">
                        <MdOutlineSettings className={styles.sidebarIcon} /> {t('nav.settings')}
                    </Link>
                </li>

                {/* Only staff see this, and seeing it grants nothing: the
                    console keeps its own token and its own 2FA. It is here so
                    an admin can reach it from the interface instead of typing
                    the address, which is how they had to get there before. */}
                {session?.user?.isStaff && <li className={`${styles.sidebarItem} ${isActive('/admin') ? styles.activeLink : ''}`}>
                    <Link href={'/admin'} className={styles.iconTextLink}>
                        <MdShield className={styles.sidebarIcon} /> {tt("nav.adminConsole", "Admin console")}
                    </Link>
                </li>}

                <li className={`${styles.sidebarItem}`}>
                    <button onClick={handleLogout} className={styles.logoutButtonLink}>
                        <MdLogout className={styles.sidebarIcon} /> {tt("ui.logout.e43d", "Logout")}
                    </button>
                </li>
            </ul>
        </nav>
    </div>;
};
export default Sidebar;