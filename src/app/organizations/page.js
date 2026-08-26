'use client';

import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { CiSearch } from 'react-icons/ci';
import { TiArrowSortedDown } from 'react-icons/ti';
import { FiPlus } from 'react-icons/fi';
import { FaCheckCircle, FaUsers, FaTrophy, FaRegStar } from 'react-icons/fa';
import { LuMapPin } from 'react-icons/lu';
import { MdBusiness } from 'react-icons/md';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './organizations.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const TABS = [{
  id: 'all',
  label: 'All'
}, {
  id: 'verified',
  label: 'Verified'
}, {
  id: 'mine',
  label: 'My Orgs'
}];
const REGIONS = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'All Africa'];
const FOCUS_OPTIONS = [{
  id: 'esports',
  label: 'Esports'
}, {
  id: 'events',
  label: 'Events'
}, {
  id: 'streaming',
  label: 'Streaming'
}, {
  id: 'agency',
  label: 'Agency'
}];
const OrganizationsContent = () => {
  const tx = useTx();
  const tt = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    data: session
  } = useSession();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all');
  const [region, setRegion] = useState(searchParams.get('region') || '');
  const [focus, setFocus] = useState(searchParams.get('focus') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingApplications, setPendingApplications] = useState({});
  const [toast, setToast] = useState(searchParams.get('created') === 'true' ? 'Organization created - welcome to the roster.' : '');
  const showToast = msg => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  };
  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (region) params.set('region', region);
      if (focus) params.set('focus', focus);
      if (verifiedOnly || activeTab === 'verified') params.set('verified', 'true');
      const headers = {
        'Content-Type': 'application/json'
      };
      if (session?.user?.sessionToken) {
        headers['Authorization'] = `Bearer ${session.user.sessionToken}`;
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/list/?${params.toString()}`, {
        headers
      });
      if (!res.ok) throw new Error(`Failed to load organizations (${res.status})`);
      const data = await res.json();
      const list = data?.data?.organizations ?? data?.data ?? data ?? [];
      setOrganizations(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [search, region, focus, verifiedOnly, activeTab, session]);
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Sync filters/tab to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'all') params.set('tab', activeTab);
    if (region) params.set('region', region);
    if (focus) params.set('focus', focus);
    if (verifiedOnly) params.set('verified', 'true');
    if (search) params.set('search', search);
    const qs = params.toString();
    router.replace(`/organizations${qs ? `?${qs}` : ''}`, {
      scroll: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, region, focus, verifiedOnly, search]);

  // Auto-clear "created" toast and remove flag from URL
  useEffect(() => {
    if (toast && searchParams.get('created') === 'true') {
      const t = window.setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('created');
        const qs = params.toString();
        router.replace(`/organizations${qs ? `?${qs}` : ''}`, {
          scroll: false
        });
      }, 2400);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  // The API answers with my_role for the signed-in viewer; owner beats
  // everything else because owners manage rather than join.
  const isMine = org => org?.my_role === 'owner' || org?.owner === session?.user?.username || org?.owner?.username === session?.user?.username;
  const isMember = org => ['member', 'manager', 'admin'].includes(org?.my_role);
  const filteredByTab = organizations.filter(org => {
    if (activeTab === 'verified') return org.verified;
    if (activeTab === 'mine') return isMine(org);
    return true;
  });
  const handleApply = async orgId => {
    setPendingApplications(s => ({
      ...s,
      [orgId]: 'loading'
    }));
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/apply/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            Authorization: `Bearer ${session.user.sessionToken}`
          })
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setPendingApplications(s => ({
          ...s,
          [orgId]: 'pending'
        }));
        showToast(tt("msg.applicationSentAwaitingApproval", "Application sent - awaiting approval."));
      } else {
        setPendingApplications(s => ({
          ...s,
          [orgId]: null
        }));
        showToast(data?.message || tt("api.applicationFailed", "Application failed"));
      }
    } catch {
      setPendingApplications(s => ({
        ...s,
        [orgId]: null
      }));
      showToast(tt("msg.networkError", "Network error"));
    }
  };
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>{tt("ui.organizations.0760", "Organizations")}</h1>
              <p className={styles.pageSubtitle}>
                {tt("ui.pro.esports.orgs.event.a6a9", "Pro esports orgs, event companies, streamers and agencies running competitive gaming across Africa.")}
              </p>
            </div>
            <Link href={'/organizations/create'} className={styles.createBtn}>
              <FiPlus className={styles.plusIcon} /> {tt("ui.create.organization.a194", "Create Organization")}
            </Link>
          </div>

          <div className={styles.tabsRow}>
            {TABS.map(t => <button key={t.id} type="button" className={`${styles.tabBTN} ${activeTab === t.id ? styles.activeTab : ''}`} onClick={() => setActiveTab(t.id)}>
                {tx(t.label)}
              </button>)}
          </div>

          <div className={styles.filtersRow}>
            <div className={styles.searchBar}>
              <CiSearch className={styles.searchIcon} />
              <input type="text" placeholder={tt("ui.search.organizations.3568", "Search organizations…")} value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
            </div>

            <div className={styles.filterSelect}>
              <select value={region} onChange={e => setRegion(e.target.value)} className={styles.select}>
                <option value="">{tt("ui.all.regions.3fc0", "All regions")}</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <TiArrowSortedDown className={styles.selectCaret} />
            </div>

            <div className={styles.filterSelect}>
              <select value={focus} onChange={e => setFocus(e.target.value)} className={styles.select}>
                <option value="">{tt("ui.all.focus.70e8", "All focus")}</option>
                {FOCUS_OPTIONS.map(f => <option key={f.id} value={f.id}>{tx(f.label)}</option>)}
              </select>
              <TiArrowSortedDown className={styles.selectCaret} />
            </div>

            <label className={styles.toggleLabel}>
              <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} className={styles.toggleInput} />
              <span className={styles.toggleSlider} />
              <span className={styles.toggleText}>{tt("ui.verified.only.6ee7", "Verified only")}</span>
            </label>
          </div>

          {loading && <div className={styles.cardGrid}>
              {Array.from({
            length: 6
          }).map((_, i) => <div key={i} className={`${styles.card} ${styles.skeleton}`}>
                  <div className={styles.cardBanner} />
                  <div className={styles.cardLogoWrap}><div className={styles.cardLogo} /></div>
                  <div className={styles.cardBody}>
                    <div className={styles.skeletonLine} style={{
                width: '55%'
              }} />
                    <div className={styles.skeletonLine} style={{
                width: '78%'
              }} />
                    <div className={styles.skeletonLine} style={{
                width: '40%'
              }} />
                  </div>
                </div>)}
            </div>}

          {!loading && error && <p className={styles.errorText}>{error}</p>}

          {!loading && !error && filteredByTab.length === 0 && <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>{tt("ui.no.organizations.found.d94f", "No organizations found")}</p>
              <p className={styles.emptySub}>
                {activeTab === 'mine' ? tx("You haven't created or joined an org yet.") : tx("Try adjusting your filters or search.")}
              </p>
              <Link href="/organizations/create" className={styles.emptyCta}>
                <FiPlus className={styles.plusIcon} /> {tt("ui.create.organization.4370", "Create organization")}
              </Link>
            </div>}

          {!loading && !error && filteredByTab.length > 0 && <div className={styles.cardGrid}>
              {filteredByTab.map(org => {
            const orgId = org.id;
            const owned = isMine(org);
            const member = isMember(org);
            const reqState = pendingApplications[orgId] || (org.has_pending_request ? 'pending' : null);
            return <div key={orgId} className={styles.card}>
                    <div className={styles.cardBanner}>
                      {org.banner ? <Image src={mediaUrl(org.banner)} alt={`${org.name} banner`} fill sizes="(max-width: 768px) 100vw, 33vw" style={{
                  objectFit: 'cover'
                }} /> : <div className={styles.placeholderBanner} />}
                      {org.verified && <span className={styles.verifiedBadge}>
                          <FaCheckCircle /> {tt("ui.verified.aed3", "Verified")}
                        </span>}
                      {owned && <span className={styles.ownerBadge}>{tt("ui.owner.89ff", "Owner")}</span>}
                    </div>

                    <div className={styles.cardLogoWrap}>
                      {org.logo ? <Image src={mediaUrl(org.logo)} alt={`${org.name} logo`} width={56} height={56} className={styles.cardLogo} /> : <div className={`${styles.cardLogo} ${styles.placeholderLogo}`}>
                          <MdBusiness />
                        </div>}
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.cardHeader}>
                        <h2 className={styles.orgName}>{org.name}</h2>
                        <span className={styles.orgTag}>{org.tag}</span>
                      </div>

                      <p className={styles.orgBio}>{org.bio}</p>

                      <div className={styles.cardMeta}>
                        <span className={styles.metaItem}>
                          <LuMapPin className={styles.metaIcon} /> {org.region}
                        </span>
                        {org.focus && <span className={styles.focusPill}>{org.focus}</span>}
                      </div>

                      <div className={styles.statsRow}>
                        <div className={styles.statBlock}>
                          <span className={styles.statValue}>
                            <FaUsers className={styles.statIcon} /> {org.member_count}
                          </span>
                          <span className={styles.statLabel}>{tt("ui.members.1cb4", "Members")}</span>
                        </div>
                        <div className={styles.statBlock}>
                          <span className={styles.statValue}>
                            <FaTrophy className={styles.statIcon} /> {org.total_tournaments_hosted ?? org.tournaments_hosted ?? 0}
                          </span>
                          <span className={styles.statLabel}>{tt("ui.hosted.87d6", "Hosted")}</span>
                        </div>
                      </div>

                      <div className={styles.cardActions}>
                        <Link href={`/organizations/${orgId}`} className={`${styles.actionBtn} ${styles.actionSecondary}`}>
                          {tt("ui.view.69bd", "View")}
                        </Link>
                        {owned ? <Link href={`/organizations/${orgId}/manage`} className={`${styles.actionBtn} ${styles.actionPrimary}`}>
                            {tt("ui.manage.bf58", "Manage")}
                          </Link> : member ? <span className={`${styles.actionBtn} ${styles.actionDisabled}`}>
                            {tt("ui.member.6853", "Member")}
                          </span> : reqState === 'pending' ? <button type="button" className={`${styles.actionBtn} ${styles.actionDisabled}`} disabled>
                            {tt("ui.pending.96f6", "Pending")}
                          </button> : <button type="button" className={`${styles.actionBtn} ${styles.actionPrimary}`} disabled={reqState === 'loading'} onClick={() => handleApply(orgId)}>
                            {reqState === 'loading' ? tx("Sending...") : 'Join'}
                          </button>}
                      </div>
                    </div>
                  </div>;
          })}
            </div>}
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}><FaRegStar /> {toast}</div>}
    </div>;
};
const Organizations = () => {
  const tt = useT();
  return <Suspense fallback={<p style={{
    padding: '2rem',
    color: '#fff'
  }}>{tt("ui.loading.33ce", "Loading…")}</p>}>
    <OrganizationsContent />
  </Suspense>;
};
export default Organizations;