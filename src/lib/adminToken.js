'use client'

// The session token the admin console sends with every request.
//
// It used to be copied into `localStorage.adminToken`, where it stayed on disk
// after the tab closed, after sign-out if any path forgot to clear it, and in
// reach of any script on the origin for as long as the browser kept the
// profile (owner rule R66). It is the site's own session token, which
// `useAdminAuth` already reads from the NextAuth session, so the console keeps
// it in memory instead and loses it with the page.
//
// `useAdminAuth` sets it while it renders, which is before any page below it
// runs an effect, so a page's first request already has it.

let current = ''

export function setAdminToken(token) {
  current = token || ''
}

export function adminToken() {
  return current
}
