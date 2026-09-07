// The page itself is a client component and cannot export metadata, so the
// noindex lives here.
//
// This route is for somebody signed in and doing something, so it has nothing to offer a search result and should not appear in one.
//
// The house rule allows exactly two states for a route: public with real
// metadata, or noindex AND in the robots disallow list. There is no third
// option, and this route was in it.
export const metadata = {
  title: 'My tickets',
  robots: { index: false, follow: false },
};

export default function GatedLayout({ children }) {
  return children;
}
