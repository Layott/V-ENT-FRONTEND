'use client';

// The game catalogue, with each game's editions.
//
// The tournament wizard fetched this itself; the event wizard did not, and fed
// its Game select from the keys of a hardcoded mode map. So an event could only
// be attached to one of four games no matter what the platform actually runs,
// and a game added in the admin console never appeared there at all.

import { useCallback, useEffect, useState } from 'react';

export default function useGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/games/`);
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json();
      // The editions come with each game. Dropping them is what left the wizard
      // unable to ask which one.
      setGames((body?.data?.games || []).map(g => ({
        id: g.id,
        name: g.name,
        series: g.series || [],
      })));
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { games, loading, reload: load };
}
