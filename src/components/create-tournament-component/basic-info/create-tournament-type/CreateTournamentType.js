'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import axios from "axios";
import { FaAsterisk } from "react-icons/fa6";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-type.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import { appLocale } from '@/lib/appLocale';
const CreateTournamentType = ({
  formData = {},
  updateFormData
}) => {
  const tx = useTx();
  const tt = useT();
  const [selectedOption, setSelectedOption] = useState(formData?.tournament_type || null);
  const [isLinkedToEvent, setIsLinkedToEvent] = useState(true);
  const [hideLocation, setHideLocation] = useState(false);
  const [eventSearchTerm, setEventSearchTerm] = useState('');
  const [availableEvents, setAvailableEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const {
    data: session
  } = useSession();
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
  const processEventImages = useCallback(events => {
    return events.map(event => ({
      ...event,
      banner_image: getAbsoluteUrl(event.banner),
      organizer_logo: getAbsoluteUrl(event.logo)
    }));
  }, [getAbsoluteUrl]);

  // Fetch events from backend
  const fetchEvents = useCallback(async () => {
    if (!session || !session.user?.sessionToken) {
      return;
    }
    setIsLoadingEvents(true);
    const sessionToken = session.user.sessionToken;
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/event/get-all-events/`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json"
        }
      });

      // Combine featured and upcoming events
      const featured = response.data.data.featured || [];
      const upcoming = response.data.data.upcoming || [];
      const allEvents = [...featured, ...upcoming];

      // Process the events to include absolute URLs
      const processedEvents = processEventImages(allEvents);

      // Map to the format expected by the component
      const formattedEvents = processedEvents.map(event => ({
        id: event.id || event.event_id,
        // Try both possible ID fields
        name: event.name || event.title || event.event_name,
        date: event.start_date || event.date || event.event_date,
        banner_image: event.banner_image,
        organizer_logo: event.organizer_logo,
        description: event.description,
        location: event.location
      })).filter(event => event.id && event.name); // Filter out events without ID or name

      // An event can be BOTH featured and upcoming, and the two lists were
      // concatenated, so it appeared twice in the results. Keyed by id, first
      // one wins.
      const seen = new Set();
      const unique = formattedEvents.filter(event => {
        if (seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      });

      setAvailableEvents(unique);
    } catch (error) {
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
    const filtered = availableEvents.filter(event => event.name.toLowerCase().includes(eventSearchTerm.toLowerCase()));
    setFilteredEvents(filtered);
  }, [eventSearchTerm, availableEvents]);
  const handleOptionClick = option => {
    setSelectedOption(option);
    updateFormData('tournament_type', option);
  };
  const handleHideLocationChange = event => {
    setHideLocation(event.target.checked);
    if (event.target.checked) {
      updateFormData('hide_location', 'true');
    } else {
      updateFormData('hide_location', 'false');
    }
  };
  const handleEventLinkChange = value => {
    setIsLinkedToEvent(value === 'yes');
  };
  const handleEventSearchChange = e => {
    setEventSearchTerm(e.target.value);
  };
  const handleEventSelect = eventId => {
    // Add safety check for eventId
    if (!eventId) {
      return;
    }
    updateFormData('event', eventId.toString());
    const selectedEvent = availableEvents.find(event => event.id === eventId);
    setEventSearchTerm(selectedEvent?.name || '');
  };
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.tournament.type.21bd", "Tournament Type")}</h3>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          {['virtual', 'physical', 'hybrid'].map(option => <div key={option} className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === option ? createTournamentStyles.activeBox : ''}`} onClick={() => handleOptionClick(option)}>
              <div className={`${createTournamentStyles.option} ${selectedOption === option ? createTournamentStyles.selected : ''}`}></div>
              <div className={createTournamentStyles.boxTextContainer}>
                <h4>{option.charAt(0).toUpperCase() + option.slice(1)}</h4>
                <p>
                  {option === 'virtual' ? tx("Your tournament will be held only as a virtual tournament.") : option === 'physical' ? tx("Your tournament will be held as a physical event in a physical space.") : tx("Your tournament will be both virtual and physical.")}
                </p>
              </div>
            </div>)}
        </div>

        <div className={styles.outerVenueVirtualLinkContainer}>
          <div className={createTournamentStyles.twoInputContainer}>
            {selectedOption !== 'physical' && <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="virtualLink"><span className="fieldLabelRow">{tt("ui.virtual.link.7e09", "Virtual Link")} <InfoTip id="virtualLink" /></span></label>
                <input id="virtualLink" type="text" placeholder={tt("ui.paste.link.here.d7d4", "Paste link here")} className={createTournamentStyles.inputText} onChange={e => updateFormData('virtual_link', e.target.value)} disabled={hideLocation} />
              </div>}

            {selectedOption !== 'virtual' && <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="venue"><span className="fieldLabelRow">{tt("ui.venue.67cd", "Venue")} <InfoTip id="venue" /></span></label>
                <input id="venue" type="text" placeholder={tt("ui.enter.physical.location.da63", "Enter physical location")} className={createTournamentStyles.inputText} onChange={e => updateFormData('tournament_location', e.target.value)} disabled={hideLocation} />
              </div>}
          </div>

          <div className={styles.hideLocationContainer}>
            <input type="checkbox" className={styles.hideCheckbox} checked={hideLocation} onChange={handleHideLocationChange} />
            <label><span className="fieldLabelRow">{tt("ui.hide.location.36ab", "Hide location")} <InfoTip id="hideLocation" /></span></label>
          </div>

          <div className={styles.outerQuestionContainer}>
            <div className={styles.questionContainer}>
              <p>{tt("ui.tournament.linked.event.46c7", "Is this tournament linked to an event?")}</p>

              <div className={styles.optionContainer}>
                {['yes', 'no'].map(value => <label key={value} className={styles.optionLabel}>
                    <input type="radio" name="linkedToEvent" value={value} className={styles.optionInput} checked={isLinkedToEvent === (value === 'yes')} onChange={() => handleEventLinkChange(value)} />
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </label>)}
              </div>
            </div>

            {isLinkedToEvent && <div className={styles.eventContainer}>
                <label htmlFor="selectEvent" className={createTournamentStyles.labelWithAsterisk}>
                  <span className="fieldLabelRow">{tt("ui.select.event.c20e", "Select Event")}
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span> <InfoTip id="selectEvent" /></span>
                </label>
                
                <div className={styles.eventSearchContainer}>
                  <input id="selectEvent" type="text" placeholder={tt("ui.search.events.7710", "Search for events...")} className={createTournamentStyles.inputText} value={eventSearchTerm} onChange={handleEventSearchChange} />
                  
                  {isLoadingEvents && <div className={styles.loadingMessage}>
                      {tt("ui.loading.events.f691", "Loading events...")}
                    </div>}
                  
                  {eventSearchTerm && !isLoadingEvents && filteredEvents.length > 0 && <div className={styles.eventResults} role="listbox">
                      {filteredEvents.map(event => <button
                          type="button"
                          key={event.id}
                          role="option"
                          aria-selected={false}
                          className={styles.eventOption}
                          onClick={() => handleEventSelect(event.id)}>
                          <span className={styles.eventName}>{event.name}</span>
                          <span className={styles.eventMeta}>
                            {/* Was the raw ISO timestamp, and below it a debug
                                line printing the database id to every organiser
                                who ever opened this. */}
                            {event.date
                              ? new Date(event.date).toLocaleDateString(appLocale(), {
                                  day: 'numeric', month: 'long', year: 'numeric',
                                })
                              : tt('ui.dateNotSet', 'Date not set')}
                            {event.location ? ` · ${event.location}` : ''}
                          </span>
                        </button>)}
                    </div>}
                  
                  {eventSearchTerm && !isLoadingEvents && filteredEvents.length === 0 && availableEvents.length > 0 && <div className={styles.noEventsFound}>
                      {tt("ui.no.events.found.matching.105f", "No events found matching your search.")}
                    </div>}

                  {!isLoadingEvents && availableEvents.length === 0 && eventSearchTerm && <div className={styles.noEventsFound}>
                      {tt("ui.no.events.available.please.e682", "No events available. Please try again later.")}
                    </div>}
                </div>
              </div>}
          </div>
        </div>
      </div>
    </div>;
};
export default CreateTournamentType;