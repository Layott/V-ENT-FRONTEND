// The page itself is a client component and cannot export metadata, so it
// lives here.
//
// This route only looks public. It carries a one-time token, somebody's own
// invitation, a private conversation, a sign-in hand-off or a browser source,
// so it is noindex here as well as disallowed in robots.js: a disallow asks a
// crawler not to fetch it, and this tells anything that fetched it anyway not
// to keep it.
export const metadata = {
  title: 'Club',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
