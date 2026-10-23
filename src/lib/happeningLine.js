import { matchName } from '@/lib/matchName';
import { stageName } from '@/lib/formatLabel';

/**
 * One thing that happened in a tournament, in the reader's language (P1e).
 *
 * CEO, 16 October 2026: "i aprove the design". Section 14b of the bracket
 * structure design: one list of what happened feeds the overlays. The server
 * sends facts (`kind`, names, a score, a stage's label); the words are built
 * here. A result that no longer stands (reopened, or its stage undrawn) says
 * nothing, so a graphic never shows a score that has been taken back.
 */
export function happeningLine(tt, h) {
  const d = h?.data || {};
  switch (h?.kind) {
    case 'result_confirmed': {
      if (h.standing === false) return null;
      if (d.forfeit && d.winner) {
        return tt('studio.hp.walkover', '{winner} go through on a walkover').replace('{winner}', d.winner);
      }
      const score = d.penalties
        ? tt('studio.hp.scorePens', '{score} ({pens} on penalties)')
          .replace('{score}', d.score || '').replace('{pens}', d.penalties.join('-'))
        : (d.score || '');
      const where = matchName(tt, d.match || {}, d.format) || stageName(tt, d.stage) || '';
      return (where
        ? tt('studio.hp.resultIn', '{where}: {home} {score} {away}').replace('{where}', where)
        : tt('studio.hp.result', '{home} {score} {away}'))
        .replace('{home}', d.home || '').replace('{score}', score).replace('{away}', d.away || '');
    }
    case 'stage_started':
      return tt('studio.hp.started', '{stage} has started').replace('{stage}', stageName(tt, d.stage));
    case 'stage_closed':
      return tt('studio.hp.closed', '{stage} is finished').replace('{stage}', stageName(tt, d.stage));
    case 'line_sent':
      if (d.circuit) {
        // Places sent in from a circuit's ranking (P5c).
        return tt('studio.hp.sentCircuit', '{count} through from the {circuit} ranking to {target}')
          .replace('{count}', d.count ?? 0).replace('{circuit}', d.circuit).replace('{target}', stageName(tt, d.target));
      }
      return tt('studio.hp.sent', '{count} through from {stage} to {target}')
        .replace('{count}', d.count ?? 0).replace('{stage}', stageName(tt, d.stage)).replace('{target}', stageName(tt, d.target));
    case 'tournament_won':
      if (!d.champion) return null;
      return tt('studio.hp.won', '{champion} won {title}')
        .replace('{champion}', d.champion).replace('{title}', d.title || '');
    default:
      return null;
  }
}
