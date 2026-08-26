import { mediaUrl } from '@/lib/mediaUrl';
import Link from 'next/link';
import { useState } from 'react';
import { FiCamera, FiEdit3 } from 'react-icons/fi';
import { IoLocationOutline } from 'react-icons/io5';
import Image from 'next/image';
import teamProfileAvatar from "@/images/teamProfileAvatar.webp";
import styles from './team-profile-bio.module.css';
import { useT } from '@/i18n/LanguageProvider';
const TeamProfileBio = () => {
  const tt = useT();
  const [isEditing, setIsEditing] = useState(false);
  const handleProfileImageUploader = () => {
    // 
  };
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };
  return <div className={styles.profileBioContainer}>
        <div className={styles.profileBioHeader}>
            <div className={styles.profileBioInfo}>
                <div className={styles.profileImageContainer}>
                    <Image src={mediaUrl(teamProfileAvatar)} alt={tt("ui.team.profile.avatar.7990", "Team Profile Avatar")} />

                    <div className={styles.profileImageUpload}>
                        <label htmlFor="profileImageUpload" className={styles.profileImageUploadLabel}>
                            <FiCamera className={styles.uploadIcon} />
                        </label>
                        <input type="file" accept="image/*" onChange={handleProfileImageUploader} id="profileImageUpload" className={styles.uploadInput} />
                    </div>

                </div>
                <div className={styles.profileDetailsContainer}>
                    <div className={styles.profileDetails}>
                        <h1 className={styles.profileFullName}>{tt("ui.nathan.drake.jonathan.emmanuel.e1a3", "Nathan Drake Jonathan Emmanuel")}</h1>
                        <p className={styles.profileUsernameHandle}>{tt("ui.frostbite.b391", "@frostbite")}</p>
                        <p className={styles.userLocation}><IoLocationOutline />
                            <span className={styles.userLocationState}>{tt("ui.lagos.b622", "Lagos")}</span>,
                            &nbsp;
                            <span className={styles.userLocationCountry}>{tt("ui.nigeria.9742", "Nigeria")}</span>
                        </p>
                    </div>

                    <div className={styles.profileEditButtonContainer}>
                        <Link href={'/edit-team-profile'} onClick={toggleEditMode} className={styles.editButtonLink}>
                            <FiEdit3 className={styles.editIcon} />
                            {tt("ui.edit.team.profile.839a", "Edit Team Profile")}

                        </Link>
                    </div>

                </div>

            </div>
        </div>

        <div className={styles.profileDescription}>
            <p className={styles.bioParagraph}>
                {tt("ui.passionate.gamer.with.sharp.9557", "Passionate gamer with a sharp eye for detail, always on the lookout for the next big win. Whether it's dominating in-game or leveling up your project with killer design, I'm here to make it happen. Let's team up and create something epic!")}
            </p>
        </div>

    </div>;
};
export default TeamProfileBio;