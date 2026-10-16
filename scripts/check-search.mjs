// What Google Search Console would complain about, checked before it does.
//
// CEO, 16 October 2026 (inbox 461), after Search Console showed both
// submitted sitemaps as "Couldn't fetch": "i dont ever want those issues
// happeniong, so let's create automatic checks for them from now on., so that
// they are alway checked."
//
// check-seo reads the source and says whether a route is meant to be found.
// This reads the LIVE site the way a crawler does and says whether it can be:
//
//   robots.txt   answers 200 as text, names the sitemap, and does not shut
//                the whole site
//   sitemap.xml  answers 200 as XML, parses, stays under 50,000 addresses,
//                every address absolute, on this host, and listed once
//   every URL    in the sitemap answers 200 itself (a redirect is a fault:
//                list the address it lands on), carries no noindex in a header
//                or the page, names ITSELF as canonical, has a title, and is
//                not blocked by robots.txt
//   coverage     every public tournament, event and indexable profile the API
//                lists is in the sitemap
//   old names    the sitemap names people have submitted before (sitemaps.xml,
//                sitemap_index.xml) still reach the sitemap
//
//   node scripts/check-search.mjs --live https://v-ent.co [--api https://api.v-ent.co]
//   node scripts/check-search.mjs --self-test
//
// Runs after every deploy (deploy/verify-live.sh) and once a day on the box
// (deploy/search-check.timer), so a fault is found the day it ships rather
// than the week Search Console gets round to it.

const MAX_URLS = 50000;
const MAX_BYTES = 50 * 1024 * 1024;
const OLD_NAMES = ['/sitemaps.xml', '/sitemap_index.xml'];

// ------------------------------------------------------------------ parsing

/** The Allow/Disallow rules a crawler of this agent obeys, from robots.txt. */
export function robotsRules(text, agent = 'googlebot') {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === 'user-agent') {
      if (!lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === 'allow' || field === 'disallow') current.rules.push({ allow: field === 'allow', path: value });
  }
  // The most specific group wins: one naming this agent, else "*".
  const named = groups.filter((g) => g.agents.some((a) => a !== '*' && agent.includes(a)));
  const chosen = named.length ? named : groups.filter((g) => g.agents.includes('*'));
  return chosen.flatMap((g) => g.rules).filter((r) => r.path !== '' || r.allow);
}

const ruleRegex = (p) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  .replace(/\*/g, '.*').replace(/\\\$$/, '$'));

/** Whether robots rules allow a path (Google: longest match wins, Allow wins a tie). */
export function robotsAllows(rules, pathname) {
  let best = null;
  for (const r of rules) {
    if (!r.path) continue;
    if (!ruleRegex(r.path).test(pathname)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return !best || best.allow;
}

/** Every <loc> in a sitemap or sitemap index. */
export function sitemapLocs(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[2] ?? m[3]) : null;
};

/** What a crawler reads from a page, and whether it found it in the head.
 *
 *  Read from the WHOLE document: Next can stream metadata into the body, and a
 *  noindex there is still obeyed by Google, so reading only the head would miss
 *  exactly the tag that matters most. Where it sits is reported separately. */
export function pageFacts(html) {
  const doc = String(html);
  const head = doc.split(/<\/head>/i)[0];
  const metas = [...doc.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const robots = metas.filter((t) => /^(robots|googlebot)$/i.test(attr(t, 'name') || ''))
    .map((t) => (attr(t, 'content') || '').toLowerCase());
  const canonicalOf = (text) => [...text.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0])
    .find((t) => (attr(t, 'rel') || '').toLowerCase() === 'canonical');
  const titleOf = (text) => ((text.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  const canonical = canonicalOf(doc);
  return {
    noindex: robots.some((c) => /\bnoindex\b|\bnone\b/.test(c)),
    canonical: canonical ? attr(canonical, 'href') : null,
    title: titleOf(doc),
    inHead: Boolean(titleOf(head)) && Boolean(canonicalOf(head)),
  };
}

const sameAddress = (a, b) => {
  const norm = (u) => { try { const x = new URL(u); return (x.origin + x.pathname.replace(/\/+$/, '') + x.search).toLowerCase(); } catch { return String(u); } };
  return norm(a) === norm(b);
};

/** The faults in one sitemap address, from what fetching it returned. */
export function urlFaults(url, { status, location, xRobots, html }, rules) {
  const out = [];
  if (status >= 300 && status < 400) {
    out.push(`redirects (${status}) to ${location || '?'}: list the address it lands on`);
    return out;
  }
  if (status !== 200) { out.push(`answers ${status}`); return out; }
  if (/\bnoindex\b|\bnone\b/i.test(xRobots || '')) out.push(`X-Robots-Tag says "${xRobots}"`);
  const facts = pageFacts(html);
  if (facts.noindex) out.push('the page says noindex while the sitemap lists it');
  if (!facts.canonical) out.push('no canonical link');
  else if (!sameAddress(facts.canonical, url)) out.push(`canonical points elsewhere: ${facts.canonical}`);
  if (!facts.title) out.push('no title');
  if (facts.title && facts.canonical && !facts.inHead) {
    out.push('title and canonical are streamed into the body, not the head: a crawler that runs no scripts reads neither (next.config htmlLimitedBots)');
  }
  const { pathname } = new URL(url);
  if (!robotsAllows(rules, pathname)) out.push('blocked by robots.txt');
  return out;
}

// ------------------------------------------------------------------ live

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

async function get(url, { redirect = 'manual' } = {}) {
  const res = await fetch(url, {
    redirect,
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) V-ENT-check-search' },
    signal: AbortSignal.timeout(30000),
  });
  const body = res.status >= 300 && res.status < 400 ? '' : await res.text();
  return { status: res.status, headers: res.headers, body };
}

async function pool(items, size, work) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await work(items[i], i);
    }
  }));
  return out;
}

async function apiList(api, path, pick) {
  try {
    const { status, body } = await get(api + path, { redirect: 'follow' });
    if (status !== 200) return null;
    const data = JSON.parse(body).data ?? {};
    const rows = Array.isArray(data) ? data : Object.values(data).filter(Array.isArray).flat();
    return [...new Set(rows.map(pick).filter(Boolean))];
  } catch {
    return null;
  }
}

async function live(origin, api) {
  origin = origin.replace(/\/+$/, '');
  const faults = [];
  const fault = (where, what) => faults.push({ where, what });

  // robots.txt
  const robots = await get(origin + '/robots.txt').catch((e) => ({ status: 0, headers: new Headers(), body: String(e) }));
  if (robots.status !== 200) fault('/robots.txt', `answers ${robots.status}`);
  else if (!/text\/plain/i.test(robots.headers.get('content-type') || '')) fault('/robots.txt', `served as ${robots.headers.get('content-type')}`);
  const rules = robotsRules(robots.body);
  if (!robotsAllows(rules, '/')) fault('/robots.txt', 'blocks the home page for Googlebot');
  const named = [...String(robots.body).matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]);
  if (!named.some((u) => sameAddress(u, origin + '/sitemap.xml'))) fault('/robots.txt', `does not name ${origin}/sitemap.xml (names: ${named.join(', ') || 'nothing'})`);

  // sitemap.xml
  const sm = await get(origin + '/sitemap.xml').catch((e) => ({ status: 0, headers: new Headers(), body: String(e) }));
  let urls = [];
  if (sm.status !== 200) fault('/sitemap.xml', `answers ${sm.status}: this is what Search Console reports as "Couldn't fetch"`);
  else {
    if (!/xml/i.test(sm.headers.get('content-type') || '')) fault('/sitemap.xml', `served as ${sm.headers.get('content-type')}`);
    if (!/<urlset\b|<sitemapindex\b/.test(sm.body)) fault('/sitemap.xml', 'is not a sitemap (no urlset)');
    if (Buffer.byteLength(sm.body) > MAX_BYTES) fault('/sitemap.xml', 'is over 50 MB');
    urls = sitemapLocs(sm.body);
    if (!urls.length) fault('/sitemap.xml', 'lists no addresses');
    if (urls.length > MAX_URLS) fault('/sitemap.xml', `lists ${urls.length} addresses, over ${MAX_URLS}`);
    const seen = new Set();
    for (const u of urls) {
      if (seen.has(u)) fault(u, 'listed twice');
      seen.add(u);
      let parsed = null;
      try { parsed = new URL(u); } catch { fault(u, 'not an absolute address'); continue; }
      if (parsed.origin !== origin) fault(u, `not on ${origin}`);
    }
  }

  // old names
  for (const old of OLD_NAMES) {
    const r = await get(origin + old).catch(() => ({ status: 0, headers: new Headers() }));
    const to = r.headers.get('location') || '';
    if (!(r.status >= 300 && r.status < 400 && /\/sitemap\.xml$/.test(to))) fault(old, `answers ${r.status}${to ? ' to ' + to : ''}; it should forward to /sitemap.xml`);
  }

  // every address
  const unique = [...new Set(urls)].filter((u) => { try { return new URL(u).origin === origin; } catch { return false; } });
  await pool(unique, 8, async (u) => {
    try {
      const r = await get(u);
      for (const what of urlFaults(u, { status: r.status, location: r.headers.get('location'), xRobots: r.headers.get('x-robots-tag'), html: r.body }, rules)) fault(u, what);
    } catch (e) {
      fault(u, `could not be fetched: ${e.name === 'TimeoutError' ? 'timed out after 30 s' : e.message}`);
    }
  });

  // coverage
  if (api) {
    const listed = new Set(urls.map((u) => { try { return new URL(u).pathname.replace(/\/+$/, ''); } catch { return u; } }));
    const want = [
      ['/tournament/get-all-tournaments/', (t) => (t?.slug && !t.is_draft ? `/tournaments/${t.slug}` : null), 'tournament'],
      ['/event/get-all-events/', (e) => (e?.slug && e.is_active !== false ? `/events/${e.slug}` : null), 'event'],
      ['/users/indexable/', (p) => (p?.username ? `/u/${p.username}` : null), 'profile'],
    ];
    for (const [path, pick, kind] of want) {
      const paths = await apiList(api, path, pick);
      if (paths === null) { fault(api + path, `the ${kind} list could not be read, so coverage was not checked`); continue; }
      for (const p of paths) if (!listed.has(p)) fault(origin + p, `a public ${kind} missing from the sitemap`);
    }
  }

  for (const f of faults) console.log(`${f.where}\n  ${f.what}`);
  console.log(`${unique.length} sitemap address(es) checked on ${origin}, ${faults.length} problem(s)`);
  process.exit(faults.length ? 1 : 0);
}

// ------------------------------------------------------------------ self test

function selfTest() {
  const robotsTxt = [
    'User-Agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /events/*/manage', 'Disallow: /s/', '',
    'User-Agent: GPTBot', 'Disallow: /', '',
    'Host: https://v-ent.co', 'Sitemap: https://v-ent.co/sitemap.xml',
  ].join('\n');
  const rules = robotsRules(robotsTxt);
  const page = (canonical, robots = 'index, follow', title = 'A tournament | V-ENT') => `<html><head><title>${title}</title>`
    + `<meta name="robots" content="${robots}"/>${canonical ? `<link rel="canonical" href="${canonical}"/>` : ''}</head><body></body></html>`;
  const u = 'https://v-ent.co/tournaments/lagos-codm-clash';
  const ok = { status: 200, location: null, xRobots: null, html: page(u) };
  const cases = [
    ['a clean page has no faults', urlFaults(u, ok, rules).length === 0],
    ['a redirect is a fault', urlFaults(u, { ...ok, status: 308, location: '/fr' }, rules)[0]?.startsWith('redirects')],
    ['a 404 is a fault', urlFaults(u, { ...ok, status: 404 }, rules)[0] === 'answers 404'],
    ['a noindex page is a fault', urlFaults(u, { ...ok, html: page(u, 'noindex, follow') }, rules).some((f) => /noindex/.test(f))],
    ['an X-Robots-Tag noindex is a fault', urlFaults(u, { ...ok, xRobots: 'noindex' }, rules).some((f) => /X-Robots-Tag/.test(f))],
    ['a canonical pointing elsewhere is a fault', urlFaults(u, { ...ok, html: page('https://v-ent.co/events/view-event') }, rules).some((f) => /canonical points elsewhere/.test(f))],
    ['a missing canonical is a fault', urlFaults(u, { ...ok, html: page(null) }, rules).some((f) => /no canonical/.test(f))],
    ['a trailing slash on the canonical is the same address', urlFaults(u, { ...ok, html: page(u + '/') }, rules).length === 0],
    ['a missing title is a fault', urlFaults(u, { ...ok, html: page(u, 'index', '') }, rules).some((f) => /no title/.test(f))],
    ['a robots-blocked address is a fault', urlFaults('https://v-ent.co/events/x/manage', { ...ok, html: page('https://v-ent.co/events/x/manage') }, rules).some((f) => /robots/.test(f))],
    ['a public event page is not blocked', robotsAllows(rules, '/events/lagos-anime-con')],
    ['a prefix rule blocks what is under it', !robotsAllows(rules, '/admin/users')],
    ['the * group is used for Googlebot, not the GPTBot one', robotsAllows(rules, '/')],
    ['a longer Allow beats a shorter Disallow', robotsAllows(robotsRules('User-agent: *\nDisallow: /s\nAllow: /shop'), '/shop')],
    ['sitemap locs are read and unescaped', sitemapLocs('<urlset><url><loc>https://v-ent.co/a?x=1&amp;y=2</loc></url><url><loc> https://v-ent.co/b </loc></url></urlset>').join() === 'https://v-ent.co/a?x=1&y=2,https://v-ent.co/b'],
    ['a robots meta written as googlebot counts', pageFacts('<head><meta name="googlebot" content="noindex"></head>').noindex],
    ['a robots meta of "none" is noindex', pageFacts('<head><meta name="robots" content="none"></head>').noindex],
    ['a noindex streamed into the body still counts', pageFacts('<head><title>t</title></head><body><meta name="robots" content="noindex"></body>').noindex],
    ['metadata streamed into the body is its own fault', urlFaults(u, { ...ok, html: '<html><head></head><body>' + page(u).replace(/<\/?(html|head|body)>/g, '') + '</body></html>' }, rules).some((f) => /streamed into the body/.test(f))],
    ['metadata in the head is not that fault', !urlFaults(u, ok, rules).some((f) => /streamed/.test(f))],
  ];
  let bad = 0;
  for (const [name, passed] of cases) if (!passed) { bad += 1; console.log(`FAIL  ${name}`); }
  console.log(`${cases.length - bad}/${cases.length} self-test cases`);
  process.exit(bad ? 1 : 0);
}

if (args.includes('--self-test')) selfTest();
else if (opt('--live')) await live(opt('--live'), opt('--api'));
else {
  console.log('usage: node scripts/check-search.mjs --live <origin> [--api <api origin>] | --self-test');
  process.exit(2);
}
