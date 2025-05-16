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

const FreeFireEvents = () => {
    const [showAll, setShowAll] = useState(false);
    const [freeFireEvents, setFreeFireEvents] = useState([]);
    const { data: session } = useSession();

    const handleToggle = () => {
        setShowAll(!showAll);
    }

    useEffect(() => {
        const fetchFreeFireEvents = async () => {
            if (!session || !session.user?.sessionToken) {
                console.error("No session token available.");
                return;
            }

            const sessionToken = session.user.sessionToken;

            try {
                const response = await axios.get(
                    "https://vermillionent.pythonanywhere.com/event/get-all-events/",
                    {
                        headers: {
                            Authorization: `Bearer ${sessionToken}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                // Extract Free Fire events from the by_game section
                const events = response.data.data.by_game["Free Fire"] || [];
                setFreeFireEvents(events);
                console.log("Fetched Free Fire events:", events);
            } catch (error) {
                console.error("Failed to fetch Free Fire events:", error);
                if (error.response) {
                    console.log("Response status:", error.response.status);
                    console.log("Response data:", error.response.data);
                }
            }
        };

        if (session) {
            fetchFreeFireEvents();
        }
    }, [session]);

    // Format date to display in a readable format
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    // Get event image with proper error handling
    const getEventImage = (event) => {
        // Define base URL for absolute path resolution
        const baseUrl = "https://vermillionent.pythonanywhere.com";
        
        // Convert relative URLs to absolute URLs
        const getAbsoluteUrl = (url) => {
            if (!url) return null;
            return url.startsWith("http")
                ? url
                : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
        };
        
        // Use absolute URL for banner if it exists and isn't "null"
        if (event.banner && event.banner !== "null") {
            return getAbsoluteUrl(event.banner);
        }
        
        // For default image, use a placeholder
        return "https://via.placeholder.com/400x200?text=Event";
    };

    return (
        <div className={allEventsStyles.fifaTournamentsContainer}>
            <div className={allEventsStyles.header}>
                <h3>Free Fire Events</h3>
                {!showAll && freeFireEvents.length > 3 && (
                    <button
                        className={allEventsStyles.seeMoreBTN}
                        onClick={handleToggle}
                    >
                        See more<LuArrowRight />
                    </button>
                )}
            </div>

            <div className={allEventsStyles.cardsContainer}>
                {freeFireEvents.slice(0, showAll ? freeFireEvents.length : 3).map((event, index) => (
                    <div key={index} className={allEventsStyles.cardContainer}>
                        <div className={allEventsStyles.imageContainer}>
                            <Image
                                src={getEventImage(event)}
                                alt={event.name || "Event"}
                                width={400}
                                height={200}
                                style={{ width: 'auto', height: 'auto' }}
                                onError={(e) => {
                                    e.target.src = "https://via.placeholder.com/400x200?text=Event";
                                }}
                                unoptimized={true} // For external images
                            />
                        </div>
                                    
                        <div className={menuContentStyles.descriptionContainer}>
                            <div className={menuContentStyles.descriptionNameLocationContainer}>
                                <p><span className={menuContentStyles.descriptionNameSpan}>{event.name}</span></p>
                            </div>

                            <div className={menuContentStyles.detailsContainer}>
                                <div className={newTournamentStyles.eventTypeAndLocationContainer}>
                                    <p className={newTournamentStyles.eventTypeParagraph}>
                                        <span className={menuContentStyles.eventTypeSpan}>{event.event_type}</span>
                                    </p>
                                    {event.location && (
                                        <>
                                            <span className={menuContentStyles.dotSpan}>
                                                <GoDotFill className={menuContentStyles.dotIcon} />
                                            </span>
                                            <span className={menuContentStyles.locationSpan}>{event.location}</span>
                                        </>
                                    )}
                                </div>
                    
                                <p className={menuContentStyles.dateParagraph}>
                                    <span className={menuContentStyles.calendarIconSpan}><FiCalendar className={menuContentStyles.calendarIcon} /></span>
                                    <span className={menuContentStyles.dateSpan}>{formatDate(event.event_date)}</span>
                                </p>
                                    
                                <p className={menuContentStyles.feeParagraph}>
                                    <span className={newTournamentStyles.feeIconSpan}><PiMoneyWavy className={menuContentStyles.feeIcon} /></span>
                                    <span className={menuContentStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={menuContentStyles.coinIcon} /></span> {event.entry_fee}</span>
                                </p>
                            </div>
                        
                            <div className={`${newTournamentStyles.buttonContainer} ${allEventsStyles.buttonContainer}`}>
                                <Link href={`/events/view-event/${event.event_id}`} className={newTournamentStyles.viewDetailsBTN}>View Details</Link>
                                <Link href={`/events/register-event/${event.event_id}`} className={newTournamentStyles.registerBTN}>Register</Link>
                            </div>
                        </div>
                    </div>
                ))}
                
                {showAll && freeFireEvents.length > 3 && (
                    <button
                        className={`${allEventsStyles.seeMoreBTN} ${allEventsStyles.seeLessBTN}`}
                        onClick={handleToggle}
                    >
                        <LuArrowLeft />See less
                    </button>
                )}

                {freeFireEvents.length === 0 && (
                    <div className={allEventsStyles.noEventsMessage}>
                        <p>No Free Fire events available at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FreeFireEvents;