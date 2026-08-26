'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CiSearch } from 'react-icons/ci';
import { IoNotificationsOutline } from 'react-icons/io5';
import { HiOutlineMenu } from 'react-icons/hi';
import styles from './AdminHeader.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const BREADCRUMBS = {
  '/admin': 'Dashboard',
  '/admin/users': 'Users',
  '/admin/disputes': 'Disputes',
  '/admin/tournaments': 'Tournaments',
  '/admin/kyc': 'KYC Review',
  '/admin/payouts': 'Payouts',
  '/admin/audit-log': 'Audit Log',
  '/admin/settings': 'Settings'
};
export default function AdminHeader({
  admin,
  onLogout,
  onMenuOpen,
  searchValue,
  onSearch
}) {
  const tx = useTx();
  const tt = useT();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Determine breadcrumb
  const breadcrumb = (() => {
    for (const [prefix, label] of Object.entries(BREADCRUMBS).sort((a, b) => b[0].length - a[0].length)) {
      if (pathname === prefix || pathname.startsWith(prefix + '/')) return label;
    }
    return 'Admin';
  })();
  return <header className={styles.header}>
      <div className={styles.left}>
        {/* Mobile hamburger */}
        <button className={styles.hamburger} onClick={onMenuOpen} aria-label={tt("ui.open.menu.1971", "Open menu")}>
          <HiOutlineMenu />
        </button>
        <p className={styles.breadcrumb}>
          {tt("ui.admin.4eb1", "Admin\xA0/")} <span>{breadcrumb}</span>
        </p>
      </div>

      <div className={styles.right}>
        {/* Search */}
        {onSearch && <div className={styles.search}>
            <CiSearch className={styles.searchIcon} />
            <input type="text" placeholder={tt("ui.search.f54f", "Search…")} value={searchValue || ''} onChange={e => onSearch(e.target.value)} className={styles.searchInput} />
          </div>}

        {/* Notification bell */}
        <button className={styles.iconBtn}>
          <IoNotificationsOutline className={styles.bellIcon} />
          <span className={styles.notifDot} />
        </button>

        {/* Profile dropdown */}
        <div className={styles.profileWrap} ref={profileRef}>
          <button className={`${styles.profileTrigger} ${profileOpen ? styles.profileOpen : ''}`} onClick={() => setProfileOpen(v => !v)}>
            <div className={styles.adminInfo}>
              <span className={styles.adminName}>{admin?.username || 'admin'}</span>
              <span className={styles.adminRole}>{admin?.role_label || tx("Super Admin")}</span>
            </div>
            <div className={styles.avatar}>
              {(admin?.username || 'A').slice(0, 2).toUpperCase()}
            </div>
            <span className={styles.caret} />
          </button>

          {profileOpen && <div className={styles.dropdown}>
              <div className={styles.dropdownUser}>
                <p className={styles.dropdownName}>{admin?.username || 'admin'}</p>
                <p className={styles.dropdownRole}>{admin?.email || tx("admin@v-ent.gg")}</p>
              </div>
              <button className={styles.dropdownItem} onClick={() => setProfileOpen(false)}>
                {tt("ui.settings.c7f7", "Settings")}
              </button>
              <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={onLogout}>
                {tt("ui.logout.e43d", "Logout")}
              </button>
            </div>}
        </div>
      </div>
    </header>;
}