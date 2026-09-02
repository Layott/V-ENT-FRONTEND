// Team picker used during tournament registration. Wired to the live
// GET /team/my-teams/ endpoint (Bearer). The BE serializer emits every
// field-name variant the FE reads (id, name, team_logo/logo, member_count/
// members, game/core_game), so we normalise defensively below.
import Link from 'next/link';
import { apiMessage } from '@/lib/apiMessage';
import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import styles from './team.module.css';
import fallbackLogo from '@/images/signed_in_user_big.webp';
import { ventFetch, API, tokenFrom } from '@/components/tournament-lib/tournamentApi';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Coerce a raw team payload into the shape this modal renders. Keeps the real
// `id` so the downstream Payment step can send `team_id`.
const normalizeTeam = t => ({
  id: t?.id ?? t?.team_id ?? t?.pk,
  name: t?.name || t?.team_name || 'Unnamed Team',
  game: t?.game || t?.core_game || t?.game_name || '',
  members: t?.member_count ?? (Array.isArray(t?.members) ? t.members.length : t?.members) ?? 0,
  logo: t?.team_logo || t?.logo || t?.logo_url || null,
  raw: t
});
const ChooseTeamModal = ({
  isOpen,
  onClose,
  onProceed,
  onBack
}) => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session
  } = useSession();
  const token = tokenFrom(session);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await ventFetch(API.TEAM.MY_TEAMS, {
          token
        });
        const list = Array.isArray(data) ? data : data?.teams || data?.results || [];
        const normalized = (Array.isArray(list) ? list : []).map(normalizeTeam).filter(t => t.id != null);
        if (!cancelled) {
          setTeams(normalized);
          setSelectedTeam(normalized[0] || null);
        }
      } catch (err) {
        if (!cancelled) {
          setTeams([]);
          setError(apiMessage(tt, err, "api.couldNotLoadYourTeams", "Could not load your teams."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, token]);
  const filteredTeams = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(team => team.name.toLowerCase().includes(q) || (team.game || '').toLowerCase().includes(q));
  }, [teams, searchTerm]);
  const handleTeamSelect = team => setSelectedTeam(team);
  const handleProceed = () => {
    if (selectedTeam && onProceed) onProceed(selectedTeam);
  };
  const handleBack = () => {
    setSelectedTeam(null);
    setSearchTerm('');
    if (onBack) onBack();
  };
  const handleClose = () => {
    setSelectedTeam(null);
    setSearchTerm('');
    if (onClose) onClose();
  };
  if (!isOpen) return null;
  return <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <button className={styles.backButton} onClick={handleBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5m7-7l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h2 className={styles.modalTitle}>{tt("ui.choose.team.dafe", "Choose Your Team")}</h2>
          </div>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.subtitle}>{tt("ui.can.only.use.one.2556", "You can only use one team at a time.")}</p>

          <div className={styles.teamsHeader}>
            <span className={styles.teamsCount}>{teams.length} {tt("ui.team.d251", "team")}{teams.length !== 1 ? 's' : ''}</span>
            <Link href="/teams/create-team" className={styles.newTeamButton}>
              <span className={styles.plusIcon}>+</span> {tt("ui.new.team.235b", "New Team")}
            </Link>
          </div>

          <div className={styles.searchContainer}>
            <div className={styles.searchInputWrapper}>
              <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" />
              </svg>
              <input type="text" placeholder={tt("ui.search.teams.2674", "Search teams")} className={styles.searchInput} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className={styles.teamsContainer}>
            {loading ? <p className={styles.subtitle} style={{
            textAlign: 'center',
            padding: '1.5rem 0'
          }}>{tt("ui.loading.teams.a069", "Loading your teams…")}</p> : error ? <p className={styles.subtitle} style={{
            textAlign: 'center',
            padding: '1.5rem 0'
          }}>{error}</p> : filteredTeams.length === 0 ? <p className={styles.subtitle} style={{
            textAlign: 'center',
            padding: '1.5rem 0'
          }}>
                {teams.length === 0 ? tx("You're not in any teams yet. Create a team to register as a team.") : tx("No teams match your search.")}
              </p> : filteredTeams.map(team => <button key={team.id} className={`${styles.teamCard} ${selectedTeam?.id === team.id ? styles.selected : ''}`} onClick={() => handleTeamSelect(team)}>
                  <div className={styles.teamInfo}>
                    <div className={styles.teamImage}>
                      {/* Plain img keeps remote backend/CDN logos working without
                          next/image domain config; falls back to the bundled avatar. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(team.logo || fallbackLogo.src)} alt={team.name} width={60} height={60} style={{
                  objectFit: 'cover',
                  borderRadius: '8px'
                }} />
                    </div>
                    <div className={styles.teamDetails}>
                      <h3 className={styles.teamName}>{team.name}</h3>
                      <div className={styles.teamMeta}>
                        {team.game && <span className={styles.gameInfo}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                              <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" />
                              <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            {team.game}
                          </span>}
                        <span className={styles.membersInfo}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
                            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          {team.members} {tt("ui.members.1cb4", "Members")}
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedTeam?.id === team.id && <div className={styles.checkmark}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>}
                </button>)}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={handleClose}>
            {tt("ui.cancel.77df", "Cancel")}
          </button>
          <button className={`${styles.proceedButton} ${!selectedTeam ? styles.disabled : ''}`} onClick={handleProceed} disabled={!selectedTeam}>
            {tt("ui.proceed.34e5", "Proceed →")}
          </button>
        </div>
      </div>
    </div>;
};
export default ChooseTeamModal;