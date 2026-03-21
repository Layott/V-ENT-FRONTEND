import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import tournamentDetailsBanner from "@/images/event_details_banner.webp"
import { LuClock3 } from "react-icons/lu";
import { PiMoneyWavy } from "react-icons/pi";
import { RiShare2Fill } from "react-icons/ri";
import bannerDetailsStyles from '@/view-/details-banner/tournament-details-banner.module.css'

const EventDetailsBanner = ({ event }) => {
  const [bannerUrl, setBannerUrl] = useState(tournamentDetailsBanner);
  const { data: session } = useSession();
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  // Function to get the correct image URL - same pattern as tournament
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
      const fullUrl = `${baseUrl}${imagePath}`;
      console.log('Constructed URL from /media path:', fullUrl);
      return fullUrl;
    }
    
    // If it's just a filename, construct the full path
    const fullUrl = `${baseUrl}/media/event_banners/${imagePath}`;
    console.log('Constructed URL from filename:', fullUrl);
    return fullUrl;
  };

  // Set banner URL when event changes
  useEffect(() => {
    if (event && event.banner) {
      const imageUrl = getImageUrl(event.banner);
      setBannerUrl(imageUrl);
      console.log('Event banner set to:', imageUrl);
    } else {
      setBannerUrl(tournamentDetailsBanner);
      console.log('Using default banner');
    }
  }, [event]);

  // Format entry fee
  const formatEntryFee = (fee) => {
    if (!fee || fee === '0' || fee === 0 || fee === '0.00') return 'FREE';
    return `₦${fee.toLocaleString()}`;
  };

  // Calculate time remaining - same logic as tournament
  const calculateTimeRemaining = (eventDate) => {
    if (!eventDate) return 'Date not set';
    
    const now = new Date();
    const eventDateTime = new Date(eventDate);
    const timeDiff = eventDateTime - now;
    
    if (timeDiff <= 0) return 'Event has started/ended';
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days} days ${hours} hours ${minutes} mins`;
  };

  // Determine event status - same logic as tournament
  const getEventStatus = (eventDate, endDate) => {
    if (!eventDate) return 'Date not set';
    
    const now = new Date();
    const startDate = new Date(eventDate);
    const eventEndDate = endDate ? new Date(endDate) : startDate;
    
    if (now < startDate) return 'Not Yet Started';
    if (now >= startDate && now <= eventEndDate) return 'In Progress';
    return 'Completed';
  };

  if (!event) {
    // Fallback to default content when no event data (similar to tournament)
    return (
      <div className={bannerDetailsStyles.tournamentDetailsBannerContainer}>
        <div className={bannerDetailsStyles.tournamentDetailsBanner}>
          <Image
            src={tournamentDetailsBanner}
            alt='Event Details Banner'
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className={bannerDetailsStyles.headerContainer}>
          <div className={bannerDetailsStyles.headerLeft}>
            <h2>Loading event details...</h2>
            <div className={bannerDetailsStyles.headerDetails}>
              <p className={bannerDetailsStyles.tournamentStatus}>Loading...</p>
              <p className={bannerDetailsStyles.tournamentTimeRemaining}>
                <LuClock3 className={bannerDetailsStyles.clockIcon} /> Loading...
              </p>
              <p className={bannerDetailsStyles.tournamentFee}>
                <PiMoneyWavy className={bannerDetailsStyles.moneyIcon} /> Entry Fee: 
                <span className={bannerDetailsStyles.feeSpan}>Loading...</span>
              </p>
            </div>
          </div>
          <div className={bannerDetailsStyles.headerRight}>
            <button className={bannerDetailsStyles.shareBTN} disabled>
              <RiShare2Fill className={bannerDetailsStyles.shareIcon} /> Share
            </button>
            <div className={bannerDetailsStyles.joinTournamentBTN} style={{opacity: 0.5}}>
              Loading...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('Event data:', event);
  console.log('Event banner field:', event?.banner);

  return (
    <div className={bannerDetailsStyles.tournamentDetailsBannerContainer}>
      <div className={bannerDetailsStyles.tournamentDetailsBanner}>
        <Image
          src={bannerUrl}
          alt={event.name ? `${event.name} Banner` : 'Event Details Banner'}
          fill
          style={{ objectFit: 'cover' }}
          onError={(e) => {
            console.log('Banner image failed to load, using fallback');
            setBannerUrl(tournamentDetailsBanner);
          }}
          onLoad={() => {
            console.log('Banner image loaded successfully');
          }}
          unoptimized={true}
        />
      </div>

      <div className={bannerDetailsStyles.headerContainer}>
        <div className={bannerDetailsStyles.headerLeft}>
          <h2>{event.name || 'Event Name'}</h2>
          <div className={bannerDetailsStyles.headerDetails}>
            <p className={bannerDetailsStyles.tournamentStatus}>
              {getEventStatus(event.event_date, event.end_date)}
            </p>
            <p className={bannerDetailsStyles.tournamentTimeRemaining}>
              <LuClock3 className={bannerDetailsStyles.clockIcon} /> 
              {calculateTimeRemaining(event.event_date)}
            </p>
            <p className={bannerDetailsStyles.tournamentFee}>
              <PiMoneyWavy className={bannerDetailsStyles.moneyIcon} /> 
              Entry Fee: 
              <span className={bannerDetailsStyles.feeSpan}>
                {formatEntryFee(event.entry_fee)}
              </span>
            </p>
          </div>
        </div>
        <div className={bannerDetailsStyles.headerRight}>
          <button className={bannerDetailsStyles.shareBTN}>
            <RiShare2Fill className={bannerDetailsStyles.shareIcon} /> Share
          </button>
          <Link 
            href={`/events/register-event?id=${event.event_id || event.id}`} 
            className={bannerDetailsStyles.joinTournamentBTN}
          >
            Register for Event
          </Link>
        </div>
      </div>
    </div>
  )
}

export default EventDetailsBanner;