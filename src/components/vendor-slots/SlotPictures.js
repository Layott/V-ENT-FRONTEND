'use client';

import { useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { mediaUrl } from '@/lib/mediaUrl';
import ImageViewer from '@/components/image-viewer/ImageViewer';
import styles from './slot-pictures.module.css';

// What a pitch or stall will look like, for somebody deciding whether to buy
// it (inbox 419). The first picture is the cover; the rest sit under it; any of
// them opens large. Draws nothing when the organiser added none.

export const pictureAlt = (tt, name, n, total) =>
  tt('slots.pictureAlt', '{name}, picture {n} of {total}')
    .replace('{name}', name || '').replace('{n}', n).replace('{total}', total);

const SlotPictures = ({ pictures = [], name }) => {
  const tt = useT();
  const [open, setOpen] = useState(null);
  if (!pictures.length) return null;
  const images = pictures.map((p, i) => ({
    url: mediaUrl(p.url), alt: pictureAlt(tt, name, i + 1, pictures.length),
  }));

  return (
    <div className={styles.gallery}>
      <button type="button" className={styles.cover} onClick={() => setOpen(0)}
              aria-label={`${images[0].alt}. ${tt('slots.tapToEnlarge', 'Tap to enlarge')}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0].url} alt={images[0].alt} />
      </button>
      {images.length > 1 && (
        <div className={styles.thumbs}>
          {images.slice(1).map((img, i) => (
            <button type="button" key={img.url} className={styles.thumb} onClick={() => setOpen(i + 1)}
                    aria-label={`${img.alt}. ${tt('slots.tapToEnlarge', 'Tap to enlarge')}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt} />
            </button>
          ))}
        </div>
      )}
      {open !== null && <ImageViewer images={images} start={open} onClose={() => setOpen(null)} />}
    </div>
  );
};

/** The venue layout, for buyers: one picture that opens large. */
export const VenueLayoutView = ({ url, eventName }) => {
  const tt = useT();
  const [open, setOpen] = useState(false);
  if (!url) return null;
  const image = {
    url: mediaUrl(url),
    alt: tt('slots.layoutAlt', 'Where the pitches and stalls are at {event}').replace('{event}', eventName || ''),
  };
  return (
    <div className={styles.layout}>
      <p className={styles.layoutTitle}>{tt('slots.layoutTitle', 'Venue layout')}</p>
      <button type="button" className={styles.layoutButton} onClick={() => setOpen(true)}
              aria-label={`${image.alt}. ${tt('slots.tapToEnlarge', 'Tap to enlarge')}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt={image.alt} />
      </button>
      {open && <ImageViewer images={[image]} onClose={() => setOpen(false)} />}
    </div>
  );
};

export default SlotPictures;
