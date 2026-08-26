import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import tableStyles from "@/styles/modules/tables/tables.module.css";
import styles from './team-members.module.css';
import { useT } from '@/i18n/LanguageProvider';
const MembersRequestsTabComponent = ({
  teamId
}) => {
  const tt = useT();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const {
    data: session
  } = useSession();
  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    const fetchRequests = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json'
        };
        if (session?.user?.sessionToken) {
          headers['Authorization'] = `Bearer ${session.user.sessionToken}`;
        }
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/join-requests/${teamId}/`, {
          method: 'GET',
          headers
        });
        if (!response.ok) throw new Error(`Failed to load requests (${response.status})`);
        const data = await response.json();
        const list = data?.data?.requests ?? data?.data ?? data ?? [];
        setRequests(Array.isArray(list) ? list : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [teamId, session]);
  const getAvatarUrl = path => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
  };
  if (loading) return <p>{tt("ui.loading.requests.4df6", "Loading requests...")}</p>;
  if (error) return <p style={{
    color: 'red'
  }}>{error}</p>;
  return <div className={styles.requestsContainer}>
      <div className={styles.controlSettingsDiv}>
        <p>
          {tt("ui.control.public.requests.join.e1bd", "Control public requests to join your team in your")} <Link className={styles.teamProfileLink} href={'./team-profile'}>{tt("ui.profile.settings.e30f", "profile settings")}</Link>
        </p>
      </div>

      {requests.length === 0 ? <p>{tt("ui.no.pending.join.requests.6317", "No pending join requests.")}</p> : <div className={styles.requestBoxesContainer}>
          {requests.map((request, index) => {
        const avatarUrl = getAvatarUrl(request.profile_pic || request.user?.profile_pic);
        const name = request.display_name || request.username || request.user?.username || 'Unknown';
        const requestId = request.id || request.request_id || index;
        return <div key={requestId} className={styles.requestBox}>
                <div className={styles.requestBoxUserDetailsContainer}>
                  <div className={styles.imageContainer}>
                    {avatarUrl ? <Image src={mediaUrl(avatarUrl)} alt={name} objectFit='cover' width={48} height={48} /> : <div style={{
                width: 48,
                height: 48,
                background: 'var(--overlay-gray)',
                borderRadius: '50%'
              }} />}
                  </div>
                  <div className={styles.requestBoxUserDetails}>
                    <p className={styles.name}>{name}</p>
                    <p className={styles.timeAgo}>{request.requested_at || request.timeAgo || ''}</p>
                    <button className={`${tableStyles.viewProfileBTN} ${styles.viewProfileBTN}`}>{tt("ui.view.profile.685e", "View Profile")}</button>
                  </div>
                </div>
                <div className={styles.btnsContainer}>
                  <button className={`redBTN ${styles.acceptBTN}`}>{tt("ui.accept.bb54", "Accept")}</button>
                  <button className={`redBTN ${styles.declineBTN}`}>{tt("ui.decline.b59c", "Decline")}</button>
                </div>
              </div>;
      })}
        </div>}
    </div>;
};
export default MembersRequestsTabComponent;