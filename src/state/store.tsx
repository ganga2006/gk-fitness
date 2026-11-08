import {
  createContext, useContext, useEffect, useMemo, useReducer, type ReactNode,
} from 'react';
import type { AppState, CustomWorkout, Profile, SessionLog, Settings, WeightEntry } from '../lib/types';
import { buildStats } from '../lib/stats';
import { coach } from '../lib/voice';
import { dateKey } from '../lib/date';

const KEY = 'gkfitness.v1';
const VERSION = 1;

export const DEFAULT_STATE: AppState = {
  version: VERSION,
  profile: {
    name: '',
    level: 'beginner',
    weightKg: 70,
    heightCm: null,
    age: null,
    goalPerWeek: 4,
    planStyle: 'focus',
    onboarded: false,
    createdAt: Date.now(),
  },
  settings: {
    voice: true,
    voiceRate: 1,
    voiceURI: null,
    spokenCountdown: true,
    spokenCues: true,
    beeps: true,
    haptics: true,
    faceDetail: true,
    model3d: true,
    theme: 'dark',
    keepAwake: true,
    autoAdvance: true,
  },
  logs: [],
  weights: [],
  customs: [],
  unlocked: [],
};

type Action =
  | { type: 'profile'; patch: Partial<Profile> }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'addLog'; log: SessionLog }
  | { type: 'rateLog'; id: string; effort: 1 | 2 | 3 }
  | { type: 'deleteLog'; id: string }
  | { type: 'addWeight'; entry: WeightEntry }
  | { type: 'addCustom'; workout: CustomWorkout }
  | { type: 'deleteCustom'; id: string }
  | { type: 'unlock'; ids: string[] }
  | { type: 'replace'; state: AppState }
  | { type: 'reset' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'profile':
      return { ...state, profile: { ...state.profile, ...action.patch } };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'addLog':
      return { ...state, logs: [...state.logs, action.log] };
    case 'rateLog':
      return {
        ...state,
        logs: state.logs.map((l) => (l.id === action.id ? { ...l, effort: action.effort } : l)),
      };
    case 'deleteLog':
      return { ...state, logs: state.logs.filter((l) => l.id !== action.id) };
    case 'addWeight': {
      const rest = state.weights.filter((w) => w.date !== action.entry.date);
      return {
        ...state,
        weights: [...rest, action.entry].sort((a, b) => a.date.localeCompare(b.date)),
        profile: { ...state.profile, weightKg: action.entry.kg },
      };
    }
    case 'addCustom':
      return { ...state, customs: [action.workout, ...state.customs] };
    case 'deleteCustom':
      return { ...state, customs: state.customs.filter((c) => c.id !== action.id) };
    case 'unlock':
      return { ...state, unlocked: [...new Set([...state.unlocked, ...action.ids])] };
    case 'replace':
      return action.state;
    case 'reset':
      return { ...DEFAULT_STATE, profile: { ...DEFAULT_STATE.profile, createdAt: Date.now() } };
    default:
      return state;
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      profile: { ...DEFAULT_STATE.profile, ...(parsed.profile ?? {}) },
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings ?? {}) },
      logs: parsed.logs ?? [],
      weights: parsed.weights ?? [],
      customs: parsed.customs ?? [],
      unlocked: parsed.unlocked ?? [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

type Ctx = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  stats: ReturnType<typeof buildStats>;
  exportData: () => void;
  importData: (file: File) => Promise<void>;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as AppState, load);

  // Persist on every change.
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
  }, [state]);

  // Mirror settings into the voice coach and the document theme.
  useEffect(() => {
    const s = state.settings;
    coach.enabled = s.voice;
    coach.rate = s.voiceRate;
    coach.voiceURI = s.voiceURI;
    coach.countdownEnabled = s.spokenCountdown;
    coach.cuesEnabled = s.spokenCues;
    coach.beepsEnabled = s.beeps;
    coach.hapticsEnabled = s.haptics;
    document.documentElement.dataset.theme = s.theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', s.theme === 'light' ? '#F4F6FA' : '#0A0C11');
  }, [state.settings]);

  const stats = useMemo(() => buildStats(state.logs), [state.logs]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gk-fitness-${dateKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importData = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as AppState;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.logs)) {
      throw new Error('That file does not look like a GK Fitness backup.');
    }
    dispatch({
      type: 'replace',
      state: {
        ...DEFAULT_STATE,
        ...parsed,
        profile: { ...DEFAULT_STATE.profile, ...parsed.profile },
        settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
      },
    });
  };

  const value = useMemo(
    () => ({ state, dispatch, stats, exportData, importData }),
    [state, stats],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
