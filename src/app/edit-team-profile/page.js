'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SlArrowRight } from 'react-icons/sl'
import { LuShieldX } from 'react-icons/lu'
import Sidebar from '@/components/sidebar/Sidebar'
import Header from '@/components/header/Header'
import MobileHeader from '@/components/mobile-header/MobileHeader'
import BottomMenu from '@/components/bottom-menu/BottomMenu'
import EditTeamProfileInfoNew from '@/components/edit-team-profile/EditTeamProfileInfoNew'
import EditTeamProfileLinksNew from '@/components/edit-team-profile/EditTeamProfileLinksNew'
import EditTeamProfileMembershipNew from '@/components/edit-team-profile/EditTeamProfileMembershipNew'
import styles from './edit-team-profile.module.css'

const TABS = [
  { id: 'profile-info', label: 'Profile Info' },
  { id: 'social-links', label: 'Web and Social Links' },
  { id: 'membership', label: 'Membership Settings' },
]

const EditTeamProfileContent = ({ slug: slugFromPath }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const teamId = slugFromPath || searchParams.get('id') || ''
  const { data: session } = useSession()

  const [activeTab, setActiveTab] = useState('profile-info')
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState('')

  const fetchTeam = useCallback(async () => {
    if (!teamId) {
      setLoading(false)
      setError('Missing team id')
      return
    }
    try {
      setLoading(true)
      const headers = { 'Content-Type': 'application/json' }
      if (session?.user?.sessionToken) headers['Authorization'] = `Bearer ${session.user.sessionToken}`
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/team/view-team/${teamId}/`,
        { headers }
      )
      const data = await res.json()
      const t = data?.data?.team ?? data?.data
      if (!t) throw new Error('Team not found')
      setTeam(t)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [teamId, session])

  useEffect(() => { fetchTeam() }, [fetchTeam])

  const isOwner =
    !!team && (
      team?.owner?.id === session?.user?.id ||
      team?.owner?.username === session?.user?.username ||
      team?.owner?.user_id === session?.user?.id
    )

  const showToast = (msg) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2200)
  }

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <Header className={styles.customHeader} />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar customClass={styles.customSidebar} />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>Loading…</p>
          </div>
        </main>
        <BottomMenu />
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className={styles.pageContainer}>
        <Header className={styles.customHeader} />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar customClass={styles.customSidebar} />
          <div className={styles.rightPaneContainer}>
            <div className={styles.gateCard}>
              <h2 className={styles.gateTitle}>Team not found</h2>
              <p className={styles.gateSub}>{error || 'We could not load that team.'}</p>
              <button type="button" className={styles.gateBtn} onClick={() => router.push('/teams')}>Back to teams</button>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className={styles.pageContainer}>
        <Header className={styles.customHeader} />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar customClass={styles.customSidebar} />
          <div className={styles.rightPaneContainer}>
            <div className={styles.gateCard}>
              <div className={styles.gateIcon}><LuShieldX /></div>
              <h2 className={styles.gateTitle}>Access denied</h2>
              <p className={styles.gateSub}>Only the owner of <strong>{team.name}</strong> can edit this team.</p>
              <button
                type="button"
                className={styles.gateBtn}
                onClick={() => router.push(`/teams/${team.slug || team.id}`)}
              >
                Back to team profile
              </button>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      <Header className={styles.customHeader} />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar customClass={styles.customSidebar} />

        <div className={styles.rightPaneContainer}>
          <div className={styles.headerRow}>
            <h1 className={styles.pageTitle}>Edit team - {team.name}</h1>
            <p className={styles.pageSub}>Update profile, links, and membership rules.</p>
          </div>

          <div className={styles.layout}>
            <aside className={styles.sideMenu}>
              <p className={styles.sideMenuLabel}>Settings</p>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.tabBTN} ${activeTab === t.id ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                  {activeTab === t.id && <SlArrowRight className={styles.tabArrow} />}
                </button>
              ))}
            </aside>

            <div className={styles.content}>
              {activeTab === 'profile-info' && (
                <EditTeamProfileInfoNew team={team} onSaved={(updated) => { setTeam((t) => ({ ...t, ...updated })); showToast('Team profile updated') }} />
              )}
              {activeTab === 'social-links' && (
                <EditTeamProfileLinksNew team={team} onSaved={(updated) => { setTeam((t) => ({ ...t, ...updated })); showToast('Social links saved') }} />
              )}
              {activeTab === 'membership' && (
                <EditTeamProfileMembershipNew team={team} onSaved={(updated) => { setTeam((t) => ({ ...t, ...updated })); showToast('Membership settings saved') }} />
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}

const EditTeamProfile = () => (
  <Suspense fallback={<p style={{ padding: '2rem' }}>Loading…</p>}>
    <EditTeamProfileContent />
  </Suspense>
)

export default EditTeamProfile

// Exported so the slug route can render it.
export { EditTeamProfileContent };
