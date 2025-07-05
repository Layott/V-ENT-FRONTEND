import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BiHomeCircle } from "react-icons/bi";
import { MdOutlineEvent } from "react-icons/md";
import { FaUsers, FaTv } from 'react-icons/fa';
import { PiRankingBold } from "react-icons/pi";
import { IoWalletOutline } from "react-icons/io5";
import { FiShoppingBag } from "react-icons/fi";
import { RiShoppingCart2Line } from "react-icons/ri";
import { MdOutlineSettings } from "react-icons/md";
import { LuGamepad2 } from "react-icons/lu";
import { MdLogout } from "react-icons/md";
import { signOut } from "next-auth/react";  // Import signOut function from next-auth
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
    <div className={`${styles.mobileSidebar} ${isOpen ? styles.open : ''}`}>

        <nav className={styles.sidebarNav}>
            <ul className={styles.sidebarList}>
                <li className={`${styles.sidebarItem} ${isActive('/user-profile') ? styles.activeLink : ''}`}>
                    <Link href={'/user-profile'} className={styles.iconTextLink}>
                        Home <BiHomeCircle className={styles.sidebarIcon} />    
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/tournaments') ? styles.activeLink : ''}`}>
                    <Link href={'/tournaments'} className={styles.iconTextLink}>
                        Tournaments <LuGamepad2 className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/events') ? styles.activeLink : ''}`}>
                    <Link href={'/events'} className={styles.iconTextLink}>
                        Events <MdOutlineEvent className={styles.sidebarIcon} />
                    </Link>
                </li>
                {/* 
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
                </li> */}

                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.comingSoon}>Coming Soon</span>
                        <span className={styles.iconMarketplaceSpan}>Anime <FaTv className={styles.sidebarIcon} /> </span>
                    </span>
                </li>
                 
                 <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.comingSoon}>Coming Soon</span>
                        <span className={styles.iconMarketplaceSpan}>Ranking <PiRankingBold className={styles.sidebarIcon} /> </span>
                    </span>
                </li>

                 <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.comingSoon}>Coming Soon</span>
                        <span className={styles.iconMarketplaceSpan}>Team <FaUsers className={styles.sidebarIcon} /></span>
                    </span>
                </li>

                 <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.comingSoon}>Coming Soon</span>
                        <span className={styles.iconMarketplaceSpan}>Wallet <IoWalletOutline className={styles.sidebarIcon} /></span>
                    </span>
                </li>

                            
                <li className={styles.sidebarItem}>
                    <span className={styles.disabledLink}>
                        <span className={styles.comingSoon}>Coming Soon</span>
                        <span className={styles.iconMarketplaceSpan}>Marketplace <RiShoppingCart2Line className={styles.sidebarIcon} /></span>
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
                        Settings <MdOutlineSettings className={styles.sidebarIcon} />
                    </Link>
                </li>

                <li className={styles.sidebarItem}>
                    <button onClick={handleLogout} className={styles.logoutButtonLink}>
                        Logout <MdLogout className={styles.sidebarIcon} />
                    </button>
                </li>
            </ul>
        </nav>
    </div>
  )
}

export default MobileSidebar;