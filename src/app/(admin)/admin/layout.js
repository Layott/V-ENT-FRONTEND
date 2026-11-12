/**
 * The console's own document title, from the server (inbox 598, 12 November 2026).
 *
 * The (admin) layout above is a client component, so it can only set the title
 * in an effect, and the root layout's metadata renders the site title too. On a
 * slow phone the metadata landed after the effect and every console tab read
 * "V-ENT: esports tournaments..." for the whole visit (seen on the emulator on
 * /admin/location-history). Metadata here is rendered with the page, so the
 * right title is there from the first byte; the effect above still swaps in the
 * reader's language.
 *
 * Staff only: never indexed (robots.js disallows /admin as well).
 */
export const metadata = {
  title: { absolute: 'V-ENT Admin' },
  robots: { index: false, follow: false },
};

export default function AdminSectionLayout({ children }) {
  return children;
}
