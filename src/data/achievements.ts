import type { Stats } from '../lib/stats';

export type Achievement = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold';
  /** Current value and the target needed to unlock. */
  progress: (s: Stats) => { cur: number; target: number };
};

const p = (cur: number, target: number) => ({ cur, target });

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-step', name: 'First Step', desc: 'Finish your first workout', icon: 'spark', tier: 'bronze',
    progress: (s) => p(s.sessions, 1) },
  { id: 'five-down', name: 'Getting Going', desc: 'Complete 5 workouts', icon: 'flame', tier: 'bronze',
    progress: (s) => p(s.sessions, 5) },
  { id: 'twenty-five', name: 'Committed', desc: 'Complete 25 workouts', icon: 'medal', tier: 'silver',
    progress: (s) => p(s.sessions, 25) },
  { id: 'century', name: 'Centurion', desc: 'Complete 100 workouts', icon: 'trophy', tier: 'gold',
    progress: (s) => p(s.sessions, 100) },

  { id: 'streak-3', name: 'Three in a Row', desc: 'Train 3 days back to back', icon: 'flame', tier: 'bronze',
    progress: (s) => p(s.bestStreak, 3) },
  { id: 'streak-7', name: 'Full Week', desc: 'A 7-day streak', icon: 'flame', tier: 'silver',
    progress: (s) => p(s.bestStreak, 7) },
  { id: 'streak-30', name: 'Unbreakable', desc: 'A 30-day streak', icon: 'trophy', tier: 'gold',
    progress: (s) => p(s.bestStreak, 30) },

  { id: 'burn-1000', name: 'Kilo Burner', desc: 'Burn 1,000 calories in total', icon: 'bolt', tier: 'bronze',
    progress: (s) => p(s.totalCalories, 1000) },
  { id: 'burn-10000', name: 'Furnace', desc: 'Burn 10,000 calories in total', icon: 'bolt', tier: 'gold',
    progress: (s) => p(s.totalCalories, 10000) },

  { id: 'time-300', name: '5 Hours In', desc: 'Train for 300 minutes in total', icon: 'clock', tier: 'silver',
    progress: (s) => p(s.totalMinutes, 300) },

  { id: 'plank-60', name: 'Steel Core', desc: 'Hold a single plank for 60 seconds', icon: 'shield', tier: 'silver',
    progress: (s) => p(s.longestHoldSec, 60) },
  { id: 'plank-120', name: 'Immovable', desc: 'Hold a single plank for 2 minutes', icon: 'shield', tier: 'gold',
    progress: (s) => p(s.longestHoldSec, 120) },

  { id: 'week-goal', name: 'On Target', desc: 'Hit 4 sessions in one week', icon: 'target', tier: 'bronze',
    progress: (s) => p(s.thisWeekSessions, 4) },

  { id: 'all-round', name: 'Well Rounded', desc: 'Train every muscle group at least once', icon: 'grid', tier: 'silver',
    progress: (s) => p(Object.values(s.byGroup).filter((v) => v > 0).length, 6) },

  { id: 'advanced-10', name: 'Top Tier', desc: 'Complete 10 advanced workouts', icon: 'medal', tier: 'gold',
    progress: (s) => p(s.byLevel.advanced, 10) },
];

export const evaluate = (stats: Stats) =>
  ACHIEVEMENTS.map((a) => {
    const { cur, target } = a.progress(stats);
    return { ...a, cur: Math.min(cur, target), target, unlocked: cur >= target, pct: Math.min(1, cur / target) };
  });

export type EvaluatedAchievement = ReturnType<typeof evaluate>[number];
