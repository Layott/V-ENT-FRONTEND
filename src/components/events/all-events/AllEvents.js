import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiCalendar } from 'react-icons/fi';
import { PiMoneyWavy } from 'react-icons/pi';
import { RiCopperCoinFill } from 'react-icons/ri';
import { GoDotFill } from 'react-icons/go';
import { LuArrowRight, LuArrowLeft } from 'react-icons/lu';
import menuContentStyles from '@/styles/menu/menu-content.module.css';
import newTournamentStyles from './../../tournaments/new-tournaments/new-tournaments.module.css';
import styles from './all-events.module.css';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const getImageUrl = (imagePath) => {
  if (!imagePath) return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='180'%3E%3Crect width='100%25' height='100%25' fill='%23212225'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23797B86'%3EEvent%3C/text%3E%3C/svg%3E";
  if (imagePath.startsWith('http')) return imagePath;
  return `${process.env.NEXT_PUBLIC_API_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

const GameSection = ({ game, events }) => {
  const [showAll, setShowAll] = useState(false);
  const visible = events.slice(0, showAll ? events.length : 3);

  return (
    <div className={styles.fifaTournamentsContainer}>
      <div className={styles.header}>
        <h3>{game} Events</h3>
        {!showAll && events.length > 3 && (
          <button className={styles.seeMoreBTN} onClick={() => setShowAll(true)}>
            See more <LuArrowRight />
          </button>
        )}
      </div>

      <div className={styles.cardsContainer}>
        {visible.map((event, index) => {
          const eventId = event.event_id || event.id;
          return (
            <div key={eventId || index} className={styles.cardContainer}>
              <div className={styles.imageContainer}>
                <Image
                  src={getImageUrl(event.banner)}
                  alt={event.name || 'Event'}
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
                    <span className={menuContentStyles.calendarIconSpan}>
                      <FiCalendar className={menuContentStyles.calendarIcon} />
                    </span>
                    <span className={menuContentStyles.dateSpan}>{formatDate(event.event_date)}</span>
                  </p>

                  <p className={menuContentStyles.feeParagraph}>
                    <span className={menuContentStyles.feeIconSpan}>
                      <PiMoneyWavy className={menuContentStyles.feeIcon} />
                    </span>
                    <span className={menuContentStyles.feeSpan}>
                      Fee: <RiCopperCoinFill className={menuContentStyles.coinIcon} /> {event.entry_fee}
                    </span>
                  </p>
                </div>

                <div className={`${newTournamentStyles.buttonContainer} ${styles.buttonContainer}`}>
                  <Link href={`/events/view-event?id=${eventId}`} className={newTournamentStyles.viewDetailsBTN}>
                    View Details
                  </Link>
                  <Link href={`/events/register-event?id=${eventId}`} className={newTournamentStyles.registerBTN}>
                    Register
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {showAll && events.length > 3 && (
          <button
            className={`${styles.seeMoreBTN} ${styles.seeLessBTN}`}
            onClick={() => setShowAll(false)}
          >
            <LuArrowLeft /> See less
          </button>
        )}

        {events.length === 0 && (
          <p className={styles.noEventsMessage}>No {game} events available at the moment.</p>
        )}
      </div>
    </div>
  );
};

const AllEvents = ({ data = {} }) => {
  const games = Object.keys(data);

  if (!games.length) {
    return (
      <div className={styles.allTournamentsSlidersContainer}>
        <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No events found.</p>
      </div>
    );
  }

  return (
    <div className={styles.allTournamentsSlidersContainer}>
      {games.map((game) => (
        <GameSection key={game} game={game} events={data[game] || []} />
      ))}
    </div>
  );
};

export default AllEvents;
