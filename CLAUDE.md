# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured.

---

## Project Overview

V-ENT (Vermillion Enterprise) is an all-in-one platform for competitive gaming, event management, anime culture, and digital commerce — built for the African market first. Stack: **Next.js 14 (App Router) + Django REST Framework backend + MySQL**.

Backend is a separate repo. Frontend calls the backend via `process.env.NEXT_PUBLIC_API_URL`. All API responses follow the shape `{ status: "success" | "error", data: {...}, message: "..." }`.

---

## Architecture

### Styling System
No Tailwind. Styling is **CSS Modules** (`.module.css` per component) + **global CSS variables** defined in `src/app/globals.css`.

Every page also has its own `.module.css`. CSS Modules files for shared/page-level styles also exist in `public/styles/` (imported via the `@/styles/*` alias).

**Never use one-off hex values.** Always use the CSS variables defined in `globals.css`:

```css
/* Colors */
--primary-bg: #FFFFFF      /* inverted in dark: #000000 */
--primary-text: #000000
--v-ent-grn: #4caf50       /* primary action color */
--v-ent-light-grn: #00FF08 /* hover state */
--v-ent-red: #ED1C24
--v-ent-light-red: #FF0008
--overlay-gray: #212225

/* Font sizes — always use these, not arbitrary values */
--desktop-h1-size through --desktop-h6-size  (3.5rem → 1.5rem)
--mobile-h1-size through --mobile-h6-size    (2rem → 0.75rem)
--fs-p-size-desktop: 1rem
--fs-p-size-mobile: 0.85rem

/* Font weights */
--fw-extra-bold: 800  --fw-bold: 700  --fw-semi-bold: 600
--fw-medium: 500      --fw-regular: 400  --fw-light: 300
```

**Global button classes** in `globals.css` (use these, don't recreate): `.btn`, `.grnBTN`, `.redBTN`.

**Primary font:** Clash Grotesk (self-hosted from `public/fonts/clash_grotesk/`, loaded via `src/app/clash-grotesk.css`). Set globally on `*` in `globals.css`. Next.js also loads Inter via `next/font` in the root layout (body fallback).

**Breakpoints:** Mobile 375px, Desktop 1440px. Always design both.

### Path Aliases (`jsconfig.json`)
```
@/*           → src/*
@/images/*    → public/images/*
@/styles/*    → public/styles/*
@/view-/*     → public/styles/modules/*
```

### App Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── api/auth/               # NextAuth routes + backend-callback handler
│   ├── tournaments/            # Tournament list, view, create, drafts, register
│   ├── events/                 # Event list, view, create
│   ├── teams/                  # Teams list + team-profile
│   ├── user-profile/           # View user profile
│   ├── edit-user-profile/      # Edit user profile
│   ├── edit-team-profile/      # Edit team profile
│   ├── wallets/                # Wallet page (stub)
│   ├── rankings/               # Rankings page
│   ├── settings/               # Account settings
│   ├── login/ signup/ forgot-password/ reset-password/ verify-email/ email-verified/
│   └── anime/ privacy-policy/ reset-email/
├── components/                 # Feature components (co-located with module CSS)
│   ├── SessionWrapper.js       # Wraps app in next-auth SessionProvider
│   ├── header/ mobile-header/  # Top navigation
│   ├── sidebar/                # Desktop sidebar
│   ├── bottom-menu/            # Mobile bottom navigation
│   ├── footer/                 # Footer
│   ├── auth-header/            # Header for auth pages
│   ├── landing/                # Landing page sections
│   ├── view-tournament/        # Tournament detail tabs (overview, rules, bracket, participants, prize)
│   ├── create-tournament-component/  # 5-step tournament creation wizard
│   ├── create-event-component/       # 5-step event creation wizard (mirrors tournament wizard)
│   ├── events/                 # Events listing components
│   ├── edit-user-profile/      # Edit profile sub-components
│   ├── edit-team-profile/      # Edit team profile sub-components
│   ├── drafts/                 # Draft tournament card
│   └── ...
├── constants/vent.js           # API endpoint constants + re-exports NextAuth handler
├── hooks/useIntersectionObserver.js
└── middleware.js               # Auth route protection
lib/
└── authOptions.js              # NextAuth config (Credentials + Google + Facebook)
public/
├── fonts/clash_grotesk/        # Self-hosted font files
├── styles/                     # Additional CSS Modules (some page-level styles live here)
└── images/
```

### Authentication

NextAuth v4 with JWT strategy (`lib/authOptions.js`). Three providers: Credentials (email/password), Google, Facebook. On successful auth, the Django backend returns a `session_token` which is stored in the JWT and passed as `session.user.sessionToken`. Additionally, a `session` cookie is used by some flows.

**Protected routes** (redirect to `/login` if unauthenticated): `/events`, `/anime`, `/user-profile`, `/edit-user-profile`, `/teams`, `/edit-team-profile`.

**Auth middleware** (`src/middleware.js`) checks both `nextAuthToken` (JWT) and `session` cookie. Do not rely solely on middleware for security — always verify auth at the data layer.

After login, users are always redirected to `/user-profile`.

### API Calls

Pages are almost entirely `'use client'` components fetching data with `useEffect` + `fetch`. The pattern:
```js
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/some/endpoint/`);
const data = await response.json();
// data.status === 'success', data.data is the payload
```

For authenticated requests, pass `Authorization: Bearer ${session.user.sessionToken}`.

### Multi-Step Wizards

Tournament creation and event creation both use a 5-step wizard pattern: Basic Info → Format & Participants → Prize Distribution → Sponsors & Links → Review. The wizard state is managed in the parent `Create*Component.js` and passed down. Both wizards are structurally identical — `create-tournament-component/` and `create-event-component/` mirror each other.

---

## Key Conventions

- **JavaScript only** — no TypeScript despite the BRD mentioning it. All files are `.js`.
- **'use client'** is on nearly every page. The codebase does not yet use Server Components for data fetching.
- **CSS Modules** for all component/page styles. No inline styles, no Tailwind.
- Each component lives in its own folder alongside its `.module.css` file.
- Tournament/event IDs are passed via URL search params (`?id=...`), not path segments.
- `console.log` statements are present throughout — this is development-phase code.
- The `public/styles/` directory contains some CSS Module files that are imported by `src/` pages using the `@/styles/*` alias.

---

## What's Built vs. What's Not

**Built:** Auth flow (login, signup, verify email, password reset), landing page, user profile (view/edit), tournament homepage + detail view (overview, rules, participants, prize tabs), tournament creation wizard (5-step, UI complete), tournament registration modal (team/individual → payment → success), tournament drafts, teams page + team profile (view/edit), events page + view event, event creation wizard (5-step, UI complete), rankings page, wallet page (stub only).

**Not yet built:** Bracket visualization (component is a placeholder stub), wallet transactions (buy/send VENT COINS, payouts), admin dashboard, production/streaming integration (OBS/VMIX/Streamlabs), home page (logged-in state), organizations, community, anime, marketplace, wager system, e-commerce shop.

**Design reference:** [VENT-Main Figma file](https://www.figma.com/design/Ne1xquUxx1yZc0NhkN8kUE/VENT-Main). See `docs/V-ENT_Figma_Audit_UPDATED.md` for full design status per screen.

---

## Build Priority

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1 MVP** | Tournament brackets + join/leave, production/streaming integration (OBS/VMIX/Streamlabs), wallet system (buy/send VENT COINS, payouts), admin dashboard (lightweight: user mgmt, tournament oversight, payout approval) | 🔴 In progress |
| **Phase 2** | Events + ticketing + tournament-event linking + vendor shop system | Not started |
| **Phase 3** | E-Commerce Shop (Vent Shop) | Not started |
| **Phase 4** | Marketplace (Vermillion City) | Not started |
| **Phase 5** | Anime Features (manga, AMV, co-reading) | Not started |
| **Phase 6** | Wager System — build LAST, legal review required first | Not started |

Admin dashboard must be in Phase 1 MVP. Do not start Phase 2 until Phase 1 is stable.

---

## Verification Protocol

Every page must follow one of three tracks before it's considered done:

- **Track A (Figma exists):** Pull Figma screenshot via `get_design_context` → Code the page → Screenshot built output → Compare side-by-side → Fix gaps → Mark **VERIFIED**
- **Track B (No Figma design):** Create an HTML mockup → Get CEO approval → Code the Next.js page → Compare against approved mockup → Fix gaps → Mark **VERIFIED (SELF-DESIGNED)**
- **Track C (Backend/logic only):** Standard code review, no visual comparison needed

**Never code a page without either a Figma reference or a CEO-approved mockup.** Pages with no Figma design that still need building: wallet system, admin dashboard, event creation organizer tools, ticketing, vendor shops, organizations, logged-in home page.

---

## Figma File

**File:** [VENT-Main](https://www.figma.com/design/Ne1xquUxx1yZc0NhkN8kUE/VENT-Main)
**fileKey:** `Ne1xquUxx1yZc0NhkN8kUE`
Use `get_design_context` with the fileKey above to pull screenshots and design context.

Key node IDs:
| Screen | nodeId |
|--------|--------|
| Landing Page | `3171:21723` |
| User Registration (all auth) | `0:1` |
| User Profile | `7:376` |
| Tournaments (explore) | `458:3639` |
| Tournament Creation | `2338:20196` |
| Tournament Management | `4052:20591` |
| Events | `783:7978` |
| Teams | `1126:15009` |

---

## Self-Design Rules

For pages with no Figma design (wallet, admin, event management, ticketing, vendor shops, organizations, etc.), create an HTML mockup for CEO approval **before** coding the actual Next.js page. All self-designed pages must follow:

- Use **only** existing CSS variables from `globals.css` — no new hex values
- Use **only** existing component patterns: Sidebar + Header/MobileHeader + content area + BottomMenu
- Reuse existing button classes: `.btn`, `.grnBTN`, `.redBTN`
- Dark theme: `--primary-bg` / `--overlay-gray` (`#212225`) / `#303136` for surfaces
- Font: Clash Grotesk at the defined `--desktop-*` / `--mobile-*` size variables only
- Desktop layout: ~248px sidebar + remaining content area
- Mobile: 375px viewport with 16px horizontal padding
- Never invent new components — match patterns from existing pages

---

## Known Technical Debt

- **Hardcoded mock data** in tournament/event listing components (`fifaTournamentsList.js`, `pubgTournamentsList.js`, `fifaEventsList.js`, etc.) — needs real API integration
- **`console.log` throughout codebase** including auth token data in `lib/authOptions.js` and every request logged in `src/middleware.js` — must be removed before production
- **`react-quill` imported without `dynamic()`** in tournament creation wizard — will cause SSR hydration errors; wrap with `dynamic(() => import('react-quill'), { ssr: false })`
- **No `loading.js` or `error.js`** in any route segment — no route-level loading or error states
- **No reusable UI component library** — buttons, inputs, and form elements are recreated per page; should be extracted into shared components
- **`/tournaments` routes not in `protectedRoutes`** in middleware — tournament browsing, creation, and registration are publicly accessible without login; confirm if intentional
- **Dead NextAuth exports in `src/constants/vent.js`** — this file exports `GET`/`POST` handler from a non-route location; these exports do nothing since the file isn't under `src/app/api/`. Clean up: keep only the `VENTT` constants object
- **Teams module: 5 hardcoded data files** — `cardDataList.js`, `membersList.js`, `requestList.js`, `teamProfileTournamentsList.js`, `teamEventsList.js` — all need real API integration; team profile links go to `/teams/team-profile` with no `?id=` param
- **Dual auth prefix bug** — some components use `Authorization: Bearer`, others fall back to `Authorization: Token`; standardize on `Bearer` across all components
- **`Payment.js` hardcoded balance** — `src/components/view-tournament/tournament-register/payment/Payment.js` uses hardcoded wallet balance of `526` and simulates Paystack with `setTimeout`; must be replaced with real wallet API
- **Hardcoded backend URL in `CreateTournamentComponent.js:297`** — uses literal `https://vermillionent.pythonanywhere.com` instead of `process.env.NEXT_PUBLIC_API_URL`; same issue in `events/view-event/page.js`
- **Duplicate/inconsistent API URL paths** — some endpoints called as `/get-all-tournaments/`, others as `/tournament/get-all-tournaments/`; confirm correct prefix with backend team
- **`/anime/page.js` status unknown** — file exists (it's in middleware's protectedRoutes) but content may be a stub; verify before building anime module
- **10 security issues identified** — see `docs/modules/15-SECURITY.md` for full list including token logging, hardcoded URLs, missing DOMPurify, and simulated payments

---

## Infrastructure

| Service | Provider | Details |
|---------|----------|---------|
| Backend hosting | AWS EC2 | t3.small — Django + Celery + Daphne |
| Database | AWS RDS | MySQL db.t3.micro |
| File storage (public) | AWS S3 | Bucket: `v-ent-media` |
| File storage (private) | AWS S3 | Bucket: `v-ent-private` |
| CDN | AWS CloudFront | In front of S3 |
| Email | AWS SES | Transactional email |
| Cache / WebSockets | AWS ElastiCache | Redis t3.micro |
| Frontend hosting | Vercel | Free tier |
| DNS / Security | Cloudflare | Free tier — in front of AWS |
| Payments | Paystack | Nigerian gateway — all payment flows |
| Push notifications | Firebase Cloud Messaging | Free tier |
| IP geolocation | ipinfo.io | Free tier |
| Error tracking | Sentry | Free tier |
| Analytics | PostHog | Free tier |

**Budget:** $1,000 AWS credits — approximately $61–66/month, lasting ~15 months.

---

## External Services Rule

Before suggesting or integrating any third-party service, check `docs/V-ENT_External_Tools_and_Services.md` to see if an equivalent already exists in the stack.

- **AWS-first:** use AWS services where possible — they are covered by credits (S3, SES, ElastiCache, CloudFront before any paid alternatives)
- **Payments:** all payment flows go through Paystack — never simulate payments, never introduce a second payment provider without explicit approval
- **Never use Tailwind, TypeScript, or Server Components** — this project uses CSS Modules, JavaScript, and `'use client'` pattern throughout
- **Never hardcode API keys or secrets** — use environment variables; never commit `.env.local`

---

## Docs

- `docs/V-ENT_BRD.md` — Business requirements, product phases, revenue model
- `docs/V-ENT_Best_Practices.md` — Development standards for Next.js (JavaScript), Django, and security
- `docs/V-ENT_Figma_Audit_UPDATED.md` — Design status for every screen (what's designed vs. missing vs. built)
- `docs/V-ENT_External_Tools_and_Services.md` — All external services, APIs, and AWS infrastructure decisions
- `docs/modules/01-TOURNAMENTS.md` through `docs/modules/15-SECURITY.md` — Per-module specs with Figma node IDs, component trees, API endpoints, Django models, acceptance criteria, and task checklists
