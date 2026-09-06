// Dashboard.jsx — 대시보드 화면

function Dashboard({ store, setStore, onNav, onStartToday }) {
  const F = window.FT;
  const [_, force] = React.useReducer(x => x + 1, 0);

  const todayIdx = Math.max(0, Math.min(F.dayIndexOf(F.todayUTC()), F.SCHEDULE.length - 1));
  const [viewIndex, setViewIndex] = React.useState(todayIdx);
  const day = F.SCHEDULE[viewIndex];
  const log = F.getLog(store, day.dateStr);

  const streak = F.computeStreak(store);
  const dday = F.ddayText(F.EXAM_DATE);
  const ddayNum = dday.replace(/[^0-9]/g, '');

  // 회독별 진행률
  const roundPct = (r) => {
    const subs = F.SUBJECT_ORDER;
    let total = 0, done = 0;
    subs.forEach(sk => {
      const s = F.subjectRoundStats(store, sk, r);
      total += s.totalFiles; done += s.doneFiles;
    });
    return total ? Math.round(done / total * 100) : 0;
  };

  const roundColors = ['var(--round-1)', 'var(--round-2)', 'var(--round-3)'];
  const roundNames = ['1회독 · 정독', '2회독 · 속독', '3회독 · 회상'];

  // week strip
  const weekCells = React.useMemo(() => {
    const t = F.todayUTC();
    const dow = t.getUTCDay();
    const monday = F.addDays(t, dow === 0 ? -6 : 1 - dow);
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const d = F.addDays(monday, i);
      const idx = F.dayIndexOf(d);
      const inRange = idx >= 0 && idx < F.SCHEDULE.length;
      const sd = inRange ? F.SCHEDULE[idx] : null;
      const isDone = sd && store.dailyLog[sd.dateStr] && store.dailyLog[sd.dateStr].completed;
      const isToday = F.fmt(d) === F.fmt(t);
      cells.push({ d, sd, isDone, isToday, idx, inRange });
    }
    return cells;
  }, [store, viewIndex]);

  // milestones
  const milestones = React.useMemo(() => {
    const t = F.todayUTC();
    const pts = [
      { name: '1회독 시작', date: F.SCHEDULE[0].date },
      { name: '2회독 시작', date: F.SCHEDULE.filter(d => d.round === 2)[0].date },
      { name: '3회독 시작', date: F.SCHEDULE.filter(d => d.round === 3)[0].date },
      { name: '총정리 시작', date: F.SCHEDULE.filter(d => d.kind === 'wrap')[0].date },
      { name: '기출 시작', date: F.SCHEDULE.filter(d => d.kind === 'mock')[0].date },
      { name: '시험일', date: F.EXAM_DATE },
    ];
    let nextSet = false;
    return pts.map(p => {
      const diff = Math.round((p.date - t) / 86400000);
      const cls = diff < 0 ? 'past' : (!nextSet ? 'next' : '');
      if (diff >= 0) nextSet = true;
      const ddText = diff === 0 ? 'D-DAY' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
      return { ...p, diff, cls, ddText };
    });
  }, [store]);

  // stats
  const doneCount = F.SCHEDULE.filter(d => store.dailyLog[d.dateStr] && store.dailyLog[d.dateStr].completed).length;
  const withActual = Object.values(store.dailyLog).filter(l => l.actualMinutes);
  const avgTime = withActual.length ? Math.round(withActual.reduce((a, l) => a + l.actualMinutes, 0) / withActual.length) : null;

  const subjectClass = day.subject === 'fire' ? 'fire' : day.subject === 'rescue' ? 'rescue' : day.subject === 'ems' ? 'ems' : 'all';
  const subjectLetter = day.subject === 'all' ? '전' : F.SUBJECT_LETTER[day.subject];

  // 회독별 진행바 (히어로용)
  const roundIdx = day.round >= 1 && day.round <= 3 ? day.round - 1 : 0;
  const roundLabel = day.round >= 1 && day.round <= 3 ? roundNames[roundIdx] : day.roundLabel;

  const toggleComplete = (checked) => {
    F.getLog(store, day.dateStr).completed = checked;
    F.saveStore(store);
    setStore({ ...store });
  };

  const updateNote = (text) => {
    F.getLog(store, day.dateStr).note = text;
    F.saveStore(store);
  };

  return (
    <div className="view">
      {/* Hero: D-day */}
      <div className="hero">
        <div className="hero-top">
          <span className="hero-kicker">소방승진시험</span>
          <span className="hero-exam">
            {F.fmt(F.EXAM_DATE)} ({F.WD[F.EXAM_DATE.getUTCDay()]})
          </span>
        </div>
        <div className="hero-dday">
          <span className="prefix">D-</span>
          <span className="val">{ddayNum || '0'}</span>
          <span className="suffix">일 남음</span>
        </div>

        <div className="hero-progress">
          {[1, 2, 3].map((r, i) => (
            <div key={r} style={{ marginBottom: i < 2 ? 10 : 0 }}>
              <div className="toprow">
                <span className="rlabel">{roundNames[i]}</span>
                <span className="rpct">{roundPct(r)}%</span>
              </div>
              <div className="segments">
                <div className="seg">
                  <div className="fg" style={{ width: `${roundPct(r)}%`, background: roundColors[i] }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-grid">
        <div className="col-left">
          {/* Today card */}
          <div>
            <div className="section-label">
              <span>오늘의 분량</span>
              <span className={`badge ${day.isWeekend ? 'weekend' : 'weekday'}`}>
                {day.isWeekend ? '주말' : '평일'}
              </span>
            </div>
            <div className="card">
              <div className="today-head">
                <div className="today-icon-title">
                  <div className={`today-icon ${subjectClass}`}>{subjectLetter}</div>
                  <div className="today-title-block">
                    <div className="subject">{day.subjectName} · {day.roundLabel}</div>
                    <div className="title">{day.title}</div>
                  </div>
                </div>
                <span className="badge streak">
                  <Icons.flame size={13} />
                  {streak}일 연속
                </span>
              </div>

              <div className="today-range mono">{day.rangeLabel}</div>

              <div className="today-metrics">
                <div className="metric">
                  <div className="lbl">페이지</div>
                  <div className="val">
                    {day.pageCount || day.fileCount || '–'}
                    {day.pageCount ? <span className="u">p</span> : day.fileCount ? <span className="u">개</span> : null}
                  </div>
                </div>
                <div className="metric">
                  <div className="lbl">예상</div>
                  <div className="val">
                    {day.estMinutes >= 60
                      ? <>
                          {Math.floor(day.estMinutes / 60)}<span className="u">h </span>
                          {day.estMinutes % 60 > 0 && <>{day.estMinutes % 60}<span className="u">m</span></>}
                        </>
                      : <>{day.estMinutes || 0}<span className="u">m</span></>
                    }
                  </div>
                </div>
                <div className="metric">
                  <div className="lbl">회독</div>
                  <div className="val">
                    {day.round >= 1 && day.round <= 3
                      ? <>{day.round}<span className="u">회독</span></>
                      : <span style={{ fontSize: 13 }}>{day.roundLabel}</span>
                    }
                  </div>
                </div>
              </div>

              {/* Phase mini bars */}
              {day.phases.length > 0 && (
                <div className="phase-mini">
                  {day.phases.map((p, i) => (
                    <div key={i} className="p" style={{ flex: p.minutes }}>
                      <div className="track" style={{ background: `color-mix(in srgb, ${p.color} 25%, transparent)` }}>
                        <div style={{ width: '0%', height: '100%', background: p.color }} />
                      </div>
                      <div className="lbl">
                        <span style={{ color: p.color, fontSize: 8 }}>●</span>
                        <span>{p.label.split(' ')[0]}</span>
                        <span style={{ marginLeft: 'auto', color: 'var(--text-ter)', fontVariantNumeric: 'tabular-nums' }}>{p.minutes}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn wide primary" onClick={() => onStartToday(day.index)}>
                <Icons.play size={20} color="#fff" />
                {viewIndex === todayIdx ? '공부 시작' : '이 날 학습 시작'}
              </button>

              <label className="check-row">
                <input type="checkbox" checked={!!log.completed} onChange={e => toggleComplete(e.target.checked)} />
                <span>이 날 완료로 표시</span>
              </label>
            </div>
          </div>

          {/* Day navigator */}
          <div>
            <div className="section-label">
              <span>날짜 이동</span>
              <span className="sub">— 어느 날에 뭘 했는지 확인·기록</span>
            </div>
            <div className="card">
              <div className="daynav">
                <button className="navbtn" disabled={viewIndex <= 0} onClick={() => setViewIndex(v => v - 1)} aria-label="이전 날">
                  <Icons.chev dir="left" size={16} />
                </button>
                <div className="navcenter">
                  <div className="date">{F.fmtHuman(day.date)}</div>
                  <div className="idx mono">DAY {day.index + 1} / {F.SCHEDULE.length}</div>
                </div>
                <button className="navbtn" disabled={viewIndex >= F.SCHEDULE.length - 1} onClick={() => setViewIndex(v => v + 1)} aria-label="다음 날">
                  <Icons.chev dir="right" size={16} />
                </button>
              </div>

              <div className="jump-row">
                <select className="jump" value={viewIndex} onChange={e => setViewIndex(parseInt(e.target.value, 10))}>
                  {F.SCHEDULE.map(d => (
                    <option key={d.index} value={d.index}>
                      D{d.index + 1} · {d.dateStr} · {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="day-detail">
                <div className="row">
                  <span className="k">범위/내용</span>
                  <span className="v mono" style={{ maxWidth: '60%', fontSize: 12.5 }}>{day.rangeLabel}</span>
                </div>
                <div className="row">
                  <span className="k">과목·단계</span>
                  <span className="v">
                    <span className={`badge ${day.kind === 'exam' ? 'bad' : day.kind === 'mock' ? 'weekend' : day.kind === 'wrap' ? 'good' : 'weekday'}`}>
                      {day.roundLabel}
                    </span>
                    <span style={{ marginLeft: 6 }}>{day.title}</span>
                  </span>
                </div>
                <div className="row">
                  <span className="k">예상 소요</span>
                  <span className="v">{day.estMinutes || 0}분 · {day.isWeekend ? '주말' : '평일'}</span>
                </div>
                <div className="row">
                  <span className="k">실제 소요</span>
                  <span className="v">{log.actualMinutes ? `${log.actualMinutes}분` : '기록 없음'}</span>
                </div>
                <label className="check-row" style={{ padding: '4px 0 0' }}>
                  <input type="checkbox" checked={!!log.completed} onChange={e => toggleComplete(e.target.checked)} />
                  <span>이 날 완료</span>
                </label>
                <textarea
                  className="note"
                  placeholder="메모 (어디까지 했는지, 헷갈린 부분 등)"
                  defaultValue={log.note || ''}
                  onBlur={e => updateNote(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-right">
          {/* Week strip */}
          <div>
            <div className="section-label"><span>이번 주 페이스</span></div>
            <div className="card compact">
              <div className="weekstrip">
                {weekCells.map((c, i) => (
                  <div
                    key={i}
                    className={`weekcell${c.isToday ? ' today' : ''}${c.inRange ? ' filled' : ' empty'}${c.isDone ? ' done' : ''}`}
                    style={c.inRange ? {
                      background: c.isDone ? 'var(--good)' : `var(--${c.sd.subject === 'fire' ? 'fire' : c.sd.subject === 'rescue' ? 'rescue' : c.sd.subject === 'ems' ? 'ems' : 'accent'})`,
                      opacity: c.isDone ? 1 : 0.75,
                    } : {}}
                    onClick={() => c.inRange && setViewIndex(c.idx)}
                    title={c.sd ? c.sd.title : '일정 범위 밖'}
                  >
                    <div className="wd">{F.WD[c.d.getUTCDay()]}</div>
                    <div className="dt">{c.d.getUTCDate()}</div>
                    <div className="mark">{c.isDone ? '✓' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div>
            <div className="section-label"><span>마일스톤</span></div>
            <div className="card compact">
              <div className="milestones">
                {milestones.map((m, i) => (
                  <div key={i} className={`milestone ${m.cls}`}>
                    <div className="mdot" />
                    <div className="mname">{m.name}</div>
                    <div className="mdate mono">{F.fmt(m.date)}</div>
                    <div className="mdday mono">{m.ddText}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div>
            <div className="section-label"><span>학습 요약</span></div>
            <div className="card compact">
              <div className="stat-tiles">
                <div className="stat-tile">
                  <span className="lbl">완료한 날</span>
                  <span className="val mono">{doneCount} / {F.SCHEDULE.length}</span>
                </div>
                <div className="stat-tile">
                  <span className="lbl">평균 실제 소요</span>
                  <span className="val mono">{avgTime ? `${avgTime}분` : '–'}</span>
                </div>
                <div className="stat-tile">
                  <span className="lbl">숫자 시트 등록</span>
                  <span className="val mono">{store.numbers.length}개</span>
                </div>
                <div className="stat-tile">
                  <span className="lbl">연속 학습</span>
                  <span className="val mono">🔥 {streak}일</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
