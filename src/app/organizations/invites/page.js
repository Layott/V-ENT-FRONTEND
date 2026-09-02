'use client';

import { apiMessage } from '@/lib/apiMessage';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { LuArrowLeft } from 'react-icons/lu';
import { FiCheck, FiX } from 'react-icons/fi';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import UserChip from '@/components/user-chip/UserChip';
import { mediaUrl } from '@/lib/mediaUrl';
import { appLocale } from '@/lib/appLocale';
import { useT } from '@/i18n/LanguageProvider';
import styles from './invites.module.css';

// `/organizations/invites` - where an invitation actually lands. Without this
// the notification pointed at a page that did not exist, and an invite could
// be sent and never answered.
const OrgInvitesPage = () => {
  const tt = useT();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [problem, setProblem] = useState('');
  const token = session?.user?.sessionToken || null;

  // Literal keys. tx() looks a key up by its English text and finds whichever
  // was defined first, so "Teams" resolved to nothing and stayed English beside
  // three translated words.
  const roleWord = role => ({
    owner: tt('ui.org.role.owner.5d18', 'owner'),
    admin: tt('ui.org.role.admin.2c47', 'admin'),
    manager: tt('ui.org.role.manager.9b03', 'manager'),
    member: tt('ui.org.role.member.7e56', 'member'),
  }[role] || role);
  const scopeWord = scope => ({
    teams: tt('ui.scope.teams.6b12', 'Teams'),
    events: tt('ui.scope.events.9d47', 'Events'),
    tournaments: tt('ui.scope.tournaments.2f83', 'Tournaments'),
    clubs: tt('ui.scope.clubs.4a06', 'Clubs'),
  }[scope] || scope);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/invites/mine/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => null);
      if (body?.status === 'success') setInvites(body.data.invites || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!token) { router.replace('/login?next=/organizations/invites'); return; }
    load();
  }, [status, token, load, router]);

  const respond = async (invite, accept) => {
    setBusy(invite.token);
    setProblem('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/organization/invite/${invite.token}/respond/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ accept }),
        });
      const body = await res.json().catch(() => null);
      if (body?.status !== 'success') {
        setProblem(apiMessage(tt, body, 'ui.invite.failed.3c81', 'That did not go through.'));
        return;
      }
      setInvites(prev => prev.filter(i => i.token !== invite.token));
      if (accept) router.push(`/organizations/${invite.organization.slug}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Header /><MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <Link href="/organizations" className={styles.backChip}>
            <LuArrowLeft /> {tt('ui.back.organizations.5a72', 'Back to organizations')}
          </Link>
          <h1 className={styles.pageTitle}>{tt('ui.your.invites.9d14', 'Your invites')}</h1>
          <p className={styles.pageSubtitle}>
            {tt('ui.invites.subtitle.2e60', 'Each one already names the role you would join with.')}
          </p>

          {problem && <p className={styles.problem} role="alert">{problem}</p>}

          {loading ? (
            <>
              <div className={styles.skeletonCard} />
              <div className={styles.skeletonCard} />
            </>
          ) : invites.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>
                {tt('ui.no.pending.invites.8b03', 'No invites waiting for you.')}
              </p>
              <Link href="/organizations" className={styles.emptyLink}>
                {tt('ui.browse.organizations.7a55', 'Browse organizations')}
              </Link>
            </div>
          ) : (
            <ul className={styles.list}>
              {invites.map(i => (
                <li key={i.token} className={styles.card}>
                  <div className={styles.cardHead}>
                    <div className={styles.orgLogo}>
                      {i.organization.logo && (
                        <Image src={mediaUrl(i.organization.logo)} alt={i.organization.name}
                               width={44} height={44} />
                      )}
                    </div>
                    <div className={styles.cardText}>
                      <Link href={`/organizations/${i.organization.slug}`} className={styles.orgName}>
                        {i.organization.name}
                      </Link>
                      <span className={styles.cardMeta}>
                        {tt('ui.invited.you.as.4f27', 'invited you as')} <strong>{roleWord(i.role)}</strong>
                        {i.scopes?.length ? ` · ${i.scopes.map(scopeWord).join(', ')}` : ''}
                      </span>
                    </div>
                    <span className={styles.cardWhen}>
                      {new Date(i.created_at).toLocaleDateString(appLocale(), {
                        day: 'numeric', month: 'short',
                      })}
                    </span>
                  </div>

                  {i.invited_by && (
                    <div className={styles.byLine}>
                      <span className={styles.byLabel}>{tt('ui.sent.by.6c39', 'Sent by')}</span>
                      <UserChip user={i.invited_by} size={22} />
                    </div>
                  )}
                  {i.message && <p className={styles.message}>&ldquo;{i.message}&rdquo;</p>}

                  <div className={styles.actions}>
                    <button type="button" className={styles.acceptBtn} disabled={busy === i.token}
                            onClick={() => respond(i, true)}>
                      <FiCheck /> {tt('ui.accept.1b47', 'Accept')}
                    </button>
                    <button type="button" className={styles.declineBtn} disabled={busy === i.token}
                            onClick={() => respond(i, false)}>
                      <FiX /> {tt('ui.decline.0e82', 'Decline')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

export default OrgInvitesPage;
