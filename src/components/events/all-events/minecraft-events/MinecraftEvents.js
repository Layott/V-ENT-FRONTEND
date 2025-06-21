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

const MinecraftEvents = () => {
    const [showAll, setShowAll] = useState(false);
    const [minecraftEvents, setMinecraftEvents] = useState([]);
    const { data: session } = useSession();
    const baseUrl = "https://vermillionent.pythonanywhere.com";

    const handleToggle = () => {
        setShowAll(!showAll);
    }

    useEffect(() => {
        const fetchMinecraftEvents = async () => {
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

                // Extract Minecraft events from the by_game section
                const events = response.data.data.by_game["Minecraft"] || [];
                setMinecraftEvents(events);
                console.log("Fetched Minecraft events:", events);
            } catch (error) {
                console.error("Failed to fetch Minecraft events:", error);
                if (error.response) {
                    console.log("Response status:", error.response.status);
                    console.log("Response data:", error.response.data);
                }
            }
        };

        if (session) {
            fetchMinecraftEvents();
        }
    }, [session]);

    // Function to get the correct image URL
    const getImageUrl = (imagePath) => {
        if (!imagePath) return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='180'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23666'%3EEvent%3C/text%3E%3C/svg%3E";
        
        // If it's already a full URL, return as is
        if (imagePath.startsWith('http')) return imagePath;
        
        // If it starts with /media, prepend your backend URL
        if (imagePath.startsWith('/media')) {
            return `${baseUrl}${imagePath}`;
        }
        
        // If it's just a filename, construct the full path
        return `${baseUrl}/media/event_banners/${imagePath}`;
    };

    // Format date to display in a readable format
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    return (
        <div className={allEventsStyles.fifaTournamentsContainer}>
            <div className={allEventsStyles.header}>
                <h3>Minecraft Events</h3>
                {!showAll && minecraftEvents.length > 3 && (
                    <button
                        className={allEventsStyles.seeMoreBTN}
                        onClick={handleToggle}
                    >
                        See more<LuArrowRight />
                    </button>
                )}
            </div>

            <div className={allEventsStyles.cardsContainer}>
                {minecraftEvents.slice(0, showAll ? minecraftEvents.length : 3).map((event, index) => (
                    <div key={index} className={allEventsStyles.cardContainer}>
                        <div className={allEventsStyles.imageContainer}>
                            <Image
                                src={getImageUrl(event.banner)}
                                alt={event.name || "Event"}
                                width={400}
                                height={200}
                            />
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
                                    <span className={menuContentStyles.feeIconSpan}><PiMoneyWavy className={menuContentStyles.feeIcon} /></span>
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
                
                {showAll && minecraftEvents.length > 3 && (
                    <button
                        className={`${allEventsStyles.seeMoreBTN} ${allEventsStyles.seeLessBTN}`}
                        onClick={handleToggle}
                    >
                        <LuArrowLeft />See less
                    </button>
                )}

                {minecraftEvents.length === 0 && (
                    <div className={allEventsStyles.noEventsMessage}>
                        <p>No Minecraft events available at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MinecraftEvents;