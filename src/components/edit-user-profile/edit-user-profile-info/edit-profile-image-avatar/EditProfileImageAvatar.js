import Image from 'next/image';
import { MdDelete } from "react-icons/md";
import { FiCamera } from 'react-icons/fi';
import smallProfileImage from "@/images/signed_in_user_big.webp";
import avatarAnkara from "@/images/avatar_ankara.jpg";
import avatarColor from "@/images/avatar_color.webp";
import avatarBlackHair from "@/images/avatar_black_hair.webp";
import avatarPaint from "@/images/avatar_paint.webp";
import styles from './edit-profile-image-avatar.module.css';

const EditProfileImageAvatar = ({ onChange }) => {
  
  const handleImageSelect = (newImage) => {
    if (newImage.target?.files?.[0]) {
      const file = newImage.target.files[0];
      onChange((prevData) => ({
        ...prevData,
        newProfileImageURL: URL.createObjectURL(file),
      }));
    } else if (typeof newImage === "string" || typeof newImage === "object") {
      onChange((prevData) => ({
        ...prevData,
        newProfileImageURL: newImage,
      }));
    }
  };

  return (
    <div className={styles.profileImageAvatarContainer}>
      <div className={styles.profileImageContainer}>
        <div className={styles.editProfileImageContainer}>
          <Image
            src={smallProfileImage}
            alt="Profile Image"
            className={styles.editProfileImage}
          />
        </div>
        <div className={styles.changeDeleteRecommendContainer}>
          <div className={styles.changeDeleteBTNContainer}>
            <label className={`${styles.changeBTN} ${styles.editBTN}`}>
              <FiCamera /> Change
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />
            </label>
            <button className={`${styles.deleteBTN} ${styles.editBTN}`}>
              <MdDelete className={styles.deleteIcon} />
            </button>
          </div>
          <p>We recommend an image that is 256 x 256 px</p>
        </div>
      </div>
      <div className={styles.useAvatarAvatarContainer}>
        <div className={styles.useAvatarContainer}>
          <p>Or use an avatar</p>
          <button>show more</button>
        </div>
        <div className={styles.avatarContainer}>
          {[avatarAnkara, avatarColor, avatarBlackHair, avatarPaint].map((avatar, index) => (
            <div
              key={index}
              className={styles.eachAvatarContainer}
              onClick={() => handleImageSelect(avatar)}
            >
              <Image src={avatar} alt={`Avatar ${index}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EditProfileImageAvatar;
