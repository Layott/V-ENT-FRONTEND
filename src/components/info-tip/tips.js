// What every control on the site actually does.
//
// These are the English originals. They are also the fallback: `t('tip.x')`
// returns the French or Portuguese where one exists and this text where one does
// not, so a missing translation shows a real sentence rather than a key.
//
// How they are written, because a tooltip that restates its own label is worse
// than no tooltip:
//
// - **Say what it does, not what it is called.** "Entry fee" explaining "the
//   entry fee" helps nobody.
// - **Say the consequence.** What happens if you turn it on, and what happens
//   if you leave it off.
// - **Give the number.** "1,000 naira is 1 VENT COIN" beats "the platform
//   currency". Every figure here matches what the code does.
// - **Plain words.** The reader may be fifteen, on a phone, on their first day.

export const TIPS = {
  // ------------------------------------------------------------- universal
  whatIsThis: 'What is this?',

  // ----------------------------------------------------- creating: basics
  tournamentTitle:
    'The name people will see in the list and in any link you share. Pick something '
    + 'they can recognise later - the game and the week works well.',
  tournamentGame:
    'Which game is being played. It decides who finds your tournament when they filter '
    + 'the list, so it has to be right.',
  gameMode:
    'The mode inside that game - Battle Royale, Clash Squad, 5v5. Players use it to work '
    + 'out whether this is the format they practise.',
  tournamentDescription:
    'A few lines on what this is and who it is for. It is what somebody reads before '
    + 'deciding to enter, and it is what a search result shows.',
  tournamentRules:
    'The rules you will be held to when somebody disputes a result. Be specific about '
    + 'what counts as a win, what happens if a player disconnects, and what is banned.',
  tournamentType:
    'Online means everybody plays from wherever they are. Physical means a real venue and '
    + 'a real address. Hybrid means both at once.',
  tournamentVisibility:
    'Public appears in the tournaments list. Private is reachable only by the link. '
    + 'Protected asks for a password before anybody can enter.',
  hideLocation:
    'Keeps the venue address off the public page. Useful when you only want the address '
    + 'to reach people who have actually got a ticket.',
  startDateTime:
    'When play begins. If you use check-in, its window is measured back from this time, '
    + 'so moving this moves that.',
  endDateTime:
    'When you expect it to be over. It is what tells somebody whether it clashes with '
    + 'something else they have entered.',

  // ------------------------------------------------------ creating: format
  bracketType:
    'How winners are decided. Single elimination is one loss and you are out. Double '
    + 'gives everybody a second life in a losers bracket. Round robin means everybody '
    + 'plays everybody, which takes far longer but is the fairest.',
  tournamentAccess:
    'Whether people enter as a team, on their own, or either. A team tournament asks '
    + 'which of your teams is entering.',
  teamSize:
    'How many players each team fields in a match. Substitutes are set separately.',
  minParticipants:
    'The bracket will not generate below this number. It stops a tournament running with '
    + 'four people when it was built for thirty-two.',
  maxParticipants:
    'The cap. Once this many have registered, nobody else can, and they are told the '
    + 'tournament is full rather than being let in and cut later.',

  // ---------------------------------------------------- creating: settings
  checkInWindow:
    'How long before the start entrants must confirm they are actually there. Without '
    + 'it, round one is full of people who signed up three weeks ago and forgot. Fifteen '
    + 'minutes is the usual choice.',
  forfeitNoCheckIn:
    'Removes anybody who did not check in, when you press the close button. Nothing is '
    + 'removed automatically and nothing happens while you are not watching.',
  seedingMethod:
    'How the draw is made. Registration order rewards signing up early. Random is a '
    + 'straight shuffle. By ranking keeps the strongest entrants apart until the late '
    + 'rounds, which makes for a better final.',
  thirdPlaceMatch:
    'The two semi-final losers play each other for third. You need this if your prize '
    + 'table pays a third place, because without it nothing decides who came third.',
  bestOfMode:
    'Same length every round is simplest. Longer as it progresses means a quick first '
    + 'round and a final worth watching.',
  bestOf:
    'How many games decide a match. Best of 3 means first to two wins. Always an odd '
    + 'number, so a match cannot end level.',
  matchInterval:
    'How long players get between rounds. Too short and people are still finishing; too '
    + 'long and the day drags.',
  requireScreenshot:
    'Players attach a picture of the final screen with every result. It turns a dispute '
    + 'from an argument into a two-minute decision.',
  rosterLock:
    'When teams can stop changing their line-up. Locking at the start stops somebody '
    + 'swapping in a stronger player once they see who they are drawn against.',
  maxSubstitutes:
    'How many extra players a team may register beyond the ones who start.',
  restrictCountry:
    'Only players in this country may enter. Leave it empty to be open to everybody. '
    + 'Anybody who does not match is turned away at registration, before they pay.',
  minAge:
    'Nobody below this age may enter. It reads the date of birth on their profile, and '
    + 'somebody who has not set one is asked to before they can register.',
  requireVerifiedEmail:
    'Only accounts that have confirmed their email address may enter. It is the cheapest '
    + 'way to keep throwaway accounts out of a bracket.',
  requireKyc:
    'Only players who have verified their identity may enter. Already required '
    + 'automatically on anything that charges entry or pays a prize.',

  // --------------------------------------------------------------- money
  entryType:
    'Free means anybody can enter at no cost. Paid takes an entry fee from the player’s '
    + 'wallet when they register.',
  entryFeePrice:
    'What each entrant pays to join, in VENT COINS. It usually funds the prize pool. '
    + 'One VENT COIN is 1,000 naira.',
  prizeType:
    'Distributed splits the pot across several places. Winner takes all gives it to one '
    + 'person. No prize is for practice and for bragging rights.',
  prizeCurrency:
    'The currency you are thinking in. Whatever you pick, the amount is converted and '
    + 'paid in VENT COINS, and the converted figure is shown to you before you save.',
  prizePoolTotal:
    'The pool as you want to announce it. The per-position amounts below are what '
    + 'actually pay out, and the page tells you when the two do not match.',
  ventCoins:
    'The currency the platform runs on. One VENT COIN is 1,000 naira. Entry fees come '
    + 'out of them and prizes are paid in them.',
  walletPin:
    'Four digits, asked for whenever coins leave your wallet. It is the one thing '
    + 'between somebody who borrows your unlocked phone and your balance.',
  walletTopUp:
    'Add money by card or bank transfer through Paystack. Your card details go straight '
    + 'to Paystack and never touch V-ENT.',
  walletWithdraw:
    'Move money to a Nigerian bank account. Your identity has to be verified first - '
    + 'that is a legal requirement for paying out real money.',
  saveCard:
    'Keeps the card for next time so you do not re-enter anything. V-ENT stores a token '
    + 'from Paystack, never your card number.',
  kycVerification:
    'Confirms you are who you say you are, using an ID document. Needed before any '
    + 'withdrawal, and before entering anything that pays a prize.',

  // ------------------------------------------------------------ the bracket
  generateBracket:
    'Freezes the field and draws the matches. Registration closes at this point, so close '
    + 'check-in first if you are using it.',
  reportScore:
    'Enter the result of your match. Your opponent is asked to confirm it, and it counts '
    + 'once they do.',
  confirmScore:
    'Agree with the score your opponent reported. If it is wrong, dispute it instead - '
    + 'confirming it makes it final.',
  raiseDispute:
    'Send the match to the organiser instead of agreeing. Attach a screenshot; it is the '
    + 'difference between a decision and an argument.',
  checkInNow:
    'Confirms you are here and ready. If you do not, the organiser can remove you before '
    + 'the bracket is drawn even though you registered.',
  closeCheckIn:
    'Draws the line. Everybody who checked in stays; everybody who did not is forfeited, '
    + 'and you are shown their names before anything else happens.',
  extendCheckIn:
    'Pushes the start back fifteen minutes, and the check-in window moves with it. For '
    + 'when the day is running late.',
  distributePrizes:
    'Pays the prize pool into the winners’ wallets according to the prize table. It can '
    + 'only be done once the bracket is finished.',

  // ------------------------------------------------------------------ teams
  teamName:
    'What your team is called. It has to be unique, and it becomes part of your team’s '
    + 'web address.',
  teamGame:
    'The game this team plays. You can only be in one team per game, which stops the same '
    + 'player appearing twice in one bracket.',
  teamDescription:
    'Who you are and what you are looking for. Players reading it are deciding whether to '
    + 'ask to join.',
  allowMembershipRequests:
    'Lets players ask to join without an invitation. Turn it off and the only way in is '
    + 'an invite from you.',
  teamPassword:
    'A shared password anybody joining must type. Useful for a squad you already know. It '
    + 'is stored hashed, never in the clear.',
  transferOwnership:
    'Hands the team to another member permanently. They get every power you have and you '
    + 'do not, so this cannot be undone by you afterwards.',

  // ----------------------------------------------------------------- events
  eventType:
    'Physical is a real venue. Virtual happens online. Hybrid is both, and needs an '
    + 'address and a link.',
  ticketTier:
    'One kind of ticket - general admission, VIP, whatever you need. Each has its own '
    + 'price and its own number of places.',
  ticketQuantity:
    'How many of this ticket exist. When they are gone the tier shows as sold out rather '
    + 'than overselling the room.',
  sharedTicketing:
    'An event ticket also covers the entry fee for the tournament attached to this event, '
    + 'so nobody pays twice for the same afternoon.',
  scanTicket:
    'Reads the QR code on somebody’s ticket at the door and marks them as arrived. A '
    + 'ticket that has already been scanned is refused.',

  // -------------------------------------------------------------- community
  postVisibility:
    'Who can see this post. A club post is only visible to that club’s members.',
  clubJoin:
    'Joins the club, so its posts appear in your feed and you can post to it.',
  scrimRequest:
    'A practice match your team is offering. Another team accepts it and you arrange the '
    + 'details between you.',
  directMessages:
    'Turn this off and only people you already know can message you. It is the setting to '
    + 'reach for if strangers are a problem.',

  // --------------------------------------------------------------- profile
  gamertag:
    'The name other players know you by. It shows on your profile and in brackets.',
  mainGame:
    'The game you want to be found for. It decides which rankings you appear in.',
  gamingAccounts:
    'Your in-game name for each game. Organisers use it to find you in the lobby - '
    + 'without it somebody has to chase you before every match.',
  favouriteGames:
    'Games you play. They shape what gets suggested to you and what teams see when they '
    + 'look at your profile.',
  profileVisibility:
    'Whether people who are not signed in can see your profile. Turning it off also keeps '
    + 'it out of search results.',
  showWalletBalance:
    'Shows your VENT COINS balance on your public profile. Off by default, and there is '
    + 'rarely a good reason to change that.',

  // -------------------------------------------------------------- settings
  twoFactor:
    'Asks for a six-digit code from your phone as well as your password. Your account '
    + 'holds money, and a password on its own is thin protection for that.',
  loginAlerts:
    'Emails you whenever your account is signed into from somewhere new. It is how you '
    + 'find out about a break-in on the day rather than a month later.',
  displayLanguage:
    'Changes the whole interface immediately, with no reload, and follows you to your '
    + 'other devices. English, French and Portuguese.',
  timezone:
    'Every date and time on the site is shown in this zone, so a tournament at 8pm Lagos '
    + 'reads correctly wherever you are.',
  deactivateAccount:
    'Hides your profile and signs you out, and keeps everything. Sign in again and it is '
    + 'all as you left it.',
  deleteAccount:
    'Starts a permanent deletion. You have 30 days to change your mind by signing in; '
    + 'after that it cannot be recovered.',
  exportData:
    'Downloads everything the platform holds about you, as a file you can open. Yours to '
    + 'take whenever you want it.',
  linkedAccounts:
    'Sign in with Google, Discord or Steam instead of a password. Unlinking never deletes '
    + 'anything - it only stops that route in.',

  // ---------------------------------------------------------------- partner
  apiKey:
    'Lets a program read V-ENT data on your behalf. Shown once, at the moment it is '
    + 'created, and never again - store it somewhere safe before closing the window.',
  apiScopes:
    'Exactly what a key may read. Grant only what the integration needs; a key that can '
    + 'read everything is a key that leaks everything.',
  ssoRedirect:
    'The only address people are sent back to after signing in with V-ENT. It has to '
    + 'match exactly, which is what stops somebody redirecting your users elsewhere.',
  rateLimit:
    'How many requests a minute this key may make. Past it, requests are refused until '
    + 'the next minute.',

  // ---------------------------------------------------------------------
  // Added when the tips were placed on every control rather than only on
  // the tournament options panel, which was the one place they had reached.
  // ---------------------------------------------------------------------
  venue:
    'The address people turn up to. Only asked for when the tournament is in '
    + 'person or hybrid, and it is what somebody puts into a map.',
  virtualLink:
    'The lobby, server or voice channel players join. Share it here rather than '
    + 'chasing forty people with it on the day.',
  selectEvent:
    'Attach this tournament to one of your events. When the event has shared '
    + 'ticketing on, a ticket covers the entry fee too, so nobody pays twice for '
    + 'the same afternoon.',
  regStartDate:
    'When people can start signing up. Leave it now if you want registration '
    + 'open the moment you publish.',
  regEndDate:
    'When registration closes. It has to be on or before the start, because a '
    + 'bracket cannot be drawn while people are still joining.',
  recurring:
    'Repeat this tournament on a schedule instead of creating it again each '
    + 'week. Each run gets its own bracket and its own entrants.',
  maxCycles:
    'How many times it repeats before it stops on its own. Leave it indefinite '
    + 'and it keeps running until you end it.',
  numberOfTeams:
    'How many team slots there are. Once they are full nobody else can enter, '
    + 'and they are told so rather than being let in and cut later.',
  prizeExtras:
    'Anything that is not coins: hardware, a trophy, a slot in a bigger event. '
    + 'Write what the winner actually receives.',
  prizePlace:
    'Which finishing position this amount is paid for. First place is required; '
    + 'the rest are yours to decide.',
  teamRegion:
    'Where your team plays from. It decides which scrims and regional '
    + 'tournaments you are shown.',
  teamSocial:
    'Where people can find your team. Shown on your team page, and it is what '
    + 'organisers check before inviting you to anything.',
  teamLogo:
    'Your crest, shown beside the team name everywhere it appears. A square '
    + 'image works best because that is the shape it is drawn in.',
  teamBanner:
    'The wide image across the top of your team page.',
  topUpAmount:
    'How many VENT COINS to buy. One VENT COIN is 1,000 naira, and the naira '
    + 'total is shown before you pay.',
  withdrawAmount:
    'How many VENT COINS to turn back into naira. Your identity has to be '
    + 'verified first, because paying out real money legally requires it.',
  bankName:
    'The bank the money goes to. It has to be a Nigerian bank account in your '
    + 'own name; a payout to somebody else is refused.',
  accountNumber:
    'Your ten-digit account number. It is checked with the bank and the name '
    + 'that comes back is shown to you before anything is sent.',
  accountName:
    'The name the bank has on the account. This is read back from the bank '
    + 'rather than typed, so if it looks wrong the account number is wrong.',
  saveBank:
    'Keeps this account for next time so you do not retype it. You can remove '
    + 'it in Settings, Payments.',
  sendRecipient:
    'Who receives the coins: their username or the email they signed up with. '
    + 'Their name is shown back to you before you confirm.',
  sendMemo:
    'A short note the person sees beside the transfer. Useful when it is a '
    + 'prize, a split, or a repayment.',
  currentPin:
    'The PIN you use now. Asked for so that somebody who picks up your unlocked '
    + 'phone cannot simply set a new one.',
  confirmPin:
    'Type the new PIN again. A PIN with a typo in it locks you out of your own '
    + 'money until support resets it.',
  showPin:
    'Shows the digits while you type them. Useful on a phone, and worth turning '
    + 'off if somebody is beside you.',
  currentPassword:
    'Your password now. Asked for so a password change needs more than an open '
    + 'browser tab.',
  newPassword:
    'What you want it to be. Longer beats complicated: a phrase you can '
    + 'remember is stronger than a short word with symbols in it.',
  confirmPassword:
    'Type the new password again, so a typo does not lock you out.',
  totpCode:
    'The six-digit code from your authenticator app. It changes every thirty '
    + 'seconds, so if it is refused, wait for the next one.',
  profileFields:
    'Which parts of your profile other people can see. Everything here is off '
    + 'unless you turn it on.',
  discovery:
    'Whether search engines may list your profile. Turning it off keeps you out '
    + 'of Google as well as out of the site search.',
  notificationPrefs:
    'Which things reach you, and by which route. Security alerts cannot be '
    + 'switched off, because they are how you find out about somebody else '
    + 'signing in.',
  currencyDisplay:
    'The currency amounts are shown in. It changes only what you read; '
    + 'everything is still held and paid in VENT COINS.',
  dateFormat:
    'How dates are written on the site. Day first, or month first.',
  defaultPayment:
    'Which method is used first when you top up. You can still pick another one '
    + 'at the time.',
  savedCards:
    'Cards kept for faster top-ups. V-ENT stores a token from Paystack, never '
    + 'your card number, and you can remove one at any time.',
  savedBanks:
    'Accounts kept for faster withdrawals. Removing one here does not affect a '
    + 'payout already on its way.',
  accountEmail:
    'Where every notification, receipt and reset link goes. Changing it needs '
    + 'the new address confirmed before it takes effect.',
  fullName:
    'Your real name. Kept private, and used to check against your ID when you '
    + 'verify, so it has to match the document.',
  username:
    'How you appear everywhere on the site, and part of your profile address. '
    + 'Change it and the old address keeps working.',
  profileCompletion:
    'How much of your profile is filled in. Organisers and teams read these '
    + 'fields, so an empty profile gets fewer invitations.',
  founderBadge:
    'The mark shown on accounts that joined before launch. You can wear it or '
    + 'switch it off.',
  scrimTeam:
    'Which of your teams is playing. You can only offer a scrim for a team you '
    + 'own or captain.',
  scrimFormat:
    'The shape of the practice match: 5v5, best of three, whatever you want to '
    + 'run. The other team accepts this as written.',
  scrimRegion:
    'Where you want opponents from. Ping is a real part of practice, so a '
    + 'closer region usually plays better.',
  scrimSchedule:
    'When you want to play. Shown in the other team\'s own timezone, so nobody '
    + 'has to work it out.',
  scrimOpponent:
    'Name a team to offer it to only them. Leave it empty and any team can '
    + 'accept.',
  scrimNotes:
    'Anything the other team should know first: maps, rules, whether you are '
    + 'recording.',
  orgName:
    'The name of your organisation, shown on its page and in any link you '
    + 'share.',
  orgTag:
    'A short code for your organisation, the way a team has a tag. Three or '
    + 'four characters is usual.',
  orgLogo:
    'Shown beside the organisation name everywhere it appears.',
  orgBanner:
    'The wide image across the top of the organisation page.',
  orgBio:
    'What your organisation does and what it is looking for. Teams read this '
    + 'before asking to join.',
  orgRegion:
    'Where the organisation is based. It decides which regional listings it '
    + 'appears in.',
  partnerName:
    'The name shown to your users on the V-ENT sign-in screen, so use the name '
    + 'they know you by.',
  partnerEmail:
    'Where we write about your application, your keys, and anything that '
    + 'changes about the API.',
  partnerWebsite:
    'Where your product lives. It is the first thing checked when your '
    + 'application is reviewed.',
  partnerWhoYouAre:
    'Who is behind this. A real description gets reviewed faster than a blank '
    + 'one.',
  partnerWhatYouBuild:
    'What you want to do with the data. Ask for what you need: an application '
    + 'that asks for everything gets read more slowly.',
  partnerLegalName:
    'Your registered company name, as it appears on your incorporation '
    + 'documents.',
  partnerRegNumber:
    'Your company or registration number. Needed before any key that reads '
    + 'personal data is issued.',
  partnerPrivacyUrl:
    'Your own privacy policy. Required because your users\' data reaches you '
    + 'through this key, and they are entitled to know what happens to it.',
  partnerDataContact:
    'The person to write to about a data question or a deletion request. A '
    + 'named human, not a shared inbox that nobody reads.',
  adminTournamentFee:
    'The share V-ENT takes from each tournament entry fee, as a percentage. '
    + 'Applied at registration, not at payout.',
  adminWithdrawalFee:
    'The share taken when somebody withdraws to a bank, as a percentage. Shown '
    + 'to them before they confirm.',
  adminListingFee:
    'The share taken on a marketplace sale, as a percentage.',
  adminMinPayout:
    'The smallest withdrawal allowed, in VENT COINS. Set to cover the bank '
    + 'transfer cost, otherwise small payouts cost more than they move.',
  adminDailyCap:
    'The most one account may top up in a day, in naira. A fraud limit rather '
    + 'than a business one.',
  adminBanner:
    'A message shown across the top of the site to everybody. Use it for '
    + 'planned downtime and real incidents only.',
  adminMaintenance:
    'What people are told while the site is closed for maintenance. Write when '
    + 'it will be back, because that is the only question anybody has.',

  // The event wizard and the edit panels.
  eventName:
    'The name people see in the list and on the ticket. Something they will '
    + 'recognise on the door works better than something clever.',
  eventDescription:
    'What happens, who it is for, and what to bring. This is what somebody '
    + 'reads before deciding to buy a ticket.',
  eventGame:
    'The game this event is about, if it is about one. Leave it empty for a '
    + 'convention or a meet-up covering several.',
  eventBanner:
    'The wide image at the top of the event page, and the picture that shows '
    + 'when the link is shared.',
  eventCategory:
    'What kind of event this is: a convention, a meet-up, a LAN, a watch party. '
    + 'It decides which filter finds it.',
  eventStart:
    'When it begins. Shown to everybody in their own timezone, so a Lagos '
    + 'evening reads correctly in Luanda.',
  eventEnd:
    'When you expect it to be over. It is what tells somebody whether this '
    + 'clashes with something else they signed up for.',
  eventVenue:
    'The address people travel to. Only asked for when the event is in person '
    + 'or hybrid.',
  eventVirtualLink:
    'Where an online audience joins. Sent with the ticket rather than shown on '
    + 'the public page.',
  eventCapacity:
    'The most people who can attend. Once tickets reach it the event shows as '
    + 'full, rather than overselling the room.',
  tierName:
    'What this ticket is called: general entry, VIP, whatever you need. It is '
    + 'what the buyer sees on the door.',
  tierPrice:
    'What this ticket costs, in naira. A free event is priced at zero.',
  tierQuantity:
    'How many of this ticket exist. When they run out the tier shows as sold '
    + 'out rather than overselling the venue.',
  tierPerks:
    'What this ticket includes beyond entry: seating, merchandise, early '
    + 'access. Write what the buyer actually receives.',
  profileName:
    'The name shown on your profile, above your username. It can be your real '
    + 'name or the name you play under.',
  profileBio:
    'A few lines about you. Teams looking for players read this, so say what '
    + 'you play and what you are looking for.',
  profilePicture:
    'Your picture and the wide image behind it. Both are shown wherever your '
    + 'profile appears, including beside your name in a bracket.',
  interests:
    'What you are into beyond the games you play. It is what the platform uses '
    + 'to suggest events and clubs.',
  sponsorName:
    'The sponsor as they want to be named. It appears on your tournament page '
    + 'and in the review step before you publish.',
  sponsorUsername:
    'Their handle, so people can find them. Optional, and left blank when the '
    + 'sponsor is not on social media.',
  socialLinks:
    'Where people can find you. Shown on your profile, and it is what an '
    + 'organiser checks before inviting you to something.',

  // Score overrides, disputes, site-wide switches.
  adminMatchId:
    'The match being overridden. Find it on the bracket; changing the wrong one '
    + 'alters a result somebody already accepted.',
  adminScore:
    'The corrected score. It replaces what the players reported, and the change '
    + 'is written to the audit log with your name on it.',
  adminWinnerRegId:
    'Which registration advances. Needed because a corrected score does not by '
    + 'itself say who goes through when a match was forfeited.',
  adminReason:
    'Why you are doing this. Both players see it, and it is the record when '
    + 'somebody asks six weeks later.',
  adminDqTeam:
    'The team being removed from the tournament. They are told, and their '
    + 'remaining matches are forfeited.',
  adminFeatureFlags:
    'Turns a module on or off for everybody at once. A flag switched off hides '
    + 'the module rather than deleting anything in it.',
  adminBannerEnabled:
    'Shows the banner to every visitor, signed in or not. Off is the normal '
    + 'state.',
  adminBannerTitle:
    'The line people read first. Keep it to the fact: what is happening, not '
    + 'how sorry anybody is.',
  adminBannerType:
    'How the banner is coloured, which is how urgent it looks. Use the '
    + 'strongest one for something actually broken.',
  adminMaintenanceEnabled:
    'Closes the site to everybody except administrators. Use it for a '
    + 'migration, not for a slow afternoon.',
  screenshotUrl:
    'A link to the final scoreboard. It is what turns a disagreement into a '
    + 'two-minute decision, so attach it every time.',
  reportScoreInput:
    'The score as it finished. Your opponent is asked to confirm it, and it '
    + 'counts once they do.',
  disputeReason:
    'What actually happened, in your words. The organiser reads this beside '
    + 'whatever screenshot you attach.',
  recurrence:
    'How often this repeats: weekly, monthly, yearly. Each run gets its own '
    + 'bracket and its own entrants.',
  endCriteria:
    'When the repeating stops. Either after a set number of runs, or not until '
    + 'you end it yourself.',
  orgContactEmail:
    'Where teams and organisers write to reach you. Shown on your public '
    + 'organisation page.',
  orgLocation:
    'Where the organisation is based, as people would say it. Shown on the page '
    + 'and used in regional listings.',
  orgSocial:
    'Where people can find your organisation. Shown on its page.',
  uploadImage:
    'Choose a picture from this device. Square works for a logo and wide works '
    + 'for a banner, because those are the shapes they are drawn in.',
};

export default TIPS;
