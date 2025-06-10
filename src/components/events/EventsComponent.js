"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import Link from "next/link";
import { MdOutlineClose } from "react-icons/md";
import { HiPlus } from "react-icons/hi";
import { CiSearch } from "react-icons/ci";
import { FiSearch } from "react-icons/fi";
import { BiFilter } from "react-icons/bi";
import EventsFeatured from "./events-featured/EventsFeatured";
import UpcomingEvents from "./upcoming-events/UpcomingEvents";
import AllEvents from "./all-events/AllEvents";
import createTournamentStyles from "@/styles/create-tournament/create-tournament.module.css";
import tournamentStyles from "./../tournaments/tournaments.module.css";
import styles from "./events.module.css";

const EventsComponent = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [selectedTournamentType, setSelectedTournamentType] = useState("");
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const { data: session, status } = useSession();

  console.log("Session:", session); // Debugging log

  const baseUrl = "https://vermillionent.pythonanywhere.com";

  // Memoize the helper functions with useCallback
  const getAbsoluteUrl = useCallback((url, type = "default") => {
    if (!url) {
      if (type === "banner") {
        return "https://vermillionent.pythonanywhere.com/media/default-banner.jpg";
      }
      return "https://vermillionent.pythonanywhere.com/media/default-profile.jpg";
    }
    
    if (url.startsWith("http")) {
      return url;
    }
    
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  }, [baseUrl]);

  const processEventImages = useCallback((events) => {
    return events.map((event) => ({
      ...event,
      banner_image: getAbsoluteUrl(event.banner_image),
      organizer_logo: getAbsoluteUrl(event.organizer_logo),
    }));
  }, [getAbsoluteUrl]);

  const fetchEvents = useCallback(async () => {
    if (!session || !session.user?.sessionToken) {
      console.error("No session token available.");
      return;
    }

    console.log("Session Token:", session.user.sessionToken); // Debugging log
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

      const featured = processEventImages(response.data.data.featured || []);
      const upcoming = processEventImages(response.data.data.upcoming || []);

      setFeaturedEvents(featured); 
      setUpcomingEvents(upcoming);
      console.log("Fetched events:", response.data);
      // assuming your response contains this structure
    } catch (error) {
      console.error("Failed to fetch events:", error);
      if (error.response) {
        console.log("Response status:", error.response.status);
        console.log("Response data:", error.response.data);
      }
    }
  }, [session, processEventImages]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const toggleSearchBar = () => {
    setIsSearchBarVisible((prev) => !prev);
  };

  const handleSearch = () => {
    if (searchQuery.trim() !== "") {
      console.log(`Searching for: ${searchQuery}`);
    }
  };

  const handleFilterChange = (event) => {
    setSelectedTournamentType(event.target.value);
  };

  const toggleDropdown = () => {
    setIsDropdownVisible((prev) => !prev);
  };

  return (
    <div className={styles.eventsComponentContainer}>
      <div className={tournamentStyles.searchFilterCreateTournamentContainer}>
        {/* Search Bar */}
        <div className={tournamentStyles.searchContainer}>
          {!isSearchBarVisible && (
            <FiSearch
              className={tournamentStyles.searchIconTrigger}
              onClick={toggleSearchBar}
            />
          )}

          {isSearchBarVisible && (
            <div className={tournamentStyles.searchBar}>
              <MdOutlineClose
                className={tournamentStyles.closeIcon}
                onClick={toggleSearchBar}
              />
              <input
                type="text"
                placeholder="Search tournaments, events, users..."
                className={tournamentStyles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <CiSearch
                className={tournamentStyles.searchIconInside}
                onClick={handleSearch}
              />
            </div>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className={tournamentStyles.filterContainer}>
          <BiFilter
            className={tournamentStyles.filterIcon}
            onClick={toggleDropdown}
          />
          {isDropdownVisible && (
            <select
              value={selectedTournamentType}
              onChange={handleFilterChange}
              className={`${createTournamentStyles.inputWithDropdown} ${tournamentStyles.inputWithDropdown}`}
            >
              <option value="">Filter</option>
              <option value="battle-royale">Battle Royale</option>
              <option value="sports">Sports</option>
              <option value="strategy">Strategy</option>
            </select>
          )}
        </div>

        {/* Create Tournament Button */}
        <Link
          href={"./events/create-event"}
          className={`${tournamentStyles.createTournamentBTN} redBTN`}
        >
          <HiPlus className={tournamentStyles.plusIcon} />
          Create Event
        </Link>
      </div>

      <EventsFeatured featuredEvents={featuredEvents} />
      <UpcomingEvents upcomingEvents={upcomingEvents} />

      <AllEvents />
    </div>
  );
};

export default EventsComponent;