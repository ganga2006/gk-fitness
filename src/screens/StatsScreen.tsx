import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { evaluate } from '../data/achievements';
import { GROUP_LABEL, type Group } from '../data/exercises';
import { dailySeries } from '../lib/stats';
import { fmtDuration } from '../lib/date';
import { useStore } from '../state/store';

const GROUP_COLORS: Record<Group, string> = {
  cardio: 'var(--ember)',
  upper: 'var(--violet)',
  lower: 'var(--volt)',
  core: 'var(--aqua)',
  fullbody: 'var(--warn)',
  mobility: 'var(--txt-3)',
};

export function StatsScreen() {
  const { state, stats } = useStore();
  const [range, setRange] = useState<7 | 14 | 30>(7);

  const series = useMemo(() => dailySeries(stats, range), [stats, range]);
  const peak = Math.max(1, ...series.map((s) => s.value));

  const groupTotal = Object.values(stats.byGroup).reduce((a, b) => a + b, 0) || 1;
  const groupRows = (Object.keys(stats.byGroup) as Group[])
    .map((g) => ({ g, sec: stats.byGroup[g], pct: stats.byGroup[g] / groupTotal }))
    .filter((r) => r.sec > 0)
    .sort((a, b) => b.sec - a.sec);

  const achievements = useMemo(() => evaluate(stats), [stats]);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="scroll-area">
      <div className="topbar">
        <div className="grow">
          <div className="eyebrow">Progress</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.028em' }}>Stats</h2>
        </div>
      </div>

      <div className="page-pad">
        <div className="stat-grid">
          <div className="stat-tile">
            <span className="stat-val num">{stats.sessions}</span>
            <span className="stat-lab">Workouts</span>
          </div>
          <div className="stat-tile">
            <span className="stat-val num" style={{ color: 'var(--volt)' }}>{stats.totalCalories}</span>
            <span className="stat-lab">Total kcal</span>
          </div>
          <div className="stat-tile">
            <span className="stat-val num" style={{ color: 'var(--aqua)' }}>{stats.totalMinutes}</span>
            <span className="stat-lab">Total min</span>
          </div>
        </div>

        {/* ── calories chart ── */}
        <div className="block-head">
          <h3 className="h-section">Calories burned</h3>
          <div className="line" />
        </div>
        <div className="seg" style={{ marginBottom: 16 }}>
          {([7, 14, 30] as const).map((n) => (
            <button key={n} className={range === n ? 'on' : ''} onClick={() => setRange(n)}>
              {n}d
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="bars">
            {series.map((s, i) => (
              <div className="bar-col" key={s.key}>
                <div
                  className={`bar${s.value === 0 ? ' empty' : ''}`}
                  style={{ height: `${Math.max(2, (s.value / peak) * 100)}%` }}
                  title={`${s.key}: ${s.value} kcal`}
                />
                {range <= 14 && <span className="bar-l">{s.label}</span>}
                {range > 14 && i % 5 === 0 && <span className="bar-l">{s.key.slice(8)}</span>}
                {range > 14 && i % 5 !== 0 && <span className="bar-l">&nbsp;</span>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 11.5, color: 'var(--txt-3)', fontWeight: 650 }}>
            <span>Peak {peak} kcal</span>
            <span>{series.reduce((a, b) => a + b.value, 0)} kcal total</span>
          </div>
        </div>

        {/* ── personal records ── */}
        <div className="block-head">
          <h3 className="h-section">Personal records</h3>
          <div className="line" />
        </div>
        <div className="row">
          <div style={{ color: 'var(--ember)' }}><Icon name="flame" size={19} /></div>
          <div className="grow">
            <div className="row-t">Longest streak</div>
            <div className="row-s">Consecutive training days</div>
          </div>
          <span className="num" style={{ fontWeight: 800, fontSize: 17 }}>{stats.bestStreak}</span>
        </div>
        <div className="row">
          <div style={{ color: 'var(--volt)' }}><Icon name="bolt" size={19} /></div>
          <div className="grow">
            <div className="row-t">Biggest burn</div>
            <div className="row-s">Most calories in one session</div>
          </div>
          <span className="num" style={{ fontWeight: 800, fontSize: 17 }}>{stats.bestSessionCalories}</span>
        </div>
        <div className="row">
          <div style={{ color: 'var(--aqua)' }}><Icon name="shield" size={19} /></div>
          <div className="grow">
            <div className="row-t">Longest hold</div>
            <div className="row-s">Plank, wall sit or hollow hold</div>
          </div>
          <span className="num" style={{ fontWeight: 800, fontSize: 17 }}>
            {stats.longestHoldSec ? fmtDuration(stats.longestHoldSec) : '—'}
          </span>
        </div>

        {/* ── training balance ── */}
        {groupRows.length > 0 && (
          <>
            <div className="block-head">
              <h3 className="h-section">Training balance</h3>
              <div className="line" />
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
                {groupRows.map((r) => (
                  <div key={r.g} style={{ width: `${r.pct * 100}%`, background: GROUP_COLORS[r.g] }} />
                ))}
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {groupRows.map((r) => (
                  <div key={r.g} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}>
                    <span className="lvl-dot" style={{ background: GROUP_COLORS[r.g] }} />
                    <span style={{ flex: 1 }}>{GROUP_LABEL[r.g]}</span>
                    <span style={{ color: 'var(--txt-3)', fontSize: 12 }}>{fmtDuration(r.sec)}</span>
                    <span className="num" style={{ fontWeight: 700, minWidth: 34, textAlign: 'right' }}>
                      {Math.round(r.pct * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── achievements ── */}
        <div className="block-head">
          <h3 className="h-section">Achievements</h3>
          <div className="line" />
          <span style={{ fontSize: 12, color: 'var(--txt-3)', fontWeight: 650 }}>
            {unlockedCount}/{achievements.length}
          </span>
        </div>
        <div className="ach-grid">
          {achievements.map((a) => (
            <div key={a.id} className={`ach ${a.tier}${a.unlocked ? '' : ' locked'}`}>
              <div className="ach-ic"><Icon name={a.icon} size={18} /></div>
              <div className="ach-n">{a.name}</div>
              <div className="ach-d">{a.desc}</div>
              {!a.unlocked && (
                <>
                  <div className="ach-bar"><i style={{ width: `${a.pct * 100}%` }} /></div>
                  <div style={{ fontSize: 10.5, color: 'var(--txt-3)', marginTop: 5, fontWeight: 650 }}>
                    {Math.round(a.cur)} / {a.target}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* ── weight trend ── */}
        {state.weights.length > 1 && (
          <>
            <div className="block-head">
              <h3 className="h-section">Weight</h3>
              <div className="line" />
            </div>
            <WeightChart entries={state.weights} />
          </>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function WeightChart({ entries }: { entries: { date: string; kg: number }[] }) {
  const pts = entries.slice(-20);
  const min = Math.min(...pts.map((p) => p.kg));
  const max = Math.max(...pts.map((p) => p.kg));
  const span = Math.max(1, max - min);
  const W = 300, H = 90;
  const path = pts
    .map((p, i) => {
      const x = (i / Math.max(1, pts.length - 1)) * W;
      const y = H - ((p.kg - min) / span) * (H - 16) - 8;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="card" style={{ padding: 16 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 90, display: 'block', overflow: 'visible' }}>
        <path d={path} fill="none" stroke="var(--aqua)" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => {
          const x = (i / Math.max(1, pts.length - 1)) * W;
          const y = H - ((p.kg - min) / span) * (H - 16) - 8;
          return <circle key={p.date} cx={x} cy={y} r={i === pts.length - 1 ? 4 : 2.5} fill="var(--aqua)" />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11.5, color: 'var(--txt-3)', fontWeight: 650 }}>
        <span>{pts[0].kg} kg</span>
        <span className="num" style={{ color: 'var(--txt)', fontWeight: 800 }}>
          {pts[pts.length - 1].kg} kg
        </span>
      </div>
    </div>
  );
}
