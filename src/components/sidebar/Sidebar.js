import { useComingSoon } from '@/lib/platformModules';
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
import { MdOutlineSettings, MdBusiness, MdShield, MdCode } from "react-icons/md";
import { MdLogout } from "react-icons/md";
import logoRed from "@/images/logo_mark_red.svg";
import styles from './sidebar.module.css';
import { PiUserCircle } from "react-icons/pi";
import { useT } from '@/i18n/LanguageProvider';
import { logOut } from '@/lib/logout';
const Sidebar = ({
  customClass
}) => {
  // Reads the console's module switches, falling back to the built-in list
  // until they arrive.
  const isComingSoon = useComingSoon();
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
    // One way out for the whole app: see src/lib/logout.js. This used to
    // call signOut() alone, which leaves the `session` cookie the
    // middleware also accepts, so pressing Logout did not sign anybody out.
    await logOut();
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
                        {isComingSoon('/home') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/user-profile') ? styles.activeLink : ''}`}>
                    <Link href={'/user-profile'} className={styles.iconTextLink} data-tour="nav-profile">
                        <PiUserCircle className={styles.sidebarIcon} /> {t('nav.profile')}
                        {isComingSoon('/user-profile') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/tournaments') ? styles.activeLink : ''}`}>
                    <Link href={'/tournaments'} className={styles.iconTextLink} data-tour="nav-tournaments">
                        <LuGamepad2 className={styles.sidebarIcon} /> {t('nav.tournaments')}
                        {isComingSoon('/tournaments') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/events') ? styles.activeLink : ''}`}>
                    <Link href={'/events'} className={styles.iconTextLink} data-tour="nav-events">
                        <MdOutlineEvent className={styles.sidebarIcon} /> {t('nav.events')}
                        {isComingSoon('/events') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
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
                        {isComingSoon('/teams') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/rankings') ? styles.activeLink : ''}`}>
                    <Link href={'/rankings'} className={styles.iconTextLink}>
                        <PiRankingBold className={styles.sidebarIcon} /> {t('nav.rankings')}
                        {isComingSoon('/rankings') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/wallets') ? styles.activeLink : ''}`}>
                    <Link href={'/wallets'} className={styles.iconTextLink} data-tour="nav-wallets">
                        <IoWalletOutline className={styles.sidebarIcon} /> {t('nav.wallets')}
                        {isComingSoon('/wallets') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/wager') ? styles.activeLink : ''}`}>
                    <Link href={'/wager'} className={styles.iconTextLink}>
                        <span className={styles.iconMarketplaceSpan}><FaDice className={styles.sidebarIcon} /> {tt("ui.wager.aee1", "Wager")}</span>
                        <span className={styles.betaPill}>{tt("ui.beta.f03b", "Beta")}</span>
                        {isComingSoon('/wager') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/anime') ? styles.activeLink : ''}`}>
                    <Link href={'/anime'} className={styles.iconTextLink}>
                        <FaTv className={styles.sidebarIcon} /> {t('nav.anime')}
                        {isComingSoon('/anime') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/community') ? styles.activeLink : ''}`}>
                    <Link href={'/community'} className={styles.iconTextLink} data-tour="nav-community">
                        <FaUserFriends className={styles.sidebarIcon} /> {tt("ui.community.bfd5", "Community")}
                        {isComingSoon('/community') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/organizations') ? styles.activeLink : ''}`}>
                    <Link href={'/organizations'} className={styles.iconTextLink}>
                        <MdBusiness className={styles.sidebarIcon} /> {tt("ui.organizations.0760", "Organizations")}
                        {isComingSoon('/organizations') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/marketplace') ? styles.activeLink : ''}`}>
                    <Link href={'/marketplace'} className={styles.iconTextLink}>
                        <RiShoppingCart2Line className={styles.sidebarIcon} /> {tt("ui.marketplace.9830", "Marketplace")}
                        {isComingSoon('/marketplace') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/shop') ? styles.activeLink : ''}`}>
                    <Link href={'/shop'} className={styles.iconTextLink}>
                        <FiShoppingBag className={styles.sidebarIcon} /> {tt("ui.shop.55de", "Shop")}
                        {isComingSoon('/shop') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/settings') ? styles.activeLink : ''}`}>
                    <Link href={'/settings'} className={styles.iconTextLink} data-tour="nav-settings">
                        <MdOutlineSettings className={styles.sidebarIcon} /> {t('nav.settings')}
                        {isComingSoon('/settings') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
                    </Link>
                </li>

                {/* Building on V-ENT was reachable only from the landing
                    footer, which a signed-in person never sees - so anybody
                    already using the platform had no route to it at all, and
                    GET /api/v1/ has been pointing integrators at a page they
                    could not find from inside the product. */}
                <li className={`${styles.sidebarItem} ${isActive('/partners') ? styles.activeLink : ''}`}>
                    <Link href={'/partners'} className={styles.iconTextLink}>
                        <MdCode className={styles.sidebarIcon} /> {tt("nav.partners", "Build on V-ENT")}
                    </Link>
                </li>

                {/* Only staff see this, and seeing it grants nothing: the
                    console reads the site session and opens only when that
                    session passed the authenticator challenge. */}
                {session?.user?.isStaff && <li className={`${styles.sidebarItem} ${isActive('/admin') ? styles.activeLink : ''}`}>
                    <Link href={'/admin'} className={styles.iconTextLink}>
                        <MdShield className={styles.sidebarIcon} /> {tt("nav.adminConsole", "Admin console")}
                        {isComingSoon('/admin') && <span className={styles.comingSoon}>{tt('nav.comingSoon', 'Coming Soon')}</span>}
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