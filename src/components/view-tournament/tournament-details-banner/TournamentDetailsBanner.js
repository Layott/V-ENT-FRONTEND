import Image from 'next/image';
import Link from 'next/link';
import tournamentDetailsBanner from "@/images/tournament_details_banner.webp"
import { LuClock3 } from "react-icons/lu";
import { PiMoneyWavy } from "react-icons/pi";
import { RiShare2Fill } from "react-icons/ri";
import { RiCopperCoinFill } from "react-icons/ri";
import bannerDetailsStyles from '@/view-/details-banner/tournament-details-banner.module.css'

const TournamentDetailsBanner = ({ tournament }) => {
  
  // Function to get the correct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      console.log('No image path provided, using default banner');
      return tournamentDetailsBanner;
    }
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
      console.log('Using full URL:', imagePath);
      return imagePath;
    }
    
    // If it starts with /media, prepend your backend URL
    if (imagePath.startsWith('/media')) {
      const fullUrl = `https://vermillionent.pythonanywhere.com${imagePath}`;
      console.log('Constructed URL from /media path:', fullUrl);
      return fullUrl;
    }
    
    // If it's just a filename, construct the full path
    const fullUrl = `https://vermillionent.pythonanywhere.com/media/tournament_banners/${imagePath}`;
    console.log('Constructed URL from filename:', fullUrl);
    return fullUrl;
  };

  // Helper function to calculate time remaining
  const calculateTimeRemaining = (startDate) => {
    if (!tournament || !startDate) return "15 days 13 hours 12 mins";
    
    const now = new Date();
    const start = new Date(startDate);
    const diff = start - now;
    
    if (diff <= 0) return "Tournament Started";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
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

  if (!tournament) {
    // Fallback to original static content when no tournament data
    return (
      <div className={bannerDetailsStyles.tournamentDetailsBannerContainer}>
          <div className={bannerDetailsStyles.tournamentDetailsBanner}>
              <Image
                  src={tournamentDetailsBanner}
                  alt='Tournament Details Banner'
              />
          </div>

          <div className={bannerDetailsStyles.headerContainer}>
              <div className={bannerDetailsStyles.headerLeft}>
                  <h2>Counter strike battle - Unilag</h2>
                  <div className={bannerDetailsStyles.headerDetails}>
                      <p className={bannerDetailsStyles.tournamentStatus}>Not Yet Started</p>
                      <p className={bannerDetailsStyles.tournamentTimeRemaining}><LuClock3 className={bannerDetailsStyles.clockIcon} /> 15 days 13 hours 12 mins</p>
                      <p className={bannerDetailsStyles.tournamentFee}><PiMoneyWavy className={bannerDetailsStyles.moneyIcon} /> Entry Fee: <span className={bannerDetailsStyles.feeSpan}>FREE</span></p>
                  </div>
              </div>
              <div className={bannerDetailsStyles.headerRight}>
                  <button className={bannerDetailsStyles.shareBTN}><RiShare2Fill className={bannerDetailsStyles.shareIcon} /> Share</button>
                  <Link href={'/tournaments/register-tournament'} className={bannerDetailsStyles.joinTournamentBTN}>Join Tournament</Link>
              </div>
          </div>
      </div>
    );
  }

  // Debug logging
  console.log('Tournament data:', tournament);
  console.log('Tournament banner field:', tournament?.tournament_banner);
  
  return (
    <div className={bannerDetailsStyles.tournamentDetailsBannerContainer}>
        <div className={bannerDetailsStyles.tournamentDetailsBanner}>
            <Image
                src={getImageUrl(tournament?.tournament_banner)}
                alt={tournament ? `${tournament.tournament_title} Banner` : 'Tournament Details Banner'}
                width={800}
                height={400}
                onError={(e) => {
                  console.error('Image failed to load:', e.target.src);
                  console.log('Falling back to default banner');
                  // Fallback to default banner on error
                  e.target.src = tournamentDetailsBanner;
                }}
                onLoad={() => {
                  console.log('Image loaded successfully');
                }}
            />
        </div>

        <div className={bannerDetailsStyles.headerContainer}>
            <div className={bannerDetailsStyles.headerLeft}>
                <h2>{tournament?.tournament_title || "Counter strike battle - Unilag"}</h2>
                <div className={bannerDetailsStyles.headerDetails}>
                    <p className={bannerDetailsStyles.tournamentStatus}>
                        {tournament ? getTournamentStatus(tournament.start_date_and_time, tournament.end_date_and_time) : "Not Yet Started"}
                    </p>
                    <p className={bannerDetailsStyles.tournamentTimeRemaining}>
                        <LuClock3 className={bannerDetailsStyles.clockIcon} /> 
                        {tournament ? calculateTimeRemaining(tournament.start_date_and_time) : "15 days 13 hours 12 mins"}
                    </p>
                    <p className={bannerDetailsStyles.tournamentFee}>
                        <PiMoneyWavy className={bannerDetailsStyles.moneyIcon} /> 
                        Entry Fee: 
                        {tournament ? (
                            tournament.entry_fee_price === 0 || tournament.entry_fee_price === "0.00" ? (
                                <span className={bannerDetailsStyles.feeSpan}>FREE</span>
                            ) : (
                                <span className={bannerDetailsStyles.feeSpan}>
                                    <RiCopperCoinFill /> ${tournament.entry_fee_price}
                                </span>
                            )
                        ) : (
                            <span className={bannerDetailsStyles.feeSpan}>FREE</span>
                        )}
                    </p>
                </div>
            </div>
            <div className={bannerDetailsStyles.headerRight}>
                <button className={bannerDetailsStyles.shareBTN}>
                    <RiShare2Fill className={bannerDetailsStyles.shareIcon} /> Share
                </button>
                <Link 
                    href={tournament ? `/tournaments/register-tournament?id=${tournament.tournament_id}` : '/tournaments/register-tournament'} 
                    className={bannerDetailsStyles.joinTournamentBTN}
                >
                    Join Tournament
                </Link>
            </div>
        </div>
    </div>
  )
}

export default TournamentDetailsBanner;