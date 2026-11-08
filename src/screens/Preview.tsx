import { useMemo } from 'react';
import { Thumb } from '../anim/Thumb';
import { Icon } from '../components/Icon';
import { BY_ID, ex } from '../data/exercises';
import type { Block } from '../data/plans';
import { estimateSession } from '../lib/calories';
import { fmtDuration } from '../lib/date';
import { flattenItems } from '../lib/session';
import { useStore } from '../state/store';

export function Preview({
  blocks, title, onStart, onBack, onOpenExercise,
}: {
  blocks: Block[]; title: string;
  onStart: () => void; onBack: () => void;
  onOpenExercise: (id: string) => void;
}) {
  const { state } = useStore();
  const items = useMemo(() => flattenItems(blocks), [blocks]);
  const est = useMemo(() => estimateSession(items, state.profile.weightKg), [items, state.profile.weightKg]);

  const groups = useMemo(() => {
    const set = new Set(items.map((i) => BY_ID[i.id]?.group).filter(Boolean));
    return [...set];
  }, [items]);

  return (
    <div className="scroll-area" style={{ paddingBottom: 110 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <Icon name="chevronLeft" size={18} />
        </button>
        <div className="grow">
          <div className="eyebrow">Workout</div>
        </div>
      </div>

      <div className="page-pad">
        <h1 className="h-display">{title}</h1>
        <div className="meta-row">
          <span className="chip"><Icon name="clock" size={13} /> {fmtDuration(est.seconds)}</span>
          <span className="chip"><Icon name="flame" size={13} /> ~{est.calories} kcal</span>
          <span className="chip"><Icon name="dumbbell" size={13} /> {items.length} moves</span>
        </div>
        {groups.length > 0 && (
          <p style={{ color: 'var(--txt-3)', fontSize: 12.5, marginTop: 10 }}>
            Targets: {groups.join(' · ')}
          </p>
        )}

        {blocks.map((b) => (
          <div key={b.name}>
            <div className="block-head">
              <h3 className="h-section">{b.name}</h3>
              <div className="line" />
              <span style={{ fontSize: 11.5, color: 'var(--txt-3)', fontWeight: 650 }}>
                {b.items.length}
              </span>
            </div>
            {b.items.map((it, i) => {
              const e = ex(it.id);
              return (
                <button key={`${it.id}-${i}`} className="ex-row" onClick={() => onOpenExercise(it.id)}>
                  <div className="ex-thumb">
                    <Thumb exId={e.id} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ex-name">{e.name}</div>
                    <div className="ex-sub">{e.muscles.slice(0, 2).join(' · ')}</div>
                  </div>
                  <span className="ex-dose">
                    {it.mode === 'time' ? `${it.seconds}s` : `${it.sets} × ${it.reps}`}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 25,
        padding: `14px var(--s5) calc(var(--safe-b) + 16px)`,
        background: 'linear-gradient(transparent, var(--bg) 28%)',
      }}>
        <button className="btn btn-primary btn-block" onClick={onStart}>
          <Icon name="play" size={16} /> Start workout
        </button>
      </div>
    </div>
  );
}
