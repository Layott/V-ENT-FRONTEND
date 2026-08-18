// Mock data for V-ENT — used when NEXT_PUBLIC_USE_MOCK=true or when the
// backend is unreachable. All shapes follow the real API contract:
//   { status: 'success' | 'error', data: {...}, message: '...' }

// IMPORTANT: this seed must be a stable, deterministic value so server and
// client render identical strings (avoids React hydration mismatches).
// `new Date()` would re-evaluate on every module load and the server's value
// would drift from the client's by however many ms elapsed between renders.
const SEED_NOW_MS = 1735_000_000_000; // 2024-12-23T22:13:20Z — fixed forever
const now = new Date(SEED_NOW_MS);
const daysFromNow = (n) => new Date(SEED_NOW_MS + n * 86_400_000).toISOString();

const GAMES = ['EA FC 25', 'PUBG Mobile', 'Call of Duty: Warzone', 'Valorant', 'Fortnite', 'Tekken 8'];

// Game → themed image seed mapping. Used everywhere a game art ref is needed.
const GAME_SEEDS = {
  'EA FC 25': 'game-ea-fc',
  'FIFA': 'game-fifa-25',
  'PUBG Mobile': 'game-pubg',
  'Call of Duty: Warzone': 'game-cod-warzone',
  'Call of Duty Mobile': 'game-cod-mobile',
  'Valorant': 'game-valorant',
  'Fortnite': 'game-fortnite',
  'Tekken 8': 'game-tekken8',
  'Mortal Kombat 1': 'game-mk1',
  'Street Fighter 6': 'game-sf6',
  'Free Fire': 'game-free-fire',
  'Minecraft': 'game-minecraft',
  'Dota 2': 'game-dota2',
  'CS2': 'game-cs2',
  'R6 Siege': 'game-r6s',
  'Apex Legends': 'game-apex',
};
const seedForGame = (g) => GAME_SEEDS[g] || `game-${(g || 'esports').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

// Absolute placeholder URLs so that `getAbsoluteUrl` in user-profile does not
// prepend NEXT_PUBLIC_API_URL and break them. picsum.photos + pravatar are
// whitelisted in next.config.mjs.
const AVATAR_URL = 'https://i.pravatar.cc/400?img=12';
const USER_BANNER_URL = 'https://picsum.photos/seed/v-ent-banner/1200/400';

export const mockUser = {
  id: 'user_001',
  username: 'ladi_layo',
  email: 'demo@v-ent.co',
  full_name: 'Ladi Layott',
  fullname: 'Ladi Layott',
  bio: 'Competitive FIFA player. Building V-ENT.',
  description: 'Competitive FIFA player. Building V-ENT.',
  country: 'Nigeria',
  profile_picture: AVATAR_URL,
  profile_pic: AVATAR_URL,
  banner_picture: USER_BANNER_URL,
  banner: USER_BANNER_URL,
  date_joined: '2024-08-01T00:00:00Z',
  follower_count: 482,
  following_count: 73,
  favorite_games: ['FIFA', 'COD Mobile'],
  interests: ['FIFA', 'COD Mobile', 'Anime', 'AMVs'],
  // Array of { title, url } per UserProfileOverviewLeft's expected shape.
  social_links: [
    { title: 'Twitter', url: 'https://twitter.com/demo' },
    { title: 'Instagram', url: 'https://instagram.com/demo' },
    { title: 'YouTube', url: 'https://youtube.com/@demo' },
    { title: 'Twitch', url: 'https://twitch.tv/demo' },
  ],
  wallet_balance: 12_450,
  kyc_verified: true,
  rank: 142,
  penalty_point: 0,
  session_token: 'mock_session_token_demo',
};

// Tournament names — realistic, regional. Pulled per-index so each tournament
// has a unique themed banner seed.
const TOURNAMENT_NAMES = [
  'Naija FIFA Cup 26',
  'Lagos PUBG Mobile Showdown',
  'COD Warzone West Africa Open',
  'Vermillion Valorant Series',
  'Sahara Fortnite Storm',
  'Tekken 8 Lagos Throwdown',
  'Naija EA FC Champions League',
  'PUBG Mobile Continental Cup',
  'COD Mobile Pan-African Open',
  'Valorant Rising Stars Africa',
  'Fortnite Naija Battle Royale',
  'Tekken 8 King of Iron Fist NG',
];
const TOURNAMENT_GAMES = [
  'EA FC 25', 'PUBG Mobile', 'Call of Duty: Warzone', 'Valorant',
  'Fortnite', 'Tekken 8', 'EA FC 25', 'PUBG Mobile',
  'Call of Duty Mobile', 'Valorant', 'Fortnite', 'Tekken 8',
];

export const mockTournaments = Array.from({ length: 12 }).map((_, i) => {
  const game = TOURNAMENT_GAMES[i];
  return {
    id: `tmt_${1000 + i}`,
    name: TOURNAMENT_NAMES[i],
    game,
    banner_image: `https://picsum.photos/seed/${seedForGame(game)}-banner-${i}/800/400`,
    banner: `https://picsum.photos/seed/${seedForGame(game)}-banner-${i}/800/400`,
    organizer: { id: `org_${i}`, username: `org_${i}`, full_name: `Organizer ${i}` },
    start_date: daysFromNow(3 + i * 2),
    end_date: daysFromNow(5 + i * 2),
    registration_deadline: daysFromNow(2 + i),
    prize_pool: 50_000 + i * 10_000,
    prize_currency: 'VENT_COINS',
    entry_fee: i % 3 === 0 ? 0 : 500 + i * 100,
    format: i % 2 === 0 ? 'single_elimination' : 'double_elimination',
    participant_type: i % 2 === 0 ? 'team' : 'individual',
    max_participants: 32,
    current_participants: 12 + i,
    status: i < 4 ? 'upcoming' : i < 8 ? 'in_progress' : 'completed',
    description: 'A competitive V-ENT tournament featuring the best players in the region.',
    rules: '1. No toxic behaviour.\n2. Best of 3 matches.\n3. Disputes settled by admins.',
    created_at: daysFromNow(-10 - i),
  };
});

export const mockDrafts = Array.from({ length: 3 }).map((_, i) => ({
  id: `draft_${i}`,
  name: `My Draft Tournament ${i + 1}`,
  game: GAMES[i],
  updated_at: daysFromNow(-i - 1),
  progress: 60 + i * 10,
}));

// Event seeds map to themed picsum URLs (anime cons, esports finals, etc.)
const EVENT_SEEDS = [
  'evt-anime-con',
  'evt-esports-final',
  'evt-watch-party',
  'evt-cosplay-meet',
  'evt-launch-party',
  'evt-concert',
  'evt-anime-con-2',
  'evt-esports-final-2',
];
const EVENT_NAMES = [
  'Naija Anime Con 2026',
  'V-ENT Pro Cup Finals',
  'Anime Movie Night - Crimson Tide',
  'Lagos Cosplay Showcase',
  'PS5 Pro Lagos Launch',
  'Afro-Esports Beat Fest',
  'Abuja Anime Festival',
  'Vermillion Champions League Finale',
];
const EVENT_LOCATIONS = [
  'Eko Hotel & Suites, Lagos',
  'Landmark Centre, Lagos',
  'Online (Discord stage)',
  'Balmoral Hall, Lagos',
  'GameStop Flagship, Lagos',
  'Hard Rock Cafe, Lagos',
  'Transcorp Hilton, Abuja',
  'TBS Arena, Lagos',
];

export const mockEvents = Array.from({ length: 8 }).map((_, i) => ({
  id: `evt_${2000 + i}`,
  name: EVENT_NAMES[i],
  event_type: i % 3 === 0 ? 'virtual' : i % 3 === 1 ? 'physical' : 'hybrid',
  location: EVENT_LOCATIONS[i],
  banner_image: `https://picsum.photos/seed/${EVENT_SEEDS[i]}-banner/800/400`,
  banner: `https://picsum.photos/seed/${EVENT_SEEDS[i]}-banner/800/400`,
  organizer: { id: `org_${i}`, username: `evt_org_${i}`, full_name: `Event Org ${i}` },
  start_date: daysFromNow(7 + i * 3),
  end_date: daysFromNow(8 + i * 3),
  ticket_types: [
    { id: 'ga', name: 'General Admission', price: 2500, available: 200 - i * 10 },
    { id: 'vip', name: 'VIP', price: 10000, available: 50 - i * 2 },
  ],
  description: 'Come play, meet streamers, and win prizes at the biggest gaming event in Lagos.',
  status: i < 3 ? 'upcoming' : i < 6 ? 'in_progress' : 'completed',
  attendees_count: 120 + i * 40,
  linked_tournaments: i % 2 === 0 ? [`tmt_${1000 + i}`] : [],
}));

// Team names tied to a primary game so the catalog feels intentional.
const TEAM_DEFS = [
  { name: 'Crimson Cobras', tag: 'CRC', game: 'Valorant', seed: 'team-crimson-cobras-logo' },
  { name: 'Naija FC',       tag: 'NJC', game: 'EA FC 25', seed: 'team-naija-fc-logo' },
  { name: 'Apex Hunters',   tag: 'APH', game: 'PUBG Mobile', seed: 'team-apex-hunters-logo' },
  { name: 'Bloodline Squad',tag: 'BLD', game: 'Call of Duty: Warzone', seed: 'team-bloodline-logo' },
  { name: 'Iron Lions',     tag: 'IRL', game: 'PUBG Mobile', seed: 'team-iron-lions-logo' },
  { name: 'Shadow Dynasty', tag: 'SHD', game: 'Valorant', seed: 'team-shadow-dynasty-logo' },
];

export const mockTeams = TEAM_DEFS.map((t, i) => ({
  id: `team_${500 + i}`,
  name: t.name,
  tag: t.tag,
  logo: `https://picsum.photos/seed/${t.seed}/200/200`,
  banner: `https://picsum.photos/seed/${seedForGame(t.game)}-team-banner-${i}/800/240`,
  team_logo: `https://picsum.photos/seed/${t.seed}/200/200`,
  team_banner: `https://picsum.photos/seed/${seedForGame(t.game)}-team-banner-${i}/800/240`,
  game: t.game,
  bio: 'A competitive team chasing the top of the African leaderboard.',
  founded: daysFromNow(-200 - i * 50),
  owner: { id: 'user_001', username: 'ladi_layo' },
  member_count: 5 + i,
  tournaments_won: i,
  tournaments_played: 12 + i * 3,
  is_accepting_members: i % 2 === 0,
}));

export const mockBracketRounds = [
  {
    id: 'r1',
    round_number: 1,
    name: 'Round of 16',
    matches: Array.from({ length: 8 }).map((_, i) => ({
      id: `m_r1_${i}`,
      match_number: i + 1,
      status: i < 6 ? 'completed' : i === 6 ? 'in_progress' : 'upcoming',
      scheduled_at: daysFromNow(-3 + i),
      participants: [
        { id: `p_${i * 2}`, name: mockTeams[i % mockTeams.length].name, username: `player_${i * 2}`, score: i < 6 ? (i % 3) + 1 : null, is_winner: i < 6 && i % 2 === 0 },
        { id: `p_${i * 2 + 1}`, name: mockTeams[(i + 1) % mockTeams.length].name, username: `player_${i * 2 + 1}`, score: i < 6 ? (i % 2) + 2 : null, is_winner: i < 6 && i % 2 === 1 },
      ],
    })),
  },
  {
    id: 'r2',
    round_number: 2,
    name: 'Quarter-Finals',
    matches: Array.from({ length: 4 }).map((_, i) => ({
      id: `m_r2_${i}`,
      match_number: i + 1,
      status: i < 2 ? 'completed' : 'upcoming',
      scheduled_at: daysFromNow(1 + i),
      participants: [
        { id: `p_qf_${i}`, name: mockTeams[i].name, username: `qf_player_${i}`, score: i < 2 ? 2 : null, is_winner: i < 2 && i === 0 },
        { id: `p_qf_${i}_b`, name: mockTeams[(i + 3) % mockTeams.length].name, username: `qf_player_${i}_b`, score: i < 2 ? 3 : null, is_winner: i < 2 && i === 1 },
      ],
    })),
  },
  {
    id: 'r3',
    round_number: 3,
    name: 'Semi-Finals',
    matches: Array.from({ length: 2 }).map((_, i) => ({
      id: `m_r3_${i}`,
      match_number: i + 1,
      status: 'upcoming',
      scheduled_at: daysFromNow(4 + i),
      participants: [
        { id: `p_sf_${i}`, name: 'TBD', score: null },
        { id: `p_sf_${i}_b`, name: 'TBD', score: null },
      ],
    })),
  },
  {
    id: 'r4',
    round_number: 4,
    name: 'Final',
    matches: [
      {
        id: 'm_r4_0',
        match_number: 1,
        status: 'upcoming',
        scheduled_at: daysFromNow(7),
        participants: [
          { id: 'p_f_0', name: 'TBD', score: null },
          { id: 'p_f_1', name: 'TBD', score: null },
        ],
      },
    ],
  },
];

// Seed the demo user (demo@v-ent.co / mockUser) into two Round-of-16 matches so
// the CEO can drive the participant score flow end-to-end in mock mode:
//   · m_r1_7 = 'scheduled'                → demo REPORTS a score
//   · m_r1_6 = 'pending_opponent_confirm' → demo CONFIRMS the opponent's report
(() => {
  const r1 = mockBracketRounds[0];
  const demoParticipant = (score = null) => ({
    id: mockUser.id,
    name: mockUser.full_name,
    username: mockUser.username,
    profile_pic: mockUser.profile_picture,
    score,
    is_winner: false,
  });

  const scheduled = r1.matches.find((m) => m.id === 'm_r1_7');
  if (scheduled) {
    scheduled.status = 'scheduled';
    scheduled.score_p1 = null;
    scheduled.score_p2 = null;
    scheduled.participants = [
      demoParticipant(null),
      { id: 'p_opp_a', name: 'Team Nomad', username: 'nomad_gg', score: null, is_winner: false },
    ];
  }

  const pending = r1.matches.find((m) => m.id === 'm_r1_6');
  if (pending) {
    pending.status = 'pending_opponent_confirm';
    pending.score_p1 = 2;
    pending.score_p2 = 1;
    pending.participants = [
      { id: 'p_opp_b', name: 'Team Vortex', username: 'vortex_gg', score: 2, is_winner: false },
      demoParticipant(1),
    ];
  }
})();

export const mockTransactions = Array.from({ length: 14 }).map((_, i) => ({
  id: `tx_${i}`,
  reference: `REF-${10000 + i}`,
  type: ['top_up', 'tournament_fee', 'prize', 'send', 'receive', 'withdrawal', 'deduction'][i % 7],
  amount: (i % 2 === 0 ? 1 : -1) * (500 + i * 150),
  status: i % 5 === 0 ? 'pending' : i % 7 === 3 ? 'failed' : 'completed',
  description: [
    'Wallet top-up',
    'FIFA Pro Cup entry',
    'PUBG tournament prize',
    'Sent to @friend',
    'Received from @org',
    'Payout to bank',
    'Platform fee',
  ][i % 7],
  created_at: daysFromNow(-i - 1),
}));

export const mockAdminMetrics = {
  total_users: 4_812,
  active_users_30d: 1_203,
  tournaments_running: 24,
  events_upcoming: 11,
  pending_payouts: 7,
  pending_kyc: 14,
  mrr_usd: 3_120,
  wallet_volume_30d_vc: 184_200,
};

export const mockAdminUsers = Array.from({ length: 20 }).map((_, i) => ({
  id: `usr_${i}`,
  username: `user_${i}`,
  email: `user${i}@v-ent.co`,
  full_name: `Demo User ${i}`,
  date_joined: daysFromNow(-i * 5),
  is_active: i % 9 !== 0,
  role: i < 2 ? 'admin' : i < 5 ? 'organizer' : 'player',
  last_login: daysFromNow(-Math.floor(i / 2)),
}));

export const mockAdminAudit = Array.from({ length: 12 }).map((_, i) => ({
  id: `aud_${i}`,
  actor: `admin_${i % 3}`,
  action: ['user_banned', 'payout_approved', 'kyc_approved', 'tournament_refunded'][i % 4],
  target: `user_${i}`,
  created_at: daysFromNow(-i),
  metadata: { reason: 'Demo action for testing' },
}));

export const mockPayouts = Array.from({ length: 6 }).map((_, i) => ({
  id: `pay_${i}`,
  user: { username: `user_${i}`, full_name: `Demo User ${i}` },
  amount_vc: 5000 + i * 1000,
  amount_ngn: (5000 + i * 1000) * 1000,
  bank_name: ['GTBank', 'Access', 'UBA', 'Zenith'][i % 4],
  account_number: `01234567${i}0`,
  status: i < 2 ? 'pending' : i < 4 ? 'approved' : 'rejected',
  requested_at: daysFromNow(-i),
}));

export const mockKycQueue = Array.from({ length: 8 }).map((_, i) => ({
  id: `kyc_${i}`,
  user: { username: `user_${i}`, full_name: `Demo User ${i}` },
  document_type: ['national_id', 'passport', 'drivers_license'][i % 3],
  document_image: null,
  status: i < 3 ? 'pending' : i < 6 ? 'approved' : 'rejected',
  submitted_at: daysFromNow(-i),
}));

export const mockActivity = [
  { id: 1, type: 'tournament_won', title: 'Won FIFA Pro Cup 3', prize: 5000, at: daysFromNow(-1) },
  { id: 2, type: 'match_result', title: 'Beat Alpha Reapers 3–2', at: daysFromNow(-2) },
  { id: 3, type: 'team_invite', title: 'Nexus Titans invited you', at: daysFromNow(-3) },
  { id: 4, type: 'event_ticket', title: 'Booked VIP ticket — V-ENT LAN #2', at: daysFromNow(-4) },
  { id: 5, type: 'wallet_topup', title: 'Topped up 5,000 VC', at: daysFromNow(-5) },
];

// ── Production / streaming integration mock data ──
export const mockProductionClients = [
  { id: 'obs_1', name: 'OBS Studio', host: 'Studio PC', status: 'connected', latency_ms: 32 },
  { id: 'vmix', name: 'vMix', host: 'Director Laptop', status: 'connected', latency_ms: 48 },
  { id: 'sl', name: 'Streamlabs', host: 'Backup PC', status: 'disconnected', latency_ms: null },
];

export const mockOverlayTemplates = [
  {
    id: 'ovl_scoreboard',
    name: 'Scoreboard',
    description: 'Live score + round ticker anchored at the top of the stream.',
    url: 'https://overlays.v-ent.co/scoreboard/tmt_1000',
    accent: '#ED1C24',
  },
  {
    id: 'ovl_lower_third',
    name: 'Lower Third',
    description: 'Caster / player name card with team tag and country flag.',
    url: 'https://overlays.v-ent.co/lower-third/tmt_1000',
    accent: '#D4AF37',
  },
  {
    id: 'ovl_transition',
    name: 'Transition',
    description: 'Full-screen animated sting between scenes and matches.',
    url: 'https://overlays.v-ent.co/transition/tmt_1000',
    accent: '#FBC64B',
  },
  {
    id: 'ovl_intermission',
    name: 'Intermission',
    description: 'Holding screen with countdown, socials and sponsor slots.',
    url: 'https://overlays.v-ent.co/intermission/tmt_1000',
    accent: '#5a9bff',
  },
  {
    id: 'ovl_sponsor_ring',
    name: 'Sponsor Ring',
    description: 'Bottom banner cycling sponsor logos every 8 seconds.',
    url: 'https://overlays.v-ent.co/sponsor-ring/tmt_1000',
    accent: '#C084FC',
  },
];

export const mockScenes = [
  { id: 'scene_prematch', name: 'Pre-match', trigger: 'auto', last_used: daysFromNow(-0.02), icon: 'countdown' },
  { id: 'scene_match', name: 'Match', trigger: 'auto', last_used: daysFromNow(-0.005), icon: 'live' },
  { id: 'scene_break', name: 'Break / Intermission', trigger: 'manual', last_used: daysFromNow(-0.15), icon: 'pause' },
  { id: 'scene_postmatch', name: 'Post-match', trigger: 'manual', last_used: daysFromNow(-1), icon: 'trophy' },
];

export const mockDataPipeline = [
  {
    id: 'pipe_api',
    name: 'V-ENT API',
    subtitle: 'Source of truth (matches, scores, rounds)',
    payload: {
      match_id: 'm_r1_6',
      round: 4,
      map: 'Erangel',
      teams: [
        { name: 'Crimson Wolves', tag: 'CRW', score: 3 },
        { name: 'Alpha Reapers', tag: 'AR', score: 2 },
      ],
      updated_at: new Date(SEED_NOW_MS).toISOString(),
    },
  },
  {
    id: 'pipe_overlay',
    name: 'Overlay Service',
    subtitle: 'Formats payload, publishes WebSocket frames',
    payload: {
      channel: 'overlay:tmt_1000',
      event: 'score.update',
      payload: {
        home: { tag: 'CRW', score: 3, color: '#ED1C24' },
        away: { tag: 'AR', score: 2, color: '#D4AF37' },
        round: 4,
      },
      ts: SEED_NOW_MS,
    },
  },
  {
    id: 'pipe_obs',
    name: 'OBS Browser Source',
    subtitle: 'Renders overlay on the outgoing RTMP feed',
    payload: {
      browser_source: 'scoreboard.html',
      viewport: '1920x1080',
      fps: 60,
      connected_clients: 2,
      dropped_frames: 3,
    },
  },
];

// ---------- organizations ----------

const ORG_NAMES = [
  'Vermillion Encore',
  'Lagos Esports Collective',
  'Sahara Gaming Federation',
  'West Africa Pro Tour',
  'Crimson Cobra Esports',
  'Iron Tide Gaming',
];
const ORG_TAGS = ['VME', 'LEC', 'SGF', 'WAPT', 'CCE', 'ITG'];
const ORG_SEEDS = [
  'org-vermillion-encore-logo',
  'org-lagos-esports-logo',
  'org-sahara-gaming-logo',
  'org-west-africa-pro-logo',
  'org-crimson-cobra-logo',
  'org-iron-tide-logo',
];
const ORG_REGIONS = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Nigeria', 'Egypt'];
const ORG_SIZES = ['small', 'medium', 'large'];
const ORG_FOCUS = ['esports', 'events', 'streaming', 'agency', 'esports', 'events'];
const ORG_FOUNDERS = [
  ['Ladi Layott', 'Ada Okonkwo'],
  ['Tunde Bakare', 'Kemi Adeyemi'],
  ['Femi Olusegun', 'Chiamaka Eze'],
  ['Daniel Mensah', 'Aisha Bello'],
  ['Joshua Adeyemi', 'Funmi Akin'],
  ['Mariam Ibrahim', 'Tobi Adelaja'],
];
const ORG_MISSIONS = [
  'Create a sustainable esports ecosystem for African gamers — from grassroots cup to global stage.',
  'Build the largest competitive gaming community in West Africa.',
  'Empower African gaming creators with brand deals, training, and on-stage opportunities.',
  'Make Vermillion the premier home for FPS competition across the continent.',
  'Train the next generation of African esports professionals.',
  'Rise above borders. Champion the next wave of African competitive gaming.',
];
const ORG_LOCATIONS = ['Lagos, Nigeria', 'Accra, Ghana', 'Nairobi, Kenya', 'Johannesburg, SA', 'Abuja, Nigeria', 'Cairo, Egypt'];
const ORG_EMAILS = ['hello@crimson-esports.co', 'team@layogaming.com', 'studio@nexus-collective.gg', 'roster@vermillion-arena.gg', 'contact@velocity-squad.com', 'rise@phoenix-rising.gg'];
const ORG_BIOS = [
  'Africa-first esports organization scaling talent from grassroots to pro tier across FIFA and PUBG.',
  'Home of elite gamers from Lagos to Accra. Running year-round scrims, bootcamps, and sponsored events.',
  'Collective of players, creators, and coaches building the next generation of West African esports.',
  'Vermillion-backed competitive roster focused on FPS and battle-royale titles across Africa.',
  'Velocity trains squads, hosts community cups, and partners with brands that love esports.',
  'Phoenix fields rosters across mobile and console esports — we rise, and we rise together.',
];

export const mockOrganizations = Array.from({ length: 6 }).map((_, i) => ({
  id: `org_${i}`,
  name: ORG_NAMES[i],
  tag: ORG_TAGS[i],
  logo: `https://picsum.photos/seed/${ORG_SEEDS[i]}/200/200`,
  banner: `https://picsum.photos/seed/${ORG_SEEDS[i]}-banner/1200/400`,
  bio: ORG_BIOS[i],
  games: ['FIFA', 'PUBG'],
  verified: i < 3,
  size: ORG_SIZES[i % 3],
  member_count: 20 + i * 8,
  team_count: 3 + i,
  tournaments_hosted: 5 + i * 2,
  total_tournaments_hosted: 5 + i * 2,
  events_hosted: 2 + i,
  prize_pool_awarded_vc: 10_000 + i * 5_000,
  total_prize_pool: 10_000 + i * 5_000,
  // Owner: org_0 owned by demo user, others owned by other users.
  owner: i === 0
    ? { id: 'user_001', username: 'ladi_layo', full_name: 'Ladi Layott' }
    : { id: `user_owner_${i}`, username: `owner_${i}`, full_name: `Owner ${i}` },
  region: ORG_REGIONS[i],
  focus: ORG_FOCUS[i],
  founded: daysFromNow(-400 - i * 60),
  founders: ORG_FOUNDERS[i],
  mission: ORG_MISSIONS[i],
  contact_email: ORG_EMAILS[i],
  location: ORG_LOCATIONS[i],
  social_links: [
    { title: 'Twitter', url: `https://twitter.com/${ORG_TAGS[i].toLowerCase()}` },
    { title: 'Discord', url: `https://discord.gg/${ORG_TAGS[i].toLowerCase()}` },
    { title: 'YouTube', url: `https://youtube.com/@${ORG_TAGS[i].toLowerCase()}` },
  ],
}));

// Org-specific members (Owner / Admin / Manager / Member)
const ORG_MEMBER_ROLES = ['Owner', 'Admin', 'Manager', 'Member', 'Member', 'Manager', 'Member', 'Admin'];
export let mockOrgMembers = Array.from({ length: 8 }).map((_, i) => ({
  id: `orgmem_${i}`,
  org_id: 'org_0',
  user: {
    id: i === 0 ? 'user_001' : `user_${100 + i}`,
    username: i === 0 ? 'ladi_layo' : `member_${i}`,
    full_name: i === 0 ? 'Ladi Layott' : `Org Member ${i}`,
    avatar: `https://i.pravatar.cc/120?img=${40 + i}`,
  },
  role: ORG_MEMBER_ROLES[i],
  status: 'active',
  joined_at: daysFromNow(-150 - i * 20),
}));

// Pending join/apply requests
export let mockOrgJoinRequests = [
  {
    id: 'orgreq_0',
    org_id: 'org_0',
    user: {
      id: 'user_app_1',
      username: 'striker_22',
      full_name: 'Bola Oduya',
      avatar: 'https://i.pravatar.cc/120?img=12',
    },
    role: 'Member',
    status: 'pending',
    message: 'I run scrims weekly with a 4-man PUBG squad and want to grow with the org.',
    requested_at: daysFromNow(-2),
  },
  {
    id: 'orgreq_1',
    org_id: 'org_0',
    user: {
      id: 'user_app_2',
      username: 'caster_kim',
      full_name: 'Kimberly Eze',
      avatar: 'https://i.pravatar.cc/120?img=14',
    },
    role: 'Member',
    status: 'pending',
    message: 'Caster + content creator. Would love to commentate your tournaments.',
    requested_at: daysFromNow(-4),
  },
];

export const mockOrgActivity = [
  { id: 1, type: 'tournament_hosted', title: 'Hosted FIFA Pro Cup 5 — 24 teams', at: daysFromNow(-1) },
  { id: 2, type: 'team_added', title: 'Added Crimson Wolves to the roster', at: daysFromNow(-3) },
  { id: 3, type: 'prize_awarded', title: 'Awarded 15,000 VC across 3 winners', at: daysFromNow(-5) },
  { id: 4, type: 'member_joined', title: 'New Manager joined the org', at: daysFromNow(-8) },
  { id: 5, type: 'event_hosted', title: 'Hosted V-ENT Lagos LAN #3', at: daysFromNow(-14) },
];

// ---------- Marketplace (Vermillion City) ----------

const LISTING_TITLES = [
  'COD Warzone boost to Iridescent',
  'Custom Naija FC jersey design',
  'EA FC 25 coaching session',
  'Rare Fortnite OG skin account swap',
  'Commissioned anime portrait',
  'Digital Minecraft skin pack',
  'PUBG Mobile Conqueror boost',
  'Custom AMV editing',
  'Free Fire diamonds top-up',
  'Discord server banner art',
  'CS2 inventory trade',
  '1-on-1 Valorant aim training',
  'Handmade V-ENT lanyard',
  'Clan logo design package',
  'VOD review + strategy call',
  'Mobile Legends Mythic boost',
  'Streamer overlay pack',
  'PS5 tournament controller mod',
  'Gamer portrait commission',
  'Digital wallpaper bundle',
];

const LISTING_SEEDS = [
  'mkt-cod-boost', 'mkt-jersey-naija-design', 'mkt-fc-coaching', 'mkt-fortnite-account',
  'mkt-anime-portrait', 'mkt-minecraft-skin', 'mkt-pubg-boost', 'mkt-amv-editing',
  'mkt-free-fire-diamonds', 'mkt-discord-banner', 'mkt-cs2-inventory', 'mkt-valorant-aim',
  'mkt-vent-lanyard', 'mkt-clan-logo', 'mkt-vod-review', 'mkt-ml-boost',
  'mkt-overlay-pack-stream', 'mkt-ps5-mod-controller', 'mkt-gamer-portrait', 'mkt-wallpaper-bundle',
];

const LISTING_CATEGORIES = ['services', 'swaps', 'sales', 'coaching', 'art', 'digital'];
const LISTING_CONDITIONS = ['new', 'used', 'digital'];

export const mockListings = Array.from({ length: 20 }).map((_, i) => ({
  id: `lst_${i}`,
  title: LISTING_TITLES[i % LISTING_TITLES.length],
  category: LISTING_CATEGORIES[i % LISTING_CATEGORIES.length],
  price_vc: 100 + i * 50,
  condition: LISTING_CONDITIONS[i % LISTING_CONDITIONS.length],
  images: [
    `https://picsum.photos/seed/${LISTING_SEEDS[i]}/600/400`,
    `https://picsum.photos/seed/${LISTING_SEEDS[i]}-b/600/400`,
    `https://picsum.photos/seed/${LISTING_SEEDS[i]}-c/600/400`,
  ],
  seller: {
    username: `seller_${i}`,
    avatar: `https://i.pravatar.cc/120?img=${(50 + i) % 70}`,
    rating: Math.round((4.2 + Math.random() * 0.8) * 10) / 10,
    sales_count: 3 + i * 2,
  },
  description:
    'High-quality listing from a verified V-ENT seller. All orders protected by escrow — funds only release when the buyer marks the order complete. Message the seller for bespoke requests.',
  specs: [
    { label: 'Delivery', value: i % 2 === 0 ? '1–3 days' : 'Instant' },
    { label: 'Revisions', value: '2 free revisions' },
    { label: 'Region', value: 'Global' },
  ],
  reviews: Array.from({ length: 4 }).map((__, r) => ({
    id: `rv_${i}_${r}`,
    reviewer: `buyer_${r}`,
    rating: 5 - (r % 2),
    comment: 'Fast delivery, exactly as described. Would buy again!',
    at: daysFromNow(-r - 1),
  })),
  status: 'active',
  created_at: daysFromNow(-i),
  sold_count: i % 3,
}));

// ---------- Shop (V-ENT official store) ----------

const PRODUCT_NAMES = [
  'V-ENT Esports Hoodie',
  'Vermillion Crimson Tee',
  'V-ENT Laptop Skin',
  'Mousepad Pro XL',
  'V-ENT Esports Cap',
  'Naija FC Home Jersey',
  'Crimson Tide Poster Pack',
  'PS5 Pro Controller Skin',
  'V-ENT Tournament Lanyard',
  'V-ENT Sticker Set',
  'Crimson Tide Action Figure',
  'V-ENT Stream Overlay Pack',
];
const PRODUCT_SEEDS = [
  'shop-hoodie-vent',
  'shop-tshirt-vermillion',
  'shop-laptop-skin',
  'shop-mousepad-xl',
  'shop-cap-esports',
  'shop-jersey-naija-fc',
  'shop-poster-crimson-tide',
  'shop-controller-ps5',
  'shop-lanyard-vent',
  'shop-sticker-set',
  'shop-figure-crimson-tide',
  'shop-overlay-pack',
];

const PRODUCT_CATEGORIES = ['apparel', 'accessories', 'peripherals', 'anime', 'digital'];

export const mockShopProducts = Array.from({ length: 12 }).map((_, i) => ({
  id: `prd_${i}`,
  name: PRODUCT_NAMES[i % PRODUCT_NAMES.length],
  price_vc: 50 + i * 20,
  price_ngn: (50 + i * 20) * 1000,
  images: [
    `https://picsum.photos/seed/${PRODUCT_SEEDS[i]}/600/600`,
    `https://picsum.photos/seed/${PRODUCT_SEEDS[i]}-b/600/600`,
    `https://picsum.photos/seed/${PRODUCT_SEEDS[i]}-c/600/600`,
  ],
  variants: [
    { size: 'S', color: 'red', stock: 8 },
    { size: 'M', color: 'red', stock: 10 },
    { size: 'L', color: 'red', stock: 5 },
    { size: 'XL', color: 'black', stock: 3 },
  ],
  category: PRODUCT_CATEGORIES[i % PRODUCT_CATEGORIES.length],
  rating: 4.3,
  review_count: 12 + i,
  limited: i < 2,
  limited_ends_at: daysFromNow(3 + i),
  description:
    'Premium V-ENT official merchandise. Designed for players, by players. Ships across Africa. Pay in NGN or VENT COINS — members earn coins back on every qualifying purchase.',
  specs: [
    { label: 'Material', value: 'Premium cotton blend' },
    { label: 'Shipping', value: '3–5 business days' },
    { label: 'Returns', value: '14-day return policy' },
  ],
  new_drop: i >= 4 && i < 12,
  featured: i < 4,
}));

// In-memory cart. Reset on full reload. Fine for the demo flow.
export const mockCart = {
  items: [],
  discount: 0,
  shipping_estimate: 2500,
};

// ---------- Anime / Manga / AMV / Co-Read / Anime Battles ----------

const MANGA_TITLES = [
  'Crimson Tide',
  'Shadow Veil',
  'Neon Outlaws',
  'Iron Sage',
  'Blossom Bound',
  'Echo Walker',
  'Silent Crown',
  'Vermillion Sky',
  'Phantom Koi',
  'Azure Drifter',
  'Layo Chronicles',
  'Sakura Sentinel',
];

const MANGA_SEEDS = [
  'manga-shonen-cover',     // Crimson Tide (shonen)
  'manga-seinen-cover',     // Shadow Veil (seinen)
  'manga-cyberpunk-cover',  // Neon Outlaws (cyberpunk)
  'manga-mecha-cover',      // Iron Sage (mecha)
  'manga-slice-of-life-cover', // Blossom Bound
  'manga-isekai-cover',     // Echo Walker (isekai)
  'manga-fantasy-cover',    // Silent Crown
  'manga-vermillion-cover', // Vermillion Sky
  'manga-supernatural-cover', // Phantom Koi
  'manga-adventure-cover',  // Azure Drifter
  'manga-historical-cover', // Layo Chronicles
  'manga-shojo-cover',      // Sakura Sentinel
];

const MANGA_AUTHORS = [
  'Adaeze Okafor',
  'Tunde Bakare',
  'Yuki Hoshino',
  'Akari Sato',
  'Femi Olusegun',
  'Daniel Mensah',
  'Kenji Watanabe',
  'Chidi Eze',
  'Mei Nakamura',
  'Hiro Tanaka',
  'Layo Adelaja',
  'Sade Akinola',
];

const MANGA_GENRES = ['shonen', 'seinen', 'cyberpunk', 'mecha', 'slice-of-life', 'isekai', 'fantasy', 'shonen', 'supernatural', 'adventure', 'historical', 'shojo'];

export const mockManga = Array.from({ length: 18 }).map((_, i) => {
  const idx = i % MANGA_TITLES.length;
  const chapterNum = 30 + i;
  return {
    id: `mng_${i}`,
    title: MANGA_TITLES[idx],
    author: MANGA_AUTHORS[idx],
    cover: `https://picsum.photos/seed/${MANGA_SEEDS[idx]}/400/600`,
    genre: MANGA_GENRES[idx],
    chapters: chapterNum,
    rating: +(4.0 + (i % 10) / 10).toFixed(1),
    synopsis:
      'A sprawling Afro-futurist saga of steel, spirits, and street-level honour. Follow our hero as they carve a path through a city that eats the gifted alive — read now on V-ENT.',
    latest_chapter: {
      number: chapterNum,
      title: `Chapter ${chapterNum}`,
      released: daysFromNow(-i),
    },
  };
});

const AMV_SEEDS = [
  'amv-fight-1', 'amv-emotional-1', 'amv-action-1', 'amv-romance-1',
  'amv-mecha-1', 'amv-fight-2', 'amv-edit-1', 'amv-action-2',
  'amv-fight-3', 'amv-emotional-2', 'amv-edit-2', 'amv-action-3',
];

export const mockAmvs = Array.from({ length: 12 }).map((_, i) => ({
  id: `amv_${i}`,
  title: `${['Anthem', 'Nightdrive', 'Echoes', 'Blaze', 'Reverie', 'Skyfall'][i % 6]} — V-ENT AMV`,
  creator: `@editor_${i + 1}`,
  creator_avatar: `https://i.pravatar.cc/80?img=${30 + i}`,
  thumb: `https://picsum.photos/seed/${AMV_SEEDS[i]}/800/450`,
  duration: `${2 + (i % 3)}:${String(10 + i * 3).padStart(2, '0')}`,
  views: 1200 + i * 340,
  votes: 40 + i * 9,
  published: daysFromNow(-i * 2),
  tags: ['AMV', 'edit', 'MV', 'fan-made'].slice(0, (i % 3) + 2),
}));

const COREAD_ROOM_SEEDS = ['room-crimson-tide', 'room-shadow-veil', 'room-neon-outlaws', 'room-iron-sage', 'room-blossom-bound', 'room-echo-walker'];

export const mockCoReadRooms = Array.from({ length: 6 }).map((_, i) => ({
  id: `room_${i}`,
  manga: MANGA_TITLES[i % MANGA_TITLES.length],
  manga_id: `mng_${i}`,
  cover: `https://picsum.photos/seed/${COREAD_ROOM_SEEDS[i]}/400/600`,
  chapter: 20 + i,
  active_readers: 3 + (i % 5),
  host: {
    id: i === 0 ? 'user_001' : `u_${i}`,
    username: `host_${i}`,
    avatar: `https://i.pravatar.cc/80?img=${60 + i}`,
  },
  started_at: daysFromNow(-0.02 * (i + 1)),
  topic: ['Speed re-read', 'Fan theory night', 'New reader friendly', 'Arc breakdown'][i % 4],
}));

export const mockAnimeBattles = [
  {
    id: 'anime_battle_001',
    name: 'Shonen Showdown: Season 3',
    game: 'Anime Fighters Arena',
    banner: `https://picsum.photos/seed/anime-battle-shonen/1200/400`,
    status: 'in_progress',
    prize_pool: 80_000,
    prize_currency: 'VENT_COINS',
    start_date: daysFromNow(-2),
    end_date: daysFromNow(5),
    bracket_type: 'single_elimination',
    rounds: mockBracketRounds,
  },
  {
    id: 'anime_battle_002',
    name: 'Seinen Sengoku Cup',
    game: 'Blade Duel',
    banner: `https://picsum.photos/seed/anime-battle-sengoku/1200/400`,
    status: 'upcoming',
    prize_pool: 50_000,
    prize_currency: 'VENT_COINS',
    start_date: daysFromNow(6),
    end_date: daysFromNow(12),
    bracket_type: 'single_elimination',
    rounds: [],
  },
  {
    id: 'anime_battle_003',
    name: 'Isekai Invitational',
    game: 'Summon Clash',
    banner: `https://picsum.photos/seed/anime-battle-isekai/1200/400`,
    status: 'upcoming',
    prize_pool: 35_000,
    prize_currency: 'VENT_COINS',
    start_date: daysFromNow(10),
    end_date: daysFromNow(18),
    bracket_type: 'single_elimination',
    rounds: [],
  },
];

export const mockAnimeMyList = {
  saved_manga: ['mng_0', 'mng_2', 'mng_5'],
  watched_amvs: ['amv_0', 'amv_3'],
  bookmarked_rooms: ['room_0', 'room_2'],
};

export const mockAnimeChatMessages = [
  { id: 'acm_1', user: { username: 'host_0', avatar: 'https://i.pravatar.cc/60?img=60' }, text: 'Welcome everyone, chapter 20 starting now.', at: daysFromNow(-0.01) },
  { id: 'acm_2', user: { username: 'reader_14', avatar: 'https://i.pravatar.cc/60?img=14' }, text: 'Pumped for the duel reveal.', at: daysFromNow(-0.008) },
  { id: 'acm_3', user: { username: 'reader_22', avatar: 'https://i.pravatar.cc/60?img=22' }, text: 'That last panel last week was insane.', at: daysFromNow(-0.005) },
  { id: 'acm_4', user: { username: 'ladi_layo', avatar: AVATAR_URL }, text: 'Glad to be here.', at: daysFromNow(-0.002) },
];

export const mockAnimeComments = [
  { id: 'ac_1', user: { username: 'otaku_king', avatar: 'https://i.pravatar.cc/60?img=33' }, text: 'The match-cut at 1:12 is cinema.', at: daysFromNow(-1) },
  { id: 'ac_2', user: { username: 'editor_glow', avatar: 'https://i.pravatar.cc/60?img=34' }, text: 'Color grading is on another level.', at: daysFromNow(-2) },
  { id: 'ac_3', user: { username: 'anime_club_lagos', avatar: 'https://i.pravatar.cc/60?img=35' }, text: 'Sharing this to our Discord.', at: daysFromNow(-3) },
];

// ---------- Community ----------

const POST_BODIES = [
  'Just closed a clutch 1v4 — absolute heater today. GGs to everyone in lobby.',
  'Looking for a 2v2 scrim partner tonight. NG server, FIFA 24.',
  'Dropping my tournament recap later — wild final round.',
  'Anyone else think the new COD update killed movement?',
  'W stream tonight. Pulled up the grind.',
  'Recruiting for our Tekken squad — must be Blue rank or above.',
  'Hot take: bracket tournaments > round robin. Fight me in the replies.',
  'Day 4 of my PUBG ranked grind. Currently Crown II.',
  "Who's watching the Vermillion finals this weekend?",
  'Just hit Master tier in Valorant — third account. Cooking.',
];

export const mockFeedPosts = Array.from({ length: 10 }).map((_, i) => ({
  id: `p_${i}`,
  author: {
    id: `u_${i}`,
    username: `user_${i}`,
    full_name: `Gamer ${i}`,
    avatar: `https://i.pravatar.cc/100?img=${40 + i}`,
  },
  body: POST_BODIES[i % POST_BODIES.length],
  image: i % 3 === 0 ? `https://picsum.photos/seed/community-post-${seedForGame(GAMES[i % GAMES.length])}-${i}/600/400` : null,
  created_at: new Date(SEED_NOW_MS - i * 3600e3).toISOString(),
  reactions: { like: 10 + i * 3, reply: i + 1, share: i },
}));

const THREAD_CATEGORIES = ['General', 'Tournaments', 'Anime', 'Marketplace', 'Support'];
const THREAD_TITLES = [
  'Best loadout for COD Mobile season 7?',
  'Tournament bracket format — what works best?',
  'New anime season recommendations',
  'Selling a clean PS5 controller, DM if interested',
  'Cannot verify my email — help',
  'Who wants to run FIFA scrims tonight?',
  'Bug: bracket not loading on mobile',
  'AMV editing tips for beginners',
  'Looking to buy VENT COINS — safe way?',
  'Wallet top-up failed — what to do?',
  'Team recruitment — Crimson Wolves open tryouts',
  'Best anime fight scenes of all time',
];

export const mockThreads = Array.from({ length: 12 }).map((_, i) => ({
  id: `t_${i}`,
  title: THREAD_TITLES[i],
  category: THREAD_CATEGORIES[i % THREAD_CATEGORIES.length],
  author: {
    id: `u_${i}`,
    username: `user_${i}`,
    full_name: `Gamer ${i}`,
    avatar: `https://i.pravatar.cc/100?img=${20 + i}`,
  },
  body: 'Opening this thread for discussion. Drop your thoughts, clips, or questions below.',
  reply_count: 2 + (i % 7),
  last_activity: new Date(SEED_NOW_MS - i * 5400e3).toISOString(),
  unread: i % 3 === 0,
  created_at: new Date(SEED_NOW_MS - i * 86400e3).toISOString(),
}));

export const mockThreadReplies = Array.from({ length: 5 }).map((_, i) => ({
  id: `r_${i}`,
  author: {
    id: `u_${50 + i}`,
    username: `replier_${i}`,
    full_name: `Replier ${i}`,
    avatar: `https://i.pravatar.cc/100?img=${30 + i}`,
  },
  body: [
    'Agreed — same here. The last update broke my setup too.',
    'Tried this last night, works like a charm.',
    'Got a clip of something similar, will upload later.',
    "Anyone got tips on this? I'm stuck on the same problem.",
    'Mods should pin this one.',
  ][i],
  created_at: new Date(SEED_NOW_MS - (i + 1) * 1800e3).toISOString(),
}));

const CLUB_GAMES = [
  'FIFA',
  'Tekken',
  'PUBG',
  'Call of Duty',
  'Fortnite',
  'Valorant',
  'Street Fighter',
  'Apex Legends',
  'Free Fire',
];

export const mockClubs = Array.from({ length: 9 }).map((_, i) => ({
  id: `c_${i}`,
  name: `${CLUB_GAMES[i]} Nation`,
  game: CLUB_GAMES[i],
  banner: `https://picsum.photos/seed/club-${seedForGame(CLUB_GAMES[i])}-${i}/600/240`,
  members: 120 + i * 47,
  description: `The home base for every ${CLUB_GAMES[i]} player on V-ENT.`,
  joined: i % 4 === 0,
}));

export const mockConversations = Array.from({ length: 6 }).map((_, i) => ({
  id: `dm_${i}`,
  with: {
    id: `u_${100 + i}`,
    name: ['Tari K.', 'Dami O.', 'Femi A.', 'Nneka P.', 'Zee M.', 'Emeka N.'][i],
    username: ['tari_k', 'dami_o', 'femi_a', 'nneka_p', 'zee_m', 'emeka_n'][i],
    avatar: `https://i.pravatar.cc/100?img=${60 + i}`,
  },
  last_message: [
    'Scrim at 9 PM works for you?',
    'GG earlier, that last round was insane.',
    'Send the tournament link when you get a chance.',
    'Roster update pushed — check the club page.',
    'Let me know if you want to run ranked later.',
    'Got the prize payout — thanks for organizing.',
  ][i],
  time: new Date(SEED_NOW_MS - i * 1800e3).toISOString(),
  unread: i < 2,
}));

export const mockDmMessages = {
  dm_0: [
    { id: 'm_0_0', from: 'them', body: 'Yo — scrim at 9 PM works for you?', created_at: new Date(SEED_NOW_MS - 3600e3).toISOString() },
    { id: 'm_0_1', from: 'me', body: "Yeah I'm good. Best of 5?", created_at: new Date(SEED_NOW_MS - 3300e3).toISOString() },
    { id: 'm_0_2', from: 'them', body: 'Bo5 locked in. Inviting you now.', created_at: new Date(SEED_NOW_MS - 3000e3).toISOString() },
  ],
  dm_1: [
    { id: 'm_1_0', from: 'them', body: 'GG earlier, that last round was insane.', created_at: new Date(SEED_NOW_MS - 5400e3).toISOString() },
    { id: 'm_1_1', from: 'me', body: 'No cap, clutch of the year.', created_at: new Date(SEED_NOW_MS - 5100e3).toISOString() },
  ],
  dm_2: [
    { id: 'm_2_0', from: 'them', body: 'Send the tournament link when you get a chance.', created_at: new Date(SEED_NOW_MS - 7200e3).toISOString() },
  ],
  dm_3: [
    { id: 'm_3_0', from: 'them', body: 'Roster update pushed — check the club page.', created_at: new Date(SEED_NOW_MS - 9000e3).toISOString() },
    { id: 'm_3_1', from: 'me', body: 'Looks clean. Approved.', created_at: new Date(SEED_NOW_MS - 8700e3).toISOString() },
  ],
  dm_4: [
    { id: 'm_4_0', from: 'them', body: 'Let me know if you want to run ranked later.', created_at: new Date(SEED_NOW_MS - 10800e3).toISOString() },
  ],
  dm_5: [
    { id: 'm_5_0', from: 'them', body: 'Got the prize payout — thanks for organizing.', created_at: new Date(SEED_NOW_MS - 12600e3).toISOString() },
    { id: 'm_5_1', from: 'me', body: 'Respect. GG out there.', created_at: new Date(SEED_NOW_MS - 12300e3).toISOString() },
  ],
};

const SCRIM_SKILLS = ['Amateur', 'Intermediate', 'Advanced', 'Pro'];
const SCRIM_REGIONS = ['NG-West', 'NG-East', 'ZA', 'KE', 'EU-West', 'NA-East'];
const SCRIM_TEAMS = [
  'Crimson Wolves',
  'Alpha Reapers',
  'Nexus Titans',
  'Shadow Raiders',
  'Phoenix Rising',
  'Velocity Esports',
  'Iron Serpents',
  'Lagos Lions',
  'Accra Strikers',
  'Abuja Aces',
];

export const mockScrims = Array.from({ length: 10 }).map((_, i) => ({
  id: `s_${i}`,
  team: SCRIM_TEAMS[i],
  game: GAMES[i % GAMES.length],
  region: SCRIM_REGIONS[i % SCRIM_REGIONS.length],
  size: [1, 2, 3, 4, 5][i % 5],
  skill: SCRIM_SKILLS[i % SCRIM_SKILLS.length],
  time_window: new Date(SEED_NOW_MS + (i + 1) * 3600e3).toISOString(),
  status: i < 7 ? 'open' : 'matched',
}));

// ── Wager system mock data ──
const _marketTypes = [
  { type: 'moneyline', name: 'Moneyline (Winner)' },
  { type: 'spread', name: 'Map Spread' },
  { type: 'total_rounds', name: 'Total Rounds' },
  { type: 'mvp', name: 'Match MVP' },
  { type: 'first_blood', name: 'First Blood' },
  { type: 'prop', name: 'Player Prop — Kills' },
];

export const mockWagerMarkets = Array.from({ length: 12 }).map((_, i) => {
  const tournament = mockTournaments[i % mockTournaments.length];
  const teamA = mockTeams[i % mockTeams.length];
  const teamB = mockTeams[(i + 2) % mockTeams.length];
  const market = _marketTypes[i % _marketTypes.length];
  const endsAt = daysFromNow(0.5 + i * 0.25);

  let selections;
  if (market.type === 'moneyline') {
    selections = [
      { id: `sel_${i}_a`, label: teamA.name, odds: Math.round((1.70 + (i % 3) * 0.15) * 100) / 100 },
      { id: `sel_${i}_b`, label: teamB.name, odds: Math.round((2.05 + (i % 4) * 0.15) * 100) / 100 },
    ];
  } else if (market.type === 'spread') {
    selections = [
      { id: `sel_${i}_a`, label: `${teamA.tag} -1.5`, odds: 1.90 },
      { id: `sel_${i}_b`, label: `${teamB.tag} +1.5`, odds: 1.95 },
    ];
  } else if (market.type === 'total_rounds') {
    selections = [
      { id: `sel_${i}_a`, label: 'Over 26.5', odds: 1.85 },
      { id: `sel_${i}_b`, label: 'Under 26.5', odds: 1.95 },
    ];
  } else if (market.type === 'mvp') {
    selections = [
      { id: `sel_${i}_a`, label: `Player_${teamA.tag}01`, odds: 3.50 },
      { id: `sel_${i}_b`, label: `Player_${teamA.tag}02`, odds: 4.20 },
      { id: `sel_${i}_c`, label: `Player_${teamB.tag}01`, odds: 3.80 },
      { id: `sel_${i}_d`, label: `Player_${teamB.tag}02`, odds: 5.00 },
    ];
  } else if (market.type === 'first_blood') {
    selections = [
      { id: `sel_${i}_a`, label: teamA.name, odds: 1.95 },
      { id: `sel_${i}_b`, label: teamB.name, odds: 1.85 },
    ];
  } else {
    selections = [
      { id: `sel_${i}_a`, label: 'Over 18.5 kills', odds: 1.80 },
      { id: `sel_${i}_b`, label: 'Under 18.5 kills', odds: 2.00 },
    ];
  }

  return {
    id: `mkt_${3000 + i}`,
    tournament_id: tournament.id,
    tournament_name: tournament.name,
    match_id: `mat_${i}`,
    match_label: `${teamA.name} vs ${teamB.name}`,
    team_a: { name: teamA.name, tag: teamA.tag, logo: teamA.logo },
    team_b: { name: teamB.name, tag: teamB.tag, logo: teamB.logo },
    market_type: market.type,
    market_name: market.name,
    selections,
    ends_at: endsAt,
    status: 'open',
    game: tournament.game,
  };
});

export const mockMyBets = [
  ...Array.from({ length: 5 }).map((_, i) => {
    const m = mockWagerMarkets[i];
    const sel = m.selections[i % m.selections.length];
    const stake = 500 + i * 250;
    return {
      id: `bet_${9000 + i}`,
      market_id: m.id,
      market_name: m.market_name,
      match_label: m.match_label,
      tournament_name: m.tournament_name,
      selection_id: sel.id,
      selection_label: sel.label,
      odds: sel.odds,
      stake,
      potential_payout: Math.round(stake * sel.odds),
      status: 'active',
      placed_at: daysFromNow(-0.5 + i * 0.1),
      settles_at: m.ends_at,
      cashable: i < 3,
      cash_out_value: Math.round(stake * 1.1),
    };
  }),
  ...Array.from({ length: 10 }).map((_, i) => {
    const m = mockWagerMarkets[(i + 5) % mockWagerMarkets.length];
    const sel = m.selections[i % m.selections.length];
    const stake = 300 + i * 150;
    const won = i % 3 !== 0;
    return {
      id: `bet_${8000 + i}`,
      market_id: m.id,
      market_name: m.market_name,
      match_label: m.match_label,
      tournament_name: m.tournament_name,
      selection_id: sel.id,
      selection_label: sel.label,
      odds: sel.odds,
      stake,
      potential_payout: Math.round(stake * sel.odds),
      status: won ? 'won' : 'lost',
      result: won ? 'win' : 'loss',
      payout: won ? Math.round(stake * sel.odds) : 0,
      placed_at: daysFromNow(-5 - i),
      settled_at: daysFromNow(-4 - i),
    };
  }),
];

export const mockLeaderboard = Array.from({ length: 10 }).map((_, i) => ({
  rank: i + 1,
  username: ['fury_king', 'reaper_x', 'shadow_ace', 'neon_wolf', 'crimson_ace',
    'ghost_zero', 'viper_prime', 'nova_clash', 'alpha_bolt', 'void_striker'][i],
  winnings_vc: 50_000 - i * 3_500,
  bets_won: 42 - i * 2,
  bets_placed: 60 - i,
  win_rate: Math.round((100 - i * 5) * 10) / 10,
}));

// ── Ticketing mock data ──
export const mockTicketTypes = [
  { id: 'ga', name: 'General Admission', price: 2500, available: 200, description: 'Standing area access, all-day entry.' },
  { id: 'vip', name: 'VIP', price: 10000, available: 50, description: 'Front-row seats, welcome drink, fast-track entry.' },
  { id: 'backstage', name: 'Backstage Pass', price: 25000, available: 10, description: 'Meet the teams, backstage tour, exclusive merch.' },
];

export const mockTickets = [
  {
    id: 'tkt_7001',
    event_id: 'evt_2000',
    event_name: 'V-ENT LAN Event #1',
    event_date: daysFromNow(7),
    location: 'Landmark Centre, Lagos',
    tier: 'VIP',
    price: 10000,
    qr_code: 'VENT-TKT-7001-VIP',
    attendee_name: 'Ladi Layott',
    attendee_email: 'demo@v-ent.co',
    status: 'active',
    purchased_at: daysFromNow(-3),
  },
  {
    id: 'tkt_7002',
    event_id: 'evt_2001',
    event_name: 'V-ENT LAN Event #2',
    event_date: daysFromNow(10),
    location: 'Online',
    tier: 'General Admission',
    price: 2500,
    qr_code: 'VENT-TKT-7002-GA',
    attendee_name: 'Ladi Layott',
    attendee_email: 'demo@v-ent.co',
    status: 'active',
    purchased_at: daysFromNow(-1),
  },
  {
    id: 'tkt_7003',
    event_id: 'evt_2002',
    event_name: 'V-ENT LAN Event #3',
    event_date: daysFromNow(14),
    location: 'Landmark Centre, Lagos',
    tier: 'Backstage Pass',
    price: 25000,
    qr_code: 'VENT-TKT-7003-BP',
    attendee_name: 'Ladi Layott',
    attendee_email: 'demo@v-ent.co',
    status: 'active',
    purchased_at: daysFromNow(-0.5),
  },
];

// ── Vendor shop mock data ──
const VENDOR_SEEDS = [
  'vendor-red-samurai-apparel',
  'vendor-neon-anime-prints',
  'vendor-gamer-fuel-drinks',
  'vendor-pixelforge-peripherals',
  'vendor-manga-corner',
  'vendor-cosplay-atelier',
];
const VENDOR_PRODUCT_SEEDS = [
  'shop-tshirt-fifa', 'shop-poster-onepiece', 'shop-hoodie-vent', 'shop-mousepad-xl',
  'shop-collector-cup', 'shop-keychain-demon-slayer',
];

export const mockVendors = Array.from({ length: 6 }).map((_, i) => ({
  id: `vnd_${i}`,
  event_id: 'evt_2000',
  name: ['Red Samurai Apparel', 'Neon Anime Prints', 'Gamer Fuel Drinks',
    'PixelForge Peripherals', 'Manga Corner', 'Cosplay Atelier'][i],
  booth: `B-${10 + i}`,
  description: 'Curated drops and exclusive merch only available at V-ENT events. Limited stock, on-site pickup.',
  banner: `https://picsum.photos/seed/${VENDOR_SEEDS[i]}-banner/1200/360`,
  logo: `https://picsum.photos/seed/${VENDOR_SEEDS[i]}-logo/150/150`,
  category: ['Apparel', 'Prints', 'Food & Drink', 'Hardware', 'Books', 'Cosplay'][i],
  total_sales_vc: 18_000 - i * 2_400,
  orders: 48 - i * 5,
  commission_pct: 10 + (i % 3) * 2,
  status: i < 5 ? 'active' : 'paused',
  products: Array.from({ length: 6 }).map((__, p) => ({
    id: `prd_${i}_${p}`,
    name: ['Limited Tee', 'Poster Bundle', 'Signed Hoodie', 'Mousepad XL',
      'Collector Cup', 'Event Keychain'][p],
    price: 1500 + p * 800,
    image: `https://picsum.photos/seed/${VENDOR_PRODUCT_SEEDS[p]}-${i}/400/400`,
    in_stock: (p + i) % 4 !== 3,
  })),
}));

/* ==========================================================================
 * EXTENDED ENTITIES (parallel-build mock layer v2)
 * --------------------------------------------------------------------------
 * Below are richer, more varied entities for every module so parallel UI
 * rebuilds have realistic data. Keep these `let`-bound where mutation
 * matters so handlers can persist within-session changes.
 * ==========================================================================
 */

const _hoursAgo = (h) => new Date(now.getTime() - h * 3600_000).toISOString();
const _monthsAgo = (m) => new Date(now.getTime() - m * 30 * 86_400_000).toISOString();

// ── Wallet: extended transactions (25+ across 6 months) ───────────────────
const _txTypes = ['top_up', 'deduction', 'prize', 'send', 'receive', 'withdrawal', 'refund'];
const _txDescriptions = {
  top_up: 'Wallet top-up via Paystack',
  deduction: 'Tournament entry fee — FIFA Pro Cup',
  prize: 'Tournament prize — PUBG Sundown Cup',
  send: 'Sent to @reaper_x',
  receive: 'Received from @org_crimson',
  withdrawal: 'Withdrawal to GTBank ****0192',
  refund: 'Refund — cancelled match',
};

export let mockTransactionsExtended = Array.from({ length: 28 }).map((_, i) => {
  const type = _txTypes[i % _txTypes.length];
  const isCredit = ['top_up', 'prize', 'receive', 'refund'].includes(type);
  const amount = (isCredit ? 1 : -1) * (250 + (i % 12) * 350);
  const monthsBack = (i / 5) | 0;
  return {
    id: `txx_${i}`,
    reference: `VC-${20000 + i}`,
    type,
    amount,
    amount_vc: amount,
    amount_ngn: Math.abs(amount) * 1000,
    status: i % 11 === 0 ? 'pending' : i % 13 === 5 ? 'failed' : 'completed',
    description: _txDescriptions[type],
    counterparty: isCredit ? 'V-ENT Treasury' : 'V-ENT Treasury',
    method: type === 'top_up' ? 'paystack' : type === 'withdrawal' ? 'bank_transfer' : 'wallet_internal',
    balance_after: 12450 + i * 50,
    created_at: new Date(now.getTime() - monthsBack * 30 * 86_400_000 - i * 86_400_000).toISOString(),
  };
});

export let mockWithdrawalRequests = [
  {
    id: 'wdr_1',
    user: { id: mockUser.id, username: mockUser.username },
    amount_vc: 8000,
    amount_ngn: 8_000_000,
    bank_name: 'GTBank',
    account_number: '0123456789',
    account_name: 'Ladi Layott',
    status: 'pending',
    requested_at: daysFromNow(-1),
    note: 'First withdrawal of the month',
  },
  {
    id: 'wdr_2',
    user: { id: mockUser.id, username: mockUser.username },
    amount_vc: 3500,
    amount_ngn: 3_500_000,
    bank_name: 'Access Bank',
    account_number: '0234567891',
    account_name: 'Ladi Layott',
    status: 'pending',
    requested_at: daysFromNow(-2.5),
    note: '',
  },
  {
    id: 'wdr_3',
    user: { id: mockUser.id, username: mockUser.username },
    amount_vc: 12000,
    amount_ngn: 12_000_000,
    bank_name: 'UBA',
    account_number: '0345678912',
    account_name: 'Ladi Layott',
    status: 'pending',
    requested_at: daysFromNow(-4),
    note: 'Tournament prize cashout',
  },
];

export const mockKycStatus = {
  user_id: mockUser.id,
  status: 'verified',
  level: 2,
  document_type: 'national_id',
  document_url: 'https://picsum.photos/seed/kyc-doc/600/400',
  submitted_at: daysFromNow(-30),
  approved_at: daysFromNow(-28),
  approved_by: 'admin_1',
  monthly_limit_vc: 50000,
  daily_limit_vc: 10000,
};

// ── Organizations: 8 expanded orgs ────────────────────────────────────────
const _orgFullNames = [
  'Vermillion Encore', 'Lagos Esports Collective', 'Sahara Gaming Federation',
  'Naija Anime Society', 'West Africa Pro Tour', 'Crimson Cobra Esports',
  'Iron Tide Gaming', 'Stardust Productions',
];
const _orgTags = ['VME', 'LEC', 'SGF', 'NAS', 'WAPT', 'CCE', 'ITG', 'SDP'];
const _orgExtSeeds = [
  'org-vermillion-encore-logo',
  'org-lagos-esports-logo',
  'org-sahara-gaming-logo',
  'org-naija-anime-society-logo',
  'org-west-africa-pro-logo',
  'org-crimson-cobra-logo',
  'org-iron-tide-logo',
  'org-stardust-productions-logo',
];

export let mockOrganizationsExtended = Array.from({ length: 8 }).map((_, i) => ({
  id: `orgx_${i}`,
  name: _orgFullNames[i],
  tag: _orgTags[i],
  logo: `https://picsum.photos/seed/${_orgExtSeeds[i]}/240/240`,
  banner: `https://picsum.photos/seed/${_orgExtSeeds[i]}-banner/1200/400`,
  bio: `${_orgFullNames[i]} is a competitive esports collective building rosters across Africa. We run tournaments, scout talent, and partner with brands.`,
  description: `Founded in 202${i % 4}, ${_orgFullNames[i]} fields rosters across FIFA, COD Mobile, PUBG and Valorant.`,
  verified: i < 5,
  owner: {
    id: i === 0 ? mockUser.id : `user_owner_${i}`,
    username: i === 0 ? mockUser.username : `owner_${i}`,
    full_name: i === 0 ? mockUser.full_name : `Org Owner ${i}`,
    avatar: i === 0 ? mockUser.profile_picture : `https://i.pravatar.cc/200?img=${60 + i}`,
  },
  members: Array.from({ length: 6 + i }).map((__, m) => ({
    id: `orgxmem_${i}_${m}`,
    user: {
      id: m === 0 && i === 0 ? mockUser.id : `user_${i * 100 + m}`,
      username: m === 0 && i === 0 ? mockUser.username : `mem_${i}_${m}`,
      full_name: m === 0 && i === 0 ? mockUser.full_name : `Member ${m + 1}`,
      avatar: `https://i.pravatar.cc/120?img=${40 + (i * 6 + m) % 30}`,
    },
    role: m === 0 ? 'owner' : m === 1 ? 'admin' : 'member',
    joined_at: daysFromNow(-150 - m * 20),
  })),
  teams: mockTeams.slice(0, 2 + (i % 3)).map((t) => t.id),
  tournaments: mockTournaments.slice(0, 3 + (i % 4)).map((t) => t.id),
  events: mockEvents.slice(0, 2 + (i % 3)).map((e) => e.id),
  region: ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Nigeria', 'Ghana', 'Kenya'][i],
  founded: daysFromNow(-400 - i * 60),
  stats: {
    total_members: 25 + i * 8,
    total_tournaments_hosted: 5 + i * 2,
    total_prize_pool: 50_000 + i * 25_000,
    total_events_hosted: 2 + i,
    total_followers: 1200 + i * 340,
  },
  social_links: [
    { title: 'Twitter', url: `https://twitter.com/${_orgTags[i].toLowerCase()}` },
    { title: 'Discord', url: `https://discord.gg/${_orgTags[i].toLowerCase()}` },
    { title: 'YouTube', url: `https://youtube.com/@${_orgTags[i].toLowerCase()}` },
  ],
  created_at: daysFromNow(-400 - i * 60),
}));

// ── Shop products v2: 42 products across Apparel / Gaming Gear / Anime Merch
// / Digital Goods / VC Packs. Each entry hand-crafted with thematic image
// seeds so we never fall back to generic placeholders.
const _shopCategories = ['Apparel', 'Gaming Gear', 'Anime Merch', 'Digital Goods', 'VC Pack'];

const _SHOP_DEFS = [
  // ── Apparel (8) ─────────────────────────────────────────────────────────
  { name: 'V-ENT Esports Hoodie 2026', category: 'Apparel', seeds: ['shop-hoodie-vent', 'shop-hoodie-vent-back', 'shop-hoodie-vent-detail'], price_ngn: 28_000, tags: ['hoodie', 'streetwear', 'official'], variants: 'apparel', sale: false },
  { name: 'Vermillion Crimson Tee',   category: 'Apparel', seeds: ['shop-tshirt-vermillion', 'shop-tshirt-vermillion-back'],                price_ngn: 12_500, tags: ['tee', 'streetwear', 'official'], variants: 'apparel', sale: true },
  { name: 'EA FC 25 Player Tee',      category: 'Apparel', seeds: ['shop-tshirt-fifa', 'shop-tshirt-fifa-2', 'shop-tshirt-fifa-3'],          price_ngn: 11_000, tags: ['tee', 'fifa', 'football'], variants: 'apparel', sale: false },
  { name: 'V-ENT Esports Cap',        category: 'Apparel', seeds: ['shop-cap-esports', 'shop-cap-esports-side'],                              price_ngn: 8_500,  tags: ['cap', 'snapback', 'official'], variants: 'cap', sale: false },
  { name: 'Naija FC Home Jersey 26',  category: 'Apparel', seeds: ['shop-jersey-naija-fc', 'shop-jersey-naija-fc-back'],                      price_ngn: 22_000, tags: ['jersey', 'team', 'naija-fc'], variants: 'apparel', sale: false },
  { name: 'Crimson Cobras Pro Jersey',category: 'Apparel', seeds: ['shop-jersey-crimson-cobras', 'shop-jersey-crimson-cobras-back'],          price_ngn: 24_500, tags: ['jersey', 'team', 'crimson-cobras', 'valorant'], variants: 'apparel', sale: true },
  { name: 'Iron Lions PUBG Jersey',   category: 'Apparel', seeds: ['shop-jersey-iron-lions', 'shop-jersey-iron-lions-back'],                  price_ngn: 23_000, tags: ['jersey', 'team', 'iron-lions', 'pubg'], variants: 'apparel', sale: false },
  { name: 'V-ENT Dark Mode Hoodie',   category: 'Apparel', seeds: ['shop-hoodie-dark', 'shop-hoodie-dark-back', 'shop-hoodie-dark-zip'],      price_ngn: 30_500, tags: ['hoodie', 'streetwear', 'limited'], variants: 'apparel', sale: false },

  // ── Gaming Gear (8) ─────────────────────────────────────────────────────
  { name: 'V-ENT Pro Headset (HyperSound)', category: 'Gaming Gear', seeds: ['shop-headset-pro', 'shop-headset-pro-side', 'shop-headset-pro-stand'], price_ngn: 75_000, tags: ['hardware', 'audio', 'tournament'], variants: 'gear', sale: false },
  { name: 'PS5 DualSense Pro Controller',   category: 'Gaming Gear', seeds: ['shop-controller-ps5', 'shop-controller-ps5-back'],                        price_ngn: 95_000, tags: ['hardware', 'controller', 'ps5'], variants: 'gear-platform', sale: true },
  { name: 'V-ENT Mechanical Keyboard 75%',  category: 'Gaming Gear', seeds: ['shop-keyboard-mech', 'shop-keyboard-mech-side'],                          price_ngn: 88_000, tags: ['hardware', 'keyboard', 'mechanical'], variants: 'gear-switch', sale: false },
  { name: 'Crimson RGB Gaming Mouse',       category: 'Gaming Gear', seeds: ['shop-mouse-rgb', 'shop-mouse-rgb-back', 'shop-mouse-rgb-side'],            price_ngn: 38_000, tags: ['hardware', 'mouse', 'rgb'], variants: 'gear', sale: false },
  { name: 'V-ENT XL Mousepad',              category: 'Gaming Gear', seeds: ['shop-mousepad-xl', 'shop-mousepad-xl-stitch'],                            price_ngn: 14_000, tags: ['hardware', 'mousepad', 'xl'], variants: '', sale: false },
  { name: 'Pro Player Gaming Chair',        category: 'Gaming Gear', seeds: ['shop-chair-gaming', 'shop-chair-gaming-side', 'shop-chair-gaming-back'],  price_ngn: 220_000, tags: ['hardware', 'chair', 'comfort'], variants: 'gear', sale: true },
  { name: 'V-ENT 27" 240Hz Gaming Monitor', category: 'Gaming Gear', seeds: ['shop-monitor-240hz', 'shop-monitor-240hz-back'],                          price_ngn: 320_000, tags: ['hardware', 'monitor', 'tournament'], variants: '', sale: false },
  { name: 'Stream Capture Card 4K60',       category: 'Gaming Gear', seeds: ['shop-capture-card', 'shop-capture-card-port'],                            price_ngn: 65_000, tags: ['hardware', 'capture', 'streaming'], variants: '', sale: false },

  // ── Anime Merch (8) ─────────────────────────────────────────────────────
  { name: 'Crimson Tide Action Figure',     category: 'Anime Merch', seeds: ['shop-figure-crimson-tide', 'shop-figure-crimson-tide-2'],                   price_ngn: 42_000, tags: ['figure', 'collector', 'anime'], variants: '', sale: false },
  { name: 'Shadow Veil Premium Figure',     category: 'Anime Merch', seeds: ['shop-figure-shadow-veil', 'shop-figure-shadow-veil-2', 'shop-figure-shadow-veil-3'], price_ngn: 58_000, tags: ['figure', 'limited', 'anime'], variants: '', sale: true },
  { name: 'Neon Outlaws Wall Poster Set',   category: 'Anime Merch', seeds: ['shop-poster-neon-outlaws', 'shop-poster-neon-outlaws-2'],                  price_ngn: 9_500,  tags: ['poster', 'wall-art', 'anime'], variants: '', sale: false },
  { name: 'Iron Sage Keychain Bundle',      category: 'Anime Merch', seeds: ['shop-keychain-iron-sage', 'shop-keychain-iron-sage-pack'],                 price_ngn: 6_500,  tags: ['keychain', 'collector', 'anime'], variants: '', sale: false },
  { name: 'Blossom Bound Plush 30cm',       category: 'Anime Merch', seeds: ['shop-plush-blossom', 'shop-plush-blossom-back'],                           price_ngn: 18_000, tags: ['plush', 'cute', 'anime'], variants: '', sale: false },
  { name: 'V-ENT TCG Booster Pack',         category: 'Anime Merch', seeds: ['shop-tcg-pack', 'shop-tcg-pack-cards'],                                    price_ngn: 5_000,  tags: ['tcg', 'cards', 'collector'], variants: '', sale: true },
  { name: 'Echo Walker Manga Box Set',      category: 'Anime Merch', seeds: ['shop-manga-echo-walker', 'shop-manga-echo-walker-spine', 'shop-manga-echo-walker-vol1'], price_ngn: 35_000, tags: ['manga', 'box-set', 'collector'], variants: '', sale: false },
  { name: 'Silent Crown Cosplay Mask',      category: 'Anime Merch', seeds: ['shop-cosplay-silent-crown', 'shop-cosplay-silent-crown-side'],             price_ngn: 16_500, tags: ['cosplay', 'mask', 'anime'], variants: '', sale: false },

  // ── Digital Goods (8) ───────────────────────────────────────────────────
  { name: 'COD Warzone Skin Bundle - Crimson', category: 'Digital Goods', seeds: ['shop-skin-cod', 'shop-skin-cod-preview'],                              price_ngn: 12_000, tags: ['skin', 'cod', 'instant'], variants: 'platform', sale: false },
  { name: 'Fortnite Emote Bundle - Naija Wave', category: 'Digital Goods', seeds: ['shop-emote-fortnite', 'shop-emote-fortnite-preview'],                 price_ngn: 7_500,  tags: ['emote', 'fortnite', 'instant'], variants: 'platform', sale: true },
  { name: 'EA FC 25 Coin Bundle - 250k',        category: 'Digital Goods', seeds: ['shop-bundle-fifa-coins', 'shop-bundle-fifa-coins-preview'],            price_ngn: 18_500, tags: ['coins', 'fifa', 'instant'], variants: 'platform', sale: false },
  { name: 'PUBG Mobile Premium Loot Box',       category: 'Digital Goods', seeds: ['shop-loot-box-pubg', 'shop-loot-box-pubg-preview'],                    price_ngn: 6_000,  tags: ['loot-box', 'pubg', 'instant'], variants: '', sale: false },
  { name: 'Valorant Character Pass - Volume 5', category: 'Digital Goods', seeds: ['shop-character-pass-valorant', 'shop-character-pass-valorant-preview'],price_ngn: 9_000,  tags: ['battle-pass', 'valorant', 'instant'], variants: '', sale: false },
  { name: 'Tekken 8 Season Pass',               category: 'Digital Goods', seeds: ['shop-season-pass-tekken', 'shop-season-pass-tekken-preview'],          price_ngn: 22_000, tags: ['season-pass', 'tekken', 'instant'], variants: '', sale: false },
  { name: 'Apex Legends Skin Bundle - Phantom',  category: 'Digital Goods', seeds: ['shop-skin-apex', 'shop-skin-apex-preview'],                            price_ngn: 11_500, tags: ['skin', 'apex', 'instant'], variants: 'platform', sale: true },
  { name: 'V-ENT Stream Overlay Pack',          category: 'Digital Goods', seeds: ['shop-overlay-pack', 'shop-overlay-pack-preview', 'shop-overlay-pack-detail'], price_ngn: 9_500,  tags: ['overlay', 'stream', 'instant'], variants: '', sale: false },

  // ── VC Packs (6) — sells V-ENT internal currency in tiered bonus structure
  { name: 'VENT COIN Starter Pack — 1k',  category: 'VC Pack', seeds: ['shop-vc-1k', 'shop-vc-1k-stack'],   price_ngn: 1_000_000, tags: ['vc-pack', 'currency'], variants: '', sale: false, vc_amount: 1_000,   vc_bonus: 0 },
  { name: 'VENT COIN Booster — 5k',        category: 'VC Pack', seeds: ['shop-vc-5k', 'shop-vc-5k-stack'],   price_ngn: 5_000_000, tags: ['vc-pack', 'currency', 'bonus'], variants: '', sale: false, vc_amount: 5_000,   vc_bonus: 250 },
  { name: 'VENT COIN Pro — 10k',           category: 'VC Pack', seeds: ['shop-vc-10k', 'shop-vc-10k-stack'], price_ngn: 10_000_000, tags: ['vc-pack', 'currency', 'bonus'], variants: '', sale: false, vc_amount: 10_000,  vc_bonus: 750 },
  { name: 'VENT COIN Elite — 25k',         category: 'VC Pack', seeds: ['shop-vc-25k', 'shop-vc-25k-stack'], price_ngn: 25_000_000, tags: ['vc-pack', 'currency', 'bonus'], variants: '', sale: false, vc_amount: 25_000,  vc_bonus: 2_000 },
  { name: 'VENT COIN Champion — 50k',      category: 'VC Pack', seeds: ['shop-vc-50k', 'shop-vc-50k-stack'], price_ngn: 50_000_000, tags: ['vc-pack', 'currency', 'bonus'], variants: '', sale: false, vc_amount: 50_000,  vc_bonus: 5_000 },
  { name: 'VENT COIN Legend — 100k',       category: 'VC Pack', seeds: ['shop-vc-100k', 'shop-vc-100k-stack'], price_ngn: 100_000_000, tags: ['vc-pack', 'currency', 'bonus', 'best-value'], variants: '', sale: false, vc_amount: 100_000, vc_bonus: 12_500 },

  // ── Featured / On-Sale cross-category drops (4) ─────────────────────────
  { name: 'Crimson Cobras Tournament Bundle',     category: 'Apparel',      seeds: ['shop-bundle-cobras', 'shop-bundle-cobras-2', 'shop-bundle-cobras-3'], price_ngn: 45_000, tags: ['bundle', 'team', 'limited', 'featured'], variants: 'apparel', sale: true },
  { name: 'V-ENT Pro Streamer Starter Kit',       category: 'Gaming Gear',  seeds: ['shop-bundle-streamer', 'shop-bundle-streamer-2'],                    price_ngn: 195_000, tags: ['bundle', 'streaming', 'pro', 'featured'], variants: 'gear', sale: true },
  { name: 'Crimson Tide Collector Edition',       category: 'Anime Merch',  seeds: ['shop-bundle-crimson-tide', 'shop-bundle-crimson-tide-2'],            price_ngn: 88_000, tags: ['bundle', 'limited', 'collector', 'featured'], variants: '', sale: true },
  { name: 'V-ENT Naija Pride Limited Drop',       category: 'Apparel',      seeds: ['shop-naija-pride-tee', 'shop-naija-pride-tee-back'],                  price_ngn: 16_500, tags: ['tee', 'limited', 'naija', 'featured'], variants: 'apparel', sale: true },
];

const _shopDescriptions = {
  Apparel: 'Premium V-ENT branded apparel — designed in Lagos, made for African gamers. Soft cotton-blend fabric, screen-printed graphics, ships continent-wide.',
  'Gaming Gear': 'Tournament-grade gaming hardware tested by the V-ENT pro roster. Low latency, premium build quality, 12-month warranty included.',
  'Anime Merch': 'Officially licensed V-ENT anime merchandise — collector-grade detail, limited print runs. Ships continent-wide with V-ENT escrow protection.',
  'Digital Goods': 'Instant digital delivery via your linked V-ENT account. Skins, emotes and passes redeem within seconds — no shipping required.',
  'VC Pack': 'Top up your V-ENT wallet with VENT COINS. Use for tournament entries, marketplace purchases, ticketing and gifting. Bonus VC stacked on every tier above 1k.',
};

const _shopVariants = (kind, hasSale) => {
  if (kind === 'apparel') {
    return [
      { id: 'v_s', size: 'S',  color: 'red',   stock: 8 },
      { id: 'v_m', size: 'M',  color: 'red',   stock: 12 },
      { id: 'v_l', size: 'L',  color: 'red',   stock: 6 },
      { id: 'v_xl', size: 'XL', color: 'black', stock: 4 },
      { id: 'v_xxl', size: 'XXL', color: 'black', stock: 3 },
    ];
  }
  if (kind === 'cap') {
    return [
      { id: 'v_one_red',   size: 'One Size', color: 'red',   stock: 15 },
      { id: 'v_one_black', size: 'One Size', color: 'black', stock: 12 },
    ];
  }
  if (kind === 'gear') {
    return [
      { id: 'v_red',   color: 'red',   stock: 12 },
      { id: 'v_black', color: 'black', stock: 18 },
    ];
  }
  if (kind === 'gear-platform') {
    return [
      { id: 'v_ps5',    platform: 'PS5',  stock: 14 },
      { id: 'v_xbox',   platform: 'Xbox', stock: 10 },
    ];
  }
  if (kind === 'gear-switch') {
    return [
      { id: 'v_brown', switch: 'Cherry MX Brown', stock: 9 },
      { id: 'v_red',   switch: 'Cherry MX Red',   stock: 8 },
      { id: 'v_blue',  switch: 'Cherry MX Blue',  stock: 6 },
    ];
  }
  if (kind === 'platform') {
    return [
      { id: 'v_pc',   platform: 'PC',   stock: 999 },
      { id: 'v_ps5',  platform: 'PS5',  stock: 999 },
      { id: 'v_xbox', platform: 'Xbox', stock: 999 },
    ];
  }
  return [];
};

// 1 NGN = 1 VC for shop pricing parity (matches existing test data — wallet
// pricing already uses this 1:1 split everywhere).
const _ngnToVc = (ngn) => Math.round(ngn / 1000);

export let mockProducts = _SHOP_DEFS.map((def, i) => {
  const price_vc = _ngnToVc(def.price_ngn);
  const sale_price = def.sale ? Math.round(price_vc * 0.75) : null;
  const isVcPack = def.category === 'VC Pack';
  return {
    id: `prdx_${i}`,
    name: def.name,
    description: isVcPack
      ? `${def.name} — instant top-up to your V-ENT wallet. Receive ${def.vc_amount.toLocaleString()} VC${def.vc_bonus ? ` plus a ${def.vc_bonus.toLocaleString()} VC bonus` : ''} the moment payment confirms.`
      : `${def.name} — ${_shopDescriptions[def.category]}`,
    category: def.category,
    price_vent_coins: price_vc,
    price_ngn: def.price_ngn,
    sale_price,
    stock: isVcPack ? 9999 : 50 - (i % 12) * 3,
    images: def.seeds.map((s) => `https://picsum.photos/seed/${s}/600/600`),
    variants: _shopVariants(def.variants, !!sale_price),
    tags: def.tags,
    in_stock: isVcPack ? true : (i % 12) < 11,
    featured: i < 4 || def.sale,
    new_drop: i >= 36,
    is_vc_pack: isVcPack,
    vc_amount: def.vc_amount || null,
    vc_bonus: def.vc_bonus || 0,
    rating: Math.round((4.0 + (i % 10) / 10) * 10) / 10,
    review_count: 4 + (i * 3) % 60,
    created_at: daysFromNow(-i * 2),
  };
});

// ── Shop orders: 8 orders mixing statuses ─────────────────────────────────
const _orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export let mockOrders = Array.from({ length: 8 }).map((_, i) => {
  const itemsCount = 1 + (i % 3);
  const items = Array.from({ length: itemsCount }).map((_, n) => {
    const p = mockProducts[(i * 3 + n) % mockProducts.length];
    return {
      id: `oitem_${i}_${n}`,
      product_id: p.id,
      product_name: p.name,
      product_image: p.images[0],
      qty: 1 + (n % 2),
      unit_price_vc: p.sale_price || p.price_vent_coins,
      variant: p.variants[0] || null,
    };
  });
  const subtotal = items.reduce((s, it) => s + it.unit_price_vc * it.qty, 0);
  const shipping = 5;
  return {
    id: `ord_${i}`,
    order_number: `VENT-${100000 + i}`,
    user: { id: mockUser.id, username: mockUser.username },
    items,
    subtotal_vc: subtotal,
    shipping_vc: shipping,
    total_vc: subtotal + shipping,
    delivery_address: {
      full_name: 'Ladi Layott',
      phone: '+234 800 000 0000',
      street: `${10 + i} V-ENT Avenue`,
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      postal_code: '100001',
    },
    payment_method: i % 2 === 0 ? 'wallet' : 'paystack',
    status: _orderStatuses[i % _orderStatuses.length],
    tracking_url: i < 4 ? `https://track.v-ent.co/${100000 + i}` : null,
    estimated_delivery: daysFromNow(3 + i),
    placed_at: daysFromNow(-i * 2),
    created_at: daysFromNow(-i * 2),
  };
});

// ── Marketplace listings v2 (32 listings) — six themed categories ────────
// Each entry hand-crafted with realistic title, condition, specs, location,
// and themed image seeds (no generic placeholders).
const _LISTING_DEFS = [
  // ── Gaming Hardware (6) ───────────────────────────────────────────────
  { title: 'PS5 Slim 1TB — barely used',           cat: 'Gaming Hardware', condition: 'like_new', price_vc: 220, seeds: ['mkt-ps5-slim', 'mkt-ps5-slim-side', 'mkt-ps5-slim-controller', 'mkt-ps5-slim-box', 'mkt-ps5-slim-cables'], specs: { brand: 'Sony', model: 'PS5 Slim 1TB', warranty: '6 months remaining', region: 'PAL' }, seller: 'gadget_king_lagos', loc: 'Lagos', isHot: true },
  { title: 'Xbox Series X 1TB - sealed import',     cat: 'Gaming Hardware', condition: 'new',      price_vc: 280, seeds: ['mkt-xbox-series-x', 'mkt-xbox-series-x-side', 'mkt-xbox-series-x-box', 'mkt-xbox-series-x-controller'], specs: { brand: 'Microsoft', model: 'Xbox Series X 1TB', warranty: '12 months', region: 'PAL' }, seller: 'rig_god_naija', loc: 'Abuja', isHot: false },
  { title: 'Razer DeathAdder V3 Pro - mint',        cat: 'Gaming Hardware', condition: 'like_new', price_vc: 65,  seeds: ['mkt-razer-mouse', 'mkt-razer-mouse-2', 'mkt-razer-mouse-3'],                                              specs: { brand: 'Razer', model: 'DeathAdder V3 Pro', warranty: 'Manufacturer 18 months', region: 'Global' }, seller: 'rig_god_naija', loc: 'Lagos', isHot: false },
  { title: 'Keychron K2 75% mech keyboard',          cat: 'Gaming Hardware', condition: 'good',     price_vc: 75,  seeds: ['mkt-keyboard-keychron', 'mkt-keyboard-keychron-side', 'mkt-keyboard-keychron-keys'],                     specs: { brand: 'Keychron', model: 'K2 75%', layout: '75%', switches: 'Cherry MX Brown', region: 'Global' }, seller: 'keys_for_clout', loc: 'Lagos', isHot: false },
  { title: 'LG UltraGear 27" 240Hz monitor',         cat: 'Gaming Hardware', condition: 'like_new', price_vc: 220, seeds: ['mkt-monitor-lg', 'mkt-monitor-lg-back', 'mkt-monitor-lg-stand'],                                          specs: { brand: 'LG', model: 'UltraGear 27GR75Q', resolution: '1440p', refresh: '240Hz', region: 'Global' }, seller: 'pixel_traders', loc: 'Port Harcourt', isHot: true },
  { title: 'HyperX Cloud II Wireless headset',       cat: 'Gaming Hardware', condition: 'good',     price_vc: 70,  seeds: ['mkt-headset-hyperx', 'mkt-headset-hyperx-side', 'mkt-headset-hyperx-stand'],                              specs: { brand: 'HyperX', model: 'Cloud II Wireless', battery: '30hrs', region: 'Global' }, seller: 'audio_drop', loc: 'Ibadan', isHot: false },

  // ── Apparel (5) ────────────────────────────────────────────────────────
  { title: 'Custom Naija FC home jersey - signed',   cat: 'Apparel', condition: 'new',      price_vc: 95,  seeds: ['mkt-jersey-naija-signed', 'mkt-jersey-naija-signed-back', 'mkt-jersey-naija-signed-tag'], specs: { brand: 'Naija FC', size: 'M / L / XL', material: 'Polyester blend', region: 'NG/GH/KE' }, seller: 'jersey_lab_lagos', loc: 'Lagos', isHot: true },
  { title: 'Crimson Cobras signed snapback',         cat: 'Apparel', condition: 'like_new', price_vc: 38,  seeds: ['mkt-cap-cobras-signed', 'mkt-cap-cobras-signed-side'],                                  specs: { brand: 'Crimson Cobras', size: 'One size', material: 'Cotton twill', region: 'Global' }, seller: 'cobras_official_store', loc: 'Lagos', isHot: false },
  { title: 'V-ENT founder edition hoodie - vintage', cat: 'Apparel', condition: 'good',     price_vc: 55,  seeds: ['mkt-hoodie-vintage', 'mkt-hoodie-vintage-back', 'mkt-hoodie-vintage-detail'],            specs: { brand: 'V-ENT', size: 'L', material: 'Cotton blend', release: '2024 founder drop' }, seller: 'vermillion_archive', loc: 'Lagos', isHot: false },
  { title: 'Iron Lions PUBG retro jersey',           cat: 'Apparel', condition: 'fair',     price_vc: 28,  seeds: ['mkt-jersey-iron-lions-retro', 'mkt-jersey-iron-lions-retro-back'],                       specs: { brand: 'Iron Lions', size: 'L', material: 'Polyester', release: 'PUBG Open 2024' }, seller: 'lan_resale', loc: 'Abuja', isHot: false },
  { title: 'Naija Anime Con 2024 limited tee',       cat: 'Apparel', condition: 'like_new', price_vc: 32,  seeds: ['mkt-tshirt-anime-con', 'mkt-tshirt-anime-con-back'],                                     specs: { brand: 'Naija Anime Con', size: 'M', material: 'Combed cotton', release: '2024 limited' }, seller: 'aniplex_collector', loc: 'Lagos', isHot: true },

  // ── Collectibles (6) ───────────────────────────────────────────────────
  { title: 'Crimson Tide signed manga vol.1',        cat: 'Collectibles', condition: 'like_new', price_vc: 110, seeds: ['mkt-manga-signed-1', 'mkt-manga-signed-2', 'mkt-manga-signed-3', 'mkt-manga-signed-4'], specs: { type: 'Manga', edition: 'Signed 1st print', condition_note: 'Slipcase intact', region: 'Global' }, seller: 'manga_archive_ng', loc: 'Lagos', isHot: true },
  { title: 'Pokemon TCG booster box - sealed',       cat: 'Collectibles', condition: 'new',      price_vc: 180, seeds: ['mkt-tcg-pokemon-box', 'mkt-tcg-pokemon-box-2', 'mkt-tcg-pokemon-box-cards'],            specs: { type: 'Pokemon TCG', set: 'Scarlet & Violet', sealed: true, region: 'Global' }, seller: 'tcg_traders_naija', loc: 'Lagos', isHot: true },
  { title: 'Yu-Gi-Oh Legendary Decks bundle',        cat: 'Collectibles', condition: 'good',     price_vc: 95,  seeds: ['mkt-tcg-yugioh', 'mkt-tcg-yugioh-2', 'mkt-tcg-yugioh-3'],                                 specs: { type: 'Yu-Gi-Oh TCG', sets: 'Legendary Decks I + II', condition_note: 'Slight box wear', region: 'Global' }, seller: 'tcg_traders_naija', loc: 'Abuja', isHot: false },
  { title: 'Magic the Gathering rare set',           cat: 'Collectibles', condition: 'like_new', price_vc: 145, seeds: ['mkt-tcg-mtg', 'mkt-tcg-mtg-2', 'mkt-tcg-mtg-rare'],                                       specs: { type: 'MTG', set: 'Modern Horizons 3', sealed: false, region: 'Global' }, seller: 'planeswalker_lagos', loc: 'Lagos', isHot: false },
  { title: 'Retro PS2 console + 6 games',            cat: 'Collectibles', condition: 'good',     price_vc: 90,  seeds: ['mkt-ps2-retro', 'mkt-ps2-retro-2', 'mkt-ps2-retro-games', 'mkt-ps2-retro-controller'],   specs: { brand: 'Sony', model: 'PS2 Slim', includes: '6 games + 2 controllers', region: 'PAL' }, seller: 'retro_naija', loc: 'Ibadan', isHot: false },
  { title: 'Shadow Veil 1/7 scale figure',           cat: 'Collectibles', condition: 'new',      price_vc: 165, seeds: ['mkt-figure-shadow-veil', 'mkt-figure-shadow-veil-2', 'mkt-figure-shadow-veil-3'],         specs: { type: 'Anime figure', scale: '1/7', edition: 'V-ENT exclusive', region: 'Global' }, seller: 'aniplex_collector', loc: 'Lagos', isHot: true },

  // ── Tickets (4) ────────────────────────────────────────────────────────
  { title: 'V-ENT Pro Cup Finals - VIP ticket',      cat: 'Tickets', condition: 'new', price_vc: 180, seeds: ['mkt-ticket-vent-finals', 'mkt-ticket-vent-finals-stage'], specs: { event: 'V-ENT Pro Cup Finals', tier: 'VIP', date: '2026-06-14', city: 'Lagos' }, seller: 'lan_resale', loc: 'Lagos', isHot: true },
  { title: 'Naija Anime Con 2026 - 3-day badge',     cat: 'Tickets', condition: 'new', price_vc: 95,  seeds: ['mkt-ticket-anime-con', 'mkt-ticket-anime-con-badge'],     specs: { event: 'Naija Anime Con 2026', tier: '3-day Standard', date: '2026-09-12', city: 'Lagos' }, seller: 'anime_con_resale', loc: 'Lagos', isHot: true },
  { title: 'Afro-Esports Beat Fest - GA ticket',     cat: 'Tickets', condition: 'new', price_vc: 60,  seeds: ['mkt-ticket-beat-fest', 'mkt-ticket-beat-fest-stage'],     specs: { event: 'Afro-Esports Beat Fest', tier: 'General Admission', date: '2026-07-22', city: 'Lagos' }, seller: 'concert_link', loc: 'Lagos', isHot: false },
  { title: 'Lagos Cosplay Showcase - VIP pass',      cat: 'Tickets', condition: 'new', price_vc: 75,  seeds: ['mkt-ticket-cosplay', 'mkt-ticket-cosplay-pass'],          specs: { event: 'Lagos Cosplay Showcase', tier: 'VIP', date: '2026-08-10', city: 'Lagos' }, seller: 'cosplay_atelier', loc: 'Lagos', isHot: false },

  // ── Services (6) ───────────────────────────────────────────────────────
  { title: 'EA FC 25 1-on-1 coaching - 3 sessions',  cat: 'Services', condition: 'new', price_vc: 80,  seeds: ['mkt-service-fc-coaching', 'mkt-service-fc-coaching-2'],     specs: { service: 'Coaching', game: 'EA FC 25', sessions: '3 × 90 min', platform: 'Discord', region: 'Global' }, seller: 'fifa_coach_jay', loc: 'Online', isHot: false },
  { title: 'Valorant aim training program',          cat: 'Services', condition: 'new', price_vc: 95,  seeds: ['mkt-service-valorant-coach', 'mkt-service-valorant-coach-2'], specs: { service: 'Coaching', game: 'Valorant', sessions: '5 × 60 min', platform: 'Discord', region: 'Global' }, seller: 'aim_lab_pro', loc: 'Online', isHot: true },
  { title: 'COD Warzone team training - bootcamp',   cat: 'Services', condition: 'new', price_vc: 240, seeds: ['mkt-service-cod-team', 'mkt-service-cod-team-2'],             specs: { service: 'Team training', game: 'COD Warzone', sessions: '4 days', platform: 'Discord + LAN', region: 'NG/GH/KE' }, seller: 'cod_pro_camp', loc: 'Lagos', isHot: false },
  { title: 'Cosplay armor commission - EVA + worbla',cat: 'Services', condition: 'new', price_vc: 320, seeds: ['mkt-service-cosplay-armor', 'mkt-service-cosplay-armor-2', 'mkt-service-cosplay-armor-3'], specs: { service: 'Cosplay commission', material: 'EVA foam + worbla', timeline: '6-8 weeks', region: 'Global' }, seller: 'cos_armor_co', loc: 'Lagos', isHot: false },
  { title: 'Twitch overlay package - custom',        cat: 'Services', condition: 'new', price_vc: 110, seeds: ['mkt-service-overlay', 'mkt-service-overlay-2', 'mkt-service-overlay-3'],                          specs: { service: 'Overlay pack', includes: 'Cam, alerts, transitions', revisions: '3', region: 'Global' }, seller: 'overlay_studio', loc: 'Online', isHot: false },
  { title: 'YouTube content editing - 5 videos',     cat: 'Services', condition: 'new', price_vc: 180, seeds: ['mkt-service-content', 'mkt-service-content-2'],                                                  specs: { service: 'Video editing', deliverables: '5 × 8-10 min videos', revisions: '2', region: 'Global' }, seller: 'creator_dojo', loc: 'Online', isHot: false },

  // ── Digital (5) ────────────────────────────────────────────────────────
  { title: 'Rare Fortnite OG account - 200 skins',   cat: 'Digital', condition: 'new', price_vc: 380, seeds: ['mkt-digital-fortnite-acc', 'mkt-digital-fortnite-acc-2', 'mkt-digital-fortnite-acc-locker'], specs: { type: 'Fortnite account', skins: '200+', battle_pass: 'Chapter 1-5 complete', region: 'Global' }, seller: 'rare_locker', loc: 'Online', isHot: true },
  { title: 'Valorant rare skin bundle - account',    cat: 'Digital', condition: 'new', price_vc: 220, seeds: ['mkt-digital-valorant-acc', 'mkt-digital-valorant-acc-2'],                                       specs: { type: 'Valorant account', region: 'EU', vp: '15,000', radianite: '8,000' }, seller: 'rare_locker', loc: 'Online', isHot: false },
  { title: 'Steam gift card - $50',                   cat: 'Digital', condition: 'new', price_vc: 75,  seeds: ['mkt-digital-steam-card', 'mkt-digital-steam-card-2'],                                            specs: { type: 'Gift card', platform: 'Steam', value: '$50 USD', region: 'Global (USD)' }, seller: 'gift_card_pro', loc: 'Online', isHot: false },
  { title: 'PSN gift card - $25',                     cat: 'Digital', condition: 'new', price_vc: 40,  seeds: ['mkt-digital-psn-card', 'mkt-digital-psn-card-2'],                                                specs: { type: 'Gift card', platform: 'PlayStation Network', value: '$25 USD', region: 'US PSN' }, seller: 'gift_card_pro', loc: 'Online', isHot: false },
  { title: 'Xbox Live gift card - $30',               cat: 'Digital', condition: 'new', price_vc: 48,  seeds: ['mkt-digital-xbox-card', 'mkt-digital-xbox-card-2'],                                              specs: { type: 'Gift card', platform: 'Xbox Live', value: '$30 USD', region: 'US' }, seller: 'gift_card_pro', loc: 'Online', isHot: false },
];

const _CITY_LIST = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Online'];

export let mockListingsV2 = _LISTING_DEFS.map((def, i) => {
  const isOwn = i === 0;
  const seller_username = def.seller || `seller_${i}`;
  const status = i < _LISTING_DEFS.length - 4 ? 'active' : i < _LISTING_DEFS.length - 2 ? 'sold' : 'expired';
  const cat = def.cat;
  return {
    id: `lstx_${i}`,
    title: def.title,
    description: `${def.title} — verified seller listing. All sales protected by V-ENT escrow. Funds release on buyer confirmation.

Includes detailed authentication, original packaging where applicable, and full V-ENT buyer protection. Ships within 24 hours of order confirmation.`,
    category: cat,
    condition: def.condition,
    price_vc: def.price_vc,
    price_vent_coins: def.price_vc, // backward compat
    price_ngn: def.price_vc * 1000,
    shipping_cost_vc: cat === 'Services' || cat === 'Digital' ? 0 : 25 + (i % 4) * 10,
    images: def.seeds.map((s) => `https://picsum.photos/seed/${s}/800/600`),
    seller: {
      user_id: isOwn ? mockUser.id : `user_seller_${i}`,
      id: isOwn ? mockUser.id : `user_seller_${i}`,
      username: isOwn ? mockUser.username : seller_username,
      profile_pic: isOwn ? mockUser.profile_picture : `https://i.pravatar.cc/120?img=${(20 + i) % 70}`,
      avatar: isOwn ? mockUser.profile_picture : `https://i.pravatar.cc/120?img=${(20 + i) % 70}`,
      seller_rating: Math.round((4.2 + (i % 8) / 10) * 10) / 10,
      rating: Math.round((4.2 + (i % 8) / 10) * 10) / 10,
      total_sales: 5 + i * 4,
      sales_count: 5 + i * 4,
      // Spread the three primary badges across listings.
      badges: i % 3 === 0
        ? ['Verified Seller', 'Top Rated']
        : i % 3 === 1
          ? ['Verified Seller', 'Fast Shipper']
          : ['Verified Seller'],
      verified: i % 4 !== 3,
      bio: 'Verified V-ENT seller. Fast shipping, escrow-protected.',
      country: ['Lagos, Nigeria', 'Accra, Ghana', 'Nairobi, Kenya', 'Abuja, Nigeria'][i % 4],
      joined_at: daysFromNow(-300 - i * 10),
    },
    stock: 1 + (i % 4),
    views: 80 + i * 23,
    likes: 4 + i * 2,
    status,
    location: def.loc || _CITY_LIST[i % _CITY_LIST.length],
    delivery: i % 3 === 0 ? 'pickup_only' : i % 3 === 1 ? 'shipping' : 'both',
    delivery_label: i % 3 === 0 ? 'Pickup only' : i % 3 === 1 ? 'Ships nationwide' : 'Pickup or shipping',
    specs: def.specs || {},
    featured: i < 6,
    is_hot: !!def.isHot,
    ending_at: daysFromNow(1 + (i % 7)),
    is_ending_soon: i % 4 === 1,
    created_at: daysFromNow(-i * 3),
    updated_at: daysFromNow(-i * 2),
    sold_count: i % 3,
    reviews: Array.from({ length: 3 }).map((__, r) => ({
      id: `rvx_${i}_${r}`,
      reviewer: `buyer_${r + (i % 5)}`,
      rating: 5 - (r % 2),
      comment: [
        'Smooth transaction, exactly as described. Will buy again.',
        'Fast escrow release. Item in great condition.',
        'Communication was top notch. Recommended seller.',
      ][r % 3],
      created_at: daysFromNow(-(r + 1) * 4),
    })),
  };
});

// Watchlist — IDs of listings the current user has hearted.
export let mockMarketWatchlist = ['lstx_1', 'lstx_5'];

// Offers — pending make-offer requests from buyers.
export let mockMarketOffers = Array.from({ length: 3 }).map((_, i) => ({
  id: `offer_${i}`,
  listing_id: mockListingsV2[i].id,
  buyer: { id: `user_offerer_${i}`, username: `bidder_${i}` },
  amount_vc: Math.round(mockListingsV2[i].price_vc * (0.7 + 0.05 * i)),
  message: 'Will pay this much, ready to escrow now.',
  status: 'pending',
  created_at: daysFromNow(-i),
}));

// ── Marketplace purchases ─────────────────────────────────────────────────
const _purchaseStatuses = ['escrow', 'delivered', 'completed', 'disputed', 'refunded', 'completed'];

export let mockPurchases = Array.from({ length: 6 }).map((_, i) => ({
  id: `pur_${i}`,
  listing: mockListingsV2[i],
  buyer: { id: mockUser.id, username: mockUser.username },
  seller: mockListingsV2[i].seller,
  price_vc: mockListingsV2[i].price_vent_coins,
  qty: 1,
  status: _purchaseStatuses[i],
  escrow_release_at: daysFromNow(7 - i),
  tracking_number: i % 2 === 0 ? `VC-TRK-${10000 + i}` : null,
  dispute_reason: i === 3 ? 'Item not as described' : null,
  refund_amount_vc: i === 4 ? mockListingsV2[i].price_vent_coins : 0,
  created_at: daysFromNow(-5 - i),
}));

// ── Manga series v2 with chapters ─────────────────────────────────────────
const _mangaTitlesV2 = [
  'Crimson Tide', 'Shadow Veil', 'Neon Outlaws', 'Iron Sage',
  'Blossom Bound', 'Echo Walker', 'Silent Crown', 'Vermillion Sky',
  'Phantom Koi', 'Azure Drifter', 'Layo Chronicles', 'Sakura Sentinel',
];
const _mangaSeedsV2 = [
  'manga-shonen-cover', 'manga-seinen-cover', 'manga-cyberpunk-cover', 'manga-mecha-cover',
  'manga-slice-of-life-cover', 'manga-isekai-cover', 'manga-fantasy-cover', 'manga-vermillion-cover',
  'manga-supernatural-cover', 'manga-adventure-cover', 'manga-historical-cover', 'manga-shojo-cover',
];
const _mangaAuthorsV2 = [
  'Adaeze Okafor', 'Tunde Bakare', 'Yuki Hoshino', 'Akari Sato',
  'Femi Olusegun', 'Daniel Mensah', 'Kenji Watanabe', 'Chidi Eze',
  'Mei Nakamura', 'Hiro Tanaka', 'Layo Adelaja', 'Sade Akinola',
];
const _mangaArtistsV2 = [
  'Bola Akin', 'Sade Onyeka', 'Ren Kobayashi', 'Yua Mori',
  'Tobi Olawale', 'Aisha Ahmed', 'Sora Ito', 'Folake Bello',
  'Haruki Sato', 'Naomi Adeyemi', 'Kemi Adelaja', 'Hana Watanabe',
];
const _mangaGenresV2 = [
  ['shonen', 'action'], ['seinen', 'drama'], ['cyberpunk', 'action'],
  ['mecha', 'sci-fi'], ['slice-of-life', 'romance'], ['isekai', 'adventure'],
  ['fantasy', 'mystery'], ['supernatural', 'mystery'], ['supernatural', 'horror'],
  ['adventure', 'comedy'], ['historical', 'samurai'], ['shojo', 'romance'],
];
const _mangaStatuses = ['ongoing', 'completed', 'hiatus'];

export let mockMangaSeries = _mangaTitlesV2.map((title, i) => ({
  id: `mngx_${i}`,
  title,
  cover: `https://picsum.photos/seed/${_mangaSeedsV2[i]}/400/600`,
  banner: `https://picsum.photos/seed/${_mangaSeedsV2[i]}-banner/1200/300`,
  genres: _mangaGenresV2[i],
  description: `${title} — an Afro-futurist saga of grit, honour and ancient power. Read every chapter on V-ENT Anime, drop your theories in co-read rooms.`,
  status: _mangaStatuses[i % _mangaStatuses.length],
  total_chapters: 12 + i * 2,
  author: _mangaAuthorsV2[i],
  artist: _mangaArtistsV2[i],
  rating: Math.round((4.0 + (i % 10) / 10) * 10) / 10,
  views: 5000 + i * 1300,
  likes: 200 + i * 50,
  bookmarks: 80 + i * 20,
  user_progress: i < 6 ? { last_chapter: 3 + (i % 5), last_page: 8 + (i * 3) % 15 } : null,
  latest_chapter_at: daysFromNow(-i),
  created_at: daysFromNow(-300 - i * 30),
}));

export let mockChapters = mockMangaSeries.flatMap((series) =>
  Array.from({ length: 6 }).map((_, c) => ({
    id: `chp_${series.id}_${c + 1}`,
    series_id: series.id,
    series_title: series.title,
    number: c + 1,
    title: `Chapter ${c + 1} — ${['Awakening', 'The Descent', 'Crimson Path', 'Blade Calls', 'Shadow Pact', 'The Reckoning'][c]}`,
    page_urls: Array.from({ length: 15 + c * 2 }).map(
      (__, p) => `https://picsum.photos/seed/manga-page-${series.id}-c${c + 1}-p${p + 1}/700/1000`
    ),
    page_count: 15 + c * 2,
    published_at: daysFromNow(-(30 - c * 5)),
    views: 800 + c * 200,
  }))
);

// ── AMVs v2 (18 AMVs) ─────────────────────────────────────────────────────
const _amvTitlesV2 = [
  'Anthem', 'Nightdrive', 'Echoes', 'Blaze', 'Reverie', 'Skyfall',
  'Liminal', 'Apex Pulse', 'Crimson Surge', 'Phoenix Cry', 'Eclipse Run', 'Final Form',
  'Storm Bringer', 'Last Dance', 'Hollow Bones', 'Neon Heart', 'Devotion', 'Ascend',
];
const _amvSeedsV2 = [
  'amv-fight-1', 'amv-emotional-1', 'amv-action-1', 'amv-romance-1',
  'amv-mecha-1', 'amv-fight-2', 'amv-edit-1', 'amv-action-2',
  'amv-fight-3', 'amv-emotional-2', 'amv-edit-2', 'amv-action-3',
  'amv-fight-4', 'amv-emotional-3', 'amv-action-4', 'amv-romance-2',
  'amv-edit-3', 'amv-mecha-2',
];
const _amvHandlesV2 = [
  'crimson_edits', 'naija_amv', 'shadow_cut', 'sahara_edits',
  'lagos_loop', 'phoenix_amv', 'iron_cut', 'midnight_edits',
  'eclipse_lab', 'aurora_amv', 'pulse_studio', 'vermillion_cut',
  'storm_edits', 'echo_amv', 'silent_cut', 'kinetic_amv',
  'devotion_lab', 'ascend_edits',
];

export let mockAmvsV2 = Array.from({ length: 18 }).map((_, i) => ({
  id: `amvx_${i}`,
  title: `${_amvTitlesV2[i]} — AMV`,
  description: `An emotional ${_amvTitlesV2[i].toLowerCase()} edit cut to a banger. Hand-edited frame-by-frame.`,
  uploader: {
    id: `editor_${i}`,
    username: `@${_amvHandlesV2[i]}`,
    profile_pic: `https://i.pravatar.cc/120?img=${30 + (i % 30)}`,
    follower_count: 200 + i * 50,
  },
  video_url: `https://www.youtube.com/embed/dQw4w9WgXcQ?placeholder=${i}`,
  thumbnail: `https://picsum.photos/seed/${_amvSeedsV2[i]}/800/450`,
  tags: ['AMV', 'MV', 'edit', 'fan-made', 'anime'].slice(0, 2 + (i % 3)),
  views: 1500 + i * 420,
  likes: 80 + i * 17,
  comments_count: 12 + i * 3,
  duration: `${2 + (i % 4)}:${String(10 + i * 3).padStart(2, '0')}`,
  duration_seconds: (2 + (i % 4)) * 60 + 10 + i * 3,
  uploaded_at: daysFromNow(-i),
  anime_referenced: ['Crimson Tide', 'Shadow Veil', 'Vermillion Sky', 'Iron Sage'][i % 4],
  song_used: [
    'Phonk Drive — Producer X', 'Lost Memories — DJ Echo',
    'Crimson Beat — Vermillion', 'Neon Pulse — Layo',
  ][i % 4],
  featured: i < 4,
}));

// ── Co-reading rooms v2 ───────────────────────────────────────────────────
export let mockCoReadingRooms = Array.from({ length: 6 }).map((_, i) => ({
  id: `roomx_${i}`,
  name: `${mockMangaSeries[i].title} — Read Together`,
  host: {
    id: i === 0 ? mockUser.id : `host_${i}`,
    username: i === 0 ? mockUser.username : `host_${i}`,
    avatar: `https://i.pravatar.cc/120?img=${60 + i}`,
  },
  series: mockMangaSeries[i],
  series_id: mockMangaSeries[i].id,
  current_chapter: 3 + (i % 5),
  current_page: 8 + (i * 3) % 12,
  is_active: i < 4,
  max_participants: 10,
  created_at: daysFromNow(-(0.05 + i * 0.05)),
  participants: Array.from({ length: 3 + (i % 4) }).map((_, p) => ({
    id: p === 0 && i === 0 ? mockUser.id : `part_${i}_${p}`,
    username: p === 0 && i === 0 ? mockUser.username : `reader_${i}_${p}`,
    avatar: `https://i.pravatar.cc/80?img=${20 + (i + p) % 30}`,
    is_host: p === 0,
    joined_at: daysFromNow(-0.02 * (p + 1)),
  })),
  topic: ['Speed re-read', 'Theory night', 'New reader friendly', 'Arc breakdown'][i % 4],
}));

// ── Wager pools + bet markets ─────────────────────────────────────────────
const _wagerPoolStatuses = ['upcoming', 'live', 'settled', 'upcoming', 'live', 'upcoming', 'settled', 'live', 'upcoming', 'settled'];

export let mockWagerPools = Array.from({ length: 10 }).map((_, i) => {
  const teamA = mockTeams[i % mockTeams.length];
  const teamB = mockTeams[(i + 2) % mockTeams.length];
  const status = _wagerPoolStatuses[i];
  const totalStaked = 5000 + i * 1500;
  const optionA = Math.round(totalStaked * 0.55);
  const optionB = totalStaked - optionA;
  return {
    id: `wp_${i}`,
    match: {
      id: `mtch_${i}`,
      team_a: { id: teamA.id, name: teamA.name, tag: teamA.tag, logo: teamA.logo },
      team_b: { id: teamB.id, name: teamB.name, tag: teamB.tag, logo: teamB.logo },
      game: GAMES[i % GAMES.length],
      time: daysFromNow((status === 'settled' ? -2 : 0) + i * 0.5),
    },
    total_staked: totalStaked,
    stakers_count: 25 + i * 8,
    outcome_options: [
      {
        id: `opt_${i}_a`,
        label: `${teamA.name} wins`,
        current_odds: Math.round((1.7 + (i % 5) * 0.1) * 100) / 100,
        stake_amount: optionA,
        stake_pct: Math.round((optionA / totalStaked) * 100),
      },
      {
        id: `opt_${i}_b`,
        label: `${teamB.name} wins`,
        current_odds: Math.round((2.0 + (i % 4) * 0.15) * 100) / 100,
        stake_amount: optionB,
        stake_pct: 100 - Math.round((optionA / totalStaked) * 100),
      },
    ],
    deadline: daysFromNow(status === 'settled' ? -1 : 1 + i * 0.5),
    status,
    platform_fee_pct: 5,
    settled_outcome: status === 'settled' ? `opt_${i}_a` : null,
    payout_total_vc: status === 'settled' ? Math.round(totalStaked * 0.95) : null,
    created_at: daysFromNow(-i),
  };
});

const _betMarketTypes = ['winner', 'over_under', 'first_blood', 'handicap'];
export let mockBetMarkets = Array.from({ length: 8 }).map((_, i) => {
  const pool = mockWagerPools[i % mockWagerPools.length];
  return {
    id: `bm_${i}`,
    pool_id: pool.id,
    match: pool.match,
    market_type: _betMarketTypes[i % _betMarketTypes.length],
    market_label: ['Match Winner', 'Over/Under 26.5 rounds', 'First Blood', 'Map Handicap'][i % 4],
    selections: [
      { id: `sel_${i}_x`, label: i % 2 === 0 ? pool.match.team_a.name : 'Over 26.5', odds: 1.85 + (i % 3) * 0.15 },
      { id: `sel_${i}_y`, label: i % 2 === 0 ? pool.match.team_b.name : 'Under 26.5', odds: 2.0 + (i % 4) * 0.1 },
    ],
    odds: 1.85 + (i % 3) * 0.15,
    total_volume: 1500 + i * 400,
    status: 'open',
    closes_at: pool.deadline,
  };
});

// ── Notifications ─────────────────────────────────────────────────────────
const _notifTypes = [
  'join_request', 'tournament_result', 'tournament_invite', 'event_reminder',
  'message', 'mention', 'wager_result', 'payout_approved', 'listing_sold',
  'order_shipped', 'comment_reply', 'follower_new',
];
const _notifTitles = {
  join_request: 'New team join request',
  tournament_result: 'Tournament result available',
  tournament_invite: 'You have been invited to a tournament',
  event_reminder: 'Event starts in 24 hours',
  message: 'New direct message',
  mention: 'You were mentioned in a thread',
  wager_result: 'Wager settled',
  payout_approved: 'Payout approved',
  listing_sold: 'Your listing sold',
  order_shipped: 'Order shipped',
  comment_reply: 'Someone replied to your comment',
  follower_new: 'New follower',
};

export let mockNotifications = Array.from({ length: 20 }).map((_, i) => {
  const type = _notifTypes[i % _notifTypes.length];
  return {
    id: `notif_${i}`,
    type,
    title: _notifTitles[type],
    message: [
      `Reaper_X requested to join Crimson Wolves.`,
      `You finished 2nd in FIFA Pro Cup 4 — 5,000 VC awarded.`,
      `Layo Gaming invited you to PUBG Sundown.`,
      `V-ENT LAN #2 starts in 24 hours.`,
      `You have 3 new messages from @femi_a.`,
      `@editor_3 mentioned you in "AMV editing tips" thread.`,
      `Your bet on Crimson Wolves won — 1,800 VC payout.`,
      `Your withdrawal of 8,000 VC was approved.`,
      `Your "PS5 Slim" listing sold for 800 VC.`,
      `Your order VENT-100002 shipped via DHL.`,
      `@otaku_king replied to your AMV comment.`,
      `@new_player_${i} started following you.`,
    ][i % 12],
    read: i % 3 === 0,
    icon: type,
    target_url: `/notifications/${i}`,
    target_id: `${type}_${i}`,
    actor: {
      id: `user_${i}`,
      username: `user_${i}`,
      avatar: `https://i.pravatar.cc/80?img=${(i * 3) % 70}`,
    },
    created_at: _hoursAgo(i * 2 + 1),
  };
});

// ── Community posts v2 ────────────────────────────────────────────────────
const _postTypes = ['text', 'image', 'video', 'poll'];

export let mockPosts = Array.from({ length: 25 }).map((_, i) => {
  const type = _postTypes[i % _postTypes.length];
  return {
    id: `pstx_${i}`,
    author: {
      id: i === 0 ? mockUser.id : `user_${i}`,
      username: i === 0 ? mockUser.username : `user_${i}`,
      full_name: i === 0 ? mockUser.full_name : `Gamer ${i}`,
      avatar: `https://i.pravatar.cc/120?img=${(40 + i) % 70}`,
      verified: i % 5 === 0,
    },
    content: [
      'Closed a clutch 1v4 — heater day. GGs all.',
      'Looking for 2v2 scrim tonight, EA FC 25.',
      'Tournament recap dropping tonight, wild final.',
      'New COD Warzone update killed movement for me.',
      'W stream tonight. Pulled up the grind.',
      'Tekken 8 squad recruiting, must be Blue rank+.',
      'Hot take — bracket > round robin. Fight me.',
      'Day 4 of PUBG ranked grind. Crown II now.',
      'Vermillion Encore finals this weekend, who watching?',
      'Valorant Master tier — third account. Cooking.',
    ][i % 10],
    images: type === 'image' ? [`https://picsum.photos/seed/community-clip-${seedForGame(GAMES[i % GAMES.length])}-${i}/700/450`] : [],
    video_url: type === 'video' ? 'https://www.youtube.com/embed/dQw4w9WgXcQ' : null,
    poll: type === 'poll' ? {
      question: 'Best mobile shooter right now?',
      options: [
        { id: 'a', label: 'COD Mobile', votes: 120 + i * 5 },
        { id: 'b', label: 'PUBG Mobile', votes: 85 + i * 3 },
        { id: 'c', label: 'Free Fire', votes: 45 + i * 2 },
      ],
      total_votes: 250 + i * 10,
      ends_at: daysFromNow(2),
    } : null,
    type,
    likes_count: 10 + i * 3,
    comments_count: 1 + (i % 8),
    shares: i % 5,
    is_liked: i % 4 === 0,
    is_bookmarked: i % 7 === 0,
    created_at: _hoursAgo(i * 3),
  };
});

// ── Forum threads + replies (extended) ────────────────────────────────────
const _forumCategories = ['General', 'Tournaments', 'Anime', 'Marketplace', 'Tech'];
const _forumTitles = [
  'Best loadout COD Mobile season 7?', 'Bracket format guide', 'New anime season recs',
  'Selling clean PS5 controller', 'Cannot verify email — help', 'FIFA scrims tonight',
  'Bug — bracket not loading mobile', 'AMV editing tips for beginners',
  'Buying VENT COINS — safe way?', 'Wallet top-up failed', 'Crimson Wolves tryouts open',
  'Best anime fight scenes ever',
];

export let mockForumThreads = _forumTitles.map((title, i) => ({
  id: `thx_${i}`,
  title,
  category: _forumCategories[i % _forumCategories.length],
  body: 'Opening this thread for discussion. Drop your thoughts, clips, or questions below.',
  author: {
    id: `user_${i}`,
    username: `user_${i}`,
    full_name: `Forum User ${i}`,
    avatar: `https://i.pravatar.cc/120?img=${(20 + i) % 70}`,
  },
  is_pinned: i < 2,
  is_locked: i === 11,
  reply_count: 5 + (i * 2) % 12,
  view_count: 100 + i * 30,
  upvotes: 8 + i * 3,
  last_activity: _hoursAgo(i * 5),
  created_at: daysFromNow(-i),
}));

export let mockForumReplies = mockForumThreads.flatMap((thread) =>
  Array.from({ length: 5 + (thread.reply_count % 10) }).map((_, r) => ({
    id: `rplx_${thread.id}_${r}`,
    thread_id: thread.id,
    body: [
      'Same here — last patch broke my setup too.',
      'Tried this last night. Works like a charm.',
      'Got a clip of something similar, will upload.',
      'Anyone got tips? Stuck on the same problem.',
      'Mods should pin this one.',
      'Big +1 to OP, ran into this Wednesday.',
      'Try clearing cache first, fixed it for me.',
      'Disagree — round robin is fairer.',
    ][r % 8],
    author: {
      id: `user_${r + 50}`,
      username: `replier_${r}`,
      full_name: `Replier ${r}`,
      avatar: `https://i.pravatar.cc/120?img=${(30 + r) % 70}`,
    },
    upvotes: 1 + r * 2,
    created_at: _hoursAgo(r * 3 + 1),
  }))
);

// ── Clubs v2 ──────────────────────────────────────────────────────────────
const _clubGames = ['EA FC 25', 'Tekken 8', 'PUBG Mobile', 'Call of Duty: Warzone', 'Fortnite', 'Valorant', 'Street Fighter 6', 'Apex Legends'];

export let mockClubsV2 = _clubGames.map((game, i) => ({
  id: `clbx_${i}`,
  name: `${game} Nation`,
  banner: `https://picsum.photos/seed/club-${seedForGame(game)}-banner/1200/400`,
  logo: `https://picsum.photos/seed/club-${seedForGame(game)}-logo/200/200`,
  description: `${game} Nation — the home base for every ${game} player on V-ENT. Pickup matches, scrims, weekly tourneys.`,
  game,
  member_count: 120 + i * 47,
  posts_count: 20 + i * 8,
  type: i % 3 === 0 ? 'invite_only' : 'public',
  is_joined: i < 3,
  created_at: daysFromNow(-200 - i * 30),
}));

// ── DM threads v2 ─────────────────────────────────────────────────────────
const _dmNames = ['Tari K.', 'Dami O.', 'Femi A.', 'Nneka P.', 'Zee M.', 'Emeka N.'];

export let mockDmThreads = Array.from({ length: 6 }).map((_, i) => {
  const messageCount = 4 + (i * 2) % 9;
  return {
    id: `dmx_${i}`,
    participants: [
      { id: mockUser.id, username: mockUser.username, avatar: mockUser.profile_picture },
      {
        id: `user_dm_${i}`,
        username: ['tari_k', 'dami_o', 'femi_a', 'nneka_p', 'zee_m', 'emeka_n'][i],
        full_name: _dmNames[i],
        avatar: `https://i.pravatar.cc/120?img=${60 + i}`,
      },
    ],
    last_message_at: _hoursAgo(i * 2),
    unread_count: i < 2 ? 2 : 0,
    messages: Array.from({ length: messageCount }).map((_, m) => ({
      id: `dmsg_${i}_${m}`,
      thread_id: `dmx_${i}`,
      from: m % 2 === 0 ? `user_dm_${i}` : mockUser.id,
      body: [
        'Yo — scrim tonight?', 'Yeah locked in. Bo5?', 'Bo5 locked, inviting now.',
        'GG that round.', 'Send the tourney link?', 'Roster updated, check it.',
        'Approved.', 'Run ranked later?', 'Got the payout, thanks.',
      ][m % 9],
      created_at: _hoursAgo(messageCount - m + i),
      read: m < messageCount - 1,
    })),
  };
});

// ── Scrims v2 ─────────────────────────────────────────────────────────────
const _scrimStatuses = ['open', 'matched', 'in_progress', 'completed', 'open', 'open', 'matched', 'completed'];

export let mockScrimsV2 = Array.from({ length: 8 }).map((_, i) => ({
  id: `scrx_${i}`,
  team_a: {
    id: mockTeams[i % mockTeams.length].id,
    name: mockTeams[i % mockTeams.length].name,
    tag: mockTeams[i % mockTeams.length].tag,
    logo: mockTeams[i % mockTeams.length].logo,
  },
  opponent_open_or_team_b: i % 2 === 0
    ? { open: true, opponent: null }
    : {
      open: false,
      opponent: {
        id: mockTeams[(i + 2) % mockTeams.length].id,
        name: mockTeams[(i + 2) % mockTeams.length].name,
        tag: mockTeams[(i + 2) % mockTeams.length].tag,
        logo: mockTeams[(i + 2) % mockTeams.length].logo,
      },
    },
  game: GAMES[i % GAMES.length],
  format: ['1v1', '2v2', '5v5', 'Bo3', 'Bo5'][i % 5],
  region: ['NG-West', 'NG-East', 'ZA', 'KE', 'EU-West'][i % 5],
  scheduled_at: daysFromNow(i * 0.5 + 0.5),
  status: _scrimStatuses[i],
  prize_vc: i % 2 === 0 ? 0 : 500 + i * 100,
  notes: 'Friendly scrim — clean play, no toxic.',
  created_at: daysFromNow(-i),
}));

// ── Bracket: 32-team single-elim ──────────────────────────────────────────
const _round32Names = ['R1', 'R16', 'QF', 'SF', 'F'];
const _bracketParticipants = Array.from({ length: 32 }).map((_, i) => ({
  id: `bp_${i}`,
  name: `Team ${String.fromCharCode(65 + (i % 26))}${(i / 26) | 0}`,
  username: `team_${i}`,
  logo: `https://i.pravatar.cc/100?img=${(i * 2) % 70}`,
  seed: i + 1,
}));

const _genBracketRound = (roundIdx, totalRounds, prevWinners) => {
  const matchCount = Math.pow(2, totalRounds - roundIdx - 1);
  const participants = roundIdx === 0 ? _bracketParticipants : prevWinners;
  return Array.from({ length: matchCount }).map((_, m) => {
    const p1 = participants[m * 2];
    const p2 = participants[m * 2 + 1];
    const isComplete = roundIdx < 2;
    const isInProgress = roundIdx === 2 && m === 0;
    const score1 = isComplete ? 2 + (m % 2) : null;
    const score2 = isComplete ? (m % 2 === 0 ? 1 : 2) : null;
    return {
      id: `bm32_r${roundIdx}_m${m}`,
      round: _round32Names[Math.min(roundIdx, _round32Names.length - 1)],
      round_number: roundIdx + 1,
      match_number: m + 1,
      p1: p1 || null,
      p2: p2 || null,
      winner: isComplete ? (m % 2 === 0 ? p1 : p2) : null,
      score_p1: score1,
      score_p2: score2,
      status: isComplete ? 'completed' : isInProgress ? 'in_progress' : 'pending',
      scheduled_at: daysFromNow(roundIdx * 2 - 5),
      stream_url: roundIdx >= 2 ? 'https://twitch.tv/v-ent-main' : null,
    };
  });
};

const _r1Matches = _genBracketRound(0, 5, null);
const _r1Winners = _r1Matches.map((m) => m.winner || m.p1);
const _r2Matches = _genBracketRound(1, 5, _r1Winners);
const _r2Winners = _r2Matches.map((m) => m.winner || m.p1);
const _r3Matches = _genBracketRound(2, 5, _r2Winners);
const _r3Winners = _r3Matches.map((m) => m.winner || m.p1);
const _r4Matches = _genBracketRound(3, 5, _r3Winners);
const _r4Winners = _r4Matches.map((m) => m.winner || m.p1);
const _r5Matches = _genBracketRound(4, 5, _r4Winners);

export const mockBracket32 = {
  id: 'brk_32',
  tournament_id: mockTournaments[0].id,
  total_teams: 32,
  format: 'single_elimination',
  rounds: [
    { id: 'r1', name: 'Round of 32', matches: _r1Matches },
    { id: 'r2', name: 'Round of 16', matches: _r2Matches },
    { id: 'qf', name: 'Quarter-Finals', matches: _r3Matches },
    { id: 'sf', name: 'Semi-Finals', matches: _r4Matches },
    { id: 'f', name: 'Final', matches: _r5Matches },
  ],
};

export const mockBracketMatches = mockBracket32.rounds.flatMap((r) => r.matches);

// ── Production: scenes + overlays + pipelines ─────────────────────────────
export let mockScenesV2 = [
  { id: 'sc_lobby', name: 'Lobby', type: 'lobby', icon: 'lobby', is_active: false, last_used: daysFromNow(-0.5), assets: ['lobby-bg.png', 'countdown.json'] },
  { id: 'sc_match', name: 'Match', type: 'match', icon: 'live', is_active: true, last_used: _hoursAgo(0.1), assets: ['scoreboard.html', 'lower-third.html'] },
  { id: 'sc_replay', name: 'Replay', type: 'replay', icon: 'replay', is_active: false, last_used: _hoursAgo(2), assets: ['replay-overlay.html'] },
  { id: 'sc_winner', name: 'Winner', type: 'winner', icon: 'trophy', is_active: false, last_used: daysFromNow(-1), assets: ['confetti.json', 'trophy-overlay.html'] },
];

export let mockOverlayConfigs = [
  { id: 'ov_lt', name: 'Lower Third', type: 'lower_third', position: 'bottom-left', is_visible: true, accent_color: '#D4AF37', updated_at: _hoursAgo(0.2), preview_url: 'https://overlays.v-ent.co/lower-third/preview' },
  { id: 'ov_sb', name: 'Scoreboard', type: 'scoreboard', position: 'top', is_visible: true, accent_color: '#ED1C24', updated_at: _hoursAgo(0.05), preview_url: 'https://overlays.v-ent.co/scoreboard/preview' },
  { id: 'ov_sp', name: 'Sponsor Bar', type: 'sponsor_bar', position: 'bottom', is_visible: true, accent_color: '#FBC64B', updated_at: _hoursAgo(1), preview_url: 'https://overlays.v-ent.co/sponsor-bar/preview' },
  { id: 'ov_bo', name: 'Bracket Overview', type: 'bracket_overview', position: 'fullscreen', is_visible: false, accent_color: '#5a9bff', updated_at: _hoursAgo(4), preview_url: 'https://overlays.v-ent.co/bracket/preview' },
  { id: 'ov_tn', name: 'Team Names', type: 'team_names', position: 'top-corners', is_visible: true, accent_color: '#C084FC', updated_at: _hoursAgo(0.3), preview_url: 'https://overlays.v-ent.co/team-names/preview' },
  { id: 'ov_tm', name: 'Match Timer', type: 'timer', position: 'top-center', is_visible: true, accent_color: '#D4AF37', updated_at: _hoursAgo(0.1), preview_url: 'https://overlays.v-ent.co/timer/preview' },
];

export let mockDataPipelineV2 = [
  { id: 'pp_ws', name: 'V-ENT WebSocket', type: 'websocket', url: 'wss://api.v-ent.co/ws/match/tmt_1000', status: 'connected', latency_ms: 32, last_ping: _hoursAgo(0.005), throughput_mps: 18 },
  { id: 'pp_obs', name: 'OBS Studio', type: 'broadcast_software', url: 'http://localhost:4444', status: 'connected', latency_ms: 12, last_ping: _hoursAgo(0.001), version: '30.1.2' },
  { id: 'pp_vmix', name: 'vMix', type: 'broadcast_software', url: 'http://localhost:8088', status: 'connected', latency_ms: 18, last_ping: _hoursAgo(0.003), version: '26.1.0' },
  { id: 'pp_sl', name: 'Streamlabs', type: 'broadcast_software', url: 'http://localhost:5000', status: 'disconnected', latency_ms: null, last_ping: daysFromNow(-0.5), version: null },
  { id: 'pp_api', name: 'V-ENT API', type: 'api', url: 'https://api.v-ent.co/match-feed', status: 'connected', latency_ms: 89, last_ping: _hoursAgo(0.001) },
  { id: 'pp_ovl', name: 'Overlay Service', type: 'overlay', url: 'https://overlays.v-ent.co', status: 'connected', latency_ms: 45, last_ping: _hoursAgo(0.002) },
];

// ── Event tickets v2 + Vendors v2 ─────────────────────────────────────────
const _ticketTiers = ['general', 'vip', 'backstage'];
const _ticketStatuses = ['active', 'used', 'refunded'];

export let mockEventTickets = Array.from({ length: 12 }).map((_, i) => {
  const event = mockEvents[i % mockEvents.length];
  const tier = _ticketTiers[i % _ticketTiers.length];
  return {
    id: `etkt_${i}`,
    event_id: event.id,
    event_name: event.name,
    event_date: event.start_date,
    location: event.location,
    tier,
    holder: { id: mockUser.id, username: mockUser.username, full_name: mockUser.full_name, email: mockUser.email },
    qr_code: `VENT-TKT-${100000 + i}-${tier.toUpperCase().slice(0, 3)}`,
    qr_url: `https://qr.v-ent.co/${100000 + i}`,
    price_vc: tier === 'general' ? 5 : tier === 'vip' ? 25 : 100,
    price_ngn: (tier === 'general' ? 2500 : tier === 'vip' ? 10000 : 25000),
    purchased_at: daysFromNow(-i),
    status: _ticketStatuses[i % _ticketStatuses.length],
  };
});

const _vendorNames = [
  'Red Samurai Apparel', 'Neon Anime Prints', 'Gamer Fuel Drinks',
  'PixelForge Peripherals', 'Manga Corner', 'Cosplay Atelier',
];
const _vendorSeeds = [
  'vendor-red-samurai-apparel', 'vendor-neon-anime-prints', 'vendor-gamer-fuel-drinks',
  'vendor-pixelforge-peripherals', 'vendor-manga-corner', 'vendor-cosplay-atelier',
];
const _vendorProductSeeds = [
  'shop-tshirt-vermillion', 'shop-poster-onepiece', 'shop-hoodie-vent', 'shop-mousepad-xl',
  'shop-collector-cup', 'shop-keychain-demon-slayer', 'shop-sticker-set', 'shop-vip-pin',
  'shop-cosplay-print', 'shop-merch-bundle', 'shop-cap-limited', 'shop-photo-frame',
];

export let mockEventVendors = Array.from({ length: 6 }).map((_, i) => ({
  id: `evnd_${i}`,
  event_id: mockEvents[i % mockEvents.length].id,
  name: _vendorNames[i],
  logo: `https://picsum.photos/seed/${_vendorSeeds[i]}-logo/200/200`,
  banner: `https://picsum.photos/seed/${_vendorSeeds[i]}-banner/1200/300`,
  description: `${_vendorNames[i]} — official V-ENT event vendor. On-site pickup, exclusive drops.`,
  category: ['Apparel', 'Prints', 'Food & Drink', 'Hardware', 'Books', 'Cosplay'][i],
  booth_number: `B-${10 + i}`,
  status: i < 5 ? 'active' : 'paused',
  rating: 4.4 + (i % 5) / 10,
  total_sales_vc: 8000 + i * 1200,
  products: Array.from({ length: 8 + (i % 5) }).map((__, p) => ({
    id: `evprd_${i}_${p}`,
    name: ['Limited Tee', 'Poster Bundle', 'Signed Hoodie', 'Mousepad XL',
      'Collector Cup', 'Event Keychain', 'Sticker Set', 'VIP Pin',
      'Cosplay Print', 'Merch Bundle', 'Limited Cap', 'Photo Frame'][p % 12],
    description: 'Vendor-exclusive item, on-site only.',
    price_vc: 5 + p * 3,
    price_ngn: (5 + p * 3) * 1000,
    image: `https://picsum.photos/seed/${_vendorProductSeeds[p % 12]}-${i}/400/400`,
    images: [`https://picsum.photos/seed/${_vendorProductSeeds[p % 12]}-${i}-a/400/400`],
    stock: 20 - p * 2,
    in_stock: p < 10,
    category: ['Apparel', 'Prints', 'Food & Drink', 'Hardware', 'Books', 'Cosplay'][i],
  })),
}));

// ── Admin: 30-day metrics + KYC + audit log ──────────────────────────────
export const mockAdminMetricsTimeline = Array.from({ length: 30 }).map((_, i) => {
  const dayOffset = 29 - i;
  return {
    date: new Date(now.getTime() - dayOffset * 86_400_000).toISOString().slice(0, 10),
    dau: 800 + ((i * 17) % 400),
    signups: 30 + ((i * 7) % 50),
    new_tournaments: 2 + (i % 5),
    transactions_count: 80 + ((i * 11) % 60),
    transactions_volume_vc: 8000 + ((i * 220) % 5000),
    vc_issued: 4000 + ((i * 90) % 2000),
    active_streams: i % 7 === 0 ? 5 : 2 + (i % 4),
  };
});

const _kycDocTypes = ['national_id', 'passport', 'drivers_license', 'voters_card'];
const _kycStatuses = ['pending', 'pending', 'pending', 'approved', 'approved', 'approved', 'approved', 'approved', 'approved', 'rejected', 'rejected', 'rejected'];

export let mockKycDocs = Array.from({ length: 12 }).map((_, i) => ({
  id: `kycd_${i}`,
  user: {
    id: `user_kyc_${i}`,
    username: `user_${i}`,
    full_name: `KYC User ${i}`,
    email: `kyc${i}@v-ent.co`,
    avatar: `https://i.pravatar.cc/120?img=${(10 + i * 3) % 70}`,
  },
  doc_type: _kycDocTypes[i % _kycDocTypes.length],
  doc_url: `https://picsum.photos/seed/kycd-${i}/600/400`,
  doc_back_url: `https://picsum.photos/seed/kycd-${i}-b/600/400`,
  selfie_url: `https://picsum.photos/seed/kycd-${i}-s/300/400`,
  status: _kycStatuses[i],
  submitted_at: daysFromNow(-i * 1.5),
  reviewed_at: i >= 3 ? daysFromNow(-i + 0.5) : null,
  reviewed_by: i >= 3 ? 'admin_1' : null,
  rejection_reason: _kycStatuses[i] === 'rejected' ? 'Document blurry / unreadable' : null,
}));

const _auditActions = [
  'user_banned', 'user_unbanned', 'payout_approved', 'payout_rejected',
  'kyc_approved', 'kyc_rejected', 'tournament_refunded', 'tournament_cancelled',
  'admin_login', 'config_changed', 'manual_vc_credit', 'manual_vc_debit',
];

export let mockAuditLogExtended = Array.from({ length: 30 }).map((_, i) => ({
  id: `audx_${i}`,
  actor: {
    id: `admin_${i % 3}`,
    username: `admin_${i % 3}`,
    full_name: `Admin ${i % 3}`,
    role: i % 3 === 0 ? 'super' : 'mod',
  },
  action: _auditActions[i % _auditActions.length],
  target_type: ['user', 'payout', 'kyc', 'tournament', 'system'][i % 5],
  target_id: `target_${i}`,
  metadata: {
    reason: ['Routine review', 'Reported by user', 'Automated trigger', 'Manual review'][i % 4],
    ip: '102.89.xxx.xxx',
    user_agent: 'Mozilla/5.0',
  },
  created_at: _hoursAgo(i * 4),
}));

// ── Settings state ────────────────────────────────────────────────────────
export let mockSettingsState = {
  user_id: mockUser.id,
  notifications: {
    join_request: true,
    tournament_result: true,
    tournament_invite: true,
    event_reminder: true,
    message: true,
    mention: true,
    wager_result: false,
    payout_approved: true,
    listing_sold: true,
    order_shipped: true,
    comment_reply: true,
    follower_new: false,
    push_enabled: true,
    email_enabled: true,
    sms_enabled: false,
  },
  privacy: {
    profile_visibility: 'public',
    show_email: false,
    show_location: true,
    show_wallet_balance: false,
    show_match_history: true,
    allow_dm_from: 'followers',
  },
  security: {
    two_factor_enabled: false,
    login_alerts: true,
    session_timeout_minutes: 60,
  },
  payments: {
    default_method: 'wallet',
    auto_topup_enabled: false,
    auto_topup_threshold_vc: 500,
    saved_cards: [
      { id: 'card_1', last4: '4242', brand: 'Visa', exp_month: 12, exp_year: 27, is_default: true },
      { id: 'card_2', last4: '5599', brand: 'Mastercard', exp_month: 8, exp_year: 26, is_default: false },
    ],
    saved_banks: [
      { id: 'bank_1', bank_name: 'GTBank', account_number: '0123456789', account_name: 'Ladi Layott', is_default: true },
    ],
  },
  language: 'en',
  timezone: 'Africa/Lagos',
  theme: 'dark',
  devices: [
    { id: 'dev_1', name: 'MacBook Pro 14"', type: 'desktop', browser: 'Chrome', os: 'macOS', ip: '102.89.xxx.xxx', last_active: _hoursAgo(0.05), is_current: true },
    { id: 'dev_2', name: 'iPhone 15', type: 'mobile', browser: 'Safari', os: 'iOS 17', ip: '102.89.xxx.xxx', last_active: _hoursAgo(2), is_current: false },
    { id: 'dev_3', name: 'Windows 11 PC', type: 'desktop', browser: 'Edge', os: 'Windows 11', ip: '102.89.xxx.xxx', last_active: daysFromNow(-3), is_current: false },
  ],
};

// ── Team invites + join requests ──────────────────────────────────────────
export let mockTeamInvites = Array.from({ length: 6 }).map((_, i) => ({
  id: `tinv_${i}`,
  team: {
    id: mockTeams[i % mockTeams.length].id,
    name: mockTeams[i % mockTeams.length].name,
    tag: mockTeams[i % mockTeams.length].tag,
    logo: mockTeams[i % mockTeams.length].logo,
  },
  invited_user: { id: mockUser.id, username: mockUser.username },
  invited_by: {
    id: `user_inv_${i}`,
    username: `captain_${i}`,
    avatar: `https://i.pravatar.cc/100?img=${(40 + i) % 70}`,
  },
  role: i % 2 === 0 ? 'player' : 'manager',
  message: 'Saw your match — want you on the squad. Tryouts welcome.',
  status: 'pending',
  expires_at: daysFromNow(7 - i),
  created_at: daysFromNow(-i),
}));

export let mockJoinRequests = Array.from({ length: 4 }).map((_, i) => ({
  id: `jreq_${i}`,
  team: {
    id: mockTeams[i].id,
    name: mockTeams[i].name,
    tag: mockTeams[i].tag,
    logo: mockTeams[i].logo,
  },
  applicant: {
    id: `user_app_${i}`,
    username: `applicant_${i}`,
    full_name: `Applicant ${i}`,
    avatar: `https://i.pravatar.cc/100?img=${(50 + i) % 70}`,
    rank: 100 + i * 50,
  },
  message: 'Played against your team last week — would love to try out.',
  status: 'pending',
  created_at: daysFromNow(-i),
}));

// ── Matches (live + scheduled) ────────────────────────────────────────────
const _matchStatuses = ['live', 'live', 'live', 'scheduled', 'scheduled', 'scheduled', 'scheduled', 'completed', 'completed', 'completed'];

export let mockMatches = Array.from({ length: 20 }).map((_, i) => {
  const status = _matchStatuses[i % _matchStatuses.length];
  const teamA = mockTeams[i % mockTeams.length];
  const teamB = mockTeams[(i + 2) % mockTeams.length];
  return {
    id: `mtch_${i}`,
    tournament_id: mockTournaments[i % mockTournaments.length].id,
    tournament_name: mockTournaments[i % mockTournaments.length].name,
    game: GAMES[i % GAMES.length],
    team_a: { id: teamA.id, name: teamA.name, tag: teamA.tag, logo: teamA.logo },
    team_b: { id: teamB.id, name: teamB.name, tag: teamB.tag, logo: teamB.logo },
    score_a: status === 'scheduled' ? null : 1 + (i % 4),
    score_b: status === 'scheduled' ? null : 0 + (i % 3),
    status,
    scheduled_at: status === 'completed'
      ? daysFromNow(-1 - i * 0.2)
      : status === 'live'
        ? _hoursAgo(0.5)
        : daysFromNow(0.5 + i * 0.2),
    started_at: status === 'live' ? _hoursAgo(0.3) : status === 'completed' ? daysFromNow(-1 - i * 0.2) : null,
    ended_at: status === 'completed' ? daysFromNow(-0.9 - i * 0.2) : null,
    duration_seconds: status === 'completed' ? 1800 + i * 120 : status === 'live' ? 1100 + i * 50 : null,
    stream_url: status !== 'scheduled' ? `https://twitch.tv/v-ent-${i}` : null,
    viewer_count: status === 'live' ? 250 + i * 80 : null,
    map: ['Erangel', 'Miramar', 'Sanhok', 'N/A'][i % 4],
    round: 1 + (i % 5),
    bracket_round: ['R1', 'R16', 'QF', 'SF', 'F'][Math.min(4, (i / 5) | 0)],
  };
});

// ── Search index (cross-entity) ───────────────────────────────────────────
// Used by /search/?q= handler to return mixed results.
export const mockSearchSeed = () => [
  ...mockTournaments.map((t) => ({ type: 'tournament', id: t.id, label: t.name, image: t.banner_image, sub: t.game })),
  ...mockEvents.map((e) => ({ type: 'event', id: e.id, label: e.name, image: e.banner_image, sub: e.location })),
  ...mockTeams.map((t) => ({ type: 'team', id: t.id, label: t.name, image: t.logo, sub: t.game })),
  ...mockOrganizationsExtended.map((o) => ({ type: 'organization', id: o.id, label: o.name, image: o.logo, sub: o.region })),
  ...mockProducts.map((p) => ({ type: 'product', id: p.id, label: p.name, image: p.images[0], sub: p.category })),
  ...mockListingsV2.map((l) => ({ type: 'listing', id: l.id, label: l.title, image: l.images[0], sub: l.category })),
  ...mockMangaSeries.map((m) => ({ type: 'manga', id: m.id, label: m.title, image: m.cover, sub: m.genres.join(', ') })),
  ...mockAmvsV2.map((a) => ({ type: 'amv', id: a.id, label: a.title, image: a.thumbnail, sub: a.uploader.username })),
];

// ── Rankings / Leaderboards ───────────────────────────────────────────────
// Used by /rankings/ page. Shape per entry:
//   { id, name, username?, avatar, region, country, points, wins, losses,
//     win_rate, rank, prev_rank, favorite_game, kind: 'player'|'team'|'organization' }
// Ranks are dense (1..N), sorted by points desc.

const RANK_GAMES = ['FIFA', 'PUBG Mobile', 'Call of Duty Mobile', 'Valorant', 'Free Fire', 'Fortnite', 'Mortal Kombat 1', 'Tekken 8'];
const RANK_REGIONS = [
  { region: 'West Africa', country: 'Nigeria', city: 'Lagos' },
  { region: 'West Africa', country: 'Nigeria', city: 'Abuja' },
  { region: 'West Africa', country: 'Nigeria', city: 'Port Harcourt' },
  { region: 'West Africa', country: 'Ghana', city: 'Accra' },
  { region: 'West Africa', country: 'Ivory Coast', city: 'Abidjan' },
  { region: 'East Africa', country: 'Kenya', city: 'Nairobi' },
  { region: 'East Africa', country: 'Uganda', city: 'Kampala' },
  { region: 'Southern Africa', country: 'South Africa', city: 'Johannesburg' },
  { region: 'North Africa', country: 'Egypt', city: 'Cairo' },
  { region: 'North Africa', country: 'Morocco', city: 'Casablanca' },
  { region: 'Europe', country: 'United Kingdom', city: 'London' },
  { region: 'Europe', country: 'Germany', city: 'Berlin' },
  { region: 'North America', country: 'United States', city: 'Los Angeles' },
  { region: 'North America', country: 'Canada', city: 'Toronto' },
  { region: 'Asia', country: 'India', city: 'Mumbai' },
  { region: 'Asia', country: 'Japan', city: 'Tokyo' },
];

const PLAYER_HANDLES = [
  'fury_king', 'reaper_x', 'shadow_ace', 'neon_wolf', 'crimson_ace',
  'ghost_zero', 'viper_prime', 'nova_clash', 'alpha_bolt', 'void_striker',
  'titan_rage', 'silent_blade', 'rogue_storm', 'cyber_lynx', 'phantom_eko',
  'rapid_shade', 'iron_phoenix', 'savage_drift', 'wraith_one', 'ember_rush',
  'echo_king', 'orbit_hunter', 'frost_byte', 'mystic_arc', 'venom_strike',
  'pulse_axis', 'quantum_jay', 'bronze_pat', 'silver_zee', 'gold_meta',
  'omega_dare', 'razor_pike', 'tundra_lord', 'flux_titan', 'azure_hawk',
  'midnight_y', 'kronos_v', 'lazer_focus', 'nemesis_kx', 'kaiju_jr',
  'plasma_b', 'rift_dancer', 'specter_o', 'tempo_king', 'umbra_d',
  'volt_cross', 'wildcard_w', 'xeno_main', 'yokai_3', 'zenith_zero',
];

const TEAM_NAMES = [
  'Crimson Wolves', 'Alpha Reapers', 'Nexus Titans', 'Shadow Raiders', 'Phoenix Rising',
  'Velocity Esports', 'Lagos Lions', 'Sahara Storm', 'Apex Hyenas', 'Volcano FC',
  'Black Mamba', 'Iron Falcons', 'Drift Kings', 'Sunset Squad', 'Ravens Reign',
  'Stellar Pack', 'Coast Crushers', 'Delta Demons', 'Echo Empire', 'Forge Five',
  'Gamma Guard', 'Halo Hounds', 'Icon Initiative', 'Jade Jaguars', 'Krypton Krew',
  'Lunar Legion', 'Meta Mavericks', 'Nova Knights', 'Orion Outlaws', 'Pulse Pack',
  'Quasar Quintet', 'Rampage Riot', 'Specter Squad', 'Titan Tribe', 'Umbra United',
  'Vortex Vanguard', 'Wraith Wave', 'Xenon X', 'Yield Yokai', 'Zenith Zero',
  'Atlas Aces', 'Brimstone Bros', 'Comet Crew', 'Drake Dynasty', 'Ember Eagles',
  'Frost Foxes', 'Galaxy Goons', 'Hydra Heat', 'Inferno Imps', 'Justice Jolt',
];

const ORG_NAMES_RANK = [
  'Vermillion Encore', 'Naija Esports', 'Lagos Gaming Co', 'Sahara Pro League',
  'Pan-African Gamers', 'Esports Africa Hub', 'West Coast Esports', 'Continental Cup',
  'Global Gaming Org', 'Pulse Esports', 'Atlas Esports', 'Drift Productions',
  'Rift Republic', 'Olympus Org', 'Coast Esports Hub', 'United Gamers GH',
  'Phoenix Promotions', 'Echo Org Africa', 'Frontier League', 'Skyline Studios',
];

const _seedRandom = (seed) => {
  // Deterministic pseudo-random so SSR + CSR match.
  let h = seed * 9301 + 49297;
  return () => {
    h = (h * 9301 + 49297) % 233280;
    return h / 233280;
  };
};

const _buildRankingPool = (count, kind, namesArr, baseAvatarStart = 1) => {
  const rng = _seedRandom(kind === 'player' ? 11 : kind === 'team' ? 22 : 33);
  const pool = Array.from({ length: count }).map((_, i) => {
    const r = RANK_REGIONS[i % RANK_REGIONS.length];
    const game = RANK_GAMES[i % RANK_GAMES.length];
    const wins = Math.max(2, Math.round(40 - i * (35 / count) + rng() * 6));
    const losses = Math.max(1, Math.round(8 + i * 0.4 + rng() * 4));
    const total = wins + losses;
    const win_rate = Math.round((wins / total) * 1000) / 10; // 1 decimal
    const points = Math.round(2400 - i * (1900 / count) + rng() * 60);
    const id = kind === 'player' ? `pl_${1000 + i}`
      : kind === 'team' ? `team_${500 + i}`
      : `org_${300 + i}`;
    const username = kind === 'player' ? PLAYER_HANDLES[i % PLAYER_HANDLES.length] : null;
    const name = kind === 'player'
      ? PLAYER_HANDLES[i % PLAYER_HANDLES.length]
      : namesArr[i % namesArr.length];
    const avatar = kind === 'player'
      ? `https://i.pravatar.cc/200?img=${(baseAvatarStart + i) % 70 + 1}`
      : kind === 'team'
        ? `https://i.pravatar.cc/200?img=${(baseAvatarStart + i + 30) % 70 + 1}`
        : `https://picsum.photos/seed/org-rank-logo-${i}/200/200`;
    // Trend: prev_rank is current-rank shifted by a small delta so we can render arrows.
    const delta = Math.round((rng() - 0.45) * 6); // mostly small, slight upward bias
    return {
      id,
      kind,
      name,
      username,
      avatar,
      region: r.region,
      country: r.country,
      city: r.city,
      points,
      wins,
      losses,
      win_rate,
      favorite_game: game,
      _delta: delta, // applied below to compute prev_rank
    };
  });
  // Sort by points desc + assign rank
  pool.sort((a, b) => b.points - a.points);
  pool.forEach((entry, idx) => {
    entry.rank = idx + 1;
    entry.prev_rank = Math.max(1, entry.rank + entry._delta);
    delete entry._delta;
  });
  return pool;
};

export const mockRankingsPlayers = _buildRankingPool(50, 'player', PLAYER_HANDLES, 1);
export const mockRankingsTeams = _buildRankingPool(50, 'team', TEAM_NAMES, 8);
export const mockRankingsOrganizations = _buildRankingPool(20, 'organization', ORG_NAMES_RANK, 20);

// Make sure the demo user exists in player rankings so the "Your rank" strip
// has something to pin.
mockRankingsPlayers.splice(41, 0, {
  id: mockUser.id,
  kind: 'player',
  name: mockUser.username,
  username: mockUser.username,
  avatar: mockUser.profile_picture,
  region: 'West Africa',
  country: 'Nigeria',
  city: 'Lagos',
  points: 980,
  wins: 18,
  losses: 11,
  win_rate: 62.1,
  favorite_game: 'FIFA',
  rank: 0, // re-assigned below
  prev_rank: 0,
  is_session_user: true,
});
// Re-rank after the splice.
mockRankingsPlayers.sort((a, b) => b.points - a.points);
mockRankingsPlayers.forEach((p, i) => {
  p.rank = i + 1;
  if (p.is_session_user) {
    p.prev_rank = p.rank + 4; // user moved up 4 places
  }
});

// ─────────────────────────────────────────────────────────────────────────
// ADMIN MODULE — extended state for full mock-driven admin dashboard
// ─────────────────────────────────────────────────────────────────────────

// Admin hero KPIs (full set per BRD spec)
export let mockAdminHeroKpis = {
  total_users: 14_302,
  active_users_today: 1_847,
  active_tournaments: 41,
  pending_payouts: 12,
  total_vc_circulation: 2_148_500,
  pending_kyc: 7,
  open_disputes: 3,
  new_signups_today: 128,
  vc_issued_today: 4_520,
  revenue_30d_ngn: 3_812_400,
};

// 30-day timeline with all three series for charts
export let mockAdminCharts = (() => {
  const out = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const seed = (d.getDate() * 7 + d.getMonth() * 13) % 100;
    out.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      signups: 60 + ((seed * 3) % 110) + (i % 7 === 0 ? 35 : 0),
      vc_issued: 4_000 + ((seed * 220) % 8_000),
      tournament_joins: 90 + ((seed * 9) % 180),
    });
  }
  return out;
})();

// Comprehensive admin user pool (60+ rows for pagination + filter testing)
const _ADMIN_COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Tanzania', 'Uganda', 'Cameroon'];
const _ADMIN_USER_STATUSES = ['active', 'active', 'active', 'active', 'active', 'banned', 'suspended', 'kyc_pending', 'active', 'active'];
const _ADMIN_USER_FIRSTS = ['Adaeze', 'Tunde', 'Chiamaka', 'Babatunde', 'Femi', 'Ngozi', 'Olumide', 'Folake', 'Kemi', 'Daniel', 'Ifeanyi', 'Yetunde', 'Bola', 'Sade', 'Nkechi', 'Tobi', 'Ada', 'Emeka', 'Funmi', 'Joshua'];
const _ADMIN_USER_LASTS = ['Okafor', 'Eze', 'Bakare', 'Adeyemi', 'Lawal', 'Ibrahim', 'Mensah', 'Adelaja', 'Akinola', 'Olusegun', 'Mohammed', 'Owusu', 'Tetteh', 'Wanjiru', 'Mwangi'];

export let mockAdminUsersExtended = Array.from({ length: 64 }).map((_, i) => {
  const first = _ADMIN_USER_FIRSTS[i % _ADMIN_USER_FIRSTS.length];
  const last = _ADMIN_USER_LASTS[i % _ADMIN_USER_LASTS.length];
  const status = _ADMIN_USER_STATUSES[i % _ADMIN_USER_STATUSES.length];
  return {
    id: `auser_${1000 + i}`,
    username: `${first.toLowerCase()}_${last.toLowerCase()}${(i % 9)}`,
    full_name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@v-ent.co`,
    country: _ADMIN_COUNTRIES[i % _ADMIN_COUNTRIES.length],
    avatar: `https://i.pravatar.cc/120?img=${(i * 3) % 70}`,
    status,
    is_active: status !== 'banned' && status !== 'suspended',
    role: i % 17 === 0 ? 'admin' : i % 7 === 0 ? 'organizer' : 'user',
    is_staff: i % 17 === 0,
    wallet_vc: status === 'banned' ? 0 : 1_000 + ((i * 137) % 30_000),
    tournaments_count: (i * 3) % 18,
    date_joined: daysFromNow(-(i * 5 + 7)),
    last_login: daysFromNow(-(i % 14)),
    ban_reason: status === 'banned' ? 'TOS violation - multi-accounting' : null,
    suspension_reason: status === 'suspended' ? 'Pending dispute review' : null,
    kyc_status: status === 'kyc_pending' ? 'pending' : (i % 3 === 0 ? 'approved' : 'unsubmitted'),
  };
});

// Per-user detail (logins, tournaments, wallet, reports tabs)
export const mockAdminUserActivity = (userId) => {
  const u = mockAdminUsersExtended.find((x) => x.id === userId) || mockAdminUsersExtended[0];
  return {
    user: u,
    logins: Array.from({ length: 12 }).map((_, i) => ({
      id: `login_${userId}_${i}`,
      ip: `102.89.${(i * 17) % 255}.${(i * 41) % 255}`,
      device: ['MacBook Pro', 'iPhone 15', 'Windows 11 PC', 'Galaxy S24'][i % 4],
      location: u.country,
      created_at: daysFromNow(-i * 0.7),
    })),
    tournaments: Array.from({ length: u.tournaments_count }).map((_, i) => ({
      id: `tmt_user_${userId}_${i}`,
      name: mockTournaments[i % mockTournaments.length].name,
      status: ['completed', 'completed', 'ongoing', 'cancelled'][i % 4],
      placement: i % 6 === 0 ? '1st' : i % 4 === 0 ? '3rd' : `${4 + (i % 12)}th`,
      prize_vc: i % 6 === 0 ? 5000 : 0,
      joined_at: daysFromNow(-(i * 3 + 5)),
    })),
    wallet: Array.from({ length: 8 }).map((_, i) => ({
      id: `wtx_user_${userId}_${i}`,
      type: ['top_up', 'send', 'prize', 'withdrawal'][i % 4],
      amount: ((i % 4 === 1 || i % 4 === 3) ? -1 : 1) * (500 + i * 230),
      description: ['Topped up via Paystack', 'Sent to friend', 'Tournament prize', 'Withdrawal request'][i % 4],
      created_at: daysFromNow(-i * 1.5),
    })),
    reports: i => Array.from({ length: 2 + (i % 3) }).map((_, j) => ({
      id: `report_${userId}_${j}`,
      reporter: `user_${j * 7}`,
      reason: ['Toxic behavior', 'Cheating accusation', 'Harassment', 'Spam'][j % 4],
      status: j === 0 ? 'open' : 'resolved',
      created_at: daysFromNow(-(j + 1) * 4),
    })),
    ban_history: u.ban_reason ? [{
      id: `ban_${userId}`,
      reason: u.ban_reason,
      banned_by: 'admin_chidi',
      created_at: daysFromNow(-15),
      lifted_at: null,
    }] : [],
  };
};

// Tournaments — admin-extended (with prize/participants for table)
export let mockAdminTournaments = mockTournaments.map((t, i) => ({
  ...t,
  organizer_username: ['ladi_layo', 'esports_lagos', 'nexus_admin', 'phoenix_org'][i % 4],
  participants_count: 8 + (i * 13) % 56,
  status: ['active', 'ongoing', 'draft', 'completed', 'cancelled', 'active', 'ongoing'][i % 7],
  prize_pool: 5000 + (i * 2000),
}));

// Payouts queue — extends mockWithdrawalRequests with display fields
export let mockAdminPayouts = [
  ...mockWithdrawalRequests.map((w, i) => ({
    id: w.id,
    user_id: w.user.id,
    username: w.user.username,
    amount_vc: w.amount_vc,
    amount_ngn: w.amount_ngn,
    bank_name: w.bank_name,
    account_number: w.account_number,
    account_name: w.account_name,
    status: w.status,
    submitted_at: w.requested_at,
    note: w.note,
  })),
  ...Array.from({ length: 9 }).map((_, i) => ({
    id: `wdr_extra_${i}`,
    user_id: `user_${100 + i}`,
    username: `gamer_${100 + i}`,
    amount_vc: 2000 + i * 750,
    amount_ngn: (2000 + i * 750) * 1000,
    bank_name: ['GTBank', 'Access Bank', 'UBA', 'Zenith', 'First Bank'][i % 5],
    account_number: `01${i}3456789${i}`,
    account_name: `Gamer ${100 + i}`,
    status: i < 5 ? 'pending' : i < 7 ? 'approved' : 'rejected',
    submitted_at: daysFromNow(-(i + 0.5)),
    note: i % 3 === 0 ? 'First payout' : '',
  })),
];

// Audit log — start mutable, will be prepended on every admin action
export let mockAdminAuditFeed = [
  ..._auditActions.flatMap((action, i) =>
    Array.from({ length: 3 }).map((__, j) => ({
      id: `aud_seed_${i}_${j}`,
      action,
      description: {
        user_banned: `User spammer_${i}_${j} was banned (TOS violation)`,
        user_unbanned: `User reformed_${i}_${j} was unbanned`,
        payout_approved: `Payout of ₦${(15 + i + j) * 1000} approved for gamer_${i}_${j}`,
        payout_rejected: `Payout for gamer_${i}_${j} rejected — Bank details mismatch`,
        kyc_approved: `KYC approved for verified_${i}_${j}`,
        kyc_rejected: `KYC rejected for unclear_${i}_${j} — Document blurry`,
        tournament_refunded: `Tournament prize refunded for canceled match`,
        tournament_cancelled: `Tournament "Cup ${i}-${j}" cancelled by organizer`,
        admin_login: `Admin signed in from new device`,
        config_changed: `Platform fee updated to ${5 + j}%`,
        manual_vc_credit: `${(j + 1) * 100} VC credited to user_${i}_${j}`,
        manual_vc_debit: `${(j + 1) * 50} VC debited from user_${i}_${j}`,
      }[action],
      admin_username: ['superadmin', 'mod_chidi', 'finance_tunde'][(i + j) % 3],
      target_type: ['user', 'payout', 'kyc', 'tournament', 'system'][(i + j) % 5],
      target_id: `target_${i * 7 + j}`,
      ip: `102.89.xxx.${(i * 11 + j * 17) % 255}`,
      result: 'success',
      created_at: new Date(now.getTime() - (i * 12 + j * 4) * 3_600_000).toISOString(),
    }))
  ),
];
mockAdminAuditFeed.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

// Recent activity (last 24h, derived from audit feed)
export const mockAdminRecentActivity = () => mockAdminAuditFeed
  .filter((a) => new Date(now.getTime() - 24 * 3_600_000) <= new Date(a.created_at))
  .slice(0, 10);

// Notifications panel for admin header
export let mockAdminNotifications = [
  { id: 'an_1', icon: 'pending', text: '12 payout requests are pending review', time: '5 min ago', unread: true, color: '#FFC107' },
  { id: 'an_2', icon: 'alert', text: 'Dispute on PUBG Masters Match 7 unresolved for 48h', time: '2h ago', unread: true, color: '#ED1C24' },
  { id: 'an_3', icon: 'doc', text: '7 KYC documents awaiting review', time: '3h ago', unread: true, color: '#FFD54F' },
  { id: 'an_4', icon: 'check', text: 'Tournament "Tekken 8 Open" was published', time: '3h ago', unread: false, color: '#D4AF37' },
  { id: 'an_5', icon: 'trophy', text: 'COD Warzone Cup registration opened', time: '5h ago', unread: false, color: '#64B5F6' },
];

// KYC docs extended (with image previews)
export let mockAdminKycDocs = mockKycDocs.map((k) => ({
  id: k.id,
  user_id: k.user.id,
  username: k.user.username,
  full_name: k.user.full_name,
  email: k.user.email,
  avatar: k.user.avatar,
  doc_type: k.doc_type,
  doc_url: k.doc_url,
  doc_back_url: k.doc_back_url,
  selfie_url: k.selfie_url,
  status: k.status,
  submitted_at: k.submitted_at,
  reviewed_at: k.reviewed_at,
  reviewed_by: k.reviewed_by,
  rejection_reason: k.rejection_reason,
}));

// Admin platform-level settings (page /admin/settings)
export let mockAdminPlatformSettings = {
  platform_fees: {
    tournament_fee_pct: 5,
    withdrawal_fee_pct: 2,
    listing_fee_pct: 7.5,
    payout_min_vc: 1000,
    topup_max_ngn_per_day: 500_000,
  },
  feature_flags: {
    tournaments_enabled: true,
    events_enabled: true,
    wallet_enabled: true,
    marketplace_enabled: false,
    shop_enabled: false,
    anime_enabled: false,
    wager_enabled: false,
    referral_program_enabled: true,
  },
  banner: {
    enabled: false,
    title: 'Platform announcement',
    message: 'Scheduled maintenance window: Saturday 12am-2am WAT.',
    type: 'info',
  },
  maintenance: {
    enabled: false,
    message: 'V-ENT is undergoing scheduled maintenance. Back online shortly.',
    eta: null,
  },
};

// Helper to prepend a new audit entry from any admin action.
// Persists to sessionStorage so the prepend survives full-page navigations.
export const prependAuditEntry = (entry) => {
  const newEntry = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
    ip: '102.89.xxx.xxx',
    result: 'success',
    admin_username: 'superadmin',
    ...entry,
  };
  mockAdminAuditFeed.unshift(newEntry);
  // Persist new entries so they're still there after a full page reload.
  if (typeof window !== 'undefined') {
    try {
      const KEY = '__ventAdminAuditExtra';
      const stored = JSON.parse(sessionStorage.getItem(KEY) || '[]');
      stored.unshift(newEntry);
      sessionStorage.setItem(KEY, JSON.stringify(stored.slice(0, 200)));
    } catch {}
  }
  return newEntry;
};

// Re-hydrate persisted entries on every module load (so navigating between
// pages doesn't lose just-performed admin actions).
if (typeof window !== 'undefined') {
  try {
    const stored = JSON.parse(sessionStorage.getItem('__ventAdminAuditExtra') || '[]');
    if (Array.isArray(stored) && stored.length > 0) {
      const existingIds = new Set(mockAdminAuditFeed.map((a) => a.id));
      const fresh = stored.filter((s) => !existingIds.has(s.id));
      mockAdminAuditFeed.unshift(...fresh);
    }
    // Re-apply persisted mutations to other admin state (status changes only).
    const userMutKey = '__ventAdminUserMutations';
    const userMuts = JSON.parse(sessionStorage.getItem(userMutKey) || '{}');
    Object.entries(userMuts).forEach(([id, patch]) => {
      const u = mockAdminUsersExtended.find((x) => x.id === id);
      if (u) Object.assign(u, patch);
    });
    const payoutMutKey = '__ventAdminPayoutMutations';
    const payoutMuts = JSON.parse(sessionStorage.getItem(payoutMutKey) || '{}');
    Object.entries(payoutMuts).forEach(([id, patch]) => {
      const p = mockAdminPayouts.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
    });
    const kycMutKey = '__ventAdminKycMutations';
    const kycMuts = JSON.parse(sessionStorage.getItem(kycMutKey) || '{}');
    Object.entries(kycMuts).forEach(([id, patch]) => {
      const k = mockAdminKycDocs.find((x) => x.id === id);
      if (k) Object.assign(k, patch);
    });
  } catch {}
}

// Helpers used by mockFetch to persist admin mutations across page reloads.
export const persistAdminMutation = (kind, id, patch) => {
  if (typeof window === 'undefined') return;
  const key =
    kind === 'user'   ? '__ventAdminUserMutations' :
    kind === 'payout' ? '__ventAdminPayoutMutations' :
    kind === 'kyc'    ? '__ventAdminKycMutations' : null;
  if (!key) return;
  try {
    const obj = JSON.parse(sessionStorage.getItem(key) || '{}');
    obj[id] = { ...(obj[id] || {}), ...patch };
    sessionStorage.setItem(key, JSON.stringify(obj));
  } catch {}
};
