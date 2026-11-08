import { useMemo, useState } from 'react';
import { Body } from '../anim/Body';
import { Thumb } from '../anim/Thumb';
import { Icon } from '../components/Icon';
import { FaceAvatar } from '../components/FaceAvatar';
import { estimateSession } from '../lib/calories';
import { dateKey, addDays, startOfWeek, fmtDuration } from '../lib/date';
import { DAY_SHORT, FOCUS_BLURB, getDayPlan, getWeek, planDayIndex, type Block } from '../data/plans';
import { flattenItems, focusSession, quickSession } from '../lib/session';
import { FOCUS_LABEL, type Focus } from '../lib/parts';
import { suggestLevel } from '../lib/stats';
import { useStore } from '../state/store';
import type { Level } from '../data/exercises';

export type StartPayload = {
  blocks: Block[];
  title: string;
  source: 'plan' | 'quick' | 'custom';
  level: Level;
};

export function Home({ onPreview, onOpenSettings, onBuild }: {
  onPreview: (p: StartPayload) => void;
  onOpenSettings: () => void;
  onBuild: () => void;
}) {
  const { state, stats, dispatch } = useStore();
  const { profile, settings } = state;
  const [dismissedSuggestion, setDismissed] = useState(false);

  const todayIdx = planDayIndex(new Date());
  const plan = getDayPlan(profile.planStyle, profile.level, todayIdx);
  const items = useMemo(() => flattenItems(plan.blocks), [plan]);
  const est = useMemo(() => estimateSession(items, profile.weightKg), [items, profile.weightKg]);

  const todayKey = dateKey();
  const doneToday = !!stats.byDate[todayKey];

  const weekStart = startOfWeek(new Date());
  const suggestion = dismissedSuggestion ? null : suggestLevel(profile.level, stats);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const startQuick = (minutes: number) => {
    onPreview({
      blocks: quickSession(profile.level, minutes),
      title: `${minutes}-Minute Quick Session`,
      source: 'quick',
      level: profile.level,
    });
  };

  return (
    <div className="scroll-area">
      <div className="topbar">
        <button className="avatar-btn" onClick={onOpenSettings} aria-label="Profile and settings">
          <FaceAvatar size={40} />
        </button>
        <div className="grow">
          <div style={{ fontSize: 11.5, color: 'var(--txt-3)', fontWeight: 650 }}>{greeting}</div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.025em' }}>
            {profile.name || 'Athlete'}
          </div>
        </div>
        {stats.currentStreak > 0 && (
          <div className="chip" style={{ color: 'var(--ember)', borderColor: 'var(--ember-ghost)', background: 'var(--ember-ghost)' }}>
            <Icon name="flame" size={14} /> {stats.currentStreak}
          </div>
        )}
      </div>

      <div className="page-pad">
        {/* ── today's session ── */}
        <div className={`hero${plan.kind === 'rest' ? ' rest' : ''} pop-in`}>
          <div className="hero-fig">
            <Body
              anim={plan.kind === 'rest' ? 'childPose' : (items[3]?.id ? exAnim(items[3].id) : 'squat')}
              interactive={false}
            />
          </div>
          <div className="hero-body">
            <div className="eyebrow" style={{ color: 'var(--volt)' }}>
              {doneToday ? 'Completed today' : `Today · ${DAY_SHORT[todayIdx]}`}
            </div>
            <h2 className="h-display" style={{ fontSize: 26, marginTop: 6 }}>{plan.title}</h2>
            <p style={{ color: 'var(--txt-2)', fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
              {plan.focus}
            </p>

            {plan.kind !== 'rest' && (
              <div className="meta-row">
                <span className="chip"><Icon name="clock" size={13} /> {fmtDuration(est.seconds)}</span>
                <span className="chip"><Icon name="flame" size={13} /> ~{est.calories} kcal</span>
              </div>
            )}
          </div>

          <div style={{ position: 'relative', zIndex: 1, marginTop: 18 }}>
            {plan.kind === 'rest' ? (
              <button className="btn btn-ghost btn-block" onClick={() => startQuick(10)}>
                Feeling good? Do a 10-minute session
              </button>
            ) : (
              <button
                className="btn btn-primary btn-block"
                onClick={() => onPreview({ blocks: plan.blocks, title: plan.title, source: 'plan', level: profile.level })}
              >
                <Icon name="play" size={16} /> {doneToday ? 'Train again' : 'Start workout'}
              </button>
            )}
          </div>
        </div>

        {profile.planStyle === 'focus' && (
          <div className="card" style={{ marginTop: 12, padding: 13, display: 'flex', gap: 11 }}>
            <div style={{ color: 'var(--ember)', marginTop: 1 }}><Icon name="target" size={18} /></div>
            <div>
              <div style={{ fontWeight: 750, fontSize: 13.5 }}>
                {FOCUS_BLURB[profile.level].headline}
              </div>
              <p style={{ fontSize: 12, color: 'var(--txt-2)', marginTop: 3, lineHeight: 1.45 }}>
                {FOCUS_BLURB[profile.level].detail}
              </p>
            </div>
          </div>
        )}

        {/* ── adaptive level suggestion ── */}
        {suggestion && (
          <div className="card fade-in" style={{ marginTop: 14, padding: 14, borderColor: 'var(--aqua)' }}>
            <div style={{ display: 'flex', gap: 11 }}>
              <div style={{ color: 'var(--aqua)', marginTop: 1 }}><Icon name="spark" size={19} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 750, fontSize: 14 }}>Time to adjust your level?</div>
                <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginTop: 4, lineHeight: 1.45 }}>
                  {suggestion.reason}
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    className="btn btn-primary" style={{ padding: '9px 15px', fontSize: 13 }}
                    onClick={() => { dispatch({ type: 'profile', patch: { level: suggestion.level } }); setDismissed(true); }}
                  >
                    Switch to {suggestion.level}
                  </button>
                  <button className="btn btn-quiet" style={{ padding: '9px 12px', fontSize: 13 }}
                          onClick={() => setDismissed(true)}>
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── this week ── */}
        <div className="block-head">
          <h3 className="h-section">This week</h3>
          <div className="line" />
          <span style={{ fontSize: 12, color: 'var(--txt-3)', fontWeight: 650 }}>
            {stats.thisWeekSessions}/{profile.goalPerWeek} done
          </span>
        </div>

        <div className="week-strip">
          {DAY_SHORT.map((d, i) => {
            const date = addDays(weekStart, i);
            const k = dateKey(date);
            const rec = stats.byDate[k];
            const dayPlan = getWeek(profile.planStyle, profile.level)[i];
            const isToday = k === todayKey;
            const isFuture = date > new Date() && !isToday;
            const cls = rec ? 'done' : dayPlan.kind === 'rest' ? 'rest' : isFuture ? '' : 'miss';
            return (
              <div key={d} className={`wday${isToday ? ' today' : ''}`}>
                <span className="wday-l">{d[0]}</span>
                <span className={`wdot ${cls}`} />
              </div>
            );
          })}
        </div>

        {/* ── headline numbers ── */}
        <div className="stat-grid" style={{ marginTop: 14 }}>
          <div className="stat-tile">
            <span className="stat-val num" style={{ color: 'var(--ember)' }}>{stats.currentStreak}</span>
            <span className="stat-lab">Day streak</span>
          </div>
          <div className="stat-tile">
            <span className="stat-val num" style={{ color: 'var(--volt)' }}>{stats.thisWeekCalories}</span>
            <span className="stat-lab">Kcal this wk</span>
          </div>
          <div className="stat-tile">
            <span className="stat-val num" style={{ color: 'var(--aqua)' }}>{stats.thisWeekMinutes}</span>
            <span className="stat-lab">Min this wk</span>
          </div>
        </div>

        {/* ── body-part targeting ── */}
        <div className="block-head">
          <h3 className="h-section">Target a body part</h3>
          <div className="line" />
        </div>
        <div className="focus-grid">
          {(['chest', 'abs', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'fullbody', 'cardio'] as Focus[]).map((f) => (
            <button
              key={f}
              className="focus-cell"
              onClick={() => onPreview({
                blocks: focusSession(profile.level, f, 18),
                title: `${FOCUS_LABEL[f]} Session`,
                source: 'quick',
                level: profile.level,
              })}
            >
              {FOCUS_LABEL[f]}
            </button>
          ))}
        </div>

        {/* ── quick start ── */}
        <div className="block-head">
          <h3 className="h-section">Quick start</h3>
          <div className="line" />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[7, 15, 20].map((m) => (
            <button key={m} className="card" style={{ flex: 1, padding: '15px 10px', textAlign: 'center' }}
                    onClick={() => startQuick(m)}>
              <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-.03em' }} className="num">{m}</div>
              <div style={{ fontSize: 10.5, color: 'var(--txt-3)', fontWeight: 650, letterSpacing: '.04em' }}>MINUTES</div>
            </button>
          ))}
        </div>

        <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={onBuild}>
          <Icon name="plus" size={16} /> Build your own workout
        </button>

        {/* ── saved custom workouts ── */}
        {state.customs.length > 0 && (
          <>
            <div className="block-head">
              <h3 className="h-section">My workouts</h3>
              <div className="line" />
              <button className="chip" onClick={onBuild}><Icon name="plus" size={13} /> New</button>
            </div>
            {state.customs.map((c) => {
              const e = estimateSession(c.items, profile.weightKg);
              return (
                <button key={c.id} className="ex-row"
                        onClick={() => onPreview({
                          blocks: [{ name: 'Circuit', items: c.items }],
                          title: c.name, source: 'custom', level: profile.level,
                        })}>
                  <div className="ex-thumb">
                    <Thumb exId={c.items[0]?.id ?? 'plank'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="ex-name">{c.name}</div>
                    <div className="ex-sub">{c.items.length} moves · {fmtDuration(e.seconds)} · ~{e.calories} kcal</div>
                  </div>
                  <Icon name="chevronRight" size={17} />
                </button>
              );
            })}
          </>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

// Small helper so the hero can show a representative move without importing the map everywhere.
import { BY_ID } from '../data/exercises';
function exAnim(id: string) { return BY_ID[id]?.anim ?? 'squat'; }
