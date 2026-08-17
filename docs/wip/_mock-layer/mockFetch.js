// Mock fetch interceptor for V-ENT frontend.
// Activated when NEXT_PUBLIC_USE_MOCK=true so the app runs end-to-end without
// the Django backend. Installs a wrapper around window.fetch that intercepts
// any URL containing NEXT_PUBLIC_API_URL (or known V-ENT API paths) and
// returns canned data from mockData.js while letting unrelated requests
// (fonts, images, Paystack, NextAuth's own /api/auth/* routes, etc.) pass
// through to the original fetch untouched.

import {
  mockUser,
  mockTournaments,
  mockDrafts,
  mockEvents,
  mockTeams,
  mockBracketRounds,
  mockTransactions,
  mockAdminMetrics,
  mockAdminUsers,
  mockAdminAudit,
  mockPayouts,
  mockKycQueue,
  mockActivity,
  mockOrganizations,
  mockOrgMembers,
  mockOrgJoinRequests,
  mockOrgActivity,
  mockListings,
  mockShopProducts,
  mockCart,
  mockManga,
  mockAmvs,
  mockCoReadRooms,
  mockAnimeBattles,
  mockAnimeMyList,
  mockAnimeChatMessages,
  mockAnimeComments,
  mockFeedPosts,
  mockThreads,
  mockThreadReplies,
  mockClubs,
  mockConversations,
  mockDmMessages,
  mockScrims,
  mockWagerMarkets,
  mockMyBets,
  mockLeaderboard,
  mockTicketTypes,
  mockTickets,
  mockVendors,
  // Extended (v2) entities — see mockData.js extension block.
  mockTransactionsExtended,
  mockWithdrawalRequests,
  mockKycStatus,
  mockOrganizationsExtended,
  mockProducts,
  mockOrders,
  mockListingsV2,
  mockPurchases,
  mockMarketWatchlist,
  mockMarketOffers,
  mockMangaSeries,
  mockChapters,
  mockAmvsV2,
  mockCoReadingRooms,
  mockWagerPools,
  mockBetMarkets,
  mockNotifications,
  mockPosts,
  mockForumThreads,
  mockForumReplies,
  mockClubsV2,
  mockDmThreads,
  mockScrimsV2,
  mockBracket32,
  mockBracketMatches,
  mockScenesV2,
  mockOverlayConfigs,
  mockDataPipelineV2,
  mockEventTickets,
  mockEventVendors,
  mockAdminMetricsTimeline,
  mockKycDocs,
  mockAuditLogExtended,
  mockSettingsState,
  mockTeamInvites,
  mockJoinRequests,
  mockMatches,
  mockSearchSeed,
  mockRankingsPlayers,
  mockRankingsTeams,
  mockRankingsOrganizations,
  // Admin extensions
  mockAdminHeroKpis,
  mockAdminCharts,
  mockAdminUsersExtended,
  mockAdminUserActivity,
  mockAdminTournaments,
  mockAdminPayouts,
  mockAdminAuditFeed,
  mockAdminRecentActivity,
  mockAdminNotifications,
  mockAdminKycDocs,
  mockAdminPlatformSettings,
  prependAuditEntry,
  persistAdminMutation,
} from './mockData';

// ---------- helpers ----------

const LATENCY_MS = 150;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const successResponse = (data = {}, message = '') =>
  new Response(
    JSON.stringify({ status: 'success', data, message }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );

const errorResponse = (message = 'Something went wrong', status = 400) =>
  new Response(
    JSON.stringify({ status: 'error', data: {}, message }),
    { status, headers: { 'content-type': 'application/json' } }
  );

// Safely parse a request body into a JS object. Handles JSON strings, FormData
// and undefined bodies without throwing, because the app sometimes posts
// FormData (e.g. KYC uploads).
const parseBody = async (init) => {
  if (!init || !init.body) return {};
  const body = init.body;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const obj = {};
    body.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  return {};
};

// Apply pagination/ordering query params to a result array. Supports limit
// and ordering=-<field> / ordering=<field>. Extra params are ignored.
const applyQueryParams = (list, searchParams) => {
  if (!Array.isArray(list)) return list;
  let out = [...list];

  const ordering = searchParams.get('ordering');
  if (ordering) {
    const desc = ordering.startsWith('-');
    const field = desc ? ordering.slice(1) : ordering;
    out.sort((a, b) => {
      const av = a?.[field];
      const bv = b?.[field];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return desc ? 1 : -1;
      return desc ? -1 : 1;
    });
  }

  const limit = parseInt(searchParams.get('limit') || '', 10);
  if (!Number.isNaN(limit) && limit > 0) {
    out = out.slice(0, limit);
  }

  return out;
};

// Match a URL path against patterns like '/foo/bar/:id/'. Returns a params
// object on match or null otherwise.
const matchPath = (pattern, pathname) => {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const p = patternParts[i];
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (p !== pathParts[i]) {
      return null;
    }
  }
  return params;
};

// Should this URL be intercepted? Only intercept when it looks like a call to
// the V-ENT backend. That means either it literally starts with the configured
// API URL, or it hits one of the known top-level API segments the app uses.
const shouldIntercept = (url, init) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined);
    if (apiUrl && url.startsWith(apiUrl)) return true;

    // Skip Next.js RSC payload fetches (`?_rsc=...` or RSC header). These are
    // page-navigation requests, not API calls — letting them through is what
    // actually triggers client-side routing.
    if (u.searchParams.has('_rsc')) return false;
    const headers = init?.headers || {};
    const headerLookup = (k) => {
      if (typeof headers.get === 'function') return headers.get(k);
      const lc = Object.keys(headers).reduce((acc, h) => { acc[h.toLowerCase()] = headers[h]; return acc; }, {});
      return lc[k.toLowerCase()];
    };
    if (headerLookup('rsc') || headerLookup('next-router-prefetch') || headerLookup('next-router-state-tree')) {
      return false;
    }

    const firstSeg = u.pathname.split('/').filter(Boolean)[0];
    if ([
      // Originals
      'auth', 'tournament', 'event', 'teams', 'team', 'admin', 'organization',
      'marketplace', 'shop', 'anime', 'community', 'wager', 'ticket',
      // Extended (v2) — first segments for parallel-build mock layer.
      'org', 'product', 'order', 'cart', 'listing', 'purchase',
      'manga', 'chapter', 'amv', 'room', 'bet', 'match',
      'notification', 'post', 'thread', 'forum', 'club', 'dm', 'scrim',
      'bracket', 'production', 'overlay', 'scene', 'pipeline',
      'vendor', 'metric', 'kyc', 'audit', 'setting', 'device',
      'invite', 'request', 'search', 'wallet', 'home',
      'ranking', 'rankings',
    ].includes(firstSeg)) {
      // Avoid hijacking NextAuth's own routes (/api/auth/*).
      if (u.pathname.startsWith('/api/auth')) return false;
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// ---------- route handlers ----------

// Each handler receives a context object and returns a Response or null. If it
// returns null the dispatcher will keep trying other handlers and, failing
// that, fall through to the catch-all success response.

const handleAuthRoutes = async ({ method, pathname, body }) => {
  // Login (credentials or username). authOptions looks for data.session_token
  // or data.data.session_token — we return both shapes via the standard
  // envelope and also a top-level session_token so NextAuth picks it up
  // however it reads the response.
  if (method === 'POST' && pathname.endsWith('/auth/login/')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        data: {
          session_token: mockUser.session_token,
          user_id: mockUser.id,
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          is_staff: true,
          admin_role: 'super',
          admin_role_label: 'Super Admin',
        },
        // Legacy top-level fields — some pages read these directly.
        session_token: mockUser.session_token,
        user_id: mockUser.id,
        message: '',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  }

  if (method === 'POST' && pathname.endsWith('/auth/social-auth/')) {
    return successResponse({
      session_token: mockUser.session_token,
      user_id: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
    });
  }

  if (method === 'POST' && pathname.endsWith('/auth/logout/')) {
    return successResponse({});
  }

  if (method === 'POST' && pathname.endsWith('/auth/signup/')) {
    return successResponse({ user_id: mockUser.id, email: body?.email || mockUser.email });
  }

  if (method === 'POST' && pathname.endsWith('/auth/get-username-with-email/')) {
    return successResponse({ username: mockUser.username, exists: false });
  }

  if (pathname.endsWith('/auth/get-user-status/')) {
    return successResponse({ verified: true });
  }

  if (pathname.endsWith('/auth/resend-link/')) {
    return successResponse({});
  }

  if (pathname.startsWith('/auth/forgot-password/')) {
    return successResponse({});
  }

  if (pathname.endsWith('/auth/verify-oauth-token/')) {
    return successResponse({ session_token: mockUser.session_token, user_id: mockUser.id });
  }

  // Wallet
  if (method === 'GET' && pathname.endsWith('/auth/wallet/balance/')) {
    return successResponse({
      balance: mockUser.wallet_balance,
      kyc_verified: mockUser.kyc_verified,
    });
  }

  if (method === 'GET' && pathname.endsWith('/auth/wallet/transactions/')) {
    return successResponse({ transactions: mockTransactions });
  }

  if (method === 'POST' && pathname.endsWith('/auth/wallet/topup/initiate/')) {
    const ngn = Number(body?.amount_ngn || body?.amount || 1000);
    const reference = `MOCK-REF-${Date.now()}`;
    return successResponse({
      vent_coins: Math.floor(ngn / 1000),
      reference,
      authorization_url: `/wallet-topup-callback?reference=${reference}`,
    });
  }

  if (method === 'POST' && pathname.endsWith('/auth/wallet/topup/verify/')) {
    return successResponse({
      balance: mockUser.wallet_balance,
      verified: true,
      reference: body?.reference || 'MOCK-REF',
    });
  }

  if (method === 'POST' && pathname.endsWith('/auth/wallet/send/')) {
    const amount = Number(body?.amount || 0);
    return successResponse({ new_balance: mockUser.wallet_balance - amount });
  }

  if (method === 'POST' && pathname.endsWith('/auth/wallet/withdraw/initiate/')) {
    return successResponse({ reference: `MOCK-WD-${Date.now()}` });
  }

  if (method === 'POST' && pathname.endsWith('/auth/wallet/kyc/submit/')) {
    return successResponse({ submitted: true });
  }

  // Profile endpoints
  if (pathname.endsWith('/auth/get-user-informations/')) {
    return successResponse({
      ...mockUser,
      profile_pic: mockUser.profile_picture,
      banner: mockUser.banner_picture,
      description: mockUser.bio,
      interests: mockUser.favorite_games,
      gamingAccounts: [],
      achievements: mockActivity,
      penalty_point: 0,
    });
  }

  if (pathname.endsWith('/auth/edit-profile-info/')) {
    return successResponse({
      ...mockUser,
      profile_picture: body?.profile_pic || mockUser.profile_picture,
    });
  }

  if (pathname.endsWith('/auth/update-web-and-social-links/')) {
    return successResponse({ social_links: mockUser.social_links });
  }

  if (pathname.endsWith('/auth/get-user-gallery/')) {
    // Seeded so the mock demo profile has a populated gallery. The real
    // endpoint returns absolute URLs; page normalises either shape.
    const images = Array.from({ length: 9 }).map((_, i) => ({
      id: `gal_${i + 1}`,
      url: `https://picsum.photos/seed/vent-gal-${(i + 1).toString().padStart(2, '0')}/600/600`,
      category: ['tournaments', 'events', 'highlights'][i % 3],
      caption: ['Lagos Open · grand finals stage', 'VENT Anime Con · cosplay floor', 'Clutch 1v3 · Valorant ranked'][i % 3],
    }));
    return successResponse({ images });
  }

  if (pathname.endsWith('/auth/upload-images/')) {
    return successResponse({ images: [] });
  }

  if (pathname.endsWith('/auth/delete-gallery-image/')) {
    return successResponse({});
  }

  // Avatar upload (POST /auth/upload-avatar/, multipart profile_picture) →
  // absolute URL. Echo the mock user's avatar as the "uploaded" URL.
  if (pathname.endsWith('/auth/upload-avatar/')) {
    return successResponse({ profile_picture: mockUser.profile_picture }, 'Avatar updated');
  }

  // Banner upload (POST /auth/upload-banner/, multipart banner) → absolute URL.
  if (pathname.endsWith('/auth/upload-banner/')) {
    return successResponse({ banner: mockUser.banner_picture }, 'Banner updated');
  }

  // Favorite games save (POST /auth/update-favorite-games/, Bearer + JSON
  // { game_ids }) → returns resulting favorite-games titles.
  if (pathname.endsWith('/auth/update-favorite-games/')) {
    return successResponse({ favorite_games: body?.game_ids || [] }, 'Favorite games updated');
  }

  // Legacy favorite games save (POST /auth/edit-favorite-games/ — token in body).
  if (pathname.endsWith('/auth/edit-favorite-games/')) {
    return successResponse({ game_ids: body?.game_ids || [], games: body?.games || [] }, 'Favorite games updated');
  }

  // Gaming accounts save (BE-GAP — endpoint may not exist yet server-side).
  if (pathname.endsWith('/auth/update-gaming-accounts/')) {
    return successResponse({ accounts: body?.accounts || [] }, 'Gaming accounts updated');
  }

  return null;
};

// ── /user/<id>/... profile suite endpoints (rebuilt 2026-04-25) ──
// Drives /user-profile and /edit-user-profile. The session user is mockUser.
// Any other id returns a deterministic alt user so the "viewing other" view
// can be exercised end-to-end.
const buildAltUser = (id) => ({
  id,
  username: id === 'user_002' ? 'mikeyboy' : `player_${id.slice(-4) || '0001'}`,
  full_name: id === 'user_002' ? 'Julio Astor' : 'Other Player',
  bio: 'Rival from the regional ladder. Always ready for a rematch.',
  description: 'Rival from the regional ladder. Always ready for a rematch.',
  country: id === 'user_002' ? 'Lviv, Ukraine' : 'Lagos, Nigeria',
  profile_picture: `https://i.pravatar.cc/400?img=${33 + (parseInt(id.slice(-2), 10) || 7) % 30}`,
  banner: `https://picsum.photos/seed/v-ent-other-${id}/1600/520`,
  is_verified: true,
  interests: ['FIFA', 'Anime', 'Cosplay', 'Battle Royale'],
  social_links: [
    { title: 'Twitter', url: 'https://twitter.com/' + id },
    { title: 'Instagram', url: 'https://instagram.com/' + id },
  ],
  wallet_balance: 0,
  rank: 198,
  follower_count: 1240,
  following_count: 96,
});

const handleUserProfileRoutes = async ({ method, pathname, body }) => {
  // GET /user/:id/profile/  → fetch a profile by id
  const profileMatch = matchPath('/user/:id/profile/', pathname) ||
    matchPath('/user/:id/profile', pathname);
  if (method === 'GET' && profileMatch) {
    const id = profileMatch.id;
    if (id === mockUser.id || id === 'me' || id === 'self') {
      return successResponse({
        ...mockUser,
        profile_pic: mockUser.profile_picture,
        description: mockUser.bio,
        gamingAccounts: [
          { platform: 'PlayStation', handle: '@frostbite_psn', color: '#0070D1' },
          { platform: 'XBox', handle: '@frostbite_xbox', color: '#107C10' },
        ],
        achievements: [],
      });
    }
    return successResponse(buildAltUser(id));
  }

  // POST /user/:id/update/  → save Profile Info edits
  const updateMatch = matchPath('/user/:id/update/', pathname) ||
    matchPath('/user/:id/update', pathname);
  if (method === 'POST' && updateMatch) {
    return successResponse({
      ...mockUser,
      ...(body || {}),
      id: updateMatch.id,
    }, 'Profile updated');
  }

  // POST /user/:id/games/  → save Favorite Games edits
  const gamesMatch = matchPath('/user/:id/games/', pathname) ||
    matchPath('/user/:id/games', pathname);
  if (method === 'POST' && gamesMatch) {
    return successResponse({
      games: (body && body.games) || [],
      saved: true,
    }, 'Favorite games updated');
  }

  // POST /user/:id/accounts/  → save Gaming Accounts edits
  const accountsMatch = matchPath('/user/:id/accounts/', pathname) ||
    matchPath('/user/:id/accounts', pathname);
  if (method === 'POST' && accountsMatch) {
    return successResponse({
      accounts: (body && body.accounts) || {},
      saved: true,
    }, 'Gaming accounts updated');
  }

  // POST /user/:id/socials/  → save Social Links edits
  const socialsMatch = matchPath('/user/:id/socials/', pathname) ||
    matchPath('/user/:id/socials', pathname);
  if (method === 'POST' && socialsMatch) {
    return successResponse({
      socials: body || {},
      saved: true,
    }, 'Social links updated');
  }

  // POST /user/:id/follow/  → toggle follow
  const followMatch = matchPath('/user/:id/follow/', pathname) ||
    matchPath('/user/:id/follow', pathname);
  if (method === 'POST' && followMatch) {
    return successResponse({ following: true });
  }

  return null;
};

// Build a confirmed-participant list for a tournament id, shaped per
// m1-shared-spec §2.4 get-tournament-participants.
const buildParticipants = (id) => {
  const t = mockTournaments.find((x) => x.id === id) || mockTournaments[0];
  const isTeam = t?.participant_type === 'team';
  const count = Math.min(t?.current_participants || 8, 16);
  return Array.from({ length: count }).map((_, i) => {
    const team = mockTeams[i % mockTeams.length];
    return {
      id: `reg_${id}_${i}`,
      registration_id: `reg_${id}_${i}`,
      seed: i + 1,
      team: isTeam ? { id: team.id, name: team.name, tag: team.tag, logo: team.logo } : null,
      user: isTeam ? null : {
        id: `user_${i}`,
        username: `player_${i}`,
        full_name: `Player ${i}`,
        profile_pic: `https://i.pravatar.cc/120?img=${(i + 5) % 70}`,
      },
      region: ['Nigeria', 'Ghana', 'Kenya', 'South Africa'][i % 4],
      captain_username: `player_${i}`,
      win_rate: 0.4 + ((i * 7) % 40) / 100,
      status: 'confirmed',
    };
  });
};

// Find a bracket match by id across all rounds of mockBracketRounds. Returns
// the live object so score handlers can mutate it in place.
const findBracketMatch = (matchId) => {
  for (const round of mockBracketRounds) {
    const m = (round.matches || []).find((mm) => mm.id === matchId);
    if (m) return m;
  }
  return null;
};

const handleTournamentRoutes = async ({ method, pathname, searchParams, body }) => {
  // Listing — real contract shape { featured, new, by_game }. `tournaments`
  // kept alongside for any consumer still reading the flat shape.
  if (method === 'GET' && pathname.endsWith('/tournament/get-all-tournaments/')) {
    const all = applyQueryParams(mockTournaments, searchParams);
    const by_game = all.reduce((acc, t) => {
      const key = (t.game || 'general');
      (acc[key] = acc[key] || []).push(t);
      return acc;
    }, {});
    return successResponse({
      featured: all.slice(0, 5),
      new: all.slice(0, 5),
      by_game,
      tournaments: all,
    });
  }

  // Search — server-filtered list with pagination envelope.
  if (method === 'GET' && pathname.endsWith('/tournament/search-tournament/')) {
    let list = [...mockTournaments];
    const q = (searchParams.get('q') || '').toLowerCase();
    if (q) list = list.filter((t) => (t.name || '').toLowerCase().includes(q) || (t.game || '').toLowerCase().includes(q));
    const gameId = searchParams.get('game_id') || searchParams.get('game');
    if (gameId) list = list.filter((t) => String(t.game).toLowerCase() === String(gameId).toLowerCase());
    const status = searchParams.get('status');
    if (status) list = list.filter((t) => t.status === status);
    const entryType = searchParams.get('entry_type');
    if (entryType === 'Free') list = list.filter((t) => !t.entry_fee || t.entry_fee === 0);
    else if (entryType === 'Paid') list = list.filter((t) => t.entry_fee > 0);
    const total = list.length;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '20', 10);
    const start = (page - 1) * pageSize;
    return successResponse({
      tournaments: list.slice(start, start + pageSize),
      page,
      total_pages: Math.max(1, Math.ceil(total / pageSize)),
      total_count: total,
    });
  }

  const viewMatch = matchPath('/tournament/view-tournament/:id', pathname) ||
    matchPath('/tournament/view-tournament/:id/', pathname);
  if (method === 'GET' && viewMatch) {
    const tournament = mockTournaments.find((t) => t.id === viewMatch.id) || mockTournaments[0];
    return successResponse({
      tournament,
      sponsors: [],
      prize_distribution: [
        { position: 1, percentage: 60, amount: Math.floor((tournament.prize_pool || 0) * 0.6) },
        { position: 2, percentage: 30, amount: Math.floor((tournament.prize_pool || 0) * 0.3) },
        { position: 3, percentage: 10, amount: Math.floor((tournament.prize_pool || 0) * 0.1) },
      ],
    });
  }

  const bracketMatch = matchPath('/tournament/get-tournament-brackets/:id/', pathname) ||
    matchPath('/tournament/get-tournament-brackets/:id', pathname);
  if (method === 'GET' && bracketMatch) {
    return successResponse({
      bracket_type: 'single_elimination',
      rounds: mockBracketRounds,
    });
  }

  // Participants for a tournament.
  const participantsMatch = matchPath('/tournament/get-tournament-participants/:id/', pathname) ||
    matchPath('/tournament/get-tournament-participants/:id', pathname);
  if (method === 'GET' && participantsMatch) {
    return successResponse({ participants: buildParticipants(participantsMatch.id) });
  }

  // Organizer's own tournaments (+ reg_count / dispute_count).
  if (method === 'GET' && pathname.endsWith('/tournament/get-organizer-tournaments/')) {
    const tournaments = mockTournaments.slice(0, 6).map((t) => ({
      ...t,
      reg_count: t.current_participants || 0,
      dispute_count: 0,
    }));
    return successResponse({ tournaments });
  }

  if (method === 'GET' && pathname.endsWith('/tournament/view-user-drafted-tournaments/')) {
    // The drafts page reads `data.data` as an array directly (then falls back
    // to `[]`). Return the array at `data`, not `{ drafts: [...] }`.
    return new Response(
      JSON.stringify({ status: 'success', data: mockDrafts, message: '' }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  }

  if (method === 'POST' && pathname.endsWith('/tournament/create-tournament/')) {
    return successResponse({
      tournament_id: `new_tmt_${Date.now()}`,
      tournament: { id: `new_tmt_${Date.now()}`, ...body },
    });
  }

  // Edit / publish a tournament (PUT).
  const editMatch = matchPath('/tournament/edit-tournament/:id/', pathname) ||
    matchPath('/tournament/edit-tournament/:id', pathname);
  if (method === 'PUT' && editMatch) {
    return successResponse({ tournament_id: editMatch.id, updated_fields: Object.keys(body || {}) }, 'Tournament updated');
  }

  // Delete a draft (DELETE).
  const deleteDraftMatch = matchPath('/tournament/delete-draft/:id/', pathname) ||
    matchPath('/tournament/delete-draft/:id', pathname);
  if (method === 'DELETE' && deleteDraftMatch) {
    _spliceById(mockDrafts, deleteDraftMatch.id);
    return successResponse({}, 'Draft deleted');
  }

  if (method === 'POST' && pathname.endsWith('/tournament/register-tournament/')) {
    return successResponse({
      registration_id: `reg_${Date.now()}`,
      entry_fee_paid: true,
      coins_deducted: Number(body?.entry_fee || 0),
      registered: true,
    });
  }

  // Generate bracket (organizer). BE-GAP in production; mocked here.
  const genBracketMatch = matchPath('/tournament/:id/generate-bracket/', pathname) ||
    matchPath('/tournament/:id/generate-bracket', pathname);
  if (method === 'POST' && genBracketMatch) {
    const matches = mockBracketRounds.reduce((sum, r) => sum + (r.matches?.length || 0), 0);
    return successResponse({ rounds_created: mockBracketRounds.length, matches_created: matches }, 'Bracket generated');
  }

  // Organizer manual score override.
  const updateBracketMatch = matchPath('/tournament/update-bracket/:id/', pathname) ||
    matchPath('/tournament/update-bracket/:id', pathname);
  if (method === 'POST' && updateBracketMatch) {
    return successResponse({
      match_id: body?.match_id,
      score_p1: body?.score_p1,
      score_p2: body?.score_p2,
      winner_registration_id: body?.winner_registration_id,
    }, 'Bracket updated');
  }

  // Participant reports a match score — mutates the in-memory bracket so the
  // demo can drive report → confirm → completed. Body: {score_p1, score_p2, screenshot_url?}.
  const reportScoreMatch = matchPath('/tournament/match/:id/report-score/', pathname) ||
    matchPath('/tournament/match/:id/report-score', pathname);
  if (method === 'POST' && reportScoreMatch) {
    const m = findBracketMatch(reportScoreMatch.id);
    if (m) {
      const s1 = Number(body?.score_p1 ?? 0);
      const s2 = Number(body?.score_p2 ?? 0);
      m.score_p1 = s1;
      m.score_p2 = s2;
      if (Array.isArray(m.participants)) {
        if (m.participants[0]) m.participants[0].score = s1;
        if (m.participants[1]) m.participants[1].score = s2;
      }
      m.status = 'pending_opponent_confirm';
    }
    return successResponse({
      match_id: reportScoreMatch.id,
      status: 'pending_opponent_confirm',
      score_p1: body?.score_p1,
      score_p2: body?.score_p2,
    });
  }

  // Opponent confirms the reported score. Body: {agree, dispute_description?}.
  // agree → completed + winner marked; !agree → disputed.
  const confirmScoreMatch = matchPath('/tournament/match/:id/confirm-score/', pathname) ||
    matchPath('/tournament/match/:id/confirm-score', pathname);
  if (method === 'POST' && confirmScoreMatch) {
    const agreed = body?.agree !== false;
    const m = findBracketMatch(confirmScoreMatch.id);
    let winnerRegId = null;
    if (m) {
      if (agreed) {
        m.status = 'completed';
        m.completed_at = new Date().toISOString();
        const s1 = Number(m.score_p1 ?? m.participants?.[0]?.score ?? 0);
        const s2 = Number(m.score_p2 ?? m.participants?.[1]?.score ?? 0);
        if (Array.isArray(m.participants) && m.participants.length >= 2) {
          const winIdx = s1 >= s2 ? 0 : 1;
          m.participants[0].is_winner = winIdx === 0;
          m.participants[1].is_winner = winIdx === 1;
          winnerRegId = m.participants[winIdx].id;
        }
      } else {
        m.status = 'disputed';
      }
    }
    return successResponse({
      match_id: confirmScoreMatch.id,
      status: agreed ? 'completed' : 'disputed',
      winner_registration_id: winnerRegId,
    });
  }

  // Participant files a dispute on a match.
  const disputeMatch = matchPath('/tournament/match/:id/dispute/', pathname) ||
    matchPath('/tournament/match/:id/dispute', pathname);
  if (method === 'POST' && disputeMatch) {
    return successResponse({ dispute_id: `disp_${Date.now()}`, status: 'open' }, 'Dispute filed');
  }

  return null;
};

const handleEventRoutes = async ({ method, pathname, searchParams, body }) => {
  if (method === 'GET' && pathname.endsWith('/event/get-all-events/')) {
    // The events page expects data.data.featured / upcoming / by_game shape.
    const byGame = mockEvents.reduce((acc, e) => {
      const key = (e.game || 'general').toLowerCase();
      acc[key] = acc[key] || [];
      acc[key].push(e);
      return acc;
    }, {});
    return successResponse({
      events: applyQueryParams(mockEvents, searchParams),
      featured: mockEvents.slice(0, 3),
      upcoming: mockEvents.filter((e) => e.status === 'upcoming'),
      by_game: byGame,
    });
  }

  const viewMatch = matchPath('/event/view-event/:id', pathname) ||
    matchPath('/event/view-event/:id/', pathname);
  if (method === 'GET' && viewMatch) {
    const event = mockEvents.find((e) => e.id === viewMatch.id) || mockEvents[0];
    return successResponse({ event });
  }

  const prizesMatch = matchPath('/event/prizes/:id', pathname) ||
    matchPath('/event/prizes/:id/', pathname);
  if (method === 'GET' && prizesMatch) {
    return successResponse({ prizes: [] });
  }

  if (method === 'POST' && pathname.endsWith('/event/create-event/')) {
    return successResponse({ event: { id: `new_evt_${Date.now()}`, ...body } });
  }

  // ── Ticketing ──
  const ticketTypesMatch = matchPath('/event/:id/ticket-types/', pathname) ||
    matchPath('/event/:id/ticket-types', pathname);
  if (method === 'GET' && ticketTypesMatch) {
    const evt = mockEvents.find((e) => e.id === ticketTypesMatch.id) || mockEvents[0];
    return successResponse({
      event_id: ticketTypesMatch.id,
      event_name: evt?.name,
      ticket_types: mockTicketTypes,
    });
  }

  if (method === 'GET' && pathname.endsWith('/event/my-tickets/')) {
    return successResponse({ tickets: mockTickets });
  }

  const buyTicketMatch = matchPath('/event/:id/buy-ticket/', pathname) ||
    matchPath('/event/:id/buy-ticket', pathname);
  if (method === 'POST' && buyTicketMatch) {
    const id = `tkt_${Date.now()}`;
    const tier = (body && body.tier) || 'General Admission';
    const qty = Number((body && body.qty) || 1);
    const price = Number((body && body.price) || 2500);
    return successResponse({
      ticket_id: id,
      event_id: buyTicketMatch.id,
      tier,
      qty,
      total: price * qty,
      qr_code: `VENT-TKT-${Date.now()}`,
      new_balance: Math.max(mockUser.wallet_balance - price * qty, 0),
    });
  }

  // ── Vendor shops ──
  const vendorsMatch = matchPath('/event/:id/vendors/', pathname) ||
    matchPath('/event/:id/vendors', pathname);
  if (method === 'GET' && vendorsMatch) {
    return successResponse({
      event_id: vendorsMatch.id,
      vendors: mockVendors.map((v) => ({ ...v, event_id: vendorsMatch.id })),
    });
  }

  const vendorDetailMatch = matchPath('/event/:id/vendor/:vid/', pathname) ||
    matchPath('/event/:id/vendor/:vid', pathname);
  if (method === 'GET' && vendorDetailMatch) {
    const vendor = mockVendors.find((v) => v.id === vendorDetailMatch.vid) || mockVendors[0];
    return successResponse({
      event_id: vendorDetailMatch.id,
      vendor: { ...vendor, event_id: vendorDetailMatch.id },
    });
  }

  // Generic /event/* fallback — list returns all, anything else returns empty.
  if (pathname.startsWith('/event/')) {
    return successResponse({ events: mockEvents });
  }

  return null;
};

// ── Wager system ──
const handleWagerRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/wager/')) return null;

  if (method === 'GET' && pathname.endsWith('/wager/markets/')) {
    return successResponse({ markets: applyQueryParams(mockWagerMarkets, searchParams) });
  }

  if (method === 'GET' && pathname.endsWith('/wager/my-bets/')) {
    return successResponse({ bets: mockMyBets.filter((b) => b.status === 'active') });
  }

  if (method === 'GET' && pathname.endsWith('/wager/history/')) {
    return successResponse({ bets: mockMyBets.filter((b) => b.status !== 'active') });
  }

  if (method === 'GET' && pathname.endsWith('/wager/leaderboard/')) {
    return successResponse({ leaderboard: mockLeaderboard });
  }

  if (method === 'POST' && pathname.endsWith('/wager/place-bet/')) {
    const selections = (body && body.selections) || [];
    const stake = Number((body && body.stake) || 0);
    const combinedOdds = selections.reduce((acc, s) => acc * Number(s.odds || 1), 1);
    return successResponse({
      bet_id: `bet_${Date.now()}`,
      stake,
      combined_odds: Math.round(combinedOdds * 100) / 100,
      potential_payout: Math.round(stake * combinedOdds),
      new_balance: Math.max(mockUser.wallet_balance - stake, 0),
    });
  }

  if (method === 'POST' && pathname.endsWith('/wager/cash-out/')) {
    const betId = (body && body.bet_id) || '';
    const bet = mockMyBets.find((b) => b.id === betId);
    return successResponse({
      bet_id: betId,
      cashed_out: true,
      payout: bet ? bet.cash_out_value || Math.round(bet.stake * 1.1) : 0,
    });
  }

  return null;
};

// Mutate-in-place helper used by team / invite / request handlers. Defined
// here at the top so the team route handlers below can reference it.
const _spliceById = (arr, id) => {
  const idx = arr.findIndex((x) => x.id === id);
  if (idx >= 0) arr.splice(idx, 1);
  return idx >= 0;
};

const handleTeamRoutes = async ({ method, pathname, searchParams, body }) => {
  // Match both /teams/* (legacy) and /team/* (Django convention) prefixes.
  if (!pathname.startsWith('/teams/') && !pathname.startsWith('/team/')) return null;

  const parts = pathname.split('/').filter(Boolean);

  // Build a richer team payload with members, tournaments and events for the
  // team-profile tabs. Cached on first access so mutations (kick/promote)
  // persist across renders.
  const _expandTeam = (team) => {
    if (!team) return null;
    if (team._expanded) return team;
    const owner = {
      user_id: mockUser.id,
      username: mockUser.username,
      full_name: mockUser.full_name,
      profile_pic: mockUser.profile_picture,
      role: 'owner',
      joined_at: team.founded,
      win_rate: 0.62,
    };
    const fillerNames = ['Tunde A.', 'Bolaji O.', 'Chika M.', 'Femi K.', 'Sade R.', 'Ifeoma J.', 'Kunle B.', 'Wale T.', 'Damilola E.'];
    const memberCount = Math.max(2, team.member_count || 5);
    const members = [owner];
    for (let i = 1; i < memberCount; i += 1) {
      members.push({
        user_id: `${team.id}_m_${i}`,
        username: `${team.tag.toLowerCase()}_${i}`,
        full_name: fillerNames[(i - 1) % fillerNames.length],
        profile_pic: `https://i.pravatar.cc/200?img=${(20 + i + parts.indexOf(team.id)) % 70}`,
        role: i === 1 ? 'captain' : i === 2 ? 'manager' : 'member',
        joined_at: team.founded,
        win_rate: 0.4 + ((i * 7) % 30) / 100,
      });
    }
    const tournaments = mockTournaments.slice(0, 6).map((t, i) => ({
      id: t.id,
      name: t.name,
      game: t.game,
      banner: t.banner_image,
      placement: i === 0 ? '1st' : i === 1 ? '2nd' : i < 4 ? `${i + 1}th` : 'Group Stage',
      prize_won: i === 0 ? t.prize_pool : i === 1 ? Math.floor(t.prize_pool / 2) : 0,
      date: t.start_date,
      status: t.status,
    }));
    const events = mockEvents.slice(0, 4).map((e, i) => ({
      id: e.id,
      name: e.name,
      type: e.event_type,
      banner: e.banner_image,
      location: e.location,
      role: i === 0 ? 'Hosted' : 'Attended',
      date: e.start_date,
      status: e.status,
    }));
    const winRateByMonth = Array.from({ length: 6 }).map((_, i) => ({
      month: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'][i],
      win_rate: 0.45 + Math.sin(i + (parts.indexOf(team.id) || 0)) * 0.15 + 0.1,
    }));
    const totalGames = (team.tournaments_played || 12) * 4;
    const wins = (team.tournaments_won || 0) * 6 + Math.floor(totalGames / 2);
    const losses = totalGames - wins;
    return Object.assign({}, team, {
      _expanded: true,
      bio: team.bio,
      core_game: team.game,
      region: ['Nigeria', 'Ghana', 'Kenya', 'South Africa'][parts.indexOf(team.id) % 4] || 'Nigeria',
      max_members: 10,
      open_to_join: team.is_accepting_members,
      password_protected: false,
      social_links: {
        twitter: `https://twitter.com/${team.tag.toLowerCase()}`,
        instagram: `https://instagram.com/${team.tag.toLowerCase()}`,
        discord: `https://discord.gg/${team.tag.toLowerCase()}`,
        twitch: `https://twitch.tv/${team.tag.toLowerCase()}`,
        youtube: '',
        facebook: '',
      },
      organizer: { id: 'org_v_ent', name: 'Vermillion Encore' },
      owner,
      members,
      tournaments,
      events,
      stats: {
        wins,
        losses,
        win_rate: totalGames === 0 ? 0 : wins / totalGames,
        total_games: totalGames,
        total_prize_pool: tournaments.reduce((s, t) => s + (t.prize_won || 0), 0),
        rank: 50 + parts.indexOf(team.id) * 7,
        tournaments_played: team.tournaments_played || 12,
        tournaments_won: team.tournaments_won || 0,
        events_attended: events.length,
        win_rate_by_month: winRateByMonth,
        most_played_games: [
          { game: team.game, count: 18 },
          { game: 'FIFA', count: 9 },
          { game: 'PUBG Mobile', count: 6 },
          { game: 'Call of Duty Mobile', count: 4 },
        ],
      },
    });
  };

  // GET /team/get-all-teams/ or /teams/list/ or /teams/
  if (
    method === 'GET' &&
    (pathname.endsWith('/get-all-teams/') ||
      pathname.endsWith('/list/') ||
      pathname === '/team/' || pathname === '/teams/')
  ) {
    let list = applyQueryParams(mockTeams, searchParams);

    const tab = searchParams.get('tab');
    const game = searchParams.get('game');
    const region = searchParams.get('region');
    const openToJoin = searchParams.get('open_to_join');
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    if (tab === 'owned') {
      list = list.filter((t) => t.owner?.id === mockUser.id);
    } else if (tab === 'joined') {
      list = list.filter((_, i) => i % 2 === 0 && i !== 0); // simulate user joined teams
    } else if (tab === 'invited') {
      const invitedTeamIds = new Set(mockTeamInvites.map((inv) => inv.team.id));
      list = list.filter((t) => invitedTeamIds.has(t.id));
    }

    if (game) list = list.filter((t) => (t.game || '').toLowerCase() === game.toLowerCase());
    if (region) {
      list = list.filter((t, i) => {
        const r = ['Nigeria', 'Ghana', 'Kenya', 'South Africa'][i % 4] || 'Nigeria';
        return r.toLowerCase() === region.toLowerCase();
      });
    }
    if (openToJoin === 'yes') list = list.filter((t) => t.is_accepting_members);
    else if (openToJoin === 'no') list = list.filter((t) => !t.is_accepting_members);
    if (search) list = list.filter((t) => (t.name || '').toLowerCase().includes(search) || (t.tag || '').toLowerCase().includes(search));

    return successResponse({ teams: list, total: list.length });
  }

  // GET /team/get-user-teams/
  if (method === 'GET' && pathname.endsWith('/get-user-teams/')) {
    return successResponse({ teams: mockTeams.slice(0, 3) });
  }

  // GET /team/my-teams/ — teams the user owns or belongs to (registration
  // picker). Emits every field-name variant the real serializer produces
  // (teams-map §3.1) so the FE's `a || b || c` fallbacks all resolve.
  if (method === 'GET' && pathname.endsWith('/team/my-teams/')) {
    const mine = mockTeams.slice(0, 3).map((t) => ({
      id: t.id,
      name: t.name,
      tag: t.tag,
      logo: t.logo,
      logo_url: t.logo,
      team_logo: t.team_logo || t.logo,
      image: t.logo,
      banner: t.banner,
      game: t.game,
      core_game: t.game,
      member_count: t.member_count,
      members: t.member_count,
      is_accepting_members: t.is_accepting_members,
      open_to_join: t.is_accepting_members,
      owner: t.owner,
    }));
    return successResponse({ my_teams: mine, teams: mine });
  }

  // GET /team/view-team/:id/  or  /team/:id/
  const viewMatch = matchPath('/team/view-team/:id/', pathname) || matchPath('/teams/view-team/:id/', pathname);
  if (method === 'GET' && viewMatch) {
    const team = _expandTeam(mockTeams.find((t) => t.id === viewMatch.id) || mockTeams[0]);
    return successResponse({ team });
  }

  // GET /team/tournaments/:id/
  const tmtMatch = matchPath('/team/tournaments/:id/', pathname);
  if (method === 'GET' && tmtMatch) {
    const team = _expandTeam(mockTeams.find((t) => t.id === tmtMatch.id) || mockTeams[0]);
    return successResponse({ tournaments: team.tournaments });
  }

  // GET /team/events/:id/
  const evtMatch = matchPath('/team/events/:id/', pathname);
  if (method === 'GET' && evtMatch) {
    const team = _expandTeam(mockTeams.find((t) => t.id === evtMatch.id) || mockTeams[0]);
    return successResponse({ events: team.events });
  }

  // GET /team/join-requests/:id/
  const reqListMatch = matchPath('/team/join-requests/:id/', pathname);
  if (method === 'GET' && reqListMatch) {
    return successResponse({
      requests: mockJoinRequests,
      invites_sent: mockTeamInvites,
    });
  }

  // POST /team/create-team/
  if (method === 'POST' && pathname.endsWith('/create-team/')) {
    const newId = `team_new_${Date.now()}`;
    const t = {
      id: newId,
      name: body?.name || 'New Team',
      tag: (body?.name || 'NEW').slice(0, 3).toUpperCase(),
      logo: body?.logo_url || `https://i.pravatar.cc/200?img=42`,
      banner: body?.banner_url || `https://picsum.photos/seed/v-ent-team-new/800/240`,
      team_logo: body?.logo_url || `https://i.pravatar.cc/200?img=42`,
      team_banner: body?.banner_url || `https://picsum.photos/seed/v-ent-team-new/800/240`,
      game: body?.core_game || 'FIFA',
      bio: body?.bio || '',
      founded: new Date().toISOString(),
      owner: { id: mockUser.id, username: mockUser.username },
      member_count: 1,
      tournaments_won: 0,
      tournaments_played: 0,
      is_accepting_members: body?.open_to_join !== false,
    };
    mockTeams.push(t);
    return successResponse({ team: t, id: newId });
  }

  // PATCH /team/edit-team/:id/
  const editMatch = matchPath('/team/edit-team/:id/', pathname);
  if ((method === 'PATCH' || method === 'POST') && editMatch) {
    const team = mockTeams.find((t) => t.id === editMatch.id);
    if (team) Object.assign(team, body || {});
    return successResponse({ team });
  }

  // POST /team/request-join/:id/
  const joinMatch = matchPath('/team/request-join/:id/', pathname);
  if (method === 'POST' && joinMatch) {
    return successResponse({ id: `jreq_${Date.now()}`, status: 'pending', team_id: joinMatch.id });
  }

  // POST /team/leave/:id/
  const leaveMatch = matchPath('/team/leave/:id/', pathname);
  if (method === 'POST' && leaveMatch) {
    return successResponse({ id: leaveMatch.id, left: true });
  }

  // POST /team/accept-request/:id/
  const acceptReqMatch = matchPath('/team/accept-request/:id/', pathname);
  if (method === 'POST' && acceptReqMatch) {
    _spliceById(mockJoinRequests, acceptReqMatch.id);
    return successResponse({ id: acceptReqMatch.id, accepted: true });
  }

  // POST/DELETE /team/reject-request/:id/
  const rejectReqMatch = matchPath('/team/reject-request/:id/', pathname);
  if ((method === 'POST' || method === 'DELETE') && rejectReqMatch) {
    _spliceById(mockJoinRequests, rejectReqMatch.id);
    return successResponse({ id: rejectReqMatch.id, rejected: true });
  }

  // POST /team/promote-member/  body: { team_id, user_id, role }
  if (method === 'POST' && (pathname.endsWith('/team/promote-member/') || pathname.endsWith('/team/assign-role/'))) {
    return successResponse({ user_id: body?.user_id, role: body?.role || 'manager', updated: true });
  }

  // DELETE/POST /team/kick-member/  body: { team_id, user_id }
  if ((method === 'DELETE' || method === 'POST') && (pathname.endsWith('/team/kick-member/') || pathname.endsWith('/team/remove-member/'))) {
    return successResponse({ user_id: body?.user_id, removed: true });
  }

  // PATCH /team/membership-settings/:id/
  const memMatch = matchPath('/team/membership-settings/:id/', pathname);
  if ((method === 'PATCH' || method === 'POST') && memMatch) {
    const team = mockTeams.find((t) => t.id === memMatch.id);
    if (team) Object.assign(team, body || {});
    return successResponse({ team });
  }

  // POST /team/transfer-ownership/
  if (method === 'POST' && pathname.endsWith('/team/transfer-ownership/')) {
    return successResponse({ transferred: true });
  }

  // Legacy fallthroughs
  if (parts.length === 1 || (parts.length === 2 && parts[1] === 'list')) {
    return successResponse({ teams: applyQueryParams(mockTeams, searchParams) });
  }
  if (parts.length === 2) {
    const team = mockTeams.find((t) => t.id === parts[1]) || mockTeams[0];
    return successResponse({ team });
  }
  return successResponse({ teams: mockTeams });
};

const handleAdminRoutes = async ({ method, pathname, searchParams, body }) => {
  // ── Login (admin) ──
  if (method === 'POST' && pathname.endsWith('/admin/auth/login/')) {
    const { email, password, code } = body || {};
    if (!email || !password) {
      return errorResponse('Email and password are required.', 400);
    }
    if (code && String(code).length !== 6) {
      return errorResponse('Invalid 2FA code.', 400);
    }
    return successResponse({
      session_token: 'mock_admin_session_token',
      admin: {
        id: 'admin_super_001',
        username: 'superadmin',
        email,
        role: 'super',
        role_label: 'Super Admin',
        is_staff: true,
        avatar_initials: 'SA',
      },
    });
  }

  // ── Hero KPI strip ──
  if (method === 'GET' && pathname.endsWith('/admin/kpis/')) {
    return successResponse(mockAdminHeroKpis);
  }

  // ── Charts data (30-day) ──
  if (method === 'GET' && pathname.endsWith('/admin/charts/')) {
    return successResponse({ timeline: mockAdminCharts });
  }

  // ── Recent activity (last 24h) ──
  if (method === 'GET' && pathname.endsWith('/admin/recent-activity/')) {
    return successResponse({ activity: mockAdminRecentActivity() });
  }

  // ── Notifications panel ──
  if (method === 'GET' && pathname.endsWith('/admin/notifications/')) {
    return successResponse({ notifications: mockAdminNotifications });
  }
  if (method === 'POST' && pathname.endsWith('/admin/notifications/mark-all-read/')) {
    mockAdminNotifications.forEach((n) => { n.unread = false; });
    return successResponse({ ok: true });
  }

  // ── Legacy: metrics endpoint still supported ──
  if (method === 'GET' && pathname.endsWith('/admin/metrics/')) {
    return successResponse({ ...mockAdminMetrics, ...mockAdminHeroKpis });
  }

  // ── Users list with country/status/search/role filter + pagination ──
  if (method === 'GET' && pathname.endsWith('/admin/users/')) {
    let list = [...mockAdminUsersExtended];
    const q = (searchParams.get('search') || '').toLowerCase();
    if (q) list = list.filter((u) =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q)
    );
    const status = searchParams.get('status');
    if (status) list = list.filter((u) => u.status === status);
    const country = searchParams.get('country');
    if (country) list = list.filter((u) => u.country === country);
    const role = searchParams.get('role');
    if (role) list = list.filter((u) => u.role === role);
    const total = list.length;
    const ordered = applyQueryParams(list, searchParams);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '50', 10);
    const start = (page - 1) * pageSize;
    return successResponse({ results: ordered.slice(start, start + pageSize), count: total });
  }

  // ── User detail ──
  const userDetail = matchPath('/admin/users/:id/', pathname);
  if (method === 'GET' && userDetail) {
    const detail = mockAdminUserActivity(userDetail.id);
    return successResponse(detail);
  }

  // ── User ban / unban / suspend ──
  const userBan = matchPath('/admin/users/:id/ban/', pathname);
  if (method === 'POST' && userBan) {
    const u = mockAdminUsersExtended.find((x) => x.id === userBan.id);
    const patch = { status: 'banned', is_active: false, ban_reason: body?.reason || 'TOS violation' };
    if (u) Object.assign(u, patch);
    persistAdminMutation('user', userBan.id, patch);
    prependAuditEntry({
      action: 'user_banned',
      description: `User ${u?.username || userBan.id} was banned (${body?.reason || 'TOS violation'})`,
      target_type: 'user',
      target_id: userBan.id,
    });
    return successResponse({ id: userBan.id, status: 'banned' });
  }

  const userUnban = matchPath('/admin/users/:id/unban/', pathname);
  if (method === 'POST' && userUnban) {
    const u = mockAdminUsersExtended.find((x) => x.id === userUnban.id);
    const patch = { status: 'active', is_active: true, ban_reason: null };
    if (u) Object.assign(u, patch);
    persistAdminMutation('user', userUnban.id, patch);
    prependAuditEntry({
      action: 'user_unbanned',
      description: `User ${u?.username || userUnban.id} was unbanned`,
      target_type: 'user',
      target_id: userUnban.id,
    });
    return successResponse({ id: userUnban.id, status: 'active' });
  }

  const userSuspend = matchPath('/admin/users/:id/suspend/', pathname);
  if (method === 'POST' && userSuspend) {
    const u = mockAdminUsersExtended.find((x) => x.id === userSuspend.id);
    if (u) {
      u.status = 'suspended';
      u.is_active = false;
      u.suspension_reason = body?.reason || 'Pending review';
    }
    prependAuditEntry({
      action: 'user_banned',
      description: `User ${u?.username || userSuspend.id} suspended`,
      target_type: 'user',
      target_id: userSuspend.id,
    });
    return successResponse({ id: userSuspend.id, status: 'suspended' });
  }

  const userRole = matchPath('/admin/users/:id/role/', pathname);
  if (method === 'POST' && userRole) {
    const u = mockAdminUsersExtended.find((x) => x.id === userRole.id);
    if (u) {
      u.role = body?.role || 'user';
      u.is_staff = body?.role === 'admin';
    }
    prependAuditEntry({
      action: 'role_changed',
      description: `Role for ${u?.username || userRole.id} changed to ${body?.role}`,
      target_type: 'user',
      target_id: userRole.id,
    });
    return successResponse({ id: userRole.id, role: body?.role });
  }

  // ── Bulk users action ──
  if (method === 'POST' && pathname.endsWith('/admin/users/bulk/')) {
    const { action, ids } = body || {};
    (ids || []).forEach((id) => {
      const u = mockAdminUsersExtended.find((x) => x.id === id);
      if (!u) return;
      if (action === 'ban') { u.status = 'banned'; u.is_active = false; }
      if (action === 'unban') { u.status = 'active'; u.is_active = true; }
    });
    prependAuditEntry({
      action: action === 'ban' ? 'user_banned' : 'user_unbanned',
      description: `Bulk ${action}: ${(ids || []).length} users`,
      target_type: 'user',
      target_id: 'bulk',
    });
    return successResponse({ ok: true, count: (ids || []).length });
  }

  // ── Tournaments admin list ──
  if (method === 'GET' && pathname.endsWith('/admin/tournaments/')) {
    let list = [...mockAdminTournaments];
    const q = (searchParams.get('search') || '').toLowerCase();
    if (q) list = list.filter((t) =>
      (t.name || '').toLowerCase().includes(q) ||
      (t.organizer_username || '').toLowerCase().includes(q)
    );
    const status = searchParams.get('status');
    if (status) list = list.filter((t) => t.status === status);
    const total = list.length;
    const ordered = applyQueryParams(list, searchParams);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '50', 10);
    const start = (page - 1) * pageSize;
    return successResponse({ results: ordered.slice(start, start + pageSize), count: total });
  }

  // ── Tournament cancel / score override / disqualify ──
  const tCancel = matchPath('/admin/tournaments/:id/cancel/', pathname);
  if (method === 'POST' && tCancel) {
    const t = mockAdminTournaments.find((x) => x.id === tCancel.id);
    if (t) t.status = 'cancelled';
    prependAuditEntry({
      action: 'tournament_cancelled',
      description: `Tournament "${t?.name || tCancel.id}" cancelled`,
      target_type: 'tournament',
      target_id: tCancel.id,
    });
    return successResponse({ id: tCancel.id, status: 'cancelled' });
  }

  const tOverride = matchPath('/admin/tournaments/:id/override-score/', pathname);
  if (method === 'POST' && tOverride) {
    const t = mockAdminTournaments.find((x) => x.id === tOverride.id);
    prependAuditEntry({
      action: 'config_changed',
      description: `Score overridden for "${t?.name || tOverride.id}" Match ${body?.match_id || '?'}`,
      target_type: 'tournament',
      target_id: tOverride.id,
    });
    return successResponse({ id: tOverride.id, ok: true });
  }

  const tDisqualify = matchPath('/admin/tournaments/:id/disqualify/', pathname);
  if (method === 'POST' && tDisqualify) {
    const t = mockAdminTournaments.find((x) => x.id === tDisqualify.id);
    prependAuditEntry({
      action: 'tournament_cancelled',
      description: `Team "${body?.team_name || 'unknown'}" disqualified from "${t?.name || tDisqualify.id}"`,
      target_type: 'tournament',
      target_id: tDisqualify.id,
    });
    return successResponse({ id: tDisqualify.id, ok: true });
  }

  // ── Audit log paged + filterable ──
  if (method === 'GET' && pathname.endsWith('/admin/audit-log/')) {
    let list = [...mockAdminAuditFeed];
    const q = (searchParams.get('search') || '').toLowerCase();
    if (q) list = list.filter((a) =>
      (a.description || '').toLowerCase().includes(q) ||
      (a.admin_username || '').toLowerCase().includes(q)
    );
    const action = searchParams.get('action');
    if (action) list = list.filter((a) => a.action === action);
    const adminUsername = searchParams.get('admin_username');
    if (adminUsername) list = list.filter((a) => a.admin_username === adminUsername);
    const dateFrom = searchParams.get('date_from');
    if (dateFrom) list = list.filter((a) => new Date(a.created_at) >= new Date(dateFrom));
    const dateTo = searchParams.get('date_to');
    if (dateTo) list = list.filter((a) => new Date(a.created_at) <= new Date(dateTo + 'T23:59:59'));
    const total = list.length;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '50', 10);
    const start = (page - 1) * pageSize;
    return successResponse({ results: list.slice(start, start + pageSize), count: total });
  }

  // ── Payouts list + actions ──
  if (method === 'GET' && pathname.endsWith('/admin/payouts/')) {
    let list = [...mockAdminPayouts];
    const q = (searchParams.get('search') || '').toLowerCase();
    if (q) list = list.filter((p) =>
      (p.username || '').toLowerCase().includes(q) ||
      (p.bank_name || '').toLowerCase().includes(q)
    );
    const status = searchParams.get('status');
    if (status) list = list.filter((p) => p.status === status);
    const total = list.length;
    const ordered = applyQueryParams(list, searchParams);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '50', 10);
    const start = (page - 1) * pageSize;
    return successResponse({ results: ordered.slice(start, start + pageSize), count: total });
  }

  const payoutApprove = matchPath('/admin/payouts/:id/approve/', pathname);
  if (method === 'POST' && payoutApprove) {
    const p = mockAdminPayouts.find((x) => x.id === payoutApprove.id);
    if (p) p.status = 'approved';
    persistAdminMutation('payout', payoutApprove.id, { status: 'approved' });
    prependAuditEntry({
      action: 'payout_approved',
      description: `Payout of ₦${p ? Number(p.amount_ngn).toLocaleString() : '?'} approved for ${p?.username || payoutApprove.id}`,
      target_type: 'payout',
      target_id: payoutApprove.id,
    });
    return successResponse({ id: payoutApprove.id, status: 'approved' });
  }

  const payoutReject = matchPath('/admin/payouts/:id/reject/', pathname);
  if (method === 'POST' && payoutReject) {
    const p = mockAdminPayouts.find((x) => x.id === payoutReject.id);
    if (p) p.status = 'rejected';
    persistAdminMutation('payout', payoutReject.id, { status: 'rejected' });
    prependAuditEntry({
      action: 'payout_rejected',
      description: `Payout for ${p?.username || payoutReject.id} rejected — ${body?.reason || 'Unspecified'}`,
      target_type: 'payout',
      target_id: payoutReject.id,
    });
    return successResponse({ id: payoutReject.id, status: 'rejected' });
  }

  // ── Bulk approve payouts ──
  if (method === 'POST' && pathname.endsWith('/admin/payouts/bulk-approve/')) {
    const { ids } = body || {};
    (ids || []).forEach((id) => {
      const p = mockAdminPayouts.find((x) => x.id === id);
      if (p) p.status = 'approved';
    });
    prependAuditEntry({
      action: 'payout_approved',
      description: `Bulk approved ${(ids || []).length} payouts`,
      target_type: 'payout',
      target_id: 'bulk',
    });
    return successResponse({ ok: true, count: (ids || []).length });
  }

  // ── KYC list + actions ──
  if (method === 'GET' && pathname.endsWith('/admin/kyc/')) {
    let list = [...mockAdminKycDocs];
    const status = searchParams.get('status');
    if (status) list = list.filter((k) => k.status === status);
    const total = list.length;
    return successResponse({ results: list, count: total });
  }

  const kycApprove = matchPath('/admin/kyc/:id/approve/', pathname);
  if (method === 'POST' && kycApprove) {
    const k = mockAdminKycDocs.find((x) => x.id === kycApprove.id);
    const patch = { status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: 'superadmin' };
    if (k) Object.assign(k, patch);
    persistAdminMutation('kyc', kycApprove.id, patch);
    prependAuditEntry({
      action: 'kyc_approved',
      description: `KYC approved for ${k?.username || kycApprove.id}`,
      target_type: 'kyc',
      target_id: kycApprove.id,
    });
    return successResponse({ id: kycApprove.id, status: 'approved' });
  }

  const kycReject = matchPath('/admin/kyc/:id/reject/', pathname);
  if (method === 'POST' && kycReject) {
    const k = mockAdminKycDocs.find((x) => x.id === kycReject.id);
    const patch = { status: 'rejected', reviewed_at: new Date().toISOString(), rejection_reason: body?.reason || 'Document unclear' };
    if (k) Object.assign(k, patch);
    persistAdminMutation('kyc', kycReject.id, patch);
    prependAuditEntry({
      action: 'kyc_rejected',
      description: `KYC rejected for ${k?.username || kycReject.id} — ${body?.reason || 'Document unclear'}`,
      target_type: 'kyc',
      target_id: kycReject.id,
    });
    return successResponse({ id: kycReject.id, status: 'rejected' });
  }

  // ── Settings ──
  if (method === 'GET' && pathname.endsWith('/admin/settings/')) {
    return successResponse(mockAdminPlatformSettings);
  }
  if (method === 'POST' && pathname.endsWith('/admin/settings/')) {
    Object.assign(mockAdminPlatformSettings, body || {});
    prependAuditEntry({
      action: 'config_changed',
      description: `Platform settings updated`,
      target_type: 'system',
      target_id: 'settings',
    });
    return successResponse(mockAdminPlatformSettings);
  }

  return null;
};

const handleOrganizationRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/organization/')) return null;

  // GET /organization/list/
  if (method === 'GET' && (pathname.endsWith('/organization/list/') || pathname.endsWith('/organization/list'))) {
    let list = [...mockOrganizations];
    const q = (searchParams.get('q') || searchParams.get('search') || '').toLowerCase();
    if (q) {
      list = list.filter((o) =>
        (o.name || '').toLowerCase().includes(q) ||
        (o.tag || '').toLowerCase().includes(q) ||
        (o.bio || '').toLowerCase().includes(q)
      );
    }
    const region = searchParams.get('region');
    if (region) list = list.filter((o) => o.region === region);
    const focus = searchParams.get('focus');
    if (focus) list = list.filter((o) => o.focus === focus);
    if (searchParams.get('verified') === 'true') list = list.filter((o) => o.verified);
    return successResponse({
      organizations: applyQueryParams(list, searchParams),
      total: list.length,
    });
  }

  // POST /organization/create/
  if (method === 'POST' && (pathname.endsWith('/organization/create/') || pathname.endsWith('/organization/create'))) {
    const newId = `new_org_${Date.now()}`;
    const newOrg = {
      id: newId,
      member_count: 1,
      team_count: 0,
      tournaments_hosted: 0,
      total_tournaments_hosted: 0,
      events_hosted: 0,
      prize_pool_awarded_vc: 0,
      total_prize_pool: 0,
      verified: false,
      logo: 'https://i.pravatar.cc/200?img=70',
      banner: 'https://picsum.photos/seed/v-ent-org-new/1200/400',
      ...body,
    };
    return successResponse({ id: newId, organization: newOrg });
  }

  // GET /organization/:id/members/
  const membersMatch = matchPath('/organization/:id/members/', pathname) ||
    matchPath('/organization/:id/members', pathname);
  if (method === 'GET' && membersMatch) {
    const orgId = membersMatch.id;
    const list = mockOrgMembers.filter((m) => m.org_id === orgId);
    return successResponse({ members: list.length ? list : mockOrgMembers });
  }

  // GET /organization/:id/requests/
  const requestsMatch = matchPath('/organization/:id/requests/', pathname) ||
    matchPath('/organization/:id/requests', pathname);
  if (method === 'GET' && requestsMatch) {
    const orgId = requestsMatch.id;
    const list = mockOrgJoinRequests.filter((r) => r.org_id === orgId);
    return successResponse({ requests: list.length ? list : mockOrgJoinRequests });
  }

  // POST /organization/:id/apply/
  const applyMatch = matchPath('/organization/:id/apply/', pathname);
  if (method === 'POST' && applyMatch) {
    return successResponse({ status: 'pending', message: 'Application submitted.' });
  }

  // POST /organization/:id/follow/
  const followMatch = matchPath('/organization/:id/follow/', pathname);
  if (method === 'POST' && followMatch) {
    return successResponse({ following: true });
  }

  // POST /organization/:id/promote/  body { user_id, role }
  const promoteMatch = matchPath('/organization/:id/promote/', pathname);
  if (method === 'POST' && promoteMatch) {
    return successResponse({ user_id: body?.user_id, role: body?.role });
  }

  // POST /organization/:id/kick/  body { user_id }
  const kickMatch = matchPath('/organization/:id/kick/', pathname);
  if (method === 'POST' && kickMatch) {
    return successResponse({ user_id: body?.user_id, removed: true });
  }

  // POST /organization/:id/approve-request/  body { request_id, role }
  const approveMatch = matchPath('/organization/:id/approve-request/', pathname);
  if (method === 'POST' && approveMatch) {
    return successResponse({ request_id: body?.request_id, status: 'approved' });
  }

  // POST /organization/:id/reject-request/  body { request_id }
  const rejectMatch = matchPath('/organization/:id/reject-request/', pathname);
  if (method === 'POST' && rejectMatch) {
    return successResponse({ request_id: body?.request_id, status: 'rejected' });
  }

  // POST /organization/:id/request-verification/
  const verifyMatch = matchPath('/organization/:id/request-verification/', pathname);
  if (method === 'POST' && verifyMatch) {
    return successResponse({ status: 'submitted', message: 'Verification request received.' });
  }

  // GET /organization/:id/teams/
  const teamsMatch = matchPath('/organization/:id/teams/', pathname);
  if (method === 'GET' && teamsMatch) {
    return successResponse({ teams: mockTeams });
  }

  // GET /organization/:id/tournaments/
  const tournamentsMatch = matchPath('/organization/:id/tournaments/', pathname);
  if (method === 'GET' && tournamentsMatch) {
    return successResponse({ tournaments: mockTournaments.slice(0, 5) });
  }

  // GET /organization/:id/events/
  const eventsMatch = matchPath('/organization/:id/events/', pathname);
  if (method === 'GET' && eventsMatch) {
    return successResponse({ events: mockEvents.slice(0, 4) });
  }

  // GET /organization/:id/activity/
  const activityMatch = matchPath('/organization/:id/activity/', pathname) ||
    matchPath('/organization/:id/activity', pathname);
  if (method === 'GET' && activityMatch) {
    return successResponse({ activity: mockOrgActivity });
  }

  // GET /organization/:id/
  const detailMatch = matchPath('/organization/:id/', pathname) ||
    matchPath('/organization/:id', pathname);
  if (method === 'GET' && detailMatch) {
    const organization = mockOrganizations.find((o) => o.id === detailMatch.id) || mockOrganizations[0];
    return successResponse({ organization });
  }

  // Fallback for any other organization route — empty success so pages don't crash.
  return successResponse({ organizations: mockOrganizations });
};

const handleAnimeRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/anime/')) return null;

  // GET /anime/library/
  if (method === 'GET' && (pathname.endsWith('/anime/library/') || pathname.endsWith('/anime/library'))) {
    const genre = searchParams.get('genre');
    const q = (searchParams.get('q') || '').toLowerCase();
    let list = mockManga;
    if (genre) list = list.filter((m) => m.genre === genre);
    if (q) list = list.filter(
      (m) => m.title.toLowerCase().includes(q) || m.author.toLowerCase().includes(q),
    );
    return successResponse({
      manga: applyQueryParams(list, searchParams),
      total: list.length,
    });
  }

  // GET /anime/amvs/
  if (method === 'GET' && (pathname.endsWith('/anime/amvs/') || pathname.endsWith('/anime/amvs'))) {
    const sort = searchParams.get('sort') || 'top';
    let list = [...mockAmvs];
    if (sort === 'top') list.sort((a, b) => b.votes - a.votes);
    else if (sort === 'new') list.sort((a, b) => new Date(b.published) - new Date(a.published));
    else if (sort === 'trending') list.sort((a, b) => b.views - a.views);
    return successResponse({ amvs: list });
  }

  // GET /anime/rooms/
  if (method === 'GET' && (pathname.endsWith('/anime/rooms/') || pathname.endsWith('/anime/rooms'))) {
    return successResponse({ rooms: mockCoReadRooms });
  }

  // POST /anime/rooms/create/
  if (method === 'POST' && (pathname.endsWith('/anime/rooms/create/') || pathname.endsWith('/anime/rooms/create'))) {
    const newId = `room_new_${Date.now()}`;
    return successResponse({
      room: {
        id: newId,
        manga: body?.manga || 'Untitled',
        manga_id: body?.manga_id || 'mng_0',
        chapter: body?.chapter || 1,
        active_readers: 1,
        host: { id: mockUser.id, username: mockUser.username, avatar: mockUser.profile_picture },
        started_at: new Date().toISOString(),
        topic: body?.topic || 'New room',
      },
    });
  }

  // GET /anime/battles/
  if (method === 'GET' && (pathname.endsWith('/anime/battles/') || pathname.endsWith('/anime/battles'))) {
    return successResponse({ battles: mockAnimeBattles });
  }

  // GET /anime/my-list/
  if (method === 'GET' && (pathname.endsWith('/anime/my-list/') || pathname.endsWith('/anime/my-list'))) {
    const savedManga = mockManga.filter((m) => mockAnimeMyList.saved_manga.includes(m.id));
    const watchedAmvs = mockAmvs.filter((a) => mockAnimeMyList.watched_amvs.includes(a.id));
    const bookmarkedRooms = mockCoReadRooms.filter((r) => mockAnimeMyList.bookmarked_rooms.includes(r.id));
    return successResponse({
      saved_manga: savedManga,
      watched_amvs: watchedAmvs,
      bookmarked_rooms: bookmarkedRooms,
    });
  }

  // POST /anime/my-list/add/
  if (method === 'POST' && (pathname.endsWith('/anime/my-list/add/') || pathname.endsWith('/anime/my-list/add'))) {
    return successResponse({ added: true, kind: body?.kind || 'manga', target_id: body?.target_id });
  }

  // GET /anime/manga/:id/
  const mangaMatch = matchPath('/anime/manga/:id/', pathname) ||
    matchPath('/anime/manga/:id', pathname);
  if (method === 'GET' && mangaMatch) {
    const manga = mockManga.find((m) => m.id === mangaMatch.id) || mockManga[0];
    return successResponse({ manga });
  }

  // GET /anime/amv/:id/
  const amvMatch = matchPath('/anime/amv/:id/', pathname) ||
    matchPath('/anime/amv/:id', pathname);
  if (method === 'GET' && amvMatch) {
    const amv = mockAmvs.find((a) => a.id === amvMatch.id) || mockAmvs[0];
    const related = mockAmvs.filter((a) => a.id !== amv.id).slice(0, 4);
    return successResponse({ amv, related, comments: mockAnimeComments });
  }

  // POST /anime/amv/:id/vote/
  const amvVoteMatch = matchPath('/anime/amv/:id/vote/', pathname) ||
    matchPath('/anime/amv/:id/vote', pathname);
  if (method === 'POST' && amvVoteMatch) {
    const amv = mockAmvs.find((a) => a.id === amvVoteMatch.id) || mockAmvs[0];
    return successResponse({ id: amv.id, votes: amv.votes + 1, voted: true });
  }

  // GET /anime/room/:id/
  const roomMatch = matchPath('/anime/room/:id/', pathname) ||
    matchPath('/anime/room/:id', pathname);
  if (method === 'GET' && roomMatch) {
    const room = mockCoReadRooms.find((r) => r.id === roomMatch.id) || mockCoReadRooms[0];
    const participants = Array.from({ length: room.active_readers }).map((_, i) => ({
      id: i === 0 ? room.host.id : `p_${roomMatch.id}_${i}`,
      username: i === 0 ? room.host.username : `reader_${i + 10}`,
      avatar: i === 0 ? room.host.avatar : `https://i.pravatar.cc/80?img=${10 + i * 7}`,
      is_host: i === 0,
    }));
    return successResponse({
      room,
      participants,
      chat: mockAnimeChatMessages,
    });
  }

  // Fallback for unknown anime routes
  return successResponse({});
};

const handleCommunityRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/community/')) return null;

  // GET /community/feed/
  if (method === 'GET' && (pathname.endsWith('/community/feed/') || pathname.endsWith('/community/feed'))) {
    return successResponse({ posts: applyQueryParams(mockFeedPosts, searchParams) });
  }

  // POST /community/feed/post/
  if (method === 'POST' && (pathname.endsWith('/community/feed/post/') || pathname.endsWith('/community/feed/post'))) {
    const newPost = {
      id: `p_new_${Date.now()}`,
      author: {
        id: mockUser.id,
        username: mockUser.username,
        full_name: mockUser.full_name,
        avatar: mockUser.profile_picture,
      },
      body: body?.body || '',
      image: body?.image || null,
      created_at: new Date().toISOString(),
      reactions: { like: 0, reply: 0, share: 0 },
    };
    return successResponse({ post: newPost });
  }

  // GET /community/threads/ (list) — must come BEFORE the :id match below.
  if (method === 'GET' && (pathname.endsWith('/community/threads/') || pathname.endsWith('/community/threads'))) {
    const category = searchParams.get('category');
    let list = mockThreads;
    if (category) list = list.filter((t) => t.category === category);
    return successResponse({ threads: applyQueryParams(list, searchParams) });
  }

  // POST /community/threads/:id/reply/
  const replyMatch = matchPath('/community/threads/:id/reply/', pathname) ||
    matchPath('/community/threads/:id/reply', pathname);
  if (method === 'POST' && replyMatch) {
    const reply = {
      id: `r_new_${Date.now()}`,
      author: {
        id: mockUser.id,
        username: mockUser.username,
        full_name: mockUser.full_name,
        avatar: mockUser.profile_picture,
      },
      body: body?.body || '',
      created_at: new Date().toISOString(),
    };
    return successResponse({ reply });
  }

  // GET /community/threads/:id/
  const threadMatch = matchPath('/community/threads/:id/', pathname) ||
    matchPath('/community/threads/:id', pathname);
  if (method === 'GET' && threadMatch) {
    const thread = mockThreads.find((t) => t.id === threadMatch.id) || mockThreads[0];
    return successResponse({ thread, replies: mockThreadReplies });
  }

  // GET /community/clubs/
  if (method === 'GET' && (pathname.endsWith('/community/clubs/') || pathname.endsWith('/community/clubs'))) {
    return successResponse({ clubs: applyQueryParams(mockClubs, searchParams) });
  }

  // GET /community/dms/:id/messages/
  const messagesMatch = matchPath('/community/dms/:id/messages/', pathname) ||
    matchPath('/community/dms/:id/messages', pathname);
  if (method === 'GET' && messagesMatch) {
    return successResponse({ messages: mockDmMessages[messagesMatch.id] || [] });
  }

  // GET /community/dms/
  if (method === 'GET' && (pathname.endsWith('/community/dms/') || pathname.endsWith('/community/dms'))) {
    return successResponse({ conversations: mockConversations });
  }

  // POST /community/scrims/:id/request/
  const scrimReqMatch = matchPath('/community/scrims/:id/request/', pathname) ||
    matchPath('/community/scrims/:id/request', pathname);
  if (method === 'POST' && scrimReqMatch) {
    return successResponse({ id: scrimReqMatch.id, requested: true });
  }

  // GET /community/scrims/
  if (method === 'GET' && (pathname.endsWith('/community/scrims/') || pathname.endsWith('/community/scrims'))) {
    const game = searchParams.get('game');
    const region = searchParams.get('region');
    const size = searchParams.get('size');
    let list = mockScrims;
    if (game) list = list.filter((s) => s.game === game);
    if (region) list = list.filter((s) => s.region === region);
    if (size) list = list.filter((s) => String(s.size) === String(size));
    return successResponse({ scrims: list });
  }

  return successResponse({});
};

const handleMarketplaceRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/marketplace/')) return null;

  // GET /marketplace/listings/ — full filter/sort/tab support driven off mockListingsV2.
  if (method === 'GET' && (pathname.endsWith('/marketplace/listings/') || pathname.endsWith('/marketplace/listings'))) {
    let list = [...mockListingsV2].filter((l) => l.status === 'active');
    const tab = searchParams.get('tab') || 'all';
    if (tab === 'hot') list = list.filter((l) => l.is_hot);
    else if (tab === 'new') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (tab === 'ending_soon') list = list.filter((l) => l.is_ending_soon);
    else if (tab === 'watchlist') list = list.filter((l) => mockMarketWatchlist.includes(l.id));

    const category = searchParams.get('category');
    if (category && category !== 'all') {
      list = list.filter((l) => (l.category || '').toLowerCase() === category.toLowerCase());
    }
    const q = (searchParams.get('q') || '').toLowerCase();
    if (q) {
      list = list.filter((l) =>
        l.title.toLowerCase().includes(q) ||
        (l.description || '').toLowerCase().includes(q) ||
        (l.seller?.username || '').toLowerCase().includes(q)
      );
    }
    const minPrice = parseInt(searchParams.get('min_price') || '', 10);
    const maxPrice = parseInt(searchParams.get('max_price') || '', 10);
    if (!Number.isNaN(minPrice)) list = list.filter((l) => l.price_vc >= minPrice);
    if (!Number.isNaN(maxPrice)) list = list.filter((l) => l.price_vc <= maxPrice);
    const condition = searchParams.get('condition');
    if (condition && condition !== 'all') {
      list = list.filter((l) => l.condition === condition);
    }
    const region = searchParams.get('region');
    if (region && region !== 'all') {
      list = list.filter((l) => (l.location || '').toLowerCase() === region.toLowerCase());
    }
    if (searchParams.get('verified_only') === 'true') {
      list = list.filter((l) => l.seller?.verified);
    }

    const sort = searchParams.get('sort');
    if (sort === 'price_asc') list.sort((a, b) => a.price_vc - b.price_vc);
    else if (sort === 'price_desc') list.sort((a, b) => b.price_vc - a.price_vc);
    else if (sort === 'newest') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === 'ending_soonest') list.sort((a, b) => new Date(a.ending_at) - new Date(b.ending_at));

    // Hydrate `is_watched` so the UI can show heart state without a second call.
    list = list.map((l) => ({ ...l, is_watched: mockMarketWatchlist.includes(l.id) }));

    return successResponse({ listings: list, total: list.length });
  }

  // GET /marketplace/my-listings/  — seller dashboard (current user only).
  if (method === 'GET' && (pathname.endsWith('/marketplace/my-listings/') || pathname.endsWith('/marketplace/my-listings'))) {
    const mine = mockListingsV2.filter((l) => l.seller?.user_id === mockUser.id || l.seller?.id === mockUser.id);
    // If the demo user only owns 1 listing, surface a few extras as "mine" so the dashboard isn't empty.
    const mineFinal = mine.length >= 4 ? mine : [...mine, ...mockListingsV2.slice(1, 6).map((l) => ({
      ...l,
      seller: { ...l.seller, user_id: mockUser.id, id: mockUser.id, username: mockUser.username },
    }))];

    const orders = mockPurchases.map((p, idx) => ({
      id: p.id,
      listing: p.listing,
      buyer: p.buyer,
      price_vc: p.price_vc,
      status: ['pending', 'shipped', 'delivered', 'completed', 'pending', 'shipped'][idx % 6],
      tracking_number: p.tracking_number,
      created_at: p.created_at,
    }));

    const reviews = mineFinal.flatMap((l) => (l.reviews || []).map((r) => ({ ...r, listing_id: l.id, listing_title: l.title })));
    const revenue = mineFinal.reduce((sum, l) => sum + l.price_vc * (l.sold_count || 0), 0) + 4_250;
    const avgRating = Math.round((mineFinal.reduce((s, l) => s + (l.seller?.rating || 4.5), 0) / (mineFinal.length || 1)) * 10) / 10;
    return successResponse({
      listings: mineFinal,
      orders,
      reviews,
      stats: {
        active_listings: mineFinal.filter((l) => l.status === 'active').length,
        pending_orders: orders.filter((o) => o.status === 'pending').length,
        sold: mineFinal.reduce((s, l) => s + (l.sold_count || 0), 0) + 8,
        month_revenue_vc: Math.round(revenue * 0.4),
        revenue_vc: revenue,
        rating: avgRating,
      },
    });
  }

  // POST /marketplace/listings/create/
  if (method === 'POST' && (pathname.endsWith('/marketplace/listings/create/') || pathname.endsWith('/marketplace/listings/create'))) {
    const newId = `lstx_new_${Date.now()}`;
    const newListing = {
      id: newId,
      status: 'active',
      views: 0,
      likes: 0,
      sold_count: 0,
      seller: {
        user_id: mockUser.id,
        id: mockUser.id,
        username: mockUser.username,
        avatar: mockUser.profile_picture,
        profile_pic: mockUser.profile_picture,
        rating: 4.7,
        seller_rating: 4.7,
        sales_count: 12,
        total_sales: 12,
        verified: true,
        badges: ['verified'],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...body,
    };
    mockListingsV2.unshift(newListing);
    return successResponse({ id: newId, listing: newListing });
  }

  // POST /marketplace/listings/:id/update/
  const updateMatch = matchPath('/marketplace/listings/:id/update/', pathname) ||
    matchPath('/marketplace/listings/:id/update', pathname);
  if (method === 'POST' && updateMatch) {
    const idx = mockListingsV2.findIndex((l) => l.id === updateMatch.id);
    if (idx >= 0) mockListingsV2[idx] = { ...mockListingsV2[idx], ...body };
    return successResponse({ listing: mockListingsV2[idx] });
  }

  // POST /marketplace/listings/:id/delete/
  const deleteMatch = matchPath('/marketplace/listings/:id/delete/', pathname) ||
    matchPath('/marketplace/listings/:id/delete', pathname);
  if (method === 'POST' && deleteMatch) {
    const idx = mockListingsV2.findIndex((l) => l.id === deleteMatch.id);
    if (idx >= 0) mockListingsV2.splice(idx, 1);
    return successResponse({ deleted: true, id: deleteMatch.id });
  }

  // POST /marketplace/listings/:id/buy/  → deduct from wallet, create escrow purchase.
  const buyMatch = matchPath('/marketplace/listings/:id/buy/', pathname) ||
    matchPath('/marketplace/listings/:id/buy', pathname);
  if (method === 'POST' && buyMatch) {
    const listing = mockListingsV2.find((l) => l.id === buyMatch.id);
    if (!listing) return errorResponse('Listing not found', 404);
    const total = listing.price_vc + (listing.shipping_cost_vc || 0);
    if (mockUser.wallet_balance < total) return errorResponse('Insufficient VENT COINS balance.', 400);
    mockUser.wallet_balance -= total;
    const purchase = {
      id: `pur_new_${Date.now()}`,
      listing,
      buyer: { id: mockUser.id, username: mockUser.username },
      seller: listing.seller,
      price_vc: listing.price_vc,
      shipping_cost_vc: listing.shipping_cost_vc || 0,
      total_vc: total,
      qty: Number(body?.qty || 1),
      status: 'escrow',
      escrow_release_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      tracking_number: null,
      created_at: new Date().toISOString(),
    };
    mockPurchases.unshift(purchase);
    return successResponse({ purchase, order_id: purchase.id, new_balance: mockUser.wallet_balance });
  }

  // POST /marketplace/listings/:id/offer/  → create an offer.
  const offerMatch = matchPath('/marketplace/listings/:id/offer/', pathname) ||
    matchPath('/marketplace/listings/:id/offer', pathname);
  if (method === 'POST' && offerMatch) {
    const offer = {
      id: `offer_new_${Date.now()}`,
      listing_id: offerMatch.id,
      buyer: { id: mockUser.id, username: mockUser.username },
      amount_vc: Number(body?.amount_vc || 0),
      message: body?.message || '',
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    mockMarketOffers.unshift(offer);
    return successResponse({ offer });
  }

  // POST /marketplace/listings/:id/watch/  → toggle watchlist.
  const watchMatch = matchPath('/marketplace/listings/:id/watch/', pathname) ||
    matchPath('/marketplace/listings/:id/watch', pathname);
  if (method === 'POST' && watchMatch) {
    const idx = mockMarketWatchlist.indexOf(watchMatch.id);
    if (idx >= 0) {
      mockMarketWatchlist.splice(idx, 1);
      return successResponse({ watching: false });
    }
    mockMarketWatchlist.push(watchMatch.id);
    return successResponse({ watching: true });
  }

  // POST /marketplace/orders/:id/ship/  → seller marks order shipped.
  const shipMatch = matchPath('/marketplace/orders/:id/ship/', pathname) ||
    matchPath('/marketplace/orders/:id/ship', pathname);
  if (method === 'POST' && shipMatch) {
    const idx = mockPurchases.findIndex((p) => p.id === shipMatch.id);
    if (idx >= 0) {
      mockPurchases[idx].status = 'in_transit';
      mockPurchases[idx].tracking_number = body?.tracking_number || `VC-TRK-${Date.now().toString().slice(-6)}`;
    }
    return successResponse({ purchase: mockPurchases[idx] });
  }

  // POST /marketplace/orders/:id/refund/  → seller refunds buyer.
  const refundMatch = matchPath('/marketplace/orders/:id/refund/', pathname) ||
    matchPath('/marketplace/orders/:id/refund', pathname);
  if (method === 'POST' && refundMatch) {
    const idx = mockPurchases.findIndex((p) => p.id === refundMatch.id);
    if (idx >= 0) {
      const total = mockPurchases[idx].total_vc || mockPurchases[idx].price_vc;
      mockPurchases[idx].status = 'refunded';
      mockPurchases[idx].refund_amount_vc = total;
      mockUser.wallet_balance += total; // return funds to buyer wallet
    }
    return successResponse({ purchase: mockPurchases[idx], new_balance: mockUser.wallet_balance });
  }

  // POST /marketplace/orders/:id/confirm/  → buyer confirms receipt, escrow releases.
  const confirmMatch = matchPath('/marketplace/orders/:id/confirm/', pathname) ||
    matchPath('/marketplace/orders/:id/confirm', pathname);
  if (method === 'POST' && confirmMatch) {
    const idx = mockPurchases.findIndex((p) => p.id === confirmMatch.id);
    if (idx >= 0) mockPurchases[idx].status = 'completed';
    return successResponse({ purchase: mockPurchases[idx] });
  }

  // POST /marketplace/orders/:id/dispute/
  const disputeMatch = matchPath('/marketplace/orders/:id/dispute/', pathname) ||
    matchPath('/marketplace/orders/:id/dispute', pathname);
  if (method === 'POST' && disputeMatch) {
    const idx = mockPurchases.findIndex((p) => p.id === disputeMatch.id);
    if (idx >= 0) {
      mockPurchases[idx].status = 'disputed';
      mockPurchases[idx].dispute_reason = body?.reason || 'Item not as described';
    }
    return successResponse({ purchase: mockPurchases[idx] });
  }

  // GET /marketplace/orders/:id/  → buyer's purchase detail (escrow page).
  const orderDetailMatch = matchPath('/marketplace/orders/:id/', pathname) ||
    matchPath('/marketplace/orders/:id', pathname);
  if (method === 'GET' && orderDetailMatch) {
    const purchase = mockPurchases.find((p) => p.id === orderDetailMatch.id) || mockPurchases[0];
    return successResponse({ purchase });
  }

  // GET /marketplace/seller/:user_id/  → public seller profile.
  const sellerMatch = matchPath('/marketplace/seller/:user_id/', pathname) ||
    matchPath('/marketplace/seller/:user_id', pathname);
  if (method === 'GET' && sellerMatch) {
    // Find any listing whose seller matches; if none, fall back to the first non-self seller.
    const sample = mockListingsV2.find((l) => l.seller?.user_id === sellerMatch.user_id || l.seller?.id === sellerMatch.user_id);
    const seller = sample?.seller || mockListingsV2[1].seller;
    const sellerListings = mockListingsV2.filter((l) =>
      (l.seller?.user_id || l.seller?.id) === (seller.user_id || seller.id)
    );
    const sold = sellerListings.filter((l) => l.status === 'sold' || (l.sold_count || 0) > 0);
    const reviews = sellerListings.flatMap((l) => (l.reviews || []).map((r) => ({ ...r, listing_id: l.id, listing_title: l.title })));
    return successResponse({ seller, listings: sellerListings, sold, reviews });
  }

  // POST /marketplace/seller/:user_id/follow/
  const followMatch = matchPath('/marketplace/seller/:user_id/follow/', pathname) ||
    matchPath('/marketplace/seller/:user_id/follow', pathname);
  if (method === 'POST' && followMatch) {
    return successResponse({ following: true });
  }

  // GET /marketplace/listings/:id/  — listing detail (must come last to avoid catching action paths).
  const detailMatch = matchPath('/marketplace/listings/:id/', pathname) ||
    matchPath('/marketplace/listings/:id', pathname);
  if (method === 'GET' && detailMatch) {
    const listing = mockListingsV2.find((l) => l.id === detailMatch.id) || mockListingsV2[0];
    const enriched = { ...listing, is_watched: mockMarketWatchlist.includes(listing.id) };
    const similar = mockListingsV2
      .filter((l) => l.category === listing.category && l.id !== listing.id && l.status === 'active')
      .slice(0, 4);
    const offers = mockMarketOffers.filter((o) => o.listing_id === listing.id);
    return successResponse({ listing: enriched, similar, offers });
  }

  return successResponse({ listings: mockListingsV2 });
};

const handleShopRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/shop/')) return null;

  // GET /shop/products/ (supports ?category=)
  if (method === 'GET' && (pathname.endsWith('/shop/products/') || pathname.endsWith('/shop/products'))) {
    let list = [...mockShopProducts];
    const category = searchParams.get('category');
    if (category && category !== 'all') {
      list = list.filter((p) => p.category === category);
    }
    return successResponse({
      products: list,
      featured: mockShopProducts.filter((p) => p.featured),
      new_drops: mockShopProducts.filter((p) => p.new_drop),
      limited: mockShopProducts.filter((p) => p.limited),
    });
  }

  // GET /shop/cart/
  if (method === 'GET' && (pathname.endsWith('/shop/cart/') || pathname.endsWith('/shop/cart'))) {
    const items = mockCart.items.map((it) => {
      const product = mockShopProducts.find((p) => p.id === it.product_id) || mockShopProducts[0];
      return { ...it, product };
    });
    const subtotal_vc = items.reduce((sum, it) => sum + it.product.price_vc * it.qty, 0);
    const shipping_vc = items.length > 0 ? 5 : 0;
    return successResponse({
      items,
      subtotal_vc,
      shipping_vc,
      total_vc: subtotal_vc + shipping_vc,
      balance_vc: mockUser.wallet_balance,
    });
  }

  // POST /shop/cart/add/
  if (method === 'POST' && (pathname.endsWith('/shop/cart/add/') || pathname.endsWith('/shop/cart/add'))) {
    const productId = body?.product_id || body?.id;
    const qty = Number(body?.qty || 1);
    const variant = body?.variant || null;
    const existing = mockCart.items.find(
      (it) => it.product_id === productId && JSON.stringify(it.variant) === JSON.stringify(variant)
    );
    if (existing) existing.qty += qty;
    else mockCart.items.push({ id: `cartitem_${Date.now()}`, product_id: productId, qty, variant });
    return successResponse({ items: mockCart.items, count: mockCart.items.reduce((s, i) => s + i.qty, 0) });
  }

  // POST /shop/cart/checkout/
  if (method === 'POST' && (pathname.endsWith('/shop/cart/checkout/') || pathname.endsWith('/shop/cart/checkout'))) {
    const orderNumber = `VENT-${Date.now().toString().slice(-8)}`;
    mockCart.items = [];
    return successResponse({
      order_number: orderNumber,
      status: 'paid',
      estimated_delivery: '3–5 business days',
    });
  }

  // GET /shop/products/:id/
  const detailMatch = matchPath('/shop/products/:id/', pathname) ||
    matchPath('/shop/products/:id', pathname);
  if (method === 'GET' && detailMatch) {
    const product = mockShopProducts.find((p) => p.id === detailMatch.id) || mockShopProducts[0];
    const related = mockShopProducts.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
    return successResponse({ product, related });
  }

  return successResponse({ products: mockShopProducts });
};

/* ==========================================================================
 * EXTENDED HANDLERS — parallel-build mock layer v2
 * --------------------------------------------------------------------------
 * Each block below covers one module. Patterns:
 *   GET  /<entity>/list/                    → paginated list (q, category, status, game)
 *   GET  /<entity>/:id/                     → single entity
 *   POST /<entity>/create/                  → echoes payload + new id
 *   POST /<entity>/:id/update/              → returns updated entity
 *   POST /<entity>/:id/delete/              → success
 *   Plus module-specific actions.
 * Mutations persist within session via module-level `let` arrays in mockData.
 * ========================================================================== */

// Filter helpers ------------------------------------------------------------
const _applyTextFilter = (list, q, fields) => {
  if (!q) return list;
  const needle = q.toLowerCase();
  return list.filter((item) =>
    fields.some((f) => {
      const v = f.split('.').reduce((acc, key) => (acc ? acc[key] : null), item);
      return typeof v === 'string' && v.toLowerCase().includes(needle);
    })
  );
};

const _filterByField = (list, field, value) => {
  if (!value || value === 'all') return list;
  return list.filter((item) => String(item?.[field]) === String(value));
};

const _paginate = (list, searchParams) => applyQueryParams(list, searchParams);

// ── Wallet (extended) ─────────────────────────────────────────────────────
const handleWalletExtRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/wallet/') && !pathname.startsWith('/auth/wallet/')) return null;

  // GET /wallet/transactions/ (extended) — supports ?type= ?status=
  if (method === 'GET' && (pathname.endsWith('/wallet/transactions/') || pathname.endsWith('/wallet/transactions/extended/'))) {
    let list = [...mockTransactionsExtended];
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    if (type) list = _filterByField(list, 'type', type);
    if (status) list = _filterByField(list, 'status', status);
    return successResponse({ transactions: _paginate(list, searchParams), total: list.length });
  }

  // GET /wallet/withdrawals/ — pending withdrawal requests
  if (method === 'GET' && pathname.endsWith('/wallet/withdrawals/')) {
    return successResponse({ withdrawals: mockWithdrawalRequests });
  }

  // POST /wallet/withdrawals/create/
  if (method === 'POST' && pathname.endsWith('/wallet/withdrawals/create/')) {
    const newWd = {
      id: `wdr_${Date.now()}`,
      user: { id: mockUser.id, username: mockUser.username },
      amount_vc: Number(body?.amount_vc || 0),
      amount_ngn: Number(body?.amount_vc || 0) * 1000,
      bank_name: body?.bank_name || 'GTBank',
      account_number: body?.account_number || '',
      account_name: body?.account_name || mockUser.full_name,
      status: 'pending',
      requested_at: new Date().toISOString(),
      note: body?.note || '',
    };
    mockWithdrawalRequests.push(newWd);
    return successResponse({ withdrawal: newWd });
  }

  // GET /wallet/kyc/status/
  if (method === 'GET' && pathname.endsWith('/wallet/kyc/status/')) {
    return successResponse({ kyc: mockKycStatus });
  }

  return null;
};

// ── Organizations (extended) ──────────────────────────────────────────────
const handleOrgExtRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/org/')) return null;

  if (method === 'GET' && pathname.endsWith('/org/list/')) {
    let list = [...mockOrganizationsExtended];
    list = _applyTextFilter(list, searchParams.get('q'), ['name', 'bio', 'tag']);
    list = _filterByField(list, 'region', searchParams.get('region'));
    return successResponse({ organizations: _paginate(list, searchParams), total: list.length });
  }

  if (method === 'POST' && pathname.endsWith('/org/create/')) {
    const newOrg = { id: `orgx_new_${Date.now()}`, ...body, members: [], stats: { total_members: 1, total_tournaments_hosted: 0, total_prize_pool: 0 } };
    mockOrganizationsExtended.push(newOrg);
    return successResponse({ organization: newOrg });
  }

  const idMatch = matchPath('/org/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const org = mockOrganizationsExtended.find((o) => o.id === idMatch.id) || mockOrganizationsExtended[0];
    return successResponse({ organization: org });
  }

  const updateMatch = matchPath('/org/:id/update/', pathname);
  if (method === 'POST' && updateMatch) {
    const idx = mockOrganizationsExtended.findIndex((o) => o.id === updateMatch.id);
    if (idx >= 0) {
      mockOrganizationsExtended[idx] = { ...mockOrganizationsExtended[idx], ...body };
      return successResponse({ organization: mockOrganizationsExtended[idx] });
    }
    return successResponse({ organization: { id: updateMatch.id, ...body } });
  }

  const deleteMatch = matchPath('/org/:id/delete/', pathname);
  if (method === 'POST' && deleteMatch) {
    return successResponse({ deleted: true, id: deleteMatch.id });
  }

  return null;
};

// ── Products (Shop v2) ────────────────────────────────────────────────────
const handleProductRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/product/')) return null;

  if (method === 'GET' && pathname.endsWith('/product/list/')) {
    let list = [...mockProducts];
    list = _applyTextFilter(list, searchParams.get('q'), ['name', 'description']);
    list = _filterByField(list, 'category', searchParams.get('category'));
    return successResponse({ products: _paginate(list, searchParams), total: list.length });
  }

  if (method === 'POST' && pathname.endsWith('/product/create/')) {
    const newP = { id: `prdx_new_${Date.now()}`, ...body };
    mockProducts.push(newP);
    return successResponse({ product: newP });
  }

  const idMatch = matchPath('/product/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const product = mockProducts.find((p) => p.id === idMatch.id) || mockProducts[0];
    const related = mockProducts.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
    return successResponse({ product, related });
  }

  const updateMatch = matchPath('/product/:id/update/', pathname);
  if (method === 'POST' && updateMatch) {
    const idx = mockProducts.findIndex((p) => p.id === updateMatch.id);
    if (idx >= 0) mockProducts[idx] = { ...mockProducts[idx], ...body };
    return successResponse({ product: mockProducts[idx] || { id: updateMatch.id, ...body } });
  }

  const deleteMatch = matchPath('/product/:id/delete/', pathname);
  if (method === 'POST' && deleteMatch) {
    return successResponse({ deleted: true, id: deleteMatch.id });
  }

  return null;
};

// ── Orders (Shop v2) ──────────────────────────────────────────────────────
const handleOrderRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/order/')) return null;

  if (method === 'GET' && pathname.endsWith('/order/list/')) {
    let list = [...mockOrders];
    list = _filterByField(list, 'status', searchParams.get('status'));
    return successResponse({ orders: _paginate(list, searchParams), total: list.length });
  }

  if (method === 'POST' && pathname.endsWith('/order/create/')) {
    const newOrder = {
      id: `ord_new_${Date.now()}`,
      order_number: `VENT-${Date.now().toString().slice(-8)}`,
      user: { id: mockUser.id, username: mockUser.username },
      ...body,
      status: 'pending',
      placed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    mockOrders.push(newOrder);
    return successResponse({ order: newOrder });
  }

  const idMatch = matchPath('/order/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const order = mockOrders.find((o) => o.id === idMatch.id) || mockOrders[0];
    return successResponse({ order });
  }

  const updateMatch = matchPath('/order/:id/update/', pathname);
  if (method === 'POST' && updateMatch) {
    const idx = mockOrders.findIndex((o) => o.id === updateMatch.id);
    if (idx >= 0) mockOrders[idx] = { ...mockOrders[idx], ...body };
    return successResponse({ order: mockOrders[idx] || { id: updateMatch.id, ...body } });
  }

  return null;
};

// ── Cart (extended actions) ───────────────────────────────────────────────
const handleCartRoutes = async ({ method, pathname, body }) => {
  if (!pathname.startsWith('/cart/')) return null;

  if (method === 'GET' && pathname.endsWith('/cart/')) {
    const items = mockCart.items.map((it) => {
      const product = mockProducts.find((p) => p.id === it.product_id) || mockShopProducts.find((p) => p.id === it.product_id) || mockProducts[0];
      return { ...it, product };
    });
    const subtotal_vc = items.reduce((s, it) => s + (it.product.sale_price || it.product.price_vent_coins || it.product.price_vc || 0) * it.qty, 0);
    return successResponse({ items, subtotal_vc, shipping_vc: items.length ? 5 : 0, total_vc: subtotal_vc + (items.length ? 5 : 0) });
  }

  if (method === 'POST' && pathname.endsWith('/cart/add/')) {
    const productId = body?.product_id || body?.id;
    const qty = Number(body?.qty || 1);
    const existing = mockCart.items.find((it) => it.product_id === productId);
    if (existing) existing.qty += qty;
    else mockCart.items.push({ id: `cartitem_${Date.now()}`, product_id: productId, qty, variant: body?.variant || null });
    return successResponse({ items: mockCart.items, count: mockCart.items.reduce((s, i) => s + i.qty, 0) });
  }

  if (method === 'POST' && pathname.endsWith('/cart/remove/')) {
    const productId = body?.product_id || body?.id;
    mockCart.items = mockCart.items.filter((it) => it.product_id !== productId);
    return successResponse({ items: mockCart.items });
  }

  if (method === 'POST' && pathname.endsWith('/cart/checkout/')) {
    const orderNumber = `VENT-${Date.now().toString().slice(-8)}`;
    mockCart.items = [];
    return successResponse({ order_number: orderNumber, status: 'paid', estimated_delivery: '3–5 business days' });
  }

  return null;
};

// ── Listings (Marketplace v2) ─────────────────────────────────────────────
const handleListingRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/listing/')) return null;

  if (method === 'GET' && pathname.endsWith('/listing/list/')) {
    let list = [...mockListingsV2];
    list = _applyTextFilter(list, searchParams.get('q'), ['title', 'description']);
    list = _filterByField(list, 'category', searchParams.get('category'));
    list = _filterByField(list, 'status', searchParams.get('status'));
    list = _filterByField(list, 'condition', searchParams.get('condition'));
    return successResponse({ listings: _paginate(list, searchParams), total: list.length });
  }

  if (method === 'POST' && pathname.endsWith('/listing/create/')) {
    const newL = { id: `lstx_new_${Date.now()}`, status: 'active', views: 0, likes: 0, created_at: new Date().toISOString(), ...body };
    mockListingsV2.push(newL);
    return successResponse({ listing: newL });
  }

  const buyMatch = matchPath('/listing/:id/buy/', pathname);
  if (method === 'POST' && buyMatch) {
    const listing = mockListingsV2.find((l) => l.id === buyMatch.id);
    const purchase = {
      id: `pur_new_${Date.now()}`,
      listing,
      buyer: { id: mockUser.id, username: mockUser.username },
      seller: listing?.seller,
      price_vc: listing?.price_vent_coins || 0,
      qty: Number(body?.qty || 1),
      status: 'escrow',
      escrow_release_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      created_at: new Date().toISOString(),
    };
    mockPurchases.unshift(purchase);
    return successResponse({ purchase });
  }

  const idMatch = matchPath('/listing/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const listing = mockListingsV2.find((l) => l.id === idMatch.id) || mockListingsV2[0];
    const similar = mockListingsV2.filter((l) => l.category === listing.category && l.id !== listing.id).slice(0, 4);
    return successResponse({ listing, similar });
  }

  const updateMatch = matchPath('/listing/:id/update/', pathname);
  if (method === 'POST' && updateMatch) {
    const idx = mockListingsV2.findIndex((l) => l.id === updateMatch.id);
    if (idx >= 0) mockListingsV2[idx] = { ...mockListingsV2[idx], ...body };
    return successResponse({ listing: mockListingsV2[idx] || { id: updateMatch.id, ...body } });
  }

  const deleteMatch = matchPath('/listing/:id/delete/', pathname);
  if (method === 'POST' && deleteMatch) {
    return successResponse({ deleted: true, id: deleteMatch.id });
  }

  return null;
};

// ── Purchases ─────────────────────────────────────────────────────────────
const handlePurchaseRoutes = async ({ method, pathname, searchParams }) => {
  if (!pathname.startsWith('/purchase/')) return null;

  if (method === 'GET' && pathname.endsWith('/purchase/list/')) {
    let list = [...mockPurchases];
    list = _filterByField(list, 'status', searchParams.get('status'));
    return successResponse({ purchases: _paginate(list, searchParams), total: list.length });
  }

  const idMatch = matchPath('/purchase/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const purchase = mockPurchases.find((p) => p.id === idMatch.id) || mockPurchases[0];
    return successResponse({ purchase });
  }

  const completeMatch = matchPath('/purchase/:id/complete/', pathname);
  if (method === 'POST' && completeMatch) {
    const idx = mockPurchases.findIndex((p) => p.id === completeMatch.id);
    if (idx >= 0) mockPurchases[idx].status = 'completed';
    return successResponse({ purchase: mockPurchases[idx] });
  }

  const disputeMatch = matchPath('/purchase/:id/dispute/', pathname);
  if (method === 'POST' && disputeMatch) {
    const idx = mockPurchases.findIndex((p) => p.id === disputeMatch.id);
    if (idx >= 0) mockPurchases[idx].status = 'disputed';
    return successResponse({ purchase: mockPurchases[idx] });
  }

  return null;
};

// ── Manga + Chapters ──────────────────────────────────────────────────────
const handleMangaRoutes = async ({ method, pathname, searchParams }) => {
  if (!pathname.startsWith('/manga/')) return null;

  if (method === 'GET' && pathname.endsWith('/manga/list/')) {
    let list = [...mockMangaSeries];
    list = _applyTextFilter(list, searchParams.get('q'), ['title', 'author']);
    list = _filterByField(list, 'status', searchParams.get('status'));
    return successResponse({ series: _paginate(list, searchParams), total: list.length });
  }

  const chaptersMatch = matchPath('/manga/:id/chapters/', pathname);
  if (method === 'GET' && chaptersMatch) {
    const chapters = mockChapters.filter((c) => c.series_id === chaptersMatch.id);
    return successResponse({ chapters });
  }

  const idMatch = matchPath('/manga/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const series = mockMangaSeries.find((m) => m.id === idMatch.id) || mockMangaSeries[0];
    const chapters = mockChapters.filter((c) => c.series_id === series.id);
    return successResponse({ series, chapters });
  }

  return null;
};

const handleChapterRoutes = async ({ method, pathname }) => {
  if (!pathname.startsWith('/chapter/')) return null;

  const idMatch = matchPath('/chapter/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const chapter = mockChapters.find((c) => c.id === idMatch.id) || mockChapters[0];
    return successResponse({ chapter });
  }
  return null;
};

// ── AMVs (v2) ─────────────────────────────────────────────────────────────
const handleAmvRoutes = async ({ method, pathname, searchParams }) => {
  if (!pathname.startsWith('/amv/')) return null;

  if (method === 'GET' && pathname.endsWith('/amv/list/')) {
    let list = [...mockAmvsV2];
    list = _applyTextFilter(list, searchParams.get('q'), ['title', 'uploader.username', 'anime_referenced']);
    return successResponse({ amvs: _paginate(list, searchParams), total: list.length });
  }

  const likeMatch = matchPath('/amv/:id/like/', pathname);
  if (method === 'POST' && likeMatch) {
    const idx = mockAmvsV2.findIndex((a) => a.id === likeMatch.id);
    if (idx >= 0) mockAmvsV2[idx].likes += 1;
    return successResponse({ id: likeMatch.id, likes: mockAmvsV2[idx]?.likes || 0, liked: true });
  }

  const idMatch = matchPath('/amv/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const amv = mockAmvsV2.find((a) => a.id === idMatch.id) || mockAmvsV2[0];
    const related = mockAmvsV2.filter((a) => a.id !== amv.id).slice(0, 4);
    return successResponse({ amv, related });
  }

  return null;
};

// ── Co-reading rooms ──────────────────────────────────────────────────────
const handleRoomRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/room/')) return null;

  if (method === 'GET' && pathname.endsWith('/room/list/')) {
    let list = [...mockCoReadingRooms];
    if (searchParams.get('active') === 'true') list = list.filter((r) => r.is_active);
    return successResponse({ rooms: list, total: list.length });
  }

  if (method === 'POST' && pathname.endsWith('/room/create/')) {
    const newRoom = {
      id: `roomx_new_${Date.now()}`,
      name: body?.name || 'New Room',
      host: { id: mockUser.id, username: mockUser.username, avatar: mockUser.profile_picture },
      series_id: body?.series_id || mockMangaSeries[0].id,
      series: mockMangaSeries.find((m) => m.id === body?.series_id) || mockMangaSeries[0],
      current_chapter: body?.chapter || 1,
      current_page: 1,
      is_active: true,
      participants: [{ id: mockUser.id, username: mockUser.username, avatar: mockUser.profile_picture, is_host: true, joined_at: new Date().toISOString() }],
      created_at: new Date().toISOString(),
      topic: body?.topic || 'New room',
    };
    mockCoReadingRooms.push(newRoom);
    return successResponse({ room: newRoom });
  }

  const joinMatch = matchPath('/room/:id/join/', pathname);
  if (method === 'POST' && joinMatch) {
    const idx = mockCoReadingRooms.findIndex((r) => r.id === joinMatch.id);
    if (idx >= 0) {
      const exists = mockCoReadingRooms[idx].participants.find((p) => p.id === mockUser.id);
      if (!exists) {
        mockCoReadingRooms[idx].participants.push({
          id: mockUser.id,
          username: mockUser.username,
          avatar: mockUser.profile_picture,
          is_host: false,
          joined_at: new Date().toISOString(),
        });
      }
      return successResponse({ room: mockCoReadingRooms[idx], joined: true });
    }
    return successResponse({ joined: false }, 'Room not found');
  }

  const idMatch = matchPath('/room/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const room = mockCoReadingRooms.find((r) => r.id === idMatch.id) || mockCoReadingRooms[0];
    return successResponse({ room });
  }

  return null;
};

// ── Wager pools (extended) ────────────────────────────────────────────────
const handleWagerExtRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/wager/')) return null;

  if (method === 'GET' && pathname.endsWith('/wager/pools/')) {
    let list = [...mockWagerPools];
    list = _filterByField(list, 'status', searchParams.get('status'));
    return successResponse({ pools: _paginate(list, searchParams), total: list.length });
  }

  const stakeMatch = matchPath('/wager/:id/stake/', pathname);
  if (method === 'POST' && stakeMatch) {
    const idx = mockWagerPools.findIndex((p) => p.id === stakeMatch.id);
    const optionId = body?.option_id;
    const amount = Number(body?.amount || 0);
    if (idx >= 0) {
      const pool = mockWagerPools[idx];
      pool.total_staked += amount;
      pool.stakers_count += 1;
      const opt = pool.outcome_options.find((o) => o.id === optionId);
      if (opt) opt.stake_amount += amount;
      return successResponse({ pool, stake: { id: `stake_${Date.now()}`, amount, option_id: optionId } });
    }
    return successResponse({ staked: false }, 'Pool not found');
  }

  const poolDetailMatch = matchPath('/wager/pools/:id/', pathname);
  if (method === 'GET' && poolDetailMatch) {
    const pool = mockWagerPools.find((p) => p.id === poolDetailMatch.id) || mockWagerPools[0];
    return successResponse({ pool });
  }

  return null;
};

// ── Bet markets ───────────────────────────────────────────────────────────
const handleBetRoutes = async ({ method, pathname, searchParams }) => {
  if (!pathname.startsWith('/bet/')) return null;

  if (method === 'GET' && pathname.endsWith('/bet/list/')) {
    let list = [...mockBetMarkets];
    list = _filterByField(list, 'market_type', searchParams.get('market_type'));
    return successResponse({ markets: _paginate(list, searchParams), total: list.length });
  }

  const idMatch = matchPath('/bet/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const market = mockBetMarkets.find((m) => m.id === idMatch.id) || mockBetMarkets[0];
    return successResponse({ market });
  }

  return null;
};

// ── Match (live + scheduled) ──────────────────────────────────────────────
const handleMatchRoutes = async ({ method, pathname, searchParams }) => {
  if (!pathname.startsWith('/match/')) return null;

  if (method === 'GET' && pathname.endsWith('/match/list/')) {
    let list = [...mockMatches];
    list = _filterByField(list, 'status', searchParams.get('status'));
    list = _filterByField(list, 'game', searchParams.get('game'));
    return successResponse({ matches: _paginate(list, searchParams), total: list.length });
  }

  if (method === 'GET' && pathname.endsWith('/match/live/')) {
    const live = mockMatches.filter((m) => m.status === 'live');
    return successResponse({ matches: live, total: live.length });
  }

  const idMatch = matchPath('/match/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const match = mockMatches.find((m) => m.id === idMatch.id) || mockMatches[0];
    return successResponse({ match });
  }

  return null;
};

// ── Notifications ─────────────────────────────────────────────────────────
const handleNotificationRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/notification/')) return null;

  if (method === 'GET' && pathname.endsWith('/notification/list/')) {
    let list = [...mockNotifications];
    list = _filterByField(list, 'type', searchParams.get('type'));
    if (searchParams.get('unread') === 'true') list = list.filter((n) => !n.read);
    const unread = mockNotifications.filter((n) => !n.read).length;
    return successResponse({ notifications: _paginate(list, searchParams), total: list.length, unread_count: unread });
  }

  if (method === 'POST' && pathname.endsWith('/notification/mark-all-read/')) {
    mockNotifications.forEach((n) => { n.read = true; });
    return successResponse({ updated: mockNotifications.length });
  }

  const readMatch = matchPath('/notification/:id/read/', pathname);
  if (method === 'POST' && readMatch) {
    const idx = mockNotifications.findIndex((n) => n.id === readMatch.id);
    if (idx >= 0) mockNotifications[idx].read = true;
    return successResponse({ id: readMatch.id, read: true });
  }

  return null;
};

// ── Posts (Community) ─────────────────────────────────────────────────────
const handlePostRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/post/') && !pathname.startsWith('/community/post/')) return null;

  if (method === 'GET' && (pathname.endsWith('/post/list/') || pathname.endsWith('/post/feed/'))) {
    let list = [...mockPosts];
    list = _filterByField(list, 'type', searchParams.get('type'));
    return successResponse({ posts: _paginate(list, searchParams), total: list.length });
  }

  if (method === 'POST' && pathname.endsWith('/post/create/')) {
    const newPost = {
      id: `pstx_new_${Date.now()}`,
      author: {
        id: mockUser.id,
        username: mockUser.username,
        full_name: mockUser.full_name,
        avatar: mockUser.profile_picture,
      },
      content: body?.content || '',
      images: body?.images || [],
      video_url: body?.video_url || null,
      type: body?.type || 'text',
      likes_count: 0,
      comments_count: 0,
      shares: 0,
      is_liked: false,
      is_bookmarked: false,
      created_at: new Date().toISOString(),
    };
    mockPosts.unshift(newPost);
    return successResponse({ post: newPost });
  }

  const likeMatch = matchPath('/post/:id/like/', pathname) || matchPath('/community/post/:id/like/', pathname);
  if (method === 'POST' && likeMatch) {
    const idx = mockPosts.findIndex((p) => p.id === likeMatch.id);
    if (idx >= 0) {
      mockPosts[idx].is_liked = !mockPosts[idx].is_liked;
      mockPosts[idx].likes_count += mockPosts[idx].is_liked ? 1 : -1;
      return successResponse({ id: likeMatch.id, likes_count: mockPosts[idx].likes_count, is_liked: mockPosts[idx].is_liked });
    }
    return successResponse({ liked: false });
  }

  const commentMatch = matchPath('/post/:id/comment/', pathname) || matchPath('/community/post/:id/comment/', pathname);
  if (method === 'POST' && commentMatch) {
    const idx = mockPosts.findIndex((p) => p.id === commentMatch.id);
    if (idx >= 0) mockPosts[idx].comments_count += 1;
    return successResponse({
      comment: {
        id: `cmt_${Date.now()}`,
        post_id: commentMatch.id,
        body: body?.body || '',
        author: { id: mockUser.id, username: mockUser.username, avatar: mockUser.profile_picture },
        created_at: new Date().toISOString(),
      },
    });
  }

  const idMatch = matchPath('/post/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const post = mockPosts.find((p) => p.id === idMatch.id) || mockPosts[0];
    return successResponse({ post });
  }

  return null;
};

// ── Forum threads + replies ───────────────────────────────────────────────
const handleThreadRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/thread/') && !pathname.startsWith('/forum/')) return null;

  if (method === 'GET' && (pathname.endsWith('/thread/list/') || pathname.endsWith('/forum/threads/'))) {
    let list = [...mockForumThreads];
    list = _applyTextFilter(list, searchParams.get('q'), ['title', 'body']);
    list = _filterByField(list, 'category', searchParams.get('category'));
    return successResponse({ threads: _paginate(list, searchParams), total: list.length });
  }

  if (method === 'POST' && (pathname.endsWith('/thread/create/') || pathname.endsWith('/forum/threads/create/'))) {
    const newT = {
      id: `thx_new_${Date.now()}`,
      title: body?.title || 'New thread',
      body: body?.body || '',
      category: body?.category || 'General',
      author: { id: mockUser.id, username: mockUser.username, full_name: mockUser.full_name, avatar: mockUser.profile_picture },
      reply_count: 0,
      view_count: 1,
      upvotes: 0,
      is_pinned: false,
      is_locked: false,
      last_activity: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    mockForumThreads.unshift(newT);
    return successResponse({ thread: newT });
  }

  const replyMatch = matchPath('/thread/:id/reply/', pathname) || matchPath('/forum/threads/:id/reply/', pathname);
  if (method === 'POST' && replyMatch) {
    const newReply = {
      id: `rplx_new_${Date.now()}`,
      thread_id: replyMatch.id,
      body: body?.body || '',
      author: { id: mockUser.id, username: mockUser.username, full_name: mockUser.full_name, avatar: mockUser.profile_picture },
      upvotes: 0,
      created_at: new Date().toISOString(),
    };
    mockForumReplies.push(newReply);
    const idx = mockForumThreads.findIndex((t) => t.id === replyMatch.id);
    if (idx >= 0) mockForumThreads[idx].reply_count += 1;
    return successResponse({ reply: newReply });
  }

  const repliesMatch = matchPath('/thread/:id/replies/', pathname) || matchPath('/forum/threads/:id/replies/', pathname);
  if (method === 'GET' && repliesMatch) {
    const replies = mockForumReplies.filter((r) => r.thread_id === repliesMatch.id);
    return successResponse({ replies, total: replies.length });
  }

  const idMatch = matchPath('/thread/:id/', pathname) || matchPath('/forum/threads/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const thread = mockForumThreads.find((t) => t.id === idMatch.id) || mockForumThreads[0];
    const replies = mockForumReplies.filter((r) => r.thread_id === thread.id);
    return successResponse({ thread, replies });
  }

  return null;
};

// ── Clubs (extended) ──────────────────────────────────────────────────────
const handleClubRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/club/')) return null;

  if (method === 'GET' && pathname.endsWith('/club/list/')) {
    let list = [...mockClubsV2];
    list = _filterByField(list, 'type', searchParams.get('type'));
    list = _filterByField(list, 'game', searchParams.get('game'));
    return successResponse({ clubs: _paginate(list, searchParams), total: list.length });
  }

  if (method === 'POST' && pathname.endsWith('/club/create/')) {
    const newC = {
      id: `clbx_new_${Date.now()}`,
      member_count: 1,
      posts_count: 0,
      is_joined: true,
      created_at: new Date().toISOString(),
      ...body,
    };
    mockClubsV2.push(newC);
    return successResponse({ club: newC });
  }

  const joinMatch = matchPath('/club/:id/join/', pathname);
  if (method === 'POST' && joinMatch) {
    const idx = mockClubsV2.findIndex((c) => c.id === joinMatch.id);
    if (idx >= 0) {
      mockClubsV2[idx].is_joined = true;
      mockClubsV2[idx].member_count += 1;
    }
    return successResponse({ club: mockClubsV2[idx], joined: true });
  }

  const idMatch = matchPath('/club/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const club = mockClubsV2.find((c) => c.id === idMatch.id) || mockClubsV2[0];
    return successResponse({ club });
  }

  return null;
};

// ── DM threads (extended) ─────────────────────────────────────────────────
const handleDmRoutes = async ({ method, pathname, body }) => {
  if (!pathname.startsWith('/dm/')) return null;

  if (method === 'GET' && pathname.endsWith('/dm/list/')) {
    return successResponse({ threads: mockDmThreads, total: mockDmThreads.length });
  }

  const sendMatch = matchPath('/dm/:id/send/', pathname);
  if (method === 'POST' && sendMatch) {
    const idx = mockDmThreads.findIndex((t) => t.id === sendMatch.id);
    if (idx >= 0) {
      const newMsg = {
        id: `dmsg_new_${Date.now()}`,
        thread_id: sendMatch.id,
        from: mockUser.id,
        body: body?.body || '',
        created_at: new Date().toISOString(),
        read: false,
      };
      mockDmThreads[idx].messages.push(newMsg);
      mockDmThreads[idx].last_message_at = newMsg.created_at;
      return successResponse({ message: newMsg });
    }
    return successResponse({}, 'Thread not found');
  }

  const idMatch = matchPath('/dm/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const thread = mockDmThreads.find((t) => t.id === idMatch.id) || mockDmThreads[0];
    return successResponse({ thread, messages: thread.messages });
  }

  return null;
};

// ── Scrims (extended) ─────────────────────────────────────────────────────
const handleScrimRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/scrim/')) return null;

  if (method === 'GET' && pathname.endsWith('/scrim/list/')) {
    let list = [...mockScrimsV2];
    list = _filterByField(list, 'game', searchParams.get('game'));
    list = _filterByField(list, 'status', searchParams.get('status'));
    list = _filterByField(list, 'region', searchParams.get('region'));
    return successResponse({ scrims: _paginate(list, searchParams), total: list.length });
  }

  if (method === 'POST' && pathname.endsWith('/scrim/create/')) {
    const newS = {
      id: `scrx_new_${Date.now()}`,
      status: 'open',
      created_at: new Date().toISOString(),
      ...body,
    };
    mockScrimsV2.push(newS);
    return successResponse({ scrim: newS });
  }

  const acceptMatch = matchPath('/scrim/:id/accept/', pathname);
  if (method === 'POST' && acceptMatch) {
    const idx = mockScrimsV2.findIndex((s) => s.id === acceptMatch.id);
    if (idx >= 0) mockScrimsV2[idx].status = 'matched';
    return successResponse({ scrim: mockScrimsV2[idx], accepted: true });
  }

  const idMatch = matchPath('/scrim/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const scrim = mockScrimsV2.find((s) => s.id === idMatch.id) || mockScrimsV2[0];
    return successResponse({ scrim });
  }

  return null;
};

// ── Bracket (32-team) ─────────────────────────────────────────────────────
const handleBracketRoutes = async ({ method, pathname }) => {
  if (!pathname.startsWith('/bracket/')) return null;

  if (method === 'GET' && pathname.endsWith('/bracket/list/')) {
    return successResponse({ brackets: [mockBracket32] });
  }

  const matchByIdMatch = matchPath('/bracket/match/:id/', pathname);
  if (method === 'GET' && matchByIdMatch) {
    const m = mockBracketMatches.find((m) => m.id === matchByIdMatch.id) || mockBracketMatches[0];
    return successResponse({ match: m });
  }

  const idMatch = matchPath('/bracket/:id/', pathname);
  if (method === 'GET' && idMatch) {
    return successResponse({ bracket: mockBracket32 });
  }

  return null;
};

// ── Production: scenes + overlays + pipeline ──────────────────────────────
const handleProductionRoutes = async ({ method, pathname }) => {
  if (!pathname.startsWith('/production/') && !pathname.startsWith('/scene/') && !pathname.startsWith('/overlay/') && !pathname.startsWith('/pipeline/')) return null;

  // Scenes
  if (method === 'GET' && (pathname.endsWith('/scene/list/') || pathname.endsWith('/production/scenes/'))) {
    return successResponse({ scenes: mockScenesV2 });
  }
  const sceneMatch = matchPath('/scene/:id/activate/', pathname);
  if (method === 'POST' && sceneMatch) {
    mockScenesV2.forEach((s) => { s.is_active = s.id === sceneMatch.id; });
    return successResponse({ scenes: mockScenesV2, active_id: sceneMatch.id });
  }
  const sceneDetailMatch = matchPath('/scene/:id/', pathname);
  if (method === 'GET' && sceneDetailMatch) {
    const scene = mockScenesV2.find((s) => s.id === sceneDetailMatch.id) || mockScenesV2[0];
    return successResponse({ scene });
  }

  // Overlays
  if (method === 'GET' && (pathname.endsWith('/overlay/list/') || pathname.endsWith('/production/overlays/'))) {
    return successResponse({ overlays: mockOverlayConfigs });
  }
  const overlayToggleMatch = matchPath('/overlay/:id/toggle/', pathname);
  if (method === 'POST' && overlayToggleMatch) {
    const idx = mockOverlayConfigs.findIndex((o) => o.id === overlayToggleMatch.id);
    if (idx >= 0) {
      mockOverlayConfigs[idx].is_visible = !mockOverlayConfigs[idx].is_visible;
      mockOverlayConfigs[idx].updated_at = new Date().toISOString();
    }
    return successResponse({ overlay: mockOverlayConfigs[idx] });
  }
  const overlayDetailMatch = matchPath('/overlay/:id/', pathname);
  if (method === 'GET' && overlayDetailMatch) {
    const overlay = mockOverlayConfigs.find((o) => o.id === overlayDetailMatch.id) || mockOverlayConfigs[0];
    return successResponse({ overlay });
  }

  // Pipelines
  if (method === 'GET' && (pathname.endsWith('/pipeline/list/') || pathname.endsWith('/production/pipelines/'))) {
    return successResponse({ pipelines: mockDataPipelineV2 });
  }
  const pipePingMatch = matchPath('/pipeline/:id/ping/', pathname);
  if (method === 'POST' && pipePingMatch) {
    const idx = mockDataPipelineV2.findIndex((p) => p.id === pipePingMatch.id);
    if (idx >= 0) {
      mockDataPipelineV2[idx].last_ping = new Date().toISOString();
      mockDataPipelineV2[idx].latency_ms = 20 + Math.floor(Math.random() * 80);
      mockDataPipelineV2[idx].status = 'connected';
    }
    return successResponse({ pipeline: mockDataPipelineV2[idx] });
  }
  const pipeDetailMatch = matchPath('/pipeline/:id/', pathname);
  if (method === 'GET' && pipeDetailMatch) {
    const pipeline = mockDataPipelineV2.find((p) => p.id === pipeDetailMatch.id) || mockDataPipelineV2[0];
    return successResponse({ pipeline });
  }

  return null;
};

// ── Tickets v2 ────────────────────────────────────────────────────────────
const handleTicketRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/ticket/')) return null;

  if (method === 'GET' && pathname.endsWith('/ticket/list/')) {
    let list = [...mockEventTickets];
    list = _filterByField(list, 'status', searchParams.get('status'));
    list = _filterByField(list, 'tier', searchParams.get('tier'));
    return successResponse({ tickets: _paginate(list, searchParams), total: list.length });
  }

  if (method === 'POST' && pathname.endsWith('/ticket/create/')) {
    const newT = {
      id: `etkt_new_${Date.now()}`,
      qr_code: `VENT-TKT-${Date.now()}`,
      status: 'active',
      purchased_at: new Date().toISOString(),
      ...body,
    };
    mockEventTickets.push(newT);
    return successResponse({ ticket: newT });
  }

  const idMatch = matchPath('/ticket/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const ticket = mockEventTickets.find((t) => t.id === idMatch.id) || mockEventTickets[0];
    return successResponse({ ticket });
  }

  const useMatch = matchPath('/ticket/:id/use/', pathname);
  if (method === 'POST' && useMatch) {
    const idx = mockEventTickets.findIndex((t) => t.id === useMatch.id);
    if (idx >= 0) mockEventTickets[idx].status = 'used';
    return successResponse({ ticket: mockEventTickets[idx] });
  }

  return null;
};

// ── Vendors v2 ────────────────────────────────────────────────────────────
const handleVendorRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/vendor/')) return null;

  if (method === 'GET' && pathname.endsWith('/vendor/list/')) {
    let list = [...mockEventVendors];
    list = _filterByField(list, 'category', searchParams.get('category'));
    list = _filterByField(list, 'status', searchParams.get('status'));
    return successResponse({ vendors: _paginate(list, searchParams), total: list.length });
  }

  if (method === 'POST' && pathname.endsWith('/vendor/create/')) {
    const newV = { id: `evnd_new_${Date.now()}`, status: 'active', products: [], ...body };
    mockEventVendors.push(newV);
    return successResponse({ vendor: newV });
  }

  const idMatch = matchPath('/vendor/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const vendor = mockEventVendors.find((v) => v.id === idMatch.id) || mockEventVendors[0];
    return successResponse({ vendor });
  }

  const updateMatch = matchPath('/vendor/:id/update/', pathname);
  if (method === 'POST' && updateMatch) {
    const idx = mockEventVendors.findIndex((v) => v.id === updateMatch.id);
    if (idx >= 0) mockEventVendors[idx] = { ...mockEventVendors[idx], ...body };
    return successResponse({ vendor: mockEventVendors[idx] || { id: updateMatch.id, ...body } });
  }

  return null;
};

// ── Admin (extended): metrics-30d, KYC v2, audit v2, user actions, payouts ──
const handleAdminExtRoutes = async ({ method, pathname, searchParams, body }) => {
  if (!pathname.startsWith('/admin/')) return null;

  if (method === 'GET' && pathname.endsWith('/admin/metrics/timeline/')) {
    const days = parseInt(searchParams.get('days') || '30', 10);
    return successResponse({ timeline: mockAdminMetricsTimeline.slice(-days) });
  }

  if (method === 'GET' && pathname.endsWith('/admin/kyc/queue/')) {
    let list = [...mockKycDocs];
    list = _filterByField(list, 'status', searchParams.get('status'));
    return successResponse({ docs: _paginate(list, searchParams), total: list.length });
  }

  const kycApproveExt = matchPath('/admin/kyc/:id/approve/', pathname);
  if (method === 'POST' && kycApproveExt) {
    const idx = mockKycDocs.findIndex((d) => d.id === kycApproveExt.id);
    if (idx >= 0) {
      mockKycDocs[idx].status = 'approved';
      mockKycDocs[idx].reviewed_at = new Date().toISOString();
      mockKycDocs[idx].reviewed_by = 'admin_demo';
    }
    return successResponse({ doc: mockKycDocs[idx], status: 'approved' });
  }

  const kycRejectExt = matchPath('/admin/kyc/:id/reject/', pathname);
  if (method === 'POST' && kycRejectExt) {
    const idx = mockKycDocs.findIndex((d) => d.id === kycRejectExt.id);
    if (idx >= 0) {
      mockKycDocs[idx].status = 'rejected';
      mockKycDocs[idx].rejection_reason = body?.reason || 'Document unreadable';
      mockKycDocs[idx].reviewed_at = new Date().toISOString();
    }
    return successResponse({ doc: mockKycDocs[idx], status: 'rejected' });
  }

  if (method === 'GET' && pathname.endsWith('/admin/audit-log/extended/')) {
    return successResponse({ entries: _paginate(mockAuditLogExtended, searchParams), total: mockAuditLogExtended.length });
  }

  const userBan = matchPath('/admin/user/:id/ban/', pathname);
  if (method === 'POST' && userBan) {
    return successResponse({ id: userBan.id, banned: true, reason: body?.reason || 'TOS violation' });
  }

  const userUnban = matchPath('/admin/user/:id/unban/', pathname);
  if (method === 'POST' && userUnban) {
    return successResponse({ id: userUnban.id, banned: false });
  }

  const payoutApproveExt = matchPath('/admin/payout/:id/approve/', pathname);
  if (method === 'POST' && payoutApproveExt) {
    const idx = mockWithdrawalRequests.findIndex((w) => w.id === payoutApproveExt.id);
    if (idx >= 0) mockWithdrawalRequests[idx].status = 'approved';
    return successResponse({ id: payoutApproveExt.id, status: 'approved' });
  }

  const payoutRejectExt = matchPath('/admin/payout/:id/reject/', pathname);
  if (method === 'POST' && payoutRejectExt) {
    const idx = mockWithdrawalRequests.findIndex((w) => w.id === payoutRejectExt.id);
    if (idx >= 0) mockWithdrawalRequests[idx].status = 'rejected';
    return successResponse({ id: payoutRejectExt.id, status: 'rejected' });
  }

  return null;
};

// ── Admin metric (alias under /metric/) ───────────────────────────────────
const handleMetricRoutes = async ({ method, pathname, searchParams }) => {
  if (!pathname.startsWith('/metric/')) return null;
  if (method === 'GET' && pathname.endsWith('/metric/timeline/')) {
    const days = parseInt(searchParams.get('days') || '30', 10);
    return successResponse({ timeline: mockAdminMetricsTimeline.slice(-days) });
  }
  if (method === 'GET' && pathname.endsWith('/metric/list/')) {
    return successResponse({ metrics: mockAdminMetricsTimeline });
  }
  return null;
};

// ── KYC (alias under /kyc/) ───────────────────────────────────────────────
const handleKycRoutes = async ({ method, pathname, searchParams }) => {
  if (!pathname.startsWith('/kyc/')) return null;
  if (method === 'GET' && pathname.endsWith('/kyc/list/')) {
    let list = [...mockKycDocs];
    list = _filterByField(list, 'status', searchParams.get('status'));
    return successResponse({ docs: _paginate(list, searchParams), total: list.length });
  }
  if (method === 'GET' && pathname.endsWith('/kyc/status/')) {
    return successResponse({ kyc: mockKycStatus });
  }
  const idMatch = matchPath('/kyc/:id/', pathname);
  if (method === 'GET' && idMatch) {
    const doc = mockKycDocs.find((d) => d.id === idMatch.id) || mockKycDocs[0];
    return successResponse({ doc });
  }
  return null;
};

// ── Audit (alias under /audit/) ───────────────────────────────────────────
const handleAuditRoutes = async ({ method, pathname, searchParams }) => {
  if (!pathname.startsWith('/audit/')) return null;
  if (method === 'GET' && pathname.endsWith('/audit/list/')) {
    return successResponse({ entries: _paginate(mockAuditLogExtended, searchParams), total: mockAuditLogExtended.length });
  }
  return null;
};

// ── Settings ──────────────────────────────────────────────────────────────
const handleSettingRoutes = async ({ method, pathname, body }) => {
  if (!pathname.startsWith('/setting/')) return null;

  if (method === 'GET' && pathname.endsWith('/setting/')) {
    return successResponse({ settings: mockSettingsState });
  }

  if (method === 'GET' && pathname.endsWith('/setting/notifications/')) {
    return successResponse({ notifications: mockSettingsState.notifications });
  }
  if (method === 'POST' && pathname.endsWith('/setting/notifications/update/')) {
    mockSettingsState.notifications = { ...mockSettingsState.notifications, ...(body || {}) };
    return successResponse({ notifications: mockSettingsState.notifications });
  }

  if (method === 'GET' && pathname.endsWith('/setting/privacy/')) {
    return successResponse({ privacy: mockSettingsState.privacy });
  }
  if (method === 'POST' && pathname.endsWith('/setting/privacy/update/')) {
    mockSettingsState.privacy = { ...mockSettingsState.privacy, ...(body || {}) };
    return successResponse({ privacy: mockSettingsState.privacy });
  }

  if (method === 'GET' && pathname.endsWith('/setting/security/')) {
    return successResponse({ security: mockSettingsState.security });
  }
  if (method === 'POST' && pathname.endsWith('/setting/security/update/')) {
    mockSettingsState.security = { ...mockSettingsState.security, ...(body || {}) };
    return successResponse({ security: mockSettingsState.security });
  }

  if (method === 'GET' && pathname.endsWith('/setting/payments/')) {
    return successResponse({ payments: mockSettingsState.payments });
  }
  if (method === 'POST' && pathname.endsWith('/setting/payments/update/')) {
    mockSettingsState.payments = { ...mockSettingsState.payments, ...(body || {}) };
    return successResponse({ payments: mockSettingsState.payments });
  }

  if (method === 'POST' && pathname.endsWith('/setting/update/')) {
    // Mutate properties in place — ES module bindings can't be reassigned.
    Object.keys(body || {}).forEach((k) => { mockSettingsState[k] = body[k]; });
    return successResponse({ settings: mockSettingsState });
  }

  return null;
};

// ── Devices ───────────────────────────────────────────────────────────────
const handleDeviceRoutes = async ({ method, pathname }) => {
  if (!pathname.startsWith('/device/')) return null;

  if (method === 'GET' && pathname.endsWith('/device/list/')) {
    return successResponse({ devices: mockSettingsState.devices });
  }

  const revokeMatch = matchPath('/device/:id/revoke/', pathname);
  if (method === 'POST' && revokeMatch) {
    mockSettingsState.devices = mockSettingsState.devices.filter((d) => d.id !== revokeMatch.id);
    return successResponse({ devices: mockSettingsState.devices, revoked: revokeMatch.id });
  }

  return null;
};

// ── Invites + Join Requests (teams) ───────────────────────────────────────
// _spliceById moved earlier in the file so handleTeamRoutes can use it.

const handleInviteRoutes = async ({ method, pathname, body }) => {
  if (!pathname.startsWith('/invite/')) return null;

  if (method === 'GET' && pathname.endsWith('/invite/list/')) {
    return successResponse({ invites: mockTeamInvites, total: mockTeamInvites.length });
  }

  const acceptMatch = matchPath('/invite/:id/accept/', pathname);
  if (method === 'POST' && acceptMatch) {
    _spliceById(mockTeamInvites, acceptMatch.id);
    return successResponse({ id: acceptMatch.id, accepted: true });
  }

  const rejectMatch = matchPath('/invite/:id/reject/', pathname);
  if (method === 'POST' && rejectMatch) {
    _spliceById(mockTeamInvites, rejectMatch.id);
    return successResponse({ id: rejectMatch.id, rejected: true });
  }

  if (method === 'POST' && pathname.endsWith('/invite/create/')) {
    const newI = {
      id: `tinv_new_${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString(),
      ...body,
    };
    mockTeamInvites.push(newI);
    return successResponse({ invite: newI });
  }

  return null;
};

const handleRequestRoutes = async ({ method, pathname }) => {
  if (!pathname.startsWith('/request/')) return null;

  if (method === 'GET' && pathname.endsWith('/request/list/')) {
    return successResponse({ requests: mockJoinRequests, total: mockJoinRequests.length });
  }

  const approveMatch = matchPath('/request/:id/approve/', pathname);
  if (method === 'POST' && approveMatch) {
    _spliceById(mockJoinRequests, approveMatch.id);
    return successResponse({ id: approveMatch.id, approved: true });
  }

  const rejectMatch = matchPath('/request/:id/reject/', pathname);
  if (method === 'POST' && rejectMatch) {
    _spliceById(mockJoinRequests, rejectMatch.id);
    return successResponse({ id: rejectMatch.id, rejected: true });
  }

  return null;
};

// ── Search (cross-entity) ─────────────────────────────────────────────────
const handleSearchRoutes = async ({ method, pathname, searchParams }) => {
  if (!pathname.startsWith('/search/')) return null;

  if (method === 'GET' || method === 'POST') {
    const q = (searchParams.get('q') || '').toLowerCase().trim();
    if (!q) return successResponse({ results: [], total: 0 });
    const seed = mockSearchSeed();
    const results = seed.filter((r) =>
      (r.label || '').toLowerCase().includes(q) || (r.sub || '').toLowerCase().includes(q)
    );
    // Group by type for convenience.
    const grouped = results.reduce((acc, r) => {
      acc[r.type] = acc[r.type] || [];
      acc[r.type].push(r);
      return acc;
    }, {});
    return successResponse({ results, grouped, total: results.length });
  }

  return null;
};

// ── Home dashboard snapshot ───────────────────────────────────────────────
// Aggregates the data the logged-in /home page needs into one payload so the
// dashboard can hydrate with a single fetch.
const handleRankingRoutes = async ({ method, pathname, searchParams }) => {
  if (!pathname.startsWith('/ranking/') && !pathname.startsWith('/rankings/')) return null;

  // Filter helper. game / region / search apply across player/team/org pools.
  const filterPool = (pool) => {
    const game = (searchParams.get('game') || '').toLowerCase();
    const region = (searchParams.get('region') || '').toLowerCase();
    const country = (searchParams.get('country') || '').toLowerCase();
    const q = (searchParams.get('search') || searchParams.get('q') || '').toLowerCase();
    let out = [...pool];
    if (game && game !== 'all') {
      out = out.filter((p) => (p.favorite_game || '').toLowerCase() === game);
    }
    if (region && region !== 'global' && region !== 'all') {
      // Special case: "Africa" = any region containing "africa"; otherwise exact.
      if (region === 'africa') {
        out = out.filter((p) => (p.region || '').toLowerCase().includes('africa'));
      } else {
        out = out.filter((p) => (p.region || '').toLowerCase() === region);
      }
    }
    if (country) {
      out = out.filter((p) => (p.country || '').toLowerCase() === country
        || (p.city || '').toLowerCase() === country);
    }
    if (q) {
      out = out.filter((p) => (p.name || '').toLowerCase().includes(q)
        || (p.username || '').toLowerCase().includes(q));
    }
    // Re-rank after filter so 1..N is contiguous (preserves prev_rank for trend).
    out.sort((a, b) => b.points - a.points);
    out = out.map((p, i) => ({ ...p, rank: i + 1 }));
    return out;
  };

  if (method === 'GET' && (pathname.endsWith('/ranking/') || pathname.endsWith('/rankings/'))) {
    return successResponse({
      players: filterPool(mockRankingsPlayers),
      teams: filterPool(mockRankingsTeams),
      organizations: filterPool(mockRankingsOrganizations),
    });
  }

  if (method === 'GET' && (pathname.endsWith('/ranking/players/') || pathname.endsWith('/rankings/players/'))) {
    return successResponse({ players: filterPool(mockRankingsPlayers) });
  }
  if (method === 'GET' && (pathname.endsWith('/ranking/teams/') || pathname.endsWith('/rankings/teams/'))) {
    return successResponse({ teams: filterPool(mockRankingsTeams) });
  }
  if (method === 'GET' && (pathname.endsWith('/ranking/organizations/') || pathname.endsWith('/rankings/organizations/'))) {
    return successResponse({ organizations: filterPool(mockRankingsOrganizations) });
  }

  return null;
};

const handleHomeRoutes = async ({ method, pathname }) => {
  if (!pathname.startsWith('/home/')) return null;

  if (method === 'GET' && pathname.endsWith('/home/snapshot/')) {
    const nowMs = Date.now();
    const wallet_balance_vc = mockUser.wallet_balance || 0;
    const wallet_balance_ngn = wallet_balance_vc * 1000;

    // ── Stats ──
    const tournaments_joined = 12;
    const tournaments_won = 4;
    const win_rate = 62; // %
    const rank_position = mockUser.rank || 142;
    const stats = {
      wallet_balance_vc,
      wallet_balance_ngn,
      tournaments_joined,
      tournaments_won,
      win_rate,
      rank_position,
    };

    // ── Live & upcoming matches strip (next 5 the user is in/following) ──
    const matches_strip = [...mockMatches]
      .filter((m) => m.status === 'live' || m.status === 'scheduled')
      .sort((a, b) => {
        // Live first, then soonest scheduled.
        if (a.status === b.status) {
          return new Date(a.scheduled_at) - new Date(b.scheduled_at);
        }
        return a.status === 'live' ? -1 : 1;
      })
      .slice(0, 5);

    // ── Upcoming tournaments (start_date in the future) ──
    const tournaments_upcoming = mockTournaments
      .filter((t) => new Date(t.start_date).getTime() > nowMs)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
      .slice(0, 3);

    // ── Upcoming events ──
    const events_upcoming = mockEvents
      .filter((e) => new Date(e.start_date).getTime() > nowMs)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
      .slice(0, 3);

    // ── Teams shortcut (4) ──
    const teams = mockTeams.slice(0, 4).map((t) => ({
      id: t.id,
      name: t.name,
      tag: t.tag,
      logo: t.logo,
      member_count: t.member_count,
      game: t.game,
    }));

    // ── Wallet snapshot ──
    const recent_transactions = [...mockTransactions]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3);
    const wallet = {
      balance_vc: wallet_balance_vc,
      balance_ngn: wallet_balance_ngn,
      kyc_verified: mockUser.kyc_verified,
    };

    // ── Activity feed (10 items mixing notifications + matches + activity) ──
    const notifSlice = mockNotifications.slice(0, 6).map((n) => ({
      id: `act-n-${n.id}`,
      kind: 'notification',
      type: n.type,
      title: n.title,
      message: n.message,
      at: n.created_at,
      target_url: n.target_url,
      actor: n.actor,
    }));
    const matchSlice = mockMatches
      .filter((m) => m.status === 'completed' || m.status === 'live')
      .slice(0, 3)
      .map((m) => ({
        id: `act-m-${m.id}`,
        kind: m.status === 'live' ? 'match_live' : 'match_result',
        type: m.status === 'live' ? 'match_live' : 'match_result',
        title: m.status === 'live'
          ? `${m.team_a.name} vs ${m.team_b.name} is live`
          : `${m.team_a.name} ${m.score_a}–${m.score_b} ${m.team_b.name}`,
        message: m.tournament_name,
        at: m.status === 'live' ? m.started_at : m.ended_at || m.scheduled_at,
        target_url: `/tournaments/view-tournament?id=${m.tournament_id}`,
      }));
    const activityFromBank = mockActivity.slice(0, 4).map((a) => ({
      id: `act-a-${a.id}`,
      kind: 'activity',
      type: a.type,
      title: a.title,
      message: a.prize ? `+${a.prize.toLocaleString()} VC` : '',
      at: a.at,
      target_url: '/user-profile',
    }));
    const activity_feed = [...notifSlice, ...matchSlice, ...activityFromBank]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10);

    // ── Recommendations — tournaments matching favorite_games ──
    const favoriteGames = (mockUser.favorite_games || []).map((g) => g.toLowerCase());
    const recommendations = mockTournaments
      .filter((t) => {
        const game = (t.game || '').toLowerCase();
        return favoriteGames.some((f) => game.includes(f) || f.includes(game));
      })
      .filter((t) => new Date(t.start_date).getTime() > nowMs)
      .slice(0, 2);

    return successResponse({
      user: {
        id: mockUser.id,
        username: mockUser.username,
        full_name: mockUser.full_name,
        first_name: (mockUser.full_name || '').split(' ')[0] || mockUser.username,
        profile_picture: mockUser.profile_picture,
        favorite_games: mockUser.favorite_games,
        rank: mockUser.rank,
      },
      stats,
      matches_strip,
      tournaments_upcoming,
      events_upcoming,
      teams,
      wallet,
      transactions: recent_transactions,
      activity_feed,
      recommendations,
    });
  }

  return null;
};

// ---------- install ----------

let installed = false;

export function installMockFetch() {
  if (typeof window === 'undefined') return;
  if (installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string'
      ? input
      : input?.url || String(input);

    // For Request objects, the headers live on the request itself.
    const effectiveInit = init && (init.headers || init.method) ? init : (typeof input === 'object' ? input : init);

    if (!shouldIntercept(url, effectiveInit)) {
      return originalFetch(input, init);
    }

    const method = (init?.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();
    let parsed;
    try {
      parsed = new URL(url, window.location.origin);
    } catch {
      return originalFetch(input, init);
    }
    const pathname = parsed.pathname.replace(/\/+$/, '/') || '/';
    const searchParams = parsed.searchParams;
    const body = await parseBody(init);

    await sleep(LATENCY_MS);

    const ctx = { method, pathname, searchParams, body, url };

    try {
      const handlers = [
        handleAuthRoutes,
        handleUserProfileRoutes,
        handleTournamentRoutes,
        handleEventRoutes,
        handleWagerRoutes,
        handleTeamRoutes,
        // Primary admin handler — runs first so the v2 mock state is used for
        // /admin/users/, /admin/tournaments/, /admin/payouts/, /admin/kyc/,
        // /admin/audit-log/, /admin/settings/, /admin/auth/login/, etc.
        handleAdminRoutes,
        // Legacy / extended admin handlers — fall-through aliases (e.g.
        // /admin/metrics/timeline/, /admin/kyc/queue/, /admin/user/:id/ban/).
        handleAdminExtRoutes,
        handleOrganizationRoutes,
        handleAnimeRoutes,
        handleCommunityRoutes,
        handleMarketplaceRoutes,
        handleShopRoutes,
        // ── Extended (v2) handlers — parallel-build mock layer ──
        handleWalletExtRoutes,
        handleOrgExtRoutes,
        handleProductRoutes,
        handleOrderRoutes,
        handleCartRoutes,
        handleListingRoutes,
        handlePurchaseRoutes,
        handleMangaRoutes,
        handleChapterRoutes,
        handleAmvRoutes,
        handleRoomRoutes,
        handleWagerExtRoutes,
        handleBetRoutes,
        handleMatchRoutes,
        handleNotificationRoutes,
        handlePostRoutes,
        handleThreadRoutes,
        handleClubRoutes,
        handleDmRoutes,
        handleScrimRoutes,
        handleBracketRoutes,
        handleProductionRoutes,
        handleTicketRoutes,
        handleVendorRoutes,
        handleMetricRoutes,
        handleKycRoutes,
        handleAuditRoutes,
        handleSettingRoutes,
        handleDeviceRoutes,
        handleInviteRoutes,
        handleRequestRoutes,
        handleSearchRoutes,
        handleRankingRoutes,
        handleHomeRoutes,
      ];

      for (const handler of handlers) {
        // eslint-disable-next-line no-await-in-loop
        const response = await handler(ctx);
        if (response) return response;
      }

      // Fallback — no handler matched but the URL looked like a V-ENT API call.
      // Return an empty success envelope so pages don't hard-crash.
      // eslint-disable-next-line no-console
      console.warn('[mockFetch] Unhandled API route:', method, pathname, '— returning empty success.');
      return successResponse({});
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[mockFetch] Handler threw for', method, pathname, err);
      return errorResponse('Mock handler error: ' + (err?.message || 'unknown'), 500);
    }
  };
}
