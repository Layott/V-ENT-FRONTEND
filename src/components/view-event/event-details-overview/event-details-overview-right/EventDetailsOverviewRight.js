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

const EventDetailsOverviewRight = ({ socialLinks = [] }) => {

    const address = "Landmark Beach, Water Corporation Drive, Lagos, Nigeria."
    const formattedAddress = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3916.479607015029!2d3.402021615261661!3d6.42100899534757!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103bf573739d5e67%3A0x4b0e643d8da168c!2sLandmark%20Beach!5e0!3m2!1sen!2sng!4v1690023945342!5m2!1sen!2sng";

    const [showMoreSocials, setShowMoreSocials] = useState(false);
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [severity, setSeverity] = useState("success");
    const [isMapVisible, setIsMapVisible] = useState(false);

    const toggleMapVisibility = () => {
      setIsMapVisible((prev) => !prev);
    }

    const handleClose = () => {
      setOpen(false);
    }

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
    
    const linkText = "https://chat.whatsapp.com/BX6jTRvEvrBGNHgNwqWJsbbdjndndkjdnjdFW";
  
  return (
    <div className={overviewLtStyles.overviewRight}>
      <div className={overviewRtStyles.rightBox}>
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}><PiBuildingApartmentBold className={`${overviewRtStyles.icons} ${overviewRtStyles.fillIcons}`} /> Event Type</p>
          <p className={overviewRtStyles.paragraphValue}>Physical</p>
        </div>
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}><PiMoneyWavy className={`${overviewRtStyles.icons} ${overviewRtStyles.fillIcons}`} /> Entry Fee</p>
          <p className={overviewRtStyles.paragraphValue}>N5,000</p>
        </div>
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}><GrGamepad className={`${overviewRtStyles.icons} ${overviewRtStyles.strokeIcons}`} /> Game</p>
          <p className={overviewRtStyles.paragraphValue}>Counter Strike</p>
        </div>
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}><FiCalendar className={`${overviewRtStyles.icons} ${overviewRtStyles.strokeIcons}`} /> Date</p>
          <p className={overviewRtStyles.paragraphValue}>1st Oct - 21st Oct 2024</p>
        </div>
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}><FiClock className={`${overviewRtStyles.icons} ${overviewRtStyles.strokeIcons}`} /> Time </p>
          <p className={overviewRtStyles.paragraphValue}>7AM - 11PM  (WAT)</p>
        </div>
      </div>

      <div className={overviewRtStyles.rightBox}>
        <h3 className={`${overviewRtStyles.headerH3} ${tournamentStyles.headerH3}`}><FaLink className={overviewRtStyles.priceIcon} /> Event Link</h3>
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}>Platform </p>
          <p className={`${overviewRtStyles.paragraphValue} ${overviewRtStyles.paragraphValueFloatRight}`}>WhatsApp</p>
        </div>

        <div className={overviewRtStyles.linkDiv}>
          <p className={overviewRtStyles.linkToBeCopied}>
            {linkText}
          </p>
          <button 
            className={overviewRtStyles.copyBTN}
            onClick={() => copyToClipboard(linkText)}
          >
            <FiCopy className={`${overviewRtStyles.icons} ${overviewRtStyles.strokeIcons}`} />
            <span className={overviewRtStyles.copySpan}>Copy</span>
          </button>
          <Snackbar open={open} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: "top", horizontal: "center" }} >
            <Alert onClose={handleClose} severity={severity} sx={{ width: "100%" }} 
              className={severity === "success" ? overviewRtStyles.snackbarSuccess : overviewRtStyles.snackbarError}
            >
              {message}
            </Alert>
          </Snackbar>
        </div>
      </div>

      <div className={`${overviewRtStyles.rightBox} ${overviewRtStyles.removeBorderBottom}`}>
        <h3 className={`${overviewRtStyles.headerH3} ${tournamentStyles.headerH3}`}><BiMapPin className={overviewRtStyles.priceIcon} /> Direction</h3>

        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}><IoLocationOutline className={overviewRtStyles.icons} /> Address </p>
          <p className={overviewRtStyles.paragraphValue}>{address}</p>
        </div>

        <div className={overviewRtStyles.linkDiv}>
          <button className={overviewRtStyles.getDirectionBTN}>
            Get Directions
          </button>
          <button 
            className={overviewRtStyles.copyBTN}
            onClick={() => copyToClipboard(address)}
          >
            <FiCopy className={`${overviewRtStyles.icons} ${overviewRtStyles.strokeIcons}`} />
            <span className={overviewRtStyles.copySpan}>Copy</span>
          </button>
          <Snackbar open={open} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: "top", horizontal: "center" }} >
            <Alert onClose={handleClose} severity={severity} sx={{ width: "100%" }} 
              className={severity === "success" ? overviewRtStyles.snackbarSuccess : overviewRtStyles.snackbarError}
            >
              {message}
            </Alert>
          </Snackbar>
        </div>

        <button onClick={toggleMapVisibility} className={overviewRtStyles.hideMapBTN}>
          {isMapVisible ? "Hide Map" : "Show Map"}{" "}
          {isMapVisible ? <PiCaretUpBold className={overviewRtStyles.caretIcons} /> : <PiCaretDownBold className={overviewRtStyles.caretIcons} />}
        </button>
      </div>

      {isMapVisible && 
        <div className={overviewRtStyles.mapContainer}>
          <iframe
            src={formattedAddress}
            frameborder="0"
            allowFullScreen=""
            className={overviewRtStyles.mapIframe}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Google Map"
          />
        </div>
      }

      <div className={overviewRtStyles.rightBox}>
        <h3 className={`${overviewRtStyles.headerH3} ${tournamentStyles.headerH3}`}>Social Links</h3>

        <div className={`${profileStyles.socialLinksListContainer} ${overviewRtStyles.socialLinksListContainer}`}>
          {Array.isArray(socialLinks) && socialLinks.length === 0 ? (
            <div className={profileStyles.noInterestsContainer}>
              <h4 className={profileStyles.profileH4HeaderEmptyContent}>No social links yet</h4>
              <p className={profileStyles.emptyParagraphContent}>You haven&#39;t added any social media links yet</p>
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
    </div>
  )
}

export default EventDetailsOverviewRight