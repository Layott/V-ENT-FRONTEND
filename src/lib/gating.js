// Who is looking, and what they may therefore see.
//
// CEO, 2 September 2026: "the flow for a non signed in user is bad, they should
// not be able to create or join or open anything that requires an account and
// when they try it should ask them to create one, they can even see the manage
// button for organizations which shouldnt be. Create rules for this please to
// apply automatically to the site and other new pages that maybe built."
//
// ## The bug that produced this file
//
// The organisations list decided ownership like this:
//
//     org?.my_role === 'owner'
//       || org?.owner === session?.user?.username
//       || org?.owner?.username === session?.user?.username
//
// Signed out, `org.owner` is the string `"deprofessor"`, so `org.owner.username`
// is `undefined`. And `session?.user?.username` is `undefined`. **`undefined ===
// undefined` is true**, so every organisation looked like the viewer's own and
// every card offered Manage to a stranger.
//
// Nothing about that is specific to organisations. Any comparison of two
// optional identities has it, and optional chaining makes it likely rather than
// rare, because `a?.b === c?.d` reads as careful while being the exact shape of
// the fault.
//
// ## The three rules
//
// 1. **Never compare two possibly-absent identities.** Use `sameUser`, which is
//    false unless both sides exist.
// 2. **Branch on session STATUS, never on session DATA.** `data` alone cannot
//    tell "signed out" from "still asking", and treating the second as the
//    first is what makes a page flash from a member's view to a stranger's.
// 3. **A control that needs an account is absent or explains itself.** It is
//    never rendered live to be refused on press. Somebody should learn what
//    they need before they spend effort, not after.
//
// `scripts/check-signed-out.mjs` enforces 1 and 3 on every page, including ones
// built later.

import { useSession } from 'next-auth/react';

/**
 * Are these the same person?
 *
 * False unless BOTH sides are present. That single condition is the whole
 * point: `undefined === undefined` is how a stranger became an owner.
 */
export const sameUser = (a, b) => {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
};

/**
 * The username out of a field the API sometimes sends as a string and sometimes
 * as an object. Both shapes exist across V-ENT payloads, and a caller guessing
 * wrong is how `owner?.username` silently became `undefined`.
 */
export const usernameOf = (who) => {
  if (!who) return null;
  if (typeof who === 'string') return who;
  return who.username || who.name || null;
};

/**
 * Who is looking. Branches on `status`, so "still asking" is never mistaken for
 * "signed out".
 *
 *   const viewer = useViewer();
 *   if (viewer.loading) return null;      // decide nothing yet
 *   if (!viewer.signedIn) ...             // definitely a stranger
 */
export function useViewer() {
  const { data, status } = useSession();
  return {
    loading: status === 'loading',
    signedIn: status === 'authenticated',
    username: data?.user?.username || null,
    id: data?.user?.id ?? null,
    token: data?.user?.sessionToken || null,
  };
}

/**
 * Does this viewer own the record?
 *
 * Takes the record's role field and its owner field, and is false for anybody
 * not signed in whatever those contain.
 */
export function ownedBy(record, viewer, { roleKey = 'my_role', ownerKey = 'owner' } = {}) {
  if (!viewer?.signedIn) return false;
  if (record?.[roleKey] === 'owner') return true;
  return sameUser(usernameOf(record?.[ownerKey]), viewer.username);
}

/** Roles that may act inside a record, owner included. */
export function hasRole(record, viewer, roles, { roleKey = 'my_role' } = {}) {
  if (!viewer?.signedIn) return false;
  return roles.includes(record?.[roleKey]);
}

/**
 * Where to send somebody who needs an account, keeping where they were so they
 * come back to it rather than to the home page.
 */
export const signInHref = (returnTo) =>
  `/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''}`;

export const signUpHref = (returnTo) =>
  `/signup${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''}`;
