"use client";

import { useState } from "react";
import Image from "next/image";
import { FiCamera } from "react-icons/fi";
import { useSession } from "next-auth/react";
import profileBannerImage from "@/images/profile_image_bg.webp";
import styles from "./user-profile-banner.module.css";

const UserProfileBanner = ({ banner, onBannerUpdate }) => {
  const { data: session } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [previewBanner, setPreviewBanner] = useState(null);
  const [error, setError] = useState("");

  const handleBannerChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewBanner(reader.result);
    };
    reader.readAsDataURL(file);

    
    setIsUploading(true);
    setError("");

    try {
      
      const formData = new FormData();
      formData.append("banner", file);
      formData.append("user_id", session.user.id);

      // Upload banner to server
      const response = await fetch(
        `https://vermillionent.pythonanywhere.com/auth/edit-profile-info/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.user.sessionToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload banner");
      }

      const data = await response.json();

      
      const bannerUrl = data.banner_url || data.banner || data.data?.banner;

      
      onBannerUpdate(bannerUrl);
    } catch (error) {
      console.error("Error uploading banner:", error);
      setError("Failed to upload banner. Please try again.");
      // Keep the preview but show error
    } finally {
      setIsUploading(false);
    }
  };

  
  const displayImage = previewBanner || banner || profileBannerImage;

  return (
    <div className={styles.profileBanner}>
      <div className={styles.bannerUploader}>
        <label htmlFor="bannerUpload" className={styles.bannerUploadLabel}>
          <FiCamera className={styles.uploadIcon} />
          {isUploading ? "Uploading..." : "Upload banner"}
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleBannerChange}
          id="bannerUpload"
          className={styles.uploadInput}
          disabled={isUploading}
        />
      </div>

      {error && (
        <div className={styles.errorMessage || "error-message"}>{error}</div>
      )}

      <Image
        src={displayImage}
        width={500}
        height={200}
        alt="Profile Banner Image"
        className={styles.bannerImage}
      />
    </div>
  );
};

export default UserProfileBanner;
