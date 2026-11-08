import type { Level } from '../data/exercises';
import type { PlanStyle } from '../data/plans';

export type LoggedExercise = {
  id: string;
  seconds: number;        // actual working seconds performed
  setsDone?: number;
  repsTarget?: number;
  calories: number;
  skipped?: boolean;
};

export type SessionLog = {
  id: string;
  date: string;           // YYYY-MM-DD
  startedAt: number;
  endedAt: number;
  level: Level;
  title: string;
  source: 'plan' | 'quick' | 'custom';
  activeSeconds: number;  // work + rest, excluding paused time
  workSeconds: number;
  calories: number;
  completed: number;
  total: number;
  effort?: 1 | 2 | 3;     // 1 too easy · 2 just right · 3 too hard
  exercises: LoggedExercise[];
};

export type Profile = {
  name: string;
  level: Level;
  weightKg: number;
  heightCm: number | null;
  age: number | null;
  goalPerWeek: number;
  planStyle: PlanStyle;
  onboarded: boolean;
  createdAt: number;
};

export type Settings = {
  /** app + voice language; null until chosen on the first screen */
  lang: 'en' | 'te' | null;
  voice: boolean;
  voiceRate: number;
  voiceURI: string | null;
  spokenCountdown: boolean;
  spokenCues: boolean;
  beeps: boolean;
  haptics: boolean;
  faceDetail: boolean;
  model3d: boolean;
  theme: 'dark' | 'light';
  keepAwake: boolean;
  autoAdvance: boolean;
};

export type WeightEntry = { date: string; kg: number };

export type CustomWorkout = {
  id: string;
  name: string;
  createdAt: number;
  items: import('../data/plans').PlanItem[];
};

export type AppState = {
  version: number;
  profile: Profile;
  settings: Settings;
  logs: SessionLog[];
  weights: WeightEntry[];
  customs: CustomWorkout[];
  unlocked: string[];     // achievement ids already celebrated
};
