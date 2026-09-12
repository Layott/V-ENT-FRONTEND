'use client';

// Memberships on the organisation console: what is sold, who is on it, what it
// earns and who is behind.
//
// Gate C3, and the "on the organisation console rather than a sixteenth tab
// nobody finds" half of it is the reason this is a component rather than a
// page. It mounts inside the existing manage screen next to Members, Invites
// and Teams, which is where somebody running an organisation already is.
//
// Two numbers are reported carefully, because both are easy to overstate:
//
//   - **Recurring revenue** counts only subscriptions that will actually be
//     charged again. Somebody who cancelled last week still has access and is
//     still on the list, and counting their payment would make every figure on
//     this screen larger than the money that arrives.
//   - **Owed** is summed from ledger lines, never from a stored total. A
//     running total drifts the first time a refund lands and there is then no
//     way to find out by how much.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import UserChip from '@/components/user-chip/UserChip';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatNgn } from '@/lib/currency';
import { formatDate, formatNumber } from '@/lib/datetime';
import styles from './org-memberships.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const BLANK = {
  name: '',
  tagline: '',
  description: '',
  member_content: '',
  price_ngn: '',
  interval: 'monthly',
  trial_days: '',
  status: 'draft',
  benefits: {},
};

const STATE_FALLBACK = {
  trialing: 'Free trial',
  active: 'Active',
  past_due: 'Payment failed',
  cancelled: 'Cancelled',
  expired: 'Ended',
};

const OrgMembershipsPanel = ({ orgSlug, token, canManage, onToast }) => {
  const tt = useT();

  const [overview, setOverview] = useState(null);
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState('');        // plan slug whose detail is open
  const [view, setView] = useState('members'); // members | payments
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState('');
  // Which payment is being refunded, and the reason typed for it. An
  // inline field rather than window.prompt: a native dialog cannot be
  // translated, does not look like the rest of the site, and is refused
  // outright in some contexts, which would leave the control dead.
  const [refunding, setRefunding] = useState(null);

  const say = (message) => {
    if (onToast) onToast(message);
  };

  const auth = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const load = useCallback(async () => {
    if (!orgSlug || !token) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, catalogueRes] = await Promise.all([
        fetch(`${API}/billing/org-overview/?org=${encodeURIComponent(orgSlug)}`,
          { headers: auth() }),
        fetch(`${API}/billing/catalogue/`),
      ]);
      const body = await overviewRes.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setError(apiMessage(tt, body, 'billing.couldNotLoadPlans',
          'The memberships could not be loaded.'));
        return;
      }
      setOverview(body.data);
      const cat = await catalogueRes.json().catch(() => ({}));
      // The catalogue is SENT, never held here as a second copy. Five label
      // maps for tournament formats is the fault this avoids.
      if (cat?.status === 'success') setCatalogue(cat.data.benefits || []);
    } catch (err) {
      setError(apiMessage(tt, err, 'billing.couldNotLoadPlans',
        'The memberships could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [orgSlug, token, auth, tt]);

  useEffect(() => { load(); }, [load]);

  const openPlan = async (slug, which) => {
    if (open === slug && view === which) { setOpen(''); setDetail(null); return; }
    setOpen(slug);
    setView(which);
    setDetail(null);
    const path = which === 'payments' ? 'invoices'
      : which === 'earnings' ? 'earnings' : 'members';
    try {
      const res = await fetch(
        `${API}/billing/plan/${encodeURIComponent(slug)}/${path}/`,
        { headers: auth() });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        say(apiMessage(tt, body, 'billing.couldNotLoadPlans',
          'The memberships could not be loaded.'));
        return;
      }
      setDetail(body.data);
    } catch (err) {
      say(apiMessage(tt, err, 'billing.couldNotLoadPlans',
        'The memberships could not be loaded.'));
    }
  };

  const startCreate = () => {
    setForm({ ...BLANK, __mode: 'create' });
    setFormError('');
  };

  const startEdit = (plan) => {
    setForm({
      __mode: 'edit',
      __slug: plan.slug,
      __hasMembers: (plan.members || 0) > 0,
      name: plan.name,
      tagline: plan.tagline || '',
      description: plan.description || '',
      member_content: plan.member_content || '',
      price_ngn: String(plan.price_ngn || 0),
      interval: plan.interval,
      trial_days: String(plan.trial_days || ''),
      status: plan.status,
      benefits: Object.fromEntries(
        (plan.benefits || []).map((b) => [b.key, b.value || 0])),
    });
    setFormError('');
  };

  const save = async () => {
    setBusy('save');
    setFormError('');
    const payload = {
      org: orgSlug,
      name: form.name,
      tagline: form.tagline,
      description: form.description,
      member_content: form.member_content,
      price_ngn: Number(form.price_ngn || 0),
      interval: form.interval,
      trial_days: Number(form.trial_days || 0),
      status: form.status,
      benefits: Object.entries(form.benefits).map(([key, value]) => ({ key, value })),
    };
    const url = form.__mode === 'create'
      ? `${API}/billing/plans/create/`
      : `${API}/billing/plan/${encodeURIComponent(form.__slug)}/edit/`;
    try {
      const res = await fetch(url, {
        method: 'POST', headers: auth(), body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setFormError(apiMessage(tt, body, 'billing.couldNotSavePlan',
          'That membership could not be saved.'));
        return;
      }
      say(form.__mode === 'create'
        ? tt('billing.planCreated', 'Membership created.')
        : tt('billing.planSaved', 'Membership saved.'));
      setForm(null);
      await load();
    } catch (err) {
      setFormError(apiMessage(tt, err, 'billing.couldNotSavePlan',
        'That membership could not be saved.'));
    } finally {
      setBusy('');
    }
  };

  const settle = async (slug) => {
    setBusy(`settle:${slug}`);
    try {
      const res = await fetch(
        `${API}/billing/plan/${encodeURIComponent(slug)}/settle/`,
        { method: 'POST', headers: auth(), body: JSON.stringify({}) });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        say(apiMessage(tt, body, 'billing.couldNotSettle',
          'That payout could not be made.'));
        return;
      }
      say(body.data.lines_paid
        ? tt('billing.settled', '{n} VENT COINS paid into the wallet.')
          .replace('{n}', formatNumber(body.data.amount_vc))
        : tt('billing.nothingToSettle', 'There was nothing left to pay out.'));
      await load();
    } catch (err) {
      say(apiMessage(tt, err, 'billing.couldNotSettle',
        'That payout could not be made.'));
    } finally {
      setBusy('');
    }
  };

  const endMembership = async (subToken) => {
    setBusy(`end:${subToken}`);
    try {
      const res = await fetch(`${API}/billing/subscription/${subToken}/end/`, {
        method: 'POST', headers: auth(), body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        say(apiMessage(tt, body, 'billing.couldNotDoThat', 'That could not be done.'));
        return;
      }
      say(tt('billing.membershipEnded',
        'That membership will not renew. They keep it to the end of the period.'));
      await openPlan(open, 'members');
      await load();
    } catch (err) {
      say(apiMessage(tt, err, 'billing.couldNotDoThat', 'That could not be done.'));
    } finally {
      setBusy('');
    }
  };

  const refund = async (invoiceToken, reason) => {
    // A refund with no reason is a line nobody can explain later, and it is
    // money leaving the organisation's own balance, so the reason is asked for
    // before anything moves rather than being optional.
    if (!reason || !reason.trim()) return;
    setBusy(`refund:${invoiceToken}`);
    try {
      const res = await fetch(`${API}/billing/invoice/${invoiceToken}/refund/`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        say(apiMessage(tt, body, 'billing.couldNotRefund',
          'That payment could not be refunded.'));
        return;
      }
      say(tt('billing.refunded', 'Refunded. The member has their coins back.'));
      setRefunding(null);
      await openPlan(open, 'payments');
      await load();
    } catch (err) {
      say(apiMessage(tt, err, 'billing.couldNotRefund',
        'That payment could not be refunded.'));
    } finally {
      setBusy('');
    }
  };

  if (loading) return <div className={styles.skeleton} />;

  if (error) {
    return (
      <div className={styles.error}>
        <span>{error}</span>
        <button type="button" className={`${styles.action} ${styles.actionQuiet}`}
                onClick={load}>
          {tt('common.tryAgain', 'Try again')}
        </button>
      </div>
    );
  }

  const plans = overview?.plans || [];

  return (
    <div className={styles.wrap}>
      <div className={styles.summary}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            {tt('billing.recurringMonthly', 'Coming in every month')}
          </span>
          <span className={styles.statValue}>
            {formatNumber(overview?.recurring_monthly_vc || 0)} VC
          </span>
          <span className={styles.statLabel}>
            {formatNgn((overview?.recurring_monthly_vc || 0) * 1000)}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            {tt('billing.owedToYou', 'Waiting to be paid out')}
          </span>
          <span className={styles.statValue}>
            {formatNumber(overview?.owed_vc || 0)} VC
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            {tt('billing.pastDueCount', 'Payments that failed')}
          </span>
          <span className={`${styles.statValue} ${
            overview?.past_due ? styles.statValueDue : ''}`}>
            {formatNumber(overview?.past_due || 0)}
          </span>
        </div>
        {canManage && !form ? (
          <button type="button" className={styles.action} onClick={startCreate}
                  style={{ alignSelf: 'center' }}>
            {tt('billing.newPlan', 'New membership')}
          </button>
        ) : null}
      </div>

      {form ? (
        <div className={styles.form}>
          <h3 className={styles.formTitle}>
            {form.__mode === 'create'
              ? tt('billing.newPlan', 'New membership')
              : tt('billing.editPlan', 'Edit membership')}
          </h3>

          {formError ? <div className={styles.formError}>{formError}</div> : null}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="planName">
              {tt('billing.fieldName', 'Name')}
            </label>
            <input id="planName" className={styles.input} value={form.name}
                   maxLength={120}
                   onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="planTagline">
              {tt('billing.fieldTagline', 'One line about it')}
            </label>
            <input id="planTagline" className={styles.input} value={form.tagline}
                   maxLength={200}
                   onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="planPrice">
              {tt('billing.fieldPrice', 'Price in naira')}
            </label>
            <input id="planPrice" className={styles.input} inputMode="numeric"
                   value={form.price_ngn}
                   disabled={form.__hasMembers}
                   onChange={(e) => setForm({ ...form, price_ngn: e.target.value })} />
            <span className={styles.hint}>
              {form.__hasMembers
                ? tt('billing.priceLockedHint',
                  'People are already paying for this, so its price and its '
                  + 'billing period cannot change. Make a new membership instead '
                  + 'and tell them about it.')
                : tt('billing.priceHint',
                  'Has to be a whole number of VENT COINS, so a multiple of '
                  + '1,000 naira. 5,000 naira is 5 VENT COINS.')}
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="planInterval">
              {tt('billing.fieldInterval', 'Charged every')}
            </label>
            <select id="planInterval" className={styles.select} value={form.interval}
                    disabled={form.__hasMembers}
                    onChange={(e) => setForm({ ...form, interval: e.target.value })}>
              <option value="monthly">{tt('billing.month', 'month')}</option>
              <option value="yearly">{tt('billing.year', 'year')}</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="planTrial">
              {tt('billing.fieldTrial', 'Free days at the start')}
            </label>
            <input id="planTrial" className={styles.input} inputMode="numeric"
                   value={form.trial_days}
                   onChange={(e) => setForm({ ...form, trial_days: e.target.value })} />
            <span className={styles.hint}>
              {tt('billing.trialHint',
                'Leave this empty for no trial. Nothing is charged until the '
                + 'free days are over.')}
            </span>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>
              {tt('billing.fieldBenefits', 'What a member gets')}
            </span>
            <div className={styles.benefitGrid}>
              {catalogue.map((b) => {
                const on = Object.prototype.hasOwnProperty.call(form.benefits, b.key);
                return (
                  <div key={b.key} className={styles.benefitRow}>
                    <input type="checkbox" id={`b_${b.key}`} checked={on}
                           onChange={(e) => {
                             const next = { ...form.benefits };
                             if (e.target.checked) next[b.key] = 0;
                             else delete next[b.key];
                             setForm({ ...form, benefits: next });
                           }} />
                    <label className={styles.benefitText} htmlFor={`b_${b.key}`}>
                      {tt(`billing.benefit.${b.key}`, b.english)}
                    </label>
                    {b.kind === 'value' && on ? (
                      <input className={styles.benefitNumber} inputMode="numeric"
                             value={form.benefits[b.key]}
                             aria-label={tt('billing.benefitValue', 'Percent')}
                             onChange={(e) => setForm({
                               ...form,
                               benefits: {
                                 ...form.benefits,
                                 [b.key]: e.target.value.replace(/[^0-9]/g, ''),
                               },
                             })} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="planDesc">
              {tt('billing.fieldDescription', 'The full description')}
            </label>
            <textarea id="planDesc" className={styles.textarea}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="planMembers">
              {tt('billing.fieldMemberContent', 'Members area')}
            </label>
            <textarea id="planMembers" className={styles.textarea}
                      value={form.member_content}
                      onChange={(e) => setForm({
                        ...form, member_content: e.target.value })} />
            <span className={styles.hint}>
              {tt('billing.memberContentHint',
                'Only people whose membership is live can read this. A Discord '
                + 'invite, a code, a joining instruction. It stops being '
                + 'readable the moment somebody lapses.')}
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="planStatus">
              {tt('billing.fieldStatus', 'Who can see it')}
            </label>
            <select id="planStatus" className={styles.select} value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">
                {tt('billing.statusDraft', 'Draft, only you can see it')}
              </option>
              <option value="public">
                {tt('billing.statusPublic', 'Public, anybody can join')}
              </option>
              <option value="retired">
                {tt('billing.statusRetired',
                  'Closed, current members stay and nobody new can join')}
              </option>
            </select>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.action}
                    disabled={busy === 'save' || !form.name.trim()}
                    onClick={save}>
              {busy === 'save'
                ? tt('billing.saving', 'Saving...')
                : tt('common.save', 'Save')}
            </button>
            <button type="button" className={`${styles.action} ${styles.actionQuiet}`}
                    onClick={() => { setForm(null); setFormError(''); }}>
              {tt('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      ) : null}

      {!plans.length && !form ? (
        <div className={styles.sectionEmpty}>
          {canManage
            ? tt('billing.consoleEmptyManage',
              'This organisation does not sell a membership yet. A membership '
              + 'charges the same people every month and gives them something '
              + 'in return.')
            : tt('billing.consoleEmpty',
              'This organisation does not sell a membership yet.')}
        </div>
      ) : null}

      {plans.map((plan) => (
        <div key={plan.slug} className={styles.planRow}>
          <div className={styles.planHead}>
            <div>
              <h3 className={styles.planName}>
                <Link href={`/plans/${plan.slug}`} style={{ color: 'inherit' }}>
                  {plan.name}
                </Link>
              </h3>
              <span className={styles.planMeta}>
                {formatNumber(plan.price_vc)} VC {plan.interval === 'yearly'
                  ? tt('billing.aYear', 'a year') : tt('billing.aMonth', 'a month')}
                {' · '}{formatNgn(plan.price_ngn)}
              </span>
            </div>
            <div className={styles.actions}>
              {plan.status === 'draft'
                ? <span className={`${styles.chip} ${styles.chipDraft}`}>
                    {tt('billing.draftShort', 'Draft')}
                  </span>
                : null}
              {plan.past_due
                ? <span className={`${styles.chip} ${styles.chipDue}`}>
                    {tt('billing.nPastDue', '{n} behind on payment')
                      .replace('{n}', plan.past_due)}
                  </span>
                : null}
            </div>
          </div>

          <div className={styles.numbers}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>{tt('billing.members', 'Members')}</span>
              <span className={styles.statValue}>{formatNumber(plan.members)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                {tt('billing.renewing', 'Will pay again')}
              </span>
              <span className={styles.statValue}>{formatNumber(plan.renewing)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                {tt('billing.perMonthShort', 'A month')}
              </span>
              <span className={styles.statValue}>
                {formatNumber(plan.recurring_monthly_vc)} VC
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                {tt('billing.owedToYou', 'Waiting to be paid out')}
              </span>
              <span className={styles.statValue}>{formatNumber(plan.owed_vc)} VC</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={`${styles.action} ${styles.actionQuiet}`}
                    onClick={() => openPlan(plan.slug, 'members')}>
              {tt('billing.seeMembers', 'Members')}
            </button>
            <button type="button" className={`${styles.action} ${styles.actionQuiet}`}
                    onClick={() => openPlan(plan.slug, 'payments')}>
              {tt('billing.seePayments', 'Payments')}
            </button>
            {canManage ? (
              <button type="button" className={`${styles.action} ${styles.actionQuiet}`}
                      onClick={() => openPlan(plan.slug, 'earnings')}>
                {tt('billing.seeEarnings', 'Earnings')}
              </button>
            ) : null}
            {canManage ? (
              <button type="button" className={`${styles.action} ${styles.actionQuiet}`}
                      onClick={() => startEdit(plan)}>
                {tt('common.edit', 'Edit')}
              </button>
            ) : null}
            {canManage && plan.owed_vc > 0 ? (
              <button type="button" className={styles.action}
                      disabled={busy === `settle:${plan.slug}`}
                      onClick={() => settle(plan.slug)}>
                {tt('billing.payOut', 'Pay {n} VC into the wallet')
                  .replace('{n}', formatNumber(plan.owed_vc))}
              </button>
            ) : null}
          </div>

          {open === plan.slug && detail && view === 'members' ? (
            (detail.members || []).length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{tt('billing.member', 'Member')}</th>
                      <th>{tt('billing.status', 'Status')}</th>
                      <th>{tt('billing.nextPayment', 'Next payment')}</th>
                      <th>{tt('billing.accessUntil', 'Access until')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {detail.members.map((row) => (
                      <tr key={row.token}>
                        <td>
                          <UserChip user={row.subscriber} size={28}
                                    className={styles.who} />
                        </td>
                        <td>
                          {tt(`billing.state.${row.state}`,
                            STATE_FALLBACK[row.state] || row.state)}
                        </td>
                        <td>
                          {row.next_charge_at
                            ? formatDate(row.next_charge_at)
                            : tt('billing.noneScheduled', 'None scheduled')}
                        </td>
                        <td>{formatDate(row.access_until)}</td>
                        <td>
                          {canManage && row.renews ? (
                            <button type="button" className={styles.rowAction}
                                    disabled={busy === `end:${row.token}`}
                                    onClick={() => endMembership(row.token)}>
                              {tt('billing.endMembership', 'End')}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.sectionEmpty}>
                {tt('billing.noMembersYet', 'Nobody has joined this yet.')}
              </div>
            )
          ) : null}

          {open === plan.slug && detail && view === 'payments' ? (
            (detail.invoices || []).length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{tt('billing.invoiceWhen', 'When')}</th>
                      <th>{tt('billing.member', 'Member')}</th>
                      <th>{tt('billing.invoiceAmount', 'Amount')}</th>
                      <th>{tt('billing.invoiceState', 'Result')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {detail.invoices.map((inv) => (
                      <tr key={inv.token}>
                        <td>{formatDate(inv.created_at)}</td>
                        <td>
                          <UserChip user={inv.subscriber} size={28}
                                    className={styles.who} />
                        </td>
                        <td>{formatNumber(inv.amount_vc)} VC</td>
                        <td className={
                          inv.state === 'paid' ? styles.statePaid
                            : inv.state === 'refunded' ? styles.stateRefunded
                              : styles.stateFailed}>
                          {tt(`billing.invoiceState.${inv.state}`, inv.state)}
                          {inv.failure_code ? (
                            <>
                              <br />
                              <span className={styles.planMeta}>
                                {tt(`api.${inv.failure_code}`,
                                  'The payment did not go through.')}
                              </span>
                            </>
                          ) : null}
                        </td>
                        <td>
                          {canManage && inv.refundable ? (
                            refunding?.token === inv.token ? (
                              <span className={styles.refundRow}>
                                <input className={styles.refundReason}
                                       value={refunding.reason}
                                       placeholder={tt('billing.refundReasonPrompt',
                                         'Why is this being refunded?')}
                                       aria-label={tt('billing.refundReasonPrompt',
                                         'Why is this being refunded?')}
                                       onChange={(e) => setRefunding({
                                         token: inv.token, reason: e.target.value })} />
                                <button type="button" className={styles.rowAction}
                                        disabled={busy === `refund:${inv.token}`
                                          || !refunding.reason.trim()}
                                        onClick={() => refund(inv.token, refunding.reason)}>
                                  {tt('billing.refundConfirm', 'Give it back')}
                                </button>
                                <button type="button" className={styles.rowAction}
                                        onClick={() => setRefunding(null)}>
                                  {tt('common.cancel', 'Cancel')}
                                </button>
                              </span>
                            ) : (
                              <button type="button" className={styles.rowAction}
                                      onClick={() => setRefunding({
                                        token: inv.token, reason: '' })}>
                                {tt('billing.refund', 'Refund')}
                              </button>
                            )
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.sectionEmpty}>
                {tt('billing.noPaymentsYet', 'No payments have been taken yet.')}
              </div>
            )
          ) : null}

          {/* What the plan has earned, and every run that paid it out. The
              endpoint answered this from the day it was written; until
              12 September nothing asked it, so an organiser had the owed
              figure on the card and no way to see how it was arrived at. */}
          {open === plan.slug && detail && view === 'earnings' ? (
            <div className={styles.earnings}>
              <div className={styles.numbers}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>
                    {tt('billing.collected', 'Collected')}
                  </span>
                  <span className={styles.statValue}>
                    {formatNumber(detail.collected_vc)} VC
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>
                    {tt('billing.refunded', 'Refunded')}
                  </span>
                  <span className={styles.statValue}>
                    {formatNumber(detail.refunded_vc)} VC
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>
                    {tt('billing.platformFee', 'V-ENT fee')}
                  </span>
                  <span className={styles.statValue}>
                    {formatNumber(detail.platform_fee_vc)} VC
                    {' '}
                    <span className={styles.planMeta}>
                      ({formatNumber(detail.fee_pct)}%)
                    </span>
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>
                    {tt('billing.paidOut', 'Paid into the wallet')}
                  </span>
                  <span className={styles.statValue}>
                    {formatNumber(detail.paid_vc)} VC
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>
                    {tt('billing.owedToYou', 'Waiting to be paid out')}
                  </span>
                  <span className={styles.statValue}>
                    {formatNumber(detail.owed_vc)} VC
                  </span>
                </div>
              </div>
              {(detail.settlements || []).length ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{tt('billing.invoiceWhen', 'When')}</th>
                        <th>{tt('billing.invoiceAmount', 'Amount')}</th>
                        <th>{tt('billing.linesPaid', 'Payments covered')}</th>
                        <th>{tt('billing.settlementNote', 'Note')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.settlements.map((run) => (
                        <tr key={run.id}>
                          <td>{formatDate(run.at)}</td>
                          <td>{formatNumber(run.amount_vc)} VC</td>
                          <td>{formatNumber(run.lines_paid)}</td>
                          <td>{run.note || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.sectionEmpty}>
                  {tt('billing.noSettlementsYet', 'Nothing has been paid out yet.')}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default OrgMembershipsPanel;
