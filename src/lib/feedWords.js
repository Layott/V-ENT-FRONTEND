import { lineWords } from '@/lib/stageGraph';

/**
 * A feed between tournaments in words (P2, design section 7): "Lagos
 * Qualifier, League: Places 1 to 2 go to Finals." on the receiving side, "To
 * Nigeria Finals: Places 1 to 2 go to Finals." on the sending side. One
 * sentence for the organiser's feeds panel and the public bracket page.
 */
export function feedSentence(tt, feed, direction) {
  const line = lineWords(tt, feed, { groups: feed.source.groups }, feed.target.stage);
  return (direction === 'in'
    ? tt('feeds.fromLine', '{tournament}, {stage}: {line}')
      .replace('{tournament}', feed.source.tournament.title).replace('{stage}', feed.source.stage)
    : tt('feeds.toLine', 'To {tournament}: {line}')
      .replace('{tournament}', feed.target.tournament.title))
    .replace('{line}', line);
}
