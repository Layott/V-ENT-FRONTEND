'use client';

// Editing a tournament you already created.
//
// CEO, 2 September: "Users should be able to edit everry single thing about a
// tournament they created, cause i did not even see where to edit tournament
// name or banner or image, or game or bracket and all of thst stuff".
//
// There was no screen. `PUT /tournament/edit-tournament/<id>/` existed and was
// tested, and nothing anywhere called it, which from an organiser's side is the
// same as a tournament being uneditable: build it, notice the game is wrong,
// and there is nothing to press. The endpoint also could not change the game
// at all until now, so the only fix was to build the whole thing again.
//
// The endpoint is partial: a field that is not sent is not touched. So this
// page sends only what actually changed. A tournament carries about thirty
// columns and this form shows twenty, and sending the whole form would blank
// the ten it does not know about.

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LuTriangleAlert } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import DateField from '@/components/date-field/DateField';
import useGames from '@/hooks/useGames';
import { mediaUrl } from '@/lib/mediaUrl';
import styles from './edit-tournament.module.css';
import { useT } from '@/i18n/LanguageProvider';

const API = process.env.NEXT_PUBLIC_API_URL;

const TYPES = [
  ['online', 'tEdit.typeOnline', 'Online'],
  ['physical', 'tEdit.typePhysical', 'In person'],
  ['hybrid', 'tEdit.typeHybrid', 'Both'],
];

const VISIBILITY = [
  ['public', 'tEdit.visPublic', 'Anyone can find it'],
  ['private', 'tEdit.visPrivate', 'Only people with the link'],
  ['protected', 'tEdit.visProtected', 'Anyone can find it, entry is approved'],
];

const ACCESS = [
  ['individual', 'tEdit.accessIndividual', 'Players enter on their own'],
  ['team', 'tEdit.accessTeam', 'Teams enter'],
  ['team_and_individual', 'tEdit.accessBoth', 'Either'],
];

const PRIZE_TYPES = [
  ['distributed', 'tEdit.prizeDistributed', 'Split between places'],
  ['winner_takes_all', 'tEdit.prizeWinner', 'Winner takes all'],
  ['no_prize', 'tEdit.prizeNone', 'No prize'],
];

const SCORE_MODES = [
  ['both_players_confirm', 'tEdit.scoreBoth', 'Both players confirm the score'],
  ['organizer_only', 'tEdit.scoreOrganizer', 'Only the organiser sets scores'],
  ['winner_reports', 'tEdit.scoreWinner', 'The winner reports it'],
];

const SOCIALS = [
  ['facebook_link', 'Facebook'], ['twitter_link', 'X'],
  ['instagram_link', 'Instagram'], ['youtube_link', 'YouTube'],
  ['twitch_link', 'Twitch'], ['kick_link', 'Kick'],
  ['tiktok_link', 'TikTok'], ['bigolive_link', 'Bigo Live'],
];

// The stored dates carry a zone; the control wants "YYYY-MM-DDTHH:mm" in local
// time. Slicing the ISO string would shift the tournament by the offset, which
// on a 7pm start is the difference between right and wrong.
const forInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const EditTournamentContent = ({ slug: slugFromPath }) => {
  const tt = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { gameTitles } = useGames();
  const token = session?.user?.sessionToken;
  const ref = slugFromPath || searchParams.get('id');

  const [tournamentId, setTournamentId] = useState(null);
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [formats, setFormats] = useState([]);
  // The organisations this person may run a tournament in the name of. The
  // same short list both wizards and the event console fill their picker from,
  // and empty for most people, who then never see the field.
  const [myOrgs, setMyOrgs] = useState([]);
  const [current, setCurrent] = useState({ logo: '', banner: '' });
  const [logo, setLogo] = useState(null);
  const [banner, setBanner] = useState(null);
  const [rulesDoc, setRulesDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Object URLs, not data URLs: a data URL of a 4MB banner in state is a 5MB
  // string re-rendered on every keystroke elsewhere on the form.
  const [logoPreview, setLogoPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  useEffect(() => {
    if (!logo) { setLogoPreview(''); return undefined; }
    const url = URL.createObjectURL(logo);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);
  useEffect(() => {
    if (!banner) { setBannerPreview(''); return undefined; }
    const url = URL.createObjectURL(banner);
    setBannerPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [banner]);

  const load = useCallback(async () => {
    if (!ref) {
      setLoading(false);
      setError(tt('tEdit.noTournament', 'No tournament named.'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [res, fmt, orgs] = await Promise.all([
        fetch(`${API}/tournament/view-tournament/${ref}/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch(`${API}/tournament/formats/`).catch(() => null),
        token
          ? fetch(`${API}/organization/mine/`, {
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => null)
          : null,
      ]);
      const body = await res.json().catch(() => ({}));
      if (fmt && fmt.ok) {
        const fb = await fmt.json().catch(() => ({}));
        setFormats(fb?.data?.formats || []);
      }
      // A list that will not load leaves the field out and the rest of the
      // form still opens. This is never the reason an edit screen fails.
      if (orgs && orgs.ok) {
        const ob = await orgs.json().catch(() => ({}));
        setMyOrgs(ob?.data?.organizations || []);
      }
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'api.couldNotLoadTournament',
          'That tournament could not be opened.'));
        return;
      }
      const t = body.data?.tournament || body.data;
      setTournamentId(t.tournament_id ?? t.id ?? null);
      setCurrent({
        logo: t.tournament_logo || t.logo || '',
        banner: t.tournament_banner || t.banner || '',
      });
      const shaped = {
        tournament_title: t.tournament_title || t.title || t.name || '',
        tournament_description: t.tournament_description || '',
        tournament_rules: t.tournament_rules || '',
        tournament_game: t.game || '',
        game_mode: t.game_mode || '',
        bracket_type: t.bracket_type || t.format || '',
        tournament_type: t.tournament_type || 'online',
        tournament_visibility: t.tournament_visibility || 'public',
        tournament_access: t.tournament_access || 'individual',
        tournament_location: t.tournament_location || '',
        virtual_link: t.virtual_link || '',
        start_date_and_time: forInput(t.start_date_and_time || t.start_date),
        end_date_and_time: forInput(t.end_date_and_time || t.end_date),
        reg_start_date_and_time: forInput(t.registration_opens_at || t.reg_start_date_and_time),
        reg_end_date_and_time: forInput(t.registration_closes_at || t.reg_end_date_and_time),
        team_size: t.team_size != null ? String(t.team_size) : '',
        player_size: t.player_size != null ? String(t.player_size) : '',
        min_number_of_teams: t.min_number_of_teams != null ? String(t.min_number_of_teams) : '',
        max_number_of_teams: t.max_number_of_teams != null ? String(t.max_number_of_teams) : '',
        entry_fee: t.entry_fee || 'Free',
        entry_fee_price: t.entry_fee_price != null ? String(t.entry_fee_price) : '',
        prize_type: t.prize_type || 'distributed',
        prize_pool_total: t.prize_pool_total != null ? String(t.prize_pool_total) : '',
        prize_currency: t.prize_currency || 'VC',
        approve_registrations: !!t.approve_registrations,
        score_confirmation_mode: t.score_confirmation_mode || 'both_players_confirm',
        // Whose name it runs in. Blank is a real answer and the common one:
        // most tournaments belong to a person rather than an organisation.
        organization: t.organization?.id != null ? String(t.organization.id) : '',
        ...Object.fromEntries(SOCIALS.map(([k]) => [k, t[k] || ''])),
      };
      setOriginal(shaped);
      setForm(shaped);
    } catch (err) {
      console.error('Load tournament error:', err);
      setError(tt('api.networkError', 'Could not reach the server.'));
    } finally {
      setLoading(false);
    }
  }, [ref, token, tt]);

  useEffect(() => {
    if (status === 'loading') return;
    load();
  }, [status, load]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const changed = useMemo(() => {
    if (!form || !original) return [];
    return Object.keys(form).filter((k) => form[k] !== original[k]);
  }, [form, original]);

  const dirty = changed.length > 0 || !!logo || !!banner || !!rulesDoc;

  const save = async () => {
    if (saving || !tournamentId) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      // Only what moved. The endpoint treats absent as unchanged, so sending
      // the whole form would write the ten columns this screen cannot show.
      const hasFiles = !!(logo || banner || rulesDoc);
      let init;
      if (hasFiles) {
        const fd = new FormData();
        changed.forEach((k) => fd.append(k, form[k] === null ? '' : String(form[k])));
        if (logo) fd.append('tournament_logo', logo);
        if (banner) fd.append('tournament_banner', banner);
        if (rulesDoc) fd.append('rules_document', rulesDoc);
        init = { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd };
      } else {
        const payload = {};
        changed.forEach((k) => { payload[k] = form[k]; });
        init = {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        };
      }
      const res = await fetch(`${API}/tournament/edit-tournament/${tournamentId}/`, init);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'api.couldNotSaveTournament',
          'That could not be saved.'));
        return;
      }
      setNotice(tt('tEdit.saved', 'Saved.'));
      setLogo(null);
      setBanner(null);
      setRulesDoc(null);
      // A rename moves the address. Reloading against the old slug would work
      // through SlugHistory, but the bar would keep showing last month's name.
      const movedTo = body.data?.slug;
      if (movedTo && movedTo !== ref) router.replace(`/tournaments/${movedTo}/edit`);
      else await load();
    } catch (err) {
      console.error('Save tournament error:', err);
      setError(tt('api.networkError', 'Could not reach the server.'));
    } finally {
      setSaving(false);
    }
  };

  const hubCards = [
    ['', 'tEdit.hubActions', 'Run it', 'tEdit.hubActionsSub', 'Open check-in, start it, cancel it'],
    ['match-control', 'tEdit.hubMatches', 'Scores and matches', 'tEdit.hubMatchesSub', 'Enter results, correct one, settle a dispute'],
    ['participants', 'tEdit.hubParticipants', 'Who is playing', 'tEdit.hubParticipantsSub', 'Entrants, check-in, remove somebody'],
    ['invitations', 'tEdit.hubInvites', 'Invitations', 'tEdit.hubInvitesSub', 'Ask people in directly'],
    ['brackets', 'tEdit.hubBrackets', 'Bracket', 'tEdit.hubBracketsSub', 'Generate it, seed it, fix a pairing'],
    ['production', 'tEdit.hubProduction', 'Stream and overlays', 'tEdit.hubProductionSub', 'Graphics bound to this tournament'],
    ['reminders', 'tEdit.hubReminders', 'Reminders', 'tEdit.hubRemindersSub', 'What players are told, and when'],
    ['stats', 'tEdit.hubStats', 'Player stats', 'tEdit.hubStatsSub', 'What is counted, and what it is worth'],
  ];

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPane}>
          <div className={styles.headRow}>
            <div>
              <Link href="/tournaments/my-tournaments" className={styles.back}>
                {tt('tEdit.back', '← My tournaments')}
              </Link>
              <h1 className={styles.pageTitle}>{tt('tEdit.title', 'Edit tournament')}</h1>
              <p className={styles.pageSub}>
                {tt('tEdit.sub', 'Change what needs changing. Only what you touch is sent, so nothing else on the tournament moves.')}
              </p>
            </div>
            {ref && <Link href={`/tournaments/${ref}`} className={styles.ghostBtn}>
              {tt('tEdit.view', 'View the public page')}
            </Link>}
          </div>

          {/* Everything else about this tournament, named for what it opens
              rather than for the screen it happens to live on. */}
          {ref && <div className={styles.hub}>
            <p className={styles.hubTitle}>{tt('tEdit.hubTitle', 'Run this tournament')}</p>
            <div className={styles.hubGrid}>
              {hubCards.map(([tab, nameKey, name, subKey, sub]) => (
                <Link key={nameKey}
                      href={`/tournaments/${ref}/manage${tab ? `?tab=${tab}` : ''}`}
                      className={styles.hubCard}>
                  <span className={styles.hubName}>{tt(nameKey, name)}</span>
                  <span className={styles.hubSub}>{tt(subKey, sub)}</span>
                </Link>
              ))}
            </div>
          </div>}

          {loading ? (
            <p className={styles.muted}>{tt('ui.loading.33ce', 'Loading…')}</p>
          ) : !form ? (
            <div className={styles.errorCard}>
              <LuTriangleAlert aria-hidden="true" />
              <p>{error || tt('tEdit.notFound', 'That tournament could not be opened.')}</p>
            </div>
          ) : (
            <div className={styles.form}>
              <p className={styles.sectionHead}>{tt('tEdit.secWhat', 'What it is')}</p>

              <label className={styles.field}>
                <span className={styles.label}>{tt('tEdit.name', 'Name')}</span>
                <input className={styles.input} value={form.tournament_title}
                       onChange={(e) => set('tournament_title', e.target.value)} />
                <span className={styles.hint}>
                  {tt('tEdit.nameHint', 'Renaming changes the address. Every link already shared keeps working.')}
                </span>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{tt('tEdit.game', 'Game')}</span>
                <select className={styles.input} value={form.tournament_game}
                        onChange={(e) => set('tournament_game', e.target.value)}>
                  <option value="">{tt('tEdit.gameNone', 'Not set')}</option>
                  {gameTitles.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <span className={styles.hint}>
                  {tt('tEdit.gameHint', 'Changing the game clears a series chosen under the old one, and any requirement that was about that game.')}
                </span>
              </label>

              {/* Whose name it runs in.
                  CEO, 4 September 2026: "how to add events or tournaments to
                  an organization? i dont see that path". There was none: the
                  column and both endpoints have accepted this the whole time
                  and no screen ever sent it. Hidden entirely for the many
                  people who are in no organisation. */}
              {myOrgs.length > 0 && (
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.org', 'Run by')}</span>
                  <select className={styles.input} value={form.organization}
                          onChange={(e) => set('organization', e.target.value)}>
                    <option value="">{tt('tEdit.orgNone', 'Just me')}</option>
                    {myOrgs.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                  <span className={styles.hint}>
                    {tt('tEdit.orgHint', 'A tournament run by an organisation appears on its page and in the feed of everybody following it.')}
                  </span>
                </label>
              )}

              <label className={styles.field}>
                <span className={styles.label}>{tt('tEdit.mode', 'Mode')}</span>
                <input className={styles.input} value={form.game_mode}
                       placeholder={tt('tEdit.modePlaceholder', 'Squads, 1v1, Ultimate Team...')}
                       onChange={(e) => set('game_mode', e.target.value)} />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{tt('tEdit.description', 'Description')}</span>
                <textarea className={styles.area} rows={4} value={form.tournament_description}
                          onChange={(e) => set('tournament_description', e.target.value)} />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{tt('tEdit.rules', 'Rules')}</span>
                <textarea className={styles.area} rows={5} value={form.tournament_rules}
                          onChange={(e) => set('tournament_rules', e.target.value)} />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{tt('tEdit.rulesDoc', 'Rules document')}</span>
                <input className={styles.file} type="file" accept=".pdf,.doc,.docx"
                       onChange={(e) => setRulesDoc(e.target.files?.[0] || null)} />
                {rulesDoc && <span className={styles.hint}>{rulesDoc.name}</span>}
              </label>

              <p className={styles.sectionHead}>{tt('tEdit.secArt', 'Logo and banner')}</p>
              <div className={styles.artRow}>
                <div className={styles.artBox}>
                  <span className={styles.label}>{tt('tEdit.logo', 'Logo')}</span>
                  {(logoPreview || current.logo) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.artLogo}
                         src={logoPreview || mediaUrl(current.logo)}
                         alt={tt('tEdit.logoAlt', 'The tournament logo')} />
                  )}
                  <input className={styles.file} type="file" accept="image/*"
                         onChange={(e) => setLogo(e.target.files?.[0] || null)} />
                </div>
                <div className={styles.artBox}>
                  <span className={styles.label}>{tt('tEdit.banner', 'Banner')}</span>
                  {(bannerPreview || current.banner) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.artBanner}
                         src={bannerPreview || mediaUrl(current.banner)}
                         alt={tt('tEdit.bannerAlt', 'The tournament banner')} />
                  )}
                  <input className={styles.file} type="file" accept="image/*"
                         onChange={(e) => setBanner(e.target.files?.[0] || null)} />
                </div>
              </div>

              <p className={styles.sectionHead}>{tt('tEdit.secFormat', 'Format and entry')}</p>

              <label className={styles.field}>
                <span className={styles.label}>{tt('tEdit.format', 'Format')}</span>
                <select className={styles.input} value={form.bracket_type}
                        onChange={(e) => set('bracket_type', e.target.value)}>
                  {formats.length === 0 && form.bracket_type
                    && <option value={form.bracket_type}>{form.bracket_type}</option>}
                  {formats.map((f) => (
                    <option key={f.key || f.id} value={f.key || f.id}>
                      {f.label || f.name || f.key}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.pair}>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.access', 'Who enters')}</span>
                  <select className={styles.input} value={form.tournament_access}
                          onChange={(e) => set('tournament_access', e.target.value)}>
                    {ACCESS.map(([v, k, d]) => <option key={v} value={v}>{tt(k, d)}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.visibility', 'Who can see it')}</span>
                  <select className={styles.input} value={form.tournament_visibility}
                          onChange={(e) => set('tournament_visibility', e.target.value)}>
                    {VISIBILITY.map(([v, k, d]) => <option key={v} value={v}>{tt(k, d)}</option>)}
                  </select>
                </label>
              </div>

              <div className={styles.pair}>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.teamSize', 'Players per team')}</span>
                  <input className={styles.input} type="number" min="1" value={form.team_size}
                         onChange={(e) => set('team_size', e.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.playerSize', 'Total places')}</span>
                  <input className={styles.input} type="number" min="1" value={form.player_size}
                         onChange={(e) => set('player_size', e.target.value)} />
                </label>
              </div>

              <div className={styles.pair}>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.minTeams', 'Fewest entrants')}</span>
                  <input className={styles.input} type="number" min="0" value={form.min_number_of_teams}
                         onChange={(e) => set('min_number_of_teams', e.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.maxTeams', 'Most entrants')}</span>
                  <input className={styles.input} type="number" min="0" value={form.max_number_of_teams}
                         onChange={(e) => set('max_number_of_teams', e.target.value)} />
                </label>
              </div>

              <label className={styles.check}>
                <input type="checkbox" checked={form.approve_registrations}
                       onChange={(e) => set('approve_registrations', e.target.checked)} />
                <span>{tt('tEdit.approve', 'I approve each entry myself')}</span>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{tt('tEdit.scoreMode', 'How a score becomes final')}</span>
                <select className={styles.input} value={form.score_confirmation_mode}
                        onChange={(e) => set('score_confirmation_mode', e.target.value)}>
                  {SCORE_MODES.map(([v, k, d]) => <option key={v} value={v}>{tt(k, d)}</option>)}
                </select>
              </label>

              <p className={styles.sectionHead}>{tt('tEdit.secWhen', 'When and where')}</p>

              <div className={styles.pair}>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.start', 'Starts')}</span>
                  <DateField value={form.start_date_and_time} withTime
                             onChange={(v) => set('start_date_and_time', v)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.end', 'Ends')}</span>
                  <DateField value={form.end_date_and_time} withTime
                             onChange={(v) => set('end_date_and_time', v)} />
                </label>
              </div>

              <div className={styles.pair}>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.regOpens', 'Registration opens')}</span>
                  <DateField value={form.reg_start_date_and_time} withTime
                             onChange={(v) => set('reg_start_date_and_time', v)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.regCloses', 'Registration closes')}</span>
                  <DateField value={form.reg_end_date_and_time} withTime
                             onChange={(v) => set('reg_end_date_and_time', v)} />
                </label>
              </div>

              <label className={styles.field}>
                <span className={styles.label}>{tt('tEdit.where', 'Where it happens')}</span>
                <select className={styles.input} value={form.tournament_type}
                        onChange={(e) => set('tournament_type', e.target.value)}>
                  {TYPES.map(([v, k, d]) => <option key={v} value={v}>{tt(k, d)}</option>)}
                </select>
              </label>

              {form.tournament_type !== 'online' && (
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.location', 'Venue')}</span>
                  <input className={styles.input} value={form.tournament_location}
                         onChange={(e) => set('tournament_location', e.target.value)} />
                </label>
              )}

              {form.tournament_type !== 'physical' && (
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.link', 'Link for people joining online')}</span>
                  <input className={styles.input} value={form.virtual_link}
                         onChange={(e) => set('virtual_link', e.target.value)} />
                </label>
              )}

              <p className={styles.sectionHead}>{tt('tEdit.secMoney', 'Money')}</p>

              <div className={styles.pair}>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.entryFee', 'Entry')}</span>
                  <select className={styles.input} value={form.entry_fee}
                          onChange={(e) => set('entry_fee', e.target.value)}>
                    <option value="Free">{tt('tEdit.entryFree', 'Free')}</option>
                    <option value="Paid">{tt('tEdit.entryPaid', 'Paid')}</option>
                  </select>
                </label>
                {form.entry_fee === 'Paid' && (
                  <label className={styles.field}>
                    <span className={styles.label}>{tt('tEdit.entryPrice', 'Entry fee in VENT COINS')}</span>
                    <input className={styles.input} type="number" min="0" value={form.entry_fee_price}
                           onChange={(e) => set('entry_fee_price', e.target.value)} />
                  </label>
                )}
              </div>

              <div className={styles.pair}>
                <label className={styles.field}>
                  <span className={styles.label}>{tt('tEdit.prizeType', 'Prize')}</span>
                  <select className={styles.input} value={form.prize_type}
                          onChange={(e) => set('prize_type', e.target.value)}>
                    {PRIZE_TYPES.map(([v, k, d]) => <option key={v} value={v}>{tt(k, d)}</option>)}
                  </select>
                </label>
                {form.prize_type !== 'no_prize' && (
                  <label className={styles.field}>
                    <span className={styles.label}>{tt('tEdit.prizePool', 'Announced prize pool')}</span>
                    <input className={styles.input} type="number" min="0" value={form.prize_pool_total}
                           onChange={(e) => set('prize_pool_total', e.target.value)} />
                  </label>
                )}
              </div>

              <p className={styles.sectionHead}>{tt('tEdit.secLinks', 'Where people can follow it')}</p>
              <div className={styles.socialGrid}>
                {SOCIALS.map(([key, label]) => (
                  <label key={key} className={styles.field}>
                    <span className={styles.label}>{label}</span>
                    <input className={styles.input} value={form[key]}
                           onChange={(e) => set(key, e.target.value)} />
                  </label>
                ))}
              </div>

              {error && <p className={styles.problem} role="alert">{error}</p>}
              {notice && <p className={styles.notice}>{notice}</p>}

              <div className={styles.actions}>
                <button type="button" className={`${styles.primaryBtn} goldBTN`}
                        onClick={save} disabled={saving || !dirty}>
                  {saving ? tt('ui.saving', 'Saving...') : tt('ui.save', 'Save')}
                </button>
                {dirty && <span className={styles.hint}>
                  {tt('tEdit.pending', '{n} change(s) not saved yet')
                    .replace('{n}', String(changed.length + (logo ? 1 : 0)
                      + (banner ? 1 : 0) + (rulesDoc ? 1 : 0)))}
                </span>}
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

const EditTournamentPage = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <EditTournamentContent />
  </Suspense>
);

export default EditTournamentPage;
