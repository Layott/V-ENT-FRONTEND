// The name of each requirement kind, in the reader's language.
//
// One copy, read by the organiser's editor and the entrant's checklist alike.
// The server sends the English label as a fallback for anything reading the API
// directly; the pages translate by kind.

export const KIND_LABELS = {
  country: ['req.kind.country', 'Play from a particular country'],
  min_age: ['req.kind.minAge', 'Be over a minimum age'],
  verified_email: ['req.kind.verifiedEmail', 'Have a verified email address'],
  verified_identity: ['req.kind.verifiedIdentity', 'Have a verified identity'],
  profile_image: ['req.kind.profileImage', 'Have a profile picture'],
  game_account: ['req.kind.gameAccount', 'Have connected an account for this game'],
  game_details: ['req.kind.gameDetails', 'Have filled in their in-game name or UID'],
  team_logo: ['req.kind.teamLogo', 'The team has a logo'],
  social_follow: ['req.kind.socialFollow', 'Follow these accounts'],
  download: ['req.kind.download', 'Download something and give us a detail from it'],
  custom_field: ['req.kind.customField', 'Answer a question'],
  partner_verified: ['req.kind.partnerVerified', 'A partner confirms the account'],
};

export function kindLabel(tt, kind, fallback) {
  const entry = KIND_LABELS[kind];
  return entry ? tt(entry[0], entry[1]) : fallback || kind;
}
