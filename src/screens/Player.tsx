import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Body } from '../anim/Body';
import { Thumb } from '../anim/Thumb';
import { partsOf, PART_LABEL } from '../lib/parts';
import { Icon } from '../components/Icon';
import { Ring } from '../components/Ring';
import { ex } from '../data/exercises';
import { burn, restCalories } from '../lib/calories';
import { fmtClock } from '../lib/date';
import type { Step } from '../lib/session';
import { coach, wake } from '../lib/voice';
import { useStore } from '../state/store';
import type { LoggedExercise } from '../lib/types';
import { t } from '../i18n';

export type PlayerResult = {
  activeSeconds: number;
  workSeconds: number;
  calories: number;
  completed: number;
  total: number;
  exercises: LoggedExercise[];
};

export function Player({
  steps, title, onDone, onAbort,
}: {
  steps: Step[];
  title: string;
  onDone: (r: PlayerResult) => void;
  onAbort: () => void;
}) {
  const { state } = useStore();
  const { settings, profile } = state;

  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(true);
  const [value, setValue] = useState(0);        // seconds remaining (time/rest) or elapsed (reps)
  const [cue, setCue] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);

  const step = steps[idx];
  const isRest = step?.kind === 'rest';
  const exercise = step && step.kind === 'work' ? ex(step.exId) : null;
  const countsDown = !step || step.kind === 'rest' || step.mode === 'time';

  // ---- accumulators that must survive re-renders ----
  const workSec = useRef<Record<string, number>>({});
  const setsDone = useRef<Record<string, number>>({});
  const totalWork = useRef(0);
  const totalRest = useRef(0);
  const completedSteps = useRef(0);
  const spokenAt = useRef<Set<number>>(new Set());
  const extra = useRef(0);                      // seconds added via +15s
  const finishedRef = useRef(false);

  const workSteps = useMemo(() => steps.filter((s) => s.kind === 'work').length, [steps]);

  /* ── keep the screen on ── */
  useEffect(() => {
    if (settings.keepAwake) wake.on();
    const onVis = () => { if (document.visibilityState === 'visible') wake.reacquire(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { wake.off(); document.removeEventListener('visibilitychange', onVis); coach.stop(); };
  }, [settings.keepAwake]);

  /* ── announce each new step ── */
  useEffect(() => {
    if (!step) return;
    spokenAt.current = new Set();
    extra.current = 0;
    setCue('');

    if (step.kind === 'rest') {
      setValue(step.seconds);
      const nextName = step.nextExId ? t(ex(step.nextExId).name) : undefined;
      coach.rest(step.seconds, nextName);
      setCue(nextName ? t('Next up: {name}', { name: nextName }) : t('Rest'));
    } else {
      const e = ex(step.exId);
      setValue(step.mode === 'time' ? step.seconds : 0);
      const detail =
        step.mode === 'time'
          ? t('{n} seconds', { n: step.seconds })
          : t('{n} reps', { n: step.reps }) + (step.sets > 1 ? ', ' + t('set {i} of {n}', { i: step.setIdx, n: step.sets }) : '');
      coach.announce(t(e.name), detail);
      setCue(t(e.cues[0] ?? ''));
    }
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── advance ── */
  const advance = useCallback((skipped = false) => {
    const s = steps[idx];
    if (s && s.kind === 'work' && !skipped) {
      completedSteps.current += 1;
      setsDone.current[s.exId] = (setsDone.current[s.exId] ?? 0) + 1;
    }
    if (idx + 1 >= steps.length) {
      finish();
    } else {
      setIdx(idx + 1);
    }
  }, [idx, steps]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    coach.stop();

    const exercises: LoggedExercise[] = Object.entries(workSec.current).map(([id, sec]) => ({
      id,
      seconds: Math.round(sec),
      setsDone: setsDone.current[id] ?? 0,
      calories: burn(ex(id).met, profile.weightKg, sec),
    }));
    const calories =
      exercises.reduce((a, b) => a + b.calories, 0) +
      restCalories(profile.weightKg, totalRest.current);

    const result: PlayerResult = {
      activeSeconds: Math.round(totalWork.current + totalRest.current),
      workSeconds: Math.round(totalWork.current),
      calories,
      completed: completedSteps.current,
      total: workSteps,
      exercises: exercises.map((e) => ({ ...e, calories: Math.round(e.calories * 10) / 10 })),
    };
    coach.finished(Math.round(calories), Math.max(1, Math.round(result.activeSeconds / 60)));
    onDone(result);
  }, [onDone, profile.weightKg, workSteps]);

  /* ── the clock ── */
  useEffect(() => {
    if (!running || !step) return;
    const TICK = 250;
    const h = window.setInterval(() => {
      const dt = TICK / 1000;

      if (step.kind === 'rest') totalRest.current += dt;
      else {
        totalWork.current += dt;
        workSec.current[step.exId] = (workSec.current[step.exId] ?? 0) + dt;
      }

      setValue((v) => {
        const next = countsDown ? v - dt : v + dt;

        if (countsDown) {
          const whole = Math.ceil(next);
          const target = step.kind === 'rest' ? step.seconds : (step as any).seconds;
          const limit = target + extra.current;

          // spoken countdown over the last three seconds
          if (whole <= 3 && whole >= 1 && !spokenAt.current.has(whole)) {
            spokenAt.current.add(whole);
            coach.countdown(whole);
          }
          // halfway marker and a form cue on longer efforts
          if (step.kind === 'work' && limit >= 25) {
            const half = limit / 2;
            if (next <= half && !spokenAt.current.has(-1)) {
              spokenAt.current.add(-1);
              const e = ex(step.exId);
              const c = t(e.cues[1] ?? e.cues[0]);
              setCue(c);
              coach.cue(c);
            }
          }
          if (next <= 0) {
            coach.countdown(0);
            // defer so we are not advancing during a state update
            setTimeout(() => advance(), 0);
            return 0;
          }
        } else {
          // rep sets: nudge if the athlete is running well past the estimate
          const est = (step as any).seconds as number;
          if (next > est * 1.5 && !spokenAt.current.has(-2)) {
            spokenAt.current.add(-2);
            coach.cue(t('Take your time, keep the form clean.'));
          }
          if (next > est * 0.5 && !spokenAt.current.has(-1)) {
            spokenAt.current.add(-1);
            const e = ex((step as any).exId);
            const c = t(e.cues[1] ?? e.cues[0]);
            setCue(c);
            coach.cue(c);
          }
        }
        return next;
      });
    }, TICK);
    return () => window.clearInterval(h);
  }, [running, step, countsDown, advance]);

  /* ── speak an improvement tip during rest ── */
  useEffect(() => {
    if (!step || step.kind !== 'rest' || !settings.spokenCues) return;
    const prev = steps[idx - 1];
    if (!prev || prev.kind !== 'work') return;
    const e = ex(prev.exId);
    const tip = t(e.tips[Math.floor(Math.random() * e.tips.length)]);
    const h = window.setTimeout(() => coach.cue(t('Tip. {tip}', { tip })), 2600);
    return () => window.clearTimeout(h);
  }, [idx, step, steps, settings.spokenCues]);

  if (!step) return null;

  const target = step.kind === 'rest' ? step.seconds : step.seconds;
  const limit = target + extra.current;
  const progress = countsDown
    ? 1 - Math.max(0, value) / Math.max(1, limit)
    : Math.min(1, value / Math.max(1, limit));
  const overall = idx / steps.length;
  const urgent = countsDown && value <= 3.4 && value > 0;

  const accent = isRest ? 'var(--aqua)' : 'var(--volt)';

  const togglePause = () => {
    setRunning((r) => {
      if (r) { coach.stop(); coach.speak(t('Paused'), { interrupt: true }); }
      else coach.speak(t('Resuming'), { interrupt: true });
      return !r;
    });
  };

  return (
    <div className={`player${isRest ? ' resting' : ''}`}>
      <div className="player-top">
        <button className="icon-btn" onClick={() => { setRunning(false); setConfirmExit(true); }} aria-label={t('End workout')}>
          <Icon name="close" size={18} />
        </button>
        <div className="prog-track">
          <div className="prog-fill" style={{ width: `${overall * 100}%` }} />
        </div>
        <div className="num" style={{ fontSize: 12, color: 'var(--txt-3)', fontWeight: 700, minWidth: 40, textAlign: 'right' }}>
          {idx + 1}/{steps.length}
        </div>
      </div>

      <div style={{ textAlign: 'center', paddingTop: 10 }}>
        <div className="eyebrow">{isRest ? t('Recover') : t(step.blockName)}</div>
      </div>

      <div className={`player-stage${isRest ? ' rest' : ''}`}>
        {isRest ? (
          <>
            <Ring progress={progress} size={200} stroke={9} color="var(--aqua)">
              <div className="eyebrow" style={{ color: 'var(--aqua)' }}>{t('Rest')}</div>
              <div className={`big-timer${urgent ? ' urgent' : ''}`} style={{ fontSize: 50 }}>
                {fmtClock(value)}
              </div>
            </Ring>
            {step.nextExId && (
              <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 56, height: 56 }}>
                  <Thumb exId={step.nextExId} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div className="eyebrow">{t('Next up')}</div>
                  <div style={{ fontWeight: 750, fontSize: 16 }}>{t(ex(step.nextExId).name)}</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="stage-fig">
              <Body
                anim={exercise!.anim}
                playing={running}
                highlight={partsOf(exercise!)}
              />
            </div>
            <div className="stage-name">{t(exercise!.name)}</div>
            <div className="stage-dose">
              {step.mode === 'reps'
                ? t('{n} reps', { n: step.reps }) + (step.sets > 1 ? ` · ${t('set {i} of {n}', { i: step.setIdx, n: step.sets })}` : ` · ${t('stop 1–2 reps before failure')}`)
                : exercise!.muscles.slice(0, 3).map((m) => t(m)).join(' · ')}
            </div>
            <div className="target-row">
              {partsOf(exercise!).slice(0, 4).map((p) => (
                <span key={p} className="target-chip">{t(PART_LABEL[p])}</span>
              ))}
            </div>

            {step.sets > 1 && (
              <div className="set-pips" style={{ marginTop: 10 }}>
                {Array.from({ length: step.sets }, (_, i) => (
                  <span key={i} className={`pip${i < step.setIdx ? ' on' : ''}`} />
                ))}
              </div>
            )}

            <div className={`big-timer${urgent ? ' urgent' : ''}`} style={{ marginTop: 12 }}>
              {countsDown ? fmtClock(value) : fmtClock(value)}
            </div>
            {!countsDown && (
              <div style={{ fontSize: 12, color: 'var(--txt-3)', fontWeight: 600 }}>
                {t('counting up — tap done when the set is finished')}
              </div>
            )}
            <div className="cue-line">{cue}</div>
          </>
        )}
      </div>

      <div className="player-controls">
        <button className="ctrl" onClick={() => { coach.stop(); setIdx(Math.max(0, idx - 1)); }} aria-label={t('Previous')}>
          <Icon name="prev" size={20} />
        </button>

        {countsDown ? (
          <button className="ctrl main" onClick={togglePause} aria-label={running ? t('Pause') : t('Resume')}>
            <Icon name={running ? 'pause' : 'play'} size={28} />
          </button>
        ) : (
          <button className="ctrl main" onClick={() => { coach.stop(); advance(); }} aria-label={t('Set done')}>
            <Icon name="check" size={30} />
          </button>
        )}

        <button className="ctrl" onClick={() => { coach.stop(); advance(true); }} aria-label={t('Skip')}>
          <Icon name="next" size={20} />
        </button>
      </div>

      <div className="up-next" style={{ paddingBottom: 'calc(var(--safe-b) + 14px)' }}>
        {countsDown && (
          <button
            className="chip"
            onClick={() => { extra.current += 15; setValue((v) => v + 15); }}
          >
            <Icon name="plus" size={13} /> {t('{s}s', { s: 15 })}
          </button>
        )}
        {!countsDown && (
          <button className="chip" onClick={togglePause}>
            <Icon name={running ? 'pause' : 'play'} size={13} /> {running ? t('Pause') : t('Resume')}
          </button>
        )}
        <span>{t(title)}</span>
      </div>

      {confirmExit && (
        <div className="sheet-scrim" onClick={() => { setConfirmExit(false); setRunning(true); }}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab" />
            <div className="sheet-body" style={{ paddingTop: 10 }}>
              <h3 className="h-section">{t('End this workout?')}</h3>
              <p style={{ color: 'var(--txt-2)', fontSize: 13.5, marginTop: 8, lineHeight: 1.5 }}>
                {t('You are {p}% through. Finishing now still saves what you have done so far.', { p: Math.round(overall * 100) })}
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }}
                        onClick={() => { setConfirmExit(false); setRunning(true); }}>
                  {t('Keep going')}
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }}
                        onClick={() => (completedSteps.current > 0 ? finish() : onAbort())}>
                  {completedSteps.current > 0 ? t('Save & end') : t('Discard')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
