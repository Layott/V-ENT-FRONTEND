"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";
import Header from "@/components/header/Header";
import MobileHeader from "@/components/mobile-header/MobileHeader";
import BottomMenu from "@/components/bottom-menu/BottomMenu";
import ProfileBanner from "@/components/user-profile/user-profile-banner/UserProfileBanner";
import ProfileBio from "@/components/user-profile/user-profile-bio/UserProfileBio";
import OverviewLeft from "@/components/user-profile/user-profile-overview-left/UserProfileOverviewLeft";
import OverviewRight from "@/components/user-profile/user-profile-overview-right/UserProfileOverviewRight";
import Gallery from "@/components/user-profile/user-profile-gallery/UserProfileGallery";
import Activity from "@/components/user-profile/user-profile-activity/UserProfileActivity";
import { VENT } from "../api/auth/[...nextauth]/route";
import profileStyles from "@/styles/profile/profile-page.module.css";
import styles from "./user-profile.module.css";

const UserProfile = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [interests, setInterests] = useState([]);

  const handleInterestsChange = (newInterests) => {
    setInterests(newInterests);
  };

  const baseUrl = "https://vermillionent.pythonanywhere.com";

  const getAbsoluteUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http")
      ? url
      : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const processUserData = (data) => {
    if (!data) return null;
    
    const processed = { ...data };
    
    if (processed.profile_pic && !processed.profile_picture) {
      processed.profile_picture = processed.profile_pic;
    }
    
    processed.profile_picture = getAbsoluteUrl(processed.profile_picture);
    processed.banner = getAbsoluteUrl(processed.banner);

    // Ensure interests is an array
    if (!processed.interests) {
      processed.interests = [];
    } else if (typeof processed.interests === 'string') {
      try {
        // If interests is a JSON string, parse it
        processed.interests = JSON.parse(processed.interests);
      } catch (e) {
        console.error('Error parsing interests string:', e);
        processed.interests = [];
      }
    }

    console.log('Processed user data:', processed);
    return processed;
  };

  useEffect(() => {
    console.log("Current session status:", status);
    console.log("Session data:", session);
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    const fetchUserProfile = async () => {
      if (status === "authenticated" && session?.user?.sessionToken) {
        const sessionToken = session.user.sessionToken;
        const userId = session.user.id;
    
        console.log("==== PROFILE API DEBUG ====");
        console.log("Session token:", sessionToken);
        console.log("User ID:", userId);
        console.log("API Endpoint:", VENT.USER_PROFILE);
    
        try {
          // Try with GET method first
          const timestamp = new Date().getTime();
          console.log("Attempting GET request...");
          let response = await fetch(`${VENT.USER_PROFILE}?user_id=${userId}&t=${timestamp}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              "Content-Type": "application/json",
            }
          });
          
          // If GET fails, try again with POST method
          if (response.status === 405) {
            console.log("GET method not allowed, trying POST...");
            response = await fetch(`${VENT.USER_PROFILE}?t=${timestamp}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${sessionToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ user_id: userId }),
            });
          }
          
          console.log("Profile response status:", response.status);
          
          if (!response.ok) {
            // Try with Token prefix instead of Bearer
            console.log("Trying with Token prefix instead of Bearer");
            const tokenResponse = await fetch(`${VENT.USER_PROFILE}?user_id=${userId}&t=${timestamp}`, {
              method: "GET",
              headers: {
                Authorization: `Token ${sessionToken}`,
                "Content-Type": "application/json",
              }
            });
            
            if (!tokenResponse.ok) {
              // Try with session_token as a query param
              console.log("Trying with session_token as query param");
              const tokenParamResponse = await fetch(
                `${VENT.USER_PROFILE}?user_id=${userId}&session_token=${sessionToken}&t=${timestamp}`, 
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  }
                }
              );
              
              if (!tokenParamResponse.ok) {
                throw new Error(`Failed to fetch profile: ${tokenParamResponse.status}`);
              }
              
              const responseText = await tokenParamResponse.text();
              return handleProfileResponse(responseText);
            }
            
            const responseText = await tokenResponse.text();
            return handleProfileResponse(responseText);
          }
          
          const responseText = await response.text();
          return handleProfileResponse(responseText);
          
        } catch (err) {
          console.error("Final error:", err.message);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        console.log("Not authenticated or missing session token");
        setLoading(false);
      }
    };
    
    // Helper function to handle the profile response
    const handleProfileResponse = (responseText) => {
      console.log("Raw response:", responseText);
      
      try {
        const data = JSON.parse(responseText);
        console.log("Parsed data:", data);
        
        // Try different data structures
        const rawUserData =
          data.data ||
          data.user ||
          (data.status === "success" ? data : null);
          
        if (rawUserData) {
          // Process to ensure absolute URLs
          const processedData = processUserData(rawUserData);
          setUserData(processedData);
          
          // Set interests state
          if (processedData.interests && Array.isArray(processedData.interests)) {
            setInterests(processedData.interests);
          }
          
          // Also update localStorage with processed URLs
          localStorage.setItem(
            "userProfile",
            JSON.stringify(processedData)
          );
        } else {
          throw new Error("Invalid user data format");
        }
      } catch (parseError) {
        console.log("Parse error:", parseError.message);
        throw parseError;
      }
    };

    if (status === "authenticated") {
      fetchUserProfile();
    }
  }, [status, session, router]);

  useEffect(() => {
    // This effect runs when the component mounts and when userData changes
    if (userData) {
      // When we have userData from the API, save it to localStorage for persistence
      try {
        const processedData = processUserData(userData);
        localStorage.setItem(
          "userProfile",
          JSON.stringify({
            ...processedData,
            lastUpdated: new Date().toISOString(),
          })
        );
        console.log("Updated userData in localStorage");
      } catch (error) {
        console.error("Error saving userData to localStorage:", error);
      }
    } else if (!loading && status === "authenticated") {
      // If userData is not available but we're authenticated, try to load from localStorage
      try {
        const storedData = localStorage.getItem("userProfile");
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          console.log("Loading profile data from localStorage:", parsedData);
          setUserData(parsedData);
          
          // Set interests state from localStorage
          if (parsedData.interests && Array.isArray(parsedData.interests)) {
            setInterests(parsedData.interests);
          }
        }
      } catch (error) {
        console.error("Error loading from localStorage:", error);
      }
    }
  }, [userData, loading, status]);

  useEffect(() => {
    // Clean up localStorage to remove any problematic URLs
    try {
      // Get the stored profile
      const storedProfile = localStorage.getItem("userProfile");
      if (storedProfile) {
        const profileData = JSON.parse(storedProfile);

        // Check if profile_picture exists and is a relative URL
        if (
          profileData.profile_picture &&
          !profileData.profile_picture.startsWith("http")
        ) {
          // Convert to absolute URL
          profileData.profile_picture = getAbsoluteUrl(
            profileData.profile_picture
          );
          // Save back to localStorage
          localStorage.setItem("userProfile", JSON.stringify(profileData));
          console.log(
            "Updated stored profile picture URL to absolute:",
            profileData.profile_picture
          );
        }

        // Do the same for banner
        if (profileData.banner && !profileData.banner.startsWith("http")) {
          profileData.banner = getAbsoluteUrl(profileData.banner);
          localStorage.setItem("userProfile", JSON.stringify(profileData));
        }
      }

      
      const storedProfilePic = localStorage.getItem("userProfilePicture");
      if (storedProfilePic && !storedProfilePic.startsWith("http")) {
        localStorage.setItem(
          "userProfilePicture",
          getAbsoluteUrl(storedProfilePic)
        );
      }
    } catch (error) {
      console.error("Error cleaning up localStorage:", error);
    }
  }, []);

  
  const refreshUserData = async () => {
    if (status === "authenticated" && session?.user?.sessionToken) {
      setLoading(true);
      const sessionToken = session.user.sessionToken;
      const userId = session.user.id;

      try {
       
        const timestamp = new Date().getTime();
        const response = await fetch(`${VENT.USER_PROFILE}?t=${timestamp}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
            
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          body: JSON.stringify({ user_id: userId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to refresh user data: ${response.status}`);
        }

        const responseText = await response.text();
        console.log("Profile refresh raw response:", responseText);

        const data = JSON.parse(responseText);
        console.log("Profile refresh parsed data:", data);

        const rawUserData =
          data.data || data.user || (data.status === "success" ? data : null);

        if (rawUserData) {
          console.log("New user data from refresh:", rawUserData);
          
          const processedData = processUserData(rawUserData);
          setUserData(processedData);
          
          // Update interests state
          if (processedData.interests && Array.isArray(processedData.interests)) {
            setInterests(processedData.interests);
          }

          localStorage.setItem("userProfile", JSON.stringify(processedData));
        } else {
          console.error("Refresh returned invalid user data format");
        }
      } catch (error) {
        console.error("Error refreshing user data:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  
  const handleProfileUpdate = (updatedData) => {
    console.log("Profile update triggered with:", updatedData);

    
    const processedUpdate = {};
    Object.keys(updatedData).forEach((key) => {
      if (key === "profile_picture" || key === "banner") {
        processedUpdate[key] = getAbsoluteUrl(updatedData[key]);
      } else {
        processedUpdate[key] = updatedData[key];
      }
    });

    
    if (Object.keys(processedUpdate).length > 0) {
      setUserData((prevData) => {
        const newData = {
          ...prevData,
          ...processedUpdate,
        };
        
        // Update localStorage with the new data
        localStorage.setItem("userProfile", JSON.stringify(newData));
        
        return newData;
      });
    }

    
    refreshUserData();
  };

  const handleBannerUpdate = async (bannerInput) => {
    
    if (typeof bannerInput === "string") {
      const absoluteUrl = getAbsoluteUrl(bannerInput);
      setUserData((prevData) => ({
        ...prevData,
        banner: absoluteUrl,
      }));
      return absoluteUrl;
    }

    
    if (bannerInput instanceof File) {
      try {
        setLoading(true);

        const formData = new FormData();
        formData.append("banner", bannerInput);
        formData.append("user_id", session.user.id);

        const response = await fetch(`${VENT.UPDATE_PROFILE}/banner`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.user.sessionToken}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload banner");
        }

        const data = await response.json();
        let bannerUrl = data.banner_url || data.banner || data.data?.banner;

        
        bannerUrl = getAbsoluteUrl(bannerUrl);

        
        setUserData((prevData) => ({
          ...prevData,
          banner: bannerUrl,
        }));

        
        const storedProfile = localStorage.getItem("userProfile");
        if (storedProfile) {
          try {
            const profileData = JSON.parse(storedProfile);
            profileData.banner = bannerUrl;
            localStorage.setItem("userProfile", JSON.stringify(profileData));
          } catch (error) {
            console.error("Error updating stored profile banner:", error);
          }
        }

        
        refreshUserData();

        return bannerUrl;
      } catch (error) {
        console.error("Error uploading banner:", error);
        
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading)
    return (
      <div className={profileStyles.errorContainer}>
        Loading<span className={profileStyles.blinkingDots}></span>
      </div>
    );

  if (error) return <div className={profileStyles.errorContainer}>{error}</div>;

  
  if (!userData)
    return (
      <div className={profileStyles.errorContainer}>
        No user data available!
      </div>
    );

  

  const handleProfilePictureUpdate = async (file) => {
    if (!file || !(file instanceof File)) return;

    try {
      
      const formData = new FormData();
      formData.append("profile_pic", file); 
      formData.append("user_id", session.user.id);

      console.log("Uploading profile picture:", file.name, file.size);

      const uploadResponse = await fetch(`${baseUrl}/auth/edit-profile-info/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.user.sessionToken}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      const responseData = await uploadResponse.json();
      console.log("Profile picture upload response:", responseData);

      
      let newProfilePicUrl = null;
      if (responseData.profile_picture) {
        newProfilePicUrl = responseData.profile_picture;
      } else if (responseData.data && responseData.data.profile_picture) {
        newProfilePicUrl = responseData.data.profile_picture;
      } else if (responseData.profile_pic) {
        newProfilePicUrl = responseData.profile_pic;
      } else if (responseData.data && responseData.data.profile_pic) {
        newProfilePicUrl = responseData.data.profile_pic;
      }

      if (newProfilePicUrl) {
        
        const fullUrl = getAbsoluteUrl(newProfilePicUrl);

        
        setUserData((prevData) => ({
          ...prevData,
          profile_picture: fullUrl, 
        }));

        
        const userProfileData = {
          ...userData,
          profile_picture: fullUrl,
        };
        localStorage.setItem("userProfile", JSON.stringify(userProfileData));
        console.log("Saved profile picture to localStorage:", fullUrl);

        
        const timestampedUrl = `${fullUrl}?t=${new Date().getTime()}`;
        return timestampedUrl;
      } else {
        console.warn("No profile picture URL found in the response");
        return null;
      }
    } catch (error) {
      console.error("Profile picture update failed:", error);
      throw error;
    }
  };

  

  return (
    <div className={styles.pageContainer}>
      <Header
        fullName={userData?.full_name || "Unknown"}
        username={userData?.username || "Unknown"}
        profilePicture={userData?.profile_picture}
      />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <ProfileBanner
            banner={userData?.banner}
            onBannerUpdate={handleBannerUpdate}
          />

          <ProfileBio
            fullName={userData?.full_name || userData?.fullname || "Unknown"}
            username={userData?.username || "Unknown"}
            
            profilePicture={
              userData?.profile_picture
                ? `${userData.profile_picture}${
                    userData.profile_picture.includes("?") ? "&" : "?"
                  }cb=${new Date().getTime()}`
                : null
            }
            bio={userData?.description}
            country={userData?.country || "Unknown"}
            onProfileUpdate={handleProfileUpdate}
            onProfilePictureUpdate={handleProfilePictureUpdate}
          />

          <div className={styles.buttonContainer}>
            <button
              className={`${styles.tabBTN} ${
                activeTab === "overview" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>

            <button
              className={`${styles.tabBTN} ${
                activeTab === "activity" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("activity")}
            >
              Activity
            </button>

            <button
              className={`${styles.tabBTN} ${
                activeTab === "gallery" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("gallery")}
            >
              Gallery
            </button>
          </div>

          <div className={styles.profileDashboard}>
            {activeTab === "overview" && (
              <div className={styles.overviewContainer}>
                <OverviewLeft
                  interests={userData?.interests || []}
                  gamingAccounts={userData?.gamingAccounts || []}
                  socialLinks={userData?.social_links || []}
                />

                <OverviewRight
                  penaltyPoints={userData?.penalty_point || 0}
                  walletBalance={userData?.wallet_balance || 0}
                />
              </div>
            )}

            {activeTab === "activity" && (
              <div className={styles.activityContainer}>
                <Activity
                  achievements={userData?.achievements || []}
                  favoriteGames={userData?.favorite_games || []}
                />
              </div>
            )}

            {activeTab === "gallery" && (
              <div className={styles.galleryContainer}>
                <Gallery />
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

export default UserProfile;