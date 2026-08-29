// The terms of use, as data, in the same shape as the privacy policy.
//
// CEO, 29 August 2026: "for the terms of use and privacy policy, we can make it
// a page instead of a document, so that issues like that insert jurisdiction
// won't be there and vague stuff like that, please read through and edit
// properly."
//
// The terms were a PDF in `/public`, and the PDF still carried its drafting
// notes: "the laws of [Insert Jurisdiction, e.g., the Federal Republic of
// Nigeria]" and "[Insert Dispute Resolution Mechanism, e.g., binding arbitration
// in Lagos, Nigeria]". A document that tells the reader the author had not
// decided which country's law applies is worse than no document, and a PDF is
// the reason it survived: nobody edits a PDF, nobody can translate it, and no
// search engine or screen reader can read it properly.
//
// Three things were corrected while moving it, not just the placeholder:
//
// 1. Governing law and disputes now name Nigeria and the courts of Lagos.
// 2. Payouts said "USDT to crypto wallets". The platform pays out to a Nigerian
//    bank account and has no crypto payout path, so the terms described a
//    mechanism that does not exist. It now describes the one that does.
// 3. The features section listed a virtual fitting room, an AI chatbot,
//    co-reading, the marketplace, the shop and wagers as though they were live.
//    Four of those sit behind Coming Soon. A contract should not grant rights
//    over things nobody can reach, so the section now says which parts are open
//    and which are not.
//
// English is authoritative, and the page says so in whichever language it is
// read, for the same reason the privacy policy does.

export const TERMS_KEYS = {
  back: ['back', 'Back to V-ENT'],
  title: ['title', 'Terms of use'],
  updated: ['updated', 'Last updated: 29 August 2026 · Vermillion Encore (V-ENT)'],
  authoritative: [
    'authoritative',
    'These terms are written in English. The French and Portuguese versions are '
    + 'provided so they can be read, and where they differ from the English the '
    + 'English is the version that binds.',
  ],
  contactIntro: ['contactIntro', 'Questions about these terms:'],
  contactAfter: [
    'contactAfter',
    'For anything about your own account, Settings is faster than an email.',
  ],
};

export const SECTIONS = [
  {
    id: 'agree',
    heading: '1. What you are agreeing to',
    paragraphs: [
      'V-ENT is operated by Vermillion Encore, a company registered in Nigeria. These terms '
      + 'govern your use of the V-ENT website and applications. Creating an account, buying a '
      + 'ticket, or entering a tournament means you accept them, along with the privacy policy.',
      'If you do not accept them, do not create an account. Most of the platform can still be '
      + 'read without one.',
    ],
  },
  {
    id: 'who',
    heading: '2. Who may use V-ENT',
    items: [
      'You must be at least 13 years old to hold an account. If you are under 18, you may only '
      + 'top up, spend or withdraw money with the consent of a parent or guardian.',
      'One person, one account. Creating a second account to enter a tournament twice, to evade '
      + 'a ban, or to claim an offer again is grounds for closing all of them.',
      'You are responsible for what happens under your account. Turn on two-factor authentication '
      + 'in Settings, and set a wallet PIN, which is required before anything moves money.',
      'The information you register with has to be true. Entry requirements, prize payouts and '
      + 'identity checks are all decided from it.',
    ],
  },
  {
    id: 'features',
    heading: '3. What the platform currently does',
    paragraphs: [
      'These parts are open and these terms apply to them in full: tournaments and brackets, '
      + 'events and ticketing, teams, the wallet, the community, organisations, and the partner API.',
    ],
    items: [
      'Tournaments: browse, register, pay an entry fee from your wallet, play, and be paid a prize '
      + 'if you win. An organiser may set entry requirements, and they are checked before you are charged.',
      'Events and tickets: buy a ticket with or without an account, receive a code, and be admitted '
      + 'on it. An organiser may sell merchandise at an event, paid for in VENT COINS and collected there.',
      'Teams: create one, invite people, assign roles, and enter as a team where the format allows it.',
      'Wallet: hold VENT COINS, top up, send, and withdraw to a Nigerian bank account.',
      'Community: posts, forums, clubs, scrim listings and direct messages.',
      'Organisations: run tournaments and events under an organisation, with members and roles.',
    ],
    after: [
      'The anime, marketplace, shop and wager sections are not open. They appear in the menu marked '
      + 'Coming Soon, nothing can be bought or entered through them, and no term here grants you '
      + 'any right in respect of them until they are launched and these terms are updated to describe them.',
    ],
  },
  {
    id: 'coins',
    heading: '4. VENT COINS and money',
    items: [
      'VENT COINS are the unit every fee and prize on the platform is counted in. 1,000 naira is '
      + '1 VENT COIN.',
      'Coins are a record of value held on your behalf. They are not a security, not an investment, '
      + 'and they earn nothing by sitting in your wallet.',
      'Top-ups are taken by Paystack. V-ENT never sees or stores your card number.',
      'Withdrawals are paid in naira to a Nigerian bank account in your own name. Your identity has '
      + 'to be verified first. V-ENT does not pay out in cryptocurrency.',
      'A withdrawal is reviewed before it is paid. Review exists to stop somebody emptying an account '
      + 'they have taken over, and it is normally same-day.',
      'Entry fees are held until the tournament is decided. If a tournament is cancelled, entry fees '
      + 'are returned to the wallets they came from.',
      'V-ENT may charge a fee for running a tournament or selling a ticket. Where a fee applies it is '
      + 'shown before you pay, not after.',
    ],
  },
  {
    id: 'conduct',
    heading: '5. What you may not do',
    items: [
      'Cheat, use unauthorised software, play under somebody else\'s account, or arrange a result in '
      + 'advance. Any of these forfeits the entry fee and the prize.',
      'Post content that is illegal, that harasses somebody, or that you do not have the right to post.',
      'Use the wallet to move money for anybody else, or to disguise where money came from.',
      'Attempt to reach parts of the platform, or other people\'s accounts, that you have not been given access to.',
      'Interfere with how the platform runs, including automated scraping outside the partner API.',
    ],
    after: [
      'V-ENT can remove content, lock a thread, suspend an account or close it. Where money is involved '
      + 'you will be told what was decided and why, and a decision about a match can be disputed on the '
      + 'tournament itself.',
    ],
  },
  {
    id: 'organisers',
    heading: '6. If you run tournaments or events',
    items: [
      'What you publish is what you are held to: the rules, the entry requirements, the prize '
      + 'breakdown, the dates and the venue.',
      'Prizes you advertised have to be paid. If a tournament cannot go ahead, cancel it so entry '
      + 'fees are returned rather than leaving it open.',
      'You are responsible for the people you admit and for anything you sell at your event.',
      'Attendee details exist so you can run the event. Do not sell them, and do not use them for '
      + 'anything the attendee did not agree to.',
    ],
  },
  {
    id: 'content',
    heading: '7. Content and ownership',
    items: [
      'The platform itself, its code, design and branding, belong to Vermillion Encore.',
      'What you upload stays yours. You give V-ENT permission to store it, show it on the platform, '
      + 'and use it to promote the tournament or event it belongs to. Nothing more.',
      'That permission ends when you delete the content, except where it is already part of a '
      + 'published result or an image somebody else has been sent.',
      'If you believe something on V-ENT infringes your rights, write to support@v-ent.co with enough '
      + 'detail to find it.',
    ],
  },
  {
    id: 'liability',
    heading: '8. What V-ENT does not promise',
    items: [
      'The platform is provided as it is. It is not guaranteed to be available without interruption, '
      + 'and a deploy or an outage may make it briefly unreachable.',
      'V-ENT is not responsible for what other people post, for a result an organiser records, or for '
      + 'anything on a site you reach through a link from here.',
      'V-ENT is not liable for indirect or consequential loss. Nothing here limits liability for fraud, '
      + 'or for anything the law does not allow to be limited.',
      'Where V-ENT is liable for money held in your wallet, that liability is the balance itself.',
    ],
  },
  {
    id: 'closing',
    heading: '9. Closing an account',
    items: [
      'You can close your account in Settings. Withdraw your balance first: a closed account cannot '
      + 'be paid out to without opening a support case.',
      'V-ENT can close an account for a serious or repeated breach of these terms. Where a balance '
      + 'is held it is returned, less anything owed.',
      'Records that have to be kept for legal or accounting reasons are kept. The privacy policy says '
      + 'what those are and for how long.',
    ],
  },
  {
    id: 'law',
    heading: '10. Governing law and disputes',
    paragraphs: [
      'These terms are governed by the laws of the Federal Republic of Nigeria, without regard to '
      + 'conflict of law principles.',
      'Any dispute arising from these terms or from your use of the platform is subject to the '
      + 'exclusive jurisdiction of the courts of Lagos State, Nigeria.',
      'Before that, write to support@v-ent.co. Almost everything that has ever been raised was a '
      + 'question about a result, a payout or a ticket, and those are settled in days rather than in court.',
    ],
  },
  {
    id: 'changes',
    heading: '11. Changes to these terms',
    paragraphs: [
      'These terms can change. When they do, the date at the top of this page changes with them, and '
      + 'a change that affects your money or your content is sent to you as a notification rather than '
      + 'left here to be discovered.',
      'Continuing to use the platform after a change means you accept it. If you do not, close your '
      + 'account and withdraw your balance.',
    ],
  },
  {
    id: 'rest',
    heading: '12. The rest',
    items: [
      'If one part of these terms is unenforceable, the rest still stands.',
      'These terms and the privacy policy are the whole agreement between you and V-ENT about using '
      + 'the platform.',
      'V-ENT not enforcing something on one occasion does not mean it has given up the right to '
      + 'enforce it.',
    ],
    contact: true,
  },
];
