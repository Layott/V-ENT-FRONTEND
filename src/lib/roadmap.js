// What each module that is not open yet will do, in the order it opens.
//
// CEO, 8 October 2026 (inbox 421): "For the pages that are not yet built and
// open, we can put something there that will show what we want to build in the
// future for those pages/features." Drawn from V-ENT FEATURES DEEP.pdf (the
// product spec): every line here is a feature it names, said in plain words.
// No dates: a phase is an order, and a date nobody keeps is worse than none.
//
// One list, read by the module pages (through ComingSoon) and by /roadmap, so
// the two can never say different things. Text is keys; en, fr and pt live in
// the dictionaries.

export const ROADMAP = [
  {
    id: 'shop',
    href: '/shop',
    phase: 3,
    built: false,
    title: ['roadmap.shop.title', 'V-ENT Shop'],
    blurb: ['roadmap.shop.blurb', 'The official store for gaming gear, anime merchandise, software and in-game currency, paid for in VENT COINS.'],
    features: [
      ['roadmap.shop.f1', 'Physical and digital products: gear, anime merchandise, software and in-game items, by category, size and colour'],
      ['roadmap.shop.f2', 'Orders that start the moment payment clears, with a status you can follow: paid, shipped, delivered'],
      ['roadmap.shop.f3', 'Stock shown honestly: an item that has run out says so'],
      ['roadmap.shop.f4', 'Standard or express delivery, tracked, priced by weight and size'],
      ['roadmap.shop.f5', 'Sales, discounts and promo codes'],
      ['roadmap.shop.f6', 'Customer care chat that passes you to the right person'],
    ],
    screenshots: [],
  },
  {
    id: 'marketplace',
    href: '/marketplace',
    phase: 4,
    built: true,
    title: ['roadmap.marketplace.title', 'Vermillion City'],
    blurb: ['roadmap.marketplace.blurb', 'Players buying and selling to each other, with the money held until the buyer confirms it arrived. Built, and not open yet.'],
    features: [
      ['roadmap.marketplace.f1', 'Services and items between members: coaching, streaming, design, in-game items, merchandise, anime and manga'],
      ['roadmap.marketplace.f2', 'Your own listings to edit, pause or mark as sold'],
      ['roadmap.marketplace.f3', 'Search, categories, price and seller-rating filters, and trades as well as sales'],
      ['roadmap.marketplace.f4', 'Payment held until the buyer confirms they received the item'],
      ['roadmap.marketplace.f5', 'A rating for the seller after every sale'],
    ],
    screenshots: [
      { src: '/images/roadmap/marketplace-1.webp', alt: ['roadmap.marketplace.shot1', 'The Vermillion City listings page, as built'] },
    ],
  },
  {
    id: 'anime',
    href: '/anime',
    phase: 5,
    built: true,
    title: ['roadmap.anime.title', 'Anime hub'],
    blurb: ['roadmap.anime.blurb', 'Manga and comics to read, character battles to vote in, and rooms to read and watch together. Built, and not open yet.'],
    features: [
      ['roadmap.anime.f1', 'Manga and comics uploaded by their creators, free or paid, read in the browser'],
      ['roadmap.anime.f2', 'A reader that remembers where you stopped, and a list of what you follow'],
      ['roadmap.anime.f3', 'Official character battles: nominate, vote, and see the results'],
      ['roadmap.anime.f4', 'Anime music videos to upload and vote on'],
      ['roadmap.anime.f5', 'Rooms to read or watch together, in step'],
    ],
    screenshots: [
      { src: '/images/roadmap/anime-1.webp', alt: ['roadmap.anime.shot1', 'The anime hub home page, as built'] },
    ],
  },
  {
    id: 'wager',
    href: '/wager',
    phase: 6,
    built: false,
    title: ['roadmap.wager.title', 'Wagers'],
    blurb: ['roadmap.wager.blurb', 'Wagers on matches played on V-ENT. Last on the roadmap, and only after a legal review.'],
    features: [
      ['roadmap.wager.f1', 'A wager on a match or tournament on V-ENT, with the amount and the conditions'],
      ['roadmap.wager.f2', 'Public wagers to browse and join'],
      ['roadmap.wager.f3', 'The person who made it manages who is in, and settles it when the match ends'],
      ['roadmap.wager.f4', 'Checks on who is taking part, and a way to report anything suspicious'],
      ['roadmap.wager.f5', 'Your wager history and results'],
    ],
    screenshots: [],
  },
];

export const roadmapFor = (id) => ROADMAP.find((m) => m.id === id) || null;
