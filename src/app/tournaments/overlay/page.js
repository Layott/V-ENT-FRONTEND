'use client';

import ComingSoon from '@/components/coming-soon/ComingSoon';
import { useT } from '@/i18n/LanguageProvider';

// Stream overlays are BUILT. They are not built here: an overlay belongs to one
// tournament, so it lives on that tournament's own console, under Production.
// This route kept telling visitors the feature did not exist for as long as it
// did exist, which is worse than saying nothing. It now says where to go.
const Page = () => {
  const tt = useT();
  const back = { href: '/tournaments', label: tt('back.toTournaments', 'Back to tournaments') };

  return <ComingSoon back={back} phase="Live now" title="Stream overlay" blurb="An overlay belongs to one tournament or event, so it is uploaded on that console under Production. Paste the address it gives you into OBS as a browser source; it shows the standings, rosters and scores as they change." alternatives={[{
    href: "/production",
    label: "Production"
  }, {
    href: "/tournaments/my-tournaments",
    label: "My tournaments"
  }]} />;
};
export default Page;
