import { imagePlaceholder, mediaIn } from '@/lib/mediaUrl';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiCalendar } from "react-icons/fi";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { LuArrowRight } from "react-icons/lu";
import { LuArrowLeft } from "react-icons/lu";
import { GoDotFill } from "react-icons/go";
import menuContentStyles from '@/styles/menu/menu-content.module.css';
import newTournamentStyles from './../../../tournaments/new-tournaments/new-tournaments.module.css';
import allEventsStyles from './../all-events.module.css';
import axios from 'axios';
import { useSession } from "next-auth/react";
import { useT } from '@/i18n/LanguageProvider';
import { appLocale } from '@/lib/appLocale';
const FortniteEvents = () => {
  const tt = useT();
  const [showAll, setShowAll] = useState(false);
  const [fortniteEvents, setFortniteEvents] = useState([]);
  const {
    data: session
  } = useSession();
  const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}`;
  const handleToggle = () => {
    setShowAll(!showAll);
  };
  useEffect(() => {
    const fetchFortniteEvents = async () => {
      if (!session || !session.user?.sessionToken) {
        console.error("No session token available.");
        return;
      }
      const sessionToken = session.user.sessionToken;
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/event/get-all-events/`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json"
          }
        });

        // Extract Fortnite events from the by_game section
        const events = response.data.data.by_game["Fortnite"] || [];
        setFortniteEvents(events);
        console.log("Fetched Fortnite events:", events);
      } catch (error) {
        console.error("Failed to fetch Fortnite events:", error);
        if (error.response) {
          console.log("Response status:", error.response.status);
          console.log("Response data:", error.response.data);
        }
      }
    };
    if (session) {
      fetchFortniteEvents();
    }
  }, [session]);

  // Function to get the correct image URL
  const getImageUrl = (imagePath) =>
    imagePath ? mediaIn(imagePath, '/media/event_banners') : imagePlaceholder('Event');

  // Format date to display in a readable format
  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString(appLocale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  return <div className={allEventsStyles.fifaTournamentsContainer}>
            <div className={allEventsStyles.header}>
                <h3>{tt("ui.fortnite.events.8ab6", "Fortnite Events")}</h3>
                {!showAll && fortniteEvents.length > 3 && <button className={allEventsStyles.seeMoreBTN} onClick={handleToggle}>
                        {tt("ui.see.more.c510", "See more")}<LuArrowRight />
                    </button>}
            </div>

            <div className={allEventsStyles.cardsContainer}>
                {fortniteEvents.slice(0, showAll ? fortniteEvents.length : 3).map((event, index) => <div key={index} className={allEventsStyles.cardContainer}>
                        <div className={allEventsStyles.imageContainer}>
                            <Image src={getImageUrl(event.banner)} alt={event.name || "Event"} width={400} height={200} />
                        </div>
                                    
                        <div className={menuContentStyles.descriptionContainer}>
                            <div className={menuContentStyles.descriptionNameLocationContainer}>
                                <p><span className={menuContentStyles.descriptionNameSpan}>{event.name}</span></p>
                            </div>

                            <div className={menuContentStyles.detailsContainer}>
                                <div className={menuContentStyles.eventOrParticipantTypeContainer}>
                                    <p className={menuContentStyles.eventTypeParagraph}>
                                        <span className={menuContentStyles.eventTypeSpan}>{event.event_type}</span>
                                    </p>
                                    {event.location && <>
                                            <span className={menuContentStyles.dotSpan}>
                                                <GoDotFill className={menuContentStyles.dotIcon} />
                                            </span>
                                            <span className={menuContentStyles.locationSpan}>{event.location}</span>
                                        </>}
                                </div>
                    
                                <p className={menuContentStyles.dateParagraph}>
                                    <span className={menuContentStyles.calendarIconSpan}><FiCalendar className={menuContentStyles.calendarIcon} /></span>
                                    <span className={menuContentStyles.dateSpan}>{formatDate(event.event_date)}</span>
                                </p>
                                    
                                <p className={menuContentStyles.feeParagraph}>
                                    <span className={menuContentStyles.feeIconSpan}><PiMoneyWavy className={menuContentStyles.feeIcon} /></span>
                                    <span className={menuContentStyles.feeSpan}>{tt("ui.fee.f813", "Fee:")} <span><RiCopperCoinFill className={menuContentStyles.coinIcon} /></span> {event.entry_fee}</span>
                                </p>
                            </div>
                        
                            <div className={`${newTournamentStyles.buttonContainer} ${allEventsStyles.buttonContainer}`}>
                                <Link href={`/events/view-event/${event.event_id}`} className={newTournamentStyles.viewDetailsBTN}>{tt("ui.view.details.907b", "View Details")}</Link>
                                <Link href={`/events/${event.event_id}?tab=tickets`} className={newTournamentStyles.registerBTN}>{tt("ui.register.d672", "Register")}</Link>
                            </div>
                        </div>
                    </div>)}
                
                {showAll && fortniteEvents.length > 3 && <button className={`${allEventsStyles.seeMoreBTN} ${allEventsStyles.seeLessBTN}`} onClick={handleToggle}>
                        <LuArrowLeft />{tt("ui.see.less.47c7", "See less")}
                    </button>}

                {fortniteEvents.length === 0 && <div className={allEventsStyles.noEventsMessage}>
                        <p>{tt("ui.no.fortnite.events.available.599b", "No Fortnite events available at the moment.")}</p>
                    </div>}
            </div>
        </div>;
};
export default FortniteEvents;