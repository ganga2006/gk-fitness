import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { BY_ID } from '../data/exercises';
import { fmtDuration } from '../lib/date';
import { useStore } from '../state/store';
import { evaluate } from '../data/achievements';
import { Thumb } from '../anim/Thumb';
import { t, tn } from '../i18n';

export function Summary({ logId, onClose }: { logId: string; onClose: () => void }) {
  const { state, stats, dispatch } = useStore();
  const log = state.logs.find((l) => l.id === logId);
  const [rated, setRated] = useState<1 | 2 | 3 | null>(log?.effort ?? null);

  // Any achievement that crossed its threshold with this session.
  const freshlyUnlocked = useMemo(() => {
    return evaluate(stats).filter((a) => a.unlocked && !state.unlocked.includes(a.id));
  }, [stats, state.unlocked]);

  useEffect(() => {
    if (freshlyUnlocked.length) {
      dispatch({ type: 'unlock', ids: freshlyUnlocked.map((a) => a.id) });
    }
  }, [freshlyUnlocked, dispatch]);

  if (!log) return null;

  const pct = log.total ? Math.round((log.completed / log.total) * 100) : 100;

  return (
    <div className="scroll-area">
      <div className="topbar">
        <div className="grow" />
        <button className="icon-btn" onClick={onClose} aria-label={t('Close')}>
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="page-pad">
        <div style={{ textAlign: 'center', paddingTop: 6 }} className="pop-in">
          <div style={{
            width: 72, height: 72, margin: '0 auto 16px', borderRadius: 24,
            background: 'var(--volt)', color: '#0A0C11',
            display: 'grid', placeItems: 'center', boxShadow: 'var(--glow-volt)',
          }}>
            <Icon name="check" size={36} strokeWidth={2.6} />
          </div>
          <div className="eyebrow" style={{ color: 'var(--volt)' }}>{t('Workout complete')}</div>
          <h1 className="h-display" style={{ marginTop: 6 }}>{t(log.title)}</h1>
        </div>

        <div className="stat-grid" style={{ marginTop: 24 }}>
          <div className="stat-tile">
            <span className="stat-val num" style={{ color: 'var(--volt)' }}>{Math.round(log.calories)}</span>
            <span className="stat-lab">{t('Kcal burned')}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-val num" style={{ color: 'var(--aqua)' }}>
              {Math.round(log.activeSeconds / 60)}
            </span>
            <span className="stat-lab">{t('Minutes')}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-val num" style={{ color: 'var(--ember)' }}>{pct}%</span>
            <span className="stat-lab">{t('Completed')}</span>
          </div>
        </div>

        {/* ── effort rating drives adaptive difficulty ── */}
        <div className="block-head">
          <h3 className="h-section">{t('How did that feel?')}</h3>
          <div className="line" />
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--txt-3)', marginTop: -4, marginBottom: 12 }}>
          {t('Rate three sessions the same way and the app will suggest changing your level.')}
        </p>
        <div className="seg">
          {([[1, 'Too easy'], [2, 'Just right'], [3, 'Too hard']] as const).map(([v, label]) => (
            <button
              key={v}
              className={rated === v ? 'on' : ''}
              onClick={() => { setRated(v); dispatch({ type: 'rateLog', id: log.id, effort: v }); }}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {/* ── new achievements ── */}
        {freshlyUnlocked.length > 0 && (
          <>
            <div className="block-head">
              <h3 className="h-section">{t('Unlocked')}</h3>
              <div className="line" />
            </div>
            <div className="ach-grid">
              {freshlyUnlocked.map((a) => (
                <div key={a.id} className={`ach ${a.tier} pop-in`}>
                  <div className="ach-ic"><Icon name={a.icon} size={19} /></div>
                  <div className="ach-n">{t(a.name)}</div>
                  <div className="ach-d">{t(a.desc)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── per-exercise breakdown ── */}
        <div className="block-head">
          <h3 className="h-section">{t('Breakdown')}</h3>
          <div className="line" />
        </div>
        {log.exercises
          .slice()
          .sort((a, b) => b.calories - a.calories)
          .map((le) => {
            const e = BY_ID[le.id];
            if (!e) return null;
            return (
              <div key={le.id} className="ex-row">
                <div className="ex-thumb">
                  <Thumb exId={e.id} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ex-name">{t(e.name)}</div>
                  <div className="ex-sub">
                    {fmtDuration(le.seconds)}{le.setsDone ? ` · ${tn(le.setsDone, '{n} set', '{n} sets')}` : ''}
                  </div>
                </div>
                <span className="ex-dose num">{Math.round(le.calories)} {t('kcal')}</span>
              </div>
            );
          })}

        <button className="btn btn-primary btn-block" style={{ marginTop: 24 }} onClick={onClose}>
          {t('Done')}
        </button>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
