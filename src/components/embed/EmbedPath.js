'use client';
/**
 * A tournament's path on somebody else's website (P8, after P1f).
 *
 * The stages as boxes joined by their lines, and who went through each line:
 * the same StageGraph the tournament page draws above its bracket, read from
 * the same public plan (`/tournament/<slug>/stages/`). Nothing in the frame
 * picks a stage (no onPick): pressing a box would mean a bracket the frame
 * does not draw, and the bracket widget already has the path at its top.
 *
 * Public, current through useLiveData (half a minute, slowing to two).
 */
import { useT } from '@/i18n/LanguageProvider';
import useLiveData from '@/lib/useLiveData';
import StageGraph from '@/components/stage-graph/StageGraph';
import styles from './embed.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function EmbedPath({ slug }) {
  const tt = useT();
  const { data, loading, error, refresh } = useLiveData(async ({ signal }) => {
    const res = await fetch(`${API}/tournament/${encodeURIComponent(slug)}/stages/`, { signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.status !== 'success') throw body;
    return body.data;
  }, [slug], { interval: 30000, maxInterval: 120000 });

  if (loading && !data) return <p className={styles.note} aria-busy="true">{tt('ui.loading', 'Loading…')}</p>;
  if (error && !data) {
    return (
      <div className={styles.stateBlock}>
        <p className={styles.note}>{error}</p>
        <button type="button" className={styles.chip} onClick={refresh}>{tt('embed.tryAgain', 'Try again')}</button>
      </div>
    );
  }
  const stages = data?.stages || [];
  if (stages.length < 2) {
    return (
      <p className={styles.note}>
        {stages.length
          ? tt('embed.pathOneStage', 'This tournament is played as one stage, so there is no path to draw.')
          : tt('embed.pathEmpty', 'The organiser has not planned the stages yet.')}
      </p>
    );
  }
  return (
    <section aria-label={tt('stages.graph.pathLabel', 'The path through this tournament')}>
      <StageGraph stages={stages} lines={data.progressions || []} showState />
    </section>
  );
}
