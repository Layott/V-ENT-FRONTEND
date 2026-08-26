import { imagePlaceholder, mediaUrl } from '@/lib/mediaUrl';
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
import { useT } from '@/i18n/LanguageProvider';
const formatDate = dateString => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
const getImageUrl = (imagePath) =>
  imagePath ? mediaUrl(imagePath) : imagePlaceholder('Event');
const GameSection = ({
  game,
  events
}) => {
  const tt = useT();
  const [showAll, setShowAll] = useState(false);
  const visible = events.slice(0, showAll ? events.length : 3);
  return <div className={styles.fifaTournamentsContainer}>
      <div className={styles.header}>
        <h3>{game} {tt("ui.events.c549", "Events")}</h3>
        {!showAll && events.length > 3 && <button className={styles.seeMoreBTN} onClick={() => setShowAll(true)}>
            {tt("ui.see.more.c510", "See more")} <LuArrowRight />
          </button>}
      </div>

      <div className={styles.cardsContainer}>
        {visible.map((event, index) => {
        const eventId = event.event_id || event.id;
        return <div key={eventId || index} className={styles.cardContainer}>
              <div className={styles.imageContainer}>
                <Image src={getImageUrl(event.banner)} alt={event.name || 'Event'} width={400} height={200} />
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
                    {event.location && <>
                        <span className={menuContentStyles.dotSpan}>
                          <GoDotFill className={menuContentStyles.dotIcon} />
                        </span>
                        <span className={menuContentStyles.locationSpan}>{event.location}</span>
                      </>}
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
                      {tt("ui.fee.f813", "Fee:")} <RiCopperCoinFill className={menuContentStyles.coinIcon} /> {event.entry_fee}
                    </span>
                  </p>
                </div>

                <div className={`${newTournamentStyles.buttonContainer} ${styles.buttonContainer}`}>
                  <Link href={`/events/${eventId}`} className={newTournamentStyles.viewDetailsBTN}>
                    {tt("ui.view.details.907b", "View Details")}
                  </Link>
                  <Link href={`/events/${eventId}?tab=tickets`} className={newTournamentStyles.registerBTN}>
                    {tt("ui.register.d672", "Register")}
                  </Link>
                </div>
              </div>
            </div>;
      })}

        {showAll && events.length > 3 && <button className={`${styles.seeMoreBTN} ${styles.seeLessBTN}`} onClick={() => setShowAll(false)}>
            <LuArrowLeft /> {tt("ui.see.less.47c7", "See less")}
          </button>}

        {events.length === 0 && <p className={styles.noEventsMessage}>{tt("ui.no.816c", "No")} {game} {tt("ui.events.available.at.moment.158c", "events available at the moment.")}</p>}
      </div>
    </div>;
};
const AllEvents = ({
  data = {}
}) => {
  const tt = useT();
  const games = Object.keys(data);
  if (!games.length) {
    return <div className={styles.allTournamentsSlidersContainer}>
        <p style={{
        color: 'var(--text-muted)',
        padding: '1rem 0'
      }}>{tt("ui.no.events.found.0010", "No events found.")}</p>
      </div>;
  }
  return <div className={styles.allTournamentsSlidersContainer}>
      {games.map(game => <GameSection key={game} game={game} events={data[game] || []} />)}
    </div>;
};
export default AllEvents;