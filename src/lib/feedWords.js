import { stageName } from '@/lib/formatLabel';
import { lineWords } from '@/lib/stageGraph';

/**
 * A feed between tournaments in words (P2, design section 7): "Lagos
 * Qualifier, League: Places 1 to 2 go to Finals." on the receiving side, "To
 * Nigeria Finals: Places 1 to 2 go to Finals." on the sending side. One
 * sentence for the organiser's feeds panel and the public bracket page.
 */
export function feedSentence(tt, feed, direction) {
  const line = lineWords(tt, feed, { groups: feed.source.groups }, stageName(tt, feed.target.stage, feed.target.format));
  if (direction === 'in' && feed.source.circuit) {
    // A circuit ranking (P5c): "Naija Pro Circuit ranking: Places 1 to 4 go
    // to Finals."
    return tt('feeds.fromCircuitLine', '{circuit} ranking: {line}')
      .replace('{circuit}', feed.source.circuit.name).replace('{line}', line);
  }
  return (direction === 'in'
    ? tt('feeds.fromLine', '{tournament}, {stage}: {line}')
      .replace('{tournament}', feed.source.tournament.title).replace('{stage}', stageName(tt, feed.source.stage, feed.source.format))
    : tt('feeds.toLine', 'To {tournament}: {line}')
      .replace('{tournament}', feed.target.tournament.title))
    .replace('{line}', line);
}

/**
 * Where an incoming feed's places come from, as a name and a page: another
 * tournament's bracket, or a circuit's ranking (P5c).
 */
export function feedFrom(feed) {
  const circuit = feed?.source?.circuit;
  if (circuit) return { title: circuit.name, href: `/circuits/${circuit.slug}`, circuit: true };
  const t = feed?.source?.tournament || {};
  return { title: t.title, href: `/tournaments/${t.slug}?tab=bracket`, circuit: false };
}
