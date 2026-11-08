import { ex, type Exercise } from '../data/exercises';
import type { PlanItem } from '../data/plans';

/** Resting-ish metabolic cost used for the rest intervals between efforts. */
const REST_MET = 1.5;

/** kcal burned per minute at a given MET for a given body mass. */
export const kcalPerMin = (met: number, weightKg: number) => (met * 3.5 * weightKg) / 200;

export const burn = (met: number, weightKg: number, seconds: number) =>
  kcalPerMin(met, weightKg) * (seconds / 60);

/** Working seconds an item is expected to take, excluding its rest. */
export const itemWorkSeconds = (item: PlanItem): number => {
  if (item.mode === 'time') return item.seconds;
  const e: Exercise = ex(item.id);
  return item.sets * item.reps * e.tempo;
};

export const itemRestSeconds = (item: PlanItem): number =>
  item.mode === 'time' ? item.rest : item.sets * item.rest;

export const itemTotalSeconds = (item: PlanItem) => itemWorkSeconds(item) + itemRestSeconds(item);

export const itemCalories = (item: PlanItem, weightKg: number): number => {
  const e = ex(item.id);
  return (
    burn(e.met, weightKg, itemWorkSeconds(item)) +
    burn(REST_MET, weightKg, itemRestSeconds(item))
  );
};

export const estimateSession = (items: PlanItem[], weightKg: number) => {
  const seconds = items.reduce((s, i) => s + itemTotalSeconds(i), 0);
  const calories = items.reduce((s, i) => s + itemCalories(i, weightKg), 0);
  return { seconds, calories: Math.round(calories) };
};

export const restCalories = (weightKg: number, seconds: number) =>
  burn(REST_MET, weightKg, seconds);
