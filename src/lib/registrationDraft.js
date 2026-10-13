'use client';

// A tournament registration saved as it goes (inbox 436).
//
// CEO, 12 October 2026: "just incase its a long process and they dont have to
// start their registration from begining again, maybe it can be savinbg
// progress." The server keeps one draft per person and tournament for thirty
// days (vent_tournament/views_registration_draft.py); these read and write it.
// A save that fails never stops a registration: the person carries on, and the
// next step saves again.

import { useEffect, useState } from 'react';
import { ventFetch } from '@/components/tournament-lib/tournamentApi';

const path = (ref) => `/tournament/${encodeURIComponent(ref)}/registration-draft/`;

/** `{draft, entry, registered}` for this person and tournament. */
export async function readDraft(ref, token) {
  return ventFetch(path(ref), { token });
}

/** Save a step. Returns the answer, or null when the save did not go through. */
export async function saveDraft(ref, token, body) {
  if (!ref || !token) return null;
  try {
    return await ventFetch(path(ref), { method: 'PUT', token, body });
  } catch {
    return null;
  }
}

export async function discardDraft(ref, token) {
  return ventFetch(path(ref), { method: 'DELETE', token });
}

/** The words for where somebody is up to. */
export const STEP_WORDS = {
  mode: ['regDraft.step.mode', 'choosing solo or team'],
  team: ['regDraft.step.team', 'choosing your team'],
  review: ['regDraft.step.review', 'checking your team'],
  ticket: ['regDraft.step.ticket', 'your event ticket'],
  payment: ['regDraft.step.payment', 'the entry'],
};

export function stepText(tt, step) {
  const [key, english] = STEP_WORDS[step] || STEP_WORDS.mode;
  return tt(key, english);
}

/**
 * Every registration this person left part done, for the pages that offer a
 * way back in (the event's Tournaments tab, My tournaments). Nothing is asked
 * for somebody signed out.
 */
export function useMyDrafts(token) {
  const [drafts, setDrafts] = useState([]);
  useEffect(() => {
    if (!token) { setDrafts([]); return undefined; }
    let gone = false;
    ventFetch('/tournament/registration-drafts/mine/', { token })
      .then((data) => { if (!gone) setDrafts(data?.drafts || []); })
      .catch(() => { if (!gone) setDrafts([]); });
    return () => { gone = true; };
  }, [token]);
  const forget = (slug) => setDrafts((prev) => prev.filter((d) => d.tournament?.slug !== slug));
  return { drafts, forget };
}
