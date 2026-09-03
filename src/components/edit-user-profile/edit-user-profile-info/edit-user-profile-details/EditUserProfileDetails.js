import { useState, useEffect } from 'react';
import Link from 'next/link';
import profileStyles from "@/styles/profile/profile-page.module.css";
import styles from './edit-user-profile-details.module.css';
import { COUNTRIES, isKnownCountry } from '@/constants/countries';
import { useT } from '@/i18n/LanguageProvider';

const EditUserProfileDetails = ({ fullname, username, email, description, state, country, countryIsGuess = false, handleInputChange }) => {
  const tt = useT();


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

        {/* The address on the account. CEO, 3 September 2026: "users should be
            able to change the mails linked to their account in their profile".
            The change itself already existed and worked, on Settings, behind a
            six digit code sent to the NEW address, which is the part that must
            not be duplicated: an email change with no proof of the new mailbox
            is an account takeover. So this shows the address where people look
            for it and sends them to the one flow that can change it, rather
            than growing a second one here. */}
        <div className={styles.inputGroup}>
          <label htmlFor="account-email">
            {tt('profile.emailLabel', 'Email address')}
          </label>
          <input
            id="account-email"
            type="email"
            name="account-email"
            value={email || ''}
            readOnly
            aria-describedby="account-email-note"
          />
          <p id="account-email-note" className={profileStyles.instructionText}>
            {tt('profile.emailNote', 'Changing this needs a code sent to the new address.')}
            {' '}
            <Link className={styles.emailLink} href="/settings?panel=account">
              {tt('profile.emailChange', 'Change it in Settings')}
            </Link>
          </p>
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
  {/* Never filled from an address. A carrier gateway put a Lagos player in
      Ilorin, so the city is only ever what somebody typed. */}
  <p className={styles.fieldNote}>
    {tt("ui.city.yours.to.set.8b39", "Only you set this. We never guess your city.")}
  </p>
</div>

        <div className={styles.inputGroup}>
          <label htmlFor="country">Country</label>
          {/* A list, not a text box, and the same list the tournament wizard
              restricts by. These two values are compared: a tournament open to
              "Nigeria" checks it against whatever is stored here, so free text
              on either side quietly turned away people who qualified.

              The placeholder used to read "Lagos" - a city, in a country
              field - which taught people to enter a value no country
              restriction could ever match.

              A value already saved that is not on the list stays selectable,
              so nobody's profile is silently blanked. */}
          <select
            id="country"
            name="country"
            value={country || ''}
            onChange={handleInputChange}
          >
            <option value="">Select your country</option>
            {country && !isKnownCountry(country) && <option value={country}>{country}</option>}
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* A guess and an answer look identical once stored, and a screen
              that cannot tell them apart presents the guess as a fact. This is
              the only place the difference is visible, so it says so here and
              stops saying it the moment the person picks a country. */}
          {countryIsGuess && <p className={styles.guessNote}>
            {tt("ui.country.guessed.4e71",
                "We worked this out from your connection, so it may be wrong. Pick your country to settle it.")}
          </p>}
        </div>
      </div>
    </div>
  );
};

export default EditUserProfileDetails;
