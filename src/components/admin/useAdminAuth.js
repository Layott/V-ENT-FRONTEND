'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useAdminAuth() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem('adminUser')
    const token = localStorage.getItem('adminToken')
    if (!raw || !token) {
      router.replace('/admin/login')
      return
    }
    // Paint immediately from localStorage so the page is non-blocking…
    try {
      setAdmin(JSON.parse(raw))
    } catch {
      router.replace('/admin/login')
      return
    }
    setLoading(false)

    // …then reconcile the identity against the server. On 401 clear + bounce;
    // on success refresh the cached role/permissions so RBAC stays fresh.
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (cancelled) return
        if (res.status === 401) {
          localStorage.removeItem('adminUser')
          localStorage.removeItem('adminToken')
          document.cookie = 'adminToken=; path=/; max-age=0'
          router.replace('/admin/login')
          return
        }
        const data = await res.json().catch(() => ({}))
        if (!cancelled && data?.status === 'success' && data.data) {
          setAdmin(data.data)
          localStorage.setItem('adminUser', JSON.stringify(data.data))
        }
      } catch {
        // Network error - keep the locally-painted session, don't bounce.
      }
    })()

    return () => { cancelled = true }
  }, [router])

  function logout() {
    localStorage.removeItem('adminUser')
    localStorage.removeItem('adminToken')
    document.cookie = 'adminToken=; path=/; max-age=0'
    router.replace('/admin/login')
  }

  return { admin, loading, logout }
}
