'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { LuLock, LuLockOpen, LuKey } from 'react-icons/lu'
import styles from './edit-team-profile-new.module.css'

const EditTeamProfileMembershipNew = ({ team, onSaved }) => {
  const { data: session } = useSession()
  const [maxMembers, setMaxMembers] = useState(team.max_members || 6)
  const [openToJoin, setOpenToJoin] = useState(team.open_to_join ?? team.is_accepting_members ?? true)
  const [passwordProtected, setPasswordProtected] = useState(team.password_protected || false)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e?.preventDefault?.()
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/membership-settings/${team.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && { Authorization: `Bearer ${session.user.sessionToken}` }),
        },
        body: JSON.stringify({
          max_members: maxMembers,
          open_to_join: openToJoin,
          password_protected: passwordProtected,
          password: passwordProtected ? password : '',
        }),
      })
      const data = await res.json()
      if (data?.status === 'success') {
        onSaved?.({ max_members: maxMembers, open_to_join: openToJoin, password_protected: passwordProtected })
      } else {
        setError(data?.message || 'Save failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.formWrapper} onSubmit={handleSave}>
      <h2 className={styles.sectionTitle}>Membership Settings</h2>
      <p className={styles.helperText}>Control who can join your team and how.</p>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Max members: <strong className={styles.sliderValue}>{maxMembers}</strong></span>
        <input
          type="range"
          min={2}
          max={10}
          value={maxMembers}
          onChange={(e) => setMaxMembers(parseInt(e.target.value, 10))}
          className={styles.slider}
        />
        <div className={styles.sliderTicks}>
          {[2, 4, 6, 8, 10].map((n) => <span key={n}>{n}</span>)}
        </div>
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.toggleInfo}>
          <span className={styles.fieldLabel}>{openToJoin ? <LuLockOpen /> : <LuLock />} Open to join</span>
          <p className={styles.toggleHint}>Anyone can request to join. Captains approve.</p>
        </div>
        <button
          type="button"
          className={`${styles.toggle} ${openToJoin ? styles.toggleOn : ''}`}
          onClick={() => setOpenToJoin((v) => !v)}
        >
          <span className={styles.toggleKnob} />
        </button>
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.toggleInfo}>
          <span className={styles.fieldLabel}><LuKey /> Password protected</span>
          <p className={styles.toggleHint}>Require a password for users to request joining.</p>
        </div>
        <button
          type="button"
          className={`${styles.toggle} ${passwordProtected ? styles.toggleOn : ''}`}
          onClick={() => setPasswordProtected((v) => !v)}
        >
          <span className={styles.toggleKnob} />
        </button>
      </div>

      {passwordProtected && (
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Team password</span>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Set a password for join requests"
            className={styles.input}
          />
        </label>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={`${styles.saveBtn} redBTN`} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

export default EditTeamProfileMembershipNew
