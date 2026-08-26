'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { MdOutlineDashboard, MdLogout, MdOutlineSettings, MdGavel } from 'react-icons/md';
import { LuUsers, LuShield, LuFileText } from 'react-icons/lu';
import { RiTrophyLine } from 'react-icons/ri';
import { IoWalletOutline } from 'react-icons/io5';
import logoRed from '@/images/logo_mark_red.svg';
import styles from './AdminNav.module.css';
import { useT } from '@/i18n/LanguageProvider';
const ROLE_LABELS = {
  super: 'Super Admin',
  finance: 'Finance',
  moderator: 'Moderator',
  support: 'Support'
};

// Nav items carry BOTH a `roles` array (short-alias fallback map) and a `perms`
// list (permission keys from admin.permissions). `roles: null` = every admin.
// `perms: null` on Dashboard = every authenticated admin always sees it.
const NAV = [{
  section: 'Overview',
  items: [{
    label: 'Dashboard',
    href: '/admin',
    icon: MdOutlineDashboard,
    roles: null,
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
    roles: ['super', 'moderator', 'finance', 'support'],
    perms: ['view_users'],
    badge: 'users'
  }, {
    label: 'Tournaments',
    href: '/admin/tournaments',
    icon: RiTrophyLine,
    roles: ['super', 'moderator'],
    perms: ['cancel_tournament', 'override_match_score', 'resolve_dispute']
  }, {
    label: 'Disputes',
    href: '/admin/disputes',
    icon: MdGavel,
    roles: ['super', 'moderator'],
    perms: ['resolve_dispute'],
    badge: 'disputes'
  }, {
    label: 'KYC Review',
    href: '/admin/kyc',
    icon: LuShield,
    roles: ['super', 'moderator', 'finance', 'support'],
    perms: ['list_kyc', 'approve_kyc', 'reject_kyc'],
    badge: 'kyc'
  }]
}, {
  section: 'Finance',
  items: [{
    label: 'Payouts',
    href: '/admin/payouts',
    icon: IoWalletOutline,
    roles: ['super', 'finance'],
    perms: ['list_payouts', 'approve_payouts'],
    badge: 'payouts'
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
    roles: ['super'],
    perms: ['manage_admins']
  }]
}, {
  section: 'System',
  items: [{
    label: 'Audit Log',
    href: '/admin/audit-log',
    icon: LuFileText,
    roles: ['super', 'moderator', 'finance', 'support'],
    perms: ['view_audit_log']
  }, {
    label: 'Settings',
    href: '/admin/settings',
    icon: MdOutlineSettings,
    roles: ['super'],
    perms: ['manage_admins']
  }]
}];

// Decide if a nav item is visible. Prefer the permission bool-map when present
// (any matching permission grants the item); always fall back to the role map so
// a valid role never loses access. Dashboard (perms:null, roles:null) is universal.
function canSeeItem(item, role, permissions) {
  if (!item.roles && !item.perms) return true; // universal (Dashboard)
  if (permissions && item.perms && item.perms.some(k => permissions[k])) return true;
  if (!item.roles) return true;
  return item.roles.includes(role);
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
          {ROLE_LABELS[role] || 'Admin'}
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
          const visibleItems = items.filter(item => canSeeItem(item, role, permissions));
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
            {(admin?.username || 'A').slice(0, 2).toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.username}>{admin?.username || 'admin'}</span>
            <span className={styles.userRole}>{ROLE_LABELS[role]}</span>
          </div>
          <button className={styles.logoutBtn} onClick={onLogout} title={tt("ui.logout.e43d", "Logout")}>
            <MdLogout />
          </button>
        </div>
      </div>
    </aside>;
}