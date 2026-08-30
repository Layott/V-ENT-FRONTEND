# Where the artwork comes from

One row per piece of art this repo draws that it did not originate, so
"where did that logo come from" is a lookup rather than a memory.

## AFC (African Free Fire Community)

| | |
|---|---|
| File | `public/images/afc-mark.svg` |
| Source | `https://api.africanfreefirecommunity.com/sso/brand/logo.svg?on=dark` |
| Fetched | 30 August 2026 |
| Drawn at | 17px in the login and signup provider buttons, 25px in the Linked accounts panel |
| Natural size | vector, `viewBox="0 0 500 500"` |
| Colours | `#2ba035` letterform, `#fafafa` wordmark |

**Why the `?on=dark` variant.** AFC publish two. The default mark's wordmark is
near-black and disappears on a dark surface, which is every surface we draw it
on. Their brand page says so explicitly.

**Why it is held here rather than hotlinked.** AFC's own snippet points an
`<img>` at their server so the mark updates if they change it. Our login page
should not stop drawing correctly on a day their site is down, and their site
was down for most of 29 August 2026. Re-fetch deliberately if their brand JSON
changes:

```
curl https://api.africanfreefirecommunity.com/sso/brand/
```

**Provenance of the vector itself,** in AFC's words on that page: they never
held an original vector, so it was traced from their 500px PNG, and the trace
was checked against that file by rendering it and measuring the overlap -
98.9% on the shape, 99.7% on the green. That is the check our own rule asks
for, already done at the source, which is why this is a fetch rather than a
trace of our own.

**Their rules, and where each is honoured.**

| Rule | Where |
|---|---|
| Prefer the SVG | `MARKS` in `AuthProviders.js` |
| On a dark surface take the on-dark SVG | the `?on=dark` file above |
| Clear space of at least a quarter of the mark's width | 17px mark in a 26px slot, 25px in a 38px slot: a slot of 1.5W |
| Same visual weight as the other sign-in buttons | 17px, which is exactly Google's mark size in the same slot |
| Do not use the full name as a button label | the button renders `meta.short` ("AFC"); the full name still names the row in Linked accounts, which is a description rather than a button |
| Do not stretch, rotate, recolour or add effects | drawn square at its own aspect, no filters. The earlier cropped-letterform PNG was removed when this landed |
| Do not imply AFC endorses V-ENT | the button says AFC and nothing else |

## Everything else

Google's mark is `public/images/google.svg`; Discord's and Steam's are inline
paths in `LinkedAccountsPanel.js`. All three are drawn from the providers' own
marks at their own aspect.
