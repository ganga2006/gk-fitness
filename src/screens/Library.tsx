import { useMemo, useState } from 'react';
import { Thumb } from '../anim/Thumb';
import { Body } from '../anim/Body';
import { partsOf, PART_LABEL, PART_ANATOMY } from '../lib/parts';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { EXERCISES, GROUP_LABEL, BY_ID, type Group, type Level } from '../data/exercises';
import { useStore } from '../state/store';

const GROUPS: (Group | 'all')[] = ['all', 'cardio', 'upper', 'lower', 'core', 'fullbody', 'mobility'];

export function Library({ openId, setOpenId }: {
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<Group | 'all'>('all');
  const [level, setLevel] = useState<Level | 'all'>('all');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      if (group !== 'all' && e.group !== group) return false;
      if (level !== 'all' && !e.levels.includes(level)) return false;
      if (!needle) return true;
      return (
        e.name.toLowerCase().includes(needle) ||
        e.muscles.some((m) => m.toLowerCase().includes(needle))
      );
    });
  }, [q, group, level]);

  return (
    <div className="scroll-area">
      <div className="topbar">
        <div className="grow">
          <div className="eyebrow">{EXERCISES.length} exercises</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.028em' }}>Library</h2>
        </div>
      </div>

      <div className="page-pad">
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 13, top: 13, color: 'var(--txt-3)' }}>
            <Icon name="search" size={18} />
          </span>
          <input
            className="field" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search moves or muscles" style={{ paddingLeft: 42 }}
          />
        </div>

        <div className="chips-row" style={{ marginTop: 12 }}>
          {GROUPS.map((g) => (
            <button key={g} className={`chip${group === g ? ' on' : ''}`} onClick={() => setGroup(g)}>
              {g === 'all' ? 'All' : GROUP_LABEL[g]}
            </button>
          ))}
        </div>

        <div className="chips-row" style={{ marginTop: 8 }}>
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((l) => (
            <button key={l} className={`chip${level === l ? ' on' : ''}`} onClick={() => setLevel(l)}>
              {l === 'all' ? 'Any level' : l[0].toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>

        <div className="lib-grid" style={{ marginTop: 16 }}>
          {list.map((e) => (
            <button key={e.id} className="lib-card" onClick={() => setOpenId(e.id)}>
              <div className="lib-fig">
                <Thumb exId={e.id} />
              </div>
              <div>
                <div className="ex-name" style={{ fontSize: 13.5 }}>{e.name}</div>
                <div className="ex-sub" style={{ fontSize: 11.5 }}>{e.muscles[0]}</div>
              </div>
            </button>
          ))}
        </div>

        {list.length === 0 && (
          <div className="empty">
            <Icon name="search" size={28} />
            <p style={{ fontSize: 13.5 }}>Nothing matches that. Try a different filter.</p>
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>

      <ExerciseSheet id={openId} onClose={() => setOpenId(null)} onSwap={setOpenId} />
    </div>
  );
}

export function ExerciseSheet({ id, onClose, onSwap }: {
  id: string | null; onClose: () => void; onSwap: (id: string) => void;
}) {
  const { state } = useStore();
  const e = id ? BY_ID[id] : null;

  return (
    <Sheet open={!!e} onClose={onClose} title={e?.name}>
      {e && (
        <>
          <div style={{
            height: 230, background: 'var(--surface-2)', borderRadius: 'var(--r-lg)',
            marginBottom: 10, overflow: 'hidden', position: 'relative',
          }}>
            <Body anim={e.anim} highlight={partsOf(e)} />
            <span style={{
              position: 'absolute', left: 12, bottom: 10,
              fontSize: 10.5, color: 'var(--txt-3)', fontWeight: 650,
            }}>
              Red = muscles worked · drag to rotate
            </span>
          </div>

          <div className="target-row" style={{ marginBottom: 14 }}>
            {partsOf(e).map((p) => (
              <span key={p} className="target-chip" title={PART_ANATOMY[p]}>
                {PART_LABEL[p]}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: -6, marginBottom: 16, lineHeight: 1.5 }}>
            {partsOf(e).map((p) => PART_ANATOMY[p]).join(' · ')}
          </p>

          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
            <span className="chip">{GROUP_LABEL[e.group]}</span>
            {e.levels.map((l) => <span key={l} className="chip">{l}</span>)}
            <span className="chip"><Icon name="bolt" size={12} /> MET {e.met}</span>
          </div>

          <Section title="Targets">
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {e.muscles.map((m) => <span key={m} className="chip">{m}</span>)}
            </div>
          </Section>

          <Section title="Form cues">
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {e.cues.map((c) => (
                <li key={c} style={{ display: 'flex', gap: 10, fontSize: 13.5, lineHeight: 1.45 }}>
                  <span style={{ color: 'var(--volt)', marginTop: 2 }}><Icon name="check" size={15} /></span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Common mistakes">
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {e.mistakes.map((c) => (
                <li key={c} style={{ display: 'flex', gap: 10, fontSize: 13.5, lineHeight: 1.45 }}>
                  <span style={{ color: 'var(--danger)', marginTop: 2 }}><Icon name="close" size={15} /></span>
                  <span style={{ color: 'var(--txt-2)' }}>{c}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="How to improve">
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {e.tips.map((c) => (
                <li key={c} style={{ display: 'flex', gap: 10, fontSize: 13.5, lineHeight: 1.45 }}>
                  <span style={{ color: 'var(--aqua)', marginTop: 2 }}><Icon name="spark" size={15} /></span>
                  <span style={{ color: 'var(--txt-2)' }}>{c}</span>
                </li>
              ))}
            </ul>
          </Section>

          {(e.easier || e.harder) && (
            <Section title="Progressions">
              <div style={{ display: 'flex', gap: 10 }}>
                {e.easier && BY_ID[e.easier] && (
                  <button className="card" style={{ flex: 1, padding: 12, textAlign: 'left' }}
                          onClick={() => onSwap(e.easier!)}>
                    <div className="eyebrow">Easier</div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 4 }}>{BY_ID[e.easier].name}</div>
                  </button>
                )}
                {e.harder && BY_ID[e.harder] && (
                  <button className="card" style={{ flex: 1, padding: 12, textAlign: 'left' }}
                          onClick={() => onSwap(e.harder!)}>
                    <div className="eyebrow">Harder</div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 4 }}>{BY_ID[e.harder].name}</div>
                  </button>
                )}
              </div>
            </Section>
          )}
        </>
      )}
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="eyebrow" style={{ marginBottom: 9 }}>{title}</div>
      {children}
    </div>
  );
}
