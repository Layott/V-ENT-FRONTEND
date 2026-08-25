"use client";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { FiCamera, FiEdit3 } from "react-icons/fi";
import { IoLocationOutline } from "react-icons/io5";
import Image from "next/image";
import profileImageBig from "@/images/signed_in_user_big.webp";
import styles from "./user-profile-bio.module.css";

const UserProfileBio = ({
  fullName,
  username,
  profilePicture,
  bio,
  country,
  
  onProfilePictureUpdate,
}) => {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [displayedImage, setDisplayedImage] = useState(null);
  const [imageError, setImageError] = useState(false);

  
  const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

  
  const addCacheBusting = useCallback((url) => {
    if (!url) return null;
    const cacheBuster = `t=${new Date().getTime()}`;
    return url.includes("?")
      ? `${url}&${cacheBuster}`
      : `${url}?${cacheBuster}`;
  }, []);

  
  useEffect(() => {
    
    const getAbsoluteUrl = (url) => {
      if (!url) return null;
      return url.startsWith("http")
        ? url
        : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
    };

    
    const loadProfileImage = () => {
      
      if (profilePicture) {
        const absoluteUrl = getAbsoluteUrl(profilePicture);
        const cachedUrl = addCacheBusting(absoluteUrl);
        console.log("Using profile picture from props:", cachedUrl);
        setDisplayedImage(cachedUrl);
        setImageError(false);
        return;
      }

      // 2. Then check localStorage
      try {
        const storedData = localStorage.getItem("userProfile");
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData?.profile_picture) {
            const absoluteUrl = getAbsoluteUrl(parsedData.profile_picture);
            const cachedUrl = addCacheBusting(absoluteUrl);
            console.log("Using profile picture from localStorage:", cachedUrl);
            setDisplayedImage(cachedUrl);
            setImageError(false);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to load profile from localStorage:", error);
      }

      
      console.log("No valid profile picture found, using fallback");
      setDisplayedImage(null);
    };

    loadProfileImage();
  }, [profilePicture, baseUrl, addCacheBusting]);

  const handleProfileImageUploader = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    
    let localPreviewUrl = null;

    
    const getAbsoluteUrl = (url) => {
      if (!url) return null;
      return url.startsWith("http")
        ? url
        : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
    };
  
    try {
      
      setIsUploading(true);
  
      
      localPreviewUrl = URL.createObjectURL(file);
      setDisplayedImage(localPreviewUrl);
  
      
      if (
        onProfilePictureUpdate &&
        typeof onProfilePictureUpdate === "function"
      ) {
        const uploadedUrl = await onProfilePictureUpdate(file);
  
        
        if (uploadedUrl) {
          console.log("Profile picture uploaded successfully:", uploadedUrl);
  
          
          const cachedUrl = addCacheBusting(uploadedUrl);
          setDisplayedImage(cachedUrl);
  
          
          try {
            const existingData = localStorage.getItem("userProfile") || "{}";
            const userData = JSON.parse(existingData);
            userData.profile_picture = uploadedUrl;
            userData.lastUpdated = new Date().toISOString();
            localStorage.setItem("userProfile", JSON.stringify(userData));
            window.dispatchEvent(new Event('vent:profile-updated'));
            console.log("Updated profile picture in localStorage");
  
            
            localStorage.setItem("userProfilePicture", uploadedUrl);
          } catch (error) {
            console.error("Failed to save profile to localStorage:", error);
          }
        } else {
          console.warn("No URL returned from profile picture upload");
        }
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      setImageError(true);
    } finally {
      setIsUploading(false);
      
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    }
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div className={styles.profileBioContainer}>
      <div className={styles.profileBioHeader}>
        <div className={styles.profileBioInfo}>
          <div className={styles.profileImageContainer}>
            {/* Use the displayed image if available, otherwise use the fallback */}
            <Image
              src={displayedImage || profileImageBig}
              alt="Profile Image"
              width={100}
              height={100}
              onError={(e) => {
                console.error("Image loading error:", e);
                setImageError(true);
                setDisplayedImage(null); 
              }}
              
              priority
              
              key={displayedImage || "fallback"}
            />
            

            <div className={styles.profileImageUpload}>
              <label
                htmlFor="profileImageUpload"
                className={styles.profileImageUploadLabel}
              >
                <FiCamera className={styles.uploadIcon} />
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfileImageUploader}
                id="profileImageUpload"
                className={styles.uploadInput}
                disabled={isUploading}
              />
            </div>
            {isUploading && (
              <div className={styles.uploadingIndicator}>Uploading...</div>
            )}
          </div>
          <div className={styles.profileDetailsContainer}>
            <div className={styles.profileDetails}>
              <h1 className={styles.profileFullName}>
                {fullName || "Unknown"}
              </h1>
              <p className={styles.profileUsernameHandle}>
                @{username || "unknown"}
              </p>
              <p className={styles.userLocation}>
                <IoLocationOutline />
                <span className={styles.userLocationCountry}>{country}</span>
              </p>
            </div>

            <div className={styles.profileEditButtonContainer}>
              <Link
                href={"/edit-user-profile"}
                onClick={toggleEditMode}
                className={styles.editButtonLink}
              >
                <FiEdit3 className={styles.editIcon} />
                Edit Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.profileDescription}>
        <p className={styles.bioParagraph}>{bio}</p>
      </div>
    </div>
  );
};

export default UserProfileBio;