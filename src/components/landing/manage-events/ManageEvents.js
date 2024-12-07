import Image from "next/image"
import useIntersectionObserver from '@/hooks/useIntersectionObserver'
import manageEvents from '@/images/manage_events.webp'
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import observerStyle from '@/styles/intersection/intersection.module.css'
import styles from './manage-events.module.css';

const ManageEvents = ({ scrollToForm }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.01 })
  const [refText, isTextVisible] = useIntersectionObserver({ threshold: 0.2 })

  return (
    <div className={`${landingStyles.manageEventsContainer} ${styles.manageEventsContainer}`}>
      <div className={landingStyles.innerManageEventsContainer}>
      
        <div className={styles.leftManageEventsContainer}>
            <div
              ref={ref}
              className={`${styles.manageEventsImageContainer} ${observerStyle.manageEventsImageContainer} ${isVisible ? observerStyle.fadeInFromLeft : ''}`}
            >
                <Image
                  src={manageEvents}
                  alt="Manage Events"
                />
            </div>
        </div>

        <div className={styles.rightManageEventsContainer}>
          <div
            ref={refText}
            className={`${landingStyles.innerRightManageEvents} ${observerStyle.innerRightManageEvents} ${isTextVisible ? observerStyle.fadeInDissolve : ''}`}
          >
            <div className={landingStyles.headingContainer}>
              <h4 className={landingStyles.subHeadingText}>
                Event Creation & Ticketing
              </h4>
              <h1 className={landingStyles.headingText}>
                Create and Manage Events Seamlessly
              </h1>
            </div>
            
            <div className={`${landingStyles.descriptionContainer} ${styles.descriptionContainer}`}>
              <p className={`${landingStyles.descriptionParagraph} ${styles.descriptionParagraph}`}>
                Host gaming events or anime screenings with ease using our powerful event management tools. From ticketing to attendee tracking, V-ENT empowers you to organize memorable events for your audience.
              </p>

              <button
                className={`${profileStyles.waitlistBTN} ${landingStyles.waitlistBTN}`}
                onClick={scrollToForm}
              >
                Join the waitlist</button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default ManageEvents