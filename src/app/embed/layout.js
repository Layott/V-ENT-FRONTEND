// Embeds (inbox 360): pages other websites hold in a frame. Never indexed:
// the page a search should find is the event or tournament itself, and every
// embed says so in its canonical. robots.js disallows /embed/ as well.
export const metadata = { robots: { index: false, follow: false } };

export default function EmbedLayout({ children }) {
  return children;
}
