import { useState } from 'react';
import Link from 'next/link';
import styles from './DraftCard.module.css';

const DraftCard = ({ draft }) => {
  const [showDetails, setShowDetails] = useState(false);

  const toggleDetails = () => setShowDetails(prev => !prev);

  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleSection}>
          <h3 className={styles.tournamentTitle}>{draft.tournament_title || 'Untitled Draft'}</h3>
          <span className={styles.statusBadge}>Draft</span>
        </div>
        <button className={styles.viewDetailsButton} onClick={toggleDetails}>
          {showDetails ? 'Hide Details' : 'View Details'}
        </button>
      </div>

      {showDetails && (
        <div className={styles.detailsSection}>
          <p><strong>Game:</strong> {draft.game || 'N/A'}</p>
          <p><strong>Format:</strong> {draft.tournament_type || 'N/A'}</p>
          <p><strong>Teams:</strong> {draft.max_team || 'N/A'}</p>
          <p><strong>Start Date:</strong> {draft.start_date_and_time ? new Date(draft.start_date_and_time).toLocaleString() : 'N/A'}</p>
          <p><strong>End Date:</strong> {draft.end_date_and_time ? new Date(draft.end_date_and_time).toLocaleString() : 'N/A'}</p>
          <p><strong>Description:</strong> {draft.tournament_description || 'No description provided.'}</p>
          <Link href={`/edit-draft/${draft.id}`}>
            <button className={styles.resumeButton}>Resume Editing</button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default DraftCard;
