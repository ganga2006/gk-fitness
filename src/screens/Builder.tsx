import { useMemo, useState } from 'react';
import { Thumb } from '../anim/Thumb';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { EXERCISES, GROUP_LABEL, ex, type Group } from '../data/exercises';
import type { PlanItem } from '../data/plans';
import { estimateSession } from '../lib/calories';
import { fmtDuration } from '../lib/date';
import { useStore } from '../state/store';

export function Builder({ onBack, onSaved }: { onBack: () => void; onSaved: (name: string) => void }) {
  const { state, dispatch } = useStore();
  const [name, setName] = useState('');
  const [items, setItems] = useState<PlanItem[]>([]);
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState<Group | 'all'>('all');

  const est = useMemo(() => estimateSession(items, state.profile.weightKg), [items, state.profile.weightKg]);

  const add = (id: string) => {
    setItems((prev) => [...prev, { id, mode: 'time', seconds: 40, rest: 20 }]);
    setPicking(false);
  };

  const update = (i: number, patch: Partial<PlanItem>) =>
    setItems((prev) => prev.map((it, j) => (j === i ? ({ ...it, ...patch } as PlanItem) : it)));

  const move = (i: number, dir: -1 | 1) =>
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const toggleMode = (i: number) => {
    const it = items[i];
    if (it.mode === 'time') update(i, { mode: 'reps', sets: 3, reps: 12, rest: 30 } as Partial<PlanItem>);
    else update(i, { mode: 'time', seconds: 40, rest: 20 } as Partial<PlanItem>);
  };

  const save = () => {
    const finalName = name.trim() || 'My Workout';
    dispatch({
      type: 'addCustom',
      workout: { id: `c${Date.now()}`, name: finalName, createdAt: Date.now(), items },
    });
    onSaved(finalName);
  };

  const pool = filter === 'all' ? EXERCISES : EXERCISES.filter((e) => e.group === filter);

  return (
    <div className="scroll-area" style={{ paddingBottom: 110 }}>
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <Icon name="chevronLeft" size={18} />
        </button>
        <div className="grow"><div className="eyebrow">Create</div></div>
      </div>

      <div className="page-pad">
        <h1 className="h-display">Build a workout</h1>

        <input
          className="field" style={{ marginTop: 18 }}
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Workout name"
        />

        {items.length > 0 && (
          <div className="meta-row">
            <span className="chip"><Icon name="clock" size={13} /> {fmtDuration(est.seconds)}</span>
            <span className="chip"><Icon name="flame" size={13} /> ~{est.calories} kcal</span>
          </div>
        )}

        <div className="block-head">
          <h3 className="h-section">Exercises</h3>
          <div className="line" />
          <span style={{ fontSize: 12, color: 'var(--txt-3)', fontWeight: 650 }}>{items.length}</span>
        </div>

        {items.length === 0 && (
          <div className="empty">
            <Icon name="dumbbell" size={28} />
            <p style={{ fontSize: 13.5, maxWidth: 250 }}>
              Add moves from the library, then set each one to a timer or to sets and reps.
            </p>
          </div>
        )}

        {items.map((it, i) => {
          const e = ex(it.id);
          return (
            <div key={`${it.id}-${i}`} className="card" style={{ padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div className="ex-thumb" style={{ width: 48, height: 48 }}>
                  <Thumb exId={e.id} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ex-name">{e.name}</div>
                  <div className="ex-sub">{e.muscles[0]}</div>
                </div>
                <button className="icon-btn" style={{ width: 30, height: 30 }}
                        onClick={() => move(i, -1)} aria-label="Move up">
                  <Icon name="chevronLeft" size={14} className="rot90" />
                </button>
                <button className="icon-btn" style={{ width: 30, height: 30 }}
                        onClick={() => setItems((p) => p.filter((_, j) => j !== i))} aria-label="Remove">
                  <Icon name="trash" size={14} />
                </button>
              </div>

              <div className="seg" style={{ marginTop: 11 }}>
                <button className={it.mode === 'time' ? 'on' : ''} onClick={() => it.mode !== 'time' && toggleMode(i)}>
                  Timer
                </button>
                <button className={it.mode === 'reps' ? 'on' : ''} onClick={() => it.mode !== 'reps' && toggleMode(i)}>
                  Sets × reps
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 11 }}>
                {it.mode === 'time' ? (
                  <Stepper label="Seconds" value={it.seconds} step={5} min={10} max={180}
                           onChange={(v) => update(i, { seconds: v } as Partial<PlanItem>)} />
                ) : (
                  <>
                    <Stepper label="Sets" value={it.sets} step={1} min={1} max={8}
                             onChange={(v) => update(i, { sets: v } as Partial<PlanItem>)} />
                    <Stepper label="Reps" value={it.reps} step={1} min={1} max={50}
                             onChange={(v) => update(i, { reps: v } as Partial<PlanItem>)} />
                  </>
                )}
                <Stepper label="Rest" value={it.rest} step={5} min={0} max={120}
                         onChange={(v) => update(i, { rest: v } as Partial<PlanItem>)} />
              </div>
            </div>
          );
        })}

        <button className="btn btn-ghost btn-block" style={{ marginTop: 6 }} onClick={() => setPicking(true)}>
          <Icon name="plus" size={16} /> Add exercise
        </button>
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 25,
        padding: `14px var(--s5) calc(var(--safe-b) + 16px)`,
        background: 'linear-gradient(transparent, var(--bg) 28%)',
      }}>
        <button className="btn btn-primary btn-block" disabled={items.length === 0} onClick={save}>
          Save workout
        </button>
      </div>

      <Sheet open={picking} onClose={() => setPicking(false)} title="Add an exercise">
        <div className="chips-row" style={{ marginBottom: 14 }}>
          {(['all', 'cardio', 'upper', 'lower', 'core', 'fullbody', 'mobility'] as const).map((g) => (
            <button key={g} className={`chip${filter === g ? ' on' : ''}`} onClick={() => setFilter(g)}>
              {g === 'all' ? 'All' : GROUP_LABEL[g]}
            </button>
          ))}
        </div>
        {pool.map((e) => (
          <button key={e.id} className="ex-row" onClick={() => add(e.id)}>
            <div className="ex-thumb">
              <Thumb exId={e.id} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ex-name">{e.name}</div>
              <div className="ex-sub">{e.muscles.slice(0, 2).join(' · ')}</div>
            </div>
            <Icon name="plus" size={17} />
          </button>
        ))}
      </Sheet>
    </div>
  );
}

function Stepper({ label, value, step, min, max, onChange }: {
  label: string; value: number; step: number; min: number; max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ flex: 1 }}>
      <div className="eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'var(--surface-2)', borderRadius: 'var(--r-pill)',
        border: '1px solid var(--hairline)', padding: 3,
      }}>
        <button className="icon-btn" style={{ width: 28, height: 28, background: 'transparent', border: 'none' }}
                onClick={() => onChange(Math.max(min, value - step))} aria-label={`Decrease ${label}`}>
          <Icon name="minus" size={14} />
        </button>
        <span className="num" style={{ flex: 1, textAlign: 'center', fontWeight: 750, fontSize: 14 }}>
          {value}
        </span>
        <button className="icon-btn" style={{ width: 28, height: 28, background: 'transparent', border: 'none' }}
                onClick={() => onChange(Math.min(max, value + step))} aria-label={`Increase ${label}`}>
          <Icon name="plus" size={14} />
        </button>
      </div>
    </div>
  );
}
