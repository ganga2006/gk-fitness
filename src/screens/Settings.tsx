import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { FaceAvatar } from '../components/FaceAvatar';
import { coach } from '../lib/voice';
import { dateKey } from '../lib/date';
import { useStore } from '../state/store';
import type { Level } from '../data/exercises';
import { FOCUS_BLURB } from '../data/plans';

export function Settings({ onBack, toast }: { onBack: () => void; toast: (m: string) => void }) {
  const { state, dispatch, exportData, importData } = useStore();
  const { profile, settings } = state;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [weight, setWeight] = useState(String(profile.weightKg));
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const load = () => setVoices(coach.loadVoices().filter((v) => /^en/i.test(v.lang)));
    load();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = load;
      return () => { window.speechSynthesis.onvoiceschanged = null; };
    }
  }, []);

  const set = (patch: Partial<typeof settings>) => dispatch({ type: 'settings', patch });

  const saveWeight = () => {
    const kg = Math.min(250, Math.max(25, Number(weight) || profile.weightKg));
    dispatch({ type: 'addWeight', entry: { date: dateKey(), kg } });
    setWeight(String(kg));
    toast(`Weight logged: ${kg} kg`);
  };

  const testVoice = () => {
    coach.unlock();
    coach.speak('Ten seconds left. Keep your chest tall and finish strong.', { interrupt: true });
  };

  return (
    <div className="scroll-area">
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <Icon name="chevronLeft" size={18} />
        </button>
        <div className="grow"><div className="eyebrow">Settings</div></div>
      </div>

      <div className="page-pad">
        {/* ── profile ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{ flexShrink: 0 }}>
            <FaceAvatar size={62} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              className="field" value={profile.name}
              onChange={(e) => dispatch({ type: 'profile', patch: { name: e.target.value } })}
              placeholder="Your name" style={{ padding: '10px 12px' }}
            />
          </div>
        </div>

        <Group title="Training">
          <div style={{ marginBottom: 10 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Difficulty level</div>
            <div className="seg">
              {(['beginner', 'intermediate', 'advanced'] as Level[]).map((l) => (
                <button key={l} className={profile.level === l ? 'on' : ''}
                        onClick={() => dispatch({ type: 'profile', patch: { level: l } })}>
                  {l[0].toUpperCase() + l.slice(1, 3)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Weekly programme</div>
            <div className="seg">
              <button className={profile.planStyle === 'focus' ? 'on' : ''}
                      onClick={() => dispatch({ type: 'profile', patch: { planStyle: 'focus' } })}>
                Focus
              </button>
              <button className={profile.planStyle === 'split' ? 'on' : ''}
                      onClick={() => dispatch({ type: 'profile', patch: { planStyle: 'split' } })}>
                Body split
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--txt-3)', marginTop: 7, lineHeight: 1.45 }}>
              {profile.planStyle === 'focus'
                ? FOCUS_BLURB[profile.level].detail
                : 'One body part per day, arranged so each muscle group is trained about twice a week.'}
            </p>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Sessions per week</div>
            <div className="seg">
              {[3, 4, 5, 6].map((n) => (
                <button key={n} className={profile.goalPerWeek === n ? 'on' : ''}
                        onClick={() => dispatch({ type: 'profile', patch: { goalPerWeek: n } })}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="row">
            <div style={{ color: 'var(--aqua)' }}><Icon name="scale" size={19} /></div>
            <div className="grow">
              <div className="row-t">Body weight</div>
              <div className="row-s">Drives the calorie estimate</div>
            </div>
            <input
              className="field num" value={weight} type="number" inputMode="decimal"
              onChange={(e) => setWeight(e.target.value)} onBlur={saveWeight}
              style={{ width: 78, padding: '8px 10px', textAlign: 'right' }}
            />
            <span style={{ fontSize: 13, color: 'var(--txt-3)' }}>kg</span>
          </div>
        </Group>

        {/* ── voice coach ── */}
        <Group title="Voice coach">
          <Toggle
            icon="volume" label="Voice coach"
            sub="Speaks the exercise name, the countdown and form cues"
            on={settings.voice} onChange={(v) => set({ voice: v })}
          />
          <Toggle
            icon="clock" label="Spoken countdown" sub="Counts the last three seconds out loud"
            on={settings.spokenCountdown} onChange={(v) => set({ spokenCountdown: v })}
          />
          <Toggle
            icon="spark" label="Form cues and tips"
            sub="Mid-set technique cues and improvement suggestions during rest"
            on={settings.spokenCues} onChange={(v) => set({ spokenCues: v })}
          />
          <Toggle
            icon="bolt" label="Beeps" sub="Short tone on each countdown tick"
            on={settings.beeps} onChange={(v) => set({ beeps: v })}
          />
          <Toggle
            icon="heart" label="Vibration" sub="Haptic pulse on transitions"
            on={settings.haptics} onChange={(v) => set({ haptics: v })}
          />

          <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="grow">
                <div className="row-t">Speech speed</div>
                <div className="row-s">{settings.voiceRate.toFixed(2)}×</div>
              </div>
              <button className="chip" onClick={testVoice}>Test</button>
            </div>
            <input
              type="range" min={0.6} max={1.6} step={0.05} value={settings.voiceRate}
              onChange={(e) => set({ voiceRate: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--volt)' }}
            />
          </div>

          {voices.length > 0 && (
            <div className="row">
              <div className="grow">
                <div className="row-t">Voice</div>
                <div className="row-s">{voices.length} English voices available</div>
              </div>
              <select
                className="field"
                style={{ width: 150, padding: '8px 10px', fontSize: 13 }}
                value={settings.voiceURI ?? ''}
                onChange={(e) => set({ voiceURI: e.target.value || null })}
              >
                <option value="">Automatic</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                ))}
              </select>
            </div>
          )}
        </Group>

        {/* ── appearance ── */}
        <Group title="Appearance">
          <div className="row">
            <div className="grow">
              <div className="row-t">Theme</div>
              <div className="row-s">Dark is easier on the eyes mid-workout</div>
            </div>
            <div className="seg" style={{ width: 140 }}>
              <button className={settings.theme === 'dark' ? 'on' : ''} onClick={() => set({ theme: 'dark' })}>
                Dark
              </button>
              <button className={settings.theme === 'light' ? 'on' : ''} onClick={() => set({ theme: 'light' })}>
                Light
              </button>
            </div>
          </div>
          <Toggle
            icon="bolt" label="Keep screen awake" sub="Stops the phone sleeping during a workout"
            on={settings.keepAwake} onChange={(v) => set({ keepAwake: v })}
          />
        </Group>

        {/* ── data ── */}
        <Group title="Your data">
          <button className="row" onClick={exportData}>
            <div style={{ color: 'var(--aqua)' }}><Icon name="download" size={19} /></div>
            <div className="grow">
              <div className="row-t">Export backup</div>
              <div className="row-s">{state.logs.length} sessions as a JSON file</div>
            </div>
            <Icon name="chevronRight" size={17} />
          </button>

          <button className="row" onClick={() => fileRef.current?.click()}>
            <div style={{ color: 'var(--violet)' }}><Icon name="upload" size={19} /></div>
            <div className="grow">
              <div className="row-t">Restore backup</div>
              <div className="row-s">Replaces everything on this device</div>
            </div>
            <Icon name="chevronRight" size={17} />
          </button>
          <input
            ref={fileRef} type="file" accept="application/json" hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try { await importData(f); toast('Backup restored'); }
              catch (err) { toast(err instanceof Error ? err.message : 'Could not read that file'); }
              e.target.value = '';
            }}
          />

          <button className="row" onClick={() => setConfirmReset(true)}>
            <div style={{ color: 'var(--danger)' }}><Icon name="trash" size={19} /></div>
            <div className="grow">
              <div className="row-t" style={{ color: 'var(--danger)' }}>Reset everything</div>
              <div className="row-s">Clears history, settings and custom workouts</div>
            </div>
          </button>
        </Group>

        <p style={{ textAlign: 'center', color: 'var(--txt-3)', fontSize: 11.5, marginTop: 10, lineHeight: 1.6 }}>
          GK Fitness · v1.0<br />
          Everything is stored on this device. Calorie figures are MET-based estimates,
          not medical measurements.
        </p>
        <div style={{ height: 24 }} />
      </div>

      {confirmReset && (
        <div className="sheet-scrim" onClick={() => setConfirmReset(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab" />
            <div className="sheet-body" style={{ paddingTop: 10 }}>
              <h3 className="h-section">Reset everything?</h3>
              <p style={{ color: 'var(--txt-2)', fontSize: 13.5, marginTop: 8, lineHeight: 1.5 }}>
                This deletes your {state.logs.length} saved sessions, custom workouts and settings.
                It cannot be undone — export a backup first if you want to keep them.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
                <button
                  className="btn" style={{ flex: 1, background: 'var(--danger)', color: '#fff' }}
                  onClick={() => { dispatch({ type: 'reset' }); setConfirmReset(false); }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="block-head" style={{ marginTop: 0 }}>
        <h3 className="h-section">{title}</h3>
        <div className="line" />
      </div>
      {children}
    </div>
  );
}

function Toggle({ icon, label, sub, on, onChange }: {
  icon: string; label: string; sub: string; on: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button className="row" onClick={() => onChange(!on)}>
      <div style={{ color: on ? 'var(--volt)' : 'var(--txt-3)' }}><Icon name={icon} size={19} /></div>
      <div className="grow">
        <div className="row-t">{label}</div>
        <div className="row-s">{sub}</div>
      </div>
      <span className={`switch${on ? ' on' : ''}`}><i /></span>
    </button>
  );
}
