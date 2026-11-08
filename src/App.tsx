import { useCallback, useEffect, useState } from 'react';
import { Icon } from './components/Icon';
import type { Block } from './data/plans';
import { buildFromBlocks, type Step } from './lib/session';
import { dateKey } from './lib/date';
import { coach } from './lib/voice';
import { useStore } from './state/store';
import { Onboarding } from './screens/Onboarding';
import { Home, type StartPayload } from './screens/Home';
import { Preview } from './screens/Preview';
import { Player, type PlayerResult } from './screens/Player';
import { Summary } from './screens/Summary';
import { CalendarScreen } from './screens/CalendarScreen';
import { StatsScreen } from './screens/StatsScreen';
import { Library, ExerciseSheet } from './screens/Library';
import { Builder } from './screens/Builder';
import { Settings } from './screens/Settings';
import type { Level } from './data/exercises';
import { t } from './i18n';

type Tab = 'today' | 'calendar' | 'library' | 'stats';

type Route =
  | { name: 'tabs' }
  | { name: 'preview'; payload: StartPayload }
  | { name: 'player'; steps: Step[]; payload: StartPayload }
  | { name: 'summary'; logId: string }
  | { name: 'builder' }
  | { name: 'settings' };

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: 'bolt' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'library', label: 'Library', icon: 'dumbbell' },
  { id: 'stats', label: 'Stats', icon: 'chart' },
];

export default function App() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [route, setRoute] = useState<Route>({ name: 'tabs' });
  const [toast, setToast] = useState('');
  const [exSheet, setExSheet] = useState<string | null>(null);

  const say = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? '' : t)), 2600);
  }, []);

  // Android / browser back button pops the stack instead of leaving the app.
  useEffect(() => {
    const onPop = () => {
      setRoute((r) => (r.name === 'tabs' ? r : { name: 'tabs' }));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (route.name !== 'tabs') window.history.pushState({ r: route.name }, '');
  }, [route.name]);

  if (!state.profile.onboarded) {
    return <div className="app-shell"><Onboarding /></div>;
  }

  const startWorkout = (payload: StartPayload) => {
    coach.unlock();
    const steps = buildFromBlocks(payload.blocks);
    if (!steps.length) { say(t('That workout has no exercises yet.')); return; }
    setRoute({ name: 'player', steps, payload });
  };

  const finishWorkout = (payload: StartPayload, r: PlayerResult) => {
    const id = `s${Date.now()}`;
    dispatch({
      type: 'addLog',
      log: {
        id,
        date: dateKey(),
        startedAt: Date.now() - r.activeSeconds * 1000,
        endedAt: Date.now(),
        level: payload.level as Level,
        title: payload.title,
        source: payload.source,
        activeSeconds: r.activeSeconds,
        workSeconds: r.workSeconds,
        calories: Math.round(r.calories * 10) / 10,
        completed: r.completed,
        total: r.total,
        exercises: r.exercises,
      },
    });
    setRoute({ name: 'summary', logId: id });
  };

  return (
    <div className="app-shell" key={state.settings.lang ?? 'en'}>
      {route.name === 'tabs' && (
        <>
          {tab === 'today' && (
            <Home
              onPreview={(p) => setRoute({ name: 'preview', payload: p })}
              onOpenSettings={() => setRoute({ name: 'settings' })}
              onBuild={() => setRoute({ name: 'builder' })}
            />
          )}
          {tab === 'calendar' && <CalendarScreen />}
          {tab === 'library' && <Library openId={exSheet} setOpenId={setExSheet} />}
          {tab === 'stats' && <StatsScreen />}

          <nav className="tabbar">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                className={`tab${tab === tb.id ? ' active' : ''}`}
                onClick={() => setTab(tb.id)}
              >
                <Icon name={tb.icon} size={21} />
                <span>{t(tb.label)}</span>
              </button>
            ))}
            <button className="tab" onClick={() => setRoute({ name: 'settings' })}>
              <Icon name="settings" size={21} />
              <span>{t('Profile')}</span>
            </button>
          </nav>
        </>
      )}

      {route.name === 'preview' && (
        <Preview
          blocks={route.payload.blocks}
          title={route.payload.title}
          onBack={() => setRoute({ name: 'tabs' })}
          onStart={() => startWorkout(route.payload)}
          onOpenExercise={setExSheet}
        />
      )}

      {route.name === 'player' && (
        <Player
          steps={route.steps}
          title={route.payload.title}
          onDone={(r) => finishWorkout(route.payload, r)}
          onAbort={() => setRoute({ name: 'tabs' })}
        />
      )}

      {route.name === 'summary' && (
        <Summary logId={route.logId} onClose={() => { setRoute({ name: 'tabs' }); setTab('today'); }} />
      )}

      {route.name === 'builder' && (
        <Builder
          onBack={() => setRoute({ name: 'tabs' })}
          onSaved={(n) => { setRoute({ name: 'tabs' }); say(t('Saved "{name}"', { name: n })); }}
        />
      )}

      {route.name === 'settings' && (
        <Settings onBack={() => setRoute({ name: 'tabs' })} toast={say} />
      )}

      {/* exercise detail is reachable from several screens */}
      {route.name !== 'tabs' && (
        <ExerciseSheet id={exSheet} onClose={() => setExSheet(null)} onSwap={setExSheet} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
