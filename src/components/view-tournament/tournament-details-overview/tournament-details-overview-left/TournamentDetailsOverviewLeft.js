import Image from "next/image";
import organizer from "@/images/signed_in_user_small.webp"
import { GoDotFill } from "react-icons/go";
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'

const TournamentDetailsOverviewLeft = ({ tournament }) => {
  if (!tournament) {
    return <div>Loading tournament details...</div>;
  }

  return (
    <div className={overviewLtStyles.overviewLeft}>
      <div className={overviewLtStyles.descriptionContainer}>
        <h3 className={overviewLtStyles.headerH3}>Description</h3>
        <p className={overviewLtStyles.descriptionParagraph}>
          {tournament.tournament_description || 'No description available'}
        </p>
      </div>

      <div className={overviewLtStyles.organizerContainer}>
        <h3 className={overviewLtStyles.headerH3}>Organized by:</h3>
        <div className={overviewLtStyles.organizerDetails}>
          <div className={overviewLtStyles.imageContainer}>
            <Image
              src={organizer}
              alt="Organizer Logo"
            />
          </div>

          <div className={overviewLtStyles.organizerNameTag}>
            <p>{tournament.organizer_name || 'Tournament Organizer'}</p>
            <p>@{tournament.organizer_username || 'organizer'}</p>
          </div>
        </div>

        <div className={overviewLtStyles.dateContainer}>
          <p className={overviewLtStyles.createdDateParagraph}>
            Created:&nbsp;
            <span className={overviewLtStyles.createdDateSpan}>
              {tournament.created_at ? new Date(tournament.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </p>

          <GoDotFill className={overviewLtStyles.dotIcon} />
      
          <p className={overviewLtStyles.updatedDateParagraph}>
            Last Updated:&nbsp;
            <span className={overviewLtStyles.updatedDateSpan}>
              {tournament.updated_at ? new Date(tournament.updated_at).toLocaleDateString() : 'N/A'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default TournamentDetailsOverviewLeft