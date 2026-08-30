'use client';

import { apiMessage } from '@/lib/apiMessage';
import InfoTip from '@/components/info-tip/InfoTip';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { COUNTRIES } from '@/constants/countries';
// Formats are no longer a constant. What a match can be played to depends on
// the mode, and the mode depends on the game: a Free Fire battle royale is
// scored on points across N matches and has no "best of", Clash Squad is first
// to N rounds, and Lone Wolf is fixed by the game itself at first to five. The
// catalogue lives in the backend so the form and the endpoint that validates
// it cannot drift apart. See vent_auth/game_modes.py.
//
// The old REGIONS list is gone. It mixed Nigerian zones ('NG-West'), ISO
// country codes ('ZA') and continental shards ('EU-West') in one picker, so it
// could not be compared with anything, including the country already stored on
// the player. Countries come from the one list the rest of the platform uses.
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
  const searchParams = useSearchParams();
  // The same form posts a new challenge and edits an existing one. Two screens
  // for one set of fields is two screens that drift: the modes cascade, the
  // formats depend on the mode, and every one of those rules would have to be
  // written twice and then kept the same by hand.
  const editing = searchParams.get('edit') || '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const [loadingExisting, setLoadingExisting] = useState(!!editing);
  const [loadError, setLoadError] = useState('');
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({
    // Solo by default is wrong for a page reached from a team, and team by
    // default is wrong for the player who has no team. It follows whether the
    // person actually has one, decided once the teams have loaded.
    solo: false,
    team: '',
    game: '',
    mode: '',
    team_size: '',
    format: '',
    map_code: '',
    scheduled_at: '',
    country: 'Nigeria',
    // Who may answer. CEO: "for country should be able to open it to all, or
    // select a group of countries they want also." One country was the only
    // option, which turns everybody else away by default.
    open_to: 'country',
    countries: [],
    opponent: '',
    notes: ''
  });

  // What each game can be played as, from the backend, so the picker and the
  // validation are reading the same catalogue.
  const [catalogue, setCatalogue] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(`${apiUrl}/scrim/games/`)
      .then(r => r.json())
      .then(d => { if (alive && d?.data?.games) setCatalogue(d.data.games); })
      .catch(() => { /* the form still works, it just cannot cascade */ });
    return () => { alive = false; };
  }, [apiUrl]);

  // The modes this game has, and the mode currently picked.
  const gameModes = (catalogue && (catalogue[form.game]
    || Object.keys(catalogue).find(k => k !== '*' && form.game.startsWith(k)) && catalogue[Object.keys(catalogue).find(k => k !== '*' && form.game.startsWith(k))]))
    || (catalogue ? catalogue['*'] : []);
  const currentMode = gameModes.find(m => m.id === form.mode) || null;

  // Sizes this mode supports, narrowed to 1 when the post is solo. A mode with
  // no 1 in its sizes cannot be played alone, which is why Clash Squad
  // disappears from a solo picker rather than being offered and then refused.
  const soloModes = gameModes.filter(m => (m.sizes || []).includes(1));
  const offeredModes = form.solo ? soloModes : gameModes;
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
  // Fill the form from the challenge being edited. It runs once the catalogue
  // has arrived, because the two cascade effects below rewrite `mode` and
  // `format` the moment they see a game they have no catalogue for, and would
  // throw away the values just loaded.
  useEffect(() => {
    if (!editing || !catalogue) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/scrim/${editing}/detail/`, { headers: authHeaders() });
        const body = await res.json();
        const c = body?.data?.scrim;
        if (!alive) return;
        if (!res.ok || !c) {
          setLoadError(apiMessage(tt, body, 'api.challengeNotFound', 'That challenge could not be found.'));
          return;
        }
        if (c.status !== 'open') {
          setLoadError(tt('scrim.editClosed', 'This challenge has been accepted, so its terms cannot be changed.'));
          return;
        }
        setForm(p => ({
          ...p,
          solo: !!c.is_solo,
          team: c.is_solo ? '' : (c.team_a?.id || p.team),
          game: c.game || '',
          mode: c.mode || '',
          team_size: String(c.team_size || (c.is_solo ? 1 : '')),
          format: c.format || '',
          map_code: c.map_code || '',
          scheduled_at: c.scheduled_at ? c.scheduled_at.slice(0, 16) : '',
          country: c.country || p.country,
          open_to: c.open_to || 'country',
          countries: c.countries || [],
          notes: c.notes || '',
          opponent: ''
        }));
      } catch {
        if (alive) setLoadError(tt('msg.couldNotReachServer', 'Could not reach the server. Try again.'));
      } finally {
        if (alive) setLoadingExisting(false);
      }
    })();
    return () => { alive = false; };
  }, [editing, catalogue, apiUrl, session?.user?.sessionToken]);   // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!form.solo && !form.team) e.team = tt('scrim.pickTeam', 'Pick your team');
    if (!form.game) e.game = tt('scrim.pickGame', 'Choose a game');
    if (!form.mode) e.mode = tt('scrim.pickMode', 'Choose how it is played');
    if (!form.format) e.format = tt('scrim.pickFormat', 'Choose a format');
    // Craftland is somebody's own map. Without the code the opponent cannot
    // find it, so it is asked for here rather than left to the notes.
    if (currentMode && (currentMode.asks || []).includes('map_code') && !form.map_code.trim()) {
      e.map_code = tt('scrim.needMapCode', 'Add the map code so they can find it');
    }
    if (!form.scheduled_at) e.scheduled_at = tt('scrim.pickDate', 'Pick a date and time');
    else if (new Date(form.scheduled_at).getTime() < Date.now()) e.scheduled_at = tt('scrim.futureOnly', 'Schedule must be in the future');
    if (form.open_to === 'country' && !form.country) e.country = tt('scrim.pickCountry', 'Choose a country');
    if (form.open_to === 'countries' && form.countries.length === 0) {
      e.countries = tt('scrim.pickCountries', 'Choose at least one country, or open it to everybody');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Picking a game throws away a mode that belonged to the previous one, and
  // picking a mode throws away a format that belonged to the previous mode.
  // Without this a player switches from Clash Squad to Battle Royale and posts
  // a battle royale "first to 5 rounds", which the endpoint then refuses after
  // they have filled the whole form in.
  useEffect(() => {
    if (!catalogue || loadingExisting) return;
    const ids = offeredModes.map(m => m.id);
    if (!ids.includes(form.mode)) {
      setForm(p => ({ ...p, mode: ids[0] || '', format: '', team_size: '' }));
    }
  }, [catalogue, form.game, form.solo]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentMode || loadingExisting) return;
    setForm(p => {
      const next = { ...p };
      if (!currentMode.formats.includes(p.format)) next.format = currentMode.formats[0] || '';
      const sizes = currentMode.sizes || [];
      const wanted = p.solo ? 1 : Number(p.team_size);
      if (!sizes.includes(wanted)) next.team_size = String(p.solo ? 1 : (sizes[sizes.length - 1] || 1));
      return next;
    });
  }, [form.mode, form.solo]);   // eslint-disable-line react-hooks/exhaustive-deps
  const handleSubmit = async ev => {
    ev.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        solo: form.solo,
        // Left out entirely on a solo post: there is no team, and sending an
        // empty one would look like a team that could not be found.
        ...(form.solo ? {} : { team_id: form.team }),
        game: form.game,
        mode: form.mode,
        team_size: Number(form.team_size) || (form.solo ? 1 : undefined),
        format: form.format,
        map_code: form.map_code.trim(),
        country: form.country,
        open_to: form.open_to,
        countries: form.open_to === 'countries' ? form.countries : [],
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        notes: form.notes,
        opponent: form.opponent.trim()
      };
      const res = editing
        ? await fetch(`${apiUrl}/scrim/${editing}/detail/`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify(payload)
          })
        : await fetch(`${apiUrl}/scrim/create/`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(payload)
          });
      const data = await res.json();
      if (data.status === 'success' && data.data?.scrim) {
        // An edit goes straight back to the challenge, because that is where
        // the person came from and what they wanted to look at.
        if (editing) router.push(`/community/challenge/${data.data.scrim.slug}`);
        else setSuccess(data.data.scrim);
      } else {
        setSubmitError(apiMessage(tt, data, "api.couldNotPostThatScrim", "Could not post that challenge."));
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
              <h2 className={styles.successTitle}>{tt("ui.challenge.posted.72ba", "Challenge posted")}</h2>
              <p className={styles.successText}>
                {tt("scrim.liveFor", "Your {format} {game} challenge is now live for {who}.").replace("{format}", form.format).replace("{game}", form.game).replace("{who}", form.open_to === 'anywhere' ? tt("scrim.anybody", "anybody, anywhere") : form.open_to === 'countries' ? form.countries.join(', ') : form.country)}
                {success.challenged ? ` ${success.challenged.name} has been notified.` : tx(" Other teams can accept it.")}
              </p>
              <div className={styles.successActions}>
                <button className={`${styles.successBtn} goldBTN`} onClick={() => router.push(success.slug ? `/community/challenge/${success.slug}` : '/community?tab=challenges')}>
                  {tt("ui.view.challenge.817d", "View the challenge")}
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
          <button className={styles.backLink} onClick={() => router.push(editing ? `/community/challenge/${editing}` : '/community?tab=challenges')}>
            <FiArrowLeft /> {editing ? tt("ui.back.challenge.7c14", "Back to the challenge") : tt("ui.back.challenges.3f01", "Back to challenges")}
          </button>

          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              <FaCrosshairs className={styles.titleIcon} /> {editing ? tt("ui.edit.challenge.9b3d", "Edit your challenge") : tt("ui.post.challenge.6a5a", "Post a challenge")}
            </h1>
            <p className={styles.pageSubtitle}>
              {editing ? tt("ui.edit.challenge.sub.4e21", "Change the terms while nobody has accepted it yet. Once somebody has, these are what they agreed to.") : tt("ui.post.open.scrim.call.b5e4", "Play one against one or team against team. Post it open, or call out a specific opponent.")}
            </p>
          </div>

          {/* An edit that cannot go ahead says so instead of drawing a form
              whose Save will be refused. */}
          {loadError && <p className={styles.submitError}>{loadError}</p>}

          {!loadError && <form className={styles.formCard} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                {/* Who is playing. Most of what is played here is one
                    against one, and requiring a team meant a player had to
                    invent a team of themselves before they could ask for a
                    game. Filled chips, never a ring. */}
                <label className={styles.label}><span className="fieldLabelRow">{tt("scrim.whoIsPlaying", "Who is playing *")}</span></label>
                <div className={styles.formatRow}>
                  <button type="button" className={`${styles.formatBtn} ${form.solo ? styles.formatBtnActive : ''}`} onClick={() => updateField('solo', true)}>
                    {tt("scrim.justMe", "Just me")}
                  </button>
                  <button type="button" className={`${styles.formatBtn} ${!form.solo ? styles.formatBtnActive : ''}`} onClick={() => updateField('solo', false)}>
                    {tt("scrim.myTeam", "My team")}
                  </button>
                </div>
              </div>

              {!form.solo && <div className={styles.field}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("ui.team.e672", "Your team *")} <InfoTip id="scrimTeam" /></span></label>
                <select className={`${styles.input} ${errors.team ? styles.inputError : ''}`} value={form.team} onChange={e => updateField('team', e.target.value)} disabled={teamsLoading}>
                  <option value="">{teamsLoading ? tx("Loading teams...") : tx("Pick your team")}</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}{t.tag ? ` [${t.tag}]` : ''}</option>)}
                </select>
                {errors.team && <span className={styles.errorText}>{errors.team}</span>}
              </div>}

              <div className={styles.field}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("ui.game.d199", "Game *")} <InfoTip id="teamGame" /></span></label>
                <select className={`${styles.input} ${errors.game ? styles.inputError : ''}`} value={form.game} onChange={e => updateField('game', e.target.value)}>
                  <option value="">{tt("ui.choose.game.6fa9", "Choose a game")}</option>
                  {gameTitles.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {errors.game && <span className={styles.errorText}>{errors.game}</span>}
              </div>

              {/* How the game is played. Free Fire alone is four different
                  games depending on this answer, and the format below follows
                  from it rather than being the same three buttons for
                  everything. */}
              {form.game && offeredModes.length > 0 && <div className={styles.field}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("scrim.mode", "Mode *")}</span></label>
                <div className={styles.formatRow}>
                  {offeredModes.map(m => <button key={m.id} type="button" className={`${styles.formatBtn} ${form.mode === m.id ? styles.formatBtnActive : ''}`} onClick={() => updateField('mode', m.id)}>
                      {m.label}
                    </button>)}
                </div>
                {currentMode?.blurb && <span className={styles.modeBlurb}>{currentMode.blurb}</span>}
                {errors.mode && <span className={styles.errorText}>{errors.mode}</span>}
              </div>}

              {/* Craftland is somebody's own map, shared as a code. */}
              {currentMode && (currentMode.asks || []).includes('map_code') && <div className={styles.field}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("scrim.mapCode", "Map code *")}</span></label>
                <input className={`${styles.input} ${errors.map_code ? styles.inputError : ''}`} value={form.map_code} onChange={e => updateField('map_code', e.target.value)} placeholder={tt("scrim.mapCodePlaceholder", "The code people paste into Craftland")} />
                {errors.map_code && <span className={styles.errorText}>{errors.map_code}</span>}
              </div>}

              {/* How many a side, when the mode allows more than one answer. */}
              {form.game && !form.solo && currentMode && (currentMode.sizes || []).length > 1 && <div className={styles.field}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("scrim.teamSize", "How many a side *")}</span></label>
                <div className={styles.formatRow}>
                  {currentMode.sizes.map(n => <button key={n} type="button" className={`${styles.formatBtn} ${String(form.team_size) === String(n) ? styles.formatBtnActive : ''}`} onClick={() => updateField('team_size', String(n))}>
                      {n}v{n}
                    </button>)}
                </div>
              </div>}

              <div className={styles.field}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("ui.format.0c6a", "Format *")} <InfoTip id="scrimFormat" /></span></label>
                {/* Nothing until a game is chosen. Showing the generic
                    ladder first makes the buttons change under the reader the
                    moment they pick a game, and offers Bo3 for a battle
                    royale, which is not a thing. */}
                {form.game && <div className={styles.formatRow}>
                  {(currentMode?.formats || []).map(f => <button key={f} type="button" className={`${styles.formatBtn} ${form.format === f ? styles.formatBtnActive : ''}`} onClick={() => updateField('format', f)}>
                      {f}
                    </button>)}
                </div>}
                {!form.game && <span className={styles.modeBlurb}>{tt("scrim.chooseGameFirst", "Choose a game and a mode, and the formats it can be played to appear here.")}</span>}
                {errors.format && <span className={styles.errorText}>{errors.format}</span>}
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}><span className="fieldLabelRow">{tt("scrim.openTo", "Who can answer *")} <InfoTip id="scrimRegion" /></span></label>
                <div className={styles.formatRow}>
                  {[['country', tt("scrim.openToOne", "One country")], ['countries', tt("scrim.openToSome", "A few countries")], ['anywhere', tt("scrim.openToAll", "Anybody, anywhere")]].map(([id, label]) => <button key={id} type="button" className={`${styles.formatBtn} ${form.open_to === id ? styles.formatBtnActive : ''}`} onClick={() => updateField('open_to', id)}>
                      {label}
                    </button>)}
                </div>

                {form.open_to === 'country' && <>
                  <select className={`${styles.input} ${styles.openToSelect} ${errors.country ? styles.inputError : ''}`} value={form.country} onChange={e => updateField('country', e.target.value)}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.country && <span className={styles.errorText}>{errors.country}</span>}
                </>}

                {form.open_to === 'countries' && <>
                  {/* Checkable fills rather than a multi-select: a native
                      multiple select needs a modifier key nobody on a phone
                      has, and hides what is picked behind a scroll. */}
                  <div className={styles.countryGrid}>
                    {COUNTRIES.map(c => {
                  const on = form.countries.includes(c);
                  return <button key={c} type="button" className={`${styles.countryChip} ${on ? styles.countryChipOn : ''}`} aria-pressed={on} onClick={() => updateField('countries', on ? form.countries.filter(x => x !== c) : [...form.countries, c])}>
                        {c}
                      </button>;
                })}
                  </div>
                  <span className={styles.modeBlurb}>
                    {form.countries.length === 0 ? tt("scrim.noCountriesYet", "Nobody can answer this yet. Pick the countries you will play.") : tt("scrim.countriesPicked", "{n} chosen.").replace("{n}", String(form.countries.length))}
                  </span>
                  {errors.countries && <span className={styles.errorText}>{errors.countries}</span>}
                </>}

                {form.open_to === 'anywhere' && <span className={styles.modeBlurb}>{tt("scrim.openToAllBlurb", "Any player, in any country, can accept this.")}</span>}
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
              <button type="button" className={styles.cancelBtn} onClick={() => router.push(editing ? `/community/challenge/${editing}` : '/community?tab=challenges')}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              <button type="submit" className={`${styles.submitBtn} goldBTN`} disabled={submitting || loadingExisting}>
                {submitting ? (editing ? tt("ui.saving.8c02", "Saving...") : tt("ui.posting.challenge.1f7a", "Posting challenge...")) : editing ? tt("ui.save.changes.5d19", "Save changes") : tt("ui.post.challenge.btn.2a83", "Post challenge")}
              </button>
            </div>
          </form>}
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