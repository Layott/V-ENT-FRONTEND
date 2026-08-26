'use client';

import { useT } from '@/i18n/LanguageProvider';
import Image from "next/image"
import Link from "next/link"
import useIntersectionObserver from '@/hooks/useIntersectionObserver'
import manageEvents from '@/images/manage_events.webp'
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import observerStyle from '@/styles/intersection/intersection.module.css'
import styles from './manage-events.module.css';

const ManageEvents = ({ scrollToForm }) => {
  const tt = useT();
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
                  alt={tt("landing.alt.manageEvents", "The organiser events screen: a table of events with their type, game, location, dates and status, and a button to create a new one")}
                />
            </div>
        </div>

        <div className={styles.rightManageEventsContainer}>
          <div
            ref={refText}
            className={`${landingStyles.innerRightManageEvents} ${observerStyle.innerRightManageEvents} ${isTextVisible ? observerStyle.fadeInDissolve : ''}`}
          >
            <div className={landingStyles.headingContainer}>
              <p className={landingStyles.subHeadingText}>
                {tt("landing.events.eyebrow", "Event Creation & Ticketing")}
              </p>
              <h2 className={landingStyles.headingText}>
                {tt("landing.events.heading", "Create and Manage Events Seamlessly")}
              </h2>
            </div>
            
            <div className={`${landingStyles.descriptionContainer} ${styles.descriptionContainer}`}>
              <p className={`${landingStyles.descriptionParagraph} ${styles.descriptionParagraph}`}>
                {tt("landing.events.body", "Host gaming events or anime screenings with ease using our powerful event management tools. From ticketing to attendee tracking, V-ENT empowers you to organize memorable events for your audience.")}
              </p>

              <Link
                  href={'/signup'}
                  className={`${profileStyles.waitlistBTN} ${profileStyles.loginBTN}`}
                >
                  {tt("landing.signup", "Signup")}
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default ManageEvents