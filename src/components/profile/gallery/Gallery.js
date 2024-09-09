import { useState, useRef } from "react"
import Image from "next/image"
import { FiPlus } from "react-icons/fi"
import gallery1 from '@/images/gallery1.webp'
import gallery2 from '@/images/gallery2.webp'
import gallery3 from '@/images/gallery3.webp'
import gallery4 from '@/images/gallery4.webp'
import profileStyles from '@/styles/profile/profile-page.module.css'
import styles from './gallery.module.css'

const initialGalleryData = [
    { src: gallery1, name: "Gallery 1" },
    { src: gallery2, name: "Gallery 2" },
    { src: gallery3, name: "Gallery 3" },
    { src: gallery4, name: "Gallery 4" }
]

const Gallery = () => {
    const [galleryData, setGalleryData] = useState(initialGalleryData)
    const fileInputRef = useState(null)

    // Function to Handle Upload Image
    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click()
        }
    }

    // Function to Handle the File Selection
    const handleFileChange = (event) => {
        const file = event.target.files[0]

        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                // Simulate Adding to the Database by Updating the State
                const newImage = {
                    src: reader.result,    // Data URL of the image
                    name: file.name
                }
                setGalleryData(prevData => [...prevData, newImage])
            }
            reader.readAsDataURL(file)
        }
    }

  return (
    <div className={styles.galleryContainer}>

        <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
        />

        <div
            className={`${styles.imageContainer} ${styles.addImageBTN}`}
            onClick={handleUploadClick}
        >
            <div className={`${styles.addImage} ${profileStyles.topMostLayerColor}`}>
                <span className={styles.plusIcon}><FiPlus /></span>
                <span className={styles.uploadImageText}>Upload Image</span>
            </div>
        </div>

        {galleryData.map((gallery, index) => (
            <div key={index} className={styles.imageContainer}>
                <Image
                    src={gallery.src}
                    alt={gallery.name}
                />
            </div>        
        ))}
    </div>
  )
}

export default Gallery