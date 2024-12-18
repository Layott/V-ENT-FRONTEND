import { useState } from 'react';
import Image from 'next/image';
import { FaAsterisk } from "react-icons/fa6";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './sponsors.module.css';

const Sponsor = () => {
  const [logo, setLogo] = useState(null);

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogo(e.target.result); // Save the image preview URL
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    setLogo(null); // Clear the uploaded logo
  };

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Sponsors</h3>

        <div className={styles.threeBoxesContainer}>
          <div className={`${createTournamentStyles.twoBoxesInRowContainer} ${styles.twoBoxesInRowContainer}`}>
            <div className={createTournamentStyles.inputGroup}>
              <label htmlFor="sponsorName" className={createTournamentStyles.labelWithAsterisk}>
                Sponsor Name
                <span className={createTournamentStyles.asteriskSpan}>
                  <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </label>
              <input
                id="sponsorName"
                type="text"
                placeholder="Enter sponsor name"
                className={createTournamentStyles.inputText}
              />
            </div>

            <div className={createTournamentStyles.inputGroup}>
              <label htmlFor="sponsorUsername" className={createTournamentStyles.labelWithAsterisk}>
                Username
              </label>
              <input
                id="sponsorUsername"
                type="text"
                placeholder="Enter sponsor username"
                className={createTournamentStyles.inputText}
              />
            </div>
          </div>

          <div className={styles.logoUploadContainer}>
            <div
              className={styles.logoUploadBox}
              onClick={() => document.getElementById("logoUpload").click()} // Trigger file input click
            >
              {logo ? (
                <div className={styles.logoPreview}>
                  <Image
                    src={logo}
                    alt="Uploaded Logo"
                    className={styles.logoImage} 
                    width={80}
                    height={50}
                  />
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className={styles.resetButton}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className={styles.logoUploadPlaceholder}>
                  <span>Upload Logo</span>
                </div>
              )}
              {/* Completely hidden file input */}
              <input
                id="logoUpload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className={styles.hiddenInput}
              />
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default Sponsor;
