'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { MdOutlineDashboard, MdLogout, MdOutlineSettings, MdGavel, MdArrowBack } from 'react-icons/md';
import { LuCalendar, LuCoins, LuGamepad2, LuUsers, LuShield, LuFileText, LuFlag, LuReceipt, LuIdCard, LuMessagesSquare, LuBuilding } from 'react-icons/lu';
import { RiTrophyLine } from 'react-icons/ri';
import { IoWalletOutline } from 'react-icons/io5';
import logoRed from '@/images/logo_mark_red.svg';
import styles from './AdminNav.module.css';
import { useT } from '@/i18n/LanguageProvider';
import Avatar from '@/components/avatar/Avatar';
import { mediaUrl } from '@/lib/mediaUrl';
// Every short role the backend can emit, and there are eight.
//
// This held four. `ROLE_LABELS[role]` is `undefined` for the rest, so an
// Admin, a Tournament Organizer, a Marketplace Manager and a Wager Manager all
// saw a BLANK badge in the sidebar and a blank line under their own name in
// the footer. The four missing ones are exactly the roles the admin spec of 7
// September adds, which is how it went unnoticed.
//
// `decorators.ROLE_SHORT` is the source of these keys.
const ROLE_LABELS = {
  super: 'Super Admin',
  admin: 'Admin',
  finance: 'Financial Manager',
  moderator: 'Moderator',
  tournaments: 'Tournament Organizer',
  marketplace: 'Marketplace Manager',
  wager: 'Wager Manager',
  support: 'Support'
};

// One key per item, and it is the SAME permission name the endpoint behind it
// is decorated with in `vent_auth/decorators.py`. `perms: null` on the
// Dashboard is the one universal item: every admin role holds
// `view_dashboard`, and it is the page they land on.
//
// `tools/check-admin-nav.py` fails the build if a name here is not a real
// permission, or if an admin route exists with no way to reach it. /admin/kyc
// was a finished page in no navigation list for weeks, reachable only by
// typing the address.
export const NAV = [{
  section: 'Overview',
  items: [{
    label: 'Dashboard',
    href: '/admin',
    icon: MdOutlineDashboard,
    perms: null
  }]
}, {
  section: 'Management',
  items: [
  // perms use the REAL ROLE_PERMISSIONS keys the BE emits in admin.permissions.
  {
    label: 'Users',
    href: '/admin/users',
    icon: LuUsers,
    perms: ['view_users'],
    badge: 'users'
  }, {
    label: 'Events',
    href: '/admin/events',
    icon: LuCalendar,
    perms: ['manage_events']
  }, {
    label: 'Games',
    href: '/admin/games',
    icon: LuGamepad2,
    perms: ['manage_games']
  }, {
    label: 'Tournaments',
    href: '/admin/tournaments',
    icon: RiTrophyLine,
    perms: ['manage_tournaments']
  }, {
    label: 'Disputes',
    href: '/admin/disputes',
    icon: MdGavel,
    perms: ['resolve_dispute'],
    badge: 'disputes'
  }, {
    // Two of the ten sections the admin spec of 7 September asks for. The
    // rest are either already here or waiting on a feature that does not
    // exist: the marketplace is Phase 4, the wager system Phase 6, the shop
    // Phase 3. A console section for an unbuilt feature is a screen of
    // controls that do nothing.
    label: 'Organisations',
    href: '/admin/organizations',
    icon: LuBuilding,
    perms: ['view_organizations']
  }, {
    label: 'Communities',
    href: '/admin/communities',
    icon: LuMessagesSquare,
    perms: ['manage_communities']
  }, {
    // Reports were filed into a table nothing read. The badge is the count of
    // reports still waiting, because a queue with no number on it is a queue
    // people stop opening.
    label: 'Reports and content',
    href: '/admin/content',
    icon: LuFlag,
    perms: ['moderate_content'],
    badge: 'reports'
  }]
}, {
  section: 'Finance',
  items: [{
    label: 'Money',
    href: '/admin/finance',
    icon: LuReceipt,
    perms: ['view_transactions']
  }, {
    label: 'Rates',
    href: '/admin/rates',
    icon: LuCoins,
    perms: ['manage_rates']
  }, {
    label: 'Payouts',
    href: '/admin/payouts',
    icon: IoWalletOutline,
    perms: ['list_payouts'],
    badge: 'payouts'
  }, {
    // A finished page that was in no navigation list anywhere, so the only way
    // to reach it was to type the address.
    label: 'Identity checks',
    href: '/admin/kyc',
    icon: LuIdCard,
    perms: ['list_kyc'],
    badge: 'kyc'
  }]
}, {
  section: 'Partners',
  items: [
  // Partner access is a super-admin decision: it hands somebody outside the
  // platform a key to read our data, and SSO on top of that hands them
  // people's identities.
  {
    label: 'Partner access',
    href: '/admin/partners',
    icon: LuShield,
    perms: ['manage_admins']
  }]
}, {
  section: 'System',
  items: [{
    // Creating and removing administrators. The one thing the spec gives a
    // Super Admin and withholds from an Admin.
    label: 'Administrators',
    href: '/admin/admins',
    icon: LuShield,
    perms: ['manage_admins']
  }, {
    label: 'Audit Log',
    href: '/admin/audit-log',
    icon: LuFileText,
    perms: ['view_audit_log']
  }, {
    label: 'Settings',
    href: '/admin/settings',
    icon: MdOutlineSettings,
    perms: ['manage_settings']
  }]
}];

// Decide if a nav item is visible, from the permission map and nothing else.
//
// This used to carry a `roles` array beside every `perms` list and grant the
// item if EITHER matched. That is a second permission table, and on 8
// September it disagreed with the first one in four places at once: a
// Financial Manager was offered the Users link the API refuses, an Admin was
// offered Rates, a Tournament Organizer was offered Games. A link that opens
// a 403 is worse than no link, because the person cannot tell whether they
// lack the permission or the console is broken.
//
// `permissions` comes from /auth/admin/me/, which always sends it, built from
// the same ROLE_PERMISSIONS the endpoints are decorated with. When it is
// missing the session is not answering, and the honest answer is the Dashboard
// alone rather than every section on a guess.
function canSeeItem(item, permissions) {
  if (!item.perms) return true;                 // universal (Dashboard)
  if (!permissions) return false;               // fail closed, never open
  return item.perms.some(key => permissions[key]);
}

/**
 * What a section needs, by address.
 *
 * The nav has always known this: it hides a link somebody may not use. Nothing
 * knew it at the PAGE, so typing the address opened the screen anyway. A
 * moderator reaching /admin/admins got the heading, the sentence "You do not
 * have permission to perform this action" from the refused fetch, and a live
 * "Give somebody a role" button. The API refused the data, correctly, and the
 * screen still offered the action.
 *
 * One map, read by both, so a new section cannot be hidden in the nav and open
 * at its own address.
 */
export function permsForPath(pathname) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/admin';
  let best = null;
  for (const group of NAV) {
    for (const item of group.items) {
      if (path === item.href || path.startsWith(`${item.href}/`)) {
        if (!best || item.href.length > best.href.length) best = item;
      }
    }
  }
  return best ? best.perms || null : null;
}

export default function AdminNav({
  admin,
  onLogout,
  badges = {},
  sidebarOpen = false
}) {
  const tt = useT();
  const pathname = usePathname();
  const role = admin?.role || 'support';
  const permissions = admin?.permissions || null;
  const isActive = href => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
  return <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`} id="admin-sidebar">
      {/* Logo */}
      <div className={styles.logoContainer}>
        <Link className={styles.logoLink} href="/admin">
          <div className={styles.innerLogo}>
            <Image src={logoRed} alt="V-ENT" height={25} />
          </div>
          <span className={styles.logoText}>v-ent</span>
        </Link>
      </div>

      {/* Role badge */}
      <div className={styles.roleRow}>
        <span className={`${styles.roleBadge} ${styles[`role_${role}`] || ''}`}>
          {ROLE_LABELS[role] || tt('admin.roleFallback', 'Admin')}
        </span>
        <span className={styles.roleUsername}>{admin?.username || 'admin'}</span>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {NAV.map(({
          section,
          items
        }) => {
          // Show a section if the admin can see at least one of its items.
          const visibleItems = items.filter(item => canSeeItem(item, permissions));
          if (!visibleItems.length) return null;
          return <li key={section}>
                <p className={styles.sectionLabel}>{section}</p>
                <ul className={styles.sectionList}>
                  {visibleItems.map(({
                label,
                href,
                icon: Icon,
                badge: badgeKey
              }) => <li key={href} className={`${styles.navItem} ${isActive(href) ? styles.activeItem : ''}`}>
                      <Link className={styles.navLink} href={href}>
                        <Icon className={styles.navIcon} />
                        {label}
                        {badgeKey && badges[badgeKey] > 0 && <span className={styles.navBadge}>{badges[badgeKey]}</span>}
                      </Link>
                    </li>)}
                </ul>
                <div className={styles.divider} />
              </li>;
        })}
        </ul>
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.userRow}>
          <div className={styles.userAvatar}>
            <Avatar src={mediaUrl(admin?.avatar)} name={admin?.username || 'admin'} size={36} />
          </div>
          <div className={styles.userInfo}>
            <span className={styles.username}>{admin?.username || 'admin'}</span>
            <span className={styles.userRole}>{ROLE_LABELS[role]}</span>
          </div>
          <button className={styles.logoutBtn} onClick={onLogout} title={tt("ui.logout.e43d", "Logout")}>
            <MdLogout />
          </button>
        </div>

        {/* The only way out of the console used to be Logout, which signs you
            out of everything rather than taking you back. An admin is a person
            using the site as well. */}
        <Link href="/home" className={styles.backToSite}>
          <MdArrowBack className={styles.backIcon} />
          {tt('admin.backToSite', 'Back to the site')}
        </Link>
      </div>
    </aside>;
}