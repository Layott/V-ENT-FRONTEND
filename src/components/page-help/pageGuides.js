// What each page is for, in the words of somebody who has never seen it.
//
// CEO, 29 August 2026: the six-minute welcome tour "is too long, instead could
// maybe break it down to page by page and even every single sub page and then
// if they want the walkthrough again, there should be a button on every page
// and sub page that will have an explained for what that particular page or sub
// page does."
//
// So this replaces a tour nobody finishes with help that is always one tap away
// and only ever describes the page in front of you. Somebody who wants to know
// what the wallet is asks on the wallet page; nobody has to sit through the
// wallet chapter to reach the teams chapter.
//
// Rules for writing an entry, because this file is content and will be edited
// by people who are not looking at the code:
//
// - `what` is one sentence saying what the page is FOR. Not what is on it.
//   "Where the money you play with lives" beats "displays your balance".
// - `does` is what you can actually do here, each one a real control on the
//   page. If it is not on the page, it does not belong in the list.
// - Plain words, and real numbers where numbers matter. Nothing invented, and
//   nothing promised that is still behind Coming Soon.
// - Say the thing that is not obvious. Every entry should contain at least one
//   sentence somebody could not have guessed from the page title.
//
// Matching, in order: an exact path wins; then the longest pattern whose
// segments all match, where `:x` matches one segment. So `/wallets/topup` finds
// its own entry rather than the one for `/wallets`, and `/tournaments/anything`
// falls to the tournament detail entry rather than the tournaments list.

export const GUIDES = {
  // ------------------------------------------------------------ the basics
  '/': {
    title: 'V-ENT',
    what: 'The front door. Everything the platform does, in one page.',
    does: [
      'Browse tournaments and events without an account',
      'Sign up, or sign in if you already have one',
    ],
    goes: {
      0: '/tournaments',
      1: '/signup',
    },
  },
  '/home': {
    title: 'Home',
    what: 'Your own starting point: what is happening now and what you are part of.',
    does: [
      'Pick up tournaments and events you have joined',
      'See what is starting soon',
      'Jump to anything else from the menu',
    ],
  },
  '/search': {
    title: 'Search',
    what: 'One box for tournaments, events, teams and players.',
    does: ['Search across everything at once', 'Filter the results by what they are'],
  },
  '/notifications': {
    title: 'Notifications',
    what: 'Everything the platform has told you, kept in one place.',
    does: [
      'Read what you missed',
      'Open the thing a notification is about',
    ],
    note: 'Reminders from organisers land here, as well as in your email.',
  },
  '/settings': {
    title: 'Settings',
    what: 'How your account behaves: language, security, and what reaches you.',
    does: [
      'Change the language between English, French and Portuguese',
      'Set up two-factor authentication',
      'Choose which notifications you get',
    ],
  },
  '/terms': {
    title: 'Terms of use',
    what: 'The rules you agree to by using V-ENT, in plain sentences.',
    does: [
      'Read what happens to your money if a tournament is cancelled',
      'Check what an organiser owes you, and what you owe them',
      'See which parts of the platform are open and which are not yet',
      'Read the privacy policy',
    ],
    goes: {
      3: '/privacy-policy',
    },
    note: 'Disputes are heard under Nigerian law, in the courts of Lagos State. Almost everything is settled by writing to support first.',
  },
  '/privacy-policy': {
    title: 'Privacy policy',
    what: 'What V-ENT collects, why, and what it does with it.',
    does: [
      'Read it before you decide to trust us with anything',
      'Read the terms of use as well',
    ],
    goes: {
      1: '/terms',
    },
  },

  // ------------------------------------------------------------- your account
  '/user-profile': {
    title: 'Your profile',
    what: 'The page other players see when they look you up.',
    does: [
      'See your record, your teams and your achievements',
      'Open the editor to change any of it',
    ],
    goes: {
      1: '/edit-user-profile',
    },
  },
  '/edit-user-profile': {
    title: 'Edit your profile',
    what: 'Everything about how you appear to everybody else.',
    does: [
      'Set your display name, picture and banner',
      'Add your gamertag and the accounts you play on',
      'Pick your country, which some tournaments check before letting you enter',
    ],
    note: 'Your in-game accounts matter: an organiser can require one before you may register.',
  },
  '/u/:username': {
    title: 'A player',
    what: 'Somebody else, as they have chosen to present themselves.',
    does: ['See their record and teams', 'Follow them'],
  },

  // ------------------------------------------------------------- tournaments
  '/tournaments': {
    title: 'Tournaments',
    what: 'Every competition open to you, and the place to start your own.',
    does: [
      'Filter by game, format, entry fee or date',
      'Open one to read the rules before you commit',
      'Start creating your own',
    ],
    goes: {
      2: '/tournaments/create-tournament',
    },
    note: 'The entry fee is shown on the card, so nothing costs you a surprise.',
  },
  '/tournaments/:slug': {
    title: 'A tournament',
    what: 'Everything about one competition: the rules, the money, the draw and the players.',
    does: [
      'Read the rules and the prize breakdown before entering',
      'Register, if you meet what the organiser asked for',
      'Follow the bracket as it fills in',
      'See who played best on the Players tab',
    ],
    note: 'Check the entry requirements first. They are checked at registration, before any money moves.',
  },
  '/tournaments/:slug/register': {
    title: 'Entering a tournament',
    what: 'Taking your place, and paying the entry fee if there is one.',
    does: [
      'Enter as yourself or pick the team you are entering with',
      'Answer whatever the organiser asks of entrants',
      'Pay from your wallet',
    ],
    note: 'Anything you do not qualify for is refused here, before you are charged.',
  },
  '/tournaments/:slug/manage': {
    title: 'Running your tournament',
    what: 'The organiser side: entrants, the draw, results, prizes and reminders.',
    does: [
      'Accept or decline who has registered',
      'Generate the bracket and enter results',
      'Send or schedule reminders to everybody entered',
      'Record player stats and pick the most valuable player',
    ],
    note: 'A scheduled reminder is measured from the tournament, so moving the date moves the reminder with it.',
  },
  '/tournaments/create-tournament': {
    title: 'Creating a tournament',
    what: 'Five steps from an idea to something people can enter.',
    does: [
      'Name it, pick the game and set the dates',
      'Choose the format - each one explains what it commits you to',
      'Set the prize pool and how it splits',
      'Add sponsors and your stream links',
      'Save it as a draft and come back, or publish it',
    ],
    goes: {
      4: '/tournaments/drafts',
    },
    note: 'Saving a draft updates the same draft. It does not make a new one each time.',
  },
  '/tournaments/drafts': {
    title: 'Your drafts',
    what: 'Tournaments you started and have not published.',
    does: ['Pick one up where you left it', 'Publish it', 'Delete one you have thought better of'],
  },
  '/tournaments/my-tournaments': {
    title: 'Your tournaments',
    what: 'Everything you are running or have entered.',
    does: ['Open one to run it', 'See at a glance which are live'],
  },
  '/tournaments/overlay': {
    title: 'Stream overlay',
    what: 'A page built to be captured by streaming software, not read by a person.',
    does: ['Point OBS or vMix at this URL to put live scores on your broadcast'],
  },
  '/tournaments/production': {
    title: 'Production',
    what: 'The broadcast side of running a tournament.',
    does: ['Set up the overlays and the stream links your viewers will see'],
  },
  '/rankings': {
    title: 'Rankings',
    what: 'Who is winning, across the platform.',
    does: ['Filter by game and by country', 'Find where you sit'],
  },
  '/disputes': {
    title: 'Disputes',
    what: 'Results somebody has challenged, and where they are up to.',
    does: ['Follow a dispute you raised', 'See what the organiser or an admin decided'],
  },

  // ----------------------------------------------------------------- events
  '/events': {
    title: 'Events',
    what: 'Conventions, screenings, meet-ups and tournaments with a door.',
    does: ['Filter by type and date', 'Open one to buy a ticket', 'Start creating your own'],
    goes: {
      2: '/events/create-event',
    },
  },
  '/events/:slug': {
    title: 'An event',
    what: 'Everything about one event: when, where, what it costs to get in.',
    does: [
      'Buy a ticket, with or without an account',
      'See the venue on a map, and open it in your own maps app',
      'See what the organiser has announced since tickets went on sale',
      'Answer a poll if you hold a ticket',
      'Show that people from your area are going, if you hold a ticket',
    ],
    note: 'You do not need an account to buy a ticket. The email you give is where it goes.',
  },
  '/events/create-event': {
    title: 'Creating an event',
    what: 'From an idea to something people can buy a ticket to.',
    does: [
      'Name it, set the date and the venue',
      'Add ticket types at different prices',
      'Choose what to ask buyers for at checkout',
      'Publish it',
    ],
  },
  '/events/:slug/manage': {
    title: 'Running your event',
    what: 'The organiser side: tickets, money, the door, and the people coming.',
    does: [
      'Add and price ticket types',
      'See what sold and who turned up, and download it as a spreadsheet',
      'Message everybody holding a ticket',
      'Ask the room a question with a poll',
      'Set up influencer codes and promo codes',
    ],
  },
  '/events/:slug/attendees': {
    title: 'The door list',
    what: 'Everybody with a ticket, for the people on the door.',
    does: ['Search for somebody by name or code', 'See who has already come in'],
  },
  '/events/:slug/edit': {
    title: 'Editing your event',
    what: 'Changing the details after it is published.',
    does: ['Fix the date, venue or description', 'Add the directions people keep asking for'],
  },
  '/events/my-events': {
    title: 'Your events',
    what: 'Events you are running.',
    does: ['Open one to run it', 'See which are still drafts'],
  },
  '/events/my-tickets': {
    title: 'Your tickets',
    what: 'Every ticket you hold, with the code that gets you in.',
    does: [
      'Show the QR code at the door',
      'Open an event to check the time and place',
      'Find a ticket you bought without an account',
    ],
    goes: {
      2: '/events/find-ticket',
    },
  },
  '/events/find-ticket': {
    title: 'Finding your ticket',
    what: 'Getting a ticket back when you bought without an account.',
    does: ['Look it up with the email address and the code from your confirmation'],
    note: 'Both are needed. The email alone would let anybody read somebody else’s booking.',
  },
  '/events/check-in/:code': {
    title: 'Checking yourself in',
    what: 'Telling the organiser you have arrived, without queueing.',
    does: ['Confirm the email the ticket was sent to, and mark yourself here'],
    note: 'Only some events allow this, and only in a window around the start. It marks your ticket used, so do it at the venue.',
  },
  '/events/scan': {
    title: 'The door scanner',
    what: 'For staff: reading tickets as people arrive.',
    does: ['Scan a code', 'See instantly whether it has already been used, and where'],
  },
  '/events/ticket-confirmed': {
    title: 'Ticket confirmed',
    what: 'Proof your ticket exists, and where it has gone.',
    does: ['Save the code', 'Open the event'],
  },
  '/events/vendor-shop': {
    title: 'The shop at an event',
    what: 'What the stalls at an event are selling.',
    does: ['Browse what is on sale', 'Buy with VENT COINS and collect it at the stall'],
    note: 'You pay here and collect there. The order code is what the stall asks for.',
  },
  '/events/:slug/vendor-shop': {
    title: 'The shop at an event',
    what: 'What the stalls at this event are selling.',
    does: ['Browse the stalls', 'Buy with VENT COINS and collect at the booth'],
  },

  // ----------------------------------------------------------------- wallet
  '/wallets': {
    title: 'Your wallet',
    what: 'Where the money you play with lives. Entry fees come out of here and prizes go in.',
    does: [
      'See your balance',
      'Add money to it',
      'Send coins to another player',
      'Take money out to your bank',
      'Read your history',
    ],
    goes: {
      1: '/wallets/topup',
      2: '/wallets/send',
      3: '/wallets/withdraw',
      4: '/wallets/history',
    },
    note: '1,000 naira is 1 VENT COIN. Every fee and prize on the platform is counted in coins.',
  },
  '/wallets/topup': {
    title: 'Adding money',
    what: 'Turning naira into VENT COINS.',
    does: ['Choose an amount and pay with a card through Paystack'],
    note: 'The coins land as soon as the payment clears.',
  },
  '/wallets/withdraw': {
    title: 'Taking money out',
    what: 'Turning VENT COINS back into naira in your bank account.',
    does: ['Ask for a payout to your bank account'],
    note: 'Your identity has to be verified first. That check is what stops somebody emptying a stolen account.',
  },
  '/wallets/send': {
    title: 'Sending coins',
    what: 'Moving VENT COINS to another player.',
    does: ['Send to somebody by username, with your PIN'],
  },
  '/wallets/history': {
    title: 'Your transactions',
    what: 'Every coin in and out, and what it was for.',
    does: ['Look up a payment', 'Check what an entry fee or a prize actually was'],
  },
  '/wallets/pin': {
    title: 'Your wallet PIN',
    what: 'The four digits that authorise anything that moves money.',
    does: ['Set it, or change it'],
    note: 'Nothing leaves your wallet without it, including entry fees and shop purchases.',
  },
  '/wallets/verify': {
    title: 'Verifying who you are',
    what: 'Proving your identity so you can be paid out.',
    does: ['Upload a government ID and wait for it to be checked'],
    note: 'Your document is stored privately and is only ever seen by an admin reviewing it.',
  },

  // ------------------------------------------------------------------ teams
  '/teams': {
    title: 'Teams',
    what: 'Every team on the platform, and the place to start yours.',
    does: ['Search for a team', 'Open one to see who plays for it', 'Create your own'],
    goes: {
      2: '/teams/create-team',
    },
  },
  '/teams/:slug': {
    title: 'A team',
    what: 'One team: who is in it, what they have won, what they are entered in.',
    does: ['See the roster and their record', 'Ask to join'],
  },
  '/teams/create-team': {
    title: 'Creating a team',
    what: 'Starting a team so you can enter tournaments together.',
    does: ['Name it, pick the game, add a logo', 'Invite the people who play with you'],
    note: 'One team per game. A tournament enters a team, so a team belongs to one game.',
  },
  '/edit-team-profile': {
    title: 'Editing your team',
    what: 'Changing how your team appears, and who is in it.',
    does: ['Change the name, logo and banner', 'Manage the roster and who may do what'],
  },

  // -------------------------------------------------------------- community
  '/community': {
    title: 'Community',
    what: 'Where players talk: threads, clubs, and finding people to play with.',
    does: ['Read and post in threads', 'Join a club', 'Post a scrim looking for opponents'],
    goes: {
      1: '/community/club',
      2: '/community/scrim/create',
    },
  },
  '/community/thread/:slug': {
    title: 'A thread',
    what: 'One conversation.',
    does: ['Read it', 'Reply, if you are signed in'],
  },
  
  '/community/scrim/create': {
    title: 'Posting a scrim',
    what: 'Asking for a practice match against somebody at your level.',
    does: ['Say the game, the format and when you are free'],
  },
  '/community/dm': {
    title: 'Messages',
    what: 'Private conversations with other players.',
    does: ['Read your conversations', 'Reply'],
  },

  // ----------------------------------------------------------- organisations
  '/organizations': {
    title: 'Organisations',
    what: 'Esports organisations on the platform.',
    does: ['Find one', 'See what they run', 'Create your own'],
    goes: {
      2: '/organizations/create',
    },
  },
  '/organizations/:slug': {
    title: 'An organisation',
    what: 'One organisation: its teams, its tournaments, its events.',
    does: ['See what they are running', 'Follow them'],
  },
  '/organizations/create': {
    title: 'Creating an organisation',
    what: 'Running tournaments and events under one name, with other people helping.',
    does: ['Name it and describe it', 'Invite people to help run it'],
    note: 'An event owned by an organisation can be handed to somebody else to run. One owned by a person cannot.',
  },
  '/organizations/:slug/manage': {
    title: 'Running your organisation',
    what: 'Who is in it, and what they are allowed to do.',
    does: ['Invite and remove people', 'Set what each of them may do'],
  },

  // -------------------------------------------------------------- partners
  '/partners': {
    title: 'Partners',
    what: 'Building something that talks to V-ENT.',
    does: ['Get an API key', 'Read what the API offers'],
    goes: {
      1: '/partners/docs',
    },
  },
  '/partners/docs': {
    title: 'Partner documentation',
    what: 'How to call the V-ENT API, and what it will answer.',
    does: ['Read the endpoints, the scopes and the errors'],
  },
  '/partners/authorize': {
    title: 'Signing in with V-ENT',
    what: 'Another site asking to use your V-ENT account.',
    does: ['See exactly what it is asking for, then allow it or refuse'],
    note: 'Read the list before you allow it. It is what that site will be able to do as you.',
  },

  // ----------------------------------------------------------------- admin
  '/admin': {
    title: 'Admin console',
    what: 'The platform at a glance: users, money, and anything waiting on a person.',
    does: ['Read the day’s numbers', 'Jump to whatever is queued'],
  },
  '/admin/users': {
    title: 'Users',
    what: 'Everybody with an account.',
    does: ['Search for somebody', 'Open their record', 'Ban, unban, or change their role'],
  },
  '/admin/tournaments': {
    title: 'Tournaments, as an admin',
    what: 'Every tournament, including the ones with problems.',
    does: ['Find one', 'Cancel one and refund its entry fees', 'Override a score'],
  },
  '/admin/events': {
    title: 'Events, as an admin',
    what: 'Every event on the platform.',
    does: ['Find one', 'Open it to see how it is selling'],
  },
  '/admin/payouts': {
    title: 'Payouts',
    what: 'People asking to take money out, waiting for a human.',
    does: ['Approve a payout', 'Reject one with a reason'],
    note: 'A payout cannot be approved until that person’s identity is verified.',
  },
  '/admin/kyc': {
    title: 'Identity checks',
    what: 'Documents people have uploaded to prove who they are.',
    does: ['Approve one', 'Reject it with a reason'],
    note: 'These are private documents. They are served only to a signed-in admin, never from a public URL.',
  },
  '/admin/disputes': {
    title: 'Disputes',
    what: 'Results the players could not settle between them.',
    does: ['Read both sides and the evidence', 'Decide it, or dismiss it'],
  },
  '/admin/rates': {
    title: 'Exchange rates',
    what: 'What a coin is worth in other currencies, for display only.',
    does: ['See the nightly feed', 'Refresh it by hand'],
    note: 'These change what a price is SHOWN as. Nobody is ever charged in anything but naira.',
  },
  '/admin/games': {
    title: 'Games',
    what: 'The list of games tournaments can be run on.',
    does: ['Add a game', 'Add an edition of one'],
  },
  '/admin/partners': {
    title: 'Partner access',
    what: 'Who has an API key, and what it lets them do.',
    does: ['Issue a key', 'Change its scopes', 'Rotate or revoke it'],
  },
  '/admin/audit-log': {
    title: 'Audit log',
    what: 'Every action an admin has taken, and who took it.',
    does: ['Filter by admin, action or date', 'Find out who changed something and when'],
  },
  '/admin/settings': {
    title: 'Platform settings',
    what: 'The switches that apply to everybody.',
    does: ['Set commissions and limits', 'Turn modules on and off', 'Put the site in maintenance mode'],
    note: 'Every change here is written to the audit log.',
  },

  // ------------------------------------------------------------------ entry
  '/login': {
    title: 'Sign in',
    what: 'Getting back into your account.',
    does: ['Sign in with your email or username', 'Use Google or Facebook instead'],
    note: 'One session at a time. Signing in somewhere else signs you out here, deliberately.',
  },
  '/signup': {
    title: 'Create an account',
    what: 'Getting one, so you can enter things and be paid.',
    does: ['Sign up with an email address', 'Or use Google or Facebook'],
  },
  '/forgot-password': {
    title: 'Forgotten password',
    what: 'Getting back in when you cannot remember it.',
    does: ['Send yourself a reset link'],
  },
  '/reset-password': {
    title: 'New password',
    what: 'Setting a new one from the link in your email.',
    does: ['Choose a new password'],
  },
  '/verify-email': {
    title: 'Verifying your email',
    what: 'Confirming the address is yours.',
    does: ['Follow the link, or ask for another one'],
    note: 'Some tournaments require a verified address before you may enter.',
  },
  '/onboarding': {
    title: 'Getting started',
    what: 'The few things worth knowing before you look around.',
    does: ['Read the short version', 'Skip it - every page explains itself from its own help button'],
  },
  '/claim/:token': {
    title: 'Claiming your username',
    what: 'Turning a waitlist reservation into a real account.',
    does: ['Set a password and take the username you reserved'],
    note: 'The link works once. It is what proves the reservation is yours.',
  },

  // ------------------------------------------------------------- not yet out
  '/wager': {
    title: 'Wager',
    what: 'Playing somebody for coins. Not open yet.',
    does: [],
    note: 'This is the last thing being built, and it needs a legal review before anybody can use it.',
  },
  '/anime': {
    title: 'Anime',
    what: 'Manga, AMVs and watching together. Not open yet.',
    does: [],
  },
  '/marketplace': {
    title: 'Marketplace',
    what: 'Buying and selling between players. Not open yet.',
    does: [],
  },
  '/shop': {
    title: 'Shop',
    what: 'The V-ENT shop. Not open yet.',
    does: [],
  },

  // ------------------------------------------------- the last thirteen
  //
  // Added after `scripts/check-guides.mjs` found them. That is the whole point
  // of the checker: a route with no guide has no help button, and nothing on
  // screen says so - it is invisible unless somebody happens to open that page.
  '/admin/users/:id': {
    title: 'One user',
    what: 'Everything the platform knows about one account.',
    does: [
      'See their wallet, their identity check and what they have entered',
      'Ban or unban them',
      'Change what they are allowed to do',
    ],
  },
  
  '/community/post': {
    title: 'Posts',
    what: 'What the community is posting right now.',
    does: ['Read the feed', 'Open a post to reply'],
  },
  '/community/post/:slug': {
    title: 'A post',
    what: 'One post and everything said under it.',
    does: ['Read it', 'Reply or like it, if you are signed in'],
  },
  '/community/thread': {
    title: 'Threads',
    what: 'Longer conversations, kept apart from the feed.',
    does: ['Browse the threads', 'Start one'],
  },
  '/community/dm/:slug': {
    title: 'A conversation',
    what: 'One private thread between you and somebody else.',
    does: ['Read it', 'Reply'],
  },
  '/edit-team-profile/:slug': {
    title: 'Editing a team',
    what: 'Changing how this team appears, and who plays for it.',
    does: ['Change the name, logo and banner', 'Manage the roster and the roles'],
  },
  '/events/vendor-shop/vendor': {
    title: 'A stall',
    what: 'One seller at an event, and what they have on sale.',
    does: ['Browse their products', 'Buy and collect at their booth'],
  },
  '/production': {
    title: 'Production',
    what: 'What you can put on a stream, and the console of each thing you run.',
    does: ['Open a tournament you run to start a broadcast and copy its graphics into OBS or vMix',
           'Open an event you run to upload an overlay or start from one of ours'],
  },
  '/auth/external': {
    title: 'Signing in',
    what: 'The step where another service hands you back to V-ENT.',
    does: ['Wait a moment - this page finishes the sign-in and sends you on'],
  },
  '/email-verified/:key/:value': {
    title: 'Email verified',
    what: 'Confirmation that the address is yours.',
    does: ['Carry on to your account'],
  },
  '/reset-email': {
    title: 'Changing your email',
    what: 'Confirming a new address before it replaces the old one.',
    does: ['Enter the code sent to the new address'],
    note: 'Until the code is entered, the old address is still the one that works.',
  },
  '/wallet-topup-callback': {
    title: 'Finishing a top-up',
    what: 'The step where Paystack hands you back after a payment.',
    does: ['Wait a moment - this confirms the payment and credits your coins'],
    note: 'Closing this page does not lose the money. The payment is confirmed on our side too.',
  },

  // ----------------------------------------------------- written 12 September
  // The guides catcher was wired into check-all on 12 September 2026 and read
  // 38 screens with no entry. These are those screens. Same rules as above:
  // what the page is FOR, then what a person can actually do on it.
  '/admin/admins': {
    title: 'Administrators',
    what: 'Everybody who can open this console, and what each of them may do.',
    does: [
      'Give somebody a role, or take one away',
      'See who has an authenticator set up, and when each person was last here',
    ],
    note: 'Every grant and every removal lands in the audit log with who did it. A role that names a thing not built yet grants nothing until it is.',
  },
  '/admin/communities': {
    title: 'Communities',
    what: 'Every club on the platform, with how many people are in it and how much they say.',
    does: ['Open a club to read what it holds'],
  },
  '/admin/communities/:slug': {
    title: 'One club',
    what: 'A single club as the console sees it: its members, its topics, its discussions and how far they reach.',
    does: ['Read the discussions', 'See who started each one and how many people it reached'],
  },
  '/admin/content': {
    title: 'Reports and content',
    what: 'What people told us about, and what they posted, over the last seven days.',
    does: [
      'Decide a report: dismiss it, remove the content, or remove it and ban the account',
      'See the queue of reports still waiting',
    ],
    note: 'A ban decided here is the same ban as on the users page. It shows on the account the moment it is pressed.',
  },
  '/admin/events/:slug': {
    title: 'One event, for admins',
    what: 'A single event with its numbers, and the two things only an admin does to it.',
    does: [
      'Cancel the event with a reason, or restore it',
      'Void a ticket and return its seat, or reinstate one',
    ],
    note: 'Cancelling needs a reason and keeps it. The organiser sees the same reason.',
  },
  '/admin/finance': {
    title: 'Money',
    what: 'Every movement of VENT COINS on the platform, whoever holds the wallet.',
    does: [
      'Filter by wallet kind, by kind of movement, by state and by date',
      'Download the filtered lines as a report',
      'Move funds between two wallets, which lands on both statements',
      'See the last 30 days by stream, and what the marketplace is holding',
    ],
    note: 'The marketplace line says closed while Vermillion City is shut. That is the switch doing its job, not a failure.',
  },
  '/admin/organizations': {
    title: 'Organisations',
    what: 'Every organisation on the platform, what it holds, and who runs it.',
    does: ['Create an organisation on behalf of somebody', 'Open one'],
  },
  '/admin/organizations/:slug': {
    title: 'One organisation, for admins',
    what: 'A single organisation: who runs it, what it holds, and whether it is verified.',
    does: [
      'Edit its details',
      'Verify it, or remove verification',
      'Download its statement',
    ],
    note: 'Verified shows on the public page as a mark beside the name. Removing it removes the mark the same moment.',
  },
  '/anime/battles': {
    title: 'Character battles',
    what: 'Fans nominate characters and score them on five attributes. The averages decide it.',
    does: ['Open a battle to see where it stands, or to vote'],
    note: 'A battle takes nominations first, then opens for voting, then is decided. The state is written on each one.',
  },
  '/anime/battles/:slug': {
    title: 'One battle',
    what: 'One question, several characters, and where the scores stand.',
    does: [
      'Nominate a character while nominations are open',
      'Score each attribute from 2 to 10 while voting is open',
      'Argue about it below',
    ],
    note: 'Each attribute is the average of the votes on it, and a character total is the five averages added up. A tie is a real answer here.',
  },
  '/anime/manga': {
    title: 'Comics',
    what: 'Every comic published on V-ENT, by status and in the order you choose.',
    does: ['Filter by status', 'Open a comic'],
  },
  '/anime/manga/:slug': {
    title: 'One comic',
    what: 'A comic, its chapters, and how to keep up with it.',
    does: [
      'Start reading, or carry on where you stopped',
      'Follow it to be told when a chapter lands',
      'Subscribe by the month, if the author charges for chapters',
    ],
    note: 'A subscription is paid in VENT COINS and runs until the date shown. A single chapter can also be bought on its own.',
  },
  '/anime/my-list': {
    title: 'My list',
    what: 'Everything you are reading, following, subscribed to or have bookmarked, in one place.',
    does: ['Carry on reading from the exact page you left', 'Open anything you follow'],
  },
  '/anime/read/:slug': {
    title: 'The reader',
    what: 'One chapter, page by page, in the reading mode you prefer.',
    does: [
      'Turn pages, or scroll a vertical strip',
      'Bookmark the page you are on',
      'Change the reading mode and the theme in the settings',
    ],
    note: 'A paid chapter asks for the coins once and is then yours. Some themes are premium.',
  },
  '/anime/room/:token': {
    title: 'A reading room',
    what: 'Several people reading the same chapter at once, with one of them turning the page.',
    does: [
      'Join, with the password if the host set one',
      'Read along as the driver turns the page',
      'Say something, or stick a note on a page',
    ],
    note: 'The host closes the session, and afterwards sees how long it ran, how many came and what got the most reactions.',
  },
  '/anime/rooms': {
    title: 'Reading rooms',
    what: 'The rooms open right now, and where to start your own.',
    does: ['Join a room that is open', 'Open a room: name it, pick what to read, say who may join and who turns the page'],
  },
  '/anime/studio': {
    title: 'Your comics',
    what: 'Where an author publishes: comics, chapters, prices and readers.',
    does: [
      'Create a comic, which stays private until you publish it',
      'Upload a chapter as a set of page files',
      'Set a price per chapter, or per month, or keep it free',
      'Boost a comic so it shows first, and send a note to your readers',
    ],
    note: 'Boosting is a premium feature. Coins from paid chapters and subscriptions land in your wallet.',
  },
  '/community/challenge/:slug': {
    title: 'One challenge',
    what: 'A match somebody is looking for, and where it stands between the two sides.',
    does: [
      'Accept it, with a team if it is a team challenge',
      'Agree the details, then record your score beside theirs',
      'Call it off',
    ],
    note: 'A result counts once both sides have agreed it. Talk to the other side to arrange the when and where.',
  },
  '/events/:slug/run-of-show': {
    title: 'Run of show',
    what: 'The programme of the event, minute by minute, as the organiser published it.',
    does: ['Read what is on now and what comes next'],
    note: 'Times are shown in your own time zone. A physical event names the venue clock beside them.',
  },
  '/feedback': {
    title: 'Send feedback',
    what: 'Telling us what is wrong, or what is missing, in your own words.',
    does: ['Say what it is about, what kind of thing it is, and what happened', 'Leave an email if you want an answer'],
    note: 'It is logged the moment you send it, whether or not you leave an email.',
  },
  '/logout': {
    title: 'Sign out',
    what: 'Ending your session on this device.',
    does: ['Sign out', 'Stay signed in and go back'],
    note: 'Signing out here does not touch any other device you are signed in on.',
  },
  '/marketplace/create': {
    title: 'List something',
    what: 'Putting something up for sale, a service, or a swap, in Vermillion City.',
    does: ['Say what it is, what it costs, and how it is handed over'],
    note: 'A free account keeps one listing live at a time. Money from a sale is held until the buyer says it arrived.',
  },
  '/marketplace/dashboard': {
    title: 'What I am selling',
    what: 'Everything you have listed, and everything people have done about it.',
    does: ['See what you have earned, what is live, and how many people looked', 'List something new'],
  },
  '/marketplace/listing/:slug': {
    title: 'One listing',
    what: 'One thing for sale, who is selling it, and how to buy it.',
    does: ['Buy it with VENT COINS', 'Open the seller to see their sales and rating'],
    note: 'The coins are held by V-ENT and paid to the seller when you say it arrived. If something is wrong, say so on the order instead.',
  },
  '/marketplace/purchase/:token': {
    title: 'One order',
    what: 'A purchase between you and the other side, and what happens to the money.',
    does: [
      'Say it arrived, which pays the seller',
      'Call it off, or refund the buyer',
      'Say something is wrong, which holds the money until it is looked at',
    ],
  },
  '/marketplace/seller/:username': {
    title: 'A seller',
    what: 'Somebody who sells in Vermillion City: their sales, their rating and what they have live.',
    does: ['Read their reviews', 'Open anything they are selling', 'Open their V-ENT profile'],
  },
  '/memberships': {
    title: 'My memberships',
    what: 'Every membership you have joined, what it costs you, and where the payment comes from.',
    does: [
      'Cancel a membership, or keep it after all',
      'Move to another plan from the same organiser',
      'Read every payment that was taken, and why one failed',
    ],
    note: 'Payments come from your VENT COINS first, then your saved card if the balance is short. A move to another plan starts at the beginning of your next period; nothing extra is charged on the day.',
  },
  '/my-stalls': {
    title: 'My stalls',
    what: 'The stalls you run at events, whether you bought the pitch or were invited.',
    does: ['Open a stall to add what you sell and see its orders'],
    note: 'You get a stall by buying a pitch on an event page, or when an organiser adds you by email or username.',
  },
  '/my-stalls/:slug': {
    title: 'One stall',
    what: 'Your shop at one event: what you sell, what people ordered, and where each order is.',
    does: [
      'Open or close the stall',
      'Add what you sell, with a picture, a price and stock',
      'Move an order along: ready, collected, sent with a tracking number, arrived',
    ],
    note: 'A stall waits for the organiser until they approve it, if that event asks for approval.',
  },
  '/plans/:slug': {
    title: 'A membership',
    what: 'One membership an organiser sells: what you get, what it costs, and how to join.',
    does: ['Join, or start the free trial if there is one', 'Manage it once you are a member'],
    note: 'The first payment is taken when you join. You can cancel in one press and keep it to the end of the period you paid for.',
  },
  '/premium': {
    title: 'V-ENT premium',
    what: 'What premium switches on, what it costs, and how to turn it on.',
    does: ['Turn it on for a month, three, six or a year, paid from your wallet', 'Say you want it, if it is not on sale yet'],
    note: 'While it is not on sale the page records who wants it rather than charging anybody.',
  },
  '/pricing': {
    title: 'Pricing',
    what: 'What V-ENT costs. Right now: nothing.',
    does: ['Read what will cost money later, and what will stay free', 'See what premium costs'],
  },
  '/run-of-show/:token': {
    title: 'The crew link',
    what: 'The run of show as the crew sees it, at an address made to be pasted into a group chat.',
    does: ['Read what is on now and what is next, on a phone, without an account'],
    note: 'Only the people the organiser sent the link to have it. It is not listed anywhere.',
  },
  '/teams/join/:token': {
    title: 'Join a team',
    what: 'An invitation link from a team, and the role you would join as.',
    does: ['Join the team'],
    note: 'A link can expire or be used up. If it does not work, ask whoever sent it for a new one.',
  },
  '/tournaments/:slug/edit': {
    title: 'Editing a tournament',
    what: 'Changing a tournament you run, step by step, the same way it was created.',
    does: ['Change any step and save', 'Set which organisation runs it'],
    note: 'A tournament that is renamed gets a new address, and every old address keeps working.',
  },
  '/tournaments/:slug/run-of-show': {
    title: 'Run of show',
    what: 'The programme of the tournament, minute by minute, as the organiser published it.',
    does: ['Read what is on now and what comes next'],
    note: 'Times are shown in your own time zone.',
  },
};

/** The translation key for a route: `/community/club` -> `community.club`.
 *  Built from the address rather than from the English words, so rewriting a
 *  sentence does not orphan its French and Portuguese versions. */
export function routeKey(pattern) {
  const parts = pattern.split('/').filter(Boolean).map((s) => (s.startsWith(':') ? s.slice(1) : s));
  return parts.length ? parts.join('.') : 'root';
}

/** The guide for a path, or null. Exact match first, then the longest pattern
 *  whose segments all match, so a sub-page never falls back to its parent while
 *  it has an entry of its own. */
export function guideFor(pathname) {
  if (!pathname) return null;

  // The locale prefix is not part of the address as far as this is concerned.
  const path = String(pathname).replace(/^\/(en|fr|pt)(?=\/|$)/, '') || '/';
  if (GUIDES[path]) return { ...GUIDES[path], key: routeKey(path) };

  const parts = path.split('/').filter(Boolean);
  let best = null;
  let bestLength = -1;

  for (const [pattern, guide] of Object.entries(GUIDES)) {
    const wanted = pattern.split('/').filter(Boolean);
    if (wanted.length !== parts.length) continue;
    const fits = wanted.every((seg, i) => seg.startsWith(':') || seg === parts[i]);
    // Prefer the pattern with the most literal segments: `/events/:slug/manage`
    // beats `/events/:slug/:anything` when both would match.
    const literals = wanted.filter((s) => !s.startsWith(':')).length;
    if (fits && literals > bestLength) {
      best = { ...guide, key: routeKey(pattern) };
      bestLength = literals;
    }
  }
  return best;
}

export default GUIDES;
