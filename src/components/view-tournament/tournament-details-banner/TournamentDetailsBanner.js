// Updated TournamentDetailsBanner.js
import { mediaIn, mediaUrl } from '@/lib/mediaUrl';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import tournamentDetailsBanner from "@/images/tournament_details_banner.webp";
import { LuClock3 } from "react-icons/lu";
import { PiMoneyWavy } from "react-icons/pi";
import { RiShare2Fill } from "react-icons/ri";
import { RiCopperCoinFill } from "react-icons/ri";
import bannerDetailsStyles from '@/view-/details-banner/tournament-details-banner.module.css';
import TournamentRegistrationModal from '../tournament-register/TournamentRegister';
import { shareLink, linkTo } from '@/lib/share';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const TournamentDetailsBanner = ({
  tournament
}) => {
  const tx = useTx();
  const tt = useT();
  const [shareLabel, setShareLabel] = useState('Share');
  const handleShare = async () => {
    await shareLink({
      path: linkTo.tournament(tournament),
      title: tournament?.tournament_title || tournament?.name,
      text: 'Tournament on V-ENT',
      notify: message => {
        setShareLabel(message);
        window.setTimeout(() => setShareLabel('Share'), 3000);
      }
    });
  };
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Function to get the correct image URL
  const getImageUrl = (imagePath) =>
    mediaIn(imagePath, '/media/tournament_banners') || tournamentDetailsBanner;

  // Helper function to calculate time remaining
  const calculateTimeRemaining = startDate => {
    if (!tournament || !startDate) return "15 days 13 hours 12 mins";
    const now = new Date();
    const start = new Date(startDate);
    const diff = start - now;
    if (diff <= 0) return "Tournament Started";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
    const mins = Math.floor(diff % (1000 * 60 * 60) / (1000 * 60));
    return `${days} days ${hours} hours ${mins} mins`;
  };

  // Helper function to get tournament status
  const getTournamentStatus = (startDate, endDate) => {
    if (!tournament) return "Not Yet Started";
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (now < start) return "Not Yet Started";
    if (now >= start && now <= end) return "In Progress";
    return "Completed";
  };

  // Handle join tournament click
  const handleJoinTournament = e => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  // Handle next step after selection
  const handleModalNext = selectedOption => {
    console.log('Selected option:', selectedOption);
    setIsModalOpen(false);
    // Here you can redirect to the appropriate registration form
    // based on the selected option (individual or team)

    // Example:
    if (tournament) {
      window.location.href = `/tournaments/${tournament.tournament_id}/register?type=${selectedOption}`;
    } else {
      window.location.href = `/tournaments/register-tournament?type=${selectedOption}`;
    }
  };
  if (!tournament) {
    // Fallback to original static content when no tournament data
    return <>
        <div className={bannerDetailsStyles.tournamentDetailsBannerContainer}>
            <div className={bannerDetailsStyles.tournamentDetailsBanner}>
                <Image src={mediaUrl(tournamentDetailsBanner)} alt={tt("ui.tournament.details.banner.ee7c", "Tournament Details Banner")} />
            </div>

            <div className={bannerDetailsStyles.headerContainer}>
                <div className={bannerDetailsStyles.headerLeft}>
                    <h2>{tt("ui.counter.strike.battle.unilag.ffd7", "Counter strike battle - Unilag")}</h2>
                    <div className={bannerDetailsStyles.headerDetails}>
                        <p className={bannerDetailsStyles.tournamentStatus}>{tt("ui.not.yet.started.ddc1", "Not Yet Started")}</p>
                        <p className={bannerDetailsStyles.tournamentTimeRemaining}><LuClock3 className={bannerDetailsStyles.clockIcon} /> {tt("ui.days.hours.mins.ec27", "15 days 13 hours 12 mins")}</p>
                        <p className={bannerDetailsStyles.tournamentFee}><PiMoneyWavy className={bannerDetailsStyles.moneyIcon} /> {tt("ui.entry.fee.bf4f", "Entry Fee:")} <span className={bannerDetailsStyles.feeSpan}>{tt("ui.free.4a97", "FREE")}</span></p>
                    </div>
                </div>
                <div className={bannerDetailsStyles.headerRight}>
                    {/* This button did nothing at all: no handler, no link,
                        nothing. It shares the tournament by its readable
                        address now, and says so. */}
                    <button type="button" className={bannerDetailsStyles.shareBTN} onClick={handleShare}>
                      <RiShare2Fill className={bannerDetailsStyles.shareIcon} /> {shareLabel}
                    </button>
                    <button onClick={handleJoinTournament} className={bannerDetailsStyles.joinTournamentBTN}>
                      {tt("ui.join.tournament.cda2", "Join Tournament")}
                    </button>
                </div>
            </div>
        </div>
        
        <TournamentRegistrationModal isOpen={isModalOpen} onClose={handleModalClose} onNext={handleModalNext} />
      </>;
  }

  // Debug logging
  console.log('Tournament data:', tournament);
  console.log('Tournament banner field:', tournament?.tournament_banner);
  return <>
      <div className={bannerDetailsStyles.tournamentDetailsBannerContainer}>
          <div className={bannerDetailsStyles.tournamentDetailsBanner}>
              <Image src={getImageUrl(tournament?.tournament_banner)} alt={tournament ? `${tournament.tournament_title} Banner` : tx("Tournament Details Banner")} width={800} height={400} onError={e => {
          console.error('Image failed to load:', e.target.src);
          console.log('Falling back to default banner');
          // Fallback to default banner on error
          e.target.src = tournamentDetailsBanner;
        }} onLoad={() => {
          console.log('Image loaded successfully');
        }} />
          </div>

          <div className={bannerDetailsStyles.headerContainer}>
              <div className={bannerDetailsStyles.headerLeft}>
                  <h2>{tournament?.tournament_title || tx("Counter strike battle - Unilag")}</h2>
                  <div className={bannerDetailsStyles.headerDetails}>
                      <p className={bannerDetailsStyles.tournamentStatus}>
                          {tournament ? getTournamentStatus(tournament.start_date_and_time, tournament.end_date_and_time) : tx("Not Yet Started")}
                      </p>
                      <p className={bannerDetailsStyles.tournamentTimeRemaining}>
                          <LuClock3 className={bannerDetailsStyles.clockIcon} /> 
                          {tournament ? calculateTimeRemaining(tournament.start_date_and_time) : tx("15 days 13 hours 12 mins")}
                      </p>
                      <p className={bannerDetailsStyles.tournamentFee}>
                          <PiMoneyWavy className={bannerDetailsStyles.moneyIcon} /> 
                          {tt("ui.entry.fee.bf4f", "Entry Fee:")} 
                          {tournament ? tournament.entry_fee_price === 0 || tournament.entry_fee_price === "0.00" ? <span className={bannerDetailsStyles.feeSpan}>{tt("ui.free.4a97", "FREE")}</span> : <span className={bannerDetailsStyles.feeSpan}>
                                      <RiCopperCoinFill /> ${tournament.entry_fee_price}
                                  </span> : <span className={bannerDetailsStyles.feeSpan}>{tt("ui.free.4a97", "FREE")}</span>}
                      </p>
                  </div>
              </div>
              <div className={bannerDetailsStyles.headerRight}>
                  <button className={bannerDetailsStyles.shareBTN}>
                      <RiShare2Fill className={bannerDetailsStyles.shareIcon} /> {tt("ui.share.09ca", "Share")}
                  </button>
                  <button onClick={handleJoinTournament} className={bannerDetailsStyles.joinTournamentBTN}>
                    {tt("ui.join.tournament.cda2", "Join Tournament")}
                  </button>
              </div>
          </div>
      </div>
      
      <TournamentRegistrationModal isOpen={isModalOpen} onClose={handleModalClose} onNext={handleModalNext} />
    </>;
};
export default TournamentDetailsBanner;