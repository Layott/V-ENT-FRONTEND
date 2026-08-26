// What a new person is actually shown on their first day.
//
// Written as content, not as configuration. Every string here is read by
// somebody who has never used the platform and has no idea what a VENT COIN is,
// what a bracket is, or why anybody would check in to a tournament. So:
//
// - Plain words. "The money you play with", not "fungible platform currency".
// - Say what a thing is FOR before saying where the button is. Somebody who
//   knows why they would want a team can find the Teams link on their own.
// - Numbers where numbers matter. "1,000 NGN is 1 VENT COIN" beats "an internal
//   currency". Nothing invented: every figure here matches what the code does.
// - Nothing promised that does not exist. Modules still behind ComingSoon are
//   not in this tour, because a walkthrough of features nobody can use is how a
//   product loses trust in its first five minutes.
//
// `anchor` is a `data-tour` value on a real element. When the element is not on
// the page - the sidebar collapses on mobile, some chapters cover pages the
// person is not on - the step falls back to a centred card, which is why every
// step has to read correctly without the thing it points at.

export const TOUR_VERSION = 1;

export const CHAPTERS = [
  // ---------------------------------------------------------------- welcome
  {
    id: 'welcome',
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
        aside:
          'This walkthrough takes about six minutes. You can leave at any point and pick it up '
          + 'again from Settings.',
      },
      {
        id: 'welcome-how',
        heading: 'How to move around',
        body:
          'Everything lives in the menu down the left. On a phone that menu becomes a bar along the '
          + 'bottom with the five things you need most, and the rest sits behind the button in the '
          + 'top corner.',
        anchor: 'sidebar',
      },
      {
        id: 'welcome-search',
        heading: 'Looking for something specific',
        body:
          'The search box at the top finds tournaments, events, teams and players in one go. If you '
          + 'know the name of what you want, it is faster than any menu.',
        anchor: 'search',
      },
    ],
  },

  // ------------------------------------------------------------ tournaments
  {
    id: 'tournaments',
    title: 'Tournaments',
    minutes: 2,
    steps: [
      {
        id: 'tour-browse',
        heading: 'Finding one worth entering',
        body:
          'The tournaments page lists everything open. Each card shows the game, the date, the '
          + 'prize pool and how many places are left, so you can tell at a glance whether it is '
          + 'worth your evening.',
        anchor: 'nav-tournaments',
      },
      {
        id: 'tour-entry',
        heading: 'Free to enter, or paid',
        body:
          'A free tournament costs nothing. A paid one takes an entry fee from your wallet when you '
          + 'register, and that fee is usually what makes up the prize pool. The card tells you '
          + 'which before you click anything.',
      },
      {
        id: 'tour-eligibility',
        heading: 'Why some tournaments turn you away',
        body:
          'An organiser can limit who enters: a country, a minimum age, a verified email address, '
          + 'or verified identity. If you are not eligible you are told so at registration, before '
          + 'any money leaves your wallet, and the message says exactly which rule stopped you.',
      },
      {
        id: 'tour-register',
        heading: 'Registering',
        body:
          'Press Register on the tournament page. If it is a team tournament you pick which of your '
          + 'teams is entering. If it costs money you confirm with your wallet PIN. That is the '
          + 'whole thing.',
      },
      {
        id: 'tour-checkin',
        heading: 'Check in, or you forfeit',
        body:
          'This is the one that catches people out. Most tournaments open a check-in window shortly '
          + 'before they start - usually fifteen minutes. You have to press Check in during that '
          + 'window to confirm you are actually there. Miss it and the organiser can remove you, '
          + 'even though you registered weeks ago.',
        aside:
          'The tournament page shows a countdown while check-in is open. Set an alarm for the '
          + 'start time and you will never lose a slot this way.',
      },
      {
        id: 'tour-bracket',
        heading: 'The bracket',
        body:
          'Once check-in closes the organiser generates the bracket and you can see exactly who you '
          + 'play and when. Your match appears with your opponent’s name; when it is done, one '
          + 'of you reports the score and the other confirms it.',
      },
      {
        id: 'tour-dispute',
        heading: 'When you disagree about a result',
        body:
          'If somebody reports a score you did not agree to, you can dispute it instead of '
          + 'confirming. That sends it to the organiser with whatever you attach. Take a screenshot '
          + 'of the final screen every time - it turns an argument into a two-minute decision.',
      },
    ],
  },

  // ----------------------------------------------------------------- wallet
  {
    id: 'wallet',
    title: 'VENT COINS and your wallet',
    minutes: 1,
    steps: [
      {
        id: 'wallet-what',
        heading: 'What a VENT COIN is',
        body:
          'VENT COINS are what the platform runs on. Entry fees come out of them and prizes are '
          + 'paid in them. One VENT COIN is 1,000 naira.',
        anchor: 'nav-wallets',
      },
      {
        id: 'wallet-topup',
        heading: 'Putting money in',
        body:
          'Top up with a card or a bank transfer through Paystack. Your card details go straight to '
          + 'Paystack and never touch V-ENT. If you tick "save this card" you can top up again '
          + 'later without re-entering anything.',
      },
      {
        id: 'wallet-pin',
        heading: 'Your wallet PIN',
        body:
          'Set a four-digit PIN before you do anything with money. It is asked for whenever coins '
          + 'leave your wallet - entry fees, sending coins to somebody, withdrawing. It is the one '
          + 'thing standing between somebody who borrows your unlocked phone and your balance.',
      },
      {
        id: 'wallet-withdraw',
        heading: 'Taking money out',
        body:
          'Withdrawals go to a Nigerian bank account and need your identity verified first. That '
          + 'verification is a legal requirement for paying out real money, not a formality we '
          + 'invented, and it is worth doing before you win rather than after.',
      },
    ],
  },

  // ------------------------------------------------------------------ teams
  {
    id: 'teams',
    title: 'Teams',
    minutes: 1,
    steps: [
      {
        id: 'teams-why',
        heading: 'Why you need one',
        body:
          'Plenty of tournaments only accept teams. Making one takes a minute: give it a name, pick '
          + 'the game, invite people by their username.',
        anchor: 'nav-teams',
      },
      {
        id: 'teams-one-per-game',
        heading: 'One team per game',
        body:
          'You can only be in one team per game at a time. It stops the situation where the same '
          + 'player is in a bracket twice under two different names, which is unfair to everybody '
          + 'else in it.',
      },
      {
        id: 'teams-roles',
        heading: 'Who can do what',
        body:
          'The owner can enter the team into tournaments, remove members and hand the team to '
          + 'somebody else. A captain can manage the line-up. Everybody else plays.',
      },
    ],
  },

  // ----------------------------------------------------------------- events
  {
    id: 'events',
    title: 'Events and tickets',
    minutes: 1,
    steps: [
      {
        id: 'events-what',
        heading: 'More than tournaments',
        body:
          'Events are the things around the games: conventions, anime meetups, LAN parties, watch '
          + 'parties. Some are free, some are ticketed, some happen in a room in Lagos and some '
          + 'happen online.',
        anchor: 'nav-events',
      },
      {
        id: 'events-tickets',
        heading: 'How a ticket works',
        body:
          'Buy a ticket and you get a QR code in My Tickets. Somebody scans it at the door. It '
          + 'works from your phone with no signal, so a bad network at the venue is not your '
          + 'problem.',
      },
      {
        id: 'events-linked',
        heading: 'Events with a tournament inside them',
        body:
          'An event can have a tournament attached. When the organiser has turned on shared '
          + 'ticketing, your event ticket covers the tournament entry fee too, so you are not '
          + 'charged twice for the same afternoon.',
      },
    ],
  },

  // -------------------------------------------------------------- community
  {
    id: 'community',
    title: 'Community',
    minutes: 1,
    steps: [
      {
        id: 'community-what',
        heading: 'Where people talk',
        body:
          'The feed is short posts. The forums are for longer arguments about the meta. Clubs are '
          + 'groups built around one game. Scrims are practice matches - one team posts, another '
          + 'accepts.',
        anchor: 'nav-community',
      },
      {
        id: 'community-dm',
        heading: 'Direct messages',
        body:
          'You can message anybody whose settings allow it. If you would rather not be messaged by '
          + 'people you do not know, turn it off under Settings, Privacy.',
      },
      {
        id: 'community-scrims',
        heading: 'Finding practice',
        body:
          'Scrims are how you get better between tournaments, and how you find out whether your '
          + 'line-up actually works before it costs you an entry fee.',
      },
    ],
  },

  // ---------------------------------------------------------------- profile
  {
    id: 'profile',
    title: 'Your profile and settings',
    minutes: 1,
    steps: [
      {
        id: 'profile-what',
        heading: 'What other people see',
        body:
          'Your profile carries your gamertag, the games you play, your team, and the tournaments '
          + 'you have finished. Organisers and teams looking for players read it, so it is worth '
          + 'ten minutes.',
        anchor: 'nav-profile',
      },
      {
        id: 'profile-gaming-accounts',
        heading: 'Link your in-game names',
        body:
          'Add your in-game name for each game you play. Organisers use it to find you in the '
          + 'lobby, and without it somebody has to chase you before every match.',
      },
      {
        id: 'profile-language',
        heading: 'Your language',
        body:
          'V-ENT is in English, French and Portuguese. Change it under Settings and the whole '
          + 'interface changes immediately - no reload, and it follows you to your other devices.',
        anchor: 'nav-settings',
      },
      {
        id: 'profile-2fa',
        heading: 'Protecting the account',
        body:
          'Turn on two-factor authentication under Settings, Security. Your account holds money and '
          + 'your tournament history; a password on its own is thin protection for either.',
      },
    ],
  },

  // ------------------------------------------------------------------ close
  {
    id: 'done',
    title: 'That is the tour',
    minutes: 0,
    steps: [
      {
        id: 'done-next',
        heading: 'A good first move',
        body:
          'Find a free tournament in a game you already play and enter it. You will learn more from '
          + 'one bracket than from any amount of reading, and it costs nothing to be wrong.',
      },
      {
        id: 'done-help',
        heading: 'If you get stuck',
        body:
          'The small information marks beside buttons and options explain what each one does. This '
          + 'walkthrough can be replayed any time from Settings.',
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
      chapterIndex: ci,
      stepIndex: si,
      stepsInChapter: chapter.steps.length,
    })),
  );

export const TOTAL_MINUTES = CHAPTERS.reduce((sum, c) => sum + (c.minutes || 0), 0);
