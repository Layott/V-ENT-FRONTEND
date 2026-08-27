'use client';

// Pick an image from this device.
//
// Replaces the "Banner image URL" text boxes. Asking somebody to paste a URL
// asks them to host the picture themselves first, which most people cannot do,
// and the ones who can often paste a link that later rots or blocks hotlinking -
// so the banner silently disappears from the event weeks after it was set.
//
// Every instance states the dimensions and the size limit up front, from the one
// table in lib/uploadSpecs, and refuses an oversized file at the moment it is
// chosen rather than after the whole form has been filled in.

import { useEffect, useRef, useState } from 'react';
import { FiCamera, FiX } from 'react-icons/fi';
import { useT } from '@/i18n/LanguageProvider';
import { ACCEPTED_IMAGE_TYPES, checkImageFile, uploadHint } from '@/lib/uploadSpecs';
import styles from './image-upload.module.css';

/**
 * @param {string}   kind      key into UPLOAD_SPECS: banner | logo | avatar | sponsorLogo | gallery | document
 * @param {File}     value     the currently chosen file, if any
 * @param {function} onChange  (file | null) => void
 * @param {string}   label     what this image is
 * @param {string}   existing  a URL already stored, shown until a new file is picked
 */
export default function ImageUpload({
  kind = 'banner',
  value,
  onChange,
  label,
  existing,
  compact = false
}) {
  const tt = useT();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  // A preview of a File is an object URL, and an object URL that is never
  // revoked is a leak that grows every time somebody changes their mind.
  useEffect(() => {
    if (!value) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);
  const pick = file => {
    if (!file) return;
    const problem = checkImageFile(tt, kind, file);
    if (problem) {
      setError(problem);
      onChange(null);
      return;
    }
    setError('');
    onChange(file);
  };
  const clear = e => {
    e.stopPropagation();
    setError('');
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };
  const shown = preview || existing || null;
  return <div className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}

      <div className={`${styles.dropArea} ${compact ? styles.compact : ''} ${shown ? styles.hasImage : ''}`} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inputRef.current?.click();
      }
    }} aria-label={label || tt('upload.choose', 'Choose an image')}>
        {shown ? <>
            {/* A plain img, not next/image: this is a local object URL whose
                dimensions are unknown until it is read. */}
            <img src={shown} alt={label || tt('upload.chosenAlt', 'The image you chose')} className={styles.preview} />
            <button type="button" className={styles.clearBtn} onClick={clear} aria-label={tt('upload.remove', 'Remove this image')}>
              <FiX />
            </button>
          </> : <div className={styles.placeholder}>
            <FiCamera className={styles.icon} />
            <span className={styles.prompt}>{tt('upload.action', 'Upload an image')}</span>
          </div>}

        <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES} className={styles.hiddenInput} onChange={e => pick(e.target.files?.[0])} />
      </div>

      <p className={styles.hint}>{uploadHint(tt, kind)}</p>
      {error && <p className={styles.error}>{error}</p>}
    </div>;
}
