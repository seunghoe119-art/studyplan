// Timer.jsx — persist each action and reconcile elapsed wall time on return.
function Timer({ store, setStore, initialDayIdx }) {
  const F = window.FT;
  const T = window.TimerState;
  const todayIdx = Math.max(0, Math.min(F.dayIndexOf(F.todayUTC()), F.SCHEDULE.length - 1));
  const [dayIdx, selectDay] = React.useState(() => {
    const saved = F.SCHEDULE.findIndex(d => d.dateStr === store.timerDay);
    return initialDayIdx != null ? initialDayIdx : saved >= 0 ? saved : todayIdx;
  });
  const [, redraw] = React.useState(0);
  const latest = React.useRef(store);
  latest.current = store;
  const day = F.SCHEDULE[dayIdx];

  // Save completion and countdown together, so a restart cannot duplicate a record.
  const putSession = (data, target, next) => {
    const previous = data.timerSessions?.[target.dateStr];
    data.timerSessions = { ...data.timerSessions, [target.dateStr]: next };
    if (next.completed && !previous?.completed) {
      const lg = F.getLog(data, target.dateStr);
      lg.actualMinutes = Math.round(next.history.reduce((sum, h) => sum + h.actualSec, 0) / 60);
      lg.history = next.history;
      lg.completed = true;
    }
  };
  const reconcile = () => {
    const data = latest.current;
    let changed = false;
    for (const target of F.SCHEDULE) {
      const saved = data.timerSessions?.[target.dateStr];
      if (!saved?.running) continue;
      const next = T.advance(saved, target, Date.now());
      // Keep the original anchor between transitions; no per-second disk writes.
      if (next.phaseIdx !== saved.phaseIdx) {
        putSession(data, target, next);
        changed = true;
      }
    }
    if (changed) {
      F.saveStore(data);
      setStore({ ...data });
      if (document.visibilityState === 'visible') F.beep();
    }
    redraw(n => n + 1);
  };
  React.useEffect(() => {
    reconcile();
    const id = setInterval(reconcile, 1000);
    const checkpoint = () => {
      reconcile();
      F.saveStore(latest.current);
    };
    window.addEventListener('pageshow', reconcile);
    window.addEventListener('focus', reconcile);
    window.addEventListener('pagehide', checkpoint);
    document.addEventListener('visibilitychange', checkpoint);
    return () => {
      clearInterval(id);
      window.removeEventListener('pageshow', reconcile);
      window.removeEventListener('focus', reconcile);
      window.removeEventListener('pagehide', checkpoint);
      document.removeEventListener('visibilitychange', checkpoint);
    };
  }, []);

  const setDayIdx = (idx) => {
    selectDay(idx);
    const data = latest.current;
    data.timerDay = F.SCHEDULE[idx].dateStr;
    F.saveStore(data);
    setStore({ ...data });
  };
  React.useEffect(() => {
    if (initialDayIdx != null) setDayIdx(initialDayIdx);
  }, [initialDayIdx]);

  const session = T.advance(store.timerSessions?.[day.dateStr], day, Date.now());
  const { phaseIdx, running, history } = session;
  const remaining = Math.ceil(session.remainingMs / 1000);
  const log = session.completed
    ? '세션 완료! 공부 기록이 저장되었습니다.'
    : !day.phases.length ? '이 날은 자유 진행 항목입니다.'
    : running ? '진행 중 · 앱을 다시 열어도 복원됩니다.'
    : '시작·일시정지 상태와 공부 기록이 자동 저장됩니다.';
  const act = (type) => {
    const data = latest.current;
    const next = T.action(data.timerSessions?.[day.dateStr], day, Date.now(), type);
    putSession(data, day, next);
    data.timerDay = day.dateStr;
    F.saveStore(data);
    setStore({ ...data });
  };
  const toggle = () => act('toggle');
  const skipPhase = () => act('skip');
  const reset = () => act('reset');

  const phase = day.phases[phaseIdx];
  const totalSec = phase ? phase.minutes * 60 : 0;
  const pct = totalSec > 0 ? Math.max(0, Math.min(1, remaining / totalSec)) : 0;
  const c = 2 * Math.PI * 52;
  const dashOffset = c * (1 - pct);
  const phaseColor = phase ? phase.color : 'var(--good)';

  const mm = String(Math.floor(Math.max(remaining, 0) / 60)).padStart(2, '0');
  const ss = String(Math.max(remaining, 0) % 60).padStart(2, '0');

  // 진행률 계산
  const historySec = history.reduce((a, h) => a + h.actualSec, 0);
  const elapsedInPhase = phase ? Math.max(0, totalSec - remaining) : 0;
  const sessionSec = historySec + elapsedInPhase;
  const totalEstSec = day.estMinutes * 60;
  const overallPct = totalEstSec > 0 ? Math.min(100, Math.round(sessionSec / totalEstSec * 100)) : 0;

  return (
    <div className="timer-view">
      {/* 대상 날짜 네비 */}
      <div className="card compact">
        <div className="section-label" style={{ padding: 0, marginBottom: 0 }}>
          <span>타이머 대상 날짜</span>
        </div>
        <div className="daynav">
          <button className="navbtn" disabled={dayIdx <= 0} onClick={() => setDayIdx(dayIdx - 1)}>
            <Icons.chev dir="left" size={16} />
          </button>
          <div className="navcenter">
            <div className="date">{F.fmtHuman(day.date)}</div>
            <div className="idx mono" style={{ fontSize: 11 }}>{day.title} · {day.rangeLabel}</div>
          </div>
          <button className="navbtn" disabled={dayIdx >= F.SCHEDULE.length - 1} onClick={() => setDayIdx(dayIdx + 1)}>
            <Icons.chev dir="right" size={16} />
          </button>
        </div>
      </div>

      {/* 타이머 카드 */}
      <div className="timer-card tint-phase" style={{ '--phase-current': phaseColor }}>
        {/* Phase pills */}
        <div className="phase-pills">
          {day.phases.map((p, i) => (
            <span
              key={i}
              className={`phase-pill${i === phaseIdx ? ' active' : ''}${i < phaseIdx ? ' done' : ''}`}
              style={{ '--pill-c': p.color }}
            >
              {p.label.split(' ')[0]} · {p.minutes}m
            </span>
          ))}
          {day.phases.length === 0 && (
            <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>
              이 날은 자유 진행 항목입니다.
            </span>
          )}
        </div>

        {/* Ring */}
        {day.phases.length > 0 && (
          <div className="timer-ring">
            <svg viewBox="0 0 120 120">
              <circle className="bg-ring" cx="60" cy="60" r="52" />
              <circle
                className="fg-ring"
                cx="60" cy="60" r="52"
                style={{ stroke: phaseColor, strokeDasharray: c, strokeDashoffset: dashOffset }}
              />
            </svg>
            <div className="timer-center">
              <div className="kicker">REMAINING</div>
              <div className="clock mono">{mm}:{ss}</div>
              <div className="phase-name">{phase ? phase.label : '완료'}</div>
              {phase && <div className="phase-idx">단계 {phaseIdx + 1} / {day.phases.length}</div>}
            </div>
          </div>
        )}

        {/* Controls */}
        {day.phases.length > 0 && (
          <div className="timer-controls">
            <button className="tbtn" onClick={skipPhase} disabled={session.completed} title="다음 단계로">
              <Icons.skip size={20} />
            </button>
            <button className="tbtn main" onClick={toggle} disabled={session.completed} style={{ '--phase-current': phaseColor }}>
              {running ? <Icons.pause size={34} color="#fff" /> : <Icons.play size={30} color="#fff" />}
            </button>
            <button className="tbtn" onClick={reset} title="리셋">
              <Icons.reset size={18} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="timer-stats">
          <div className="ts">
            <div className="lbl">진행률</div>
            <div className="val mono">{overallPct}%</div>
          </div>
          <div className="ts">
            <div className="lbl">오늘 범위</div>
            <div className="val mono" style={{ fontSize: 13 }}>
              {day.fileCount ? `${day.fileCount}개` : day.pageCount ? `${day.pageCount}p` : '자유'}
            </div>
          </div>
          <div className="ts">
            <div className="lbl">세션 시간</div>
            <div className="val mono">{Math.round(sessionSec / 60)}m</div>
          </div>
        </div>

        <div className="timer-log">{log}</div>
      </div>
    </div>
  );
}

window.Timer = Timer;
