'use client';

import { appLocale } from '@/lib/appLocale';
import { apiMessage } from '@/lib/apiMessage';
import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { LuCheck, LuX, LuClock } from 'react-icons/lu';
import styles from './team-profile.module.css';
import { useT } from '@/i18n/LanguageProvider';
const TeamProfileRequests = ({
  team,
  onToast
}) => {
  const tt = useT();
  const {
    data: session
  } = useSession();
  const [requests, setRequests] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!session?.user?.sessionToken) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const headers = {
          'Content-Type': 'application/json'
        };
        if (session?.user?.sessionToken) headers['Authorization'] = `Bearer ${session.user.sessionToken}`;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/join-requests/${team.id}/`, {
          headers
        });
        const data = await res.json();
        if (!mounted) return;
        setRequests(data?.data?.requests || []);
        setInvites(data?.data?.invites_sent || []);
      } catch {
        if (mounted) onToast?.('Failed to load requests');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [team.id, session, onToast]);
  const fmtDate = d => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString(appLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  const action = async path => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            Authorization: `Bearer ${session.user.sessionToken}`
          })
        },
        body: JSON.stringify({})
      });
      return await res.json();
    } catch {
      return {
        status: 'error',
        message: 'Network error'
      };
    }
  };
  const approve = async req => {
    const data = await action(`/team/accept-request/${req.id}/`);
    if (data?.status === 'success') {
      setRequests(prev => prev.filter(r => r.id !== req.id));
      onToast?.(`Approved ${req.applicant?.username || 'applicant'}`);
    } else {
      onToast?.(apiMessage(tt, data, "api.failed", "Failed"));
    }
  };
  const reject = async req => {
    const data = await action(`/team/reject-request/${req.id}/`);
    if (data?.status === 'success') {
      setRequests(prev => prev.filter(r => r.id !== req.id));
      onToast?.(`Rejected ${req.applicant?.username || 'applicant'}`);
    } else {
      onToast?.(apiMessage(tt, data, "api.failed", "Failed"));
    }
  };
  if (loading) {
    return <section className={styles.panel}>
        <p className={styles.stateText}>{tt("ui.loading.requests.1f8b", "Loading requests…")}</p>
      </section>;
  }
  return <div className={styles.requestsContainer}>
      <section className={styles.panel}>
        <div className={styles.tableHeader}>
          <h3 className={styles.panelTitle}>
            {tt("ui.pending.join.requests.c7c4", "Pending join requests")} <span className={styles.countPill}>{requests.length}</span>
          </h3>
        </div>

        {requests.length === 0 ? <p className={styles.stateText}>{tt("ui.no.pending.requests.aeed", "No pending requests.")}</p> : <div className={styles.requestList}>
            {requests.map(r => <div key={r.id} className={styles.requestCard}>
                <div className={styles.memberCell}>
                  <div className={styles.memberAvatar}>
                    {r.applicant?.avatar ? <Image src={mediaUrl(r.applicant.avatar)} alt="" aria-hidden="true" width={48} height={48} /> : <div className={styles.avatarFallback} />}
                  </div>
                  <div>
                    <p className={styles.memberName}>{r.applicant?.full_name || r.applicant?.username}</p>
                    <p className={styles.memberHandle}>@{r.applicant?.username} {tt("ui.rank.f371", "· Rank #")}{r.applicant?.rank || '-'}</p>
                  </div>
                </div>

                <p className={styles.requestMessage}>{r.message}</p>

                <div className={styles.requestFooter}>
                  <span className={styles.requestTime}><LuClock /> {fmtDate(r.created_at)}</span>
                  <div className={styles.requestActions}>
                    <button type="button" className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={() => reject(r)}>
                      <LuX /> {tt("ui.reject.2b03", "Reject")}
                    </button>
                    <button type="button" className={`${styles.miniBtn} ${styles.miniBtnSuccess}`} onClick={() => approve(r)}>
                      <LuCheck /> {tt("ui.approve.7b2c", "Approve")}
                    </button>
                  </div>
                </div>
              </div>)}
          </div>}
      </section>

      <section className={styles.panel}>
        <div className={styles.tableHeader}>
          <h3 className={styles.panelTitle}>
            {tt("ui.invites.sent.8b8c", "Invites sent")} <span className={styles.countPill}>{invites.length}</span>
          </h3>
        </div>

        {invites.length === 0 ? <p className={styles.stateText}>{tt("ui.no.outgoing.invites.6dd2", "No outgoing invites.")}</p> : <div className={styles.requestList}>
            {invites.map(i => <div key={i.id} className={styles.requestCard}>
                <div className={styles.memberCell}>
                  <div className={styles.memberAvatar}>
                    {i.invited_by?.avatar ? <Image src={mediaUrl(i.invited_by.avatar)} alt="" aria-hidden="true" width={48} height={48} /> : <div className={styles.avatarFallback} />}
                  </div>
                  <div>
                    <p className={styles.memberName}>@{i.invited_user?.username}</p>
                    <p className={styles.memberHandle}>{tt("ui.role.offered.f27e", "Role offered:")} {i.role}</p>
                  </div>
                </div>
                <p className={styles.requestMessage}>{i.message}</p>
                <div className={styles.requestFooter}>
                  <span className={styles.requestTime}><LuClock /> {tt("ui.sent.35f4", "Sent")} {fmtDate(i.created_at)}</span>
                  <span className={`${styles.statusBadge} ${styles.statusUpcoming}`}>{i.status}</span>
                </div>
              </div>)}
          </div>}
      </section>
    </div>;
};
export default TeamProfileRequests;