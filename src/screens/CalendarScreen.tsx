import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { PLANS } from '../data/plans';
import { BY_ID } from '../data/exercises';
import { dateKey, endOfMonth, fmtDuration, monthName, relativeDay, startOfMonth } from '../lib/date';
import { getLang, t } from '../i18n';
import { useStore } from '../state/store';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DOW_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarScreen() {
  const { state, stats, dispatch } = useStore();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [picked, setPicked] = useState<string | null>(null);

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    const lead = (first.getDay() + 6) % 7;         // Monday-first
    const out: (Date | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= last.getDate(); d++) {
      out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const monthStats = useMemo(() => {
    let kcal = 0, sec = 0, days = 0;
    for (const c of cells) {
      if (!c) continue;
      const r = stats.byDate[dateKey(c)];
      if (r) { kcal += r.calories; sec += r.seconds; days += 1; }
    }
    return { kcal: Math.round(kcal), minutes: Math.round(sec / 60), days };
  }, [cells, stats]);

  // Scale the dot intensity against the best day of the month.
  const peak = useMemo(() => {
    let m = 0;
    for (const c of cells) if (c) m = Math.max(m, stats.byDate[dateKey(c)]?.calories ?? 0);
    return m || 1;
  }, [cells, stats]);

  const today = new Date();
  const pickedLogs = picked ? state.logs.filter((l) => l.date === picked) : [];

  return (
    <div className="scroll-area">
      <div className="topbar">
        <div className="grow">
          <div className="eyebrow">{t('Your history')}</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.028em' }}>{t('Calendar')}</h2>
        </div>
      </div>

      <div className="page-pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button className="icon-btn" aria-label={t('Previous month')}
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <Icon name="chevronLeft" size={17} />
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 750, fontSize: 15.5 }}>
            {monthName(cursor.getMonth())} {cursor.getFullYear()}
          </div>
          <button className="icon-btn" aria-label={t('Next month')}
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <Icon name="chevronRight" size={17} />
          </button>
        </div>

        <div className="cal-grid" style={{ marginBottom: 6 }}>
          {DOW.map((d, i) => <div key={i} className="cal-dow">{getLang() === 'te' ? t(DOW_FULL[i]) : d}</div>)}
        </div>

        <div className="cal-grid">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="cal-cell blank" />;
            const k = dateKey(d);
            const rec = stats.byDate[k];
            const isToday = k === dateKey(today);
            const isFuture = d > today && !isToday;
            const planKind = PLANS[state.profile.planStyle][state.profile.level][(d.getDay() + 6) % 7].kind;
            const intensity = rec ? 0.28 + 0.72 * Math.min(1, rec.calories / peak) : 0;

            return (
              <button
                key={i}
                className={`cal-cell${rec ? ' done' : ''}${isToday ? ' today' : ''}${isFuture ? ' future' : ''}`}
                style={rec ? {
                  background: `color-mix(in srgb, var(--volt) ${Math.round(intensity * 100)}%, var(--surface))`,
                  borderColor: 'transparent',
                } : undefined}
                onClick={() => rec && setPicked(k)}
              >
                <span>{d.getDate()}</span>
                {rec && <span className="cal-kcal num">{Math.round(rec.calories)}</span>}
                {!rec && planKind === 'rest' && !isFuture && <span className="cal-dot-rest" />}
              </button>
            );
          })}
        </div>

        <div className="legend" style={{ marginTop: 16 }}>
          <span><i style={{ background: 'var(--volt)' }} />{t('Trained (shade = calories)')}</span>
          <span><i style={{ border: '1.2px dashed var(--txt-3)', background: 'transparent' }} />{t('Rest day')}</span>
        </div>

        <div className="stat-grid" style={{ marginTop: 20 }}>
          <div className="stat-tile">
            <span className="stat-val num">{monthStats.days}</span>
            <span className="stat-lab">{t('Active days')}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-val num" style={{ color: 'var(--volt)' }}>{monthStats.kcal}</span>
            <span className="stat-lab">{t('Kcal')}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-val num" style={{ color: 'var(--aqua)' }}>{monthStats.minutes}</span>
            <span className="stat-lab">{t('Minutes')}</span>
          </div>
        </div>

        {stats.sessions === 0 && (
          <div className="empty" style={{ marginTop: 10 }}>
            <Icon name="calendar" size={30} />
            <p style={{ fontSize: 13.5, maxWidth: 240 }}>
              {t('Finish a workout and the day lights up here, shaded by how much you burned.')}
            </p>
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>

      <Sheet open={!!picked} onClose={() => setPicked(null)} title={picked ? relativeDay(picked) : ''}>
        {pickedLogs.map((l) => (
          <div key={l.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 750, fontSize: 15 }}>{t(l.title)}</div>
                <div style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 3 }}>
                  {new Date(l.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' · '}{t(l.level)}
                </div>
              </div>
              <button className="icon-btn" aria-label={t('Delete session')}
                      onClick={() => { dispatch({ type: 'deleteLog', id: l.id }); setPicked(null); }}>
                <Icon name="trash" size={16} />
              </button>
            </div>

            <div className="stat-grid" style={{ marginTop: 12 }}>
              <div className="stat-tile" style={{ padding: '10px 9px' }}>
                <span className="stat-val num" style={{ fontSize: 17, color: 'var(--volt)' }}>
                  {Math.round(l.calories)}
                </span>
                <span className="stat-lab">{t('Kcal')}</span>
              </div>
              <div className="stat-tile" style={{ padding: '10px 9px' }}>
                <span className="stat-val num" style={{ fontSize: 17 }}>{fmtDuration(l.activeSeconds)}</span>
                <span className="stat-lab">{t('Time')}</span>
              </div>
              <div className="stat-tile" style={{ padding: '10px 9px' }}>
                <span className="stat-val num" style={{ fontSize: 17 }}>{l.completed}/{l.total}</span>
                <span className="stat-lab">{t('Moves')}</span>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {l.exercises.slice(0, 8).map((le) => (
                <span key={le.id} className="chip" style={{ fontSize: 11 }}>
                  {BY_ID[le.id] ? t(BY_ID[le.id].name) : le.id}
                </span>
              ))}
            </div>
          </div>
        ))}
      </Sheet>
    </div>
  );
}
