import { BY_ID, type Group, type Level } from '../data/exercises';
import { addDays, dateKey, fromKey, startOfWeek } from './date';
import type { SessionLog } from './types';
import { getLang, t } from '../i18n';

export type Stats = {
  sessions: number;
  totalCalories: number;
  totalMinutes: number;
  currentStreak: number;
  bestStreak: number;
  thisWeekSessions: number;
  thisWeekCalories: number;
  thisWeekMinutes: number;
  bestSessionCalories: number;
  longestHoldSec: number;
  byGroup: Record<Group, number>;   // seconds per muscle group
  byLevel: Record<Level, number>;
  byDate: Record<string, { calories: number; seconds: number; count: number; titles: string[] }>;
  lastEfforts: (1 | 2 | 3)[];
};

const EMPTY_GROUPS: Record<Group, number> = {
  cardio: 0, upper: 0, lower: 0, core: 0, fullbody: 0, mobility: 0,
};

export function buildStats(logs: SessionLog[]): Stats {
  const byDate: Stats['byDate'] = {};
  const byGroup = { ...EMPTY_GROUPS };
  const byLevel: Record<Level, number> = { beginner: 0, intermediate: 0, advanced: 0 };

  let totalCalories = 0;
  let totalSeconds = 0;
  let bestSessionCalories = 0;
  let longestHoldSec = 0;

  for (const log of logs) {
    totalCalories += log.calories;
    totalSeconds += log.activeSeconds;
    bestSessionCalories = Math.max(bestSessionCalories, log.calories);
    byLevel[log.level] = (byLevel[log.level] ?? 0) + 1;

    const d = (byDate[log.date] ??= { calories: 0, seconds: 0, count: 0, titles: [] });
    d.calories += log.calories;
    d.seconds += log.activeSeconds;
    d.count += 1;
    d.titles.push(log.title);

    for (const le of log.exercises) {
      const e = BY_ID[le.id];
      if (e) byGroup[e.group] += le.seconds;
      // Longest single continuous hold, for the plank-style personal record.
      if (e && ['plank', 'forearm-plank', 'side-plank', 'wall-sit', 'hollow-hold'].includes(e.id)) {
        longestHoldSec = Math.max(longestHoldSec, le.seconds);
      }
    }
  }

  // Streaks over distinct active dates.
  const dates = Object.keys(byDate).sort();
  let bestStreak = 0, run = 0;
  let prev: string | null = null;
  for (const k of dates) {
    if (prev && dateKey(addDays(fromKey(prev), 1)) === k) run += 1;
    else run = 1;
    bestStreak = Math.max(bestStreak, run);
    prev = k;
  }

  let currentStreak = 0;
  const today = new Date();
  // A streak stays alive if you trained today or yesterday.
  let cursor = byDate[dateKey(today)] ? today : addDays(today, -1);
  while (byDate[dateKey(cursor)]) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const wkStart = startOfWeek(new Date());
  let thisWeekSessions = 0, thisWeekCalories = 0, thisWeekSeconds = 0;
  for (let i = 0; i < 7; i++) {
    const d = byDate[dateKey(addDays(wkStart, i))];
    if (d) {
      thisWeekSessions += d.count;
      thisWeekCalories += d.calories;
      thisWeekSeconds += d.seconds;
    }
  }

  const lastEfforts = logs
    .slice()
    .sort((a, b) => b.endedAt - a.endedAt)
    .map((l) => l.effort)
    .filter((e): e is 1 | 2 | 3 => !!e)
    .slice(0, 3);

  return {
    sessions: logs.length,
    totalCalories: Math.round(totalCalories),
    totalMinutes: Math.round(totalSeconds / 60),
    currentStreak,
    bestStreak,
    thisWeekSessions,
    thisWeekCalories: Math.round(thisWeekCalories),
    thisWeekMinutes: Math.round(thisWeekSeconds / 60),
    bestSessionCalories: Math.round(bestSessionCalories),
    longestHoldSec: Math.round(longestHoldSec),
    byGroup,
    byLevel,
    byDate,
    lastEfforts,
  };
}

/** Calories for each of the last `n` days, oldest first. */
export function dailySeries(stats: Stats, n = 7): { key: string; label: string; value: number }[] {
  const out: { key: string; label: string; value: number }[] = [];
  const labels = getLang() === 'te'
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => t(d))
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const k = dateKey(d);
    out.push({ key: k, label: labels[d.getDay()], value: Math.round(stats.byDate[k]?.calories ?? 0) });
  }
  return out;
}

/**
 * Adaptive difficulty. Looks at the last three effort ratings and suggests a
 * level change only when the signal is consistent.
 */
export function suggestLevel(current: Level, stats: Stats): { level: Level; reason: string } | null {
  const e = stats.lastEfforts;
  if (e.length < 3) return null;
  const order: Level[] = ['beginner', 'intermediate', 'advanced'];
  const idx = order.indexOf(current);

  if (e.every((x) => x === 1) && idx < 2) {
    return {
      level: order[idx + 1],
      reason: t('Your last three sessions all felt too easy. Ready to step up?'),
    };
  }
  if (e.every((x) => x === 3) && idx > 0) {
    return {
      level: order[idx - 1],
      reason: t('Your last three sessions all felt too hard. Easing back will build a stronger base.'),
    };
  }
  return null;
}
