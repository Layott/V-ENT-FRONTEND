import Image from 'next/image'
import curveVector from '@/images/curve_vector.svg'
import styles from './below-hero.module.css'

const BelowHero = () => {
  return (
    <div className={styles.belowHeroContainer}>
      <div className={styles.curveVectorContainer}>
        <Image
            src={curveVector}
            alt='Curve Vector'
            className={styles.curveVector}
          />
      </div>
      <div className={styles.curveVectorText}>
        <p>
          Level up your gaming and anime experience with<br />
          tournaments, exclusive merchandise, and much more.<br />
          Join V-ENT and unlock a world where fans rule.
        </p>
      </div>
    </div>
  )
}

export default BelowHero