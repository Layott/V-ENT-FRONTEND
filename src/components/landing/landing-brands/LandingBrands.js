import Image from 'next/image'
import useIntersectionObserver from '@/hooks/useIntersectionObserver'
import { brandLogos } from './BrandLogosList'
import landingStyles from '@/styles/landing/landing.module.css'
import observerStyle from '@/styles/intersection/intersection.module.css'
import styles from './landing-brands.module.css'

const LandingBrands = () => {
    const [ref, isVisible] = useIntersectionObserver({ threshold: 0.01 })

  return (
    <div className={`${landingStyles.brandsContainer} ${styles.brandsContainer}`}>
        <div className={`${landingStyles.innerBrandsContainer} ${styles.innerBrandsContainer}`}>
            <div className={styles.brandHeader}>
                <h1>Brands That Trust Us</h1>
            </div>

            <div className={styles.brandsLogoContainer}>
                {brandLogos.map((brandLogo, index) => (
                <div
                    key={index}
                    ref={ref}
                    className={`${styles.brandLogoContainer} ${observerStyle.brandLogoContainer} ${isVisible ? observerStyle.fadeInDissolve : ''}`}
                >
                    <Image
                        src={brandLogo.src}
                        alt={brandLogo.alt}
                    />
                </div>
                ))}
            </div>
        </div>
    </div>
  )
}

export default LandingBrands