# Agent Development Kit - V-ENT-FRONTEND

Repo-specific application of the five-layer blueprint. Full framework + truth/accuracy/verification/best-practice rules live at `../agent-development-kit.md`. This file documents only how the layers map to this Next.js repo.

**Repo:** Next.js 14 (App Router) + JavaScript + CSS Modules + NextAuth + MUI. No Tailwind. No TypeScript. No Server Components - `'use client'` throughout.

**Backend:** separate repo (`../V-ENT-BACKEND/`). API base = `process.env.NEXT_PUBLIC_API_URL`. Response shape `{ status, data, message }`.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 App Router |
| Language | JavaScript (`.js` only - no TS) |
| Styling | CSS Modules + global CSS variables in `src/app/globals.css`. No Tailwind. |
| Font | Clash Grotesk (self-hosted from `public/fonts/clash_grotesk/`) + Inter fallback (next/font) |
| Auth | NextAuth v4 JWT - Credentials + Google + Facebook → Django `session_token` |
| State | useState + useEffect + fetch. No Redux, no SWR, no React Query. |
| UI library | MUI (limited use) |
| Editor | react-quill (must be wrapped in `dynamic(... { ssr: false })`) |
| Hosting | Vercel (`v-ent-mock-demo`, `v-ent-mockups`, `v-ent-frontend`) |
| Smoke testing | puppeteer-core scripts in `scripts/` |

---

## Directory tree

```
V-ENT-FRONTEND/
├── CLAUDE.md                       # L1 repo constitution (design parity, mock mode, verify)
├── agent-development-kit.md        # this file
├── README.md
├── package.json / package-lock.json
├── next.config.mjs
├── jsconfig.json                   # path aliases: @/* → src/*, @/styles/* → public/styles/*, etc.
├── Dockerfile
├── .vercel/project.json            # → v-ent-mock-demo (CEO-facing demo)
├── lib/
│   └── authOptions.js              # NextAuth config (Credentials + Google + Facebook)
├── src/
│   ├── middleware.js               # auth route protection
│   ├── app/                        # Next.js App Router pages
│   │   ├── layout.js               # root layout (SessionWrapper, fonts)
│   │   ├── page.js                 # landing
│   │   ├── globals.css             # ALL CSS variables - never raw hex elsewhere
│   │   ├── clash-grotesk.css       # font face
│   │   ├── (admin)/                # admin routes (route group)
│   │   ├── login/ signup/ forgot-password/ reset-password/ verify-email/ email-verified/ reset-email/
│   │   ├── home/                   # logged-in dashboard (stub)
│   │   ├── user-profile/           # view profile (reference page)
│   │   ├── edit-user-profile/      # edit profile
│   │   ├── teams/                  # listing + team-profile
│   │   ├── edit-team-profile/      # edit team
│   │   ├── tournaments/            # listing, detail, create, drafts, register
│   │   ├── events/                 # listing, detail, create
│   │   ├── wallets/                # wallet (real API)
│   │   ├── wallet-topup-callback/  # Paystack callback
│   │   ├── rankings/               # rankings
│   │   ├── settings/               # account settings
│   │   ├── search/                 # global search
│   │   ├── production/             # production / streaming overlays (stub)
│   │   ├── anime/ marketplace/ shop/ community/ organizations/ wager/   # stubs / disabled
│   │   ├── privacy-policy/
│   │   └── api/auth/               # NextAuth route handlers
│   ├── components/                 # feature components co-located with .module.css
│   │   ├── SessionWrapper.js       # next-auth SessionProvider wrapper
│   │   ├── MockAutoLogin.js        # client-side auto-login when NEXT_PUBLIC_USE_MOCK=true
│   │   ├── header/ mobile-header/  # top nav
│   │   ├── sidebar/ mobile-sidebar/ bottom-menu/   # navigation shells
│   │   ├── auth-header/ footer/
│   │   ├── landing/                # landing page sections
│   │   ├── admin/                  # admin dashboard subcomponents
│   │   ├── user-profile/ edit-user-profile/ profile-panels/ edit-profile-panels/
│   │   ├── team-profile/ teams/ edit-team-profile/
│   │   ├── tournaments/ view-tournament/ create-tournament-component/ drafts/
│   │   ├── events/ view-event/ create-event-component/
│   │   ├── wallet/                 # wallet subcomponents
│   │   ├── settings-panels/
│   │   ├── Snackbar/ coming-soon/ react-quill/
│   ├── constants/vent.js           # API endpoint constants (also has dead NextAuth re-exports - tech debt)
│   ├── hooks/useIntersectionObserver.js
│   └── lib/                        # client-side lib helpers
├── public/
│   ├── images/                     # all logos, icons, illustrations, page imagery
│   ├── fonts/clash_grotesk/        # self-hosted font files
│   ├── styles/                     # page-level CSS Modules imported via @/styles/*
│   ├── V-ENT TERMS OF USE.pdf
│   └── privacy-policy.pdf
├── scripts/                        # puppeteer-core smoke + audit (run in ~3 min)
│   ├── smoke-pages.js              # walks every route
│   ├── smoke-admin.js              # admin-specific walk
│   ├── smoke-wallet.js             # wallet flow walk
│   ├── trace-clicks.js             # click-by-click trace
│   └── audit-functions.js          # function-level audit
├── docs/
│   ├── modules/                    # 01-TOURNAMENTS … 15-SECURITY per-module specs
│   ├── mockups/                    # CEO-approved HTML mockups (wallet.html = gold standard)
│   ├── V-ENT_BRD.md
│   ├── V-ENT_Best_Practices.md
│   ├── V-ENT_External_Tools_and_Services.md
│   └── V-ENT_Figma_Audit_UPDATED.md
└── tasks/
```

---

## Five-layer mapping

| Layer | Frontend location | Notes |
|---|---|---|
| **L1 CLAUDE.md** | `V-ENT-FRONTEND/CLAUDE.md` (this repo) + `../CLAUDE.md` (workspace) + `~/.claude/CLAUDE.md` (global) | Repo CLAUDE.md sets design parity, mock-mode rules, verification protocol (Tracks A/B/C), self-design rules, mockup quality standard, known tech debt. |
| **L2 Skills** | Global `~/.claude/skills/` only - no project-local skills. | Heavy use of design suite (frontend-design, impeccable, polish, layout, typeset, audit, critique) + caveman + graphify + vercel:nextjs + vercel:shadcn + ui-ux-pro-max. |
| **L3 Hooks** | None project-local. | Hooks fire from caveman + superpowers + vercel:knowledge-update SessionStart hooks. |
| **L4 Subagents** | Defaults + plugin-shipped. | Frequent: `Explore` (codebase mapping), `Plan` (multi-page builds), `general-purpose` (parallel page work), `vercel:performance-optimizer`. |
| **L5 Plugins** | Same as workspace global. | Most-used here: `vercel` (deploy/CLI/Next.js skills), `ui-ux-pro-max`, `superpowers`, `caveman`, `context7` (for Next.js / NextAuth doc fetches). |

---

## Path aliases (`jsconfig.json`)

```
@/*           → src/*
@/images/*    → public/images/*
@/styles/*    → public/styles/*
@/view-/*     → public/styles/modules/*
```

---

## Mock mode

`NEXT_PUBLIC_USE_MOCK=true` flips the app into mock mode. Client-side interceptor handles fetches; `MockAutoLogin.js` auto-logs-in a demo user. Used by `v-ent-mock-demo` Vercel project for CEO walkthrough - no real backend hit.

Real backend mode = unset/false. App calls `process.env.NEXT_PUBLIC_API_URL`.

---

## Design system pointers

- All CSS variables in `src/app/globals.css`. Never raw hex elsewhere.
- Reference pages for design parity: `/wallets`, `/user-profile`, `/tournaments`.
- Gold standard mockup: `docs/mockups/wallet.html`.
- Global button classes: `.btn`, `.grnBTN`, `.redBTN` (defined in globals.css - reuse, don't recreate).
- Primary colors: `--v-ent-grn #4caf50`, `--v-ent-red #ED1C24`, `--overlay-gray #212225`.
- Breakpoints: 375 (mobile) → 768 → 1024 → 1440 (desktop) → 1920+.

Full design protocol + reference-page mandates: see `CLAUDE.md` Design Reference Protocol section.

---

## Smoke + audit scripts

Run any of these to walk authenticated routes via puppeteer-core (~3 min full walk):

```
node scripts/smoke-pages.js       # every route
node scripts/smoke-admin.js       # admin only
node scripts/smoke-wallet.js      # wallet flow
node scripts/trace-clicks.js      # click-level trace
node scripts/audit-functions.js   # function audit
```

Default verification flow: dev server up → relevant smoke script → console scan → screenshot diff vs reference page.

---

## Deploy

From this directory:

```
vercel deploy --prod              # → v-ent-mock-demo (linked project)
```

Direct CLI upload, bypasses git. CEO consent required per workspace [[feedback-no-git-push]] rule.

Env on `v-ent-mock-demo` prod: `NEXTAUTH_SECRET`, `NEXT_PUBLIC_USE_MOCK=true`. No `NEXTAUTH_URL` (auto-detect via `VERCEL_URL`). No `NEXT_PUBLIC_API_URL` (mock interceptor handles fetches).

---

## Repo-specific rules (recap from CLAUDE.md)

1. Verify before hand-off - dev server + walk every changed page authenticated + console scan + image/data render check.
2. Design parity - screenshot-compare against `/wallets`, `/user-profile`, `/tournaments`.
3. Use agents for parallel build work.
4. Update `tasks/lessons.md` after every correction.
5. JavaScript only - no TypeScript.
6. `'use client'` everywhere - no Server Components yet.
7. Every component in own folder with co-located `.module.css`.
8. Never new hex - use CSS variables.
9. Never new payment provider - Paystack only.
10. Never commit `.env.local` or secrets.

Full repo rules live in `V-ENT-FRONTEND/CLAUDE.md`.

---

## Branching and release flow (hard rule)

**Never commit or push directly to `main` (or `master`).** Applies to every project. Solo repo, one-line fix, nobody else on the project: still no. Work goes `branch -> PR -> merge`, every single time. Belongs in `CLAUDE.md` (Layer 1) so it is always loaded, and is best enforced deterministically with a Layer 3 hook.

### The flow

```
feature/*  ->  dev  ->  staging  ->  main
   |            |          |           |
 one branch   active    dress       PRODUCTION
 per feature  dev line  rehearsal   what users see
```

| Branch | Purpose | Rules |
|---|---|---|
| `feature/<slug>`, `fix/<slug>`, `chore/<slug>` | Build one thing | Branch off `dev`. One branch per feature. Delete after merge |
| `dev` | Active development, everything integrated | PR-only. No direct commits |
| `staging` | Dress rehearsal, mirrors production (same env vars, same data shape, same build) | PR from `dev`. Catch anything weird here, not in production |
| `main` | Sacred = production, what users see | PR from `staging` only. Branch protection ON, required reviews, required status checks, linear history, no force-push |

Small repos with no `staging` tier: `feature/* -> dev -> main` still holds. `main` never takes a direct commit.

### Agent behavior (non-negotiable)

1. **Check the branch before any edit.** Run `git rev-parse --abbrev-ref HEAD`. If on `main`, `master`, `dev`, or `staging`, cut a branch FIRST (`git switch -c feature/<slug>`), then edit.
2. **Never push to a protected branch.** No `git push origin main`, no `git push -f`. Push the feature branch, open a PR (`gh pr create`, see Best practices rule 35), report the URL.
3. **Never self-merge.** Do not merge a PR unless the user says so. Never bypass protection (`--no-verify`, admin merge, force-push).
4. **Recover, do not hide.** Already committed to `main` by mistake: STOP, tell the user, move the commits to a branch (`git branch <slug>; git reset --hard origin/main`) before anything else.
5. **Commit and push only when asked.** Confirm before anything irreversible.

### Hook enforcement (Layer 3)

```sh
# PreToolUse.sh - block commits and pushes on protected branches
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
case "$BRANCH" in
  main|master|dev|staging)
    echo "Blocked: direct commit/push to '$BRANCH'. Cut a feature branch and open a PR." >&2
    exit 2
    ;;
esac
```

**Why:** at 2am when production breaks (and it will), a protected `main` plus PR history means a one-click rollback instead of forensics.

