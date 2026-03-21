import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import axios from "axios";
import { FaAsterisk } from "react-icons/fa6";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-type.module.css';

const CreateTournamentType = ({ formData={}, updateFormData }) => {
  const [selectedOption, setSelectedOption] = useState(formData?.tournament_type || null);
  const [isLinkedToEvent, setIsLinkedToEvent] = useState(true);
  const [hideLocation, setHideLocation] = useState(false);
  const [eventSearchTerm, setEventSearchTerm] = useState('');
  const [availableEvents, setAvailableEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState([]);

  const { data: session } = useSession();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  // Helper function to get absolute URLs
  const getAbsoluteUrl = useCallback((url, type = "default") => {
    if (!url) {
      if (type === "banner") {
        return `${process.env.NEXT_PUBLIC_API_URL}/media/default-banner.jpg`;
      }
      return `${process.env.NEXT_PUBLIC_API_URL}/media/default-profile.jpg`;
    }
    
    if (url.startsWith("http")) {
      return url;
    }
    
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  }, [baseUrl]);

  // Process event images to use absolute URLs
  const processEventImages = useCallback((events) => {
    return events.map((event) => ({
      ...event,
      banner_image: getAbsoluteUrl(event.banner),
      organizer_logo: getAbsoluteUrl(event.logo),
    }));
  }, [getAbsoluteUrl]);

  // Fetch events from backend
  const fetchEvents = useCallback(async () => {
    if (!session || !session.user?.sessionToken) {
      console.error("No session token available for fetching events.");
      return;
    }

    setIsLoadingEvents(true);
    const sessionToken = session.user.sessionToken;

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/event/get-all-events/`,
        {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      
      // Combine featured and upcoming events
      const featured = response.data.data.featured || [];
      const upcoming = response.data.data.upcoming || [];
      const allEvents = [...featured, ...upcoming];
      
      console.log("Combined events before processing:", allEvents);

      // Process the events to include absolute URLs
      const processedEvents = processEventImages(allEvents);
      
      // Map to the format expected by the component
      const formattedEvents = processedEvents.map(event => ({
        id: event.id || event.event_id, // Try both possible ID fields
        name: event.name || event.title || event.event_name,
        date: event.start_date || event.date || event.event_date,
        banner_image: event.banner_image,
        organizer_logo: event.organizer_logo,
        description: event.description,
        location: event.location
      })).filter(event => event.id && event.name); // Filter out events without ID or name

      setAvailableEvents(formattedEvents);
      console.log("Fetched events for tournament creation:", formattedEvents);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      if (error.response) {
        console.log("Response status:", error.response.status);
        console.log("Response data:", error.response.data);
      }
      // Fallback to empty array if fetch fails
      setAvailableEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [session, processEventImages]);

  // Fetch events when component mounts and session is available
  useEffect(() => {
    if (session && session.user?.sessionToken) {
      fetchEvents();
    }
  }, [session, fetchEvents]);

  // Filter events based on search term
  useEffect(() => {
    if (!eventSearchTerm.trim()) {
      setFilteredEvents([]);
      return;
    }

    const filtered = availableEvents.filter(event =>
      event.name.toLowerCase().includes(eventSearchTerm.toLowerCase())
    );
    setFilteredEvents(filtered);
  }, [eventSearchTerm, availableEvents]);

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    updateFormData('tournament_type', option);
  };
  
  const handleHideLocationChange = (event) => {
    setHideLocation(event.target.checked);
    if (event.target.checked) {
      updateFormData('hide_location', 'true');
    } else {
      updateFormData('hide_location', 'false');
    }
  };

  const handleEventLinkChange = (value) => {
    setIsLinkedToEvent(value === 'yes');
  };

  const handleEventSearchChange = (e) => {
    setEventSearchTerm(e.target.value);
  };

  const handleEventSelect = (eventId) => {
    // Add safety check for eventId
    if (!eventId) {
      console.error('Event ID is undefined');
      return;
    }
    
    updateFormData('event', eventId.toString());
    const selectedEvent = availableEvents.find(event => event.id === eventId);
    setEventSearchTerm(selectedEvent?.name || '');
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
                  
                  {isLoadingEvents && (
                    <div className={styles.loadingMessage}>
                      Loading events...
                    </div>
                  )}
                  
                  {eventSearchTerm && !isLoadingEvents && filteredEvents.length > 0 && (
                    <div >
                      {filteredEvents.map((event) => (
                        <div
                          key={event.id}
                          className={styles.eventOption}
                          onClick={() => handleEventSelect(event.id)}
                        >
                          <div className={styles.eventName}>{event.name}</div>
                          <div className={styles.eventDate}>{event.date}</div>
                          {/* Debug info - remove after fixing */}
                          <div style={{fontSize: '10px', color: 'gray'}}>ID: {event.id}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {eventSearchTerm && !isLoadingEvents && filteredEvents.length === 0 && availableEvents.length > 0 && (
                    <div className={styles.noEventsFound}>
                      No events found matching your search.
                    </div>
                  )}

                  {!isLoadingEvents && availableEvents.length === 0 && eventSearchTerm && (
                    <div className={styles.noEventsFound}>
                      No events available. Please try again later.
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