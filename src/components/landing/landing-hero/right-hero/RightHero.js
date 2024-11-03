import topLeftImage from '@/images/top_left.jpeg'
import topRightImage from '@/images/top_right.jpg'
import bottomRightImage from '@/images/bottom_right.jpg'
import bottomLeftImage from '@/images/bottom_left.jpg'
import Image from "next/image"
import styles from './right-hero.module.css'


const RightHero = () => {
  return (
    <div className={styles.rightHeroContainer}>
      <div className={styles.rightHeroInnerContainer}>
      
        <div className={styles.imageContainer}>

          <div className={styles.topImageContainer}>

            <div className={styles.topLeftImageContainer}>
              <Image
                src={topLeftImage}
                alt="Top Left Image"
              />
            </div>

            <div className={styles.topRightImageContainer}>
              <Image
                src={topRightImage}
                alt="Top Right Image"
              />
            </div>
            

          </div>

            <div className={styles.bottomImageContainer}>
              <div className={styles.bottomLeftImageContainer}>
                <Image
                  src={bottomLeftImage}
                  alt="Bottom Left Image"
                />
              </div>

              <div className={styles.bottomRightImageContainer}>
                <Image
                  src={bottomRightImage}
                  alt="Bottom Right Image"
                />
              </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default RightHero