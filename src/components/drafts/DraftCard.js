import { apiMessage } from '@/lib/apiMessage';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import styles from './DraftCard.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const DraftCard = ({
  draft,
  onDelete
}) => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session
  } = useSession();
  const [showDetails, setShowDetails] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const toggleDetails = () => setShowDetails(prev => !prev);
  const handleDelete = async () => {
    if (!window.confirm(`Delete "${draft.tournament_title || 'this draft'}"? This cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/delete-draft/${draft.id}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.user?.sessionToken}`
        }
      });
      if (res.ok || res.status === 204) {
        if (onDelete) onDelete(draft.id);
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteError(apiMessage(tt, data, "api.failedToDeleteDraft", "Failed to delete draft."));
        setDeleting(false);
      }
    } catch (err) {
      console.error('Delete draft error:', err);
      setDeleteError('An error occurred. Please try again.');
      setDeleting(false);
    }
  };
  return <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleSection}>
          <h3 className={styles.tournamentTitle}>{draft.tournament_title || tx("Untitled Draft")}</h3>
          <span className={styles.statusBadge}>{tt("ui.draft.23d3", "Draft")}</span>
        </div>
        <div className={styles.cardActions}>
          <button className={styles.viewDetailsButton} onClick={toggleDetails}>
            {showDetails ? tx("Hide Details") : tx("View Details")}
          </button>
          <button className={styles.deleteButton} onClick={handleDelete} disabled={deleting}>
            {deleting ? tx("Deleting...") : 'Delete'}
          </button>
        </div>
      </div>

      {deleteError && <p className={styles.deleteError}>{deleteError}</p>}

      {showDetails && <div className={styles.detailsSection}>
          <p><strong>{tt("ui.game.b008", "Game:")}</strong> {draft.game || 'N/A'}</p>
          <p><strong>{tt("ui.format.d640", "Format:")}</strong> {draft.tournament_type || 'N/A'}</p>
          <p><strong>{tt("ui.teams.d2f1", "Teams:")}</strong> {draft.max_team || 'N/A'}</p>
          <p><strong>{tt("ui.start.date.fa4d", "Start Date:")}</strong> {draft.start_date_and_time ? new Date(draft.start_date_and_time).toLocaleString() : 'N/A'}</p>
          <p><strong>{tt("ui.end.date.5f0a", "End Date:")}</strong> {draft.end_date_and_time ? new Date(draft.end_date_and_time).toLocaleString() : 'N/A'}</p>
          <p><strong>{tt("ui.description.9b6f", "Description:")}</strong> {draft.tournament_description || tx("No description provided.")}</p>
          <Link href={`/edit-draft/${draft.id}`}>
            <button className={styles.resumeButton}>{tt("ui.resume.editing.a1e4", "Resume Editing")}</button>
          </Link>
        </div>}
    </div>;
};
export default DraftCard;