import { mediaUrl } from '@/lib/mediaUrl';
import Image from 'next/image';
import ventLogo from '@/images/logo_mark_red.png';
import redBullLogo from '@/images/red_bull_logo.svg';
import redCarbon from '@/images/carbon_logo.svg';
import carryFirstLogo from '@/images/carry_first_logo.svg';
import cadeEsportsLogo from '@/images/cade_esports.png';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import bioInfoStyles from '../review-basic-info/review-basic-info.module.css';
import styles from './review-sponsor-links.module.css';

const sponsors = [
  {
    name: "V-ENT",
    username: "@V-ENT",
    logo: ventLogo,
  },
  {
    name: "Red Bull",
    username: "@RedBull",
    logo: redBullLogo,
  },
  {
    name: "Carbon",
    username: "@Carbon",
    logo: redCarbon,
  },
  {
    name: "Carry First",
    username: "@CarryFirst",
    logo: carryFirstLogo,
  },
  {
    name: "Cade ESports",
    username: "@cadeEsports",
    logo: cadeEsportsLogo,
  },
];

const linksInfo = [
  { title: "Facebook", content: "https://www.facebook.com/" },
  { title: "Instagram", content: "https://www.facebook.com/" },
  { title: "YouTube", content: "https://www.facebook.com/" },
];

const SponsorCard = ({ sponsor, index }) => (
  <div className={styles.sponsorsContainer}>
    <p>Sponsor {index + 1}</p>
    <div className={styles.sponsorContainer}>
      <div className={styles.logoImageContainer}>
        <Image src={mediaUrl(sponsor.logo)} alt={`${sponsor.name} Logo`} />
      </div>
      <div className={styles.sponsorNameAndUsernameContainer}>
        <h3 className={bioInfoStyles.headerH3}>{sponsor.name}</h3>
        <p>{sponsor.username}</p>
      </div>
    </div>
  </div>
);

const ReviewSponsorLinks = () => {
  return (
    <>
      <h3 className={bioInfoStyles.headerH3}>Sponsors</h3>
      <div className={styles.reviewImageContainer}>
        {sponsors.map((sponsor, index) => (
          <SponsorCard key={index} sponsor={sponsor} index={index} />
        ))}
      </div>

<h3 className={bioInfoStyles.headerH3}>Web and Social Links</h3>
      {linksInfo.map((link, index) => (
        <div key={index} className={bioInfoStyles.infoContainer}>
          <div className={bioInfoStyles.leftSideContainer}>
            <h3>{link.title}</h3>
          </div>
          <div className={bioInfoStyles.rightSideContainer}>
            <p>{link.content}</p>
          </div>
        </div>
      ))}
    </>
  );
};

export default ReviewSponsorLinks;
