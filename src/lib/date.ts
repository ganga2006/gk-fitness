import { t } from '../i18n';

export const dateKey = (d: Date = new Date()): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const fromKey = (k: string): Date => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number): Date => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Monday-first week containing d. */
export const startOfWeek = (d: Date): Date => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return addDays(c, -((c.getDay() + 6) % 7));
};

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

/** Month name in the current language. */
export const monthName = (i: number) => t(MONTHS[i]);
export const monthShort = (i: number) => t(MONTHS[i].slice(0, 3));

export const fmtDuration = (sec: number): string => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  if (m >= 60) return t('{h}h {m}m', { h: Math.floor(m / 60), m: m % 60 });
  if (m >= 1) return t('{m}m {s}s', { m, s: String(s % 60).padStart(2, '0') });
  return t('{s}s', { s });
};

export const fmtClock = (sec: number): string => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const relativeDay = (k: string): string => {
  const today = dateKey();
  const yest = dateKey(addDays(new Date(), -1));
  if (k === today) return t('Today');
  if (k === yest) return t('Yesterday');
  const d = fromKey(k);
  return `${d.getDate()} ${monthShort(d.getMonth())}`;
};
