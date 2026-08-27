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
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export function useAdminAuth() {
  const router = useRouter()
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
          router.replace('/login?next=/admin&reason=2fa')
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

  return { admin, loading, logout }
}
