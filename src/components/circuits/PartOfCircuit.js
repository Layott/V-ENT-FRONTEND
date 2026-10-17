'use client';

// The line on a tournament's overview when it counts in a published circuit
// (P5): which circuit, at which tier, and what its top places are worth.
// Approved mockup docs/mockups/circuits.html, "On a tournament page".
// Nothing is drawn while asking, nor when the tournament is in no circuit.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { describeTable, parseTable } from '@/lib/circuitTable';
import { API, request } from './circuitWords';
import styles from './circuits.module.css';

export default function PartOfCircuit({ tournamentSlug }) {
  const tt = useT();
  const [circuit, setCircuit] = useState(null);

  useEffect(() => {
    if (!tournamentSlug) return undefined;
    let gone = false;
    (async () => {
      const got = await request(`${API}/circuits/?tournament=${encodeURIComponent(tournamentSlug)}`);
      if (!gone && got.ok) setCircuit((got.answer.data.circuits || [])[0] || null);
    })();
    return () => { gone = true; };
  }, [tournamentSlug]);

  if (!circuit) return null;
  const here = circuit.for_tournament || {};
  const { table } = parseTable(here.table || '');
  const top = describeTable(tt, table || {}).slice(0, -1).slice(0, 3)
    .map((p) => `${p.label} ${p.points}`).join(', ');

  return (
    <div className={styles.callout}>
      <p className={styles.calloutText}>
        <b>
          {here.tier
            ? tt('circuit.countsInTier', 'Counts in {circuit}, {tier} tier.').replace('{circuit}', circuit.name).replace('{tier}', here.tier)
            : tt('circuit.countsIn', 'Counts in {circuit}.').replace('{circuit}', circuit.name)}
        </b>
        {circuit.engine === 'elo' ? (
          <>
            <br />
            <span>{tt('circuit.eloHere', "Every match here moves the circuit's Elo rating.")}</span>
          </>
        ) : top && (
          <>
            <br />
            <span>{tt('circuit.worthHere', 'Circuit points here: {places}.').replace('{places}', top)}</span>
          </>
        )}
      </p>
      <Link href={`/circuits/${encodeURIComponent(circuit.slug)}`} className={styles.calloutLink}>
        {tt('circuit.seeRanking', 'See the ranking')}
      </Link>
    </div>
  );
}
