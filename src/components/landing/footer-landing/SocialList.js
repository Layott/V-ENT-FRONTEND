import { SiFacebook } from "react-icons/si";
import { FaInstagram, FaYoutube, FaTiktok, FaTwitter, FaLinkedin, FaWhatsapp, FaDiscord, FaTelegram } from 'react-icons/fa';

export const socialLinks = [
    {
      href: "https://www.youtube.com/channel/UCPQEP05yFduzIVfNxtz_KKQ",
      icon: <FaYoutube />,
      name: "YouTube",
    },
    {
      href: "https://www.linkedin.com/company/vermillionent",
      icon: <FaLinkedin />,
      name: "LinkedIn",
    },
    {
      href: "https://web.facebook.com/vermillionent",
      icon: <SiFacebook />,
      name: "Facebook",
    },
    {
      href: "https://www.instagram.com/myventhq",
      icon: <FaInstagram />,
      name: "Instagram",
    },
    {
      href: "https://www.x.com/myventhq",
      icon: <FaTwitter />,
      name: "Twitter",
    },
    {
      href: "https://www.tiktok.com/@myventhq",
      icon: <FaTiktok />,
      name: "TikTok",
    },
    {
      // The V-ENT server, id 1046108379598291036. Checked on 7 September 2026:
      // this invite and discord.gg/z7MNM9pmYr resolve to the SAME server, 478
      // members, neither expiring, so the link that was already here was
      // correct and is left alone.
      //
      // It matters more than the other socials: Discord will not let the V-ENT
      // bot send a direct message to somebody it shares no server with, so
      // this is also the door that makes direct messages work.
      href: "https://discord.gg/z7MNM9pmYr",
      icon: <FaDiscord />,
      name: "Discord",
    },
    {
      href: "https://chat.whatsapp.com/Ff5r5TeEEnz3O2TSxk8bh1",
      icon: <FaWhatsapp />,
      name: "WhatsApp",
    },
    {
      href: "https://t.me/vermillionent",
      icon: <FaTelegram />,
      name: "Telegram",
    },
];
  