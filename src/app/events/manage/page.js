'use client';

// Where an organiser runs the commercial side of an event: the influencers
// selling for them, the promo codes those influencers hand out, and the people
// allowed to help.
//
// All three were API-only until now. The endpoints existed and were tested and
// there was no screen, which from the organiser's side is the same as not
// existing.
//
// Adding a manager is the one control that is not always offered. An event can
// only be shared when it belongs to an organisation, and the listing endpoint
// says whether that is true, so the page can explain why rather than showing a
// control whose save is refused.

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FaTrash, FaPlus } from 'react-icons/fa6';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import DateField from '@/components/date-field/DateField';
import { appLocale } from '@/lib/appLocale';
import styles from './manage-event.module.css';
import { useT } from '@/i18n/LanguageProvider';
import UserChip from '@/components/user-chip/UserChip';
const API = process.env.NEXT_PUBLIC_API_URL;

// The site's language, not the browser's.
const formatDateTime = value => (value
  ? new Date(value).toLocaleString(appLocale(), {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
  : '');
const TABS = ['tickets', 'money', 'numbers', 'messages', 'polls', 'holds',
  'programme', 'queue', 'influencers', 'promos', 'team'];
export const ManageEventContent = ({
  slug: slugFromPath
}) => {
  const tt = useT();
  const searchParams = useSearchParams();
  const {
    data: session
  } = useSession();
  const token = session?.user?.sessionToken;
  const eventRef = slugFromPath || searchParams.get('id');
  // The tab comes from the address, so a link can open the console on the part
  // it is about: /events/<slug>/manage?tab=promos. Without this the eleven tabs
  // were reachable only by pressing them, which is why the whole console was
  // hiding behind a button labelled "Influencers and promo codes".
  const [tab, setTab] = useState(() => {
    const asked = searchParams.get('tab');
    return TABS.includes(asked) ? asked : 'tickets';
  });

  // And written back, built from the route this page is ON rather than a
  // literal. A tab that rewrites the URL from a literal throws away whose page
  // it is: /events/<slug>/manage became /events/manage and the event was lost.
  const openTab = useCallback((next) => {
    setTab(next);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (next === 'tickets') url.searchParams.delete('tab');
    else url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url.toString());
  }, []);
  const [tiers, setTiers] = useState([]);
  const [money, setMoney] = useState(null);
  const [holds, setHolds] = useState([]);
  const [newHold, setNewHold] = useState({ name: '', quantity: '', tier: '', kind: 'guest' });
  const [issuing, setIssuing] = useState(null);
  const [issueNames, setIssueNames] = useState('');
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState({ title: '', starts_at: '', stage: '', capacity: '' });
  const [queue, setQueue] = useState(null);
  const [newTier, setNewTier] = useState({ name: '', price: '', quantity: '', perks: '' });
  const [pricing, setPricing] = useState(null);   // tier id being priced
  // Every rule about how many tickets one address may hold: across the event,
  // per ticket type, and per day. One payload because the three are edited on
  // one screen and stack rather than override.
  // The days the event actually runs, from the server rather than worked out
  // here, so this screen and the creation wizard cannot disagree about how many
  // days an event has.
  const [eventDays, setEventDays] = useState([]);
  // The venue ceiling. A second limit on top of each type's own quantity,
  // which silently wins when it is lower and was shown nowhere on this screen.
  const [capacity, setCapacity] = useState(null);
  const [capacityDraft, setCapacityDraft] = useState('');
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [limits, setLimits] = useState(null);
  // What is typed but not yet saved, keyed the way the API takes it, so
  // pressing Save sends exactly what changed and nothing else.
  const [limitDraft, setLimitDraft] = useState({});
  const [askFields, setAskFields] = useState([]);
  const [newField, setNewField] = useState({ label: '', kind: 'text', required: false, per_ticket: true, options: '' });
  const [editing, setEditing] = useState(null);
  const [referrals, setReferrals] = useState([]);
  // Which link the organiser just copied, so the button can say so. Held here
  // rather than per row because only one can be the most recent.
  const [copiedLink, setCopiedLink] = useState('');
  const [promos, setPromos] = useState([]);
  const [managers, setManagers] = useState([]);
  const [canAddManagers, setCanAddManagers] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [audience, setAudience] = useState(null);
  const [draftMessage, setDraftMessage] = useState({ subject: '', body: '', audience: 'all' });
  const [polls, setPolls] = useState([]);
  // The six kinds a poll can ask, and what each one needs from the form.
  // `needsOptions` is what decides whether the option rows are drawn at all: an
  // option list on a question answered in words is a control that does nothing.
  const POLL_KINDS = [
    { id: 'single', label: tt('manage.pollKindSingle', 'Pick one'),
      hint: tt('manage.pollKindSingleHint', 'One answer from a list.'), needsOptions: true },
    { id: 'multiple', label: tt('manage.pollKindMultiple', 'Pick several'),
      hint: tt('manage.pollKindMultipleHint', 'Any number from a list, or a number you set.'), needsOptions: true },
    { id: 'scale', label: tt('manage.pollKindScale', 'Rate it'),
      hint: tt('manage.pollKindScaleHint', 'A number on a scale, with a word at each end.'), needsOptions: false },
    { id: 'ranking', label: tt('manage.pollKindRanking', 'Put in order'),
      hint: tt('manage.pollKindRankingHint', 'Everything on the list, in the order they choose.'), needsOptions: true },
    { id: 'short_text', label: tt('manage.pollKindShort', 'Short answer'),
      hint: tt('manage.pollKindShortHint', 'A line of text. Only you read the answers.'), needsOptions: false },
    { id: 'long_text', label: tt('manage.pollKindLong', 'Long answer'),
      hint: tt('manage.pollKindLongHint', 'A paragraph. Only you read the answers.'), needsOptions: false },
  ];

  const [draftPoll, setDraftPoll] = useState({
    question: '', kind: 'single', help_text: '',
    options: ['', ''], show_results_before_voting: false,
    min_choices: 0, max_choices: 0,
    scale_min: 1, scale_max: 5, scale_min_label: '', scale_max_label: '',
    // Which earlier question reveals this one, and on which answer.
    depends_on: '', depends_on_option: '', depends_on_max: '',
  });
  // Only a question that can gate another: one answered by picking an option,
  // or one with a scale. There is nothing sensible to branch on in a paragraph
  // somebody typed.
  const gateable = polls.filter(p => ['single', 'multiple', 'ranking', 'scale'].includes(p.kind));
  const gate = gateable.find(p => String(p.id) === String(draftPoll.depends_on));
  const pollKind = POLL_KINDS.find(k => k.id === draftPoll.kind) || POLL_KINDS[0];

  // Tickets handed out rather than sold.
  const [compTier, setCompTier] = useState('');
  const [compEmails, setCompEmails] = useState('');
  const [compNote, setCompNote] = useState('');
  const [compResult, setCompResult] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Set when the event exists and this person may not run it. Kept apart from
  // `error`, which also covers a network failure: one is a refusal and the
  // other is a retry, and the page owes a different sentence for each.
  const [refused, setRefused] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // New-row drafts, one per section.
  const [newReferral, setNewReferral] = useState({
    name: '',
    code: '',
    url: '',
    allocation: ''
  });
  const [newPromo, setNewPromo] = useState({
    code: '',
    kind: 'percent',
    value: '',
    max_tickets: '',
    referral_id: ''
  });
  const [newManager, setNewManager] = useState({
    username: '',
    role: 'manager'
  });
  const call = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API}/event/${eventRef}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? {
          'Content-Type': 'application/json'
        } : {}),
        ...(options.headers || {})
      }
    });
    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }
    return {
      ok: res.ok && body.status === 'success',
      body
    };
  }, [eventRef, token]);
  const load = useCallback(async () => {
    // Returning here without clearing the spinner is how a page hangs on
    // "Loading..." forever: the flag starts true and nothing ever turns it
    // off. Somebody who opened this without an event, or before signing in,
    // is owed a sentence rather than a spinner that never resolves.
    if (!token || !eventRef) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setRefused(false);
    const [r, p, m, ti, mo, ho, se, qu, cf, me, an, au, po, el] = await Promise.all([
      call('/referrals/'), call('/promos/'), call('/managers/'), call('/tiers/'),
      call('/money/'), call('/holds/'), call('/sessions/manage/'), call('/waitlist/all/'),
      call('/checkout-fields/manage/'),
      call('/metrics/'), call('/announcements/'), call('/announcements/audience/'),
      call('/polls/'), call('/email-limits/'),
    ]);
    if (!r.ok && !p.ok && !m.ok) {
      setError(apiMessage(tt, r.body, 'api.couldNotLoadThisEvent', 'Could not load this event.'));
      // A refusal, not a failure. Every panel below is an editing form, and
      // rendering them under a "only the organiser can edit this" line offers
      // somebody controls whose save is already decided - the same fault as a
      // compose box that answers 401 after they have typed.
      setRefused(['NOT_ORGANIZER', 'ONLY_EVENT_ORGANIZER_CAN', 'FORBIDDEN']
        .includes(r.body?.code || p.body?.code || m.body?.code));
      setLoading(false);
      return;
    }
    setTiers(ti.body?.data?.tiers || []);
    setEventDays(ti.body?.data?.days || []);
    const cap = ti.body?.data?.capacity || null;
    setCapacity(cap);
    setCapacityDraft(cap?.capacity != null ? String(cap.capacity) : '');
    setMoney(mo.body?.data || null);
    setHolds(ho.body?.data?.holds || []);
    setSessions(se.body?.data?.sessions || []);
    setQueue(qu.body?.data || null);
    setAskFields(cf.body?.data?.fields || []);
    setReferrals(r.body?.data?.results || []);
    setPromos(p.body?.data?.results || []);
    setManagers(m.body?.data?.results || []);
    setCanAddManagers(!!m.body?.data?.can_add);
    setMetrics(me.body?.data || null);
    setAnnouncements(an.body?.data?.announcements || []);
    setAudience(au.body?.data || null);
    setPolls(po.body?.data?.polls || []);
    setLimits(el.body?.data || null);
    // Cleared on every load so a saved value is read back from the server
    // rather than from what somebody typed. A draft that survives its own save
    // is how a field goes on showing a number the database refused.
    setLimitDraft({});
    setLoading(false);
  }, [call, token, eventRef]);
  useEffect(() => {
    load();
  }, [load]);
  const run = async (fn, successKey, successText) => {
    setBusy(true);
    setNotice('');
    setError('');
    const {
      ok,
      body
    } = await fn();
    setBusy(false);
    if (ok) {
      // The translated string wins, and the server's sentence is only the
      // fallback. It was the other way round, so every success on this page
      // showed English on a French one: the server writes "Link added." in
      // Python and Python cannot be translated. Same rule as the error path,
      // which already goes through apiMessage for exactly this reason.
      setNotice(successKey ? tt(successKey, successText) : (body.message || ''));
      await load();
      return true;
    }
    setError(apiMessage(tt, body, 'api.failed', 'Failed.'));
    return false;
  };

  // ------------------------------------------------------ messages and polls

  // The CSV comes back as a file rather than as JSON, so it is fetched as a
  // blob and handed to a temporary link. A plain href would send the browser
  // without the Bearer token and be refused.
  const downloadSheet = async sheet => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API}/event/${eventRef}/metrics/export/?sheet=${sheet}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(tt('manage.downloadFailed', 'That sheet could not be downloaded.'));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${eventRef}-${sheet}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async () => {
    const done = await run(() => call('/announcements/', {
      method: 'POST',
      body: JSON.stringify(draftMessage),
    }), 'manage.messageSent', 'Sent.');
    if (done) setDraftMessage({ subject: '', body: '', audience: 'all' });
  };

  // Tickets handed out by typing addresses. The response names which were
  // skipped and which could not be emailed, and both are said out loud: an
  // organiser needs to know who is still waiting for a ticket that exists.
  const sendComps = async () => {
    setBusy(true);
    setCompResult('');
    try {
      const res = await fetch(`${API}/event/${eventRef}/comp-tickets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tier_id: compTier,
          emails: compEmails,
          note: compNote,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.status !== 'success') {
        setCompResult(data?.message || tt('manage.compFailed', 'That did not go through.'));
        return;
      }
      const out = data.data || {};
      const parts = [
        tt('manage.compSent', '{n} sent.').replace('{n}', out.issued_count ?? 0),
      ];
      if (out.skipped_already_had_one?.length) {
        parts.push(tt('manage.compSkipped', '{n} already had one.')
          .replace('{n}', out.skipped_already_had_one.length));
      }
      if (out.not_emailed?.length) {
        parts.push(tt('manage.compNotEmailed', '{n} could not be emailed: {who}')
          .replace('{n}', out.not_emailed.length)
          .replace('{who}', out.not_emailed.join(', ')));
      }
      setCompResult(parts.join(' '));
      setCompEmails('');
      await load();
    } catch {
      setCompResult(tt('manage.compFailed', 'That did not go through.'));
    } finally {
      setBusy(false);
    }
  };

  const addPoll = async () => {
    const done = await run(() => call('/polls/', {
      method: 'POST',
      body: JSON.stringify({
        question: draftPoll.question,
        kind: draftPoll.kind,
        help_text: draftPoll.help_text,
        // Only for the kinds that have them. Sending options with a text
        // question would be sending something the server discards.
        options: pollKind.needsOptions ? draftPoll.options.filter(o => o.trim()) : [],
        min_choices: Number(draftPoll.min_choices) || 0,
        max_choices: Number(draftPoll.max_choices) || 0,
        scale_min: Number(draftPoll.scale_min) || 1,
        scale_max: Number(draftPoll.scale_max) || 5,
        scale_min_label: draftPoll.scale_min_label,
        scale_max_label: draftPoll.scale_max_label,
        show_results_before_voting: draftPoll.show_results_before_voting,
        depends_on: draftPoll.depends_on || null,
        depends_on_option: draftPoll.depends_on_option || null,
        depends_on_max: draftPoll.depends_on_max === '' ? null : draftPoll.depends_on_max,
      }),
    }), 'manage.pollAdded', 'Poll added.');
    if (done) setDraftPoll({ question: '', options: ['', ''], show_results_before_voting: false });
  };

  const setPollOpen = (poll, isOpen) => run(() => call(`/polls/${poll.id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ is_open: isOpen }),
  }), 'manage.pollUpdated', 'Poll updated.');

  const removePoll = poll => run(() => call(`/polls/${poll.id}/`, {
    method: 'DELETE',
  }), 'manage.pollRemoved', 'Poll removed.');

  // ------------------------------------------------------------- influencers
  const addReferral = async () => {
    const done = await run(() => call('/referrals/', {
      method: 'POST',
      body: JSON.stringify({
        ...newReferral,
        allocation: Number(newReferral.allocation) || 0
      })
    }), 'manage.linkAdded', 'Link added.');
    if (done) setNewReferral({
      name: '',
      code: '',
      url: '',
      allocation: ''
    });
  };
  // The organiser copies this and sends it to the influencer, so it has to be
  // the whole address rather than the code alone. Falls back to selecting the
  // text where the clipboard is refused, which is any page not on https and
  // any browser where the user has denied it.
  const copyShare = async url => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(url);
      setTimeout(() => setCopiedLink(''), 2000);
    } catch {
      setError(tt('manage.copyFailed', 'Copying was blocked. Select the link and copy it.'));
    }
  };

  const saveReferral = (row, patch) => run(() => call(`/referrals/${row.id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  }), 'manage.saved', 'Saved.');
  const removeReferral = row => run(() => call(`/referrals/${row.id}/`, {
    method: 'DELETE'
  }), 'manage.removed', 'Removed.');

  // ------------------------------------------------------------------ promos
  const addPromo = async () => {
    const done = await run(() => call('/promos/', {
      method: 'POST',
      body: JSON.stringify({
        ...newPromo,
        value: Number(newPromo.value) || 0,
        max_tickets: Number(newPromo.max_tickets) || 0,
        referral_id: newPromo.referral_id || null
      })
    }), 'manage.promoCreated', 'Promo created.');
    if (done) setNewPromo({
      code: '',
      kind: 'percent',
      value: '',
      max_tickets: '',
      referral_id: ''
    });
  };
  const savePromo = (row, patch) => run(() => call(`/promos/${row.id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  }), 'manage.saved', 'Saved.');
  const removePromo = row => run(() => call(`/promos/${row.id}/`, {
    method: 'DELETE'
  }), 'manage.removed', 'Removed.');

  // ------------------------------------------------------------------- team
  const addManager = async () => {
    const done = await run(() => call('/managers/', {
      method: 'POST',
      body: JSON.stringify(newManager)
    }), 'manage.managerAdded', 'Added.');
    if (done) setNewManager({
      username: '',
      role: 'manager'
    });
  };
  const removeManager = row => run(() => call(`/managers/${row.id}/`, {
    method: 'DELETE'
  }), 'manage.removed', 'Removed.');
  // Ticket types on an event that already exists.
  const addTier = () => {
    if (!newTier.name.trim()) return;
    return run(() => call('/tiers/', {
      method: 'POST',
      body: JSON.stringify({
        name: newTier.name.trim(),
        price: newTier.price || 0,
        quantity: newTier.quantity || 0,
        perks: newTier.perks,
      }),
    }), 'manage.tierAdded', 'Ticket type added.')
      .then(() => setNewTier({ name: '', price: '', quantity: '', perks: '' }));
  };

  const saveTier = (row, patch) => run(() => call(`/tiers/${row.id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }), 'manage.tierUpdated', 'Ticket type updated.').then(() => setEditing(null));

  const removeTier = row => run(() => call(`/tiers/${row.id}/delete/`, {
    method: 'DELETE',
  }), 'manage.tierRemoved', 'Ticket type removed.');

  const savePricing = (row, patch) => run(() => call(`/tiers/${row.id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }), 'manage.tierUpdated', 'Ticket type updated.').then(() => setPricing(null));

  // ------------------------------------------------- tickets per email address
  //
  // CEO, 1 September: "if there is several different days or types of ticket,
  // the option to set this for each ticket type and day should be available.
  // for all tickets and days at once also."
  //
  // The three scopes stack: a purchase has to satisfy every one that carries a
  // number. So an empty box means "this scope sets no rule", never "unlimited",
  // and the copy on screen says so in those words.

  // What a box currently shows: the unsaved draft if there is one, otherwise
  // whatever is saved. Kept as a string so an empty box is empty rather than a
  // zero, which the API would refuse and the reader would misread.
  const limitValue = (key, saved) => (
    limitDraft[key] !== undefined ? limitDraft[key]
      : (saved == null ? '' : String(saved)));

  const setLimitField = (key, raw) =>
    setLimitDraft(d => ({ ...d, [key]: raw.replace(/[^0-9]/g, '') }));

  // Only what was touched is sent. A payload carrying every scope would rewrite
  // rules the organiser never opened, and clearing one by not mentioning it is
  // exactly the accident this avoids.
  // The venue ceiling goes through the ordinary event edit endpoint, because
  // capacity is a property of the event and not of its ticketing. One model
  // per thing: a second capacity column owned by this screen is how two
  // numbers start disagreeing.
  const saveCapacity = async () => {
    if (savingCapacity) return;
    setSavingCapacity(true);
    setNotice('');
    setError('');
    const raw = capacityDraft.trim();
    const res = await fetch(`${API}/event/edit-event/${eventRef}/`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      // Empty means "no limit", which is a real setting and not the same as
      // leaving it alone, so it is sent as null rather than skipped.
      body: JSON.stringify({ capacity: raw === '' ? null : Number(raw) }),
    });
    const body = await res.json().catch(() => ({}));
    setSavingCapacity(false);
    if (!res.ok || body.status !== 'success') {
      setError(apiMessage(tt, body, 'api.failed', 'Failed.'));
      return;
    }
    setNotice(tt('manage.capacitySaved', 'Venue capacity saved.'));
    await load();
  };

  const saveLimits = () => {
    const payload = {};
    const tiersPatch = {};
    const daysPatch = {};
    Object.entries(limitDraft).forEach(([key, raw]) => {
      const value = raw === '' ? null : Number(raw);
      if (key === 'event' || key === 'all_tiers' || key === 'all_days') {
        payload[key] = value;
      } else if (key.startsWith('tier:')) {
        tiersPatch[key.slice(5)] = value;
      } else if (key.startsWith('day:')) {
        daysPatch[key.slice(4)] = value;
      }
    });
    if (Object.keys(tiersPatch).length) payload.tiers = tiersPatch;
    if (Object.keys(daysPatch).length) payload.days = daysPatch;
    if (!Object.keys(payload).length) return Promise.resolve();
    return run(() => call('/email-limits/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }), 'manage.limitsSaved', 'Ticket limits saved.');
  };

  const limitsChanged = Object.keys(limitDraft).length > 0;

  // What a buyer is asked for. The organiser decides, because a five-a-side
  // needs a shirt size and a conference needs a dietary requirement, and
  // neither is a column anybody could have guessed.
  //
  // Email is not in this list and cannot be: a ticket with no way to reach the
  // holder is not a ticket.
  const saveFields = next => run(() => call('/checkout-fields/manage/', {
    method: 'PUT',
    body: JSON.stringify({
      fields: next.map(f => ({
        label: f.label,
        kind: f.kind,
        help_text: f.help_text || '',
        required: f.required,
        per_ticket: f.per_ticket,
        options: Array.isArray(f.options) ? f.options
          : String(f.options || '').split(',').map(o => o.trim()).filter(Boolean),
      })),
    }),
  }), 'manage.fieldsSaved', 'Saved.');

  const addField = async () => {
    if (!newField.label.trim()) return;
    const done = await saveFields([...askFields, newField]);
    if (done) setNewField({ label: '', kind: 'text', required: false, per_ticket: true, options: '' });
  };

  const removeField = row => saveFields(askFields.filter(f => f.id !== row.id));

  // ------------------------------------------------------------------ holds
  const addHold = () => {
    if (!newHold.name.trim()) return;
    return run(() => call('/holds/', {
      method: 'POST',
      body: JSON.stringify({
        name: newHold.name.trim(),
        quantity: newHold.quantity || 1,
        kind: newHold.kind,
        tier: newHold.tier || null,
      }),
    }), 'manage.holdAdded', 'Tickets held.')
      .then(() => setNewHold({ name: '', quantity: '', tier: '', kind: 'guest' }));
  };

  const releaseHold = row => run(() => call(`/holds/${row.id}/release/`, {
    method: 'POST', body: JSON.stringify({}),
  }), 'manage.holdReleased', 'Back on sale.');

  const issueHold = row => {
    const names = issueNames.split('\n').map(n => n.trim()).filter(Boolean);
    if (!names.length) return;
    return run(() => call(`/holds/${row.id}/issue/`, {
      method: 'POST', body: JSON.stringify({ names }),
    }), 'manage.holdIssued', 'Tickets issued.')
      .then(() => { setIssuing(null); setIssueNames(''); });
  };

  // -------------------------------------------------------------- programme
  const addSession = () => {
    if (!newSession.title.trim() || !newSession.starts_at) return;
    return run(() => call('/sessions/manage/', {
      method: 'POST',
      body: JSON.stringify({
        title: newSession.title.trim(),
        starts_at: newSession.starts_at,
        stage: newSession.stage,
        capacity: newSession.capacity || 0,
      }),
    }), 'manage.sessionAdded', 'Added to the programme.')
      .then(() => setNewSession({ title: '', starts_at: '', stage: '', capacity: '' }));
  };

  const removeSession = row => run(() => call(`/sessions/${row.id}/`, {
    method: 'DELETE',
  }), 'manage.sessionRemoved', 'Taken off the programme.');

  const tabLabel = key => ({
    tickets: tt('manage.tabTickets', 'Tickets'),
    money: tt('manage.tabMoney', 'Money'),
    holds: tt('manage.tabHolds', 'Holds'),
    programme: tt('manage.tabProgramme', 'Programme'),
    queue: tt('manage.tabQueue', 'Waiting list'),
    influencers: tt('manage.tabInfluencers', 'Influencers'),
    promos: tt('manage.tabPromos', 'Promo codes'),
    team: tt('manage.tabTeam', 'Team'),
    numbers: tt('manage.tabNumbers', 'Sales and attendance'),
    messages: tt('manage.tabMessages', 'Messages'),
    polls: tt('manage.tabPolls', 'Polls')
  })[key];
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPane}>
          <Link href={`/events/${eventRef}`} className={styles.backLink}>
            {tt('manage.backToEvent', '← Back to the event')}
          </Link>
          <div className={styles.rowBetween}>
            <h1 className={styles.pageTitle}>{tt('manage.title', 'Run this event')}</h1>
            <Link href={`/events/scan?event=${eventRef}&gate=Main`} className={styles.primaryBtn}>
              {tt('manage.openDoor', 'Open the door scanner')}
            </Link>
          </div>
          <p className={styles.pageSub}>
            {tt('manage.sub', 'What you sell, the people selling it for you, the codes they hand out, and who else can help.')}
          </p>

          <div className={styles.tabRow}>
            {TABS.map(key => <button key={key} type="button" className={`${styles.tab} ${tab === key ? styles.tabOn : ''}`} onClick={() => openTab(key)}>
                {tabLabel(key)}
              </button>)}
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {notice && <p className={styles.notice}>{notice}</p>}
          {refused ? <p className={styles.muted}>
              {tt('manage.refusedHint', 'Only the person running this event can open its workspace. The event page itself is open to everybody.')}
              {' '}
              <Link href={`/events/${eventRef}`} className={styles.link}>
                {tt('manage.backToEvent', '← Back to the event')}
              </Link>
            </p>
            : loading ? <p className={styles.muted}>{tt('ui.loading', 'Loading…')}</p>
            : !eventRef ? <p className={styles.muted}>
                {tt('manage.pickEvent', 'Open this from the event you want to manage.')}
                {' '}
                <Link href="/events/my-events" className={styles.link}>
                  {tt('manage.myEvents', 'My events')}
                </Link>
              </p>
            : !token ? <p className={styles.muted}>
                {tt('manage.signIn', 'Sign in to manage an event you run.')}
                {' '}
                <Link href="/login" className={styles.link}>
                  {tt('ui.login.7b3c', 'Log in')}
                </Link>
              </p>
            : <>
              {/* ---------------------------------------------------- tickets */}
              {tab === 'tickets' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.tierHint', 'What people can buy. Add a type at any time, correct a price, or open more when one sells out. How many are sold is counted from the tickets themselves and cannot be typed.')}
                  </p>

                  {capacity && <div className={capacity.over_capacity
                      ? styles.capacityWarn : styles.capacityBox}>
                    <p className={styles.capacityTitle}>
                      {tt('manage.capacityTitle', 'How many the venue will take')}
                    </p>
                    <p className={styles.cardHint}>
                      {tt('manage.capacityHint', 'This is a second limit on top of each ticket type. Whichever is smaller is what somebody can actually buy, so a type set to 5000 sells nothing once the venue is full.')}
                    </p>
                    <div className={styles.capacityRow}>
                      <label className={styles.capacityField}>
                        <span className={styles.label}>{tt('manage.capacityField', 'Venue capacity')}</span>
                        <input className={styles.input} type="number" min="0"
                               value={capacityDraft}
                               placeholder={tt('manage.capacityNone', 'No limit')}
                               onChange={e => setCapacityDraft(e.target.value)} />
                      </label>
                      <button type="button" className={`${styles.primaryBtn} goldBTN`}
                              disabled={savingCapacity}
                              onClick={saveCapacity}>
                        {savingCapacity ? tt('ui.saving', 'Saving...') : tt('ui.save', 'Save')}
                      </button>
                    </div>
                    <p className={styles.capacityLine}>
                      {tt('manage.capacityState', '{sold} sold, {held} held, {room} left')
                        .replace('{sold}', String(capacity.sold ?? 0))
                        .replace('{held}', String(capacity.held ?? 0))
                        .replace('{room}', capacity.room == null
                          ? tt('manage.capacityNoLimit', 'no limit')
                          : String(capacity.room))}
                    </p>
                    {capacity.over_capacity && <p className={styles.capacityAlert}>
                      {tt('manage.capacityOver', 'Your ticket types offer {offered} tickets but the venue is set to {cap}. Buyers are refused once {cap} are gone, whatever the types say.')
                        .replace('{offered}', String(capacity.offered_by_tiers))
                        .replaceAll('{cap}', String(capacity.capacity))}
                    </p>}
                  </div>}

                  {tiers.length === 0 ? <p className={styles.muted}>
                      {tt('manage.noTiers', 'No ticket types yet, so nobody can buy anything for this event.')}
                    </p> : <div className={styles.rows}>
                      {tiers.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.name}</strong>
                            <span className={styles.code}>
                              {row.price_vc > 0
                                ? `${row.price_vc} VC`
                                : tt('manage.tierFree', 'Free')}
                            </span>
                            <span className={styles.muted}>
                              {tt('manage.tierSold', '{sold} of {total} sold')
                                .replace('{sold}', row.sold)
                                .replace('{total}', row.quantity || '-')}
                            </span>
                            {/* When it admits, and a plain warning when a type
                                named for a day carries no date. The buyer's
                                card showed nothing at all for those, so the
                                organiser had no way to know it was wrong. */}
                            <span className={styles.muted}>
                              {row.day
                                ? `${row.day}${row.day_label ? ` · ${row.day_label}` : ''}`
                                : eventDays.length > 1
                                  ? tt('manage.tierAllDays', 'All days')
                                  : ''}
                            </span>
                            {!row.day && eventDays.length > 1
                              && /\b(day|jour|dia)\s*\d/i.test(row.name)
                              && <span className={styles.warnBadge}>
                                {tt('manage.tierNoDate', 'No date set')}
                              </span>}
                            {row.sold_out && <span className={styles.offBadge}>
                              {tt('manage.tierSoldOut', 'Sold out')}
                            </span>}
                          </div>

                          {pricing === row.id ? <div className={styles.editRow}>
                              <input className={styles.input} type="number" min="0"
                                     defaultValue={row.early_bird_quantity || ''}
                                     placeholder={tt('manage.earlyQuantity', 'Early bird: first how many')}
                                     onChange={e => { row._ebq = e.target.value; }} />
                              <input className={styles.input} type="number" min="0"
                                     defaultValue={row.early_bird_price ?? ''}
                                     placeholder={tt('manage.earlyPrice', 'Price after that')}
                                     onChange={e => { row._ebp = e.target.value; }} />
                              <input className={styles.input} type="number" min="0"
                                     defaultValue={row.group_min || ''}
                                     placeholder={tt('manage.groupMin', 'Group: from how many')}
                                     onChange={e => { row._gm = e.target.value; }} />
                              <input className={styles.input} type="number" min="0"
                                     defaultValue={row.group_price ?? ''}
                                     placeholder={tt('manage.groupPrice', 'Price each')}
                                     onChange={e => { row._gp = e.target.value; }} />
                              <input className={styles.input}
                                     defaultValue={row.access_code || ''}
                                     placeholder={tt('manage.accessCode', 'Access code, to hide it')}
                                     onChange={e => { row._ac = e.target.value; }} />
                              <button type="button" className={styles.primaryBtn} disabled={busy}
                                      onClick={() => savePricing(row, {
                                        ...(row._ebq !== undefined ? { early_bird_quantity: row._ebq } : {}),
                                        ...(row._ebp !== undefined ? { early_bird_price: row._ebp } : {}),
                                        ...(row._gm !== undefined ? { group_min: row._gm } : {}),
                                        ...(row._gp !== undefined ? { group_price: row._gp } : {}),
                                        ...(row._ac !== undefined ? { access_code: row._ac } : {}),
                                      })}>
                                {tt('manage.save', 'Save')}
                              </button>
                              <button type="button" className={styles.ghostBtn}
                                      onClick={() => setPricing(null)}>
                                {tt('ui.cancel.77df', 'Cancel')}
                              </button>
                            </div> : editing === row.id ? <div className={styles.editRow}>
                              <input className={styles.input} type="number" min="0"
                                     defaultValue={row.price_ngn}
                                     placeholder={tt('manage.tierPriceNgn', 'Price in naira')}
                                     onChange={e => { row._price = e.target.value; }} />
                              <input className={styles.input} type="number" min={row.sold}
                                     defaultValue={row.quantity}
                                     placeholder={tt('manage.tierQuantity', 'How many')}
                                     onChange={e => { row._quantity = e.target.value; }} />
                              {/* Which day it admits on. The wizard could set
                                  this and nothing could ever correct it, which
                                  is how a type called "Day 2" ended up with no
                                  date and told the buyer nothing. */}
                              {eventDays.length > 1 && <select className={styles.input}
                                      defaultValue={row.day || ''}
                                      onChange={e => { row._day = e.target.value; }}>
                                <option value="">
                                  {tt('manage.tierAllDaysOption', 'All days (full pass)')}
                                </option>
                                {eventDays.map(d => <option key={d.day} value={d.day}>
                                  {tt('createEvent.dayN', 'Day {n}').replace('{n}', d.n)}
                                  {' · '}{d.day}
                                </option>)}
                              </select>}
                              <button type="button" className={styles.primaryBtn} disabled={busy}
                                      onClick={() => saveTier(row, {
                                        ...(row._price !== undefined ? { price: row._price } : {}),
                                        ...(row._quantity !== undefined ? { quantity: row._quantity } : {}),
                                        // The label follows the day rather than
                                        // being typed separately, so a type
                                        // cannot end up reading "Day 2" while
                                        // admitting on day one.
                                        ...(row._day !== undefined ? {
                                          day: row._day || null,
                                          day_label: row._day
                                            ? tt('createEvent.dayN', 'Day {n}').replace(
                                              '{n}',
                                              eventDays.find(d => d.day === row._day)?.n || '')
                                            : '',
                                        } : {}),
                                      })}>
                                {tt('manage.save', 'Save')}
                              </button>
                              <button type="button" className={styles.ghostBtn}
                                      onClick={() => setEditing(null)}>
                                {tt('ui.cancel.77df', 'Cancel')}
                              </button>
                            </div> : <div className={styles.rowActions}>
                              <button type="button" className={styles.ghostBtn} disabled={busy}
                                      onClick={() => setEditing(row.id)}>
                                {tt('manage.tierEdit', 'Change price or how many')}
                              </button>
                              <button type="button" className={styles.ghostBtn} disabled={busy}
                                      onClick={() => setPricing(row.id)}>
                                {tt('manage.tierPricing', 'Early bird, groups, access code')}
                              </button>
                              {row.sold === 0 && <button type="button" className={styles.ghostBtn}
                                      disabled={busy} onClick={() => removeTier(row)}>
                                {tt('manage.tierRemove', 'Remove')}
                              </button>}
                            </div>}
                        </div>)}
                    </div>}

                  {/* How many tickets one email address may hold.
                      Three scopes, and they stack: a purchase has to satisfy
                      every rule that carries a number. */}
                  <h3 className={styles.subTitle}>
                    {tt('manage.limitsTitle', 'Tickets per email address')}
                  </h3>
                  <p className={styles.cardHint}>
                    {tt('manage.limitsHint', 'Leave a box empty and that rule is off. Rules add up rather than replace each other: set one VIP each and four per day and both are checked, so somebody who already holds a VIP is refused a second whatever the day allows. Counted against what an address already holds, so retyping it after a refresh does not get round it.')}
                  </p>

                  <div className={styles.limitRows}>
                    <label className={styles.limitRow}>
                      <span className={styles.limitName}>
                        {tt('manage.limitEvent', 'Across the whole event')}
                        <span className={styles.limitNote}>
                          {tt('manage.limitEventNote', 'All tickets and all days at once.')}
                        </span>
                      </span>
                      <input className={styles.limitInput} type="number" min="1" max="999"
                             inputMode="numeric"
                             placeholder={tt('manage.limitNone', 'No limit')}
                             value={limitValue('event', limits?.event)}
                             onChange={e => setLimitField('event', e.target.value)} />
                    </label>

                    {(limits?.tiers?.length || 0) > 1 && <label className={styles.limitRow}>
                      <span className={styles.limitName}>
                        {tt('manage.limitAllTiers', 'Every ticket type')}
                        <span className={styles.limitNote}>
                          {tt('manage.limitAllTiersNote', 'Sets the same number on each type below, so it does not have to be typed once per type.')}
                        </span>
                      </span>
                      <input className={styles.limitInput} type="number" min="1" max="999"
                             inputMode="numeric"
                             placeholder={tt('manage.limitLeave', 'Leave alone')}
                             value={limitValue('all_tiers', null)}
                             onChange={e => setLimitField('all_tiers', e.target.value)} />
                    </label>}

                    {limits?.has_days && (limits?.days?.length || 0) > 1
                      && <label className={styles.limitRow}>
                      <span className={styles.limitName}>
                        {tt('manage.limitAllDays', 'Every day')}
                        <span className={styles.limitNote}>
                          {tt('manage.limitAllDaysNote', 'Sets the same number on each day below.')}
                        </span>
                      </span>
                      <input className={styles.limitInput} type="number" min="1" max="999"
                             inputMode="numeric"
                             placeholder={tt('manage.limitLeave', 'Leave alone')}
                             value={limitValue('all_days', null)}
                             onChange={e => setLimitField('all_days', e.target.value)} />
                    </label>}
                  </div>

                  {(limits?.tiers?.length || 0) > 0 && <>
                    <p className={styles.limitGroup}>
                      {tt('manage.limitPerType', 'Per ticket type')}
                    </p>
                    <div className={styles.limitRows}>
                      {limits.tiers.map(row => <label key={row.id} className={styles.limitRow}>
                        <span className={styles.limitName}>
                          {row.name}
                          {row.day && <span className={styles.limitNote}>
                            {row.day_label || row.day}
                          </span>}
                        </span>
                        <input className={styles.limitInput} type="number" min="1" max="999"
                               inputMode="numeric"
                               placeholder={tt('manage.limitNoneOwn', 'No rule of its own')}
                               value={limitValue(`tier:${row.id}`, row.max_tickets_per_email)}
                               onChange={e => setLimitField(`tier:${row.id}`, e.target.value)} />
                      </label>)}
                    </div>
                  </>}

                  {limits?.has_days && <>
                    <p className={styles.limitGroup}>
                      {tt('manage.limitPerDay', 'Per day')}
                    </p>
                    <p className={styles.cardHint}>
                      {tt('manage.limitPerDayHint', 'Counted across every type admitting on that day, so somebody holding a Standard and a VIP for Saturday holds two tickets for Saturday.')}
                    </p>
                    <div className={styles.limitRows}>
                      {limits.days.map(row => <label key={row.day} className={styles.limitRow}>
                        <span className={styles.limitName}>
                          {row.label || row.day}
                          {row.label && <span className={styles.limitNote}>{row.day}</span>}
                        </span>
                        <input className={styles.limitInput} type="number" min="1" max="999"
                               inputMode="numeric"
                               placeholder={tt('manage.limitNoneOwn', 'No rule of its own')}
                               value={limitValue(`day:${row.day}`, row.max_tickets_per_email)}
                               onChange={e => setLimitField(`day:${row.day}`, e.target.value)} />
                      </label>)}
                    </div>
                  </>}

                  <div className={styles.limitActions}>
                    <button type="button" className={styles.primaryBtn}
                            disabled={busy || !limitsChanged} onClick={saveLimits}>
                      {tt('manage.limitsSave', 'Save ticket limits')}
                    </button>
                    {limitsChanged && <button type="button" className={styles.ghostBtn}
                            onClick={() => setLimitDraft({})}>
                      {tt('ui.cancel.77df', 'Cancel')}
                    </button>}
                  </div>

                  {/* What a buyer is asked for at checkout. */}
                  <h3 className={styles.subTitle}>
                    {tt('manage.askTitle', 'What buyers are asked for')}
                  </h3>
                  <p className={styles.cardHint}>
                    {tt('manage.askHint', 'An email address is always collected and cannot be turned off, because a ticket with no way to reach the holder is not a ticket. Anything else is up to you: a shirt size, a dietary requirement, which day they are coming.')}
                  </p>

                  {askFields.length === 0 ? <p className={styles.muted}>
                      {tt('manage.noFields', 'Just an email address. Buyers can check out in one step.')}
                    </p> : <div className={styles.rows}>
                      {askFields.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.label}</strong>
                            <span className={styles.code}>{row.kind}</span>
                            {row.required && <span className={styles.muted}>
                              {tt('manage.fieldRequired', 'required')}
                            </span>}
                            {!row.per_ticket && <span className={styles.muted}>
                              {tt('manage.fieldPerOrder', 'once per order')}
                            </span>}
                          </div>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.ghostBtn} disabled={busy}
                                    onClick={() => removeField(row)}>
                              {tt('manage.fieldRemove', 'Remove')}
                            </button>
                          </div>
                        </div>)}
                    </div>}

                  <div className={styles.newRow}>
                    <input className={styles.input} value={newField.label}
                           placeholder={tt('manage.fieldLabel', 'What to ask, e.g. Shirt size')}
                           onChange={e => setNewField(v => ({ ...v, label: e.target.value }))} />
                    <select className={styles.input} value={newField.kind}
                            onChange={e => setNewField(v => ({ ...v, kind: e.target.value }))}>
                      <option value="text">{tt('manage.kindText', 'Text')}</option>
                      <option value="phone">{tt('manage.kindPhone', 'Phone number')}</option>
                      <option value="number">{tt('manage.kindNumber', 'A number')}</option>
                      <option value="choice">{tt('manage.kindChoice', 'One of a list')}</option>
                      <option value="checkbox">{tt('manage.kindCheckbox', 'A yes or no')}</option>
                    </select>
                    {newField.kind === 'choice' && <input className={styles.input}
                           value={newField.options}
                           placeholder={tt('manage.fieldOptions', 'The options, separated by commas')}
                           onChange={e => setNewField(v => ({ ...v, options: e.target.value }))} />}
                    <label className={styles.checkInline}>
                      <input type="checkbox" checked={newField.required}
                             onChange={e => setNewField(v => ({ ...v, required: e.target.checked }))} />
                      <span>{tt('manage.fieldRequiredLabel', 'Must be answered')}</span>
                    </label>
                    <label className={styles.checkInline}>
                      <input type="checkbox" checked={!newField.per_ticket}
                             onChange={e => setNewField(v => ({ ...v, per_ticket: !e.target.checked }))} />
                      <span>{tt('manage.fieldOnceLabel', 'Ask once per order')}</span>
                    </label>
                    <button type="button" className={styles.primaryBtn}
                            disabled={busy || !newField.label.trim()} onClick={addField}>
                      {tt('manage.addField', 'Add the question')}
                    </button>
                  </div>

                  <h3 className={styles.subTitle}>
                    {tt('manage.addTierTitle', 'Add a ticket type')}
                  </h3>
                  <div className={styles.newRow}>
                    <input className={styles.input} value={newTier.name}
                           placeholder={tt('manage.tierName', 'Name, e.g. VIP')}
                           onChange={e => setNewTier(v => ({ ...v, name: e.target.value }))} />
                    <input className={styles.input} type="number" min="0" value={newTier.price}
                           placeholder={tt('manage.tierPriceNgn', 'Price in naira')}
                           onChange={e => setNewTier(v => ({ ...v, price: e.target.value }))} />
                    <input className={styles.input} type="number" min="0" value={newTier.quantity}
                           placeholder={tt('manage.tierQuantity', 'How many')}
                           onChange={e => setNewTier(v => ({ ...v, quantity: e.target.value }))} />
                    <input className={styles.input} value={newTier.perks}
                           placeholder={tt('manage.tierPerks', 'What it includes, separated by commas')}
                           onChange={e => setNewTier(v => ({ ...v, perks: e.target.value }))} />
                    <button type="button" className={styles.primaryBtn}
                            disabled={busy || !newTier.name.trim()} onClick={addTier}>
                      {tt('manage.addTier', 'Add ticket type')}
                    </button>
                  </div>
                </section>}

              {/* ------------------------------------------------------ money */}
              {tab === 'money' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.moneyHint', 'Counted from the tickets themselves, so it reconciles: what is owed is what was taken less what went back.')}
                  </p>
                  {!money ? <p className={styles.muted}>{tt('ui.loading', 'Loading…')}</p> : <>
                    <div className={styles.rows}>
                      <div className={styles.row}>
                        <div className={styles.rowMain}>
                          <strong className={styles.rowName}>{tt('manage.moneyTaken', 'Taken')}</strong>
                          <span className={styles.muted}>
                            {tt('manage.moneyTickets', '{n} tickets').replace('{n}', money.taken.count)}
                          </span>
                        </div>
                        <span className={styles.code}>{money.taken.vc} VC</span>
                      </div>
                      <div className={styles.row}>
                        <div className={styles.rowMain}>
                          <strong className={styles.rowName}>{tt('manage.moneyReturned', 'Refunded or cancelled')}</strong>
                          <span className={styles.muted}>
                            {tt('manage.moneyTickets', '{n} tickets').replace('{n}', money.returned.count)}
                          </span>
                        </div>
                        <span className={styles.code}>{money.returned.vc} VC</span>
                      </div>
                      <div className={styles.row}>
                        <div className={styles.rowMain}>
                          <strong className={styles.rowName}>{tt('manage.moneyOwed', 'Owed to you')}</strong>
                        </div>
                        <span className={styles.code}>{money.owed.vc} VC</span>
                      </div>
                      <div className={styles.row}>
                        <div className={styles.rowMain}>
                          <strong className={styles.rowName}>{tt('manage.moneyDoor', 'Checked in')}</strong>
                          <span className={styles.muted}>
                            {tt('manage.moneyFree', '{n} of them free').replace('{n}', money.free_tickets)}
                          </span>
                        </div>
                        <span className={styles.code}>{money.checked_in}</span>
                      </div>
                    </div>

                    <h3 className={styles.subTitle}>{tt('manage.moneyByType', 'By ticket type')}</h3>
                    <div className={styles.rows}>
                      {money.by_tier.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.name}</strong>
                            <span className={styles.muted}>
                              {tt('manage.moneyTickets', '{n} tickets').replace('{n}', row.count)}
                            </span>
                          </div>
                          <span className={styles.code}>{row.vc} VC</span>
                        </div>)}
                    </div>
                  </>}
                </section>}

              {/* ------------------------------------------------------ holds */}
              {tab === 'holds' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.holdHint', 'Tickets taken off sale without being sold: the guest list, press, the venue. Release them back, or issue them to named people as free tickets. This is what to use instead of buying your own tickets, which would put them in your sales figures.')}
                  </p>

                  {holds.length === 0 ? <p className={styles.muted}>
                      {tt('manage.noHolds', 'Nothing held back.')}
                    </p> : <div className={styles.rows}>
                      {holds.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.name}</strong>
                            <span className={styles.code}>
                              {tt('manage.holdCount', '{held} held, {issued} issued')
                                .replace('{held}', row.outstanding)
                                .replace('{issued}', row.issued)}
                            </span>
                            {row.tier_name && <span className={styles.muted}>{row.tier_name}</span>}
                            {row.released && <span className={styles.offBadge}>{tt('manage.holdReleasedBadge', 'Released')}</span>}
                          </div>

                          {issuing === row.id ? <div className={styles.editRow}>
                              <textarea className={styles.input} rows={3} value={issueNames}
                                        placeholder={tt('manage.holdNames', 'One name per line')}
                                        onChange={e => setIssueNames(e.target.value)} />
                              <button type="button" className={styles.primaryBtn} disabled={busy}
                                      onClick={() => issueHold(row)}>
                                {tt('manage.holdIssue', 'Issue')}
                              </button>
                              <button type="button" className={styles.ghostBtn}
                                      onClick={() => { setIssuing(null); setIssueNames(''); }}>
                                {tt('ui.cancel.77df', 'Cancel')}
                              </button>
                            </div> : !row.released && <div className={styles.rowActions}>
                              <button type="button" className={styles.ghostBtn} disabled={busy}
                                      onClick={() => setIssuing(row.id)}>
                                {tt('manage.holdIssue', 'Issue')}
                              </button>
                              <button type="button" className={styles.ghostBtn} disabled={busy}
                                      onClick={() => releaseHold(row)}>
                                {tt('manage.holdRelease', 'Back on sale')}
                              </button>
                            </div>}
                        </div>)}
                    </div>}

                  <div className={styles.newRow}>
                    <input className={styles.input} value={newHold.name}
                           placeholder={tt('manage.holdName', 'Who for, e.g. Guest list')}
                           onChange={e => setNewHold(v => ({ ...v, name: e.target.value }))} />
                    <input className={styles.input} type="number" min="1" value={newHold.quantity}
                           placeholder={tt('manage.holdQuantity', 'How many')}
                           onChange={e => setNewHold(v => ({ ...v, quantity: e.target.value }))} />
                    <select className={styles.input} value={newHold.tier}
                            onChange={e => setNewHold(v => ({ ...v, tier: e.target.value }))}>
                      <option value="">{tt('manage.holdAnyType', 'Against the whole event')}</option>
                      {tiers.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                    <button type="button" className={styles.primaryBtn}
                            disabled={busy || !newHold.name.trim()} onClick={addHold}>
                      {tt('manage.addHold', 'Hold tickets')}
                    </button>
                  </div>
                </section>}

              {/* -------------------------------------------------- programme */}
              {tab === 'programme' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.programmeHint', 'What is happening, when, and where in the venue. A session can carry its own capacity, for a room that holds fewer people than the event does. Nothing is shown publicly until you add something here.')}
                  </p>

                  {sessions.length === 0 ? <p className={styles.muted}>
                      {tt('manage.noSessions', 'Nothing on the programme yet, so the schedule is not shown on the event page.')}
                    </p> : <div className={styles.rows}>
                      {sessions.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.title}</strong>
                            <span className={styles.code}>{formatDateTime(row.starts_at)}</span>
                            {row.stage && <span className={styles.muted}>{row.stage}</span>}
                            {row.capacity && <span className={styles.muted}>
                              {tt('manage.sessionCap', 'holds {n}').replace('{n}', row.capacity)}
                            </span>}
                          </div>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.ghostBtn} disabled={busy}
                                    onClick={() => removeSession(row)}>
                              {tt('manage.sessionRemove', 'Remove')}
                            </button>
                          </div>
                        </div>)}
                    </div>}

                  <div className={styles.newRow}>
                    <input className={styles.input} value={newSession.title}
                           placeholder={tt('manage.sessionTitle', 'What is happening')}
                           onChange={e => setNewSession(v => ({ ...v, title: e.target.value }))} />
                    <DateField withTime className={styles.input} name="session_start"
                               value={newSession.starts_at}
                               onChange={e => setNewSession(v => ({ ...v, starts_at: e.target.value }))} />
                    <input className={styles.input} value={newSession.stage}
                           placeholder={tt('manage.sessionStage', 'Where, e.g. Main Hall')}
                           onChange={e => setNewSession(v => ({ ...v, stage: e.target.value }))} />
                    <input className={styles.input} type="number" min="0" value={newSession.capacity}
                           placeholder={tt('manage.sessionCapacity', 'Room capacity')}
                           onChange={e => setNewSession(v => ({ ...v, capacity: e.target.value }))} />
                    <button type="button" className={styles.primaryBtn}
                            disabled={busy || !newSession.title.trim() || !newSession.starts_at}
                            onClick={addSession}>
                      {tt('manage.addSession', 'Add to the programme')}
                    </button>
                  </div>
                </section>}

              {/* ------------------------------------------------------ queue */}
              {tab === 'queue' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.queueHint', 'Who is waiting for a ticket to come back. When one does, the first person in the queue is offered it at the price it was always sold at, and has half a day to take it before it passes on.')}
                  </p>

                  {!queue ? <p className={styles.muted}>{tt('ui.loading', 'Loading…')}</p>
                    : queue.waitlist.length === 0 ? <p className={styles.muted}>
                        {tt('manage.noQueue', 'Nobody is waiting.')}
                      </p> : <div className={styles.rows}>
                      {queue.waitlist.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>#{row.position} {row.user}</strong>
                            {row.status === 'offered' && <span className={styles.code}>
                              {tt('manage.queueOffered', 'Offered, expires {when}')
                                .replace('{when}', formatDateTime(row.offer_expires_at))}
                            </span>}
                          </div>
                        </div>)}
                    </div>}
                </section>}

              {/* ------------------------------------------- sales and attendance */}
              {tab === 'numbers' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.numbersHint', 'What sold, who turned up, and what is left. Refunded tickets are counted on their own, because a refund is not a sale that happened.')}
                  </p>

                  {!metrics ? <p className={styles.muted}>{tt('ui.loading', 'Loading...')}</p>
                    : <>
                      <div className={styles.figureGrid}>
                        <div className={styles.figure}>
                          <strong className={styles.figureValue}>{metrics.tickets.issued}</strong>
                          <span className={styles.figureLabel}>{tt('manage.figureIssued', 'Tickets out')}</span>
                        </div>
                        <div className={styles.figure}>
                          <strong className={styles.figureValue}>{metrics.tickets.checked_in}</strong>
                          <span className={styles.figureLabel}>{tt('manage.figureArrived', 'Turned up')}</span>
                        </div>
                        <div className={styles.figure}>
                          <strong className={styles.figureValue}>
                            {metrics.tickets.attendance_rate === null
                              ? tt('manage.noneYet', 'None yet')
                              : `${metrics.tickets.attendance_rate}%`}
                          </strong>
                          <span className={styles.figureLabel}>{tt('manage.figureAttendance', 'Attendance')}</span>
                        </div>
                        <div className={styles.figure}>
                          <strong className={styles.figureValue}>{Number(metrics.revenue.vc).toLocaleString(appLocale())}</strong>
                          <span className={styles.figureLabel}>{tt('manage.figureTaken', 'VENT COINS taken')}</span>
                        </div>
                      </div>

                      <p className={styles.cardHint}>
                        {tt('manage.checkInSplit', '{door} scanned at a gate, {self} marked themselves present, {refunded} refunded.')
                          .replace('{door}', metrics.tickets.at_door)
                          .replace('{self}', metrics.tickets.self_checked_in)
                          .replace('{refunded}', metrics.tickets.refunded)}
                      </p>

                      <h3 className={styles.subTitle}>{tt('manage.byTier', 'By ticket type')}</h3>
                      {metrics.tiers.length === 0
                        ? <p className={styles.muted}>{tt('manage.noTiersYet', 'No ticket types yet.')}</p>
                        : <div className={styles.rows}>
                          {metrics.tiers.map(row => <div key={row.tier_id} className={styles.row}>
                              <div className={styles.rowMain}>
                                <strong className={styles.rowName}>{row.name}</strong>
                              </div>
                              <div className={styles.rowStats}>
                                <span>{tt('manage.sold', 'Sold')}: <strong>{row.sold}</strong></span>
                                <span>
                                  {tt('manage.left', 'Left')}:{' '}
                                  <strong>{row.remaining === null ? tt('manage.uncapped', 'No cap') : row.remaining}</strong>
                                </span>
                                <span>{tt('manage.figureArrived', 'Turned up')}: <strong>{row.checked_in}</strong></span>
                              </div>
                            </div>)}
                        </div>}

                      {/* Everything else about the event, in the same place as
                          the tickets. Each of these was already counted on the
                          tab that owned it, so an organiser wanting the whole
                          picture opened six tabs and added up in their head. A
                          section stays visible at zero rather than disappearing:
                          a block that vanishes when empty makes the page jump
                          and reads as broken. */}
                      {metrics.arrivals_by_hour && <>
                        <h3 className={styles.subTitle}>{tt('manage.whenTheyCame', 'When they arrived')}</h3>
                        {metrics.arrivals_by_hour.length === 0
                          ? <p className={styles.muted}>{tt('manage.nobodyArrivedYet', 'Nobody has been checked in yet.')}</p>
                          : <div className={styles.hourBars}>
                              {metrics.arrivals_by_hour.map(h => {
                                const peak = Math.max(...metrics.arrivals_by_hour.map(x => x.arrivals), 1);
                                return <div key={h.hour} className={styles.hourBar}>
                                    <span className={styles.hourCount}>{h.arrivals}</span>
                                    <span className={styles.hourFill} style={{ height: Math.round(h.arrivals * 100 / peak) + '%' }} />
                                    <span className={styles.hourLabel}>{h.hour.slice(11, 16)}</span>
                                  </div>;
                              })}
                            </div>}
                      </>}

                      {metrics.referrals && <>
                        <h3 className={styles.subTitle}>{tt('manage.whoBroughtThem', 'Who brought them')}</h3>
                        {metrics.referrals.links.length === 0
                          ? <p className={styles.muted}>{tt('manage.noLinksYet', 'No influencer links on this event yet. Add one on the Money tab and the visits and sales it brings will show here.')}</p>
                          : <>
                            <div className={styles.figureGrid}>
                              <div className={styles.figure}>
                                <strong className={styles.figureValue}>{Number(metrics.referrals.total_visits).toLocaleString(appLocale())}</strong>
                                <span className={styles.figureLabel}>{tt('manage.figureLinkVisits', 'Arrived by a link')}</span>
                              </div>
                              <div className={styles.figure}>
                                <strong className={styles.figureValue}>{Number(metrics.referrals.total_sold).toLocaleString(appLocale())}</strong>
                                <span className={styles.figureLabel}>{tt('manage.figureLinkSold', 'Tickets from links')}</span>
                              </div>
                              <div className={styles.figure}>
                                <strong className={styles.figureValue}>{metrics.referrals.best || tt('manage.noneYet', 'None yet')}</strong>
                                <span className={styles.figureLabel}>{tt('manage.figureBestLink', 'Best link')}</span>
                              </div>
                            </div>
                            <div className={styles.rows}>
                              {metrics.referrals.links.map(link => <div key={link.id} className={styles.row}>
                                  <div className={styles.rowMain}>
                                    <strong className={styles.rowName}>{link.name}</strong>
                                    <span className={styles.code}>{link.code}</span>
                                  </div>
                                  <div className={styles.rowStats}>
                                    <span>{tt('manage.visits', 'Visits')}: <strong>{Number(link.visits).toLocaleString(appLocale())}</strong></span>
                                    <span>{tt('manage.sold', 'Sold')}: <strong>{Number(link.tickets_sold).toLocaleString(appLocale())}</strong></span>
                                    <span>
                                      {tt('manage.conversion', 'Converted')}:{' '}
                                      <strong>{link.conversion == null ? tt('manage.noVisitsYet', 'nobody yet') : link.conversion + '%'}</strong>
                                    </span>
                                  </div>
                                </div>)}
                            </div>
                          </>}
                      </>}

                      {metrics.engagement && <>
                        <h3 className={styles.subTitle}>{tt('manage.attention', 'Whether they are listening')}</h3>
                        <div className={styles.figureGrid}>
                          <div className={styles.figure}>
                            <strong className={styles.figureValue}>{metrics.engagement.announcements}</strong>
                            <span className={styles.figureLabel}>{tt('manage.figureAnnouncements', 'Announcements sent')}</span>
                          </div>
                          <div className={styles.figure}>
                            <strong className={styles.figureValue}>{metrics.engagement.polls}</strong>
                            <span className={styles.figureLabel}>{tt('manage.figurePolls', 'Polls asked')}</span>
                          </div>
                          <div className={styles.figure}>
                            <strong className={styles.figureValue}>{Number(metrics.engagement.poll_answers).toLocaleString(appLocale())}</strong>
                            <span className={styles.figureLabel}>{tt('manage.figurePollAnswers', 'Answers given')}</span>
                          </div>
                        </div>
                      </>}

                      {metrics.shop && <>
                        <h3 className={styles.subTitle}>{tt('manage.merch', 'Sold at the event')}</h3>
                        <div className={styles.figureGrid}>
                          <div className={styles.figure}>
                            <strong className={styles.figureValue}>{Number(metrics.shop.orders).toLocaleString(appLocale())}</strong>
                            <span className={styles.figureLabel}>{tt('manage.figureShopOrders', 'Shop orders')}</span>
                          </div>
                          <div className={styles.figure}>
                            <strong className={styles.figureValue}>{Number(metrics.shop.revenue_vc).toLocaleString(appLocale())}</strong>
                            <span className={styles.figureLabel}>{tt('manage.figureShopTaken', 'VENT COINS from the shop')}</span>
                          </div>
                          <div className={styles.figure}>
                            <strong className={styles.figureValue}>{Number(metrics.shop.collected).toLocaleString(appLocale())}</strong>
                            <span className={styles.figureLabel}>{tt('manage.figureShopCollected', 'Collected at the stall')}</span>
                          </div>
                        </div>
                      </>}

                      <h3 className={styles.subTitle}>{tt('manage.download', 'Download')}</h3>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => downloadSheet('attendees')}>
                          {tt('manage.sheetAttendees', 'Attendee list')}
                        </button>
                        <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => downloadSheet('tiers')}>
                          {tt('manage.sheetTiers', 'Sales by ticket type')}
                        </button>
                        <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => downloadSheet('sales')}>
                          {tt('manage.sheetSales', 'Sales by day')}
                        </button>
                      </div>
                    </>}
                </section>}

              {/* ---------------------------------------------------- messages */}
              {tab === 'messages' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.messagesHint', 'One email to everybody holding a ticket, guests included. Each person is written to on their own, so nobody sees anybody else on the list, and somebody holding four tickets is told once.')}
                  </p>

                  <div className={styles.newRow}>
                    <input className={styles.input} placeholder={tt('manage.messageSubject', 'Subject')} maxLength={140} value={draftMessage.subject} onChange={e => setDraftMessage({ ...draftMessage, subject: e.target.value })} />
                    <select className={styles.audienceSelect} value={draftMessage.audience} onChange={e => setDraftMessage({ ...draftMessage, audience: e.target.value })} aria-label={tt('manage.messageAudience', 'Who gets it')}>
                      <option value="all">
                        {tt('manage.audienceAll', 'Everybody with a ticket')}
                        {audience ? ` (${audience.audiences.all})` : ''}
                      </option>
                      <option value="not_checked_in">
                        {tt('manage.audienceNotArrived', 'Not arrived yet')}
                        {audience ? ` (${audience.audiences.not_checked_in})` : ''}
                      </option>
                      <option value="checked_in">
                        {tt('manage.audienceArrived', 'Already inside')}
                        {audience ? ` (${audience.audiences.checked_in})` : ''}
                      </option>
                    </select>
                  </div>
                  <textarea className={styles.textarea} rows={5} maxLength={2000} placeholder={tt('manage.messageBody', 'What do they need to know?')} value={draftMessage.body} onChange={e => setDraftMessage({ ...draftMessage, body: e.target.value })} />
                  <div className={styles.rowBetween}>
                    <span className={styles.muted}>
                      {audience
                        ? tt('manage.sentToday', '{sent} of {limit} messages sent today.')
                          .replace('{sent}', audience.sent_today).replace('{limit}', audience.daily_limit)
                        : ''}
                    </span>
                    <button type="button" className={styles.addBtn} disabled={busy || !draftMessage.subject.trim() || !draftMessage.body.trim()} onClick={sendMessage}>
                      {tt('manage.sendMessage', 'Send it')}
                    </button>
                  </div>

                  <h3 className={styles.subTitle}>{tt('manage.messagesSent', 'Already sent')}</h3>
                  {announcements.length === 0
                    ? <p className={styles.muted}>{tt('manage.noMessages', 'You have not sent anything yet.')}</p>
                    : <div className={styles.rows}>
                      {announcements.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.subject}</strong>
                            <span className={styles.code}>{formatDateTime(row.sent_at)}</span>
                            {row.email_error && <span className={styles.offBadge}>{row.email_error}</span>}
                          </div>
                          <div className={styles.rowStats}>
                            <span>{tt('manage.reached', 'Reached')}: <strong>{row.recipients}</strong></span>
                          </div>
                        </div>)}
                    </div>}
                </section>}

              {/* ------------------------------------------------------- polls */}
              {/* Tickets an organiser hands out. Its own card on the Tickets
                  tab, because it is the same object as a sale and belongs next
                  to the types it is issued from. */}
              {tab === 'tickets' && tiers.length > 0 && <section className={styles.card}>
                  <h3 className={styles.subTitle}>{tt('manage.compTitle', 'Send tickets to people')}</h3>
                  <p className={styles.cardHint}>
                    {tt('manage.compHint', 'For the guest list, the press, the sponsor\'s people. They get a real ticket with a real code, emailed to them, and it comes out of the same stock as a sale. Somebody who already has one of that type is skipped.')}
                  </p>
                  <div className={styles.newRow}>
                    <select className={styles.input} aria-label={tt('manage.compTier', 'Which type')} value={compTier} onChange={e => setCompTier(e.target.value)}>
                      <option value="">{tt('manage.compTier', 'Which type')}</option>
                      {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.newRow}>
                    <textarea className={styles.input} rows={3} placeholder={tt('manage.compEmails', 'Email addresses, one per line or separated by commas')} value={compEmails} onChange={e => setCompEmails(e.target.value)} />
                  </div>
                  <div className={styles.newRow}>
                    <input className={styles.input} maxLength={280} placeholder={tt('manage.compNote', 'A line to go with it (optional)')} value={compNote} onChange={e => setCompNote(e.target.value)} />
                  </div>
                  <div className={styles.rowBetween}>
                    <span className={styles.muted}>{compResult}</span>
                    <button type="button" className={styles.addBtn} disabled={busy || !compTier || !compEmails.trim()} onClick={sendComps}>
                      {tt('manage.compSend', 'Send them')}
                    </button>
                  </div>
                </section>}

              {tab === 'polls' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.pollsHint', 'Ask the room. One ticket is one answer, so people without an account can still take part. The count stays hidden until somebody has answered, because a visible tally pulls later answers toward whatever is winning.')}
                  </p>

                  <div className={styles.newRow}>
                    <input className={styles.input} placeholder={tt('manage.pollQuestion', 'What do you want to ask?')} maxLength={200} value={draftPoll.question} onChange={e => setDraftPoll({ ...draftPoll, question: e.target.value })} />
                  </div>

                  {/* What kind of question. Chips rather than a select: the
                      difference between them needs a sentence, and a native
                      select on a phone hides five of the six. */}
                  <div className={styles.pollKindRow}>
                    {POLL_KINDS.map(kind => <button
                      key={kind.id}
                      type="button"
                      className={`${styles.pollKindChip} ${draftPoll.kind === kind.id ? styles.pollKindChipOn : ''}`}
                      aria-pressed={draftPoll.kind === kind.id}
                      onClick={() => setDraftPoll({ ...draftPoll, kind: kind.id })}
                    >{kind.label}</button>)}
                  </div>
                  <p className={styles.muted}>{pollKind.hint}</p>

                  <div className={styles.newRow}>
                    <input className={styles.input} placeholder={tt('manage.pollHelp', 'A note under the question, if it needs one (optional)')} maxLength={280} value={draftPoll.help_text} onChange={e => setDraftPoll({ ...draftPoll, help_text: e.target.value })} />
                  </div>

                  {draftPoll.kind === 'scale' && <>
                    <div className={styles.newRow}>
                      <input className={styles.input} type="number" min={0} max={9} aria-label={tt('manage.pollScaleFrom', 'Scale starts at')} value={draftPoll.scale_min} onChange={e => setDraftPoll({ ...draftPoll, scale_min: e.target.value })} />
                      <input className={styles.input} type="number" min={1} max={10} aria-label={tt('manage.pollScaleTo', 'Scale ends at')} value={draftPoll.scale_max} onChange={e => setDraftPoll({ ...draftPoll, scale_max: e.target.value })} />
                    </div>
                    <div className={styles.newRow}>
                      <input className={styles.input} placeholder={tt('manage.pollScaleLow', 'Word for the low end, e.g. Poor')} maxLength={40} value={draftPoll.scale_min_label} onChange={e => setDraftPoll({ ...draftPoll, scale_min_label: e.target.value })} />
                      <input className={styles.input} placeholder={tt('manage.pollScaleHigh', 'Word for the high end, e.g. Excellent')} maxLength={40} value={draftPoll.scale_max_label} onChange={e => setDraftPoll({ ...draftPoll, scale_max_label: e.target.value })} />
                    </div>
                  </>}

                  {draftPoll.kind === 'multiple' && <div className={styles.newRow}>
                    <input className={styles.input} type="number" min={0} aria-label={tt('manage.pollMin', 'Fewest they may pick (0 for no limit)')} placeholder={tt('manage.pollMin', 'Fewest they may pick (0 for no limit)')} value={draftPoll.min_choices} onChange={e => setDraftPoll({ ...draftPoll, min_choices: e.target.value })} />
                    <input className={styles.input} type="number" min={0} aria-label={tt('manage.pollMax', 'Most they may pick (0 for no limit)')} placeholder={tt('manage.pollMax', 'Most they may pick (0 for no limit)')} value={draftPoll.max_choices} onChange={e => setDraftPoll({ ...draftPoll, max_choices: e.target.value })} />
                  </div>}

                  {pollKind.needsOptions && draftPoll.options.map((option, index) => <div key={index} className={styles.newRow}>
                      <input className={styles.input} placeholder={tt('manage.pollOption', 'Option {n}').replace('{n}', index + 1)} maxLength={140} value={option} onChange={e => {
                        const next = [...draftPoll.options];
                        next[index] = e.target.value;
                        setDraftPoll({ ...draftPoll, options: next });
                      }} />
                      {draftPoll.options.length > 2 && <button type="button" className={styles.iconBtn} aria-label={tt('manage.removeOption', 'Remove this option')} onClick={() => setDraftPoll({ ...draftPoll, options: draftPoll.options.filter((_, i) => i !== index) })}>
                        <FaTrash />
                      </button>}
                    </div>)}
                  {/* Linking one question to an earlier answer. Only shown once
                      there is an earlier question that can gate anything. */}
                  {gateable.length > 0 && <div className={styles.newRow}>
                    <select
                      className={styles.input}
                      aria-label={tt('manage.pollAfter', 'Show this only after')}
                      value={draftPoll.depends_on}
                      onChange={e => setDraftPoll({ ...draftPoll, depends_on: e.target.value, depends_on_option: '', depends_on_max: '' })}
                    >
                      <option value="">{tt('manage.pollAlways', 'Always show this question')}</option>
                      {gateable.map(p => <option key={p.id} value={p.id}>
                        {tt('manage.pollAfterOne', 'Only after: {q}').replace('{q}', p.question)}
                      </option>)}
                    </select>

                    {gate && gate.kind !== 'scale' && <select
                      className={styles.input}
                      aria-label={tt('manage.pollAfterAnswer', 'And only if they answered')}
                      value={draftPoll.depends_on_option}
                      onChange={e => setDraftPoll({ ...draftPoll, depends_on_option: e.target.value })}
                    >
                      <option value="">{tt('manage.pollAnyAnswer', 'Whatever they answered')}</option>
                      {(gate.options || []).map(o => <option key={o.id} value={o.id}>
                        {tt('manage.pollIfAnswered', 'If they answered: {a}').replace('{a}', o.text)}
                      </option>)}
                    </select>}

                    {gate && gate.kind === 'scale' && <input
                      className={styles.input} type="number"
                      aria-label={tt('manage.pollIfAtMost', 'Only if they rated it at most')}
                      placeholder={tt('manage.pollIfAtMost', 'Only if they rated it at most')}
                      value={draftPoll.depends_on_max}
                      onChange={e => setDraftPoll({ ...draftPoll, depends_on_max: e.target.value })} />}
                  </div>}

                  <div className={styles.rowBetween}>
                    {pollKind.needsOptions && <button type="button" className={styles.ghostBtn} disabled={draftPoll.options.length >= 10} onClick={() => setDraftPoll({ ...draftPoll, options: [...draftPoll.options, ''] })}>
                      <FaPlus /> {tt('manage.addOption', 'Another option')}
                    </button>}
                    <label className={styles.checkInline}>
                      <input type="checkbox" checked={draftPoll.show_results_before_voting} onChange={e => setDraftPoll({ ...draftPoll, show_results_before_voting: e.target.checked })} />
                      {tt('manage.pollShowEarly', 'Show the count before people answer')}
                    </label>
                    <button type="button" className={styles.addBtn} disabled={busy || !draftPoll.question.trim() || (pollKind.needsOptions && draftPoll.options.filter(o => o.trim()).length < 2)} onClick={addPoll}>
                      {tt('manage.addPoll', 'Ask it')}
                    </button>
                  </div>

                  <h3 className={styles.subTitle}>{tt('manage.pollsAsked', 'Your polls')}</h3>
                  {polls.length === 0
                    ? <p className={styles.muted}>{tt('manage.noPolls', 'You have not asked anything yet.')}</p>
                    : <div className={styles.rows}>
                      {polls.map(poll => <div key={poll.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{poll.question}</strong>
                            {!poll.is_open && <span className={styles.offBadge}>{tt('manage.pollClosed', 'Closed')}</span>}
                            <span className={styles.code}>
                              {tt('manage.pollAnswers', '{n} answers').replace('{n}', poll.total_votes ?? 0)}
                            </span>
                          </div>
                          <div className={styles.rowStats}>
                            {poll.options.map(option => <span key={option.id}>
                              {option.text}: <strong>{option.votes ?? 0}</strong>
                              {option.share === null ? '' : ` (${option.share}%)`}
                            </span>)}
                          </div>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => setPollOpen(poll, !poll.is_open)}>
                              {poll.is_open ? tt('manage.closePoll', 'Close it') : tt('manage.reopenPoll', 'Reopen it')}
                            </button>
                            {(poll.total_votes ?? 0) === 0 && <button type="button" className={styles.iconBtn} aria-label={tt('manage.removePoll', 'Remove this poll')} disabled={busy} onClick={() => removePoll(poll)}>
                              <FaTrash />
                            </button>}
                          </div>
                        </div>)}
                    </div>}
                </section>}

              {/* ------------------------------------------------ influencers */}
              {tab === 'influencers' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.influencerHint', 'Give somebody a code and their link becomes /events/…?ref=CODE. Set an allocation to hold a number of tickets for them, or leave it at zero to just track what they sell.')}
                  </p>

                  {referrals.length === 0 ? <p className={styles.muted}>{tt('manage.noInfluencers', 'Nobody is selling for you yet.')}</p> : <div className={styles.rows}>
                      {referrals.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.name}</strong>
                            <span className={styles.code}>{row.code}</span>
                            {!row.is_active && <span className={styles.offBadge}>{tt('manage.switchedOff', 'Switched off')}</span>}
                          </div>
                          <div className={styles.rowStats}>
                            {/* Counted from the tickets that carry this link,
                                not from a counter, so a refund corrects itself.
                                Visits come first because a link that brought a
                                thousand people and sold nothing is a different
                                problem from one nobody clicked. */}
                            <span>{tt('manage.visits', 'Visits')}: <strong>{(row.visits ?? 0).toLocaleString(appLocale())}</strong></span>
                            <span>{tt('manage.sold', 'Sold')}: <strong>{(row.tickets_sold ?? row.sold ?? 0).toLocaleString(appLocale())}</strong></span>
                            <span>
                              {tt('manage.conversion', 'Converted')}:{' '}
                              <strong>{row.conversion == null
                                ? tt('manage.noVisitsYet', 'nobody yet')
                                : `${row.conversion}%`}</strong>
                            </span>
                            <span>
                              {tt('manage.allocation', 'Allocation')}:{' '}
                              <strong>{row.allocation ? `${row.remaining} / ${row.allocation}` : tt('manage.uncapped', 'No cap')}</strong>
                            </span>
                          </div>
                          {row.share_url && <div className={styles.shareRow}>
                              <code className={styles.shareLink}>{row.share_url}</code>
                              <button type="button" className={styles.ghostBtn} onClick={() => copyShare(row.share_url)}>
                                {copiedLink === row.share_url
                                  ? tt('manage.copied', 'Copied')
                                  : tt('manage.copyLink', 'Copy link')}
                              </button>
                            </div>}
                          <div className={styles.rowActions}>
                            <input className={styles.smallInput} type="number" min={row.sold} defaultValue={row.allocation} aria-label={tt('manage.allocation', 'Allocation')} onBlur={e => {
                      const next = Number(e.target.value) || 0;
                      if (next !== row.allocation) saveReferral(row, {
                        allocation: next
                      });
                    }} />
                            <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => saveReferral(row, {
                      is_active: !row.is_active
                    })}>
                              {row.is_active ? tt('manage.switchOff', 'Switch off') : tt('manage.switchOn', 'Switch on')}
                            </button>
                            <button type="button" className={styles.iconBtn} disabled={busy} onClick={() => removeReferral(row)} aria-label={tt('manage.remove', 'Remove')}>
                              <FaTrash />
                            </button>
                          </div>
                        </div>)}
                    </div>}

                  <div className={styles.newRow}>
                    <input className={styles.input} placeholder={tt('manage.influencerName', 'Name')} value={newReferral.name} onChange={e => setNewReferral(p => ({
                  ...p,
                  name: e.target.value
                }))} />
                    <input className={styles.input} placeholder={tt('manage.code', 'Code')} value={newReferral.code} onChange={e => setNewReferral(p => ({
                  ...p,
                  code: e.target.value.toUpperCase()
                }))} />
                    <input className={styles.input} type="url" placeholder={tt('manage.channel', 'Their channel (optional)')} value={newReferral.url} onChange={e => setNewReferral(p => ({
                  ...p,
                  url: e.target.value
                }))} />
                    <input className={styles.input} type="number" min={0} placeholder={tt('manage.allocationPlaceholder', 'Tickets held (0 = none)')} value={newReferral.allocation} onChange={e => setNewReferral(p => ({
                  ...p,
                  allocation: e.target.value
                }))} />
                    <button type="button" className={styles.addBtn} disabled={busy || !newReferral.name.trim() || !newReferral.code.trim()} onClick={addReferral}>
                      <FaPlus /> {tt('manage.addInfluencer', 'Add')}
                    </button>
                  </div>
                </section>}

              {/* ----------------------------------------------------- promos */}
              {tab === 'promos' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.promoHint', 'The limit counts tickets, not uses, because one order can carry several. Credit a code to an influencer to see what their audience bought.')}
                  </p>

                  {promos.length === 0 ? <p className={styles.muted}>{tt('manage.noPromos', 'No promo codes yet.')}</p> : <div className={styles.rows}>
                      {promos.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.code}</strong>
                            <span className={styles.code}>
                              {row.kind === 'percent' ? `${Number(row.value)}%` : `-${Number(row.value)}`}
                            </span>
                            {row.referral_name && <span className={styles.creditedTo}>
                                {tt('manage.creditedTo', 'credited to {name}').replace('{name}', row.referral_name)}
                              </span>}
                            {!row.is_active && <span className={styles.offBadge}>{tt('manage.switchedOff', 'Switched off')}</span>}
                          </div>
                          <div className={styles.rowStats}>
                            <span>
                              {tt('manage.used', 'Used')}:{' '}
                              <strong>{row.max_tickets ? `${row.used_tickets} / ${row.max_tickets}` : row.used_tickets}</strong>
                            </span>
                          </div>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => savePromo(row, {
                      is_active: !row.is_active
                    })}>
                              {row.is_active ? tt('manage.switchOff', 'Switch off') : tt('manage.switchOn', 'Switch on')}
                            </button>
                            <button type="button" className={styles.iconBtn} disabled={busy} onClick={() => removePromo(row)} aria-label={tt('manage.remove', 'Remove')}>
                              <FaTrash />
                            </button>
                          </div>
                        </div>)}
                    </div>}

                  <div className={styles.newRow}>
                    <input className={styles.input} placeholder={tt('manage.code', 'Code')} value={newPromo.code} onChange={e => setNewPromo(p => ({
                  ...p,
                  code: e.target.value.toUpperCase()
                }))} />
                    <select className={styles.input} value={newPromo.kind} onChange={e => setNewPromo(p => ({
                  ...p,
                  kind: e.target.value
                }))}>
                      <option value="percent">{tt('manage.percentOff', 'Percent off')}</option>
                      <option value="amount">{tt('manage.amountOff', 'Amount off')}</option>
                    </select>
                    <input className={styles.input} type="number" min={0} placeholder={tt('manage.value', 'Value')} value={newPromo.value} onChange={e => setNewPromo(p => ({
                  ...p,
                  value: e.target.value
                }))} />
                    <input className={styles.input} type="number" min={0} placeholder={tt('manage.maxTickets', 'Ticket limit (0 = none)')} value={newPromo.max_tickets} onChange={e => setNewPromo(p => ({
                  ...p,
                  max_tickets: e.target.value
                }))} />
                    <select className={styles.input} value={newPromo.referral_id} onChange={e => setNewPromo(p => ({
                  ...p,
                  referral_id: e.target.value
                }))}>
                      <option value="">{tt('manage.noCredit', 'Not credited to anybody')}</option>
                      {referrals.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <button type="button" className={styles.addBtn} disabled={busy || !newPromo.code.trim() || !newPromo.value} onClick={addPromo}>
                      <FaPlus /> {tt('manage.addPromo', 'Create')}
                    </button>
                  </div>
                </section>}

              {/* ------------------------------------------------------- team */}
              {tab === 'team' && <section className={styles.card}>
                  {!canAddManagers ? <p className={styles.muted}>
                      {tt('manage.notAnOrgEvent', 'This event belongs to you rather than to an organisation, so it cannot be shared with other people. Move it to an organisation to give somebody else the door list and the codes.')}
                    </p> : <p className={styles.cardHint}>
                      {tt('manage.teamHint', 'A manager can do everything here except delete the event or add more managers. Door staff can only check tickets in.')}
                    </p>}

                  {managers.length === 0 ? <p className={styles.muted}>{tt('manage.noManagers', 'Nobody else is helping run this yet.')}</p> : <div className={styles.rows}>
                      {managers.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <UserChip user={row} size={0}
                                      nameClassName={styles.rowName} />
                            <span className={styles.code}>
                              {row.role === 'door' ? tt('manage.roleDoor', 'Door staff') : tt('manage.roleManager', 'Manager')}
                            </span>
                          </div>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.iconBtn} disabled={busy} onClick={() => removeManager(row)} aria-label={tt('manage.remove', 'Remove')}>
                              <FaTrash />
                            </button>
                          </div>
                        </div>)}
                    </div>}

                  {canAddManagers && <div className={styles.newRow}>
                      <input className={styles.input} placeholder={tt('manage.username', 'Username')} value={newManager.username} onChange={e => setNewManager(p => ({
                  ...p,
                  username: e.target.value
                }))} />
                      <select className={styles.input} value={newManager.role} onChange={e => setNewManager(p => ({
                  ...p,
                  role: e.target.value
                }))}>
                        <option value="manager">{tt('manage.roleManager', 'Manager')}</option>
                        <option value="door">{tt('manage.roleDoor', 'Door staff')}</option>
                      </select>
                      <button type="button" className={styles.addBtn} disabled={busy || !newManager.username.trim()} onClick={addManager}>
                        <FaPlus /> {tt('manage.addManager', 'Add')}
                      </button>
                    </div>}
                </section>}
            </>}
        </div>
      </main>
      <BottomMenu />
    </div>;
};
const ManageEventPage = () => <Suspense fallback={<div style={{
  minHeight: '100vh',
  backgroundColor: '#131316'
}} />}>
    <ManageEventContent />
  </Suspense>;
export default ManageEventPage;
