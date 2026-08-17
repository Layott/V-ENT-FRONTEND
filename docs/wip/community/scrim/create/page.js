'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';
import { FaCheckCircle, FaCrosshairs } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './scrim-create.module.css';

const GAMES = ['FIFA', 'PUBG Mobile', 'Call of Duty Mobile', 'Free Fire', 'Fortnite', 'Minecraft', 'Valorant', 'Tekken'];
const FORMATS = ['Bo1', 'Bo3', 'Bo5'];
const REGIONS = ['NG-West', 'NG-East', 'ZA', 'KE', 'EU-West', 'NA-East', 'SA', 'AS-East'];

const ScrimCreateInner = () => {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    team: '',
    game: '',
    format: 'Bo3',
    scheduled_at: '',
    region: 'NG-West',
    opponent: '',
    notes: '',
    prize_vc: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadTeams = async () => {
      setTeamsLoading(true);
      try {
        const res = await fetch(`${apiUrl}/teams/get-all-teams/`);
        const data = await res.json();
        if (data.status === 'success' && data.data?.teams) {
          setTeams(data.data.teams);
          if (data.data.teams.length > 0) {
            setForm((p) => ({ ...p, team: data.data.teams[0].id }));
          }
        }
      } catch (err) {
        console.error('Teams fetch error:', err);
      } finally {
        setTeamsLoading(false);
      }
    };
    loadTeams();
  }, [apiUrl]);

  const updateField = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.team) e.team = 'Pick your team';
    if (!form.game) e.game = 'Choose a game';
    if (!form.format) e.format = 'Choose a format';
    if (!form.scheduled_at) e.scheduled_at = 'Pick a date and time';
    else if (new Date(form.scheduled_at).getTime() < Date.now()) e.scheduled_at = 'Schedule must be in the future';
    if (!form.region) e.region = 'Choose a region';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      const team = teams.find((t) => t.id === form.team);
      const payload = {
        team_a: team ? {
          id: team.id,
          name: team.name,
          tag: team.tag,
          logo: team.logo,
        } : { id: form.team, name: 'My Team' },
        opponent_open_or_team_b: form.opponent
          ? { open: false, opponent: { id: 'invited', name: form.opponent, tag: form.opponent.slice(0, 3).toUpperCase() } }
          : { open: true, opponent: null },
        game: form.game,
        format: form.format,
        region: form.region,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        notes: form.notes || 'Friendly scrim',
        prize_vc: form.prize_vc ? Number(form.prize_vc) : 0,
      };
      const res = await fetch(`${apiUrl}/scrim/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.scrim) {
        setSuccess(data.data.scrim);
      }
    } catch (err) {
      console.error('Create scrim error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.successCard}>
              <FaCheckCircle className={styles.successIcon} />
              <h2 className={styles.successTitle}>Scrim posted</h2>
              <p className={styles.successText}>
                Your {form.format} {form.game} scrim is now live for {form.region}.
                {success.opponent_open_or_team_b?.open
                  ? ' Other teams can request to match.'
                  : ' We have notified the opponent.'}
              </p>
              <div className={styles.successActions}>
                <button
                  className={`${styles.successBtn} goldBTN`}
                  onClick={() => router.push('/community?tab=scrims')}
                >
                  View scrims
                </button>
                <button
                  className={styles.successCancel}
                  onClick={() => {
                    setSuccess(null);
                    setForm((p) => ({ ...p, opponent: '', notes: '', prize_vc: '' }));
                  }}
                >
                  Post another
                </button>
              </div>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <button className={styles.backLink} onClick={() => router.push('/community?tab=scrims')}>
            <FiArrowLeft /> Back to scrims
          </button>

          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              <FaCrosshairs className={styles.titleIcon} /> Challenge a team
            </h1>
            <p className={styles.pageSubtitle}>
              Post an open scrim or call out a specific opponent. Other captains see it instantly.
            </p>
          </div>

          <form className={styles.formCard} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Your team *</label>
                <select
                  className={`${styles.input} ${errors.team ? styles.inputError : ''}`}
                  value={form.team}
                  onChange={(e) => updateField('team', e.target.value)}
                  disabled={teamsLoading}
                >
                  <option value="">{teamsLoading ? 'Loading teams...' : 'Pick your team'}</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.tag ? ` [${t.tag}]` : ''}</option>
                  ))}
                </select>
                {errors.team && <span className={styles.errorText}>{errors.team}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Game *</label>
                <select
                  className={`${styles.input} ${errors.game ? styles.inputError : ''}`}
                  value={form.game}
                  onChange={(e) => updateField('game', e.target.value)}
                >
                  <option value="">Choose a game</option>
                  {GAMES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                {errors.game && <span className={styles.errorText}>{errors.game}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Format *</label>
                <div className={styles.formatRow}>
                  {FORMATS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`${styles.formatBtn} ${form.format === f ? styles.formatBtnActive : ''}`}
                      onClick={() => updateField('format', f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {errors.format && <span className={styles.errorText}>{errors.format}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Region *</label>
                <select
                  className={`${styles.input} ${errors.region ? styles.inputError : ''}`}
                  value={form.region}
                  onChange={(e) => updateField('region', e.target.value)}
                >
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.region && <span className={styles.errorText}>{errors.region}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Scheduled at *</label>
                <input
                  type="datetime-local"
                  className={`${styles.input} ${errors.scheduled_at ? styles.inputError : ''}`}
                  value={form.scheduled_at}
                  onChange={(e) => updateField('scheduled_at', e.target.value)}
                />
                {errors.scheduled_at && <span className={styles.errorText}>{errors.scheduled_at}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Prize pot (VENT COINS, optional)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0"
                  className={styles.input}
                  value={form.prize_vc}
                  onChange={(e) => updateField('prize_vc', e.target.value)}
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Opponent (optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty for an open scrim — anyone can accept"
                  className={styles.input}
                  value={form.opponent}
                  onChange={(e) => updateField('opponent', e.target.value)}
                  maxLength={60}
                />
                <span className={styles.hint}>Type a team name to challenge directly. Leave empty to keep it open.</span>
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Notes</label>
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  placeholder="Map pool, server, rules, anything else..."
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => router.push('/community?tab=scrims')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${styles.submitBtn} goldBTN`}
                disabled={submitting}
              >
                {submitting ? 'Posting scrim...' : 'Post scrim'}
              </button>
            </div>
          </form>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

const ScrimCreatePage = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', background: '#131316' }} />}>
    <ScrimCreateInner />
  </Suspense>
);

export default ScrimCreatePage;
