import { useState } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import { useComingSoon } from '@/lib/platformModules';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
// import { BiHomeCircle } from "react-icons/bi";
import { MdOutlineEvent } from "react-icons/md";
import { FaUsers, FaTv, FaUserFriends } from 'react-icons/fa';
import { PiRankingBold } from "react-icons/pi";
import { IoWalletOutline } from "react-icons/io5";
import { FiShoppingBag } from "react-icons/fi";
import { RiShoppingCart2Line } from "react-icons/ri";
import { MdOutlineSettings, MdBusiness } from "react-icons/md";
import { LuDices, LuCode, LuShield } from "react-icons/lu";
import { useSession } from 'next-auth/react';
import { LuGamepad2 } from "react-icons/lu";
import { LuCircleHelp } from 'react-icons/lu';
import { guideFor } from '@/components/page-help/pageGuides';
import { MdLogout } from "react-icons/md";
import styles from './mobile-sidebar.module.css';
import { PiUserCircle } from "react-icons/pi";
import { useT } from '@/i18n/LanguageProvider';
import { logOut } from '@/lib/logout';
const MobileSidebar = ({
  isOpen,
  closeSidebar
}) => {
  // Reads the console's module switches, falling back to the built-in list
  // until they arrive.
  const isComingSoon = useComingSoon();
  const tt = useT();
  // The admin entry is shown to staff only, the same condition the desktop
  // sidebar uses.
  const { data: session, status } = useSession();
  // `data` alone cannot tell "signed out" from "still asking". Neither branch
  // is drawn until `status` settles, so the menu does not flicker from a
  // member's shell to a visitor's.
  const signedIn = status === 'authenticated';
  const signedOut = status === 'unauthenticated';
  const t = useT();
  const pathname = usePathname(); // Gets the current pathname
  // Help is only offered where there is something to say. A menu item that
  // opens an empty panel is worse than no menu item.
  const hasGuide = Boolean(guideFor(pathname || '/'));

  // Which groups are open. CEO, 31 August: the things you run - my tickets, my
  // events, my tournaments - were top-level rows, which made the menu long and
  // put "My tickets" at the same level as "Events". They belong under the
  // section they are part of, and only once you ask for it.
  //
  // A group starts open when you are already somewhere inside it, so the menu
  // shows you where you are rather than making you find it again.
  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = key => setOpenGroups(g => ({ ...g, [key]: !g[key] }));

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
  return <div className={`${styles.mobileSidebar} ${isOpen ? styles.open : ''}`}>

        <nav className={styles.sidebarNav}>
            <ul className={styles.sidebarList}>
                {signedIn && <li className={`${styles.sidebarItem} ${isActive('/user-profile') ? styles.activeLink : ''}`}>
                    <Link href={'/user-profile'} className={styles.iconTextLink}>
                        {t('nav.profile')} <PiUserCircle className={styles.sidebarIcon} />
                        {isComingSoon('/user-profile') && <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>}
                    </Link>
                </li>}

                {/* First thing in the menu for somebody with no account: the
                    way in, rather than a profile that is not theirs. */}
                {signedOut && <li className={`${styles.sidebarItem} ${styles.signInItem}`}>
                    <Link href={'/login'} className={styles.iconTextLink}>
                        {tt("ui.log.f7c4", "Log in")} <MdLogout className={styles.sidebarIcon} />
                    </Link>
                </li>}
                {signedOut && <li className={styles.sidebarItem}>
                    <Link href={'/signup'} className={styles.iconTextLink}>
                        {tt("ui.create.account.3c19", "Create an account")} <PiUserCircle className={styles.sidebarIcon} />
                    </Link>
                </li>}

                {/* Help lives here on a phone rather than in a bubble floating
                    over the page. The bubble sat on top of whatever full-width
                    control was at its height, and on an event's tickets tab
                    that was the Buy ticket button.

                    Only when this page HAS a guide. A menu item that opens
                    nothing is worse than no menu item, and scripts/check-inert-
                    controls.mjs exists because of exactly that. */}
                {hasGuide && <li className={styles.sidebarItem}>
                    <button
                      type="button"
                      className={styles.iconTextLink}
                      onClick={() => {
                        closeSidebar?.();
                        window.dispatchEvent(new CustomEvent('vent:help'));
                      }}
                    >
                        {tt('help.button', 'What is this page?')} <LuCircleHelp className={styles.sidebarIcon} />
                    </button>
                </li>}

                {/* Three sections, each holding the things you browse and
                    the things you run. They open on a tap rather than
                    navigating, so "My tickets" is one press away without being
                    a top-level row competing with "Events". */}
                {[
                  {
                    key: 'tournaments',
                    label: t('nav.tournaments'),
                    Icon: LuGamepad2,
                    root: '/tournaments',
                    children: [
                      { href: '/tournaments', label: t('menu.allTournaments', 'All tournaments'), exact: true },
                      { mine: true, href: '/tournaments/my-tournaments', label: t('menu.myTournaments', 'My tournaments') },
                      { mine: true, href: '/tournaments/drafts', label: t('menu.drafts', 'Drafts') },
                    ],
                  },
                  {
                    key: 'events',
                    label: t('nav.events'),
                    Icon: MdOutlineEvent,
                    root: '/events',
                    children: [
                      { href: '/events', label: t('menu.allEvents', 'All events'), exact: true },
                      { mine: true, href: '/events/my-events', label: t('menu.myEvents', 'My events') },
                      { mine: true, href: '/events/my-tickets', label: t('menu.myTickets', 'My tickets') },
                    ],
                  },
                  {
                    key: 'teams',
                    label: t('nav.teams'),
                    Icon: FaUsers,
                    root: '/teams',
                    children: [
                      { href: '/teams', label: t('menu.allTeams', 'All teams'), exact: true },
                      { mine: true, href: '/teams?tab=owned', label: t('menu.teamsOwned', 'Owned by me') },
                      { mine: true, href: '/teams?tab=joined', label: t('menu.teamsJoined', 'Joined') },
                      { mine: true, href: '/teams?tab=invited', label: t('menu.teamsInvited', 'Invited') },
                    ],
                  },
                ].map(group => {
                  // Open if you asked for it, or if you are already in it.
                  const inHere = pathname.startsWith(group.root);
                  const open = openGroups[group.key] ?? inHere;
                  return (
                    <li key={group.key} className={styles.groupItem}>
                      <button
                        type="button"
                        className={`${styles.iconTextLink} ${styles.groupHead} ${inHere ? styles.activeLink : ''}`}
                        onClick={() => toggleGroup(group.key)}
                        aria-expanded={open}
                      >
                        <LuChevronDown
                          className={`${styles.groupChevron} ${open ? styles.groupChevronOpen : ''}`}
                          aria-hidden="true"
                        />
                        <span className={styles.groupLabel}>{group.label}</span>
                        <group.Icon className={styles.sidebarIcon} />
                        {isComingSoon(group.root) && <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>}
                      </button>

                      {open && (
                        <ul className={styles.subList}>
                          {/* "My tournaments", "My tickets", "Owned by me" and
                              the rest are a member's own things. Offering them
                              to a visitor is the menu telling them they have
                              some. The public entry in each group stays. */}
                          {group.children.filter(child => signedIn || !child.mine).map(child => (
                            <li key={child.href} className={styles.subItem}>
                              <Link
                                href={child.href}
                                className={`${styles.subLink} ${
                                  (child.exact ? pathname === child.href.split('?')[0] : pathname.startsWith(child.href.split('?')[0]))
                                    ? styles.subLinkActive : ''}`}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}

                <li className={`${styles.sidebarItem} ${isActive('/rankings') ? styles.activeLink : ''}`}>
                    <Link href={'/rankings'} className={styles.iconTextLink}>
                        {t('nav.rankings')} <PiRankingBold className={styles.sidebarIcon} />
                        {isComingSoon('/rankings') && <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>}
                    </Link>
                </li>

                {signedIn && <li className={`${styles.sidebarItem} ${isActive('/wallets') ? styles.activeLink : ''}`}>
                    <Link href={'/wallets'} className={styles.iconTextLink}>
                        {t('nav.wallets')} <IoWalletOutline className={styles.sidebarIcon} />
                        {isComingSoon('/wallets') && <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>}
                    </Link>
                </li>}

                <li className={`${styles.sidebarItem} ${isActive('/anime') ? styles.activeLink : ''}`}>
                    <Link href={'/anime'} className={styles.iconTextLink}>
                        {t('nav.anime')} <FaTv className={styles.sidebarIcon} />
                        {isComingSoon('/anime') && <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/community') ? styles.activeLink : ''}`}>
                    <Link href={'/community'} className={styles.iconTextLink}>
                        <span className={styles.iconMarketplaceSpan}>{t('nav.community')} <FaUserFriends className={styles.sidebarIcon} /></span>
                        {isComingSoon('/community') && <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/organizations') ? styles.activeLink : ''}`}>
                    <Link href={'/organizations'} className={styles.iconTextLink}>
                        <span className={styles.iconMarketplaceSpan}>{t('nav.organizations')} <MdBusiness className={styles.sidebarIcon} /></span>
                        {isComingSoon('/organizations') && <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/marketplace') ? styles.activeLink : ''}`}>
                    <Link href={'/marketplace'} className={styles.iconTextLink}>
                        <span className={styles.iconMarketplaceSpan}>{t('nav.marketplace')} <RiShoppingCart2Line className={styles.sidebarIcon} /></span>
                        {isComingSoon('/marketplace') && <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/shop') ? styles.activeLink : ''}`}>
                    <Link href={'/shop'} className={styles.iconTextLink}>
                        <span className={styles.iconShopSpan}>{t('nav.shop')} <FiShoppingBag className={styles.sidebarIcon} /></span>
                        {isComingSoon('/shop') && <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>}
                    </Link>
                </li>

                {/* Wager, Partners and the admin console.
                    All three sat in the desktop sidebar and in no mobile
                    navigation at all, so a phone could not reach them by any
                    route - which is most of what "the UI on mobile is
                    different from PC" meant. The conditions are copied from
                    the desktop sidebar rather than invented, so the two
                    cannot drift apart again. */}
                <li className={`${styles.sidebarItem} ${isActive('/wager') ? styles.activeLink : ''}`}>
                    <Link href={'/wager'} className={styles.iconTextLink}>
                        {tt("ui.wager.aee1", "Wager")} <LuDices className={styles.sidebarIcon} />
                        {isComingSoon('/wager') && <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>}
                    </Link>
                </li>

                <li className={`${styles.sidebarItem} ${isActive('/partners') ? styles.activeLink : ''}`}>
                    <Link href={'/partners'} className={styles.iconTextLink}>
                        {t('nav.partners')} <LuCode className={styles.sidebarIcon} />
                    </Link>
                </li>

                {signedIn && <li className={`${styles.sidebarItem} ${isActive('/settings') ? styles.activeLink : ''}`}>
                    <Link href={'/settings'} className={styles.iconTextLink}>
                        {t('nav.settings')} <MdOutlineSettings className={styles.sidebarIcon} />
                        {isComingSoon('/settings') && <span className={styles.comingSoon}>{t('nav.comingSoon')}</span>}
                    </Link>
                </li>}

                {session?.user?.isStaff && <li className={`${styles.sidebarItem} ${isActive('/admin') ? styles.activeLink : ''}`}>
                    <Link href={'/admin'} className={styles.iconTextLink}>
                        {tt("nav.adminConsole", "Admin console")} <LuShield className={styles.sidebarIcon} />
                    </Link>
                </li>}

                {signedIn && <li className={styles.sidebarItem}>
                    <button onClick={handleLogout} className={styles.logoutButtonLink}>
                        {tt("ui.logout.e43d", "Logout")} <MdLogout className={styles.sidebarIcon} />
                    </button>
                </li>}
            </ul>
        </nav>
    </div>;
};
export default MobileSidebar;