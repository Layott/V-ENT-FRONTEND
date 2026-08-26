import { useState } from "react";
import Link from "next/link";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { GrGamepad, GrLocation } from "react-icons/gr";
import { BiMapPin } from "react-icons/bi";
import { PiMoneyWavy, PiBuildingApartmentBold, PiCaretDownBold, PiCaretUpBold } from "react-icons/pi";
import { FiCopy, FiClock, FiCalendar } from "react-icons/fi";
import { FaLink } from "react-icons/fa6";
import { FaArrowLeft } from "react-icons/fa";
import { IoLocationOutline } from "react-icons/io5";
import { socialIcons } from './SocialIcons';
import profileStyles from "@/styles/profile/profile-page.module.css";
import tournamentStyles from '@/styles/tournament/tournament.module.css'
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'
import overviewRtStyles from '@/view-/overview-right/overview-rt.module.css'
import { shareLink, linkTo } from '@/lib/share';

const EventDetailsOverviewRight = ({ event, socialLinks = [] }) => {
    const [showMoreSocials, setShowMoreSocials] = useState(false);
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [severity, setSeverity] = useState("success");
    const [isMapVisible, setIsMapVisible] = useState(false);

    // Format date range
    const formatDateRange = (startDate, endDate) => {
      if (!startDate) return 'Date not set';
      
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : start;
      
      const startFormatted = start.toLocaleDateString('en-US', { 
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      
      if (startDate === endDate || !endDate) {
        return startFormatted;
      }
      
      const endFormatted = end.toLocaleDateString('en-US', { 
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      
      return `${startFormatted} - ${endFormatted}`;
    };

    // Format time range
    const formatTimeRange = (startTime, endTime) => {
      if (!startTime && !endTime) return 'Time not set';
      
      const formatTime = (time) => {
        if (!time) return '';
        // Assuming time is in 24h format like "07:00" or "23:00"
        const [hours, minutes] = time.split(':');
        const hour12 = ((parseInt(hours) + 11) % 12 + 1);
        const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes}${ampm}`;
      };

      if (startTime && endTime) {
        return `${formatTime(startTime)} - ${formatTime(endTime)} (WAT)`;
      }
      
      return `${formatTime(startTime || endTime)} (WAT)`;
    };

    // Format entry fee
    const formatEntryFee = (fee) => {
      if (!fee || fee === '0' || fee === 0) return 'FREE';
      return `₦${fee.toLocaleString()}`;
    };

    // Generate Google Maps embed URL
    const getMapEmbedUrl = (address) => {
      if (!address) return '';
      const encodedAddress = encodeURIComponent(address);
      return `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodedAddress}`;
    };

    const toggleMapVisibility = () => {
      setIsMapVisible((prev) => !prev);
    }

    const handleClose = () => {
      setOpen(false);
    }

    // Sharing goes through the shared helper: native sheet on a phone, then
    // clipboard, then showing the link if both are refused. The link carries
    // the event's name rather than its id.
    const shareEvent = async () => {
      await shareLink({
        path: linkTo.event(event),
        title: event?.name,
        text: 'Event on V-ENT',
        notify: (message) => {
          setMessage(message);
          setSeverity('success');
          setOpen(true);
        },
      });
    };

    const copyToClipboard = (text) => {
      const isClipboardAvailable = typeof window !== "undefined" && navigator.clipboard;

      if (!isClipboardAvailable) {
        setMessage("Clipboard API is not available!");
        setSeverity("error");
        setOpen(true);
        return;
      }

      navigator.clipboard
        .writeText(text).then(() => {
          setMessage("Link copied to clipboard!");
          setSeverity("success");
          setOpen(true);
        })
        .catch(() => {
          setMessage("Failed to copy the link!");
          setSeverity("error");
          setOpen(true);
        })
    }
  
    // Social Icon Mapper
    const getSocialIcon = (title) => {
      return socialIcons[title.toLowerCase()] || socialIcons.default;
    };
    
    // Use event link or default WhatsApp link
    // No fallback. This defaulted to an invented WhatsApp group link, which
    // every event without one of its own then advertised.
    const linkText = event?.event_link || event?.whatsapp_link || '';
    const address = event?.location || event?.address || "Event location not specified";
    
    // Determine platform from link
    const getPlatform = (link) => {
      if (link.includes('whatsapp')) return 'WhatsApp';
      if (link.includes('discord')) return 'Discord';
      if (link.includes('telegram')) return 'Telegram';
      if (link.includes('zoom')) return 'Zoom';
      return 'Custom Platform';
    };

  return (
    <div className={overviewLtStyles.overviewRight}>
      <div className={overviewRtStyles.rightBox}>
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>
            <PiBuildingApartmentBold className={`${overviewRtStyles.icons} ${overviewRtStyles.fillIcons}`} /> 
            Event Type
          </p>
          <p className={overviewRtStyles.paragraphValue}>
            {event?.event_type || 'Not specified'}
          </p>
        </div>
        
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>
            <PiMoneyWavy className={`${overviewRtStyles.icons} ${overviewRtStyles.fillIcons}`} /> 
            Entry Fee
          </p>
          <p className={overviewRtStyles.paragraphValue}>
            {formatEntryFee(event?.entry_fee)}
          </p>
        </div>
        
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>
            <GrGamepad className={`${overviewRtStyles.icons} ${overviewRtStyles.strokeIcons}`} /> 
            Game
          </p>
          <p className={overviewRtStyles.paragraphValue}>
            {event?.game || 'Game not specified'}
          </p>
        </div>
        
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>
            <FiCalendar className={`${overviewRtStyles.icons} ${overviewRtStyles.strokeIcons}`} /> 
            Date
          </p>
          <p className={overviewRtStyles.paragraphValue}>
            {formatDateRange(event?.event_date, event?.end_date)}
          </p>
        </div>
        
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>
            <FiClock className={`${overviewRtStyles.icons} ${overviewRtStyles.strokeIcons}`} /> 
            Time 
          </p>
          <p className={overviewRtStyles.paragraphValue}>
            {formatTimeRange(event?.start_time, event?.end_time)}
          </p>
        </div>
      </div>

      <div className={overviewRtStyles.rightBox}>
        <h3 className={`${overviewRtStyles.headerH3} ${tournamentStyles.headerH3}`}>
          <FaLink className={overviewRtStyles.priceIcon} /> Event Link
        </h3>
        
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>Platform </p>
          <p className={`${overviewRtStyles.paragraphValue} ${overviewRtStyles.paragraphValueFloatRight}`}>
            {linkText ? getPlatform(linkText) : 'Not set'}
          </p>
        </div>

        {linkText ? (
          <div className={overviewRtStyles.linkDiv}>
            <p className={overviewRtStyles.linkToBeCopied}>{linkText}</p>
            <button
              type="button"
              className={overviewRtStyles.copyBTN}
              onClick={() => copyToClipboard(linkText)}
            >
              <FiCopy className={`${overviewRtStyles.icons} ${overviewRtStyles.strokeIcons}`} />
              <span className={overviewRtStyles.copySpan}>Copy</span>
            </button>
          </div>
        ) : (
          <p className={overviewRtStyles.paragraphValue}>
            The organiser has not added a link for this event yet.
          </p>
        )}

        {/* Sharing the event itself, by its readable address, is a different
            thing from copying the organiser's own link. */}
        <div className={overviewRtStyles.linkDiv}>
          <p className={overviewRtStyles.linkToBeCopied}>Share this event</p>
          <button type="button" className={overviewRtStyles.copyBTN} onClick={shareEvent}>
            <FiCopy className={`${overviewRtStyles.icons} ${overviewRtStyles.strokeIcons}`} />
            <span className={overviewRtStyles.copySpan}>Share</span>
          </button>
        </div>
      </div>

      <div className={`${overviewRtStyles.rightBox} ${overviewRtStyles.removeBorderBottom}`}>
        <h3 className={`${overviewRtStyles.headerH3} ${tournamentStyles.headerH3}`}>
          <BiMapPin className={overviewRtStyles.priceIcon} /> Direction
        </h3>

        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>
            <IoLocationOutline className={overviewRtStyles.icons} /> Address 
          </p>
          <p className={overviewRtStyles.paragraphValue}>{address}</p>
        </div>

        <div className={overviewRtStyles.linkDiv}>
          <button 
            className={overviewRtStyles.getDirectionBTN}
            onClick={() => {
              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
              window.open(googleMapsUrl, '_blank');
            }}
          >
            Get Directions
          </button>
          <button 
            className={overviewRtStyles.copyBTN}
            onClick={() => copyToClipboard(address)}
          >
            <FiCopy className={`${overviewRtStyles.icons} ${overviewRtStyles.strokeIcons}`} />
            <span className={overviewRtStyles.copySpan}>Copy</span>
          </button>
        </div>

        <button onClick={toggleMapVisibility} className={overviewRtStyles.hideMapBTN}>
          {isMapVisible ? "Hide Map" : "Show Map"}{" "}
          {isMapVisible ? 
            <PiCaretUpBold className={overviewRtStyles.caretIcons} /> : 
            <PiCaretDownBold className={overviewRtStyles.caretIcons} />
          }
        </button>
      </div>

      {isMapVisible && address && address !== "Event location not specified" && (
        <div className={overviewRtStyles.mapContainer}>
          <iframe
            src={`https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${encodeURIComponent(address)}`}
            frameBorder="0"
            allowFullScreen=""
            className={overviewRtStyles.mapIframe}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Google Map"
          />
        </div>
      )}

      <div className={overviewRtStyles.rightBox}>
        <h3 className={`${overviewRtStyles.headerH3} ${tournamentStyles.headerH3}`}>Social Links</h3>

        <div className={`${profileStyles.socialLinksListContainer} ${overviewRtStyles.socialLinksListContainer}`}>
          {Array.isArray(socialLinks) && socialLinks.length === 0 ? (
            <div className={profileStyles.noInterestsContainer}>
              <h4 className={profileStyles.profileH4HeaderEmptyContent}>No social links yet</h4>
              <p className={profileStyles.emptyParagraphContent}>No social media links have been added for this event</p>
            </div>
          ) : (
            <>
              {socialLinks.slice(0, showMoreSocials ? socialLinks.length : 4).map((socialLink, index) => (
                <Link
                  href={socialLink.url}
                  key={index}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={`${profileStyles.interest1} ${overviewRtStyles.socialLinks} ${profileStyles.topMostLayerColor}`}
                >
                  {getSocialIcon(socialLink.title)} {socialLink.title}
                </Link>
              ))}

              {socialLinks.length > 4 && (
                <button
                  onClick={() => setShowMoreSocials((prev) => !prev)}
                  className={`${profileStyles.topMostLayerColor} ${profileStyles.showMoreBTN}`}
                >
                  {showMoreSocials ? (
                    <>
                      <FaArrowLeft className={profileStyles.rightOrLeftArrowIcon} /> See less
                    </>
                  ) : (
                    `See more +${socialLinks.length - 4}`
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <Snackbar 
        open={open} 
        autoHideDuration={3000} 
        onClose={handleClose} 
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert 
          onClose={handleClose} 
          severity={severity} 
          sx={{ width: "100%" }} 
          className={severity === "success" ? overviewRtStyles.snackbarSuccess : overviewRtStyles.snackbarError}
        >
          {message}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default EventDetailsOverviewRight;