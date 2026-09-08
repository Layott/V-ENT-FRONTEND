'use client';

// Every movement of money, in one list.
//
// CEO, 7 September 2026, from the admin dashboard spec: "view and manage all
// financial transactions on the platform, generate financial reports and
// analytics for various revenue streams, transfer funds between accounts,
// organizations, and users."
//
// The console had payouts and exchange rates. Both are one stream each; this
// is the ledger, and it reads people's wallets, teams' and organisations' from
// the same table, because a Transaction belongs to exactly one of the three
// and a database constraint says so.
//
// The report is downloaded from the API as a real file rather than built in
// the browser from what is on screen: the screen holds one page and the file
// holds the whole filter, and building it here would quietly ship a report
// that disagrees with the number beside it.

import { useCallback, useEffect, useState } from 'react';
import { useAutoRefresh } from '@/lib/useLiveData';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime, formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import DateField from '@/components/date-field/DateField';
import shared from '@/components/admin/admin.module.css';
import styles from './finance.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

function token() {
  return typeof window === 'undefined' ? '' : localStorage.getItem('adminToken') || '';
}

function FinanceInner() {
  const tt = useT();
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const toast = useAdminToast();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [type, setType] = useState('all');
  const [state, setState] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  // Moving money. Both ends are named, because "send to vermillion" is a
  // person, a team and an organisation on this platform and guessing wrong
  // sends somebody's money to a stranger with the same name.
  const [transferOpen, setTransferOpen] = useState(false);
  const [fromKind, setFromKind] = useState('user');
  const [fromRef, setFromRef] = useState('');
  const [toKind, setToKind] = useState('user');
  const [toRef, setToRef] = useState('');
  const [amount, setAmount] = useState('');
  const [why, setWhy] = useState('');
  const [sending, setSending] = useState(false);

  const query = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (kind !== 'all') params.set('kind', kind);
    if (type !== 'all') params.set('type', type);
    if (state !== 'all') params.set('status', state);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return params;
  }, [search, kind, type, state, from, to]);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!token()) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const params = query();
      params.set('page', String(page));
      const res = await fetch(`${API}/auth/admin/transactions/?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'api.couldNotLoad', 'Could not load transactions.'));
        if (!quiet) setRows([]);
      } else {
        setRows(body.data.results || []);
        setMeta(body.data);
        setError('');
      }
    } catch {
      // Never a bare await with no catch. A network failure with no catch is a
      // spinner that runs for ever, and it has done that on three pages here.
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
      if (!quiet) setRows([]);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [query, page, tt]);

  const loadSummary = useCallback(async () => {
    if (!token()) return;
    try {
      const res = await fetch(`${API}/auth/admin/finance/summary/?days=30`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const body = await res.json();
      if (res.ok && body.status === 'success') setSummary(body.data);
    } catch {
      // The summary is context, not the page. A failure here leaves the
      // ledger readable rather than replacing it with an error.
      setSummary(null);
    }
  }, []);

  useEffect(() => { load(); }, [load, tick]);
  useEffect(() => { loadSummary(); }, [loadSummary, tick]);

  // The ledger keeps itself current. A payout approved by somebody else, or a
  // ticket sold while this is open, should appear without a reload.
  //
  // Paused while the transfer box is up. That form moves money, and the rule
  // in useLiveData is explicit that nothing with a form in it refreshes
  // underneath the person filling it in.
  useAutoRefresh(
    () => { load({ quiet: true }); loadSummary(); },
    [],
    { interval: 30000, enabled: !transferOpen },
  );

  const download = async () => {
    try {
      const res = await fetch(`${API}/auth/admin/transactions/report.csv?${query()}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        toast.error(tt('adminFinance.reportFailed', 'The report did not download.'));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'vent-transactions.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(tt('adminFinance.reportReady', 'Report downloaded.'));
    } catch {
      toast.error(tt('api.networkProblem', 'The network is not answering. Try again.'));
    }
  };

  const moveFunds = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/admin/transfer-funds/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_kind: fromKind, from: fromRef.trim(),
          to_kind: toKind, to: toRef.trim(),
          amount: Number(amount), reason: why.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        toast.error(apiMessage(tt, body, 'api.couldNotSave', 'That did not save.'));
        return;
      }
      toast.success(tt('adminFinance.moved', 'Moved. It is on both statements.'));
      setTransferOpen(false);
      setFromRef(''); setToRef(''); setAmount(''); setWhy('');
      setTick((t) => t + 1);
    } catch {
      toast.error(tt('api.networkProblem', 'The network is not answering. Try again.'));
    } finally {
      setSending(false);
    }
  };

  if (authLoading) return null;

  const totals = meta?.totals || { credited_vc: 0, debited_vc: 0, net_vc: 0 };
  const pages = meta?.pages || 1;

  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`}
           onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)}
                     searchValue={search}
                     onSearch={(value) => { setSearch(value); setPage(1); }} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt('adminFinance.title', 'Money')}</h1>
              <p className={shared.pageSubtitle}>
                {tt('adminFinance.sub', 'Every movement on the platform, whoever holds the wallet.')}
              </p>
            </div>
            <div className={shared.pageActions}>
              <button type="button" className={`${shared.actBtn} ${shared.actView}`} onClick={download}>
                {tt('adminFinance.download', 'Download report')}
              </button>
              <button type="button" className={`${shared.actBtn} ${shared.actApprove}`}
                      onClick={() => setTransferOpen(true)}>
                {tt('adminFinance.transfer', 'Move funds')}
              </button>
            </div>
          </div>

          <div className={shared.statsGrid}>
            <div className={shared.card}>
              <p className={shared.metricLabel}>{tt('adminFinance.in', 'In, this filter')}</p>
              <p className={shared.metricValue}>{formatNumber(totals.credited_vc)} VC</p>
            </div>
            <div className={shared.card}>
              <p className={shared.metricLabel}>{tt('adminFinance.out', 'Out, this filter')}</p>
              <p className={shared.metricValue}>{formatNumber(totals.debited_vc)} VC</p>
            </div>
            <div className={shared.card}>
              <p className={shared.metricLabel}>{tt('adminFinance.net', 'Net')}</p>
              <p className={shared.metricValue}>{formatNumber(totals.net_vc)} VC</p>
            </div>
            <div className={shared.card}>
              <p className={shared.metricLabel}>{tt('adminFinance.lines', 'Lines')}</p>
              <p className={shared.metricValue}>{formatNumber(meta?.count || 0)}</p>
            </div>
          </div>

          {summary ? <div className={styles.streams}>
            <h2 className={shared.sectionTitle}>
              {tt('adminFinance.streams', 'The last 30 days, by stream')}
            </h2>
            <div className={styles.streamGrid}>
              {(summary.streams || []).filter((s) => s.lines > 0).map((stream) => <div key={stream.type} className={styles.stream}>
                <p className={shared.metricLabel}>{stream.label}</p>
                <p className={styles.streamValue}>{formatNumber(stream.total_vc)} VC</p>
                <p className={styles.streamNote}>
                  {tt('adminFinance.streamLines', '{n} lines').replace('{n}', formatNumber(stream.lines))}
                </p>
              </div>)}
              <div className={styles.stream}>
                <p className={shared.metricLabel}>{tt('adminFinance.tickets', 'Tickets sold')}</p>
                <p className={styles.streamValue}>{formatNumber(summary.tickets?.sold || 0)}</p>
                <p className={styles.streamNote}>
                  {tt('adminFinance.ticketRevenue', '{n} naira taken')
                    .replace('{n}', formatNumber(Number(summary.tickets?.revenue_ngn || 0)))}
                </p>
              </div>
              <div className={styles.stream}>
                <p className={shared.metricLabel}>{tt('adminFinance.payouts', 'Payouts')}</p>
                <p className={styles.streamValue}>{formatNumber(summary.payouts?.paid_vc || 0)} VC</p>
                <p className={styles.streamNote}>
                  {tt('adminFinance.payoutsPending', '{n} still waiting')
                    .replace('{n}', formatNumber(summary.payouts?.pending || 0))}
                </p>
              </div>
            </div>
          </div> : null}

          <div className={shared.filtersRow}>
            <select className={shared.filterSelect} value={kind}
                    onChange={(e) => { setKind(e.target.value); setPage(1); }}>
              <option value="all">{tt('adminFinance.anyHolder', 'Any wallet')}</option>
              <option value="user">{tt('adminFinance.people', 'People')}</option>
              <option value="team">{tt('adminFinance.teams', 'Teams')}</option>
              <option value="org">{tt('adminFinance.orgs', 'Organisations')}</option>
            </select>
            <select className={shared.filterSelect} value={type}
                    onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="all">{tt('adminFinance.anyType', 'Any kind')}</option>
              {(meta?.types || []).map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
            </select>
            <select className={shared.filterSelect} value={state}
                    onChange={(e) => { setState(e.target.value); setPage(1); }}>
              <option value="all">{tt('adminFinance.anyStatus', 'Any state')}</option>
              {(meta?.statuses || []).map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
            </select>
{/* DateField, never a native date input. The native control takes its
                format from the BROWSER's language, so a Portuguese reader gets
                mm/dd/yyyy under a Portuguese heading and nothing can change it. */}
            <DateField value={from} ariaLabel={tt('adminFinance.fromDate', 'From')}
                       placeholder={tt('adminFinance.fromDate', 'From')}
                       onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <DateField value={to} ariaLabel={tt('adminFinance.toDate', 'To')}
                       placeholder={tt('adminFinance.toDate', 'To')}
                       onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            <span className={shared.resultsCount}>
              {tt('adminFinance.count', '{n} lines').replace('{n}', formatNumber(meta?.count || 0))}
            </span>
          </div>

          {error ? <p className={shared.errorText}>{error}</p> : null}

          <div className={shared.card}>
            {loading ? <p className={shared.stateText}>{tt('ui.loading', 'Loading...')}</p>
              : rows.length === 0 ? <p className={shared.stateText}>
                  {tt('adminFinance.none', 'Nothing matches that. Widen the dates or clear a filter.')}
                </p>
              : <div className={shared.tableWrap}>
                  <table className={shared.table}>
                    <thead>
                      <tr>
                        <th>{tt('adminFinance.colWhen', 'When')}</th>
                        <th>{tt('adminFinance.colOwner', 'Whose')}</th>
                        <th className={shared.hideMobile}>{tt('adminFinance.colType', 'Kind')}</th>
                        <th>{tt('adminFinance.colAmount', 'Amount')}</th>
                        <th className={shared.hideMobile}>{tt('adminFinance.colWhat', 'What')}</th>
                        <th>{tt('adminFinance.colState', 'State')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => <tr key={row.id}>
                        <td>{formatDateTime(row.at)}</td>
                        <td><strong>{row.owner}</strong></td>
                        <td className={shared.hideMobile}>{row.type}</td>
                        <td className={row.amount < 0 ? styles.debit : styles.credit}>
                          {formatNumber(row.amount)} VC
                        </td>
                        <td className={shared.hideMobile}>{row.description}</td>
                        <td>
                          <span className={`${shared.badge} ${row.status === 'completed' ? shared.sApproved : row.status === 'pending' ? shared.sPending : shared.sRejected}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>}
          </div>

          {pages > 1 ? <div className={shared.pagination}>
            <span className={shared.paginationInfo}>
              {tt('adminFinance.page', 'Page {n} of {m}')
                .replace('{n}', String(page)).replace('{m}', String(pages))}
            </span>
            <div className={shared.paginationBtns}>
              <button type="button" className={shared.pageBtn} disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {tt('ui.previous', 'Previous')}
              </button>
              <button type="button" className={shared.pageBtn} disabled={page >= pages}
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}>
                {tt('ui.next', 'Next')}
              </button>
            </div>
          </div> : null}
        </main>
      </div>

      {transferOpen ? <div className={shared.modalOverlay}
                           onClick={(e) => { if (e.target === e.currentTarget) setTransferOpen(false); }}>
        <div className={shared.modal}>
          <h3 className={shared.modalTitle}>{tt('adminFinance.moveTitle', 'Move funds')}</h3>
          <p className={shared.modalSub}>
            {tt('adminFinance.moveSub', 'This writes both lines and lands on both statements, where the people holding those wallets can see it. Say why.')}
          </p>

          <select className={shared.modalInput} value={fromKind}
                  onChange={(e) => setFromKind(e.target.value)}>
            <option value="user">{tt('adminFinance.fromUser', 'From a person')}</option>
            <option value="team">{tt('adminFinance.fromTeam', 'From a team')}</option>
            <option value="org">{tt('adminFinance.fromOrg', 'From an organisation')}</option>
          </select>
          <input className={shared.modalInput} value={fromRef} autoComplete="off"
                 placeholder={tt('adminFinance.fromWho', 'Who it comes from')}
                 onChange={(e) => setFromRef(e.target.value)} />

          <select className={shared.modalInput} value={toKind}
                  onChange={(e) => setToKind(e.target.value)}>
            <option value="user">{tt('adminFinance.toUser', 'To a person')}</option>
            <option value="team">{tt('adminFinance.toTeam', 'To a team')}</option>
            <option value="org">{tt('adminFinance.toOrg', 'To an organisation')}</option>
          </select>
          <input className={shared.modalInput} value={toRef} autoComplete="off"
                 placeholder={tt('adminFinance.toWho', 'Who it goes to')}
                 onChange={(e) => setToRef(e.target.value)} />

          <input className={shared.modalInput} type="number" min={1} value={amount}
                 placeholder={tt('wallet.amount', 'How much, in VENT COINS')}
                 onChange={(e) => setAmount(e.target.value)} />
          <input className={shared.modalInput} value={why} maxLength={200}
                 placeholder={tt('adminFinance.moveWhy', 'Why this is being moved')}
                 onChange={(e) => setWhy(e.target.value)} />

          <div className={shared.modalActions}>
            <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                    onClick={() => setTransferOpen(false)}>
              {tt('ui.cancel', 'Cancel')}
            </button>
            <button type="button" className={`${shared.actBtn} ${shared.actApprove}`}
                    disabled={sending || !fromRef.trim() || !toRef.trim() || !amount || !why.trim()}
                    onClick={moveFunds}>
              {sending ? tt('wallet.sending', 'Sending...') : tt('adminFinance.moveDo', 'Move it')}
            </button>
          </div>
        </div>
      </div> : null}
    </div>;
}

export default function AdminFinancePage() {
  return <AdminToastProvider><FinanceInner /></AdminToastProvider>;
}
