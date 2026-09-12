'use client';

// What somebody bought at the stalls, and the code the stall reads back.
//
// `event/vendor-orders/` has answered since vendor shops were built and no
// screen ever asked it, so an order placed at a stall was invisible to the
// person who paid for it the moment the confirmation left the screen. The code
// is the whole point of the row: it is what is shown at the counter to collect
// what was paid for, so it is the largest thing on the card rather than a
// reference tucked underneath.

import { useCallback, useEffect, useState } from 'react';
import { LuPackage, LuStore } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import styles from './vendor-orders.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function VendorOrders({ token }) {
  const tt = useT();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setProblem('');
    try {
      const res = await fetch(`${API}/event/vendor-orders/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setOrders(body.data.orders || []);
      } else {
        setProblem(apiMessage(tt, body, 'orders.loadFailed',
          'Could not load what you bought at the stalls.'));
      }
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const statusWord = status => ({
    pending: tt('orders.pending', 'Waiting at the stall'),
    paid: tt('orders.paid', 'Paid, not collected yet'),
    collected: tt('orders.collected', 'Collected'),
    cancelled: tt('orders.cancelled', 'Cancelled'),
  }[status] || status);

  // Nothing bought is the ordinary case for most people, so it says nothing at
  // all rather than occupying the page with an empty box.
  if (!loading && !problem && orders.length === 0) return null;

  return (
    <section className={styles.wrap}>
      <h2 className={styles.title}>
        <LuStore aria-hidden="true" /> {tt('orders.title', 'Bought at the stalls')}
      </h2>
      <p className={styles.hint}>
        {tt('orders.hint', 'Show the code at the stall to collect what you paid for.')}
      </p>

      {loading && <p className={styles.state}>{tt('ui.loading.33ce', 'Loading…')}</p>}
      {problem && <p className={styles.problem} role="alert">{problem}</p>}

      <div className={styles.grid}>
        {orders.map(order => (
          <article key={order.id} className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.who}>
                <span className={styles.stall}>{order.vendor?.name}</span>
                {order.vendor?.booth && (
                  <span className={styles.booth}>
                    {tt('orders.booth', 'Stall {n}').replace('{n}', order.vendor.booth)}
                  </span>
                )}
              </div>
              <span className={`${styles.status} ${styles[`status_${order.status}`] || ''}`}>
                {statusWord(order.status)}
              </span>
            </div>

            <p className={styles.codeLabel}>{tt('orders.code', 'Collection code')}</p>
            <p className={styles.code}>{order.code}</p>

            <ul className={styles.items}>
              {(order.items || []).map(item => (
                <li key={item.product_id} className={styles.item}>
                  <span className={styles.itemName}>
                    <LuPackage aria-hidden="true" /> {item.name}
                  </span>
                  <span className={styles.itemQty}>x{item.quantity}</span>
                  <span className={styles.itemPrice}>
                    {formatNumber(item.line_vc)} VC
                  </span>
                </li>
              ))}
            </ul>

            <div className={styles.foot}>
              <span className={styles.total}>
                {tt('orders.total', 'Total')} {formatNumber(order.total_vc)} VC
              </span>
              <span className={styles.when}>
                {order.collected_at
                  ? tt('orders.collectedAt', 'Collected {when}')
                    .replace('{when}', formatDateTime(order.collected_at))
                  : formatDateTime(order.created_at)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
