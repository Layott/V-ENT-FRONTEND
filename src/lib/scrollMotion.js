/* One answer to "should this scroll glide" (Apple review S16, inbox 569).

   The global reduced-motion rule in globals.css stops CSS from travelling,
   but a smooth scroll asked for from JavaScript ignores it: six places glided
   the page for a reader who had asked their device not to. Every scroll that
   wants to glide asks here instead of writing 'smooth' itself. */
export function scrollBehavior() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'auto';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
