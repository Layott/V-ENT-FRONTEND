'use client';

// Nothing imports this file. It is left in place, translated and with its dates
// reading the site's language rather than the browser's, so that reviving it
// does not revive those two faults. The tournament page people actually see is
// app/tournaments/view-tournament/page.js.

import Image from "next/image";
import organizer from "@/images/signed_in_user_small.webp"
import { GoDotFill } from "react-icons/go";
import { appLocale } from "@/lib/appLocale";
import { useT } from "@/i18n/LanguageProvider";
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'

// Dates were drawn with a bare toLocaleDateString(), which means the browser's
// own language rather than the one the reader picked on the site. Two settings
// disagreeing on the same page is worse than either being wrong.
const shortDate = value => (value
  ? new Date(value).toLocaleDateString(appLocale(), {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  : null);

const TournamentDetailsOverviewLeft = ({ tournament }) => {
  const tt = useT();

  if (!tournament) {
    return <div>{tt("ui.loading.tournament.7024", "Loading tournament…")}</div>;
  }

  const created = shortDate(tournament.created_at);
  const updated = shortDate(tournament.updated_at);

  return (
    <div className={overviewLtStyles.overviewLeft}>
      <div className={overviewLtStyles.descriptionContainer}>
        <h3 className={overviewLtStyles.headerH3}>
          {tt("ui.description.f1e0", "Description")}
        </h3>
        <p className={overviewLtStyles.descriptionParagraph}>
          {tournament.tournament_description
            || tt("ui.noDescription.9c31", "No description available")}
        </p>
      </div>

      <div className={overviewLtStyles.organizerContainer}>
        <h3 className={overviewLtStyles.headerH3}>
          {tt("ui.organizedBy.4a72", "Organized by:")}
        </h3>
        <div className={overviewLtStyles.organizerDetails}>
          <div className={overviewLtStyles.imageContainer}>
            <Image
              src={organizer}
              alt={tournament.organizer_username
                ? tt("ui.organizerAvatarOf.7b19", "Profile picture of {name}")
                  .replace("{name}", tournament.organizer_username)
                : tt("ui.organizerAvatar.2c40", "Organiser profile picture")}
            />
          </div>

          <div className={overviewLtStyles.organizerNameTag}>
            <p>{tournament.organizer_name
              || tt("ui.tournamentOrganizer.0d55", "Tournament Organizer")}</p>
            <p>@{tournament.organizer_username
              || tt("ui.organizer.6be2", "organizer")}</p>
          </div>
        </div>

        <div className={overviewLtStyles.dateContainer}>
          <p className={overviewLtStyles.createdDateParagraph}>
            {tt("ui.created.8fd1", "Created:")}&nbsp;
            <span className={overviewLtStyles.createdDateSpan}>
              {created || tt("ui.notAvailable.3ae7", "Not recorded")}
            </span>
          </p>

          <GoDotFill className={overviewLtStyles.dotIcon} />

          <p className={overviewLtStyles.updatedDateParagraph}>
            {tt("ui.lastUpdated.b204", "Last Updated:")}&nbsp;
            <span className={overviewLtStyles.updatedDateSpan}>
              {updated || tt("ui.notAvailable.3ae7", "Not recorded")}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default TournamentDetailsOverviewLeft
