'use client'
/**
 * Claiming a pre-launch waitlist reservation.
 *
 * The waitlist never captured a password, so this is not a login. The token in
 * the URL arrived in the person's inbox, which proves the address; all that is
 * left is choosing a password. The username they reserved is shown as already
 * settled, unless they never picked one, in which case they choose here.
 */
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import CircularProgress from '@mui/material/CircularProgress'
import { FaRegEyeSlash } from 'react-icons/fa'
import { MdOutlineRemoveRedEye } from 'react-icons/md'

import AuthHeader from '@/components/auth-header/AuthHeader'
import MessageSnackbar from '@/components/Snackbar/MessageSnackbar'
import { VENT } from '@/app/api/auth/[...nextauth]/route'
import styles from './claim.module.css'

const MIN_PASSWORD_LENGTH = 8

const ClaimAccount = () => {
  const params = useParams()
  const router = useRouter()
  const token = params?.token

  const [checking, setChecking] = useState(true)
  const [reservation, setReservation] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [open, setOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarType, setSnackbarType] = useState('error')

  const notify = (message, type = 'error') => {
    setSnackbarMessage(message)
    setSnackbarType(type)
    setOpen(true)
  }

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(`${VENT.WAITLIST_CLAIM_PREVIEW}/${token}/`)
        const data = await response.json()
        if (cancelled) return

        if (response.ok) {
          setReservation(data.data)
        } else {
          setLoadError(data.message || 'This claim link is not valid.')
        }
      } catch {
        if (!cancelled) setLoadError('Could not reach V-ENT. Check your connection and try again.')
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [token])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (password.length < MIN_PASSWORD_LENGTH) {
      notify(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }
    if (!reservation?.username_reserved && !username.trim()) {
      notify('Choose a username to finish claiming your account')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(VENT.WAITLIST_CLAIM, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          ...(reservation?.username_reserved ? {} : { username: username.trim() }),
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        notify(data.message || 'Could not claim your account. Please try again.')
        setSubmitting(false)
        return
      }

      // The account exists and is active. Sign them straight in rather than
      // sending somebody who just set a password to a login form to type it
      // again.
      // Same shape the login page sends: the credentials provider reads the
      // identifier as `email`, and the backend accepts a username there too.
      const result = await signIn('credentials', {
        redirect: false,
        email: data.data.username,
        password,
        callbackUrl: `${window.location.origin}/home`,
      })

      if (result?.ok) {
        router.push('/home')
      } else {
        notify('Account claimed. Please log in to continue.', 'success')
        setTimeout(() => router.push('/login'), 1200)
      }
    } catch {
      notify('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <div className={styles.pageContainer}>
        <AuthHeader />
        <main className={styles.mainContainer}>
          <CircularProgress size={28} sx={{ color: 'var(--v-ent-red)' }} />
          <p className={styles.muted}>Checking your reservation</p>
        </main>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={styles.pageContainer}>
        <AuthHeader />
        <main className={styles.mainContainer}>
          <h3>This link has expired</h3>
          <p className={styles.muted}>{loadError}</p>
          <p className={styles.muted}>
            If you already claimed your account, log in instead. Otherwise sign up and your
            waitlist place still counts.
          </p>
          <div className={styles.actions}>
            <button className={`btn redBTN ${styles.fullWidth}`} onClick={() => router.push('/login')}>
              Go to login
            </button>
            <button className={`btn ${styles.ghostBTN}`} onClick={() => router.push('/signup')}>
              Sign up instead
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      <AuthHeader />
      <main className={styles.mainContainer}>
        <p className={styles.eyebrow}>Founding member #{reservation.position}</p>
        <h3>Claim your account</h3>
        <p className={styles.muted}>
          You joined the V-ENT waitlist with {reservation.email}. Set a password and you are in.
        </p>

        {reservation.username_reserved ? (
          <div className={styles.reservedBlock}>
            <span className={styles.reservedLabel}>Your reserved username</span>
            <span className={styles.reservedName}>{reservation.username}</span>
          </div>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          {!reservation.username_reserved && (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Choose a username</span>
              <input
                className={styles.input}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
          )}

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Create a password</span>
            <div className={styles.passwordWrap}>
              <input
                className={styles.input}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
              <button
                type="button"
                className={styles.eyeBTN}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <MdOutlineRemoveRedEye /> : <FaRegEyeSlash />}
              </button>
            </div>
            <span className={styles.hint}>At least {MIN_PASSWORD_LENGTH} characters</span>
          </label>

          <button type="submit" className={`btn redBTN ${styles.fullWidth}`} disabled={submitting}>
            {submitting ? <CircularProgress size={22} sx={{ color: 'white' }} /> : 'Claim my account'}
          </button>
        </form>

        <p className={styles.footnote}>
          You never set a password on the waitlist, so you are choosing one now.
        </p>
      </main>

      <MessageSnackbar
        open={open}
        handleClose={() => setOpen(false)}
        message={snackbarMessage}
        type={snackbarType}
      />
    </div>
  )
}

export default ClaimAccount
