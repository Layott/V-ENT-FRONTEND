# V-ENT Functional Audit Report

**Run:** 2026-04-26T22:06:23.163Z  
**Base URL:** http://localhost:3000  
**Routes walked:** 112  
**Total findings:** 176 — P0: 48 / P1: 90 / P2: 38

## Methodology

Headless Chrome via puppeteer-core. Demo-login once, then visit every route and exercise:
console errors, HTTP 4xx/5xx, broken imgs, missing alt, header search submit, sidebar/bottom-menu link health, header icons (avatar/notif/cart/wishlist), tab/panel sync with URL, form/submit pairing, like-toggle, modal ESC close, logout, mobile shell @ 375x812, and stale "coming soon"/TODO copy. Findings de-duped per route+module.

## Top 10 Most-Impactful Issues

- **P0** `/privacy-policy` — Console error: console.error: Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- **P0** `/home` — Console error: console.error: Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- **P0** `/search?q=fifa` — Navigation failed: Navigation timeout of 25000 ms exceeded
- **P0** `/tournaments/view-tournament?id=tmt_1000&tab=rules` — Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found)
- **P0** `/tournaments/view-tournament?id=tmt_1000&tab=rules` — Page renders 404 / Not Found content
- **P0** `/tournaments/view-tournament?id=tmt_1000&tab=bracket` — Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found)
- **P0** `/tournaments/view-tournament?id=tmt_1000&tab=bracket` — Page renders 404 / Not Found content
- **P0** `/tournaments/view-tournament?id=tmt_1000&tab=participants` — Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found)
- **P0** `/tournaments/view-tournament?id=tmt_1000&tab=participants` — Page renders 404 / Not Found content
- **P0** `/tournaments/view-tournament?id=tmt_1000&tab=prize` — Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found)

## Findings by Module

### Landing  (1)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/` | P1 | BROKEN | 1 form(s) have no submit button | Add submit button or convert to non-form |

### Public  (2)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/privacy-policy` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 500 (Internal Server Error) | Fix runtime exception |
| `/privacy-policy` | P1 | BROKEN | Network error: HTTP 500: http://localhost:3000/api/auth/session | Investigate failed request / endpoint |

### Home  (5)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/home` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 500 (Internal Server Error) | Fix runtime exception |
| `/home` | P1 | BROKEN | Network error: HTTP 500: http://localhost:3000/api/auth/_log | Investigate failed request / endpoint |
| `/home` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/home` | P2 | INCONSISTENT | Header search input absent | Confirm whether header search expected on this shell |
| `/home` | P2 | MISSING | Header lacks avatar + notification icons | Add header user actions (avatar dropdown, notification bell) |

### Search  (1)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/search?q=fifa` | P0 | BROKEN | Navigation failed: Navigation timeout of 25000 ms exceeded | Investigate route |

### Profile  (21)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/user-profile` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/user-profile?id=user_002` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/user-profile?tab=activity` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/user-profile?tab=gallery` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/user-profile?tab=social` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/user-profile?tab=games` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/edit-user-profile` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/edit-user-profile?panel=info` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/edit-user-profile?panel=games` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/edit-user-profile?panel=accounts` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/edit-user-profile?panel=social` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/user-profile` | P2 | INCONSISTENT | Header search input absent | Confirm whether header search expected on this shell |
| `/user-profile` | P2 | MISSING | Header lacks avatar + notification icons | Add header user actions (avatar dropdown, notification bell) |
| `/user-profile?tab=activity` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/user-profile?tab=gallery` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/user-profile?tab=social` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/user-profile?tab=games` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/edit-user-profile?panel=info` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/edit-user-profile?panel=games` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/edit-user-profile?panel=accounts` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/edit-user-profile?panel=social` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |

### Tournaments  (22)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/tournaments/view-tournament?id=tmt_1000&tab=rules` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/tournaments/view-tournament?id=tmt_1000&tab=rules` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/tournaments/view-tournament?id=tmt_1000&tab=bracket` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/tournaments/view-tournament?id=tmt_1000&tab=bracket` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/tournaments/view-tournament?id=tmt_1000&tab=participants` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/tournaments/view-tournament?id=tmt_1000&tab=participants` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/tournaments/view-tournament?id=tmt_1000&tab=prize` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/tournaments/view-tournament?id=tmt_1000&tab=prize` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/tournaments/view-tournament?id=tmt_1000&tab=rules` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/tournaments/view-tournament?id=tmt_1000&tab=rules | Investigate failed request / endpoint |
| `/tournaments/view-tournament?id=tmt_1000&tab=rules` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/tournaments/view-tournament?id=tmt_1000&tab=bracket` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/tournaments/view-tournament?id=tmt_1000&tab=bracket | Investigate failed request / endpoint |
| `/tournaments/view-tournament?id=tmt_1000&tab=bracket` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/tournaments/view-tournament?id=tmt_1000&tab=participants` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/tournaments/view-tournament?id=tmt_1000&tab=participants | Investigate failed request / endpoint |
| `/tournaments/view-tournament?id=tmt_1000&tab=participants` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/tournaments/view-tournament?id=tmt_1000&tab=prize` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/tournaments/view-tournament?id=tmt_1000&tab=prize | Investigate failed request / endpoint |
| `/tournaments/view-tournament?id=tmt_1000&tab=prize` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/tournaments/create-tournament` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/tournaments/drafts` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/tournaments/register-tournament?id=tmt_1000` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/tournaments/overlay?id=tmt_1000` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/tournaments/view-tournament?id=tmt_1000&tab=rules` | P2 | INCONSISTENT | Header search input absent | Confirm whether header search expected on this shell |
| `/tournaments/view-tournament?id=tmt_1000&tab=rules` | P2 | MISSING | Header lacks avatar + notification icons | Add header user actions (avatar dropdown, notification bell) |

### Events  (8)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/events` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/events/view-event?id=evt_2000` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/events/create-event` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/events/my-tickets` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/events/vendor-shop` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/events/vendor-shop/vendor?id=vnd_0` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/events` | P2 | INCONSISTENT | Header search input absent | Confirm whether header search expected on this shell |
| `/events` | P2 | MISSING | Header lacks avatar + notification icons | Add header user actions (avatar dropdown, notification bell) |

### Teams  (12)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/teams` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/teams?tab=owned` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/teams?tab=joined` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/teams?tab=invited` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/teams/create-team` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/teams/team-profile?id=team_500` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/edit-team-profile?id=team_500` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/teams` | P2 | INCONSISTENT | Header search input absent | Confirm whether header search expected on this shell |
| `/teams` | P2 | MISSING | Header lacks avatar + notification icons | Add header user actions (avatar dropdown, notification bell) |
| `/teams?tab=owned` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/teams?tab=joined` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/teams?tab=invited` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |

### Rankings  (1)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/rankings` | P1 | BROKEN | Header search Enter does not navigate to /search?q= | Wire search submit to /search route |

### Wallets  (7)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/wallets` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/wallets/topup` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/wallets/send` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/wallets/withdraw` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/wallets/history` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/wallets` | P2 | INCONSISTENT | Header search input absent | Confirm whether header search expected on this shell |
| `/wallets` | P2 | MISSING | Header lacks avatar + notification icons | Add header user actions (avatar dropdown, notification bell) |

### Organizations  (7)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/organizations/manage?id=org_0` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/organizations/manage?id=org_0` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/organizations` | P1 | BROKEN | Header search Enter does not navigate to /search?q= | Wire search submit to /search route |
| `/organizations/manage?id=org_0` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/organizations/manage?id=org_0&tab=members | Investigate failed request / endpoint |
| `/organizations/manage?id=org_0` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/organizations/manage?id=org_0` | P2 | INCONSISTENT | Header search input absent | Confirm whether header search expected on this shell |
| `/organizations/manage?id=org_0` | P2 | MISSING | Header lacks avatar + notification icons | Add header user actions (avatar dropdown, notification bell) |

### Marketplace  (1)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/marketplace/create` | P1 | BROKEN | Header search Enter does not navigate to /search?q= | Wire search submit to /search route |

### Shop  (1)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/shop/cart` | P1 | BROKEN | Header search Enter does not navigate to /search?q= | Wire search submit to /search route |

### Anime  (28)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/anime?tab=coread` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/anime?tab=coread` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/anime?tab=battles` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/anime?tab=battles` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/anime?tab=mylist` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/anime?tab=mylist` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/anime/manga/series?id=mngx_0` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/anime/manga/series?id=mngx_0` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/anime/reader?manga=mng_0&chapter=1` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 500 (Internal Server Error) | Fix runtime exception |
| `/anime/room?id=roomx_0` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/anime/room?id=roomx_0` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/anime?tab=coread` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/anime?tab=coread | Investigate failed request / endpoint |
| `/anime?tab=coread` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/anime?tab=battles` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/anime?tab=battles | Investigate failed request / endpoint |
| `/anime?tab=battles` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/anime?tab=mylist` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/anime?tab=mylist | Investigate failed request / endpoint |
| `/anime?tab=mylist` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/anime/manga/series?id=mngx_0` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/anime/manga/series?id=mngx_0 | Investigate failed request / endpoint |
| `/anime/manga/series?id=mngx_0` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/anime/reader?manga=mng_0&chapter=1` | P1 | BROKEN | Network error: HTTP 500: http://localhost:3000/anime/reader?manga=mng_0&chapter=1 | Investigate failed request / endpoint |
| `/anime/reader?manga=mng_0&chapter=1` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/anime/reader?manga=mng_0&chapter=1` | P1 | BROKEN | No <h1>/<h2>/page-title found on render | Confirm content actually mounts |
| `/anime/amv` | P1 | BROKEN | Header search Enter does not navigate to /search?q= | Wire search submit to /search route |
| `/anime/room?id=roomx_0` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/anime/room?id=roomx_0 | Investigate failed request / endpoint |
| `/anime/room?id=roomx_0` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/anime?tab=amvs` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/anime?tab=coread` | P2 | INCONSISTENT | Header search input absent | Confirm whether header search expected on this shell |
| `/anime?tab=coread` | P2 | MISSING | Header lacks avatar + notification icons | Add header user actions (avatar dropdown, notification bell) |

### Community  (18)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/community?tab=forums` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/community?tab=forums` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/community?tab=clubs` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/community?tab=clubs` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/community?tab=dms` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/community?tab=dms` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/community?tab=scrims` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/community?tab=scrims` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/community?tab=forums` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/community?tab=forums | Investigate failed request / endpoint |
| `/community?tab=forums` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/community?tab=clubs` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/community?tab=clubs | Investigate failed request / endpoint |
| `/community?tab=clubs` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/community?tab=dms` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/community?tab=dms | Investigate failed request / endpoint |
| `/community?tab=dms` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/community?tab=scrims` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/community?tab=scrims | Investigate failed request / endpoint |
| `/community?tab=scrims` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/community?tab=forums` | P2 | INCONSISTENT | Header search input absent | Confirm whether header search expected on this shell |
| `/community?tab=forums` | P2 | MISSING | Header lacks avatar + notification icons | Add header user actions (avatar dropdown, notification bell) |

### Wager  (2)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/wager/pool?id=wp_0` | P1 | BROKEN | No <h1>/<h2>/page-title found on render | Confirm content actually mounts |
| `/wager/match?id=mtch_0` | P1 | BROKEN | No <h1>/<h2>/page-title found on render | Confirm content actually mounts |

### Settings  (26)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/settings?panel=payments` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/settings?panel=payments` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/settings?panel=language` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/settings?panel=language` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/settings?panel=devices` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/settings?panel=devices` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/settings?panel=linked` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/settings?panel=linked` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/settings?panel=danger` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/settings?panel=danger` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/settings?panel=payments` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/settings?panel=payments | Investigate failed request / endpoint |
| `/settings?panel=payments` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/settings?panel=language` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/settings?panel=language | Investigate failed request / endpoint |
| `/settings?panel=language` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/settings?panel=devices` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/settings?panel=devices | Investigate failed request / endpoint |
| `/settings?panel=devices` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/settings?panel=linked` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/settings?panel=linked | Investigate failed request / endpoint |
| `/settings?panel=linked` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/settings?panel=danger` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/settings?panel=danger | Investigate failed request / endpoint |
| `/settings?panel=danger` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/settings?panel=account` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/settings?panel=notifications` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/settings?panel=privacy` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/settings?panel=security` | P2 | BROKEN | URL has tab/panel param but no tab UI rendered | Render tabs that match URL state |
| `/settings?panel=payments` | P2 | INCONSISTENT | Header search input absent | Confirm whether header search expected on this shell |
| `/settings?panel=payments` | P2 | MISSING | Header lacks avatar + notification icons | Add header user actions (avatar dropdown, notification bell) |

### Production  (6)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/production/overlay-editor?id=ovl_scoreboard` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/production/overlay-editor?id=ovl_scoreboard` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/production/overlay-editor?id=ovl_scoreboard` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/production/overlay-editor?id=ovl_scoreboard | Investigate failed request / endpoint |
| `/production/overlay-editor?id=ovl_scoreboard` | P1 | MISSING | No sidebar links detected (sidebar absent or empty) | Confirm sidebar shell mounted |
| `/production/overlay-editor?id=ovl_scoreboard` | P2 | INCONSISTENT | Header search input absent | Confirm whether header search expected on this shell |
| `/production/overlay-editor?id=ovl_scoreboard` | P2 | MISSING | Header lacks avatar + notification icons | Add header user actions (avatar dropdown, notification bell) |

### Admin  (5)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/admin/kyc` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/admin/kyc` | P0 | BROKEN | Page renders 404 / Not Found content | Build route or fix data fetch |
| `/admin/audit-log` | P0 | BROKEN | Navigation failed: net::ERR_ABORTED at http://localhost:3000/admin/audit-log | Investigate route |
| `/admin/settings` | P0 | BROKEN | Console error: console.error: Failed to load resource: the server responded with a status of 404 (Not Found) | Fix runtime exception |
| `/admin/kyc` | P1 | BROKEN | Network error: HTTP 404: http://localhost:3000/admin/kyc | Investigate failed request / endpoint |

### Mobile  (2)

| Route | Severity | Type | Description | Suggested Fix |
|-------|----------|------|-------------|---------------|
| `/user-profile` | P1 | MISSING | Bottom menu absent at 375px viewport | Mount BottomMenu on mobile shell |
| `/settings` | P1 | MISSING | Bottom menu absent at 375px viewport | Mount BottomMenu on mobile shell |

## Notes

- Screenshots of P0 routes saved to `tasks/audit-screens/`
- Many findings are derived from heuristic DOM probes; verify edge cases manually before fixing
- Phase 4–6 routes (Marketplace / Shop / Anime / Community / Wager) are intentionally stubbed; "coming soon" markers there are not flagged
