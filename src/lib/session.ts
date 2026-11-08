import { ex } from '../data/exercises';
import type { Block, PlanItem } from '../data/plans';

export type Step =
  | {
      kind: 'work';
      exId: string;
      mode: 'time' | 'reps';
      seconds: number;        // countdown for time, estimate for reps
      reps?: number;
      setIdx: number;         // 1-based
      sets: number;
      blockName: string;
    }
  | { kind: 'rest'; seconds: number; nextExId?: string; blockName: string };

export function buildSteps(items: PlanItem[], blockName = 'Main'): Step[] {
  const steps: Step[] = [];
  items.forEach((item, i) => {
    const e = ex(item.id);
    const nextId = items[i + 1]?.id;

    if (item.mode === 'time') {
      steps.push({
        kind: 'work', exId: item.id, mode: 'time',
        seconds: item.seconds, setIdx: 1, sets: 1, blockName,
      });
      if (item.rest > 0 && nextId) {
        steps.push({ kind: 'rest', seconds: item.rest, nextExId: nextId, blockName });
      }
    } else {
      for (let s = 1; s <= item.sets; s++) {
        steps.push({
          kind: 'work', exId: item.id, mode: 'reps',
          seconds: Math.round(item.reps * e.tempo),
          reps: item.reps, setIdx: s, sets: item.sets, blockName,
        });
        const isLastSet = s === item.sets;
        if (item.rest > 0 && (!isLastSet || nextId)) {
          steps.push({
            kind: 'rest', seconds: item.rest,
            nextExId: isLastSet ? nextId : item.id, blockName,
          });
        }
      }
    }
  });
  return steps;
}

export const buildFromBlocks = (blocks: Block[]): Step[] =>
  blocks.flatMap((b) => buildSteps(b.items, b.name));

export const flattenItems = (blocks: Block[]): PlanItem[] => blocks.flatMap((b) => b.items);

/* ── quick-start session generator ───────────────────────────────── */

import { EXERCISES, type Level } from '../data/exercises';

/**
 * Builds a timed circuit of roughly `minutes` length for the given level,
 * mixing cardio / strength / core and bookended with mobility.
 */
export function quickSession(level: Level, minutes: number): Block[] {
  const pool = EXERCISES.filter((e) => e.levels.includes(level));
  const pick = (group: string, n: number, exclude: Set<string>) => {
    const candidates = pool.filter((e) => e.group === group && !exclude.has(e.id));
    const out: typeof candidates = [];
    while (out.length < n && candidates.length) {
      const i = Math.floor(Math.random() * candidates.length);
      out.push(candidates[i]);
      exclude.add(candidates[i].id);
      candidates.splice(i, 1);
    }
    return out;
  };

  const used = new Set<string>();
  const work = level === 'beginner' ? 30 : level === 'intermediate' ? 40 : 45;
  const rest = level === 'beginner' ? 25 : level === 'intermediate' ? 20 : 15;

  const warm: Block = {
    name: 'Warm-up',
    items: [
      { id: 'march-in-place', mode: 'time', seconds: 30, rest: 8 },
      { id: 'arm-circles', mode: 'time', seconds: 25, rest: 8 },
      { id: 'hip-circles', mode: 'time', seconds: 25, rest: 10 },
    ],
  };
  const cool: Block = {
    name: 'Cool-down',
    items: [
      { id: 'hamstring-stretch', mode: 'time', seconds: 35, rest: 5 },
      { id: 'child-pose', mode: 'time', seconds: 35, rest: 0 },
    ],
  };

  const overhead = 2 + 1.5; // warm-up + cool-down minutes
  const budget = Math.max(2, minutes - overhead) * 60;
  const slot = work + rest;
  const count = Math.max(4, Math.round(budget / slot));

  const mix: string[] = [];
  for (let i = 0; i < count; i++) {
    mix.push(['cardio', 'lower', 'core', 'upper', 'fullbody'][i % 5]);
  }
  const chosen = mix
    .map((g) => pick(g, 1, used)[0] ?? pool[Math.floor(Math.random() * pool.length)])
    .filter(Boolean);

  const main: Block = {
    name: 'Circuit',
    items: chosen.map((e, i) => ({
      id: e.id, mode: 'time' as const,
      seconds: work,
      rest: i === chosen.length - 1 ? 0 : rest,
    })),
  };

  return [warm, main, cool];
}

/* ── body-part focused session ───────────────────────────────────── */

import { focusScore, type Focus } from './parts';

/**
 * Builds a session aimed at one body part: the highest-scoring moves for that
 * area, warmed up and cooled down, sized to roughly `minutes`.
 */
export function focusSession(level: Level, focus: Focus, minutes = 18): Block[] {
  const ranked = EXERCISES
    .filter((e) => e.levels.includes(level) && e.group !== 'mobility')
    .map((e) => ({ e, s: focusScore(e, focus) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s);

  const work = level === 'beginner' ? 30 : level === 'intermediate' ? 40 : 45;
  const rest = level === 'beginner' ? 25 : level === 'intermediate' ? 20 : 15;
  const budget = Math.max(2, minutes - 3.5) * 60;
  const count = Math.max(4, Math.min(ranked.length, Math.round(budget / (work + rest))));

  // Take the best, but avoid three of the same exercise family in a row.
  const chosen = ranked.slice(0, count).map((r) => r.e);

  const warm: Block = {
    name: 'Warm-up',
    items: [
      { id: 'march-in-place', mode: 'time', seconds: 30, rest: 8 },
      { id: focus === 'chest' || focus === 'shoulders' || focus === 'arms' ? 'wall-angel' : 'hip-circles',
        mode: 'time', seconds: 30, rest: 10 },
    ],
  };
  const main: Block = {
    name: FOCUS_LABEL_LOCAL[focus],
    items: chosen.map((e, i) => ({
      id: e.id, mode: 'time' as const, seconds: work,
      rest: i === chosen.length - 1 ? 0 : rest,
    })),
  };
  const cool: Block = {
    name: 'Cool-down',
    items: [
      { id: focus === 'legs' || focus === 'glutes' ? 'hamstring-stretch' : 'cobra', mode: 'time', seconds: 35, rest: 5 },
      { id: 'child-pose', mode: 'time', seconds: 35, rest: 0 },
    ],
  };
  return [warm, main, cool];
}

const FOCUS_LABEL_LOCAL: Record<Focus, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', arms: 'Arms',
  abs: 'Abs & Core', legs: 'Legs', glutes: 'Glutes',
  fullbody: 'Full Body', cardio: 'Cardio',
};
