import { splitLocale } from '@/lib/locale';

// Why somebody was sent to sign in, said on the sign-in page (Apple review
// P089-4, P077-7, P100-10, P105-7, P106-5): "the person cannot tell why they
// landed here". Read from the `next` address the gate now carries; the first
// prefix that matches wins, and anything else gets the plain general line.
const REASONS = [
  ['/events/scan', 'signIn.reasonScan', 'Log in with your door account to scan tickets.'],
  ['/events/create-event', 'signIn.reasonCreateEvent', 'Log in to create an event.'],
  ['/tournaments/create-tournament', 'signIn.reasonCreateTournament', 'Log in to create a tournament.'],
  ['/organizations/create', 'signIn.reasonCreateOrg', 'Log in to create an organization.'],
  ['/organizations/invites', 'signIn.reasonInvites', 'Log in to see your invitations.'],
  ['/invitations/', 'signIn.reasonInvitation', 'Log in to answer your invitation.'],
  ['/notifications', 'signIn.reasonNotifications', 'Log in to see your notifications.'],
  ['/wallets', 'signIn.reasonWallet', 'Log in to open your wallet.'],
  ['/events/my-tickets', 'signIn.reasonTickets', 'Log in to see your tickets.'],
  ['/settings', 'signIn.reasonSettings', 'Log in to change your settings.'],
  ['/admin', 'signIn.reasonAdmin', 'Log in with your admin account to open the console.'],
];

/** The sentence for a `next` path, or null when there is no destination. */
export function signInReason(tt, next) {
  if (!next) return null;
  const [pathOnly] = next.split('?');
  const { path } = splitLocale(pathOnly);
  const hit = REASONS.find(([prefix]) => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`));
  return hit ? tt(hit[1], hit[2]) : tt('signIn.reasonGeneral', 'Log in to continue where you were going.');
}
