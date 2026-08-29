// The page itself is a client component and cannot export metadata, so the
// noindex lives here.
//
// This URL carries a ticket code. Indexing one would put somebody's admission
// in a search result, so it is excluded here as well as in robots.js: a
// disallow asks a crawler not to fetch the page, and this tells anything that
// fetched it anyway not to keep it.
export const metadata = {
  title: 'Check in',
  robots: { index: false, follow: false, nocache: true },
};

export default function CheckInLayout({ children }) {
  return children;
}
