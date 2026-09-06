// Progress.jsx — 진행률 화면

function ProgressView({ store }) {
  const F = window.FT;

  const roundColors = ['var(--round-1)', 'var(--round-2)', 'var(--round-3)'];
  const subjectColors = { fire: 'var(--fire)', rescue: 'var(--rescue)', ems: 'var(--ems)' };

  // Overall
  let overallTotal = 0, overallDone = 0;
  F.SUBJECT_ORDER.forEach(sk => {
    [1, 2, 3].forEach(r => {
      const s = F.subjectRoundStats(store, sk, r);
      overallTotal += s.totalFiles; overallDone += s.doneFiles;
    });
  });

  // Adherence
  const idx = F.dayIndexOf(F.todayUTC());
  let adherence = null;
  if (idx >= 0 && idx < F.SCHEDULE.length) {
    const expectedDone = idx + 1;
    const actualDone = F.SCHEDULE.slice(0, idx + 1)
      .filter(d => store.dailyLog[d.dateStr] && store.dailyLog[d.dateStr].completed).length;
    const delta = actualDone - expectedDone;
    const headline = delta === 0 ? '계획대로 정확히 진행 중이에요'
      : `계획보다 ${Math.abs(delta)}일 ${delta > 0 ? '앞서' : '밀려'} 있어요`;
    const cls = delta >= 0 ? 'good' : (delta <= -3 ? 'bad' : 'flat');
    adherence = {
      headline, delta, cls,
      sub: `완료 ${actualDone}일 / 경과 ${expectedDone}일`,
    };
  }

  // 최근 실적 차트 데이터
  const chartData = F.SCHEDULE
    .filter(d => store.dailyLog[d.dateStr] && store.dailyLog[d.dateStr].actualMinutes)
    .slice(-14);

  // Overall by round for stacked bar (색깔별)
  const roundOverall = [1, 2, 3].map(r => {
    let total = 0, done = 0;
    F.SUBJECT_ORDER.forEach(sk => {
      const s = F.subjectRoundStats(store, sk, r);
      total += s.totalFiles; done += s.doneFiles;
    });
    return { round: r, total, done, pct: total ? done / total : 0 };
  });

  return (
    <div className="progress-view">
      {/* Adherence banner */}
      <div>
        <div className="section-label"><span>일정 준수 현황</span></div>
        {adherence ? (
          <div className={`adherence ${adherence.cls}`}>
            <div className="aicon">
              {adherence.delta > 0 ? <Icons.check size={22} /> : adherence.delta <= -3 ? <Icons.warn size={22} /> : <Icons.pin size={22} />}
            </div>
            <div className="atext">
              <div className="big">{adherence.headline}</div>
              <div className="small">{adherence.sub}</div>
            </div>
          </div>
        ) : (
          <div className="adherence flat">
            <div className="aicon"><Icons.pin size={22} /></div>
            <div className="atext">
              <div className="big">일정 시작 전이거나 종료되었습니다</div>
            </div>
          </div>
        )}
      </div>

      {/* Overall progress */}
      <div>
        <div className="section-label"><span>전체 진행률</span></div>
        <div className="card">
          <div className="overall-bar">
            <div className="toprow">
              <span>파일 수 기준</span>
              <span><span className="val">{overallDone.toLocaleString()}</span> / {overallTotal.toLocaleString()} 파일</span>
            </div>
            <div className="stack-bar">
              {roundOverall.map((r, i) => (
                <div key={r.round} className="seg">
                  <div className="fg" style={{ width: `${r.pct * 100}%`, background: roundColors[i] }} />
                </div>
              ))}
            </div>
            <div className="stack-legend">
              {roundOverall.map((r, i) => (
                <div key={r.round} className="lg">
                  <div className="dot" style={{ background: roundColors[i] }} />
                  <span>{r.round}회독</span>
                  <span className="mono" style={{ color: 'var(--text-ter)' }}>{Math.round(r.pct * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subject × Round */}
      <div>
        <div className="section-label"><span>과목 × 회독</span></div>
        <div className="card" style={{ padding: 10 }}>
          {F.SUBJECT_ORDER.map(sk => {
            const sub = F.SUBJECTS[sk];
            const rounds = [1, 2, 3].map(r => F.subjectRoundStats(store, sk, r));
            const subjTotal = rounds.reduce((a, r) => a + r.totalFiles, 0);
            const subjDone = rounds.reduce((a, r) => a + r.doneFiles, 0);
            const subjPct = subjTotal ? Math.round(subjDone / subjTotal * 100) : 0;
            return (
              <div className="subject-block" key={sk}>
                <div className="subj-head">
                  <div className="subj-letter" style={{ background: subjectColors[sk] }}>
                    {F.SUBJECT_LETTER[sk]}
                  </div>
                  <div>
                    <div className="subj-name">{sub.name}</div>
                    <div className="subj-total mono">{subjDone} / {subjTotal} 파일</div>
                  </div>
                  <div className="subj-pct" style={{ color: subjectColors[sk] }}>{subjPct}%</div>
                </div>
                {rounds.map((r, i) => (
                  <div className="round-row" key={i}>
                    <span
                      className="rchip"
                      style={{
                        background: `color-mix(in srgb, ${roundColors[i]} 12%, transparent)`,
                        color: roundColors[i],
                      }}
                    >{i + 1}회독</span>
                    <span className="rcount mono">{r.doneFiles}/{r.totalFiles}</span>
                    <div className="bar-track">
                      <div className="bar-fg" style={{ width: `${r.pct}%`, background: roundColors[i] }} />
                    </div>
                    <span className="rpct mono">{r.pct}%</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* 예상 vs 실제 차트 */}
      <div>
        <div className="section-label">
          <span>예상 vs 실제 소요시간</span>
          <span className="sub">— 최근 14일 기록</span>
        </div>
        <div className="card">
          <div className="chart-wrap">
            <ChartSVG data={chartData} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartSVG({ data }) {
  const F = window.FT;
  const store = window.__STORE__;
  const W = 640, H = 200, padL = 36, padR = 12, padT = 20, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  if (!data.length) {
    return (
      <svg width="100%" height="180" viewBox={`0 0 ${W} 180`}>
        <text x={W / 2} y="90" textAnchor="middle" fill="var(--text-ter)" fontSize="13">
          아직 타이머 기록이 없습니다. 타이머로 학습을 마치면 여기에 표시됩니다.
        </text>
      </svg>
    );
  }

  const actuals = data.map(d => (store.dailyLog[d.dateStr]?.actualMinutes) || 0);
  const maxVal = Math.max(...data.map(d => Math.max(d.estMinutes, (store.dailyLog[d.dateStr]?.actualMinutes) || 0))) * 1.15 || 60;
  const bw = innerW / data.length;

  const gridlines = [0, 0.5, 1];

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMid meet">
      {gridlines.map((f, i) => {
        const y = padT + innerH * (1 - f);
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
            <text x={4} y={y + 4} fontSize="10" fill="var(--text-ter)">{Math.round(maxVal * f)}m</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const log = store.dailyLog[d.dateStr];
        const x = padL + i * bw;
        const estH = innerH * (d.estMinutes / maxVal);
        const actH = innerH * ((log.actualMinutes || 0) / maxVal);
        const over = (log.actualMinutes || 0) > d.estMinutes;
        return (
          <g key={i}>
            <rect
              x={x + bw * 0.18} y={padT + innerH - estH}
              width={bw * 0.28} height={estH}
              fill="var(--border-strong)" rx="3"
            />
            <rect
              x={x + bw * 0.52} y={padT + innerH - actH}
              width={bw * 0.28} height={actH}
              fill={over ? 'var(--bad)' : 'var(--good)'} rx="3"
            />
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-ter)">
              {F.fmtShort(d.date)}
            </text>
          </g>
        );
      })}
      <text x={W - padR} y={12} textAnchor="end" fontSize="10.5" fill="var(--text-sec)">
        예상(회색) · 실제(초록/빨강)
      </text>
    </svg>
  );
}

window.ProgressView = ProgressView;
