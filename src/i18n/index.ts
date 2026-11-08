import { TE } from './te';

/**
 * Two languages: English (the source text) and Telugu.
 *
 * Strings are keyed by their English text, so `t('Start workout')` returns the
 * Telugu translation when Telugu is on and the English otherwise — a missing
 * translation can never blank out the UI. `{name}` placeholders are filled from
 * `vars`. Exercise names, cues, plan titles etc. go through the same `t()`.
 */
export type Lang = 'en' | 'te';

let current: Lang = 'en';
const missing = new Set<string>();

export function setLang(l: Lang) {
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l === 'te' ? 'te' : 'en';
}
export const getLang = (): Lang => current;

export function t(s: string, vars?: Record<string, string | number | undefined>): string {
  if (!s) return s;
  let out = s;
  if (current === 'te') {
    const hit = TE[s];
    if (hit !== undefined) out = hit;
    else missing.add(s);
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
  return out;
}

/** Plural-aware helper: picks the "one" or "other" English key, then translates. */
export const tn = (n: number, one: string, other: string, vars?: Record<string, string | number | undefined>) =>
  t(n === 1 ? one : other, { n, ...vars });

/** Numbers spoken by the voice coach (Telugu number words for the countdown). */
const TE_NUM = ['సున్నా', 'ఒకటి', 'రెండు', 'మూడు', 'నాలుగు', 'ఐదు', 'ఆరు', 'ఏడు', 'ఎనిమిది', 'తొమ్మిది', 'పది'];
export const spokenNumber = (n: number) => (current === 'te' && n >= 0 && n <= 10 ? TE_NUM[n] : String(n));

/** For QA: every English string that was shown in Telugu mode without a translation. */
if (typeof window !== 'undefined') (window as any).__i18nMissing = missing;
