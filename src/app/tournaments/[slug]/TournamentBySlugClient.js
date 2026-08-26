'use client';

import { ViewTournamentContent } from '../view-tournament/page';

// The interactive page, split out so the route file itself can be a server
// component. Everything a person clicks still lives in ViewTournamentContent;
// this only exists to draw the client boundary in one obvious place.
const TournamentBySlugClient = ({ slug }) => <ViewTournamentContent slug={slug} />;

export default TournamentBySlugClient;
