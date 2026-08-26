// The privacy policy, in the three languages the platform is read in.
//
// Kept as data rather than as markup so the three versions cannot drift into
// different section counts, which is the usual way a translated policy ends up
// making a different promise from the original.
//
// The English is authoritative. That is not a hedge: a policy is a legal
// undertaking, and where a translation and the original disagree somebody has
// to be able to say which one binds. The note at the foot of the page says so
// in each language rather than only in English, which would be no use to the
// person it concerns.

export const POLICY_KEYS = {
  back: ['back', 'Back to V-ENT'],
  title: ['title', 'Privacy policy'],
  updated: ['updated', 'Last updated: April 2026 · Vermillion Encore (V-ENT)'],
  authoritative: [
    'authoritative',
    'This policy is written in English. The French and Portuguese versions are '
    + 'provided so it can be read, and where they differ from the English the '
    + 'English is the version that binds.',
  ],
  contactIntro: ['contactIntro', 'Questions or data requests:'],
  contactAfter: [
    'contactAfter',
    'For account-specific actions, use Settings then Danger Zone first. It is the fastest path.',
  ],
};

export const SECTIONS = [
  {
    id: 'who',
    heading: '1. Who we are',
    paragraphs: [
      'V-ENT is operated by Vermillion Encore, a company registered in Nigeria. We provide '
      + 'tournaments, events, wallet, marketplace, anime, and community features for African '
      + 'gamers and creators. References to "V-ENT", "we", "our", or "us" mean Vermillion Encore.',
    ],
  },
  {
    id: 'collect',
    heading: '2. Information we collect',
    items: [
      'Account information: email, username, full name, country, password hash.',
      'Profile information you choose to provide: avatar, banner, bio, social handles, gaming accounts.',
      'Wallet activity: top-ups, sends, withdrawals, prize payouts. Card data is handled by '
      + 'Paystack, and we do not store card numbers.',
      'Tournament and event activity: registrations, results, brackets, tickets.',
      'Device and log data: IP, device, browser, login timestamps, security events.',
      'KYC documents when you choose to verify, held in encrypted private storage.',
    ],
  },
  {
    id: 'use',
    heading: '3. How we use your data',
    items: [
      'To run the platform: host your tournaments, settle wallet transactions, deliver tickets.',
      'To detect fraud, abuse, and policy violations, including cheat detection, KYC review and payout protection.',
      'To send you transactional notifications: login alerts, registration confirmations, payouts.',
      'To send marketing only when you opt in. You can opt out at any time in Settings, then Notifications.',
      'To comply with Nigerian and African legal requirements where applicable.',
    ],
  },
  {
    id: 'sharing',
    heading: '4. Sharing',
    paragraphs: [
      'We share data with Paystack for payments, AWS for hosting and storage, AWS SES for '
      + 'transactional email, Cloudflare for DNS and edge, Sentry for error tracking, and '
      + 'PostHog for anonymised analytics. We do not sell your data. We may disclose data when '
      + 'required by law or to protect users from imminent harm.',
    ],
  },
  {
    id: 'rights',
    heading: '5. Your rights',
    paragraphs: [
      'You can edit your profile, export your wallet history, or delete your account from '
      + 'Settings, then Danger Zone. Account deletion is reversible for 14 days, then permanent. '
      + 'Some financial records are retained for tax and audit compliance even after deletion, '
      + 'as required by law.',
    ],
  },
  {
    id: 'security',
    heading: '6. Security',
    paragraphs: [
      'Passwords are hashed. Sessions are bound to device and IP. KYC documents live in private '
      + 'S3 storage with restricted IAM. Paystack handles card data on PCI-DSS-compliant '
      + 'infrastructure, and V-ENT never sees your card number.',
    ],
  },
  {
    id: 'children',
    heading: '7. Children',
    paragraphs: [
      'V-ENT is for users aged 13 and over. Wager features, when launched, require users to be '
      + '18 or over in line with Nigerian law. We will remove accounts found to be under age.',
    ],
  },
  {
    id: 'contact',
    heading: '8. Contact',
    contact: true,
  },
];

/** Every string on this page, as `key -> English`, for the dictionary. */
export const policyStrings = () => {
  const out = {};
  Object.values(POLICY_KEYS).forEach(([suffix, english]) => {
    out[`policy.${suffix}`] = english;
  });
  SECTIONS.forEach((s) => {
    out[`policy.${s.id}.heading`] = s.heading;
    (s.paragraphs || []).forEach((p, i) => { out[`policy.${s.id}.p${i}`] = p; });
    (s.items || []).forEach((p, i) => { out[`policy.${s.id}.i${i}`] = p; });
  });
  return out;
};

export default SECTIONS;
