import { useState } from 'react';
import { useStore } from '../state/store';
import { AnimThumb } from '../anim/Thumb';
import { Body } from '../anim/Body';
import { Icon } from '../components/Icon';
import type { Level } from '../data/exercises';
import { setLang, t, type Lang } from '../i18n';

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
  // 0 language · 1 name · 2 level · 3 numbers
  const [stage, setStage] = useState(state.settings.lang ? 1 : 0);
  const [name, setName] = useState(state.profile.name);
  const [level, setLevel] = useState<Level>(state.profile.level);
  const [weight, setWeight] = useState(String(state.profile.weightKg));
  const [goal, setGoal] = useState(state.profile.goalPerWeek);

  const finish = () => {
    const kg = Math.min(250, Math.max(25, Number(weight) || 70));
    dispatch({
      type: 'profile',
      patch: {
        name: name.trim() || t('Athlete'),
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
          {[0, 1, 2, 3].map((i) => (
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
            <h1 className="h-display">భాష ఎంచుకోండి</h1>
            <p style={{ color: 'var(--txt-2)', marginTop: 6, fontSize: 16, fontWeight: 650 }}>Choose your language</p>
            <p style={{ color: 'var(--txt-3)', marginTop: 10, fontSize: 13.5, lineHeight: 1.5 }}>
              యాప్‌లోని ప్రతి పదం, వాయిస్ కోచ్ మాటలు ఈ భాషలోనే ఉంటాయి. · Every screen and the voice coach will use this language.
            </p>
            <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                { id: 'te', big: 'తెలుగు', small: 'Telugu · తెలుగు జిమ్ అసిస్టెంట్' },
                { id: 'en', big: 'English', small: 'ఇంగ్లీష్' },
              ] as { id: Lang; big: string; small: string }[]).map((o) => (
                <button
                  key={o.id}
                  className="card lang-pick"
                  onClick={() => {
                    setLang(o.id);
                    dispatch({ type: 'settings', patch: { lang: o.id } });
                    setStage(1);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '18px 18px', textAlign: 'left',
                    borderColor: state.settings.lang === o.id ? 'var(--volt)' : 'var(--hairline)',
                  }}
                >
                  <span style={{
                    width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center', flexShrink: 0,
                    background: 'var(--surface-2)', fontWeight: 850, fontSize: 18, color: 'var(--volt)',
                  }}>{o.id === 'te' ? 'అ' : 'A'}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 800, fontSize: 20 }}>{o.big}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--txt-2)', marginTop: 2 }}>{o.small}</span>
                  </span>
                  <Icon name="chevronRight" size={18} />
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === 1 && (
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
              {t('Home workouts with a real 3D coach, a voice that talks you through every rep, and a calendar that tracks what you actually burned.')}
            </p>

            <div style={{ marginTop: 30 }}>
              <div className="eyebrow" style={{ marginBottom: 9 }}>{t('What should I call you?')}</div>
              <input
                className="field" value={name} autoFocus
                onChange={(e) => setName(e.target.value)}
                placeholder={t('Your name')}
                onKeyDown={(e) => e.key === 'Enter' && setStage(2)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="btn btn-ghost" onClick={() => setStage(0)} aria-label={t('Language')}>
                <Icon name="chevronLeft" size={17} />
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStage(2)}>
                {t('Continue')} <Icon name="chevronRight" size={17} />
              </button>
            </div>
          </div>
        )}

        {stage === 2 && (
          <div className="fade-in">
            <h1 className="h-display">{t('Pick your level')}</h1>
            <p style={{ color: 'var(--txt-2)', marginTop: 8, fontSize: 14 }}>
              {t('You can change this any time, and the app will suggest a change when your sessions get consistently easy or hard.')}
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
                    <div style={{ fontWeight: 750, fontSize: 15 }}>{t(l.name)}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--txt-2)', marginTop: 3, lineHeight: 1.4 }}>
                      {t(l.blurb)}
                    </div>
                  </div>
                  {level === l.id && <Icon name="check" size={19} />}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button className="btn btn-ghost" onClick={() => setStage(1)}>
                <Icon name="chevronLeft" size={17} />
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStage(3)}>
                {t('Continue')} <Icon name="chevronRight" size={17} />
              </button>
            </div>
          </div>
        )}

        {stage === 3 && (
          <div className="fade-in">
            <h1 className="h-display">{t('A couple of numbers')}</h1>
            <p style={{ color: 'var(--txt-2)', marginTop: 8, fontSize: 14 }}>
              {t('Your weight is what turns exercise time into a calorie estimate, so it is worth getting roughly right.')}
            </p>

            <div style={{ marginTop: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 9 }}>{t('Body weight (kg)')}</div>
              <input
                className="field num" value={weight} inputMode="decimal" type="number"
                onChange={(e) => setWeight(e.target.value)} placeholder="70"
              />
            </div>

            <div style={{ marginTop: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 9 }}>{t('Target sessions per week')}</div>
              <div className="seg">
                {[3, 4, 5, 6].map((n) => (
                  <button key={n} className={goal === n ? 'on' : ''} onClick={() => setGoal(n)}>{n}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button className="btn btn-ghost" onClick={() => setStage(2)}>
                <Icon name="chevronLeft" size={17} />
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={finish}>
                {t('Start training')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
