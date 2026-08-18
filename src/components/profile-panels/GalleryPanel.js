'use client';

import { useState, useMemo } from 'react';
import styles from './GalleryPanel.module.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'events', label: 'Events' },
  { id: 'highlights', label: 'Highlights' },
];

const tagClass = (cat, styles) => {
  if (cat === 'events') return styles.tileTagEv;
  if (cat === 'highlights') return styles.tileTagHl;
  return '';
};

const GalleryPanel = ({ images = [], isOwner = false, onUpload }) => {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return images;
    return images.filter((img) => (img.category || img.cat) === filter);
  }, [images, filter]);

  return (
    <div className={styles.galleryWrap}>
      <div className={styles.galleryHead}>
        <div className={styles.filterChips}>
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f.id}
              className={`${styles.chip} ${filter === f.id ? styles.chipOn : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className={styles.galleryCount}>
          <strong>{filtered.length}</strong> photos
        </div>
      </div>

      {filtered.length === 0 && !isOwner ? (
        <div className={styles.empty}>No photos to show in this view.</div>
      ) : (
        <div className={styles.grid}>
          {isOwner && (
            <div className={styles.uploadTile} role="button" tabIndex={0} onClick={onUpload}>
              <div className={styles.uploadPlus}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className={styles.uploadLabel}>Upload Image</div>
              <div className={styles.uploadHint}>JPG, PNG · max 5MB</div>
            </div>
          )}
          {filtered.map((img, idx) => {
            const cat = img.category || img.cat || 'tournaments';
            return (
              <figure className={styles.tile} key={img.id || idx}>
                {img.url || img.src ? <img src={img.url || img.src} alt={img.caption || ''} loading="lazy" /> : null}
                <div className={styles.tileOverlay}>
                  <div>
                    <span className={`${styles.tileTag} ${tagClass(cat, styles)}`}>
                      {cat === 'events' ? 'Event' : cat === 'highlights' ? 'Highlight' : 'Tournament'}
                    </span>
                    {img.caption && <div className={styles.tileCaption}>{img.caption}</div>}
                  </div>
                </div>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GalleryPanel;
