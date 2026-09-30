'use client';

// Which currency to pay in, at every Flutterwave door (inbox 361).
//
// Drawn only when there is a real choice: an account that can take naira
// alone shows nothing new. The payer sees the amount in their currency and
// the rate BEFORE paying; the checkout charges exactly that quote (see
// src/lib/payCurrency.js). The price itself stays in naira and is said so.
import { useT } from '@/i18n/LanguageProvider';
import { formatNumber } from '@/lib/datetime';
import styles from './currency-choice.module.css';

const METHOD_KEYS = {
  card: ['pay.method.card', 'Card'],
  banktransfer: ['pay.method.banktransfer', 'Bank transfer'],
  ussd: ['pay.method.ussd', 'USSD'],
  account: ['pay.method.account', 'Bank account'],
  mpesa: ['pay.method.mpesa', 'M-Pesa'],
  ghanamobilemoney: ['pay.method.mobilemoney', 'Mobile money'],
  mobilemoneyuganda: ['pay.method.mobilemoney', 'Mobile money'],
  mobilemoneyrwanda: ['pay.method.mobilemoney', 'Mobile money'],
  mobilemoneytanzania: ['pay.method.mobilemoney', 'Mobile money'],
  mobilemoneymalawi: ['pay.method.mobilemoney', 'Mobile money'],
  mobilemoneyxof: ['pay.method.mobilemoney', 'Mobile money'],
  mobilemoneyxaf: ['pay.method.mobilemoney', 'Mobile money'],
  fawrypay: ['pay.method.fawry', 'Fawry'],
  '1voucher': ['pay.method.voucher', '1Voucher'],
};

const fraction = (code) => (['XOF', 'XAF', 'UGX', 'RWF', 'TZS', 'MWK'].includes(code) ? 0 : 2);

export default function CurrencyChoice({ quotes }) {
  const tt = useT();
  if (!quotes || quotes.status !== 'ready' || quotes.options.length < 2) return null;
  const current = quotes.current;

  const methods = current
    ? [...new Set((current.methods || [])
      .filter((m) => METHOD_KEYS[m])
      .map((m) => tt(METHOD_KEYS[m][0], METHOD_KEYS[m][1])))]
    : [];

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>{tt('pay.currency.label', 'Pay in')}</p>
      <div className={styles.chips} role="group" aria-label={tt('pay.currency.label', 'Pay in')}>
        {quotes.options.map((o) => (
          <button key={o.code} type="button"
            className={`${styles.chip} ${quotes.selected === o.code ? styles.chipOn : ''}`}
            aria-pressed={quotes.selected === o.code}
            onClick={() => quotes.choose(o.code)}>
            {o.code}
          </button>
        ))}
      </div>
      {current && current.code !== 'NGN' && (
        <p className={styles.sum}>
          {tt('pay.currency.youPay', 'You pay {amount} {code}. 1 {code} = {rate} NGN at Flutterwave\'s rate, held for 15 minutes. The price is set in naira.')
            .replace('{amount}', formatNumber(Number(current.amount), {
              minimumFractionDigits: fraction(current.code), maximumFractionDigits: fraction(current.code),
            }))
            .replaceAll('{code}', current.code)
            .replace('{rate}', formatNumber(Number(current.rate), { maximumFractionDigits: 4 }))}
        </p>
      )}
      {methods.length > 0 && (
        <p className={styles.hint}>
          {tt('pay.currency.methods', 'In {code}: {methods}.')
            .replace('{code}', current.code)
            .replace('{methods}', methods.join(', '))}
        </p>
      )}
    </div>
  );
}
