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
};

export default TIPS;
