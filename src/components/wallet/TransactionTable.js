'use client';

import { useState, Fragment } from 'react';
import { CiSearch } from 'react-icons/ci';
import { TiArrowSortedDown } from 'react-icons/ti';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import {
  TYPE_LABEL,
  TYPE_BADGE_CLASS,
  STATUS_LABEL,
  normalizeType,
  normalizeStatus,
  formatDate,
  formatDateTime,
  formatNumber,
  isCreditType,
} from './walletHelpers';
import styles from '@/app/wallets/wallets.module.css';

const TYPE_FILTERS = [
  { id: '', label: 'All' },
  { id: 'top_up', label: 'Top-ups' },
  { id: 'send', label: 'Sends' },
  { id: 'receive', label: 'Receives' },
  { id: 'prize', label: 'Prizes' },
  { id: 'withdrawal', label: 'Withdrawals' },
  { id: 'fee', label: 'Fees' },
];

const STATUS_OPTIONS = [
  { id: '', label: 'All status' },
  { id: 'completed', label: 'Completed' },
  { id: 'pending', label: 'Pending' },
  { id: 'failed', label: 'Failed' },
];

/**
 * Shared transaction table - drives the overview preview AND the deeper
 * /wallets/history page. Filters mirror the wallet.html mockup and write to
 * the URL via the optional onFiltersChange callback.
 */
const TransactionTable = ({
  transactions,
  loading,
  showFilters = true,
  showAdvancedFilters = false,
  showPagination = true,
  rowsPerPage = 8,
  initial = {},
  onFiltersChange,
  emptyText = 'No transactions yet.',
}) => {
  const [search, setSearch] = useState(initial.search || '');
  const [typeFilter, setTypeFilter] = useState(initial.type || '');
  const [statusFilter, setStatusFilter] = useState(initial.status || '');
  const [dateFrom, setDateFrom] = useState(initial.from || '');
  const [dateTo, setDateTo] = useState(initial.to || '');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);

  const notify = (next) => {
    if (typeof onFiltersChange === 'function') {
      onFiltersChange({
        search,
        type: typeFilter,
        status: statusFilter,
        from: dateFrom,
        to: dateTo,
        ...next,
      });
    }
  };

  const handleSearch = (v) => {
    setSearch(v); setPage(1); notify({ search: v });
  };
  const handleType = (v) => {
    setTypeFilter(v); setPage(1); notify({ type: v });
  };
  const handleStatus = (v) => {
    setStatusFilter(v); setPage(1); notify({ status: v });
  };
  const handleFrom = (v) => {
    setDateFrom(v); setPage(1); notify({ from: v });
  };
  const handleTo = (v) => {
    setDateTo(v); setPage(1); notify({ to: v });
  };

  const filtered = (transactions || []).filter((tx) => {
    const ntype = normalizeType(tx.type || tx.transaction_type);
    const nstatus = normalizeStatus(tx.status);
    const desc = String(tx.description || tx.name || '').toLowerCase();
    const ref = String(tx.reference || tx.ref || '').toLowerCase();
    const counter = String(tx.counterparty || '').toLowerCase();
    const q = search.toLowerCase().trim();

    if (typeFilter && ntype !== typeFilter) return false;
    if (statusFilter && nstatus !== statusFilter) return false;
    if (q && !(desc.includes(q) || ref.includes(q) || counter.includes(q))) return false;

    if (dateFrom) {
      const d = new Date(tx.created_at || tx.date || tx.requested_at);
      if (!Number.isNaN(d.getTime()) && d < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const d = new Date(tx.created_at || tx.date || tx.requested_at);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (!Number.isNaN(d.getTime()) && d > to) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / rowsPerPage), 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * rowsPerPage;
  const end = Math.min(start + rowsPerPage, total);
  const slice = filtered.slice(start, end);

  const toggleExpand = (id) => setExpanded((curr) => (curr === id ? null : id));

  const renderBadge = (tx) => {
    const ntype = normalizeType(tx.type || tx.transaction_type);
    const cls = styles[TYPE_BADGE_CLASS[ntype] || 'badgeWithdraw'];
    return <span className={`${styles.txBadge} ${cls}`}>{TYPE_LABEL[ntype] || ntype}</span>;
  };

  const renderStatus = (tx) => {
    const ns = normalizeStatus(tx.status);
    const cls =
      ns === 'completed' ? styles.statusCompleted :
      ns === 'pending' ? styles.statusPending :
      ns === 'failed' ? styles.statusFailed : '';
    return <span className={`${styles.txStatus} ${cls}`}>{STATUS_LABEL(tx.status)}</span>;
  };

  const renderAmount = (tx) => {
    const credit = isCreditType(tx.type || tx.transaction_type);
    const amt = Math.abs(Number(tx.amount || tx.amount_vc || 0));
    const cls = credit ? styles.amtCredit : styles.amtDebit;
    return (
      <span className={cls}>
        {credit ? '+' : '-'}{formatNumber(amt)} VC
      </span>
    );
  };

  return (
    <div>
      {showFilters && (
        <>
          {/* Type chip group */}
          <div className={styles.chipGroup}>
            {TYPE_FILTERS.map((t) => (
              <button
                key={t.id || 'all'}
                type="button"
                className={`${styles.chip} ${typeFilter === t.id ? styles.chipActive : ''}`}
                onClick={() => handleType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search + (optional) advanced filters */}
          <div className={styles.sectionRow}>
            <div className={styles.sectionControls}>
              <div className={styles.ctrlSearch}>
                <CiSearch className={styles.ctrlSearchIcon} />
                <input
                  type="text"
                  className={styles.ctrlSearchInput}
                  placeholder="Search description or reference…"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              {showAdvancedFilters && (
                <>
                  <input
                    type="date"
                    className={styles.ctrlDateInput}
                    value={dateFrom}
                    onChange={(e) => handleFrom(e.target.value)}
                    aria-label="From date"
                  />
                  <input
                    type="date"
                    className={styles.ctrlDateInput}
                    value={dateTo}
                    onChange={(e) => handleTo(e.target.value)}
                    aria-label="To date"
                  />
                </>
              )}
              <div className={styles.ctrlSelectWrap}>
                <select
                  className={styles.ctrlSelect}
                  value={statusFilter}
                  onChange={(e) => handleStatus(e.target.value)}
                  aria-label="Status filter"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.id || 'all'} value={s.id}>{s.label}</option>
                  ))}
                </select>
                <TiArrowSortedDown className={styles.ctrlSelectCaret} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop table + Mobile cards */}
      <div className={styles.txTableWrap}>
        {loading ? (
          <p className={styles.txLoading}>Loading transactions…</p>
        ) : total === 0 ? (
          <p className={styles.txEmpty}>{emptyText}</p>
        ) : (
          <>
            <table className={styles.txTable}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((tx, i) => {
                  const id = tx.id || `${i}-${tx.reference || tx.created_at || ''}`;
                  const isOpen = expanded === id;
                  return (
                    <Fragment key={id}>
                      <tr
                        className={isOpen ? styles.expanded : ''}
                        onClick={() => toggleExpand(id)}
                      >
                        <td>{renderBadge(tx)}</td>
                        <td>
                          <div className={styles.txName}>{tx.description || tx.name || '-'}</div>
                          {tx.counterparty && tx.counterparty !== 'V-ENT Treasury' && (
                            <div className={styles.txRef}>{tx.counterparty}</div>
                          )}
                        </td>
                        <td>
                          <span className={styles.txRef}>{tx.reference || tx.ref || '-'}</span>
                        </td>
                        <td>{formatDate(tx.created_at || tx.date || tx.requested_at)}</td>
                        <td>{renderStatus(tx)}</td>
                        <td>{renderAmount(tx)}</td>
                      </tr>
                      {isOpen && (
                        <tr className={styles.txDetailRow}>
                          <td colSpan={6}>
                            <div className={styles.txDetailGrid}>
                              <div className={styles.txDetailItem}>
                                <span className={styles.txDetailLabel}>Reference</span>
                                <span className={styles.txDetailValue}>{tx.reference || tx.ref || '-'}</span>
                              </div>
                              <div className={styles.txDetailItem}>
                                <span className={styles.txDetailLabel}>Submitted</span>
                                <span className={styles.txDetailValue}>{formatDateTime(tx.created_at || tx.date || tx.requested_at)}</span>
                              </div>
                              <div className={styles.txDetailItem}>
                                <span className={styles.txDetailLabel}>Method</span>
                                <span className={styles.txDetailValue}>{tx.method || 'Wallet (internal)'}</span>
                              </div>
                              {tx.counterparty && (
                                <div className={styles.txDetailItem}>
                                  <span className={styles.txDetailLabel}>Counterparty</span>
                                  <span className={styles.txDetailValue}>{tx.counterparty}</span>
                                </div>
                              )}
                              {(tx.balance_after != null) && (
                                <div className={styles.txDetailItem}>
                                  <span className={styles.txDetailLabel}>Balance after</span>
                                  <span className={styles.txDetailValue}>{formatNumber(tx.balance_after)} VC</span>
                                </div>
                              )}
                              {tx.amount_ngn != null && (
                                <div className={styles.txDetailItem}>
                                  <span className={styles.txDetailLabel}>NGN equivalent</span>
                                  <span className={styles.txDetailValue}>₦{formatNumber(tx.amount_ngn)}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            <div className={styles.txCardList}>
              {slice.map((tx, i) => {
                const id = tx.id || `${i}-${tx.reference || tx.created_at || ''}`;
                const isOpen = expanded === id;
                const credit = isCreditType(tx.type || tx.transaction_type);
                return (
                  <div key={id} className={styles.txCard} onClick={() => toggleExpand(id)}>
                    <div className={styles.txCardTop}>
                      <div className={styles.txCardLeft}>
                        <div className={styles.txName}>{tx.description || tx.name || '-'}</div>
                        <div className={styles.txRef}>{tx.reference || tx.ref || '-'}</div>
                      </div>
                      <div className={styles.txCardRight}>
                        <div className={`${styles.txCardAmount} ${credit ? styles.amtCredit : styles.amtDebit}`}>
                          {credit ? '+' : '-'}{formatNumber(Math.abs(Number(tx.amount || tx.amount_vc || 0)))} VC
                        </div>
                        <div className={styles.txCardDate}>{formatDate(tx.created_at || tx.date || tx.requested_at)}</div>
                      </div>
                    </div>
                    <div className={styles.txCardBottom}>
                      {renderBadge(tx)}
                      {renderStatus(tx)}
                    </div>
                    {isOpen && (
                      <div className={styles.txCardDetail}>
                        <div className={styles.txCardDetailRow}>
                          <span className={styles.txCardDetailKey}>Submitted</span>
                          <span className={styles.txCardDetailVal}>{formatDateTime(tx.created_at || tx.date || tx.requested_at)}</span>
                        </div>
                        <div className={styles.txCardDetailRow}>
                          <span className={styles.txCardDetailKey}>Method</span>
                          <span className={styles.txCardDetailVal}>{tx.method || 'Wallet (internal)'}</span>
                        </div>
                        {tx.counterparty && (
                          <div className={styles.txCardDetailRow}>
                            <span className={styles.txCardDetailKey}>Counterparty</span>
                            <span className={styles.txCardDetailVal}>{tx.counterparty}</span>
                          </div>
                        )}
                        {tx.balance_after != null && (
                          <div className={styles.txCardDetailRow}>
                            <span className={styles.txCardDetailKey}>Balance after</span>
                            <span className={styles.txCardDetailVal}>{formatNumber(tx.balance_after)} VC</span>
                          </div>
                        )}
                        {tx.amount_ngn != null && (
                          <div className={styles.txCardDetailRow}>
                            <span className={styles.txCardDetailKey}>NGN equivalent</span>
                            <span className={styles.txCardDetailVal}>₦{formatNumber(tx.amount_ngn)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showPagination && total > 0 && (
        <div className={styles.pagination}>
          <span className={styles.pagInfo}>
            Showing {start + 1}-{end} of {total}
          </span>
          <div className={styles.pagBtns}>
            <button
              className={styles.pagBtn}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <BsChevronLeft />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`${styles.pagBtn} ${n === safePage ? styles.pagBtnActive : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              className={styles.pagBtn}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              <BsChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;
