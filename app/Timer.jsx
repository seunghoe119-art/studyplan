// Timer.jsx — 타이머 화면 (phase 자동/실제시간 자동기록)

function Timer({ store, setStore, initialDayIdx }) {
  const F = window.FT;

  const todayIdx = Math.max(0, Math.min(F.dayIndexOf(F.todayUTC()), F.SCHEDULE.length - 1));
  const [dayIdx, setDayIdx] = React.useState(initialDayIdx != null ? initialDayIdx : todayIdx);
  const day = F.SCHEDULE[dayIdx];

  // Timer state
  const [phaseIdx, setPhaseIdx] = React.useState(0);
  const [remaining, setRemaining] = React.useState(day.phases[0] ? day.phases[0].minutes * 60 : 0);
  const [running, setRunning] = React.useState(false);
  const [history, setHistory] = React.useState([]);
  const [log, setLog] = React.useState('시작하면 실제 소요 시간이 자동 기록됩니다.');
  const startedRef = React.useRef(null);

  // 새 날 선택 시 리셋
  React.useEffect(() => {
    setPhaseIdx(0);
    setRemaining(day.phases[0] ? day.phases[0].minutes * 60 : 0);
    setRunning(false);
    setHistory([]);
    setLog(day.phases.length ? '시작하면 실제 소요 시간이 자동 기록됩니다.' : '이 날은 자유 진행 항목입니다.');
    startedRef.current = null;
  }, [dayIdx]);

  // tick
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          // phase 완료
          F.beep();
          const phase = day.phases[phaseIdx];
          const spent = phase ? phase.minutes * 60 : 0;
          setHistory(h => [...h, { phase: phase?.label, plannedSec: spent, actualSec: spent }]);

          if (phaseIdx + 1 >= day.phases.length) {
            // 세션 완료
            setRunning(false);
            finishSession([...history, { phase: phase?.label, plannedSec: spent, actualSec: spent }]);
            return 0;
          } else {
            const next = day.phases[phaseIdx + 1];
            setPhaseIdx(phaseIdx + 1);
            return next.minutes * 60;
          }
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phaseIdx, day, history]);

  const finishSession = (fullHistory) => {
    const totalActual = fullHistory.reduce((a, h) => a + h.actualSec, 0);
    const lg = F.getLog(store, day.dateStr);
    lg.actualMinutes = Math.round(totalActual / 60) || day.estMinutes;
    lg.history = fullHistory;
    lg.completed = true;
    F.saveStore(store);
    setStore({ ...store });
    setLog(`세션 완료! 실제 약 ${lg.actualMinutes}분 기록됨 (자동 완료 표시).`);
  };

  const toggle = () => {
    if (!day.phases.length) return;
    if (running) {
      // 일시정지: 현재 phase까지 진행분 계산
      setRunning(false);
    } else {
      setRunning(true);
      if (!startedRef.current) startedRef.current = Date.now();
    }
  };
  const skipPhase = () => {
    if (!day.phases.length) return;
    const phase = day.phases[phaseIdx];
    const spent = (phase.minutes * 60) - remaining;
    const newHist = [...history, { phase: phase.label, plannedSec: phase.minutes * 60, actualSec: spent }];
    setHistory(newHist);

    if (phaseIdx + 1 >= day.phases.length) {
      setRunning(false);
      finishSession(newHist);
      setRemaining(0);
      setPhaseIdx(day.phases.length);
    } else {
      const next = day.phases[phaseIdx + 1];
      setPhaseIdx(phaseIdx + 1);
      setRemaining(next.minutes * 60);
    }
  };
  const reset = () => {
    setPhaseIdx(0);
    setRemaining(day.phases[0] ? day.phases[0].minutes * 60 : 0);
    setRunning(false);
    setHistory([]);
    setLog('시작하면 실제 소요 시간이 자동 기록됩니다.');
  };

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
            <button className="tbtn" onClick={skipPhase} title="다음 단계로">
              <Icons.skip size={20} />
            </button>
            <button className="tbtn main" onClick={toggle} style={{ '--phase-current': phaseColor }}>
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
