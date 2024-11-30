import Image from 'next/image';
import { useState, useEffect } from 'react';
import { MdDelete } from "react-icons/md";
import { FiCamera } from 'react-icons/fi';
import avatarAnkara from "@/images/avatar_ankara.jpg";
import avatarColor from "@/images/avatar_color.webp";
import avatarBlackHair from "@/images/avatar_black_hair.webp";
import avatarPaint from "@/images/avatar_paint.webp";
import styles from './edit-profile-image-avatar.module.css';

const EditProfileImageAvatar = ({ onChange }) => {
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem('userProfile');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setProfileImage(parsedData?.profile_picture || null);
      }
    } catch (error) {
      console.error("Failed to load profile picture from localStorage:", error);
    }
  }, []);
  

  // Handle image file selection
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);
      onChange(file); // Pass the file directly
    }
  };

  // Handle avatar selection and convert to a binary File object
  const handleAvatarSelect = async (avatarSrc) => {
    try {
      const response = await fetch(avatarSrc);
      const blob = await response.blob();
      const file = new File([blob], "avatar.jpg", { type: blob.type });
      setProfileImage(avatarSrc); // Update the preview
      onChange(file); // Send the binary file to the parent
    } catch (error) {
      console.error("Failed to fetch avatar as binary:", error);
    }
  };

  return (
    <div className={styles.profileImageAvatarContainer}>
      <div className={styles.profileImageContainer}>
        <div className={styles.editProfileImageContainer}>
          <Image
            src={profileImage || avatarAnkara}
            alt="Profile Image"
            className={styles.editProfileImage}
            width={256}
            height={256}
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
            <button
              className={`${styles.deleteBTN} ${styles.editBTN}`}
              onClick={() => setProfileImage(null)} // Reset profile image
            >
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
              onClick={() => handleAvatarSelect(avatar.src)} // Convert the avatar to binary
            >
              <Image src={avatar} alt={`Avatar ${index}`} width={64} height={64} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EditProfileImageAvatar;
