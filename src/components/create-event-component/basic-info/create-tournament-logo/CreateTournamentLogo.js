'use client';

// The event's logo and banner.
//
// Same component and the same two faults as the tournament wizard's; the two
// were copies of each other and both lost the preview on a step change.
//
// Two faults were reported as "logo and banner did not save":
//
// 1. The preview lived in this component's own state. This is a wizard step, so
//    moving to another step unmounts it and coming back showed two empty boxes.
//    The file was still held by the parent and would still have been submitted,
//    but nobody believes that when the screen has gone blank - and the natural
//    response is to give up and publish without them.
//
// 2. The file was ALSO read into a base64 data URL and written into the draft,
//    which goes to localStorage. A 5MB image is about 6.8MB of base64, over the
//    5MB an origin gets, so setItem threw - and the catch around it swallowed
//    the error, losing the WHOLE draft rather than just the picture. And on a
//    reload the File itself was gone, so the submit sent no image at all while
//    a useless data URL sat in the draft.
//
// So the file and its preview both live in the parent now, and nothing about an
// image is ever written to localStorage. The preview is an object URL, revoked
// when it changes, because an object URL that is never revoked leaks every time
// somebody changes their mind.

import { useEffect, useState } from 'react';
import { FiCamera, FiX } from 'react-icons/fi';
import { checkImageFile, uploadHint } from '@/lib/uploadSpecs';
import InfoTip from '@/components/info-tip/InfoTip';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-logo.module.css';
import { useT } from '@/i18n/LanguageProvider';

/** A preview URL for a File, cleaned up after itself. */
function usePreview(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return undefined;
    }
    const made = URL.createObjectURL(file);
    setUrl(made);
    return () => URL.revokeObjectURL(made);
  }, [file]);
  return url;
}

const CreateTournamentLogo = ({ updateFileData, logoFile, bannerFile }) => {
  const tt = useT();
  const [logoError, setLogoError] = useState('');
  const [bannerError, setBannerError] = useState('');

  const logoPreview = usePreview(logoFile);
  const bannerPreview = usePreview(bannerFile);

  // Refused at the moment it is chosen, not after the whole form is filled in.
  const pick = (kind, key, setError) => (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = checkImageFile(tt, kind, file);
    if (problem) {
      setError(problem);
      updateFileData(key, null);
      return;
    }
    setError('');
    updateFileData(key, file);
  };

  const clear = (key, setError) => () => {
    setError('');
    updateFileData(key, null);
  };

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>
          {tt('ui.logo.banner.716b', 'Logo & Banner')}
        </h3>

        <div className={styles.outerLogoContainer}>
          <div className={styles.logoContainer}>
            {logoPreview && <img src={logoPreview} className={styles.logoPreviewImg} alt={tt('ui.logo.preview.c1c1', 'Logo Preview')} />}
          </div>

          <div className={styles.logoTextAndBTNContainer}>
            <div className={styles.logoUploader}>
              <label htmlFor="logoUpload" className={styles.logoUploadLabel}>
                <FiCamera className={styles.uploadIcon} /> {tt('ui.upload.logo.8a04', 'Upload Logo')}
              </label>
              <InfoTip id="teamLogo" />
              <input
                type="file"
                accept="image/*"
                onChange={pick('logo', 'tournament_logo', setLogoError)}
                id="logoUpload"
                className={styles.uploadInput}
              />
              {logoFile && (
                <button type="button" className={styles.clearBtn} onClick={clear('tournament_logo', setLogoError)}>
                  <FiX aria-hidden="true" /> {tt('ui.remove.a54e', 'Remove')}
                </button>
              )}
            </div>
            <p>{uploadHint(tt, 'logo')}</p>
            {logoError && <p className={styles.uploadError}>{logoError}</p>}
            {logoFile && <p className={styles.chosen}>{logoFile.name}</p>}
          </div>
        </div>

        <div className={styles.profileBanner}>
          <div className={styles.bannerUploader}>
            <label htmlFor="bannerUpload" className={styles.bannerUploadLabel}>
              <FiCamera className={styles.uploadIcon} /> {tt('ui.upload.banner.aad3', 'Upload Banner')}
            </label>
            <InfoTip id="teamBanner" />
            <input
              type="file"
              accept="image/*"
              onChange={pick('banner', 'tournament_banner', setBannerError)}
              id="bannerUpload"
              className={styles.uploadInput}
            />
            {bannerFile && (
              <button type="button" className={styles.clearBtn} onClick={clear('tournament_banner', setBannerError)}>
                <FiX aria-hidden="true" /> {tt('ui.remove.a54e', 'Remove')}
              </button>
            )}
          </div>
          <p className={styles.bannerHint}>{uploadHint(tt, 'banner')}</p>
          {bannerError && <p className={styles.uploadError}>{bannerError}</p>}
          {bannerPreview && <img src={bannerPreview} className={styles.bannerPreviewImg} alt={tt('ui.banner.preview.ae8f', 'Banner Preview')} />}
        </div>
      </div>
    </div>
  );
};

export default CreateTournamentLogo;
