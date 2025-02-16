import { useState } from 'react';
import styles from './edit-team-profile-membership.module.css';

const EditTeamProfileMembership = () => {
  const [isOn, setIsOn] = useState(true);

  const toggleSwitch = () => {
    setIsOn(!isOn);
  }

  return (
    <div className={styles.editTeamProfileMembershipContainer}>
      <h3>Membership</h3>
      <div className={styles.profileDetailsContainer}>
        <header className={styles.header}>
          <h4>Allow membership requests</h4>
          <div className={styles.onOffBTNContainer}>
            <button
              className={`${styles.sliderSwitch} ${isOn ? styles.on : styles.off}`}
              onClick={toggleSwitch} aria-checked={isOn} role="switch"
            >
              {/* <span className={styles.srOnly}>{isOn ? "On" : "Off"}</span> */}
              <span className={styles.sliderThumb} />
            </button>
          </div>
        </header>
        <div className={styles.content}>
          <p>
          Turn on to accept requests from other users who wish to join your team.
          </p>
        </div>
      </div>
    </div>
  )
}

export default EditTeamProfileMembership