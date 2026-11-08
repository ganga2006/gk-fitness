import { useState } from 'react';
import { useStore } from '../state/store';
import { AnimThumb } from '../anim/Thumb';
import { Body } from '../anim/Body';
import { Icon } from '../components/Icon';
import type { Level } from '../data/exercises';

const LEVELS: { id: Level; name: string; blurb: string; anim: string; color: string }[] = [
  { id: 'beginner', name: 'Beginner · Belly focus', anim: 'crunch',
    blurb: 'New or coming back. Calorie-burning circuits plus long core blocks to work the waistline.',
    color: 'var(--lv-beginner)' },
  { id: 'intermediate', name: 'Intermediate · Chest focus', anim: 'pushup',
    blurb: 'You train semi-regularly. Pressing volume leads, with core as a shorter supporting block.',
    color: 'var(--lv-intermediate)' },
  { id: 'advanced', name: 'Advanced · Abs & chest', anim: 'archerPushup'.length ? 'archerPushup' : 'pushup',
    blurb: 'Consistent training. High-volume pressing supersetted with high-tension ab work.',
    color: 'var(--lv-advanced)' },
];

export function Onboarding() {
  const { state, dispatch } = useStore();
  const [stage, setStage] = useState(0);
  const [name, setName] = useState(state.profile.name);
  const [level, setLevel] = useState<Level>(state.profile.level);
  const [weight, setWeight] = useState(String(state.profile.weightKg));
  const [goal, setGoal] = useState(state.profile.goalPerWeek);

  const finish = () => {
    const kg = Math.min(250, Math.max(25, Number(weight) || 70));
    dispatch({
      type: 'profile',
      patch: {
        name: name.trim() || 'Athlete',
        level, weightKg: kg, goalPerWeek: goal,
        onboarded: true, createdAt: Date.now(),
      },
    });
  };

  return (
    <div className="scroll-area" style={{ paddingBottom: 32 }}>
      <div className="page-pad" style={{ paddingTop: 'calc(var(--safe-t) + 36px)' }}>
        {/* progress pips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              height: 3, flex: 1, borderRadius: 3,
              background: i <= stage ? 'var(--volt)' : 'var(--surface-2)',
              transition: 'background .25s ease',
            }} />
          ))}
        </div>

        {stage === 0 && (
          <div className="fade-in">
            <div style={{
              width: 76, height: 76, borderRadius: 22, marginBottom: 22,
              background: 'var(--volt)', display: 'grid', placeItems: 'center',
              boxShadow: 'var(--glow-volt)',
            }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#0A0C11', letterSpacing: '-.05em' }}>GK</span>
            </div>
            <h1 className="h-display">GK Fitness</h1>
            <p style={{ color: 'var(--txt-2)', marginTop: 10, fontSize: 15, lineHeight: 1.5 }}>
              Home workouts with animated form guidance, a voice coach that talks you
              through every rep, and a calendar that tracks what you actually burned.
            </p>

            <div style={{ marginTop: 30 }}>
              <div className="eyebrow" style={{ marginBottom: 9 }}>What should I call you?</div>
              <input
                className="field" value={name} autoFocus
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                onKeyDown={(e) => e.key === 'Enter' && setStage(1)}
              />
            </div>

            <button className="btn btn-primary btn-block" style={{ marginTop: 22 }} onClick={() => setStage(1)}>
              Continue <Icon name="chevronRight" size={17} />
            </button>
          </div>
        )}

        {stage === 1 && (
          <div className="fade-in">
            <h1 className="h-display">Pick your level</h1>
            <p style={{ color: 'var(--txt-2)', marginTop: 8, fontSize: 14 }}>
              You can change this any time, and the app will suggest a change when your
              sessions get consistently easy or hard.
            </p>

            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className="card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: 14,
                    textAlign: 'left',
                    borderColor: level === l.id ? l.color : 'var(--hairline)',
                    background: level === l.id ? 'var(--surface-2)' : 'var(--surface)',
                  }}
                >
                  <div style={{ width: 64, height: 64, flexShrink: 0 }}>
                    {level === l.id
                      ? <Body anim={l.anim} playing interactive={false} />
                      : <AnimThumb anim={l.anim} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 750, fontSize: 15 }}>{l.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--txt-2)', marginTop: 3, lineHeight: 1.4 }}>
                      {l.blurb}
                    </div>
                  </div>
                  {level === l.id && <Icon name="check" size={19} />}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="btn btn-ghost" onClick={() => setStage(0)}>
                <Icon name="chevronLeft" size={17} />
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStage(2)}>
                Continue <Icon name="chevronRight" size={17} />
              </button>
            </div>
          </div>
        )}

        {stage === 2 && (
          <div className="fade-in">
            <h1 className="h-display">A couple of numbers</h1>
            <p style={{ color: 'var(--txt-2)', marginTop: 8, fontSize: 14 }}>
              Your weight is what turns exercise time into a calorie estimate, so it is
              worth getting roughly right.
            </p>

            <div style={{ marginTop: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 9 }}>Body weight (kg)</div>
              <input
                className="field num" value={weight} inputMode="decimal" type="number"
                onChange={(e) => setWeight(e.target.value)} placeholder="70"
              />
            </div>

            <div style={{ marginTop: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 9 }}>Target sessions per week</div>
              <div className="seg">
                {[3, 4, 5, 6].map((n) => (
                  <button key={n} className={goal === n ? 'on' : ''} onClick={() => setGoal(n)}>{n}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button className="btn btn-ghost" onClick={() => setStage(1)}>
                <Icon name="chevronLeft" size={17} />
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={finish}>
                Start training
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
