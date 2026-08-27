'use client';

import { apiMessage } from '@/lib/apiMessage';
import InfoTip from '@/components/info-tip/InfoTip';
import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiArrowLeft } from 'react-icons/fi';
import { FaCheckCircle, FaCrosshairs } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './scrim-create.module.css';
import useGames from '@/hooks/useGames';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import DateField from '@/components/date-field/DateField';
const FORMATS = ['Bo1', 'Bo3', 'Bo5'];
const REGIONS = ['NG-West', 'NG-East', 'ZA', 'KE', 'EU-West', 'NA-East', 'SA', 'AS-East'];
const ScrimCreateInner = () => {
  const tx = useTx();
  const tt = useT();
  const {
    gameTitles
  } = useGames();
  const {
    data: session
  } = useSession();
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(session?.user?.sessionToken ? {
      Authorization: `Bearer ${session.user.sessionToken}`
    } : {})
  });
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({
    team: '',
    game: '',
    format: 'Bo3',
    scheduled_at: '',
    region: 'NG-West',
    opponent: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  useEffect(() => {
    // Wait for the session token - my-teams is Bearer-scoped and 401s without it.
    if (!session?.user?.sessionToken) return;
    const loadTeams = async () => {
      setTeamsLoading(true);
      try {
        const res = await fetch(`${apiUrl}/team/my-teams/`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (data.status === 'success' && data.data?.teams) {
          setTeams(data.data.teams);
          if (data.data.teams.length > 0) {
            setForm(p => ({
              ...p,
              team: data.data.teams[0].id
            }));
          }
        }
      } catch (err) {
        console.error('Teams fetch error:', err);
      } finally {
        setTeamsLoading(false);
      }
    };
    loadTeams();
  }, [apiUrl, session?.user?.sessionToken]);
  const updateField = (field, value) => {
    setForm(p => ({
      ...p,
      [field]: value
    }));
    if (errors[field]) setErrors(p => ({
      ...p,
      [field]: undefined
    }));
  };
  const validate = () => {
    const e = {};
    if (!form.team) e.team = 'Pick your team';
    if (!form.game) e.game = 'Choose a game';
    if (!form.format) e.format = 'Choose a format';
    if (!form.scheduled_at) e.scheduled_at = 'Pick a date and time';else if (new Date(form.scheduled_at).getTime() < Date.now()) e.scheduled_at = 'Schedule must be in the future';
    if (!form.region) e.region = 'Choose a region';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const handleSubmit = async ev => {
    ev.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        team_id: form.team,
        game: form.game,
        format: form.format,
        region: form.region,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        notes: form.notes,
        opponent: form.opponent.trim()
      };
      const res = await fetch(`${apiUrl}/scrim/create/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.scrim) {
        setSuccess(data.data.scrim);
      } else {
        setSubmitError(apiMessage(tt, data, "api.couldNotPostThatScrim", "Could not post that scrim."));
      }
    } catch (err) {
      console.error('Create scrim error:', err);
      setSubmitError('Could not reach the server. Try again.');
    } finally {
      setSubmitting(false);
    }
  };
  if (success) {
    return <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.successCard}>
              <FaCheckCircle className={styles.successIcon} />
              <h2 className={styles.successTitle}>{tt("ui.scrim.posted.72ba", "Scrim posted")}</h2>
              <p className={styles.successText}>
                {tt("ui.text.ba59", "Your")} {form.format} {form.game} {tt("ui.scrim.now.live.aa0b", "scrim is now live for")} {form.region}.
                {success.challenged ? ` ${success.challenged.name} has been notified.` : tx(" Other teams can accept it.")}
              </p>
              <div className={styles.successActions}>
                <button className={`${styles.successBtn} goldBTN`} onClick={() => router.push('/community?tab=scrims')}>
                  {tt("ui.view.scrims.817d", "View scrims")}
                </button>
                <button className={styles.successCancel} onClick={() => {
                setSuccess(null);
                setForm(p => ({
                  ...p,
                  opponent: '',
                  notes: ''
                }));
              }}>
                  {tt("ui.post.another.351e", "Post another")}
                </button>
              </div>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <button className={styles.backLink} onClick={() => router.push('/community?tab=scrims')}>
            <FiArrowLeft /> {tt("ui.back.scrims.3f01", "Back to scrims")}
          </button>

          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              <FaCrosshairs className={styles.titleIcon} /> {tt("ui.challenge.team.6a5a", "Challenge a team")}
            </h1>
            <p className={styles.pageSubtitle}>
              {tt("ui.post.open.scrim.call.b5e4", "Post an open scrim or call out a specific opponent. Other captains see it instantly.")}
            </p>
          </div>

          <form className={styles.formCard} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("ui.team.e672", "Your team *")} <InfoTip id="scrimTeam" /></span></label>
                <select className={`${styles.input} ${errors.team ? styles.inputError : ''}`} value={form.team} onChange={e => updateField('team', e.target.value)} disabled={teamsLoading}>
                  <option value="">{teamsLoading ? tx("Loading teams...") : tx("Pick your team")}</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}{t.tag ? ` [${t.tag}]` : ''}</option>)}
                </select>
                {errors.team && <span className={styles.errorText}>{errors.team}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("ui.game.d199", "Game *")} <InfoTip id="teamGame" /></span></label>
                <select className={`${styles.input} ${errors.game ? styles.inputError : ''}`} value={form.game} onChange={e => updateField('game', e.target.value)}>
                  <option value="">{tt("ui.choose.game.6fa9", "Choose a game")}</option>
                  {gameTitles.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {errors.game && <span className={styles.errorText}>{errors.game}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("ui.format.0c6a", "Format *")} <InfoTip id="scrimFormat" /></span></label>
                <div className={styles.formatRow}>
                  {FORMATS.map(f => <button key={f} type="button" className={`${styles.formatBtn} ${form.format === f ? styles.formatBtnActive : ''}`} onClick={() => updateField('format', f)}>
                      {f}
                    </button>)}
                </div>
                {errors.format && <span className={styles.errorText}>{errors.format}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("ui.region.7061", "Region *")} <InfoTip id="scrimRegion" /></span></label>
                <select className={`${styles.input} ${errors.region ? styles.inputError : ''}`} value={form.region} onChange={e => updateField('region', e.target.value)}>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.region && <span className={styles.errorText}>{errors.region}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("ui.scheduled.7ccb", "Scheduled at *")} <InfoTip id="scrimSchedule" /></span></label>
                <DateField value={form.scheduled_at} onChange={e => updateField('scheduled_at', e.target.value)} className={`${styles.input} ${errors.scheduled_at ? styles.inputError : ''}`} withTime />
                {errors.scheduled_at && <span className={styles.errorText}>{errors.scheduled_at}</span>}
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("ui.opponent.optional.6967", "Opponent (optional)")} <InfoTip id="scrimOpponent" /></span></label>
                <input type="text" placeholder={tt("ui.leave.empty.open.scrim.1023", "Leave empty for an open scrim, anyone can accept")} className={styles.input} value={form.opponent} onChange={e => updateField('opponent', e.target.value)} maxLength={60} />
                <span className={styles.hint}>{tt("ui.type.team.name.challenge.359a", "Type a team name to challenge directly. Leave empty to keep it open.")}</span>
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("ui.notes.7044", "Notes")} <InfoTip id="scrimNotes" /></span></label>
                <textarea className={`${styles.input} ${styles.textarea}`} placeholder={tt("ui.map.pool.server.rules.6c7b", "Map pool, server, rules, anything else...")} value={form.notes} onChange={e => updateField('notes', e.target.value)} maxLength={500} />
              </div>
            </div>

            {submitError && <p className={styles.submitError}>{submitError}</p>}

            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={() => router.push('/community?tab=scrims')}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              <button type="submit" className={`${styles.submitBtn} goldBTN`} disabled={submitting}>
                {submitting ? tx("Posting scrim...") : tx("Post scrim")}
              </button>
            </div>
          </form>
        </div>
      </main>

      <BottomMenu />
    </div>;
};
const ScrimCreatePage = () => <Suspense fallback={<div style={{
  minHeight: '100vh',
  background: '#131316'
}} />}>
    <ScrimCreateInner />
  </Suspense>;
export default ScrimCreatePage;