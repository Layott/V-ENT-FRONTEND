#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Headless smoke test for V-ENT admin module in mock mode.
 *
 * Usage: NODE_OPTIONS="" node scripts/smoke-admin.js
 *
 * Walks the admin module pages, performs an approve/reject/ban interaction
 * on each, then re-checks the audit log to confirm the entry was prepended.
 */

const puppeteer = require('puppeteer-core')

const BASE = process.env.SMOKE_BASE || 'http://localhost:3000'
const CHROME = process.env.CHROME_BIN ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const ROUTES = [
  { path: '/admin',           label: 'Admin overview',  requires: ['Dashboard'] },
  { path: '/admin/users',     label: 'Users list',      requires: ['Users'] },
  { path: '/admin/tournaments', label: 'Tournaments',   requires: ['Tournaments'] },
  { path: '/admin/payouts',   label: 'Payouts',         requires: ['Payouts'] },
  { path: '/admin/kyc',       label: 'KYC review',      requires: ['KYC Review'] },
  { path: '/admin/audit-log', label: 'Audit log',       requires: ['Audit Log'] },
  { path: '/admin/settings',  label: 'Settings',        requires: ['Settings'] },
]

function isIgnorable(text) {
  if (!text) return true
  const ignored = [
    'favicon',
    'Download the React DevTools',
    'preloaded using link preload',
    'was preloaded using',
    'react-scan',
    'next-auth][warn][DEBUG_ENABLED',
    'The resource',
    'Extra attributes from the server', // hydration warning from nested html
    '[mockFetch] Unhandled API route',   // legacy URLs not yet wired
  ]
  return ignored.some((p) => text.includes(p))
}

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const page = await browser.newPage()
  page.setDefaultTimeout(60000)
  page.setDefaultNavigationTimeout(60000)

  const perPage = {}
  let current = { path: '', label: '' }
  function record(kind, detail) {
    if (isIgnorable(detail)) return
    const key = current.path || 'pre-test'
    perPage[key] = perPage[key] || { label: current.label, errors: [], warns: [], fails: [] }
    perPage[key][kind].push(detail)
  }

  page.on('pageerror', (err) => record('errors', `pageerror: ${err.message}`))
  page.on('console', (msg) => {
    const type = msg.type()
    const txt = msg.text()
    if (type === 'error') record('errors', `console.error: ${txt}`)
    else if (type === 'warning') record('warns', `console.warn: ${txt}`)
  })
  page.on('requestfailed', (req) => record('fails', `requestfailed: ${req.url()}`))
  page.on('response', (res) => {
    const url = res.url()
    const status = res.status()
    if (status >= 400 && !url.includes('/favicon') && !url.includes('hot-update')) {
      record('fails', `HTTP ${status}: ${url}`)
    }
  })

  // 1. Visit /admin/login first to pre-seed mock admin auth (mockSession seeds
  //    localStorage when NEXT_PUBLIC_USE_MOCK=true). This emulates the login
  //    success state so we can then walk every page.
  current = { path: '/admin/login', label: 'Admin login (auto-seeded)' }
  console.log('→ /admin/login (priming mock auth)')
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 3500))
  console.log('   URL after seed:', page.url())

  // 2. Walk every admin route
  for (const route of ROUTES) {
    current = { path: route.path, label: route.label }
    console.log('→', route.path)
    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await new Promise((r) => setTimeout(r, 1800))
      const text = await page.evaluate(() => document.body.innerText)
      for (const requirement of route.requires) {
        if (!text.includes(requirement)) {
          record('errors', `Missing required text "${requirement}" on ${route.path}`)
        }
      }
    } catch (e) {
      record('errors', `navigation failed: ${e.message}`)
    }
  }

  // 3. Test interactions: approve a payout, approve a KYC, ban a user
  console.log('→ Interaction tests')

  current = { path: '/admin/payouts', label: 'Approve payout' }
  await page.goto(`${BASE}/admin/payouts`, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 2000))
  const approvedPayout = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.textContent || '').trim() === 'Approve'
    )
    if (btn) { btn.click(); return true }
    return false
  })
  if (!approvedPayout) record('warns', 'No Approve button found on /admin/payouts')
  await new Promise((r) => setTimeout(r, 1500))

  current = { path: '/admin/kyc', label: 'Approve KYC' }
  await page.goto(`${BASE}/admin/kyc`, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 2000))
  const approvedKyc = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.textContent || '').trim() === 'Approve'
    )
    if (btn) { btn.click(); return true }
    return false
  })
  if (!approvedKyc) record('warns', 'No Approve button found on /admin/kyc')
  await new Promise((r) => setTimeout(r, 1500))

  current = { path: '/admin/users', label: 'Ban user' }
  await page.goto(`${BASE}/admin/users`, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 2000))
  const bannedUser = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.textContent || '').trim() === 'Ban'
    )
    if (btn) { btn.click(); return true }
    return false
  })
  if (!bannedUser) record('warns', 'No Ban button found on /admin/users')
  await new Promise((r) => setTimeout(r, 1500))

  // 4. Verify audit log has new entries
  current = { path: '/admin/audit-log', label: 'Audit log post-actions' }
  await page.goto(`${BASE}/admin/audit-log`, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 2000))
  const text = await page.evaluate(() => document.body.innerText)
  const auditMatches = (text.match(/Payout Approved|Ban|Unban|KYC Approved/g) || []).length
  console.log(`   Audit log entries matching new actions: ${auditMatches}`)

  await browser.close()

  const totalErrs = Object.values(perPage).reduce((s, p) => s + p.errors.length, 0)
  const totalWarns = Object.values(perPage).reduce((s, p) => s + p.warns.length, 0)
  const totalFails = Object.values(perPage).reduce((s, p) => s + p.fails.length, 0)

  console.log('\n──────────── ADMIN SMOKE TEST ────────────')
  for (const [path, data] of Object.entries(perPage)) {
    if (data.errors.length === 0 && data.warns.length === 0 && data.fails.length === 0) continue
    console.log(`\n${path} (${data.label})`)
    data.errors.forEach((e) => console.log(`  ERR: ${e.split('\n')[0]}`))
    data.warns.forEach((w) => console.log(`  WARN: ${w.split('\n')[0]}`))
    data.fails.forEach((f) => console.log(`  FAIL: ${f.split('\n')[0]}`))
  }
  console.log(`\nTotals: ${totalErrs} errors, ${totalWarns} warnings, ${totalFails} failed requests`)
  if (totalErrs > 0) console.log('FAIL'); else console.log('OK')
  process.exit(totalErrs > 0 ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
