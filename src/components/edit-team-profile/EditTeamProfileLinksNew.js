'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { FaTwitter, FaInstagram, FaDiscord, FaTwitch, FaYoutube, FaFacebook } from 'react-icons/fa'
import styles from './edit-team-profile-new.module.css'

const FIELDS = [
  { key: 'twitter', label: 'Twitter / X', icon: FaTwitter, placeholder: 'https://twitter.com/team' },
  { key: 'instagram', label: 'Instagram', icon: FaInstagram, placeholder: 'https://instagram.com/team' },
  { key: 'discord', label: 'Discord', icon: FaDiscord, placeholder: 'https://discord.gg/invite' },
  { key: 'twitch', label: 'Twitch', icon: FaTwitch, placeholder: 'https://twitch.tv/team' },
  { key: 'youtube', label: 'YouTube', icon: FaYoutube, placeholder: 'https://youtube.com/@team' },
  { key: 'facebook', label: 'Facebook', icon: FaFacebook, placeholder: 'https://facebook.com/team' },
]

const EditTeamProfileLinksNew = ({ team, onSaved }) => {
  const { data: session } = useSession()
  const [links, setLinks] = useState(() => ({
    twitter: team.social_links?.twitter || '',
    instagram: team.social_links?.instagram || '',
    discord: team.social_links?.discord || '',
    twitch: team.social_links?.twitch || '',
    youtube: team.social_links?.youtube || '',
    facebook: team.social_links?.facebook || '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e?.preventDefault?.()
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/edit-team/${team.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && { Authorization: `Bearer ${session.user.sessionToken}` }),
        },
        body: JSON.stringify({ social_links: links }),
      })
      const data = await res.json()
      if (data?.status === 'success') onSaved?.({ social_links: links })
      else setError(data?.message || 'Save failed')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.formWrapper} onSubmit={handleSave}>
      <h2 className={styles.sectionTitle}>Web and Social Links</h2>
      <p className={styles.helperText}>Add any of your team’s public profiles. Leave blank to hide.</p>

      {FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
        <label key={key} className={styles.field}>
          <span className={styles.fieldLabel}><Icon className={styles.fieldIcon} /> {label}</span>
          <input
            type="url"
            value={links[key]}
            onChange={(e) => setLinks((s) => ({ ...s, [key]: e.target.value }))}
            placeholder={placeholder}
            className={styles.input}
          />
        </label>
      ))}

      {error && <p className={styles.errorText}>{error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={`${styles.saveBtn} redBTN`} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

export default EditTeamProfileLinksNew
