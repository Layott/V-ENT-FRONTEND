# V-ENT Development Best Practices
**Last Updated:** March 2026  
**Stack:** Next.js (Frontend) + Django (Backend) + MySQL  
**Team:** 2-3 developers

---

## Table of Contents
1. [Claude Code Setup](#1-claude-code-setup)
2. [UI/UX Design Best Practices](#2-uiux-design-best-practices)
3. [Next.js Frontend Best Practices](#3-nextjs-frontend-best-practices)
4. [Next.js Security Measures](#4-nextjs-security-measures)
5. [Django Backend Best Practices](#5-django-backend-best-practices)
6. [Django Security Measures](#6-django-security-measures)
7. [General Security Checklist](#7-general-security-checklist)
8. [Git Workflow for Small Teams](#8-git-workflow-for-small-teams)

---

## 1. Claude Code Setup

Claude Code is an AI coding agent that runs in your terminal. It reads your codebase, writes code, runs commands, and commits to git.

### Requirements
- A paid Anthropic account (Claude Pro $20/month or Claude Max $100-200/month)
- Node.js 18+ (for npm install method) OR use the native installer (no Node.js needed)

### Installation (Recommended: Native Installer)

**macOS:**
```bash
curl -fsSL https://code.claude.com/install | sh
```

**Windows (PowerShell):**
```powershell
irm https://code.claude.com/install.ps1 | iex
```

**Linux:**
```bash
curl -fsSL https://code.claude.com/install | sh
```

**Alternative (npm):**
```bash
npm install -g @anthropic-ai/claude-code
```

### First Run
```bash
# Navigate to your project
cd ~/V-ENT-FRONTEND  # or V-ENT-BACKEND

# Start Claude Code
claude

# Follow browser prompts to authenticate
# On first run, initialize the project context:
/init
```

The `/init` command generates a `CLAUDE.md` file in your project root — this gives Claude persistent context about your codebase (build commands, conventions, architecture). Keep it under 100 lines and commit it to git.

### Daily Workflow with Antigravity + Claude Code
1. Open your project in Antigravity (code editor) for browsing/viewing files
2. Open a terminal (inside Antigravity or separately)
3. Run `claude` in the terminal
4. Describe what you want to build in natural language
5. Claude reads your codebase, makes changes, runs tests, and can commit

### Key Commands
- `/init` — Analyze codebase and generate CLAUDE.md
- `/help` — Show all available commands
- `/bug` — Report an issue with Claude Code
- `claude doctor` — Diagnose configuration issues

---

## 2. UI/UX Design Best Practices

### Design System Fundamentals
- **Maintain a single source of truth:** All colors, typography, spacing, and components should be defined in Figma and mirrored in code (CSS variables or Tailwind config)
- **Use an 8px grid system:** All spacing, padding, and sizing should be multiples of 8px (8, 16, 24, 32, 40, 48, etc.)
- **Limit your color palette:** Primary, secondary, accent, background, surface, and semantic colors (success, warning, error, info). No one-off hex values
- **Typography scale:** Define a type scale (e.g., 12, 14, 16, 18, 20, 24, 28, 32, 40, 48px) and stick to it. No custom font sizes outside the scale

### Component Design
- **Build atomic components first:** Buttons, inputs, badges, avatars, pills/tags — then compose them into larger patterns
- **Design all states:** Default, hover, active, focused, disabled, loading, error, empty, and skeleton/loading for every interactive component
- **Maintain consistent border radius:** Pick 2-3 values (e.g., 4px, 8px, 16px) and use them everywhere
- **Use consistent shadows:** Define 3-4 elevation levels and reuse them

### Responsive Design
- **Design mobile-first:** Start with 375px mobile, then scale up to 1440px desktop
- **Define breakpoints:** Mobile (375px), Tablet (768px), Desktop (1024px), Large Desktop (1440px)
- **Don't design separate layouts for every breakpoint.** Design mobile and desktop, let CSS handle the in-between
- **Touch targets:** Minimum 44x44px for all tappable elements on mobile

### Accessibility
- **Color contrast:** Minimum 4.5:1 ratio for normal text, 3:1 for large text (WCAG AA)
- **Focus indicators:** Every interactive element must have a visible focus state for keyboard navigation
- **Alt text:** All meaningful images must have descriptive alt text
- **Semantic HTML:** Use proper heading hierarchy (h1 > h2 > h3), button for actions, anchor for navigation

### V-ENT Specific
- **Dark theme:** Your Figma designs use a dark theme — ensure all components work in dark mode with sufficient contrast
- **Dual breakpoints:** Always design both web (1440px) and mobile (375px) versions
- **Empty states:** Every list/grid/table must have an empty state design (what does the user see when there's no data?)
- **Loading states:** Design skeleton screens for every page that fetches data

---

## 3. Next.js Frontend Best Practices

### Project Structure (App Router)
```
src/
├── app/                    # App Router pages and layouts
│   ├── (auth)/            # Route group for auth pages (login, signup)
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/       # Route group for authenticated pages
│   │   ├── tournaments/
│   │   ├── events/
│   │   ├── teams/
│   │   ├── profile/
│   │   └── wallet/
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── not-found.tsx      # 404 page
├── components/
│   ├── ui/                # Atomic UI components (Button, Input, Card, etc.)
│   ├── forms/             # Form components (LoginForm, RegisterForm, etc.)
│   ├── layouts/           # Layout components (Sidebar, TopNav, Footer)
│   └── features/          # Feature-specific components (TournamentCard, TeamCard)
├── lib/
│   ├── api/               # API client functions (fetch wrappers)
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── constants/         # Constants and config
│   └── types/             # TypeScript type definitions
├── styles/                # Global styles, CSS variables
└── middleware.ts          # Auth middleware, rate limiting, redirects
```

### Server vs. Client Components
- **Default to Server Components.** They run on the server, reduce bundle size, and can fetch data directly
- **Use Client Components only when you need:** useState, useEffect, event handlers (onClick, onChange), browser APIs, or third-party libraries that require the browser
- **Add `'use client'` at the top of client component files** — be intentional about it
- **Never pass sensitive data from Server Components to Client Components.** Anything passed as props gets serialized into the HTML

### Data Fetching
- **Use Server Components for data fetching** whenever possible — no need for useEffect + useState patterns
- **Create a centralized API client** in `lib/api/` that handles authentication tokens, base URLs, and error handling
- **Implement proper error boundaries** with `error.tsx` files in each route segment
- **Use loading.tsx for route-level loading states** — Next.js will automatically show these during navigation

### TypeScript
- **Use TypeScript strictly.** Enable `strict: true` in tsconfig.json
- **Define types for all API responses** in `lib/types/`
- **Never use `any`.** If you're unsure of a type, use `unknown` and narrow it
- **Use Zod for runtime validation** of API responses and form data

### Performance
- **Use `next/image` for all images** — it handles lazy loading, responsive sizing, and format optimization
- **Use `next/font` for font loading** — it eliminates layout shift from font loading
- **Lazy load heavy components** with `dynamic()` imports (e.g., rich text editors, chart libraries)
- **Minimize client-side JavaScript** — if a component doesn't need interactivity, keep it as a Server Component
- **Use React.memo() sparingly** — only for components that re-render frequently with the same props

### Forms
- **Use React Hook Form** for complex forms (tournament creation, event creation, profile editing)
- **Validate client-side with Zod** schemas that match your backend validation
- **Show inline validation errors** — don't wait for form submission
- **Disable submit buttons during submission** and show loading indicators
- **Handle optimistic updates** for better UX on simple actions (likes, follows, joins)

---

## 4. Next.js Security Measures

### Critical: Keep Next.js Updated
- **Update to the latest Next.js version immediately** when security patches are released
- In late 2025, critical vulnerabilities (CVE-2025-29927, CVE-2025-66478) affected all Next.js versions — staying current is non-negotiable
- Run `npm audit` regularly and fix vulnerabilities

### Authentication (Defense in Depth)
- **Never rely solely on middleware for auth.** Middleware can be bypassed. Always re-verify authentication at the data access layer
- **Verify auth in every Server Action** and every API route handler
- **Use HttpOnly, Secure, SameSite cookies** for session tokens — never store tokens in localStorage
- **Implement proper session expiration:** Short-lived access tokens (15-30 min) + refresh tokens
- **Rate limit authentication endpoints** aggressively (login, register, password reset)

### Environment Variables
- **Never commit `.env` files to git.** Add `.env*` to `.gitignore` (Note: your V-ENT-FRONTEND repo currently has a `.env` file committed — this needs to be fixed immediately)
- **Only prefix with `NEXT_PUBLIC_` for values that are safe to expose to the browser**
- **API keys, database credentials, and secrets must never be prefixed with `NEXT_PUBLIC_`**

### Content Security Policy (CSP)
```typescript
// middleware.ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  connect-src 'self' https://your-api-domain.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`;
```

### Input Validation
- **Validate all user input on both client and server** — client validation is for UX, server validation is for security
- **Use Zod schemas** to validate Server Action inputs and API route parameters
- **Sanitize user-generated content** before rendering (especially if using dangerouslySetInnerHTML)

### API Route Security
- **Validate the HTTP method** in every API route (don't allow GET on a route that should only accept POST)
- **Check authentication** in every API route handler
- **Validate request body** with a schema (Zod)
- **Return appropriate HTTP status codes** (401 for unauthenticated, 403 for unauthorized, 422 for validation errors)
- **Never expose internal error details** in production responses

### Headers
```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
```

---

## 5. Django Backend Best Practices

### Project Structure
```
vent/                       # Django project root
├── vent/                   # Main project config
│   ├── settings/
│   │   ├── base.py        # Shared settings
│   │   ├── local.py       # Local dev settings (DEBUG=True)
│   │   └── production.py  # Production settings (DEBUG=False)
│   ├── urls.py
│   └── wsgi.py
├── vent_auth/             # Authentication app
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── tests.py
├── vent_tournaments/      # Tournament app
├── vent_events/           # Events app
├── vent_teams/            # Teams app
├── vent_wallet/           # Wallet/financial app
├── vent_marketplace/      # Marketplace app
├── vent_anime/            # Anime features app
├── vent_shop/             # E-commerce app
├── vent_community/        # Community features app
├── vent_admin/            # Custom admin dashboard
├── common/                # Shared utilities, mixins, base models
│   ├── models.py          # Abstract base models (TimestampMixin, etc.)
│   ├── permissions.py     # Custom DRF permissions
│   ├── pagination.py      # Custom pagination classes
│   └── utils.py           # Shared utility functions
└── manage.py
```

### Django REST Framework (DRF) Patterns
- **Use ModelSerializer** and explicitly list fields — never use `fields = '__all__'` (it exposes everything)
- **Create separate serializers for read and write** operations when the shape differs
- **Use ViewSets** for standard CRUD operations, APIView for custom logic
- **Implement proper pagination** — never return unbounded querysets
- **Use DRF's permission classes** (IsAuthenticated, IsAdminUser, custom permissions per view)

### Database (MySQL)
- **Use Django migrations exclusively** — never modify the database schema manually
- **Add database indexes** on fields you frequently filter or sort by (e.g., `created_at`, `user_id`, `status`)
- **Use `select_related()` and `prefetch_related()`** to avoid N+1 queries
- **Never use raw SQL unless absolutely necessary.** The ORM prevents SQL injection automatically; raw SQL doesn't
- **Use database transactions** for operations that must be atomic (e.g., wallet transfers, prize distribution)

### Models
- **Create a base model** with common fields (id, created_at, updated_at) and inherit from it
- **Use UUIDs for public-facing IDs** — don't expose sequential integer IDs in URLs or APIs
- **Define `__str__` methods** on all models for readable admin and logging
- **Use Django's built-in validators** and add custom validators where needed
- **Use choices/enums** for status fields rather than magic strings

### Testing
- **Write tests for every view and serializer** — aim for 80%+ coverage on business logic
- **Use factory_boy or model_bakery** for test data generation
- **Test authentication and permissions** — verify unauthorized users get 401/403
- **Test edge cases:** empty inputs, max-length inputs, duplicate data, concurrent requests

### Deployment
- **Use environment variables** for all secrets (SECRET_KEY, DATABASE_URL, API keys)
- **Use gunicorn or uvicorn** as the WSGI/ASGI server — never use Django's development server in production
- **Set up proper logging** — log errors and security events, but never log passwords or tokens
- **Use a reverse proxy** (Nginx) in front of Django for static file serving and SSL termination

---

## 6. Django Security Measures

### Critical Settings for Production
```python
# settings/production.py
DEBUG = False
ALLOWED_HOSTS = ['v-ent.co', 'app.v-ent.co', 'api.v-ent.co']

# Generate a new secret key for production — NEVER use the default
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

# HTTPS enforcement
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# HSTS (HTTP Strict Transport Security)
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Session security
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_AGE = 1209600  # 2 weeks
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
```

### Authentication Security
- **Use Django's built-in auth system** as the foundation — don't roll your own
- **Use a custom user model** (you should have done this from the start with `AbstractUser`)
- **Enforce strong passwords** using Django's password validators
- **Implement account lockout** after failed login attempts (use `django-axes`)
- **Implement rate limiting** on auth endpoints (use `django-ratelimit`)
- **Hash all passwords** with Django's default PBKDF2 hasher (or upgrade to Argon2)

### API Security
- **Use token-based authentication** (JWT via djangorestframework-simplejwt) for the API
- **Set short token expiration times:** Access tokens: 15-30 minutes. Refresh tokens: 7-14 days
- **Validate all input** in serializers — don't trust anything from the client
- **Rate limit API endpoints** — especially wallet, auth, and tournament registration
- **Use CORS properly:** Only allow your frontend domain, not `*`

```python
# CORS settings
CORS_ALLOWED_ORIGINS = [
    'https://v-ent.co',
    'https://app.v-ent.co',
]
CORS_ALLOW_CREDENTIALS = True
```

### IP Address Collection (V-ENT Requirement)
```python
# middleware.py
class IPAddressMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        request.user_ip = ip
        # Log IP for authenticated users
        response = self.get_response(request)
        return response
```

### Database Security
- **Never use root database credentials** in the application — create a dedicated database user with limited privileges
- **Use parameterized queries** (Django ORM does this by default)
- **Encrypt sensitive data at rest** (wallet balances, KYC data, financial records)
- **Regular database backups** — hourly incremental, daily full

### File Upload Security
- **Validate file types** — check both the extension and MIME type
- **Limit file sizes** (set `DATA_UPLOAD_MAX_MEMORY_SIZE` and `FILE_UPLOAD_MAX_MEMORY_SIZE`)
- **Serve user uploads from a separate domain** to prevent XSS via uploaded HTML files
- **Scan uploaded files** for malware if handling user-uploaded executables or documents
- **Store files in cloud storage** (S3/Cloudflare R2), not on the Django server filesystem

### Django Admin Security
- **Change the admin URL** from `/admin/` to something non-obvious
- **Restrict admin access by IP** in production
- **Require 2FA for admin accounts**
- **Use strong passwords** for all admin accounts
- **Audit admin actions** — log who did what

---

## 7. General Security Checklist

### Before Every Deployment
- [ ] `DEBUG = False` in production
- [ ] SECRET_KEY is unique and not committed to git
- [ ] All sensitive values are in environment variables
- [ ] `npm audit` and `pip-audit` show no critical vulnerabilities
- [ ] HTTPS is enforced (SSL redirect, HSTS, secure cookies)
- [ ] CORS is configured to allow only your domains
- [ ] CSP headers are set
- [ ] Rate limiting is configured on auth and financial endpoints
- [ ] File upload limits are set
- [ ] Error pages don't leak stack traces or internal details
- [ ] Database credentials use a limited-privilege account
- [ ] Logging is configured (but doesn't log passwords or tokens)
- [ ] The `.env` file is NOT committed to git

### Ongoing Security Practices
- [ ] Update Django and Next.js within 48 hours of security releases
- [ ] Run dependency audits weekly (`npm audit`, `pip-audit`)
- [ ] Review access logs for suspicious patterns monthly
- [ ] Rotate API keys and secrets quarterly
- [ ] Conduct a security review before each major feature launch
- [ ] Back up the database daily and test restore procedures quarterly
- [ ] Monitor for leaked credentials (set up GitHub secret scanning)

---

## 8. Git Workflow for Small Teams

### Branch Strategy (GitHub Flow)
```
main (production-ready)
├── feature/tournament-brackets
├── feature/event-creation
├── fix/login-validation-bug
└── hotfix/security-patch
```

### Rules
1. **`main` is always deployable.** Never commit directly to main
2. **Create a branch for every feature or fix** — name it descriptively
3. **Open a Pull Request** when ready for review — even if you're reviewing your own code
4. **Write meaningful commit messages:** `feat: add tournament bracket visualization` not `update stuff`
5. **Squash merge** feature branches into main to keep history clean
6. **Delete branches** after merging

### Commit Message Format
```
type: short description

feat: add tournament registration flow
fix: resolve wallet balance display bug
refactor: extract shared form components
docs: update API documentation
chore: upgrade Next.js to 16.1
security: patch CVE-2025-29927
```

### Code Review Checklist (for 2-3 person team)
- [ ] Does it work? (Test locally before approving)
- [ ] Is the code readable and well-named?
- [ ] Are there any security issues? (SQL injection, XSS, auth bypass)
- [ ] Are API responses properly typed?
- [ ] Are error states handled?
- [ ] Is there unnecessary complexity that could be simplified?
- [ ] Does it follow the patterns established in the codebase?

---

## Quick Reference: V-ENT Specific Warnings

1. **Your `.env` file is committed to the V-ENT-FRONTEND repo.** Remove it from git tracking immediately and add it to `.gitignore`. Rotate any secrets that were exposed.

2. **Keep Next.js updated.** Critical RCE vulnerabilities were found in Dec 2025. Check your version.

3. **Your Django backend uses `vent_*` app naming.** Maintain this convention for all new apps.

4. **VENT COINS transactions must be atomic.** Always use database transactions for any operation that moves coins between wallets.

5. **IP addresses must be collected** per your platform requirements. Implement the middleware early and store IPs with every authenticated request.

6. **Streaming integration (OBS/VMIX/Streamlabs)** will require WebSocket connections. Plan your Django Channels setup early.

7. **Admin dashboard should be in MVP.** Build a lightweight admin panel for user management, tournament oversight, and payout approval from Phase 1.
