import { useState, useEffect } from 'react';
import profileStyles from "@/styles/profile/profile-page.module.css";
import styles from './edit-user-profile-details.module.css';

const EditUserProfileDetails = ({ fullname, username, description, state, country, handleInputChange }) => {


  return (
    <div className={styles.editProfileDetailsContainer}>
      <h3>Profile Details</h3>
      <div className={styles.profileDetailsContainer}>
        <div className={styles.inputGroup}>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            name="username"
            placeholder= "Username"
            value={username}
            onChange={handleInputChange}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="fullname">Profile Name</label>
          <input
            type="text"
            name="fullname"
            placeholder="Full Name"
            value={fullname}
            onChange={handleInputChange}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="description">Bio</label>
          <textarea
            type="text"
            name="description"
            placeholder="Tell us something about yourself"
            value={description}
            onChange={handleInputChange}
          ></textarea>
          <p className={profileStyles.instructionText}>Maximum of 140 characters</p>
        </div>

        <div className={styles.inputGroup}>
  <label htmlFor="state">State/Province</label>
  <input
    type="text"
    name="state"
    placeholder="State/Province"
    value={state}
    onChange={handleInputChange}
  />
</div>

        <div className={styles.inputGroup}>
          <label htmlFor="country">Country</label>
          <input
            type="text"
            name="country"
            placeholder="Lagos"
            value={country}
            onChange={handleInputChange}
          />
        </div>
      </div>
    </div>
  );
};

export default EditUserProfileDetails;
