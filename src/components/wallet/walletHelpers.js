import { appLocale } from '@/lib/appLocale';
// ─────────────────────────────────────────────────────────────────
// Shared wallet helpers (formatters, classifiers, type metadata).
// Used across /wallets and /wallets/* sub-routes.
// ─────────────────────────────────────────────────────────────────

// Conversion rate - 1000 NGN = 1 VENT COIN.
export const NGN_PER_VC = 1000;

export const ngnFromVc = (vc) => Math.round((Number(vc) || 0) * NGN_PER_VC);
export const vcFromNgn = (ngn) => Math.floor((Number(ngn) || 0) / NGN_PER_VC);

// Withdrawal fee: 2% of NGN payout + 50 NGN flat.
export const calcWithdrawFee = (ngn) => {
  const n = Number(ngn) || 0;
  if (n <= 0) return 0;
  return Math.round(n * 0.02) + 50;
};

export const calcNetPayout = (ngn) => {
  const n = Number(ngn) || 0;
  return Math.max(n - calcWithdrawFee(n), 0);
};

// ── Type / status normalisation ──
const CREDIT_TYPES = ['top_up', 'topup', 'prize', 'receive', 'credit', 'refund'];

export const isCreditType = (rawType) => {
  if (!rawType) return false;
  return CREDIT_TYPES.includes(String(rawType));
};

// Map any incoming raw type to one of our 6 canonical filter buckets.
export const normalizeType = (rawType) => {
  const t = String(rawType || '').toLowerCase();
  if (t === 'topup' || t === 'top_up' || t === 'credit') return 'top_up';
  if (t === 'send' || t === 'transfer_out') return 'send';
  if (t === 'receive' || t === 'transfer_in') return 'receive';
  if (t === 'prize' || t === 'reward') return 'prize';
  if (t === 'withdraw' || t === 'withdrawal' || t === 'payout') return 'withdrawal';
  if (t === 'refund') return 'refund';
  if (t === 'fee' || t === 'tournament_fee' || t === 'event_fee' || t === 'deduction' || t === 'debit') return 'fee';
  return t || 'other';
};

export const TYPE_LABEL = {
  top_up: 'Top Up',
  send: 'Send',
  receive: 'Receive',
  prize: 'Prize',
  withdrawal: 'Withdrawal',
  fee: 'Fee',
  refund: 'Refund',
  other: 'Other',
};

export const TYPE_BADGE_CLASS = {
  top_up: 'badgeTopup',
  send: 'badgeSend',
  receive: 'badgeReceive',
  prize: 'badgePrize',
  withdrawal: 'badgeWithdraw',
  fee: 'badgeFee',
  refund: 'badgeRefund',
  other: 'badgeWithdraw',
};

export const STATUS_LABEL = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'success' || s === 'completed') return 'Completed';
  if (s === 'pending') return 'Pending';
  if (s === 'failed') return 'Failed';
  return status || '-';
};

export const normalizeStatus = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'success' || s === 'completed') return 'completed';
  if (s === 'pending') return 'pending';
  if (s === 'failed') return 'failed';
  return s;
};

// ── Formatters ──
export const formatNumber = (n) => {
  if (n == null || Number.isNaN(Number(n))) return '0';
  return Number(n).toLocaleString(appLocale());
};

export const formatNgn = (n) => `₦${formatNumber(n)}`;

export const formatVc = (n) => `${formatNumber(n)} VC`;

export const formatDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString(appLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString(appLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Banks (mock list - matches what the BE would expose)
export const NIGERIAN_BANKS = [
  'Access Bank',
  'Citibank Nigeria',
  'Ecobank Nigeria',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank',
  'GTBank',
  'Heritage Bank',
  'Keystone Bank',
  'Kuda Bank',
  'Opay',
  'Polaris Bank',
  'PalmPay',
  'Providus Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered',
  'Sterling Bank',
  'Sun Trust Bank',
  'UBA',
  'Union Bank',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank',
];

// Mock recipient lookup - returns a fake but plausible profile when the
// username/email looks valid, null when too short or self-send.
export const mockResolveRecipient = (query, selfUsername) => {
  const q = String(query || '').replace(/^@/, '').trim().toLowerCase();
  if (q.length < 3) return null;
  if (selfUsername && q === String(selfUsername).toLowerCase()) {
    return { error: 'You cannot send VENT COINS to yourself.' };
  }
  // Synthesize a profile so the UI can render a confirmation card.
  const display = q
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
  return {
    username: q,
    full_name: display || q,
    avatar: `https://i.pravatar.cc/120?u=${encodeURIComponent(q)}`,
    verified: q.length % 2 === 0,
  };
};
