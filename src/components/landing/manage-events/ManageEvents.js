import Image from "next/image"
import manageEvents from '@/images/manage_events.webp'
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import styles from './manage-events.module.css';

const ManageEvents = () => {
  return (
    <div className={landingStyles.manageEventsContainer}>
      <div className={landingStyles.innerManageEventsContainer}>
      
        <div className={styles.leftManageEventsContainer}>
            <div className={styles.manageEventsImageContainer}>
                <Image
                  src={manageEvents}
                  alt="Manage Events"
                />
            </div>
        </div>

        <div className={styles.rightManageEventsContainer}>
          <div className={landingStyles.innerRightManageEvents}>
            <div className={landingStyles.headingContainer}>
              <h4 className={landingStyles.subHeadingText}>
                Event Creation & Ticketing
              </h4>
              <h1 className={landingStyles.headingText}>
                Create and Manage Events Seamlessly
              </h1>
            </div>
            
            <div className={landingStyles.descriptionContainer}>
              <p className={landingStyles.descriptionParagraph}>
                Host gaming events or anime screenings with ease using our powerful event management tools. From ticketing to attendee tracking, V-ENT empowers you to organize memorable events for your audience.
              </p>

              <button className={`${profileStyles.waitlistBTN} ${landingStyles.waitlistBTN}`}>Join the waitlist</button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default ManageEvents