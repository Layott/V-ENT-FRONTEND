# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Non-Negotiable Rules (apply to every task)

1. **Verify before hand-off — no exceptions.** Build pass is not proof. Start the dev server, log in as demo user, walk every page you changed, confirm no console errors, no broken images, no missing data. Re-test the exact path you fixed until the symptom is gone. "Ships clean" = CEO can click through with zero surprises.
2. **Design parity — even self-designed.** Every new page (including pages without a Figma source) must look like the same designer who built `/wallets`, `/user-profile`, `/tournaments`. Screenshot-compare against the closest built reference before presenting. Same padding, border-radius, card bg, typography, spacing scale, hover states.
3. **Use agents for parallel build work.** Default to dispatching agents when tasks are independent. Single-threaded execution wastes wall-clock time.
4. **Update `tasks/lessons.md` after every correction.** Prevent the same mistake twice.

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

## Design Reference Protocol — MANDATORY

Every new page or component MUST follow this process. No exceptions.

### STEP 1: Read the Existing Design System
Before writing ANY new CSS or layout code, read these files completely:
- `src/app/globals.css` — ALL CSS variables (colors, fonts, sizes, weights)
- `src/app/clash-grotesk.css` — font face definitions
- `src/components/sidebar/Sidebar.js` + `Sidebar.module.css`
- `src/components/header/Header.js` + `Header.module.css`
- `src/components/mobile-header/MobileHeader.js` + `MobileHeader.module.css`
- `src/components/bottom-menu/BottomMenu.js` + `BottomMenu.module.css`
- `public/images/` — all available logos, favicons, icons

### STEP 2: Study 3 Reference Pages
Read the FULL code + CSS for these built pages:
- `src/app/user-profile/page.js` + its module CSS — profile layout, stats cards, avatar
- `src/app/tournaments/page.js` + its module CSS — listing page, cards, filters, search
- `src/components/view-tournament/` — all tabs + their CSS

Extract and note these patterns from the reference pages:
- Exact padding and margin values
- Border radius values
- Card structure (background, border, shadow, spacing)
- Table style (header, row height, alternating colors)
- Button classes used (`.btn`, `.grnBTN`, `.redBTN`)
- Tab/navigation patterns
- Empty states and loading states
- Desktop (1440px) to mobile (375px) responsive patterns

### STEP 3: Build Using ONLY Existing Patterns
- ONLY use CSS variables from `globals.css` — NEVER raw hex values
- ONLY use existing component structure (Sidebar + Header + content area)
- ONLY use existing card, table, button, tab patterns from reference pages
- ONLY use font sizes from CSS variables (`--desktop-h1-size` through `h6`, `--fs-p-size-desktop`)
- ONLY use the same spacing, border-radius, and hover effects observed in Step 2
- Use V-ENT logo and favicon from `public/images/`

### STEP 4: Self-Check Before Showing
Compare your new page against the reference pages:
- Does the sidebar look identical to the existing sidebar?
- Does the header look identical to the existing header?
- Are cards the same style (background, border, padding, border-radius)?
- Are fonts the same size and weight?
- Are ALL colors from CSS variables?
- Does mobile view use the same bottom-nav pattern?
- Would a user think this was designed by the same person who built the existing pages?

If ANY answer is no — fix it before presenting.

### STEP 5: Present With References
When showing the result, state which existing page was referenced for each pattern:
- "Card style: referenced user-profile stats cards"
- "Table style: referenced tournament participants tab"
- "Layout: referenced tournaments listing page"

This protocol applies to ALL Track B pages: admin dashboard, wallet UI, organizer management, production overlays, home page, organizations, community, and any future pages without Figma designs.

---

## Mockup Quality Standard — MANDATORY

### Gold Standard Reference
The wallet mockup at docs/mockups/wallet.html is the quality benchmark. Every new mockup and page MUST match this level of:
- Design consistency with existing V-ENT pages
- Responsive behavior across all screen sizes
- Polish and attention to detail

### Responsive Requirements — ALL Pages and Mockups
Every page and HTML mockup MUST be fully responsive. Not just two breakpoints — fluid across ALL screen sizes:

**Breakpoints to support:**
- Mobile: 375px (primary mobile target)
- Small tablet: 768px
- Tablet/small laptop: 1024px
- Desktop: 1440px (primary desktop target)
- Large desktop: 1920px+

**Responsive rules:**
- Sidebar collapses to bottom navigation on mobile (match existing pattern from Sidebar.js + BottomMenu.js)
- Cards stack vertically on mobile, grid on desktop
- Tables become expandable card lists on mobile (match tournament participants pattern)
- Font sizes switch between desktop and mobile CSS variables (--desktop-h1-size vs --mobile-h1-size)
- Touch targets minimum 44px on mobile
- No horizontal scrolling at any breakpoint
- Images and media scale proportionally
- Modals become full-screen on mobile
- Form inputs are full-width on mobile

**Testing responsive:**
Before presenting any mockup or page, mentally verify it works at 375px, 768px, 1024px, and 1440px. If any breakpoint looks broken, fix it first.

### Mockup File Standards
All HTML mockups saved to docs/mockups/ must:
- Be fully self-contained single HTML files (inline CSS, no external dependencies except Google Fonts as fallback)
- Include the Clash Grotesk font (load from public/fonts/ or use Google Fonts fallback)
- Use the EXACT CSS variables from globals.css (copy them into the mockup's style block)
- Include the V-ENT logo from public/images/
- Include the favicon
- Be interactive where relevant (tabs should switch, dropdowns should open, sidebar should collapse on mobile)
- Include smooth transitions and hover states matching existing pages
- Work when opened directly in a browser (file:///path/to/mockup.html)

### What to Reference for Each Page Type

| Building This | Reference These Existing Pages |
|--------------|-------------------------------|
| Dashboard/overview | user-profile (stats cards, layout), tournaments page (card grid) |
| Data table page | view-tournament participants tab (table style, search, pagination) |
| Form/wizard page | create-tournament-component (multi-step wizard, form inputs, validation) |
| Detail/view page | view-tournament overview tab (hero banner, info sections, tabs) |
| Listing page | tournaments page (card grid, filters, search bar) |
| Settings page | settings page (sidebar nav + content panels) |
| Modal/dialog | tournament registration modal (overlay, steps, confirmation) |
| Wallet/financial | docs/mockups/wallet.html (THE gold standard for financial UI) |

### For EVERY New Page — Read These Files First
This is not optional. Read ALL of these before writing a single line of CSS:
1. src/app/globals.css — every CSS variable
2. The module CSS of the reference page closest to what you're building
3. src/components/sidebar/Sidebar.module.css — sidebar dimensions and style
4. src/components/header/Header.module.css — header dimensions and style
5. src/components/bottom-menu/BottomMenu.module.css — mobile nav style

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

---

## 🛑 HARD RULE - Design: no hairline borders, no glow (owner, 2026-08-17)

Two bans. Absolute. Every project, every framework, every component. Applies to code I write AND designs I propose.

### Ban 1 - No hairline / outlined anything

Never build structure out of 1px strokes. Banned shapes:

- **outlined card** - thin line rectangle drawn around content
- **outlined pill / chip** - filter chips with a ring (`All games`, `Streams`, `Teams`, ...)
- **divider / rule** - line between rows, list items, or sections
- **dashed placeholder box** - dashed outline empty state ("No events match your filters.")
- any empty state or section that is just a thin-line rectangle with centered text

Grep-level ban (CSS, Tailwind, RN, SwiftUI, Flutter):
`border`, `border-t|b|l|r`, `border-1`, `1px solid`, `border-dashed`, `divide-x`, `divide-y`, `ring-1`, `ring-2`, `outline: 1px`, `<hr>`, `Divider`, `BorderSide`, `.border(...)`, `stroke` on container frames.

Build hierarchy with **surface + space**, not lines:

| Instead of | Use |
|---|---|
| outlined card | filled surface, bg one step off the page bg, radius 12-16px, no stroke |
| outlined chip | filled chip (muted bg). Selected = stronger fill + text color. Never a ring |
| divider line | whitespace, or a background step between sections |
| dashed empty box | centered muted text on the page bg, or a filled muted surface. No dashes |
| `<hr>` | more margin |
| table row lines | zebra fill or row padding |

Only exceptions: `:focus-visible` a11y focus ring (required, keep it), native form controls the platform draws itself, and an explicit user request for a border in that specific spot.

### Ban 2 - No glow, halos, or ambient animation

Never: glowing dots or orbs, neon halos, pulsing / breathing accents, animated gradient blobs, blurred color bloom behind elements. They always end up glowing or animating, and it looks cheap.

Grep-level ban:
`box-shadow: 0 0 <n> <color>`, `shadow-[0_0_...]`, `drop-shadow(0 0`, colored `text-shadow`, `filter: blur()` on decorative orbs, `blur-2xl` / `blur-3xl` background circles, `animate-pulse`, `animate-ping`, `@keyframes glow|pulse|breathe|shimmer`, `shadow-<color>-500/50`.

Replacements:
- live / status indicator: solid flat dot, no glow, no pulse. Or a text label plus color
- emphasis: color, weight, size, fill. Not light bloom
- shadows: neutral black elevation only (soft, downward, low opacity). Never colored, never centered bloom

### Pre-ship check

Screenshot the page (desktop + mobile). If any rectangle is drawn by a thin line, or anything glows or throbs, fix it before showing the user. Both bans outrank any design skill, template, or component library default.

---

## 🛑 HARD RULE - No vibecoded look (owner, 2026-08-17)

Source: aj.on.ai reel, "30 reasons your site looks vibecoded". If a stranger can tell an LLM generated the UI in 3 seconds, it is wrong. Redo it. Sits on top of the hairline-border + glow bans, never replaces them.

### A. Color and light - BANNED

- harsh gradients (hero washes, button gradients, big multi-hue sweeps)
- rainbow coloring (multi-hue accents with no system)
- purple + black as the default palette. Also the violet/indigo-on-dark AI look
- neon colors and neon accents
- generic pastel palette (baby blue / blush pink / mint / butter card sets)
- radial orbs, blurred color blobs, aurora backgrounds
- **blinking / pulsing neon dot** (the "live" dot with a breathing ring). Static solid dot or a text label. No pulse, no glow, no ping, ever

Use instead: one committed brand hue, neutrals doing most of the work, colors carrying meaning (live, win, loss, alert), flat fills.

### B. Layout cliches - BANNED

- 3 feature cards in a row
- bento grid
- dot-grid or graph-paper background
- 3-tier pricing table (good / better / best columns)
- fake terminal window mock
- colored left stripe / accent bar on cards and callouts
- checkmark bullet lists
- outlined cards, ring chips, divider lines, dashed empty boxes (see the hairline ban)

Use instead: layouts driven by the real content and its hierarchy. Asymmetry is allowed. Different section shapes per section.

### C. Icons and type - BANNED

- default Lucide icon set dropped in unchanged
- sparkle / star "AI" icons
- emoji used as UI (icons, bullets, status, buttons). Emoji in real user content is fine
- Inter, Geist, Space Grotesk as the default typeface

Use instead: a chosen type pairing with a real reason behind it, and an icon set that matches the product weight (or the platform's own set). If no direction is given, ask before picking.

### D. Copy - BANNED

- em dashes and en dashes (already a global hard rule)
- "it's not X, it's Y" construction, and its cousins ("not just a Z, but a W")
- fake testimonials, fake logo walls, invented stats or user counts
- filler marketing voice with no concrete claim

Use instead: real names, real numbers, real quotes. If it does not exist yet, say what the thing does in plain words.

### E. Surface and depth - BANNED

- pure white (`#fff`) page background. Also pure black (`#000`)
- drop shadows sprinkled on everything
- liquid glass / frosted glass / heavy backdrop blur panels
- one soft corner radius applied uniformly to every element

Use instead: off-white or a real dark surface, a small radius scale used with intent (small elements small radius, big surfaces bigger), elevation only where something genuinely floats.

### F. Motion - BANNED

- hover animation on everything (lift, scale, glow, translate)
- animated arrows, marching chevrons, bouncing CTAs
- sparkle / shimmer / breathing effects

Use instead: instant state changes (fill, color, weight) for hover. Motion only for real feedback: opening, closing, loading, arriving. Respect `prefers-reduced-motion`.

### G. Missing pieces that scream vibecoded - REQUIRED

- **real product demo**: real screenshots, real data, real video. Not a mock frame with placeholder text
- **loading, empty, and error states**: skeletons or a real loader, a written empty state, a real error path. Every list and page
- **Terms of Service** and **Privacy Policy** pages that exist and are linked, on anything public facing
- real content everywhere. No lorem ipsum, no `Feature One`, no placeholder avatars shipped

### Pre-ship check

Ask: could this be any AI-generated landing page from this year? If yes, it is not done. Screenshot desktop + mobile, walk the list above, fix every hit before showing the user.

See the slug rule in ../CLAUDE.md: no `?id=` and no numeric id in any link. Pages that load by slug handle `{status:'moved'}` with `followRename(err, router)`.

Every new feature ships SEO and en/fr/pt translation in the same commit, and there is one model per concept - see the two rules at the end of ../CLAUDE.md.
