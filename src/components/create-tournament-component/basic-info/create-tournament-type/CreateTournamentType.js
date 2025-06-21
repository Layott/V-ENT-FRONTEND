import { useState } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-type.module.css';

const CreateTournamentType = ({ formData={}, updateFormData }) => {
  const [selectedOption, setSelectedOption] = useState(formData?.tournament_type || null);
  const [isLinkedToEvent, setIsLinkedToEvent] = useState(true);
  const [hideLocation, setHideLocation] = useState(false);
  const [eventSearchTerm, setEventSearchTerm] = useState('');

  // Mock data for events - replace with actual API call
  const availableEvents = [
    { id: 1, name: 'Summer Gaming Championship 2024', date: '2024-07-15' },
    { id: 2, name: 'Winter Esports Tournament', date: '2024-12-10' },
    { id: 3, name: 'Spring Mobile Gaming Event', date: '2024-04-20' },
    { id: 4, name: 'Annual Gaming Fest', date: '2024-08-30' },
    { id: 5, name: 'Regional Championship Series', date: '2024-06-05' }
  ];

  const filteredEvents = availableEvents.filter(event =>
    event.name.toLowerCase().includes(eventSearchTerm.toLowerCase())
  );

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    updateFormData('tournament_type', option);
  };
  
  const handleHideLocationChange = (event) => {
    setHideLocation(event.target.checked);
    if (event.target.checked) {
      updateFormData('hide_location', 'true');
    }else {
      updateFormData('hide_location', 'false');}
  };

  const handleEventLinkChange = (value) => {
    setIsLinkedToEvent(value === 'yes');
  };

  const handleEventSearchChange = (e) => {
    setEventSearchTerm(e.target.value);
  };

  const handleEventSelect = (eventId) => {
    updateFormData('event', eventId.toString());
    setEventSearchTerm(availableEvents.find(event => event.id === eventId)?.name || '');
  };

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Tournament Type</h3>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          {['virtual', 'physical', 'hybrid'].map((option) => (
            <div
              key={option}
              className={`${createTournamentStyles.oneThirdBoxContainer} ${
                selectedOption === option ? createTournamentStyles.activeBox : ''
              }`}
              onClick={() => handleOptionClick(option)}
            >
              <div
                className={`${createTournamentStyles.option} ${
                  selectedOption === option ? createTournamentStyles.selected : ''
                }`}
              ></div>
              <div className={createTournamentStyles.boxTextContainer}>
                <h4>{option.charAt(0).toUpperCase() + option.slice(1)}</h4>
                <p>
                  {option === 'virtual'
                    ? 'Your tournament will be held only as a virtual tournament.'
                    : option === 'physical'
                    ? 'Your tournament will be held as a physical event in a physical space.'
                    : 'Your tournament will be both virtual and physical.'}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.outerVenueVirtualLinkContainer}>
          <div className={createTournamentStyles.twoInputContainer}>
            {selectedOption !== 'physical' && (
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="virtualLink">Virtual Link</label>
                <input
                  id="virtualLink"
                  type="text"
                  placeholder="Paste link here"
                  className={createTournamentStyles.inputText}
                  onChange={(e) => updateFormData('virtual_link', e.target.value)}
                  disabled={hideLocation}
                />
              </div>
            )}

            {selectedOption !== 'virtual' && (
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="venue">Venue</label>
                <input
                  id="venue"
                  type="text"
                  placeholder="Enter physical location"
                  className={createTournamentStyles.inputText}
                  onChange={(e) => updateFormData('tournament_location', e.target.value)}
                  disabled={hideLocation}
                />
              </div>
            )}
          </div>

          <div className={styles.hideLocationContainer}>
            <input
              type="checkbox"
              className={styles.hideCheckbox}
              checked={hideLocation}
              onChange={handleHideLocationChange}
            />
            <label>Hide location</label>
          </div>

          <div className={styles.outerQuestionContainer}>
            <div className={styles.questionContainer}>
              <p>Is this tournament linked to an event?</p>

              <div className={styles.optionContainer}>
                {['yes', 'no'].map((value) => (
                  <label key={value} className={styles.optionLabel}>
                    <input
                      type="radio"
                      name="linkedToEvent"
                      value={value}
                      className={styles.optionInput}
                      checked={isLinkedToEvent === (value === 'yes')}
                      onChange={() => handleEventLinkChange(value)}
                    />
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {isLinkedToEvent && (
              <div className={styles.eventContainer}>
                <label htmlFor="selectEvent" className={createTournamentStyles.labelWithAsterisk}>
                  Select Event
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </label>
                
                <div className={styles.eventSearchContainer}>
                  <input
                    id="selectEvent"
                    type="text"
                    placeholder="Search for events..."
                    className={createTournamentStyles.inputText}
                    value={eventSearchTerm}
                    onChange={handleEventSearchChange}
                  />
                  
                  {eventSearchTerm && filteredEvents.length > 0 && (
                    <div >
                      {filteredEvents.map((event) => (
                        <div
                          key={event.id}
                          className={styles.eventOption}
                          onClick={() => handleEventSelect(event.id)}
                        >
                          <div className={styles.eventName}>{event.name}</div>
                          <div className={styles.eventDate}>{event.date}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {eventSearchTerm && filteredEvents.length === 0 && (
                    <div className={styles.noEventsFound}>
                      No events found matching your search.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTournamentType;