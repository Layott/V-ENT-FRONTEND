import Image from 'next/image'
import Link from 'next/link'
import { requests } from './requestList'
import tableStyles from "@/styles/modules/tables/tables.module.css"
import styles from './team-members.module.css'

const MembersRequestsTabComponent = () => {
  return (
    <div className={styles.requestsContainer}>
      <div className={styles.controlSettingsDiv}>
        <p>
          Control public requests to join your team in your <Link className={styles.teamProfileLink} href={'./team-profile'}>profile settings</Link>
        </p>
      </div>

      <div className={styles.requestBoxesContainer}>
        {requests.map((request, index) => (
          <div key={index} className={styles.requestBox}>
            <div className={styles.requestBoxUserDetailsContainer}>
              <div className={styles.imageContainer}>
                <Image
                  src={request.imageSrc}
                  alt={request.altText}
                  // layout='fill'
                  objectFit='cover'
                />
              </div>
              <div className={styles.requestBoxUserDetails}>
                <p className={styles.name}>{request.name}</p>
                <p className={styles.timeAgo}>{request.timeAgo}</p>
                <button className={`${tableStyles.viewProfileBTN} ${styles.viewProfileBTN}`}>View Profile</button>
              </div>  
            </div>
            <div className={styles.btnsContainer}>
              <button className={`redBTN ${styles.acceptBTN}`}>Accept</button>
              <button className={`redBTN ${styles.declineBTN}`}>Decline</button>
            </div>
          </div>
        ))}
      
      </div>

    </div>
  )
}

export default MembersRequestsTabComponent