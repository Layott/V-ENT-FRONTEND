import { useState } from 'react';
import styles from './edit-team-profile-membership.module.css';
import { useT } from '@/i18n/LanguageProvider';
const EditTeamProfileMembership = () => {
  const tt = useT();
  const [isOn, setIsOn] = useState(true);
  const toggleSwitch = () => {
    setIsOn(!isOn);
  };
  return <div className={styles.editTeamProfileMembershipContainer}>
      <h3>{tt("ui.membership.53bc", "Membership")}</h3>
      <div className={styles.profileDetailsContainer}>
        <header className={styles.header}>
          <h4>{tt("ui.allow.membership.requests.2637", "Allow membership requests")}</h4>
          <div className={styles.onOffBTNContainer}>
            <button className={`${styles.sliderSwitch} ${isOn ? styles.on : styles.off}`} onClick={toggleSwitch} aria-checked={isOn} role="switch">
              {/* <span className={styles.srOnly}>{isOn ? "On" : "Off"}</span> */}
              <span className={styles.sliderThumb} />
            </button>
          </div>
        </header>
        <div className={styles.content}>
          <p>
          {tt("ui.turn.accept.requests.from.17ab", "Turn on to accept requests from other users who wish to join your team.")}
          </p>
        </div>
      </div>
    </div>;
};
export default EditTeamProfileMembership;