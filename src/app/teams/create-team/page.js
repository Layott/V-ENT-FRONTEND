'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { FiCamera, FiUpload } from 'react-icons/fi'
import { LuGamepad2, LuCheck } from 'react-icons/lu'
import Header from '@/components/header/Header'
import MobileHeader from '@/components/mobile-header/MobileHeader'
import Sidebar from '@/components/sidebar/Sidebar'
import BottomMenu from '@/components/bottom-menu/BottomMenu'
import styles from './create-team.module.css'
import useGames from '@/hooks/useGames';

const REGIONS = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Morocco', 'Senegal']

const CreateTeam = () => {
  const { gameTitles } = useGames();
  const router = useRouter()
  const { data: session } = useSession()

  const [logoPreview, setLogoPreview] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [name, setName] = useState('')
  const [coreGame, setCoreGame] = useState('')
  const [bio, setBio] = useState('')
  const [region, setRegion] = useState('Nigeria')
  const [maxMembers, setMaxMembers] = useState(6)
  const [openToJoin, setOpenToJoin] = useState(true)
  const [twitter, setTwitter] = useState('')
  const [instagram, setInstagram] = useState('')
  const [discord, setDiscord] = useState('')
  const [twitch, setTwitch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const logoRef = useRef(null)
  const bannerRef = useRef(null)

  const handleFile = (file, setter) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setter(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    setError('')
    if (!name.trim()) return setError('Team name is required.')
    if (!coreGame) return setError('Pick a core game.')

    setSubmitting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/create-team/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && { Authorization: `Bearer ${session.user.sessionToken}` }),
        },
        body: JSON.stringify({
          name: name.trim(),
          core_game: coreGame,
          bio,
          region,
          max_members: maxMembers,
          open_to_join: openToJoin,
          social_links: { twitter, instagram, discord, twitch },
          logo_url: logoPreview,
          banner_url: bannerPreview,
        }),
      })
      const data = await res.json()
      if (data?.status === 'success') {
        setSuccess(true)
        const newId = data?.data?.id || data?.data?.team?.id
        window.setTimeout(() => {
          if (newId) router.push(`/teams/team-profile?id=${newId}`)
          else router.push('/teams')
        }, 1100)
      } else {
        setError(data?.message || 'Failed to create team.')
      }
    } catch (err) {
      setError('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.successPanel}>
              <div className={styles.successIcon}><LuCheck /></div>
              <h2 className={styles.successTitle}>Team created</h2>
              <p className={styles.successSub}>Taking you to the team profile…</p>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>Create a new team</h1>
              <p className={styles.pageSub}>Pick a name, upload assets and define your squad - you can edit everything later.</p>
            </div>
          </div>

          <form className={styles.formGrid} onSubmit={handleSubmit}>
            {/* Banner + Logo upload */}
            <section className={styles.uploadSection}>
              <div className={styles.bannerUpload} onClick={() => bannerRef.current?.click()}>
                {bannerPreview ? (
                  <Image src={bannerPreview} alt="" fill style={{ objectFit: 'cover' }} sizes="100vw" />
                ) : (
                  <div className={styles.uploadHint}>
                    <FiCamera /> <span>Upload banner image (1200×400)</span>
                  </div>
                )}
                <input
                  ref={bannerRef}
                  type="file"
                  accept="image/*"
                  className={styles.hiddenInput}
                  onChange={(e) => handleFile(e.target.files?.[0], setBannerPreview)}
                />
              </div>

              <div className={styles.logoUploadWrap}>
                <div className={styles.logoUpload} onClick={() => logoRef.current?.click()}>
                  {logoPreview ? (
                    <Image src={logoPreview} alt="" fill style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className={styles.logoFallback}><FiCamera /></div>
                  )}
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    className={styles.hiddenInput}
                    onChange={(e) => handleFile(e.target.files?.[0], setLogoPreview)}
                  />
                </div>
                <p className={styles.uploadCaption}><FiUpload /> Upload logo</p>
              </div>
            </section>

            {/* Basic info */}
            <section className={styles.formCard}>
              <h2 className={styles.cardTitle}>Basic info</h2>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Team name *</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Crimson Wolves"
                  className={styles.input}
                  maxLength={32}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Core game *</span>
                <select value={coreGame} onChange={(e) => setCoreGame(e.target.value)} className={styles.input}>
                  <option value="">Select a game…</option>
                  {gameTitles.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Bio</span>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What is your team about? Achievements? Playstyle?"
                  className={styles.textarea}
                  maxLength={300}
                />
                <span className={styles.charCount}>{bio.length} / 300</span>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Region</span>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className={styles.input}>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
            </section>

            {/* Membership settings */}
            <section className={styles.formCard}>
              <h2 className={styles.cardTitle}>Membership</h2>

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

              <label className={styles.toggleField}>
                <div>
                  <span className={styles.fieldLabel}>Open to join</span>
                  <span className={styles.fieldHint}>Anyone can request to join. Captains approve.</span>
                </div>
                <button
                  type="button"
                  className={`${styles.toggle} ${openToJoin ? styles.toggleOn : ''}`}
                  onClick={() => setOpenToJoin((v) => !v)}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </label>
            </section>

            {/* Social links */}
            <section className={styles.formCard}>
              <h2 className={styles.cardTitle}>Social links <span className={styles.optional}>(optional)</span></h2>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Twitter / X</span>
                <input type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/team" className={styles.input} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Instagram</span>
                <input type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/team" className={styles.input} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Discord</span>
                <input type="url" value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="https://discord.gg/invite" className={styles.input} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Twitch</span>
                <input type="url" value={twitch} onChange={(e) => setTwitch(e.target.value)} placeholder="https://twitch.tv/team" className={styles.input} />
              </label>
            </section>

            {/* Submit */}
            <section className={styles.submitRow}>
              {error && <p className={styles.errorText}>{error}</p>}
              <div className={styles.submitButtons}>
                <button type="button" className={styles.cancelBtn} onClick={() => router.push('/teams')}>Cancel</button>
                <button type="submit" className={`${styles.submitBtn} redBTN`} disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create team'}
                </button>
              </div>
            </section>
          </form>
        </div>
      </main>

      <BottomMenu />
    </div>
  )
}

export default CreateTeam
