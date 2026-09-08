'use client'

// Who is in the console.
//
// The console used to hold a session of its own, from a sign-in of its own: an
// admin signed in to the site, then signed in AGAIN with a password and an
// authenticator code to reach the dashboard. Two doors for one person, and the
// second asked for a password the session had proved a moment earlier.
//
// There is one door now. The authenticator code moved to the ordinary sign-in,
// where every admin meets it every time, and the console reads that same
// session. The second factor did not get weaker for moving - it used to be
// reachable only by going looking for the dashboard, and it is now unavoidable.
//
// The token is still written to `localStorage.adminToken`, because fourteen
// pages read it from there. It is the site session token now rather than a
// separate grant, and the server refuses it unless the sign-in behind it
// carried the code.

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { permsForPath } from '@/components/admin/AdminNav'

export function useAdminAuth() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  // The token, not the session object: `useSession` hands back a new object on
  // every render, and depending on it here is how this loops forever.
  const token = session?.user?.sessionToken || null

  useEffect(() => {
    if (status === 'loading') return undefined
    if (!token) {
      router.replace('/login?next=/admin')
      return undefined
    }

    // Fourteen pages read this. Written before the check so their own first
    // fetch has it, and cleared below if the server says no.
    localStorage.setItem('adminToken', token)

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (cancelled) return

        const body = await res.json().catch(() => ({}))

        if (res.ok && body?.status === 'success' && body.data) {
          setAdmin(body.data)
          localStorage.setItem('adminUser', JSON.stringify(body.data))
          setLoading(false)
          return
        }

        // Signed in, but with a password alone - the second factor is what
        // makes a session an admin session. Send them back through the front
        // door rather than showing an empty console.
        if (body?.code === 'TWO_FACTOR_REQUIRED') {
          localStorage.removeItem('adminToken')
          localStorage.removeItem('adminUser')
          // Sign out of NextAuth as well, not only out of the console.
          //
          // The session is real, it just never met the authenticator - which is
          // the case for every admin whose session predates this change. Sending
          // them to /login while that session still stands is how they ended up
          // bouncing back to /home: the only way to get the mark is to come
          // through the front door again, so the old session has to go first.
          await signOut({ redirect: false })
          window.location.href = '/login?next=/admin&reason=2fa'
          return
        }

        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')

        // The backend session is dead while the NextAuth one is still standing.
        // That happens after a backend restart, or when the single session this
        // account is allowed was taken somewhere else. Signing in again fixes
        // it, and sending them to /home instead leaves them wondering why the
        // console will not open.
        if (res.status === 401) {
          router.replace('/login?next=/admin&expired=1')
          return
        }

        // Not an admin, or no role. Neither is worth a console, and neither is
        // fixed by signing in again.
        router.replace('/home')
      } catch {
        // The server could not be reached. Keep whatever was cached so a blip
        // does not throw somebody out of a page they are working in, and let
        // the page's own request report the failure.
        if (cancelled) return
        const cached = localStorage.getItem('adminUser')
        if (cached) {
          try { setAdmin(JSON.parse(cached)) } catch { /* nothing usable */ }
        }
        setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [token, status, router])

  function logout() {
    localStorage.removeItem('adminUser')
    localStorage.removeItem('adminToken')
    router.replace('/home')
  }

  // May this person be on THIS section?
  //
  // The nav has always known, because it hides a link somebody may not use.
  // Nothing knew it at the page, so typing the address opened the screen: a
  // moderator reaching /admin/admins got the heading, a refusal sentence from
  // the fetch the API correctly rejected, and a live "Give somebody a role"
  // button. Hiding a link is not a permission, and neither is a 403 that
  // arrives after the screen has already offered the action.
  //
  // Read from the same map the nav reads, so a section cannot be hidden in one
  // and open in the other.
  // `permissions` is a MAP of action to boolean, not a list. The backend builds
  // it as `{action: (admin_role in roles)}`, so every action a role does not
  // have is present and false. Reading it as an array threw on every render,
  // which the role walk caught the first time it ran.
  const needed = permsForPath(pathname)
  const held = admin?.permissions || {}
  const allowed = !needed || needed.some((name) => held[name] === true)

  return { admin, loading, logout, allowed, needed }
}
