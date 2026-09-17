# Billing caps and alerts (owner rule R60)

No paid service is called from this app. Paystack is reached from the backend,
mail goes out through the backend's relay, and the site is served from the
InterServer VPS. The register for all of those is
`../V-ENT-BACKEND/security/billing-caps.md`, and `security-rules.json` here
declares R60 not applicable for that reason. Add a row here the day this app
calls something that bills.

| Service | Cap | Alert at | Where set (URL) | Verified on | By |
|---|---|---|---|---|---|
| (none: see the backend register) | | | | 2026-09-17 | Claude |
