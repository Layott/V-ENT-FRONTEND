'use client';

// How a game is played, from the server rather than from a list kept here.
//
// Both wizards held their own `GAME_MODES` object keyed by game title. Two
// copies of the same fixed list, so a game added in the admin console appeared
// in the Game select and then offered "Standard" as its only mode, and a
// renamed game silently lost its modes because the key no longer matched.
//
// `series` narrows it where an edition changed what is on offer: a mode with no
// series applies to every edition, which is the usual case.

import { useCallback, useEffect, useState } from 'react';

export default function useGameModes(gameId, seriesId) {
  const [modes, setModes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!gameId) {
      setModes([]);
      setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const url = new URL(
        `${process.env.NEXT_PUBLIC_API_URL}/tournament/games/${gameId}/modes/`);
      if (seriesId) url.searchParams.set('series', seriesId);
      const res = await fetch(url);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setModes(body.data.modes || []);
        return;
      }
      setModes([]);
      setFailed(true);
    } catch {
      setModes([]);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [gameId, seriesId]);

  useEffect(() => { load(); }, [load]);

  return { modes, loading, failed };
}
