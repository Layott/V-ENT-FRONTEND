'use client';

import { useEffect, useState } from 'react';

/**
 * The list of games the platform actually has rows for.
 *
 * Pages used to hardcode their own arrays ("FIFA", "Call of Duty Mobile", ...)
 * which did not match the Games table, so creating a team with one of them was
 * rejected by the API and filtering by one returned nothing. Always ask the
 * server.
 */
export default function useGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/games/`);
        const data = await res.json();
        if (!cancelled && data?.status === 'success') {
          setGames(data.data.games || []);
        }
      } catch (err) {
        console.error('Games fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return { games, gameTitles: games.map((g) => g.game_title || g.name), loading };
}
