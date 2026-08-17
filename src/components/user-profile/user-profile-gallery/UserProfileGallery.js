import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { FiPlus } from "react-icons/fi";
import { MdDeleteForever } from "react-icons/md";

import profileStyles from "@/styles/profile/profile-page.module.css";
import styles from "./user-profile-gallery.module.css";

const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}`;

const UserProfileGallery = () => {
  const { data: session, status } = useSession();
  const [galleryData, setGalleryData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState("error"); // 'error', 'success', 'warning'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const showSnackbarNotification = (message, type = "error") => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setShowSnackbar(true);

    setTimeout(() => {
      setShowSnackbar(false);
    }, 5000);
  };

  const fetchGalleryImages = useCallback(async () => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user?.sessionToken) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setFetchError(null);

      const token = session?.user?.sessionToken;

      const response = await fetch(`${baseUrl}/auth/get-user-gallery/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Gallery images fetched:", result);

        let imageArray = [];

        if (Array.isArray(result)) {
          // Direct array response
          imageArray = result;
        } else if (result.data && Array.isArray(result.data)) {
          // Response wrapped in data property
          imageArray = result.data;
        } else if (result.images && Array.isArray(result.images)) {
          // Response with images property
          imageArray = result.images;
        } else if (result.gallery && Array.isArray(result.gallery)) {
          // Response with gallery property
          imageArray = result.gallery;
        } else {
          // If it's not an array structure, create empty array
          console.warn(
            "Backend response is not in expected array format:",
            result
          );
          imageArray = [];
        }

        // Transform backend data to match expected format
        const transformedData = imageArray.map((item, index) => ({
          src: item.image || item.url || item.src || item.file || item.photo, // Handle different possible field names
          name:
            item.name || item.title || item.filename || `Image ${index + 1}`,
          id: item.image_id || item.id || item.pk || index,
          uploaded: true,
          backendData: item,
        }));

        setGalleryData(transformedData);
      } else {
        const errorData = await response.text();
        console.error("Failed to fetch gallery:", response.status, errorData);
        setFetchError(
          `Failed to load gallery: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error fetching gallery:", error);
      setFetchError(`Error loading gallery: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [session, status]);

  // Fetch gallery images when component mounts or session changes
  useEffect(() => {
    fetchGalleryImages();
  }, [fetchGalleryImages]);

  // Function to Handle Upload Image
  const handleUploadClick = () => {
    // Check if user is authenticated
    if (status === "loading") {
      setUploadError("Please wait, checking authentication...");
      return;
    }

    if (status === "unauthenticated" || !session?.user?.sessionToken) {
      setUploadError("Please log in to upload images");
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Function to upload image to backend
  const uploadImageToBackend = async (file) => {
    // Try different field names one by one
    const fieldNames = ["images", "image", "file", "upload", "picture"];

    for (const fieldName of fieldNames) {
      try {
        console.log(`Trying field name: '${fieldName}'`);

        const formData = new FormData();
        formData.append(fieldName, file);

        console.log("Uploading file:", {
          name: file.name,
          size: file.size,
          type: file.type,
          fieldName: fieldName,
        });

        // Get token from NextAuth session
        const token = session?.user?.sessionToken;

        if (!token) {
          throw new Error(
            "No authentication token found. Please log in again."
          );
        }

        const response = await fetch(`${baseUrl}/auth/upload-images/`, {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        console.log(`Response for '${fieldName}':`, response.status);

        if (response.ok) {
          const result = await response.json();
          console.log(
            `✅ Upload successful with field name '${fieldName}':`,
            result
          );
          console.log(
            `✅ Backend response data:`,
            JSON.stringify(result, null, 2)
          );
          return result;
        } else {
          const errorData = await response.text();
          console.log(
            `❌ Failed with '${fieldName}':`,
            response.status,
            errorData
          );

          let errorMessage = errorData;
          try {
            const parsedError = JSON.parse(errorData);
            errorMessage =
              parsedError.message || parsedError.error || errorData;
          } catch (e) {
            // Keep original errorData if not JSON
          }

          // Check for specific errors that shouldn't retry with different field names
          if (
            errorMessage.includes("Upload limit exceeded") ||
            errorMessage.includes("limit") ||
            errorMessage.includes("quota") ||
            errorMessage.includes("maximum") ||
            response.status === 413 || // Payload too large
            response.status === 403
          ) {
            // Forbidden (might be limit related)

            // Show snackbar for limit exceeded
            if (
              errorMessage.includes("Upload limit exceeded") ||
              errorMessage.includes("limit")
            ) {
              showSnackbarNotification(errorMessage, "warning");
            }

            throw new Error(errorMessage);
          }

          // If this is the last field name to try, throw the error
          if (fieldName === fieldNames[fieldNames.length - 1]) {
            throw new Error(
              `${response.status} ${response.statusText} - ${errorMessage}`
            );
          }
          // Otherwise, continue to the next field name
        }
      } catch (error) {
        console.error(`Error with field name '${fieldName}':`, error);

        // If the error message indicates a limit or quota issue, don't try other field names
        if (
          error.message.includes("Upload limit exceeded") ||
          error.message.includes("limit") ||
          error.message.includes("quota") ||
          error.message.includes("maximum")
        ) {
          // Show snackbar for limit exceeded
          if (
            error.message.includes("Upload limit exceeded") ||
            error.message.includes("limit")
          ) {
            showSnackbarNotification(error.message, "warning");
          }

          throw error;
        }

        // If this is the last field name to try, throw the error
        if (fieldName === fieldNames[fieldNames.length - 1]) {
          throw error;
        }
        // Otherwise, continue to the next field name
      }
    }
  };

  // Function to Handle the File Selection
  const handleFileChange = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file");
      return;
    }

    // Validate file size (e.g., max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    // Set up 30-second timeout for upload
    const uploadTimeout = setTimeout(() => {
      if (isUploading) {
        showSnackbarNotification(
          "Upload is taking longer than expected. Please check your connection and try again.",
          "warning"
        );
      }
    }, 30000); // 30 seconds

    try {
      // Upload to backend
      const uploadResult = await uploadImageToBackend(file);

      // Clear timeout on successful upload
      clearTimeout(uploadTimeout);

      // Show success snackbar
      showSnackbarNotification("Image uploaded successfully!", "success");

      // Create preview for immediate display
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage = {
          src: reader.result, // Data URL for immediate preview
          name: file.name,
          id: Date.now(), // Temporary ID, use uploadResult.id if available
          uploaded: true,
          backendData: uploadResult, // Store backend response
        };
        setGalleryData((prevData) => [...prevData, newImage]);
      };
      reader.readAsDataURL(file);

      // Optionally refresh the gallery from backend to get the actual uploaded image URL
      setTimeout(() => {
        fetchGalleryImages();
      }, 1000);
    } catch (error) {
      // Clear timeout on error
      clearTimeout(uploadTimeout);
      
      // ✅ ✅ ✅ FIXED HERE:
      if (
        !error.message.includes("Upload limit exceeded") &&
        !error.message.includes("limit")
      ) {
        setUploadError(`Upload failed: ${error.message}`);
      }
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Function to handle delete icon click
  const handleDeleteClick = (image) => {
    console.log("Image to delete:", image);
    console.log("Image ID:", image.id);
    console.log("Backend data:", image.backendData);

    setImageToDelete(image);
    setShowDeleteConfirm(true);
  };

  // Function to delete image from backend
  const deleteImageFromBackend = async (imageId) => {
    try {
      console.log(`Attempting to delete image with ID: ${imageId}`);
      console.log(`ID type: ${typeof imageId}`);

      const token = session?.user?.sessionToken;

      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      // Use the exact format that works in Postman
      const requestBody = { image_id: parseInt(imageId) };

      console.log("Sending delete request with body:", requestBody);

      const response = await fetch(`${baseUrl}/auth/delete-gallery-image/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`Response status:`, response.status);

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Image deleted successfully:`, result);
        return result;
      } else {
        const errorData = await response.text();
        console.log(`❌ Delete failed:`, response.status, errorData);

        let errorMessage = errorData;
        try {
          const parsedError = JSON.parse(errorData);
          errorMessage = parsedError.message || parsedError.error || errorData;
        } catch (e) {
          // Keep original errorData if not JSON
        }

        throw new Error(
          `${response.status} ${response.statusText} - ${errorMessage}`
        );
      }
    } catch (error) {
      console.error(`Error deleting image:`, error);
      throw error;
    }
  };

  // Function to confirm delete
  const confirmDelete = async () => {
    if (!imageToDelete) return;

    setIsDeleting(true);

    try {
      // Delete from backend
      await deleteImageFromBackend(imageToDelete.id);

      // Remove from local state
      setGalleryData((prevData) =>
        prevData.filter((img) => img.id !== imageToDelete.id)
      );

      // Show red background success snackbar for deletion
      showSnackbarNotification("Image deleted successfully!", "deleted");
    } catch (error) {
      // Show error snackbar
      showSnackbarNotification(`Delete failed: ${error.message}`, "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setImageToDelete(null);
    }
  };

  // Function to cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setImageToDelete(null);
  };

  // Get background color based on snackbar type
  const getSnackbarBackgroundColor = (type) => {
    switch (type) {
      case 'success':
        return '#D4AF37'; // Green
      case 'error':
        return '#f44336'; // Red
      case 'warning':
        return '#ff9800'; // Orange
      case 'deleted':
        return '#d32f2f'; // Dark Red for deletion
      default:
        return '#f44336'; // Default to red
    }
  };

  return (
    <div className={styles.galleryContainer}>
      {showSnackbar && (
        <div 
          className={`${styles.snackbar} ${snackbarType}`}
          style={{ backgroundColor: getSnackbarBackgroundColor(snackbarType) }}
        >
          <span>{snackbarMessage}</span>
          <button
            onClick={() => setShowSnackbar(false)}
            className={`${styles.snackbarClose} ${styles.snackbarMessageBtn}`}
            
          >
            ×
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.overlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalHeading}>Delete Image</h3>
            <p className={styles.modalText}>
              Are you sure you want to delete this image? This action cannot be
              undone.
            </p>
            <div className={styles.modalButtons}>
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className={styles.cancelButton}
              >
                No, Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className={styles.deleteImageButton}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <div
        className={`${styles.imageContainer} ${styles.addImageBTN}`}
        onClick={handleUploadClick}
        style={{
          opacity: isUploading ? 0.6 : 1,
          cursor: isUploading ? "not-allowed" : "pointer",
        }}
      >
        <div
          className={`${styles.addImage} ${profileStyles.topMostLayerColor}`}
        >
          <span className={styles.plusIcon}>
            {isUploading ? "⏳" : <FiPlus />}
          </span>
          <span className={styles.uploadImageText}>
            {isUploading ? "Uploading..." : "Upload Image"}
          </span>
        </div>
      </div>

      {/* {fetchError && (
                <div className={styles.errorMessage} style={{
                    color: 'red',
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: '#fee',
                    borderRadius: '4px',
                }}>
                    {fetchError}
                    <button 
                        onClick={() => {
                            setFetchError(null)
                            fetchGalleryImages()
                        }}
                        style={{
                            marginLeft: '10px',
                            background: '#007bff',
                            border: 'none',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Retry
                    </button>
                </div>
            )} */}

      {isLoading ? (
        <div className={styles.loadingMessage}>Loading gallery...</div>
      ) : galleryData.length === 0 && status === "authenticated" ? (
        <div
          className={styles.emptyMessage}
          
        >
          No images in your gallery yet. Upload your first image!
        </div>
      ) : null}

      {galleryData.map((gallery, index) => (
        <div
          key={gallery.id || index}
          className={styles.imageContainer}
          style={{ position: "relative" }}
        >
          <Image
            src={gallery.src}
            alt={gallery.name}
            width={300}
            height={200}
          />
          {/* Delete Icon */}
          <button
            onClick={() => handleDeleteClick(gallery)}
            className={styles.deleteButton}
          >
            <MdDeleteForever />
          </button>
        </div>
      ))}
    </div>
  );
};

export default UserProfileGallery;