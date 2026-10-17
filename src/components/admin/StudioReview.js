'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { adminToken } from '@/lib/adminToken';
import { useAutoRefresh } from '@/lib/useLiveData';
import { useAdminToast } from '@/components/admin/AdminToast';
import { studioStatus, studioStatusLabel } from '@/components/studio-portal/studioLabels';
import styles from './studio-review.module.css';

// Game studios on the Partners page of the console (design section 14).
//
// A game in the sandbox reaches only its own studio's test tournaments. Making
// it live lets it run real matches and link real people, so it is a decision
// of its own, made here by a super admin, with a note the studio reads on
// its game page. Games waiting for review come first.
//
// Its own component rather than more of the partners page: that page is
// already one long screen about API access, and this is a separate decision.

const API = process.env.NEXT_PUBLIC_API_URL;

export default function StudioReview() {
  const tt = useT();
  const toast = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [games, setGames] = useState([]);
  const [counts, setCounts] = useState({});
  const [open, setOpen] = useState('');
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`${API}/partners/admin/studios/`, {
        headers: { Authorization: `Bearer ${adminToken()}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiMessage(tt, body, 'partners.studios.admin.loadFailed', 'Studios did not load.'));
        return;
      }
      setGames(body.data?.games || []);
      setCounts(body.data?.counts || {});
      setError('');
    } catch (err) {
      setError(apiMessage(tt, err, 'partners.studios.admin.loadFailed', 'Studios did not load.'));
    } finally {
      setLoading(false);
    }
  }, [tt]);

  useAutoRefresh(() => load({ quiet: true }));
  useEffect(() => {
    load();
  }, [load]);

  const decide = async (game, decision) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/partners/admin/studios/${encodeURIComponent(game.slug)}/review/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: notes[game.slug] ?? game.review_note ?? '' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(apiMessage(tt, body, 'partners.studios.admin.failed', 'That was not saved.'));
        return;
      }
      toast.success(tt('partners.studios.admin.done', 'Saved.'));
      setOpen('');
      await load({ quiet: true });
    } catch (err) {
      toast.error(apiMessage(tt, err, 'partners.studios.admin.failed', 'That was not saved.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.wrap} aria-labelledby="studio-review-title">
      <h2 id="studio-review-title" className={styles.title}>{tt('partners.studios.admin.title', 'Game studios')}</h2>
      <p className={styles.muted}>
        {tt('partners.studios.admin.sub', 'Games connected through the partner programme. A game reaches real matches only once it is live.')}
      </p>

      <div className={styles.counts}>
        <div className={styles.count}>
          <span className={styles.countLabel}>{tt('partners.studios.admin.waiting', 'Waiting for review')}</span>
          <span className={styles.countValue}>{counts.requested ?? 0}</span>
        </div>
        <div className={styles.count}>
          <span className={styles.countLabel}>{tt('partners.studios.admin.live', 'Live')}</span>
          <span className={styles.countValue}>{counts.live ?? 0}</span>
        </div>
        <div className={styles.count}>
          <span className={styles.countLabel}>{tt('partners.studios.admin.sandbox', 'In the sandbox')}</span>
          <span className={styles.countValue}>{counts.sandbox ?? 0}</span>
        </div>
      </div>

      {loading && <p className={styles.muted}>{tt('ui.loading.b04b', 'Loading...')}</p>}
      {!loading && error && (
        <div className={styles.errorRow} role="alert">
          <p className={styles.error}>{error}</p>
          <button type="button" className={styles.ghost} onClick={() => load()}>
            {tt('common.tryAgain', 'Try again')}
          </button>
        </div>
      )}
      {!loading && !error && games.length === 0 && (
        <p className={styles.muted}>{tt('partners.studios.admin.empty', 'No games connected yet.')}</p>
      )}

      {!loading && !error && games.length > 0 && (
        <div className={styles.list}>
          {games.map(game => {
            const state = studioStatus(game);
            const isOpen = open === game.slug;
            return (
              <div key={game.slug} className={styles.row}>
                <div className={styles.rowHead}>
                  <div className={styles.rowText}>
                    <p className={styles.name}>{game.name}</p>
                    <p className={styles.muted}>
                      {game.partner?.name} · {game.game?.title || tt('partners.studios.noVentGame', 'No V-ENT game chosen')}
                    </p>
                  </div>
                  <span className={`${styles.chip} ${styles[`chip_${state}`] || ''}`}>{studioStatusLabel(tt, state)}</span>
                  <button type="button" className={styles.ghost} onClick={() => setOpen(isOpen ? '' : game.slug)}
                          aria-expanded={isOpen}>
                    {isOpen ? tt('partners.studios.admin.close', 'Close') : tt('partners.studios.admin.review', 'Review')}
                  </button>
                </div>
                {isOpen && (
                  <div className={styles.detail}>
                    <dl className={styles.meta}>
                      <div>
                        <dt>{tt('partners.studios.admin.webhook', 'Game session address')}</dt>
                        <dd>{game.session_webhook_url || tt('partners.studios.admin.none', 'None given')}</dd>
                      </div>
                      <div>
                        <dt>{tt('partners.studios.expression', 'Scoring expression')}</dt>
                        <dd><code>{game.scoring_expression}</code></dd>
                      </div>
                      <div>
                        <dt>{tt('partners.studios.admin.owner', 'Studio account')}</dt>
                        <dd>{game.partner?.owner || tt('partners.studios.admin.none', 'None given')}</dd>
                      </div>
                    </dl>
                    <label className={styles.field}>
                      <span className={styles.countLabel}>{tt('partners.studios.admin.note', 'Note to the studio')}</span>
                      <textarea className={styles.note} rows={2}
                                value={notes[game.slug] ?? game.review_note ?? ''}
                                onChange={e => setNotes({ ...notes, [game.slug]: e.target.value })} />
                    </label>
                    <div className={styles.actions}>
                      {state !== 'live' && (
                        <button type="button" className={styles.approve} disabled={busy} onClick={() => decide(game, 'approved')}>
                          {tt('partners.studios.admin.approve', 'Make it live')}
                        </button>
                      )}
                      {state === 'requested' && (
                        <button type="button" className={styles.reject} disabled={busy} onClick={() => decide(game, 'rejected')}>
                          {tt('partners.studios.admin.reject', 'Turn it down')}
                        </button>
                      )}
                      {state === 'live' && (
                        <button type="button" className={styles.reject} disabled={busy} onClick={() => decide(game, 'suspended')}>
                          {tt('partners.studios.admin.suspend', 'Take it off live')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
