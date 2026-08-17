// Dispute API layer - network calls for the user-facing Dispute Center.
// Reuses the shared `ventFetch` + `tokenFrom` helpers from the tournament
// module so auth, the `{ status, data, message }` envelope, and mock-mode
// interception all behave identically. Every request uses
// `Authorization: Bearer <session_token>` per the M1 auth contract.

import { ventFetch, tokenFrom } from '@/components/tournament-lib/tournamentApi';

export { tokenFrom };

// GET /tournament/my-disputes/ - all disputes raised by the current user,
// newest first. Returns the `data` payload: `{ disputes: [ … ] }`.
export function myDisputes(token) {
  return ventFetch('/tournament/my-disputes/', { token });
}
