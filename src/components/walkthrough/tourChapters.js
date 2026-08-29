// The first minute, and only the first minute.
//
// CEO, 29 August 2026: the old version of this file "is too long". It was eight
// chapters and thirty-seven steps, about six minutes, and it explained the
// wallet, teams, brackets, disputes and ticketing to somebody who had not yet
// seen any of them. That is a lot to ask of a person's first sixty seconds, and
// the part they needed was always the part about whichever page they reached
// first.
//
// So the tour is now three steps. Everything the other thirty-four said now
// lives in `src/components/page-help/pageGuides.js`, one guide per page and per
// sub-page, opened by a button that sits on every screen. The difference is
// when it arrives: an explanation of the wallet reaches somebody when they open
// the wallet, rather than four minutes before they do.
//
// The rules for the words are unchanged, and still matter more than the
// structure:
//
// - Plain words. "The money you play with", not "fungible platform currency".
// - Say what a thing is FOR before saying where the button is.
// - Real numbers where numbers matter. Nothing invented.
// - Nothing promised that does not exist yet.
//
// `route` is the page a chapter is about; the tour walks there first, because a
// step describing something that is not on the screen teaches nothing. `anchor`
// is a `data-tour` value on a real element, and every step has to read
// correctly when that element is absent, because on a phone many of them are.

export const TOUR_VERSION = 1;

export const CHAPTERS = [
  {
    id: 'welcome',
    route: '/home',
    title: 'Welcome to V-ENT',
    minutes: 1,
    steps: [
      {
        id: 'welcome-what',
        heading: 'What this place is',
        body:
          'V-ENT is where you enter esports tournaments, buy tickets to gaming and anime events, '
          + 'build a team, and get paid when you win. It was built in Nigeria, for players across '
          + 'Africa, by Vermillion Encore.',
        aside: 'Three screens. Under a minute.',
      },
      {
        id: 'welcome-money',
        heading: 'The one thing worth knowing up front',
        body:
          'Entry fees and prizes are counted in VENT COINS. 1,000 naira is 1 VENT COIN. Money goes '
          + 'in through your wallet and comes back out to your bank, and nothing leaves it without '
          + 'the PIN you set.',
        anchor: 'wallet-link',
      },
      {
        id: 'welcome-help',
        heading: 'Every page explains itself',
        body:
          'There is a question mark in the corner of every page. Press it and it tells you what '
          + 'that page is for and what you can do on it. That is where the rest of this used to '
          + 'be - you can read each part when you actually get to it, instead of now.',
        aside: 'Nothing else to sit through. Go and find a free tournament in a game you already play.',
      },
    ],
  },
];

/** Every step, flattened, with its chapter attached - what the engine walks. */
export const flattenSteps = (chapters = CHAPTERS) =>
  chapters.flatMap((chapter, ci) =>
    chapter.steps.map((step, si) => ({
      ...step,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterRoute: chapter.route || null,
      chapterIndex: ci,
      stepIndex: si,
      stepsInChapter: chapter.steps.length,
    })),
  );

export const TOTAL_MINUTES = CHAPTERS.reduce((sum, c) => sum + (c.minutes || 0), 0);
