'use client';

/**
 * A tournament in stages, drawn as boxes joined by its lines (P1f).
 *
 * CEO, 16 October 2026: "i aprove the design". Section 2 of the bracket
 * structure design: "Every competition on V-ENT becomes a graph of stages ...
 * Progressions are the lines between boxes." One picture for two screens: the
 * organiser's planner draws it from the draft as it is edited, and the public
 * Path view draws it from the saved plan with who went through each line.
 *
 * At 720px and wider the lines are drawn between the boxes, measured from the
 * boxes themselves so they follow any label length. Narrower, the columns
 * stack and each box says in words where its people go, which is also what a
 * screen reader reads at every width.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { formatLabel } from '@/lib/formatLabel';
import { layout, lineWords, stageState } from '@/lib/stageGraph';
import styles from './stage-graph.module.css';

const WIDE = 720;

export default function StageGraph({ stages, lines, selected = null, onPick = null, showState = false }) {
  const tt = useT();
  const { columns, edges } = layout(stages, lines);
  const wrap = useRef(null);
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const [paths, setPaths] = useState([]);
  const shape = JSON.stringify([
    (stages || []).map(s => [s.id, s.label, s.groups]),
    edges.map(e => [e.source, e.target, e.side, Boolean(e.fired_at)]),
  ]);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    const draw = () => {
      if (el.clientWidth < WIDE) { setPaths([]); return; }
      const box = el.getBoundingClientRect();
      const rect = id => el.querySelector(`[data-stage="${String(id).replace(/"/g, '')}"]`)?.getBoundingClientRect();
      setPaths(edgesRef.current.map((e, i) => {
        const a = rect(e.source);
        const b = rect(e.target);
        if (!a || !b || b.left <= a.right) return null;
        const x1 = a.right - box.left;
        const y1 = a.top + a.height / 2 - box.top;
        const x2 = b.left - box.left - 10;
        const y2 = b.top + b.height / 2 - box.top + (e.side === 'losers' ? 12 : e.side === 'winners' ? -12 : 0);
        const mid = (x1 + x2) / 2;
        return { key: i, sent: Boolean(e.fired_at), d: `M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`,
                 head: `${x2},${y2 - 6} ${x2 + 9},${y2} ${x2},${y2 + 6}` };
      }).filter(Boolean));
    };
    draw();
    const watch = new ResizeObserver(draw);
    watch.observe(el);
    return () => watch.disconnect();
  }, [shape]);

  const byId = Object.fromEntries((stages || []).map(s => [String(s.id), s]));
  const nameOf = (stage, i) => stage?.label || tt('stages.graph.stageN', 'Stage {n}').replace('{n}', i + 1);
  const order = (stages || []).map(s => String(s.id));
  const labelOf = id => nameOf(byId[String(id)], order.indexOf(String(id)));

  const stateOf = stage => stageState(tt, stage);

  return (
    <div className={styles.graph} ref={wrap}>
      <svg className={styles.lines} aria-hidden="true">
        {paths.map(p => (
          <g key={p.key} className={p.sent ? styles.sent : undefined}>
            <path d={p.d} />
            <polygon points={p.head} />
          </g>
        ))}
      </svg>
      <div className={styles.columns}>
        {columns.map((column, c) => (
          <div key={c} className={styles.column}>
            {column.map(stage => {
              const out = edges.filter(e => String(e.source) === String(stage.id));
              const groups = Number(stage.groups) > 1;
              const body = (
                <>
                  <span className={styles.name}>{nameOf(stage, order.indexOf(String(stage.id)))}</span>
                  <span className={styles.format}>
                    {formatLabel(tt, stage.format, stage.format_label || stage.format)}
                    {groups ? `, ${tt('stages.graph.groupsN', '{n} groups').replace('{n}', stage.groups)}` : ''}
                  </span>
                  {showState && <span className={styles.state}>{stateOf(stage)}</span>}
                  {out.length > 0 && (
                    <span className={styles.goes}>
                      {out.map((e, i) => (
                        <span key={i} className={styles.line}>
                          {lineWords(tt, e, stage, labelOf(e.target))}
                          {e.sent?.length > 0 && (
                            <span className={styles.through}>
                              {tt('stages.graph.through', 'Through: {names}')
                                .replace('{names}', e.sent.map(r => r.name).filter(Boolean).join(', '))}
                            </span>
                          )}
                        </span>
                      ))}
                    </span>
                  )}
                </>
              );
              const on = selected !== null && String(selected) === String(stage.id);
              return onPick ? (
                <button key={stage.id} type="button" data-stage={String(stage.id)}
                        className={`${styles.box} ${styles.pick} ${on ? styles.on : ''}`}
                        aria-pressed={on} onClick={() => onPick(stage.id)}>
                  {body}
                </button>
              ) : (
                <div key={stage.id} data-stage={String(stage.id)} className={styles.box}>{body}</div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
