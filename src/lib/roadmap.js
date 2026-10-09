// What V-ENT opens next, as one climb from what is live today.
//
// CEO, 8 October 2026 (inbox 421): "For the pages that are not yet built and
// open, we can put something there that will show what we want to build in the
// future for those pages/features." Then, 9 October (inbox 426), with a
// screenshot of the first version on their phone: "this roadmap page should be
// like diagrams and in graphics, not text, let it look like a bracket system
// that shows what will be built from this one to that that one and the
// explanations should be things that are important to users, not things that
// will be built for we admins on the backend, just user facing stuff."
//
// So the steps are drawn as a stepladder bracket (RoadmapMap): V-ENT today
// climbs one step per phase, and each step is joined by the live feature it
// builds on. Every line says what a USER gets; nothing about consoles, staff
// or how it is built. Drawn from V-ENT FEATURES DEEP.pdf. No dates: a phase is
// an order, and a date nobody keeps is worse than none.
//
// One list, read by /roadmap and by each closed module's page (through
// ComingSoon), so the two can never say different things. Text is keys; en,
// fr and pt live in the dictionaries.

/** Where the climb starts: what anybody can use on V-ENT today. */
export const LIVE = {
  id: 'live',
  phase: null,
  status: 'live',
  title: ['roadmap.live.title', 'V-ENT today'],
  blurb: ['roadmap.live.blurb', 'What you can use on V-ENT right now, and what everything after it is built on.'],
  features: [
    ['roadmap.live.f1', 'Enter tournaments and follow every match on the bracket'],
    ['roadmap.live.f2', 'Buy event tickets, and book a pitch or stall at an event'],
    ['roadmap.live.f3', 'Build a team or an organisation and run it together'],
    ['roadmap.live.f4', 'Stream your event with the production studio'],
    ['roadmap.live.f5', 'Pay, send and get paid in VENT COINS'],
    ['roadmap.live.f6', 'Talk to other players in the community, clubs and messages'],
  ],
  screenshots: [],
};

/** The modules not open yet, in the order they open. */
export const ROADMAP = [
  {
    id: 'shop',
    href: '/shop',
    phase: 3,
    status: 'planned',
    built: false,
    title: ['roadmap.shop.title', 'V-ENT Shop'],
    builds: ['roadmap.shop.builds', 'Your wallet and VENT COINS'],
    blurb: ['roadmap.shop.blurb', 'The official V-ENT store, paid for with the VENT COINS in your wallet.'],
    features: [
      ['roadmap.shop.f1', 'Gaming gear, anime merchandise, software and in-game items, in the size and colour you want'],
      ['roadmap.shop.f2', 'Pay with the VENT COINS already in your wallet'],
      ['roadmap.shop.f3', 'Follow your order from paid to shipped to delivered'],
      ['roadmap.shop.f4', 'Standard or express delivery, tracked to your door'],
      ['roadmap.shop.f5', 'Sales, discounts and promo codes'],
      ['roadmap.shop.f6', 'Chat with customer care about any order'],
    ],
    screenshots: [],
  },
  {
    id: 'marketplace',
    href: '/marketplace',
    phase: 4,
    status: 'built',
    built: true,
    title: ['roadmap.marketplace.title', 'Vermillion City'],
    builds: ['roadmap.marketplace.builds', 'Player profiles and messages'],
    blurb: ['roadmap.marketplace.blurb', 'Buy and sell with other players. Your money is held until the item arrives.'],
    features: [
      ['roadmap.marketplace.f1', 'Buy and sell coaching, streaming, design, in-game items, merchandise, anime and manga'],
      ['roadmap.marketplace.f2', 'Swap with another player as well as buy'],
      ['roadmap.marketplace.f3', 'List your own things, and pause them or mark them sold'],
      ['roadmap.marketplace.f4', 'Find what you want by category, price and seller rating'],
      ['roadmap.marketplace.f5', 'Your money is held until you confirm the item arrived'],
      ['roadmap.marketplace.f6', 'Rate the seller after every sale'],
    ],
    screenshots: [
      { src: '/images/roadmap/marketplace-1.webp', alt: ['roadmap.marketplace.shot1', 'The Vermillion City listings page, as built'] },
    ],
  },
  {
    id: 'anime',
    href: '/anime',
    phase: 5,
    status: 'built',
    built: true,
    title: ['roadmap.anime.title', 'Anime hub'],
    builds: ['roadmap.anime.builds', 'Clubs and polls'],
    blurb: ['roadmap.anime.blurb', 'Read, watch and vote with other anime fans.'],
    features: [
      ['roadmap.anime.f1', 'Read manga and comics from their creators, free or paid, in your browser'],
      ['roadmap.anime.f2', 'Pick up where you stopped, and follow the series you like'],
      ['roadmap.anime.f3', 'Vote in official character battles'],
      ['roadmap.anime.f4', 'Upload anime music videos and vote on the best'],
      ['roadmap.anime.f5', 'Read or watch together with friends, in step'],
    ],
    screenshots: [
      { src: '/images/roadmap/anime-1.webp', alt: ['roadmap.anime.shot1', 'The anime hub home page, as built'] },
    ],
  },
  {
    id: 'wager',
    href: '/wager',
    phase: 6,
    status: 'legal',
    built: false,
    title: ['roadmap.wager.title', 'Wagers'],
    builds: ['roadmap.wager.builds', 'Tournaments and brackets'],
    blurb: ['roadmap.wager.blurb', 'Put VENT COINS on matches played on V-ENT. Last on the list, and only after a legal review.'],
    features: [
      ['roadmap.wager.f1', 'Back a match or a tournament on V-ENT with VENT COINS'],
      ['roadmap.wager.f2', 'Join a public wager, or start your own and choose who joins'],
      ['roadmap.wager.f3', 'Settled when the match ends'],
      ['roadmap.wager.f4', 'Report anything that looks wrong'],
      ['roadmap.wager.f5', 'Your wager history and results'],
    ],
    screenshots: [],
  },
];

/** The words for each status, the same on every step that carries it. */
export const STATUS = {
  live: ['roadmap.status.live', 'Live'],
  planned: ['roadmap.status.planned', 'Planned'],
  built: ['roadmap.builtClosed', 'Built, not open yet'],
  legal: ['roadmap.status.legal', 'After a legal review'],
};

export const roadmapFor = (id) => ROADMAP.find((m) => m.id === id) || null;

/** The climb up to and including one module: its own branch of the map. */
export const branchTo = (id) => {
  const at = ROADMAP.findIndex((m) => m.id === id);
  return at < 0 ? [] : ROADMAP.slice(0, at + 1);
};
