'use client';

import { withLocalDatesAsISO } from '@/lib/datetime';
import { usePrice } from '@/lib/money';
import { useLanguage } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminBar, { adminSaveResult } from '@/components/admin-bar/AdminBar';
import EventSchedule from '@/components/event-schedule/EventSchedule';
import EventWaitlist from '@/components/event-schedule/EventWaitlist';
import GuestCheckout from '@/components/guest-checkout/GuestCheckout';
import { useCheckoutFields, CheckoutFieldList, missingRequired }
  from '@/components/checkout-fields/CheckoutFields';
import Link from 'next/link';
import Image from 'next/image';
import { IoCalendarOutline, IoLocationOutline, IoTicketOutline } from 'react-icons/io5';
import { FaUsers, FaCheckCircle, FaCrown, FaStar, FaStore, FaTrophy } from 'react-icons/fa';
import { MdOutlineClose } from 'react-icons/md';
import { FiExternalLink } from 'react-icons/fi';
import { BsTwitter, BsInstagram, BsYoutube, BsFacebook, BsTwitch } from 'react-icons/bs';

// The Connect row and the sponsor chips were hardcoded: five links pointing at
// "#" and four invented sponsor names on every event, whoever ran it. Both now
// come from the event itself and disappear when the organizer has not set them.
const SOCIAL_ICONS = {
  twitter: BsTwitter,
  x: BsTwitter,
  instagram: BsInstagram,
  youtube: BsYoutube,
  facebook: BsFacebook,
  twitch: BsTwitch
};
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { normalizeEvent, findEventInList } from '@/components/events/normalizeEvents';
import styles from './view-event.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import { appLocale } from '@/lib/appLocale';
const TABS = [{
  id: 'overview',
  label: 'Overview'
}, {
  id: 'tickets',
  label: 'Tickets'
}, {
  // Only offered when the organiser has actually published a programme. The
  // version of this tab that was removed drew an invented two-day schedule on
  // every event on the platform, which is worse than no tab: no tab says
  // nothing has been published, an invented one says the organiser published
  // THIS.
  id: 'schedule',
  label: 'Schedule',
  needsProgramme: true
}, {
  // The Schedule tab is hidden until it is real.
  //
  // It was drawn by SCHEDULE_BLUEPRINT below: a function that invents a two day
  // programme from the event's start date, so EVERY event on the platform
  // showed the same "Doors open + Vendor zone activation", "Cosplay parade" and
  // "After-party + DJ set" whoever ran it and whatever it was about.
  //
  // That is worse than no tab. No tab says nothing has been published; an
  // invented one says the organiser published THIS, and somebody turns up at
  // 8pm for a DJ set that was never going to happen. The EventSession model
  // exists now; this comes back when the organiser can fill it in.
  id: 'vendors',
  label: 'Vendors'
}, {
  id: 'tournaments',
  label: 'Tournaments'
}
// The Map tab draws VENUE_BOOTHS, a fixed floor plan with a main stage, a food
// court and a VIP lounge. It is the same plan for every event, and no event
// has ever supplied one, so it was showing attendees a layout of a venue that
// does not exist. Restore this tab when events can carry a real floor plan.
];
const formatDateTime = iso => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString(appLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
const formatDate = iso => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(appLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Ticket tiers come from GET /event/<id>/ticket-types/. This used to fall back
// to three invented tiers (GA 2,500 / VIP 10,000 / Backstage 25,000) whenever
// the event had none, so every event appeared to sell tickets it did not have.
const normaliseTier = t => {
  const name = t.name || 'General';
  const tier = /vip/i.test(name) ? 'vip' : /backstage/i.test(name) ? 'backstage' : 'general';
  return {
    id: t.id,
    name,
    tier,
    price: Number(t.price_vc ?? t.price ?? 0),
    // VENT COINS
    price_ngn: Number(t.price_ngn ?? 0),
    available: Number(t.remaining ?? 0),
    sold_out: !!t.sold_out,
    perks: Array.isArray(t.perks) ? t.perks : []
  };
};
const VENUE_BOOTHS = [{
  id: 'b1',
  name: 'Main Stage',
  x: 50,
  y: 18,
  w: 40,
  h: 12,
  type: 'stage'
}, {
  id: 'b2',
  name: 'Esports Arena',
  x: 8,
  y: 38,
  w: 30,
  h: 18,
  type: 'esports'
}, {
  id: 'b3',
  name: 'Vendor Row A',
  x: 45,
  y: 38,
  w: 22,
  h: 8,
  type: 'vendor'
}, {
  id: 'b4',
  name: 'Vendor Row B',
  x: 70,
  y: 38,
  w: 22,
  h: 8,
  type: 'vendor'
}, {
  id: 'b5',
  name: 'Food Court',
  x: 8,
  y: 62,
  w: 26,
  h: 12,
  type: 'food'
}, {
  id: 'b6',
  name: 'Cosplay Studio',
  x: 40,
  y: 62,
  w: 20,
  h: 12,
  type: 'studio'
}, {
  id: 'b7',
  name: 'VIP Lounge',
  x: 65,
  y: 62,
  w: 27,
  h: 12,
  type: 'vip'
}, {
  id: 'b8',
  name: 'Entry / Check-in',
  x: 38,
  y: 82,
  w: 24,
  h: 8,
  type: 'entry'
}];

// Live means "started and not finished". Without the end date every past event
// claimed to be live forever.
const useCountdown = (target, endTarget) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  const endMs = endTarget ? new Date(endTarget).getTime() : null;
  if (diff <= 0) {
    const ended = endMs != null && now > endMs;
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      live: !ended,
      ended
    };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor(diff / (1000 * 60 * 60) % 24),
    minutes: Math.floor(diff / (1000 * 60) % 60),
    seconds: Math.floor(diff / 1000 % 60),
    live: false
  };
};
export const ViewEventContent = ({
  slug
}) => {
  const tx = useTx();
  const tt = useT();
  const price = usePrice();
  const {
    language
  } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  // `/events/anime-night-lagos` passes the slug; `?id=` still resolves.
  const id = slug || searchParams.get('id');
  const tabParam = searchParams.get('tab');
  const {
    data: session,
    status: sessionStatus
  } = useSession();
  const [event, setEvent] = useState(null);
  const [linkedTournaments, setLinkedTournaments] = useState([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [linkable, setLinkable] = useState([]);
  const [linkableLoading, setLinkableLoading] = useState(false);
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [linkBusyId, setLinkBusyId] = useState(null);
  const [linkError, setLinkError] = useState('');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(tabParam || 'overview');
  // Whether the organiser has published a programme. The Schedule tab appears
  // only when they have, so an empty tab never shows.
  //
  // Asked on page load rather than by the tab's own component: that component
  // only mounts once the tab is open, and a tab that has to be opened before it
  // will appear can never be opened.
  const [hasProgramme, setHasProgramme] = useState(false);
  // Which tier a signed-out visitor is buying, if any.
  const [guestTier, setGuestTier] = useState(null);
  const [tierRefresh, setTierRefresh] = useState(0);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/event/${id}/sessions/`);
        const body = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && body.status === 'success') {
          setHasProgramme(Boolean(body.data?.published));
        }
      } catch {
        // No programme is the normal case, and a failed probe reads the same
        // way: the tab simply does not appear.
      }
    })();
    return () => { cancelled = true; };
  }, [id]);
  const [walletBalance, setWalletBalance] = useState(null);

  // Ticket tiers (real, from the ticketing endpoint)
  const [tiers, setTiers] = useState([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [buyPin, setBuyPin] = useState('');

  // Buy flow modal state
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyStep, setBuyStep] = useState(1);
  const [buyTier, setBuyTier] = useState(null);
  // The organiser's questions. A signed-in buyer answers the same list a guest
  // does, drawn by the same component, because the questions belong to the
  // event and not to the way somebody happened to arrive at it.
  const { fields: askFields, perOrder: askPerOrder, perTicket: askPerTicket } =
    useCheckoutFields(id);
  const [buyAnswers, setBuyAnswers] = useState({});
  const [buyPeople, setBuyPeople] = useState([{ answers: {} }]);
  const [buyQty, setBuyQty] = useState(1);
  const [buyError, setBuyError] = useState('');
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyResult, setBuyResult] = useState(null);
  const eventSponsors = Array.isArray(event?.sponsors) ? event.sponsors : [];
  // The API separates them, because the page shows two headings and should not
  // have to filter a mixed list itself.
  const eventPartners = Array.isArray(event?.partners) ? event.partners : [];
  const eventSocials = Object.entries(event?.social_links || {}).filter(([platform, url]) => url && SOCIAL_ICONS[String(platform).toLowerCase()]).map(([platform, url]) => ({
    platform,
    url,
    Icon: SOCIAL_ICONS[String(platform).toLowerCase()]
  }));
  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${session?.user?.sessionToken || ''}`,
    'Content-Type': 'application/json'
  }), [session?.user?.sessionToken]);

  // Fetch event. Gated on the session having settled: without this the effect
  // runs once tokenless on mount and again when NextAuth resolves, doubling every
  // request on the page (measured: view-event, vendors and the events list were
  // each fetched four times per load).
  useEffect(() => {
    if (!id) {
      setError(tt("msg.eventIdMissing", "Event ID missing"));
      setLoading(false);
      return;
    }
    if (sessionStatus === 'loading') return;
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        // Primary: dedicated single-event endpoint. The mock layer serves this;
        // the real backend does not have it yet (Phase 2), so this may 404.
        let found = null;
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/view-event/${id}/`, {
            headers: authHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            // Renamed since this link was shared. Swap the address for the
            // current one; the page reloads against it.
            if (data.status === 'moved' && data.data?.url) {
              router.replace(data.data.url);
              return;
            }
            if (data.status === 'success') {
              found = normalizeEvent(data.data.event || data.data);
            }
          }
        } catch {
          /* fall through to the list-based lookup below */
        }

        // Fallback: locate the event inside `get-all-events` (real backend has
        // no single-event route). Also covers the thin real field shape.
        if (!found) {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/get-all-events/`, {
            headers: authHeaders()
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'success') {
              found = findEventInList(data.data, id);
            }
          }
        }
        if (found) setEvent(found);else setError(tt("msg.thisEventDoesnTExist", "This event doesn\u2019t exist or is no longer available."));
      } catch (err) {
        setError(tt("msg.networkError", "Network error"));
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, authHeaders]);

  // Fetch wallet balance for ticket flow
  useEffect(() => {
    if (!session?.user?.sessionToken) return;
    const fetchBalance = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (data.status === 'success') {
          setWalletBalance(Number(data.data.balance || 0));
        }
      } catch (err) {
        console.error('Balance fetch error:', err);
      }
    };
    fetchBalance();
  }, [session?.user?.sessionToken, authHeaders]);

  // Fetch vendors (same session gate as above)
  useEffect(() => {
    if (!id || sessionStatus === 'loading') return;
    const fetchVendors = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${id}/vendors/`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (data.status === 'success') {
          setVendors(data.data.vendors || []);
        }
      } catch (err) {
        console.error('Vendors fetch error:', err);
      }
    };
    fetchVendors();
  }, [id, authHeaders]);

  // Linked tournaments. The list carries per-viewer flags (does your ticket cover
  // entry, are you the organizer), so it has to wait for the session to resolve
  // or every flag comes back false.
  const loadTournaments = useCallback(async () => {
    if (!id) return;
    setTournamentsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${id}/tournaments/`, {
        headers: authHeaders()
      });
      const data = await res.json();
      setLinkedTournaments(data.status === 'success' ? data.data.tournaments || [] : []);
    } catch (err) {
      console.error('Linked tournaments fetch error:', err);
      setLinkedTournaments([]);
    } finally {
      setTournamentsLoading(false);
    }
  }, [id, authHeaders]);
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    loadTournaments();
  }, [sessionStatus, loadTournaments]);

  // Organizer only: the tournaments this organizer can still attach.
  const loadLinkable = useCallback(async () => {
    if (!id) return;
    setLinkableLoading(true);
    setLinkError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${id}/linkable-tournaments/`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.status === 'success') setLinkable(data.data.tournaments || []);else {
        setLinkable([]);
        setLinkError(apiMessage(tt, data, "api.couldNotLoadYourTournaments", "Could not load your tournaments."));
      }
    } catch (err) {
      setLinkable([]);
      setLinkError('Network error while loading your tournaments.');
    } finally {
      setLinkableLoading(false);
    }
  }, [id, authHeaders]);
  const openLinkPanel = () => {
    setLinkPanelOpen(true);
    loadLinkable();
  };
  const linkTournament = async tournamentId => {
    setLinkBusyId(tournamentId);
    setLinkError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${id}/link-tournament/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          tournament_id: tournamentId,
          shared_ticketing: false
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        await loadTournaments();
        await loadLinkable();
      } else {
        setLinkError(apiMessage(tt, data, "api.couldNotLinkThatTournament", "Could not link that tournament."));
      }
    } catch (err) {
      setLinkError('Network error while linking.');
    } finally {
      setLinkBusyId(null);
    }
  };
  const unlinkTournament = async tournamentId => {
    setLinkBusyId(tournamentId);
    setLinkError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${id}/unlink-tournament/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          tournament_id: tournamentId
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        await loadTournaments();
        if (linkPanelOpen) await loadLinkable();
      } else {
        setLinkError(apiMessage(tt, data, "api.couldNotUnlinkThatTournament", "Could not unlink that tournament."));
      }
    } catch (err) {
      setLinkError('Network error while unlinking.');
    } finally {
      setLinkBusyId(null);
    }
  };
  const setSharedTicketing = async (tournamentId, next) => {
    setLinkBusyId(tournamentId);
    setLinkError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${id}/tournament/${tournamentId}/ticketing/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          shared_ticketing: next
        })
      });
      const data = await res.json();
      if (data.status === 'success') await loadTournaments();else setLinkError(apiMessage(tt, data, "api.couldNotChangeSharedTicketing", "Could not change shared ticketing."));
    } catch (err) {
      setLinkError('Network error while changing shared ticketing.');
    } finally {
      setLinkBusyId(null);
    }
  };

  // Sync tab to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeTab && activeTab !== 'overview') params.set('tab', activeTab);else params.delete('tab');
    // Keep whatever address the page was opened on. Rewriting to
    // /events/view-event?tab=... threw the event away when the page had been
    // reached by name, because the slug lives in the path there and not in the
    // query - so every tab on /events/<name> landed on "Event ID missing".
    params.delete('id');
    const qs = params.toString();
    router.replace(qs ? `/events/${id}?${qs}` : `/events/${id}`, {
      scroll: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  const countdown = useCountdown(event?.start_date, event?.end_date);
  const tickets = useMemo(() => tiers.map(normaliseTier), [tiers]);

  // Only the organizer gets the door list (the endpoint enforces it too).
  const isOrganizer = useMemo(() => {
    const me = session?.user;
    if (!me || !event?.organizer) return false;
    return String(event.organizer.user_id ?? event.organizer.id ?? '') === String(me.id ?? '') || event.organizer.username && event.organizer.username === me.username;
  }, [session?.user, event?.organizer]);

  // Load the real tiers for this event. Re-read after a sale, because the
  // remaining count on every card moved the moment a ticket was issued.
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    (async () => {
      setTiersLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${id}/ticket-types/`, {
          signal: controller.signal
        });
        const body = await res.json();
        setTiers(body?.data?.tiers || []);
      } catch {
        setTiers([]);
      } finally {
        setTiersLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id, tierRefresh]);
  const openBuy = tier => {
    setBuyTier(tier);
    setBuyPin('');
    setBuyQty(1);
    setBuyAnswers({});
    setBuyPeople([{ answers: {} }]);
    setBuyStep(1);
    setBuyError('');
    setBuyResult(null);
    setBuyOpen(true);
  };
  const closeBuy = () => {
    setBuyOpen(false);
    setBuyResult(null);
  };
  useEffect(() => {
    setBuyPeople(prev => {
      const next = [...prev];
      while (next.length < buyQty) next.push({ answers: {} });
      return next.slice(0, buyQty);
    });
  }, [buyQty]);
  const setBuyAnswer = (index, id, value) => setBuyPeople(prev => prev.map(
    (person, i) => (i === index
      ? { ...person, answers: { ...person.answers, [id]: value } }
      : person)));
  const totalCost = buyTier ? buyTier.price * buyQty : 0;
  const handleBuy = async () => {
    if (!buyTier) return;
    setBuyError('');
    if (totalCost > 0 && buyPin.length < 4) {
      setBuyError('Enter your 4-digit wallet PIN to authorise this payment.');
      return;
    }
    if (walletBalance !== null && totalCost > walletBalance) {
      setBuyError(`Insufficient wallet balance. Need ${totalCost.toLocaleString()} VC, have ${walletBalance.toLocaleString()} VC.`);
      return;
    }
    setBuyLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${id}/buy-ticket/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          tier_id: buyTier.id,
          quantity: buyQty,
          pin: buyPin,
          answers: buyAnswers,
          attendees: buyPeople.map(person => ({ answers: person.answers }))
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setBuyResult(data.data);
        if (typeof data.data.new_balance === 'number') {
          setWalletBalance(data.data.new_balance);
        }
        setBuyStep(3);
      } else {
        setBuyError(apiMessage(tt, data, "api.failedToPurchaseTicket", "Failed to purchase ticket."));
      }
    } catch (err) {
      setBuyError('Network error. Please try again.');
    } finally {
      setBuyLoading(false);
    }
  };
  const renderPage = content => <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>{content}</div>
      </main>
      <BottomMenu />
    </div>;
  if (loading) return renderPage(<p className={styles.stateText}>{tt("ui.loading.event.8f12", "Loading event…")}</p>);
  if (error || !event) return renderPage(<div className={styles.errorState}>
        <h2 className={styles.errorTitle}>{tt("ui.couldn't.load.event.e418", "Couldn't load event")}</h2>
        <p className={styles.errorSub}>{error || tx("Event not found.")}</p>
        <Link href="/events" className={`${styles.errorBtn} goldBTN`}>
          {tt("ui.back.events.bd9a", "Back to events")}
        </Link>
      </div>);
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Nothing for an ordinary reader. For an admin, the same edit the
              console offers, through the same endpoint. */}
          {event?.id && <AdminBar permission="manage_events" consoleHref="/admin/events" title={tt('admin.editEventTitle', 'Edit event')} fields={[{
          key: 'name',
          label: tt('admin.fieldTitle', 'Title')
        }, {
          key: 'desc',
          label: tt('admin.fieldDescription', 'Description')
        }, {
          key: 'location',
          label: tt('admin.fieldLocation', 'Location')
        }, {
          key: 'event_link',
          label: tt('admin.eventLink', 'Online link')
        }, {
          key: 'capacity',
          label: tt('admin.eventCapacity', 'Capacity')
        }, {
          key: 'start_date',
          label: tt('admin.fieldStart', 'Starts'),
          type: 'datetime-local'
        }, {
          key: 'end_date',
          label: tt('admin.fieldEnd', 'Ends'),
          type: 'datetime-local'
        }]} load={async () => {
          const at = v => v ? String(v).slice(0, 16) : '';
          return {
            name: event.name || '',
            desc: event.desc || event.description || '',
            location: event.location || '',
            event_link: event.event_link || '',
            capacity: event.capacity != null ? String(event.capacity) : '',
            start_date: at(event.start_date),
            end_date: at(event.end_date)
          };
        }} save={async payload => {
          payload = withLocalDatesAsISO(payload, ['start_date', 'end_date']);
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/edit-event/${event.id}/`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${session?.user?.sessionToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          return adminSaveResult(tt, await res.json());
        }} />}

          {/* Hero banner - only render the image when a real banner exists.
              An empty src makes next/image emit a preload warning and bleed the
              alt text over the card; the hero's own dark background fills in. */}
          <div className={styles.hero}>
            {event.banner_image || event.banner ? <Image src={mediaUrl(event.banner_image || event.banner)} alt={event.name} fill sizes="(min-width: 1024px) 70vw, 100vw" style={{
            objectFit: 'cover'
          }} priority unoptimized /> : null}
            <div className={styles.heroOverlay} />
            <div className={styles.heroContent}>
              <span className={`${styles.heroType} ${styles['type_' + event.event_type]}`}>
                {event.event_type}
              </span>
              <h1 className={styles.heroTitle}>{event.name}</h1>
              <div className={styles.heroMeta}>
                <span className={styles.metaItem}>
                  <IoCalendarOutline /> {formatDateTime(event.start_date)}
                </span>
                <span className={styles.metaItem}>
                  <IoLocationOutline /> {event.location}
                </span>
                <span className={styles.metaItem}>
                  <FaUsers /> {event.attendees_count?.toLocaleString() || 0} {tt("ui.attending.5ae7", "attending")}
                </span>
              </div>

              {countdown && !countdown.live && !countdown.ended && <div className={styles.countdown}>
                  <span className={styles.countdownLabel}>{tt("ui.starts.4ce3", "Starts in")}</span>
                  <div className={styles.countdownValues}>
                    <div className={styles.countdownCell}>
                      <span className={styles.countdownNum}>{countdown.days}</span>
                      <span className={styles.countdownUnit}>{tt("ui.days.5548", "days")}</span>
                    </div>
                    <div className={styles.countdownCell}>
                      <span className={styles.countdownNum}>{String(countdown.hours).padStart(2, '0')}</span>
                      <span className={styles.countdownUnit}>{tt("ui.hrs.a23c", "hrs")}</span>
                    </div>
                    <div className={styles.countdownCell}>
                      <span className={styles.countdownNum}>{String(countdown.minutes).padStart(2, '0')}</span>
                      <span className={styles.countdownUnit}>{tt("ui.min.b6c9", "min")}</span>
                    </div>
                    <div className={styles.countdownCell}>
                      <span className={styles.countdownNum}>{String(countdown.seconds).padStart(2, '0')}</span>
                      <span className={styles.countdownUnit}>{tt("ui.sec.920a", "sec")}</span>
                    </div>
                  </div>
                </div>}
              {countdown?.live && <div className={styles.liveBadge}>
                  <span className={styles.liveDot} /> {tt("ui.event.live.now.178b", "Event is live now")}
                </div>}
              {countdown?.ended && <div className={styles.endedBadge}>{tt("ui.event.has.ended.2027", "This event has ended")}</div>}

              <div className={styles.heroActions}>
                <button className={`${styles.heroPrimaryBtn} redBTN`} onClick={() => setActiveTab('tickets')} type="button">
                  <IoTicketOutline /> {tt("ui.get.tickets.0b90", "Get tickets")}
                </button>
                <Link href="/events/my-tickets" className={styles.heroSecondaryBtn}>
                  {tt("ui.my.tickets.5394", "My tickets")}
                </Link>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabRow}>
            {TABS.filter(t => !t.needsProgramme || hasProgramme).map(t => <button key={t.id} className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab(t.id)} type="button">
                {tx(t.label)}
              </button>)}
          </div>

          <div className={styles.tabContent}>
            {/* OVERVIEW */}
            {activeTab === 'overview' && <div className={styles.overviewGrid}>
                <div>
                  <h2 className={styles.sectionTitle}>{tt("ui.about.event.c0b4", "About this event")}</h2>
                  <p className={styles.body}>
                    {event.description || event.desc || tx("The organizer has not written a description for this event yet.")}
                  </p>

                  {eventSocials.length > 0 && <>
                      <h2 className={styles.sectionTitle} style={{
                  marginTop: '1.75rem'
                }}>
                        {tt("ui.connect.b654", "Connect")}
                      </h2>
                      <div className={styles.socialRow}>
                        {eventSocials.map(({
                    platform,
                    url,
                    Icon
                  }) => <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className={styles.socialBtn} aria-label={platform}>
                            <Icon />
                          </a>)}
                      </div>
                    </>}
                </div>

                <aside className={styles.sideCard}>
                  <p className={styles.sideLabel}>{tt("ui.organizer.debd", "Organizer")}</p>
                  {/* Editing your own event. The endpoint existed with nothing
                      calling it, so the only route to a mistyped venue was to
                      create the event again. */}
                  {isOrganizer && <Link href={`/events/${id}/edit`} className={styles.doorListLink}>
                      {tt("manage.editThisEvent", "Edit this event →")}
                    </Link>}
                  {isOrganizer && <Link href={`/events/${id}/attendees`} className={styles.doorListLink}>
                      {tt("ui.door.list.check.2f19", "Door list & check-in →")}
                    </Link>}
                  {/* The commercial side: influencer links, promo codes, and
                      who else may help run this. */}
                  {isOrganizer && <Link href={`/events/${id}/manage`} className={styles.doorListLink}>
                      {tt("manage.runThisEvent", "Influencers, promos & team →")}
                    </Link>}
                  <div className={styles.organizerRow}>
                    <div className={styles.organizerAvatar}>
                      <FaCrown />
                    </div>
                    <div>
                      <p className={styles.organizerName}>
                        {event.organizer?.full_name || event.organizer?.username || tx("V-ENT Live")}
                      </p>
                      <p className={styles.organizerSub}>
                        @{event.organizer?.username || 'v-ent'}
                      </p>
                    </div>
                  </div>

                  {[{
                key: 'sponsors',
                rows: eventSponsors,
                heading: tt("ui.sponsors.82ce", "Sponsors")
              }, {
                key: 'partners',
                rows: eventPartners,
                heading: tt("event.partnersHeading", "Partners")
              }].filter(group => group.rows.length > 0).map(group => <div key={group.key}>
                      <p className={styles.sideLabel} style={{
                  marginTop: '1.25rem'
                }}>
                        {group.heading}
                      </p>
                      <div className={styles.sponsorRow}>
                        {group.rows.map(sponsor => {
                    // Website first, then whatever social they gave. A logo
                    // that goes nowhere is a picture of a name.
                    const href = sponsor.website || sponsor.links?.[0]?.url || null;
                    const inner = sponsor.logo ? <img src={sponsor.logo} alt={sponsor.name} className={styles.sponsorLogo} /> : <span className={styles.sponsorChip}>
                              <FaStar className={styles.sponsorStar} /> {sponsor.name}
                            </span>;
                    return href ? <a key={sponsor.id || sponsor.name} href={href} target="_blank" rel="noopener noreferrer nofollow" className={styles.sponsorLink} title={sponsor.name}>
                              {inner}
                            </a> : <span key={sponsor.id || sponsor.name} className={styles.sponsorLink} title={sponsor.name}>
                              {inner}
                            </span>;
                  })}
                      </div>
                    </div>)}

                  <p className={styles.sideLabel} style={{
                marginTop: '1.25rem'
              }}>
                    {tt("ui.quick.stats.26ab", "Quick stats")}
                  </p>
                  <div className={styles.miniStats}>
                    <div className={styles.miniStatRow}>
                      <span>{tt("ui.capacity.45bd", "Capacity")}</span>
                      <strong>{event.capacity ? event.capacity.toLocaleString() : 'Unlimited'}</strong>
                    </div>
                    <div className={styles.miniStatRow}>
                      <span>{tt("ui.attending.969a", "Attending")}</span>
                      <strong>{(event.attendees_count || 0).toLocaleString()}</strong>
                    </div>
                    <div className={styles.miniStatRow}>
                      <span>{tt("ui.type.3deb", "Type")}</span>
                      <strong style={{
                    textTransform: 'capitalize'
                  }}>{event.event_type}</strong>
                    </div>
                    <div className={styles.miniStatRow}>
                      <span>{tt("ui.status.bae7", "Status")}</span>
                      <strong style={{
                    textTransform: 'capitalize'
                  }}>{event.status}</strong>
                    </div>
                  </div>
                </aside>
              </div>}

            {/* SCHEDULE - real sessions, or nothing at all */}
            {activeTab === 'schedule' && <div className={styles.scheduleTab}>
                <h2 className={styles.sectionTitle}>{tt("ui.event.schedule.1878", "Event schedule")}</h2>
                <EventSchedule eventRef={id} />
              </div>}

            {/* TICKETS */}
            {activeTab === 'tickets' && <div className={styles.ticketTab}>
                <div className={styles.ticketHeaderRow}>
                  <div>
                    <h2 className={styles.sectionTitle}>{tt("ui.buy.tickets.029a", "Buy tickets")}</h2>
                    <p className={styles.body}>
                      {countdown?.ended
                  ? tx("This event has ended, so tickets are no longer on sale.")
                  : session?.user?.sessionToken
                    ? tx("Pick your tier. Payment is deducted from your V-ENT wallet.")
                    /* Somebody signed out has no wallet, so promising one is a
                       lie about how they are about to be charged. */
                    : tx("Pick your tier. No account needed.")}
                    </p>
                  </div>
                  {walletBalance !== null && <div className={styles.walletPill}>
                      {tt("ui.wallet.9ab9", "Wallet:")} <strong>{walletBalance.toLocaleString()} VC</strong>
                    </div>}
                </div>

                {/* Sold out is where somebody needs the queue, so it is offered
                    here rather than on a page they would have to find. It draws
                    nothing at all while tickets are still on sale. */}
                <EventWaitlist
                  eventRef={id}
                  token={session?.user?.sessionToken}
                  soldOut={tiers.length > 0 && tiers.every(x => x.sold_out || x.available <= 0)}
                />

                {/* Signed out, buying anyway. A sign-in wall in front of a
                    checkout is how a one-off ticket sale is lost: the account
                    it would have gained never comes back, and the sale does not
                    happen either. Signing in is offered inside the form,
                    after it, for somebody who has a wallet. */}
                {!session?.user?.sessionToken && guestTier && <GuestCheckout
                  eventRef={id}
                  tier={guestTier}
                  onDone={() => setTierRefresh(n => n + 1)}
                  onClose={() => setGuestTier(null)}
                />}

                <div className={styles.tierGrid}>
                  {tickets.map(t => <div key={t.id} className={`${styles.tierCard} ${styles['tierCard_' + t.tier]}`}>
                      <div className={styles.tierHeader}>
                        <span className={`${styles.tierBadge} ${styles['badge_' + t.tier]}`}>
                          {t.tier === 'vip' ? 'VIP' : t.tier === 'backstage' ? 'BACKSTAGE' : 'GA'}
                        </span>
                        <p className={styles.tierName}>{t.name}</p>
                      </div>
                      <p className={styles.tierPrice}>
                        {t.price.toLocaleString()} VC
                        <span className={styles.tierUnit}>{tt("ui.ticket.de25", "/ ticket")}</span>
                        {/* What that is worth in the reader's own money. Shown as
                            an approximation on purpose: the charge is settled in
                            VENT COINS, and presenting this as the billed amount
                            would be a lie about somebody's money. */}
                        {(() => {
                    const {
                      converted
                    } = price(t.price_ngn, 'NGN', language);
                    return converted ? <span className={styles.tierApprox}>
                              {tt("money.approx", "about {amount}").replace('{amount}', converted)}
                            </span> : null;
                  })()}
                      </p>
                      <ul className={styles.perkList}>
                        {t.perks.map(p => <li key={p}>
                            <FaCheckCircle className={styles.perkIcon} /> {p}
                          </li>)}
                      </ul>
                      <p className={styles.tierStock}>
                        {t.available > 0 ? `${t.available} remaining` : tx("Sold out")}
                      </p>
                      <button className={`${styles.tierBuyBtn} ${t.tier === 'general' ? 'goldBTN' : 'redBTN'}`} disabled={t.available === 0 || countdown?.ended || sessionStatus === 'loading'} onClick={() => {
                  // Which checkout somebody gets must not depend on a race.
                  // While the session is still resolving there is no token
                  // yet, and deciding on that would send a signed-in member to
                  // the guest form: asked for an email they already gave, and
                  // handed a ticket detached from the account they were logged
                  // into. Wait for the answer instead.
                  if (sessionStatus === 'loading') return;
                  if (session?.user?.sessionToken) openBuy(t);
                  else setGuestTier(t);
                }} type="button">
                        {countdown?.ended ? tx("Event over") : t.available === 0 ? tx("Sold out") : tx("Buy ticket")}
                      </button>
                    </div>)}
                </div>
              </div>}

            {/* VENDORS */}
            {activeTab === 'vendors' && <div className={styles.vendorTab}>
                <div className={styles.ticketHeaderRow}>
                  <div>
                    <h2 className={styles.sectionTitle}>{tt("ui.vendor.zone.2061", "Vendor zone")}</h2>
                    <p className={styles.body}>
                      {tt("ui.browse.site.vendors.click.9204", "Browse on-site vendors. Click any vendor to view products and add to cart.")}
                    </p>
                  </div>
                  <Link href={`/events/${event.slug || event.id}/vendor-shop`} className={styles.viewAllLink}>
                    {tt("ui.view.vendor.shop.2a70", "View vendor shop")} <FiExternalLink />
                  </Link>
                </div>

                {vendors.length === 0 ? <p className={styles.body}>{tt("ui.no.vendors.confirmed.yet.d9c7", "No vendors confirmed yet.")}</p> : <div className={styles.vendorGrid}>
                    {vendors.map(v => <Link key={v.id} href={`/events/vendor-shop/vendor?event=${event.id}&vendor=${v.id}`} className={styles.vendorCard}>
                        <div className={styles.vendorLogoWrap}>
                          {v.logo ? <Image src={mediaUrl(v.logo)} alt={v.name} width={56} height={56} className={styles.vendorLogo} unoptimized /> : <div className={styles.vendorLogoFallback}><FaStore /></div>}
                        </div>
                        <div>
                          <p className={styles.vendorName}>{v.name}</p>
                          <p className={styles.vendorSub}>
                            {v.category} {tt("ui.booth.9c19", "• Booth")} {v.booth}
                          </p>
                        </div>
                      </Link>)}
                  </div>}
              </div>}

            {/* TOURNAMENTS */}
            {activeTab === 'tournaments' && <div className={styles.tournamentsTab}>
                <div className={styles.ticketHeaderRow}>
                  <div>
                    <h2 className={styles.sectionTitle}>{tt("ui.tournaments.event.9a0c", "Tournaments at this event")}</h2>
                    <p className={styles.body}>
                      {isOrganizer ? tx("Attach tournaments you run. Turn on shared ticketing and a ticket to this event pays the entry fee.") : tx("Brackets running inside the event. Entry is separate unless the organizer covers it with your ticket.")}
                    </p>
                  </div>
                  {isOrganizer && !linkPanelOpen && <button type="button" className={styles.linkOpenBtn} onClick={openLinkPanel}>
                      {tt("ui.link.tournament.4020", "Link a tournament")}
                    </button>}
                </div>

                {isOrganizer && linkPanelOpen && <div className={styles.linkPanel}>
                    <div className={styles.linkPanelHead}>
                      <p className={styles.linkPanelTitle}>{tt("ui.tournaments.6ffe", "Your tournaments")}</p>
                      <button type="button" className={styles.linkPanelClose} onClick={() => setLinkPanelOpen(false)} aria-label={tt("ui.close.tournament.picker.66b4", "Close the tournament picker")}>
                        <MdOutlineClose />
                      </button>
                    </div>
                    {linkableLoading ? <p className={styles.linkPanelNote}>{tt("ui.loading.tournaments.bd01", "Loading your tournaments...")}</p> : linkable.length === 0 ? <p className={styles.linkPanelNote}>
                        {tt("ui.nothing.available.published.tournaments.0d00", "Nothing available. Published tournaments you created that are not\n                        already part of an event show up here.")}
                      </p> : <ul className={styles.linkList}>
                        {linkable.map(t => <li key={t.id} className={styles.linkRow}>
                            <div>
                              <p className={styles.linkRowName}>{t.name}</p>
                              <p className={styles.linkRowMeta}>
                                {t.game} · {formatDate(t.start_date)} ·{' '}
                                {Number(t.entry_fee_vc || 0) > 0 ? `${Number(t.entry_fee_vc).toLocaleString()} VC entry` : tx("Free entry")}
                              </p>
                            </div>
                            <button type="button" className={styles.linkRowBtn} disabled={linkBusyId === t.id} onClick={() => linkTournament(t.id)}>
                              {linkBusyId === t.id ? tx("Linking...") : 'Link'}
                            </button>
                          </li>)}
                      </ul>}
                  </div>}

                {linkError && <p className={styles.linkError}>{linkError}</p>}

                {tournamentsLoading ? <p className={styles.body}>{tt("ui.loading.tournaments.9a49", "Loading tournaments...")}</p> : linkedTournaments.length === 0 ? <div className={styles.emptyInner}>
                    <FaTrophy className={styles.emptyInnerIcon} />
                    <p className={styles.emptyInnerTitle}>{tt("ui.no.tournaments.linked.091e", "No tournaments linked.")}</p>
                    <p className={styles.emptyInnerSub}>
                      {isOrganizer ? tx("Link one above and it shows up here for attendees.") : tx("This event is a showcase, panel or concert.")}
                    </p>
                  </div> : <div className={styles.tournamentGrid}>
                    {linkedTournaments.map(t => <div key={t.id} className={styles.tournamentCard}>
                        <Link href={`/tournaments/${t.slug || t.id}`} className={styles.tournamentCardLink}>
                          <div className={styles.tournamentImgWrap}>
                            {(t.banner_image || t.banner) && <Image src={mediaUrl(t.banner_image || t.banner)} alt={t.name} fill sizes="(min-width: 1024px) 30vw, 100vw" style={{
                      objectFit: 'cover'
                    }} unoptimized />}
                          </div>
                          <div className={styles.tournamentBody}>
                            <p className={styles.tournamentGame}>{t.game}</p>
                            <p className={styles.tournamentName}>{t.name}</p>
                            <div className={styles.tournamentStats}>
                              <span>
                                <FaTrophy /> {Number(t.prize_pool || 0).toLocaleString()} VC
                              </span>
                              <span>
                                <FaUsers /> {t.current_participants}/{t.max_participants}
                              </span>
                            </div>
                            {t.entry_covered_by_ticket ? <p className={styles.coveredNote}>
                                <IoTicketOutline /> {tt("ui.event.ticket.covers.entry.9cea", "Your event ticket covers entry")}
                              </p> : t.shared_ticketing ? <p className={styles.sharedNote}>
                                <IoTicketOutline /> {tt("ui.entry.free.event.ticket.6628", "Entry is free with an event ticket")}
                              </p> : null}
                          </div>
                        </Link>
                        {isOrganizer && <div className={styles.tournamentAdminRow}>
                            <button type="button" className={t.shared_ticketing ? styles.sharedToggleOn : styles.sharedToggleOff} disabled={linkBusyId === t.id} onClick={() => setSharedTicketing(t.id, !t.shared_ticketing)}>
                              {t.shared_ticketing ? tx("Shared ticketing on") : tx("Shared ticketing off")}
                            </button>
                            <button type="button" className={styles.unlinkBtn} disabled={linkBusyId === t.id} onClick={() => unlinkTournament(t.id)}>
                              {linkBusyId === t.id ? tx("Working...") : 'Unlink'}
                            </button>
                          </div>}
                      </div>)}
                  </div>}
              </div>}

            {/* MAP */}
            {activeTab === 'map' && <div className={styles.mapTab}>
                <div className={styles.ticketHeaderRow}>
                  <div>
                    <h2 className={styles.sectionTitle}>{tt("ui.venue.map.6100", "Venue map")}</h2>
                    <p className={styles.body}>
                      {tt("ui.floor.plan.venue.booths.fef3", "Floor plan of the venue. Booths are colour-coded by zone.")}
                    </p>
                  </div>
                </div>
                <div className={styles.mapWrap}>
                  <svg className={styles.mapSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
                    <rect x="0" y="0" width="100" height="100" className={styles.mapBg} />
                    {VENUE_BOOTHS.map(b => <g key={b.id}>
                        <rect x={b.x} y={b.y} width={b.w} height={b.h} className={`${styles.booth} ${styles['booth_' + b.type]}`} rx="0.6" />
                        <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 1} className={styles.boothLabel} textAnchor="middle" dominantBaseline="middle">
                          {b.name}
                        </text>
                      </g>)}
                  </svg>
                  <div className={styles.mapLegend}>
                    {[{
                  type: 'stage',
                  label: 'Stage'
                }, {
                  type: 'esports',
                  label: 'Esports'
                }, {
                  type: 'vendor',
                  label: 'Vendor'
                }, {
                  type: 'food',
                  label: 'Food'
                }, {
                  type: 'studio',
                  label: 'Studio'
                }, {
                  type: 'vip',
                  label: 'VIP'
                }, {
                  type: 'entry',
                  label: 'Entry'
                }].map(l => <span key={l.type} className={styles.legendItem}>
                        <span className={`${styles.legendSwatch} ${styles['booth_' + l.type]}`} />
                        {tx(l.label)}
                      </span>)}
                  </div>
                </div>
              </div>}
          </div>
        </div>
      </main>

      <BottomMenu />

      {/* Buy ticket modal */}
      {buyOpen && buyTier && <div className={styles.modalOverlay} onClick={e => {
      if (e.target === e.currentTarget) closeBuy();
    }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {buyStep === 3 ? tx("Ticket secured")
                  : tt('buy.title', 'Buy {tier}').replace('{tier}', buyTier.name)}
              </h2>
              <button className={styles.modalClose} onClick={closeBuy} type="button">
                <MdOutlineClose />
              </button>
            </div>

            {buyStep === 1 && <div className={styles.modalBody}>
                <p className={styles.modalLabel}>{tt("ui.quantity.44f6", "Quantity")}</p>
                <div className={styles.qtyRow}>
                  <button className={styles.qtyBtn} onClick={() => setBuyQty(q => Math.max(1, q - 1))} type="button">−</button>
                  <span className={styles.qtyValue}>{buyQty}</span>
                  <button className={styles.qtyBtn} onClick={() => setBuyQty(q => Math.min(10, q + 1))} type="button">+</button>
                </div>

                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>{tt("ui.tier.5bd4", "Tier")}</span>
                  <span className={styles.confirmValue}>{buyTier.name}</span>
                </div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>{tt("ui.price.3e82", "Price")}</span>
                  <span className={styles.confirmValue}>
                    {buyTier.price.toLocaleString()} VC × {buyQty}
                  </span>
                </div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>{tt("ui.total.b259", "Total")}</span>
                  <span className={`${styles.confirmValue} ${styles.confirmGreen}`}>
                    {totalCost.toLocaleString()} VC
                  </span>
                </div>
                {walletBalance !== null && <div className={styles.confirmRow}>
                    <span className={styles.confirmLabel}>{tt("ui.wallet.balance.f6c5", "Wallet balance")}</span>
                    <span className={styles.confirmValue}>
                      {walletBalance.toLocaleString()} VC
                    </span>
                  </div>}

                {askPerOrder.length > 0 && <div className={styles.askBlock}>
                    <CheckoutFieldList fields={askPerOrder} values={buyAnswers}
                      onChange={(fid, value) => setBuyAnswers(a => ({ ...a, [fid]: value }))} />
                  </div>}

                {askPerTicket.length > 0 && buyPeople.map((person, index) => <div key={index} className={styles.askBlock}>
                      {buyQty > 1 && <p className={styles.modalLabel}>
                        {tt('guest.ticketN', 'Ticket {n}').replace('{n}', index + 1)}
                      </p>}
                      <CheckoutFieldList fields={askPerTicket} values={person.answers}
                        onChange={(fid, value) => setBuyAnswer(index, fid, value)} />
                    </div>)}

                {buyError && <p className={styles.modalError}>{buyError}</p>}

                <button className={`${styles.modalPrimaryBtn} redBTN`} onClick={() => {
              const missing = missingRequired(askFields, buyAnswers, buyPeople);
              if (missing) {
                setBuyError(tt('guest.answerNeeded', '{label} is needed.')
                  .replace('{label}', missing.label));
                return;
              }
              setBuyError('');
              setBuyStep(2);
            }} type="button">
                  {tt("ui.continue.2e02", "Continue")}
                </button>
              </div>}

            {buyStep === 2 && <div className={styles.modalBody}>
                <p className={styles.body} style={{
            marginBottom: '0.5rem'
          }}>
                  {tt("ui.confirm.payment.19b4", "Confirm payment for")} <strong>{event.name}</strong> - {buyTier.name} × {buyQty}.
                </p>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>{tt("ui.pay.2d77", "You pay")}</span>
                  <span className={`${styles.confirmValue} ${styles.confirmGreen}`}>
                    {totalCost.toLocaleString()} VC
                  </span>
                </div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>{tt("ui.method.8830", "Method")}</span>
                  <span className={styles.confirmValue}>{tt("ui.v.ent.wallet.2bc6", "V-ENT Wallet")}</span>
                </div>
                {totalCost > 0 && <div className={styles.confirmRow} style={{
            display: 'block'
          }}>
                    <label className={styles.confirmLabel} htmlFor="event-buy-pin">{tt("ui.wallet.pin.2cdf", "Wallet PIN")}</label>
                    <input id="event-buy-pin" type="password" inputMode="numeric" maxLength={6} className={styles.pinInput} placeholder="••••" value={buyPin} onChange={e => setBuyPin(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="off" />
                  </div>}
                {buyError && <p className={styles.modalError}>{buyError}</p>}
                <button className={`${styles.modalPrimaryBtn} redBTN`} onClick={handleBuy} disabled={buyLoading} type="button">
                  {buyLoading ? tx("Processing…") : tx("Pay with wallet")}
                </button>
                <button className={styles.modalSecondaryBtn} onClick={() => setBuyStep(1)} type="button">
                  {tt("ui.back.b52b", "Back")}
                </button>
              </div>}

            {buyStep === 3 && <div className={styles.modalBody}>
                <div className={styles.successIcon}>
                  <FaCheckCircle />
                </div>
                <p className={styles.successTitle}>{tt("ui.payment.successful.8ea2", "Payment successful")}</p>
                <p className={styles.successSub}>
                  {buyQty} × {buyTier.name} for {event.name}
                </p>
                {buyResult?.qr_code && <p className={styles.qrCode}>QR: {buyResult.qr_code}</p>}
                {typeof buyResult?.new_balance === 'number' && <p className={styles.successSub}>
                    {tt("ui.new.balance.7b25", "New balance:")} {Number(buyResult.new_balance).toLocaleString()} VC
                  </p>}
                <Link href="/events/my-tickets" className={`${styles.modalPrimaryBtn} goldBTN`} style={{
            display: 'inline-flex',
            justifyContent: 'center',
            textDecoration: 'none'
          }}>
                  {tt("ui.view.my.tickets.af51", "View my tickets")}
                </Link>
                <button className={styles.modalSecondaryBtn} onClick={closeBuy} type="button">
                  {tt("ui.close.bbfa", "Close")}
                </button>
              </div>}
          </div>
        </div>}
    </div>;
};
const ViewEvent = () => {
  const tt = useT();
  return <Suspense fallback={<div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>{tt("ui.loading.event.8f12", "Loading event…")}</p>
          </div>
        </main>
        <BottomMenu />
      </div>}>
    <ViewEventContent />
  </Suspense>;
};
export default ViewEvent;