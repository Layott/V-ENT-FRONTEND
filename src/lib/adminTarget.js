// What an audit record touched, in words an admin reads at a glance.
//
// The server sends the Django model path ("vent_auth.userwallet") and the
// primary key, which on some rows is the string "None". Both reached the
// console raw: "vent_auth.club #None" in the overview's activity list and in
// the audit log (audit 557). The model becomes its plain name, and an id that
// is not one is left out.

const NAMES = {
  users: 'User',
  userwallet: 'Wallet',
  walletpin: 'Wallet PIN',
  teams: 'Team',
  club: 'Club',
  tournament: 'Tournament',
  event: 'Event',
  organization: 'Organization',
  payoutrequest: 'Payout request',
  kycsubmission: 'Identity check',
  adminsettings: 'Settings',
  partnerkey: 'Partner key',
};

const NOT_AN_ID = new Set(['', 'none', 'null', 'undefined']);

export function adminTargetLabel(tt, type, id) {
  if (!type) return '';
  const model = String(type).split('.').pop().toLowerCase();
  const fallback = NAMES[model] || model.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  const name = tt(`admin.target.${model}`, fallback);
  const raw = id === null || id === undefined ? '' : String(id).trim();
  return NOT_AN_ID.has(raw.toLowerCase()) ? name : `${name} #${raw}`;
}

/**
 * An audit line as the server wrote it, made readable: "record_restore on
 * vent_auth.club #None" reads "Record restore on Club". The model path and an
 * id that is not one are the same fault as the target column (audit 557).
 */
export function adminActivityText(tt, text) {
  if (!text) return '';
  return String(text)
    .replace(/\b([a-z]+_[a-z_]+)\b(?= on )/g, (m) => m.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()))
    // Only the platform's own app paths (vent_auth.club), never an email domain or a file name.
    .replace(/\b(vent_[a-z_]+\.[a-z_]+)(?:\s+#(\S+))?/g, (m, path, id) => adminTargetLabel(tt, path, id));
}
