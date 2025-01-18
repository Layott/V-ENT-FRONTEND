import {
    FaFacebook, FaXTwitter, FaInstagram, FaYoutube, FaPinterest, FaSnapchat, FaReddit, FaLinkedin, FaTiktok, FaTwitch,
    FaGithub, FaDiscord, FaDribbble, FaSpotify, FaSlack, FaMedium, FaVimeo, FaTumblr, FaBehance, FaGoogle, FaGlobe
} from "react-icons/fa6"; 
import profileStyles from "@/styles/profile/profile-page.module.css";

export const socialIcons = {
    facebook: <FaFacebook className={profileStyles.socialIcon} />,
    twitter: <FaXTwitter className={profileStyles.socialIcon} />,
    x: <FaXTwitter className={profileStyles.socialIcon} />,
    instagram: <FaInstagram className={profileStyles.socialIcon} />,
    youtube: <FaYoutube className={profileStyles.socialIcon} />,
    pinterest: <FaPinterest className={profileStyles.socialIcon} />,
    snapchat: <FaSnapchat className={profileStyles.socialIcon} />,
    reddit: <FaReddit className={profileStyles.socialIcon} />,
    linkedin: <FaLinkedin className={profileStyles.socialIcon} />,
    tiktok: <FaTiktok className={profileStyles.socialIcon} />,
    twitch: <FaTwitch className={profileStyles.socialIcon} />,
    github: <FaGithub className={profileStyles.socialIcon} />,
    discord: <FaDiscord className={profileStyles.socialIcon} />,
    dribbble: <FaDribbble className={profileStyles.socialIcon} />,
    spotify: <FaSpotify className={profileStyles.socialIcon} />,
    slack: <FaSlack className={profileStyles.socialIcon} />,
    medium: <FaMedium className={profileStyles.socialIcon} />,
    vimeo: <FaVimeo className={profileStyles.socialIcon} />,
    tumblr: <FaTumblr className={profileStyles.socialIcon} />,
    behance: <FaBehance className={profileStyles.socialIcon} />,
    google: <FaGoogle className={profileStyles.socialIcon} />,
    default: <FaGlobe className={profileStyles.socialIcon} />, 
};
