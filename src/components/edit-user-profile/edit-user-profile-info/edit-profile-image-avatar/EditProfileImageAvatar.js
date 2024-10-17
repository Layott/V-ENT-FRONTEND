import Image from 'next/image'
import { MdDelete  } from "react-icons/md";
import { FiCamera } from 'react-icons/fi';
import smallProfileImage from "@/images/signed_in_user_big.webp"
import avatarAnkara from "@/images/avatar_ankara.jpg"
import avatarBlackHair from "@/images/avatar_black_hair.webp"
import avatarBlackShirt from "@/images/avatar_black_shirt.webp"
import avatarColor from "@/images/avatar_color.webp"
import avatarGreenEyes from "@/images/avatar_green_eye.webp"
import avatarPaint from "@/images/avatar_paint.webp"
import avatarRobotPC from "@/images/avatar_robot_pc.jpg"
import avatarYellowRobot from "@/images/avatar_yellow_robot.webp"
import styles from './edit-profile-image-avatar.module.css'

const EditProfileImageAvatar = () => {
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
                    <button className={`${styles.changeBTN} ${styles.editBTN}`}><FiCamera /> Change</button>
                    <button className={`${styles.deleteBTN} ${styles.editBTN}`}><MdDelete className={styles.deleteIcon} /></button>
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
            <div className={styles.eachAvatarContainer}>
                <Image
                    src={avatarAnkara}
                    alt='Avatar Ankara' 
                />
            </div>
            <div className={styles.eachAvatarContainer}>
                <Image
                    src={avatarColor}
                    alt='Avatar color' 
                />
            </div>
            <div className={styles.eachAvatarContainer}>
                <Image
                    src={avatarBlackHair}
                    alt='Avatar Black Hair' 
                />
            </div>
            <div className={styles.eachAvatarContainer}>
                <Image
                    src={avatarPaint}
                    alt='Avatar Paint' 
                />
            </div>
        </div>
    </div>
  </div>

  )
}

export default EditProfileImageAvatar