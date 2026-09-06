// schedule.js — 스케줄 엔진 + 저장소 + 타이머 로직
// (Claude 버전 기반, 재정리)

(function () {
  'use strict';

  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const START = new Date(Date.UTC(2026, 8, 5)); // 2026-09-05 (Day 1)

  const addDays = (b, n) => { const d = new Date(b.getTime()); d.setUTCDate(d.getUTCDate() + n); return d; };
  const isWeekendD = d => { const w = d.getUTCDay(); return w === 0 || w === 6; };
  const fmt = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  const fmtHuman = d => `${fmt(d)} (${WD[d.getUTCDay()]})`;
  const fmtShort = d => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  const todayUTC = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
  const dayIndexOf = d => Math.round((d.getTime() - START.getTime()) / 86400000);
  const escapeHtml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SUBJECTS = {
    fire:   { key: 'fire',   name: '화재', totalFiles: 290, totalPages: 613 },
    rescue: { key: 'rescue', name: '구조', totalFiles: 175, totalPages: 436 },
    ems:    { key: 'ems',    name: '구급', totalFiles: 130, totalPages: 390 },
  };

  function fileLabel(subjectKey, idx) {
    if (subjectKey === 'fire') {
      if (idx <= 205) return `화재1 _${String(idx).padStart(4, '0')}`;
      return `화재2 (${String(idx - 205).padStart(3, '0')})`;
    }
    if (subjectKey === 'rescue') return `구조 gujo_${String(idx).padStart(3, '0')}`;
    if (subjectKey === 'ems') return `구급 gugeup_${String(idx).padStart(3, '0')}`;
  }
  function rangeLabel(subjectKey, start, end) {
    if (subjectKey === 'fire' && start <= 205 && end > 205) {
      return `화재1 _${String(start).padStart(4, '0')}~_0205 + 화재2 (001)~(${String(end - 205).padStart(3, '0')})`;
    }
    const a = fileLabel(subjectKey, start);
    const b = fileLabel(subjectKey, end).replace(/^(화재1|화재2|구조|구급)\s/, '');
    return `${a} ~ ${b}`;
  }

  function distribute(total, weights) {
    const sumW = weights.reduce((a, b) => a + b, 0);
    if (sumW <= 0) return weights.map(() => 0);
    const raw = weights.map(w => (total * w) / sumW);
    const floors = raw.map(Math.round);
    let diff = total - floors.reduce((a, b) => a + b, 0);
    let i = floors.length - 1, guard = 0;
    while (diff !== 0 && floors.length > 0 && guard < 10000) {
      if (diff > 0) { floors[i]++; diff--; }
      else if (floors[i] > 0) { floors[i]--; diff++; }
      i--; if (i < 0) i = floors.length - 1;
      guard++;
    }
    return floors;
  }

  function buildBlock(subjectKey, dayCount, startOffset, mode, overrides) {
    const sub = SUBJECTS[subjectKey];
    const dates = [];
    for (let i = 0; i < dayCount; i++) dates.push(addDays(START, startOffset + i));
    const weights = mode === 'flat'
      ? dates.map(() => 1)
      : dates.map(d => (isWeekendD(d) ? 90 : 52.5));
    const fileCounts = new Array(dayCount).fill(0);
    const pageCounts = new Array(dayCount).fill(0);
    const overriddenIdx = [];
    let remainingFiles = sub.totalFiles;
    let remainingPages = sub.totalPages;
    if (overrides) {
      overrides.forEach((o, i) => {
        fileCounts[i] = o.files;
        pageCounts[i] = o.pages;
        remainingFiles -= o.files;
        remainingPages -= o.pages;
        overriddenIdx.push(i);
      });
    }
    const freeIdx = dates.map((_, i) => i).filter(i => overriddenIdx.indexOf(i) === -1);
    const freeWeights = freeIdx.map(i => weights[i]);
    const fileAlloc = distribute(remainingFiles, freeWeights);
    const pageAlloc = distribute(remainingPages, freeWeights);
    freeIdx.forEach((i, k) => { fileCounts[i] = fileAlloc[k]; pageCounts[i] = pageAlloc[k]; });

    const days = [];
    let cum = 0;
    for (let d = 0; d < dayCount; d++) {
      const fc = fileCounts[d];
      const start = cum + 1;
      const end = cum + fc;
      cum += fc;
      days.push({
        date: dates[d], dateStr: fmt(dates[d]),
        weekday: WD[dates[d].getUTCDay()], isWeekend: isWeekendD(dates[d]),
        subject: subjectKey, subjectName: sub.name,
        fileStart: start, fileEnd: end, fileCount: fc, pageCount: pageCounts[d],
        rangeLabel: fc > 0 ? rangeLabel(subjectKey, start, end) : '(버퍼)',
      });
    }
    return days;
  }

  // 회독별 phase 자동 생성
  function roundPhases(round, day) {
    if (round === 1) {
      return [
        { key: 'read',   label: '정독 (원문 읽기)',              minutes: Math.max(30, Math.round(day.pageCount * 1.3)), color: '#3A6EA5' },
        { key: 'quiz',   label: 'NotebookLM 퀴즈 (오늘 범위)',   minutes: day.isWeekend ? 20 : 12, color: '#F77F00' },
        { key: 'review', label: '오답 확인',                     minutes: day.isWeekend ? 10 : 6,  color: '#2A9D6A' },
      ];
    }
    if (round === 2) {
      return [
        { key: 'skim',   label: '속독 (스킴)', minutes: Math.max(20, Math.round(day.pageCount * 0.4)), color: '#3A6EA5' },
        { key: 'quiz',   label: '퀴즈',        minutes: 15, color: '#F77F00' },
        { key: 'review', label: '오답 확인',   minutes: 7,  color: '#2A9D6A' },
      ];
    }
    return [
      { key: 'recall',  label: '백지 인출 (회상)',     minutes: Math.max(12, Math.round(day.fileCount * 0.4)),  color: '#3A6EA5' },
      { key: 'verify',  label: '막히는 것만 확인',      minutes: Math.max(4, Math.round(day.fileCount * 0.15)), color: '#2A9D6A' },
      { key: 'numbers', label: '숫자 암기 복습',        minutes: 8, color: '#7C4DFF' },
    ];
  }

  const isWkndOffset = off => isWeekendD(addDays(START, off));

  function makeSpecialDay(date, kind, subjectKey, title, phaseTriples, note) {
    const sub = subjectKey === 'all' ? { name: '전과목' } : SUBJECTS[subjectKey];
    const phases = phaseTriples.map(p => ({ key: p[0], label: p[0], minutes: p[1], color: p[2] }));
    return {
      date, dateStr: fmt(date), weekday: WD[date.getUTCDay()], isWeekend: isWeekendD(date),
      subject: subjectKey, subjectName: sub.name,
      kind, round: kind === 'wrap' ? 4 : 5,
      roundLabel: kind === 'wrap' ? '총정리' : '기출/모의',
      title, fileCount: 0, pageCount: 0, rangeLabel: note,
      phases, estMinutes: phases.reduce((a, p) => a + p.minutes, 0),
      note,
    };
  }

  function buildSchedule() {
    // Day1/Day2는 실제 진행분 override
    const blocks = [
      { subject: 'fire',   days: 12, offset: 0,  round: 1, mode: 'weekday-weekend', overrides: [{ files: 24, pages: 86 }, { files: 44, pages: 91 }] },
      { subject: 'rescue', days: 8,  offset: 12, round: 1, mode: 'weekday-weekend' },
      { subject: 'ems',    days: 7,  offset: 20, round: 1, mode: 'weekday-weekend' },
      { subject: 'fire',   days: 6,  offset: 27, round: 2, mode: 'flat' },
      { subject: 'rescue', days: 4,  offset: 33, round: 2, mode: 'flat' },
      { subject: 'ems',    days: 3,  offset: 37, round: 2, mode: 'flat' },
      { subject: 'fire',   days: 4,  offset: 40, round: 3, mode: 'flat' },
      { subject: 'rescue', days: 3,  offset: 44, round: 3, mode: 'flat' },
      { subject: 'ems',    days: 2,  offset: 47, round: 3, mode: 'flat' },
    ];
    const all = [];
    blocks.forEach(b => {
      const days = buildBlock(b.subject, b.days, b.offset, b.mode, b.overrides);
      days.forEach(day => {
        day.kind = 'study';
        day.round = b.round;
        day.roundLabel = ['1회독', '2회독', '3회독'][b.round - 1];
        day.phases = roundPhases(b.round, day);
        day.estMinutes = day.phases.reduce((a, p) => a + p.minutes, 0);
        day.title = `${day.subjectName} ${day.roundLabel}`;
        all.push(day);
      });
    });

    // 총정리 (offsets 49-52 / 10/24-10/27)
    const wrapPlan = [
      { subject: 'fire',   title: '총정리 · 화재',        phases: [['복습', 60, '#3A6EA5'], ['약점 보완', 25, '#F77F00'], ['숫자시트 점검', 15, '#7C4DFF']] },
      { subject: 'rescue', title: '총정리 · 구조',        phases: [['복습', 60, '#3A6EA5'], ['약점 보완', 25, '#F77F00'], ['숫자시트 점검', 15, '#7C4DFF']] },
      { subject: 'ems',    title: '총정리 · 구급',        phases: [['복습', 45, '#3A6EA5'], ['약점 보완', 20, '#F77F00'], ['숫자시트 점검', 10, '#7C4DFF']] },
      { subject: 'all',    title: '총정리 · 전과목 통합', phases: [['통합 복습', 40, '#3A6EA5'], ['숫자시트 총점검', 25, '#7C4DFF'], ['최종 점검', 10, '#2A9D6A']] },
    ];
    wrapPlan.forEach((w, i) => {
      const date = addDays(START, 49 + i);
      all.push(makeSpecialDay(date, 'wrap', w.subject, w.title, w.phases,
        '전 과목 복습 + 숫자 암기 시트 점검. 파일 범위 대신 약점 위주 자유 복습.'));
    });

    // 기출 (offsets 53-62 / 10/28~11/6)
    const mockPlan = [
      { subject: 'fire',   title: '기출 1회전 · 화재 A', phases: [['기출 풀이', isWkndOffset(53) ? 95 : 60, '#3A6EA5'], ['채점/분석', isWkndOffset(53) ? 25 : 15, '#2A9D6A']] },
      { subject: 'fire',   title: '기출 1회전 · 화재 B', phases: [['기출 풀이', isWkndOffset(54) ? 95 : 60, '#3A6EA5'], ['채점/분석', isWkndOffset(54) ? 25 : 15, '#2A9D6A']] },
      { subject: 'rescue', title: '기출 1회전 · 구조 A', phases: [['기출 풀이', isWkndOffset(55) ? 95 : 60, '#3A6EA5'], ['채점/분석', isWkndOffset(55) ? 25 : 15, '#2A9D6A']] },
      { subject: 'rescue', title: '기출 1회전 · 구조 B', phases: [['기출 풀이', isWkndOffset(56) ? 95 : 60, '#3A6EA5'], ['채점/분석', isWkndOffset(56) ? 25 : 15, '#2A9D6A']] },
      { subject: 'ems',    title: '기출 1회전 · 구급 A', phases: [['기출 풀이', isWkndOffset(57) ? 95 : 60, '#3A6EA5'], ['채점/분석', isWkndOffset(57) ? 25 : 15, '#2A9D6A']] },
      { subject: 'ems',    title: '기출 1회전 · 구급 B', phases: [['기출 풀이', isWkndOffset(58) ? 95 : 60, '#3A6EA5'], ['채점/분석', isWkndOffset(58) ? 25 : 15, '#2A9D6A']] },
      { subject: 'all',    title: '오답노트 정리 · 화재/구조', phases: [['오답 재정리', 55, '#2A9D6A'], ['숫자 재확인', 20, '#7C4DFF']] },
      { subject: 'all',    title: '오답노트 정리 · 구급 + 숫자 총점검', phases: [['오답 재정리', 40, '#2A9D6A'], ['숫자시트 총점검', 35, '#7C4DFF']] },
      { subject: 'all',    title: '실전 리허설 · 모의고사 풀타임', phases: [['모의고사 (실전 타이밍)', 100, '#F77F00'], ['전체 채점/분석', 30, '#2A9D6A']] },
      { subject: 'all',    title: '최종 점검 · 전과목 요약 + 컨디션', phases: [['전과목 핵심 요약', 35, '#3A6EA5'], ['숫자시트 총복습', 25, '#7C4DFF'], ['컨디션 관리', 15, '#2A9D6A']] },
    ];
    mockPlan.forEach((m, i) => {
      const date = addDays(START, 53 + i);
      all.push(makeSpecialDay(date, 'mock', m.subject, m.title, m.phases,
        '기출 대비 기간 — 파일 범위 대신 문제풀이/오답 중심.'));
    });

    // 시험일 (offset 63)
    const examDate = addDays(START, 63);
    all.push({
      date: examDate, dateStr: fmt(examDate),
      weekday: WD[examDate.getUTCDay()], isWeekend: isWeekendD(examDate),
      subject: 'all', subjectName: '전과목',
      kind: 'exam', round: 0, roundLabel: '시험일',
      title: 'D-Day · 소방승진시험',
      fileCount: 0, pageCount: 0,
      rangeLabel: '수험표 · 신분증 · 필기구 사전 확인',
      phases: [], estMinutes: 0,
      note: '그동안의 3회독 + 기출 10일 준비를 믿고, 컨디션 관리에 집중.',
    });

    all.sort((a, b) => a.date - b.date);
    all.forEach((d, i) => { d.index = i; });
    return all;
  }

  const SCHEDULE = buildSchedule();
  const EXAM_DATE = SCHEDULE[SCHEDULE.length - 1].date;

  // ================= 저장소 (localStorage) =================
  const LS_KEY = 'firetactics_v2';

  function defaultStore() {
    return {
      theme: 'system',
      accent: 'fire',
      dailyLog: {},
      numbers: [
        { id: 'seed1', value: '130', unit: 'L/min',   subject: 'fire',   meaning: '옥내소화전 방수량', confuse: '옥외 350', category: '소방시설', fav: true,  createdAt: 0 },
        { id: 'seed2', value: '0.17', unit: 'MPa',    subject: 'fire',   meaning: '옥내소화전 방수압', confuse: '옥외 0.25', category: '소방시설', fav: false, createdAt: 0 },
        { id: 'seed3', value: '5',   unit: 'cm',     subject: 'ems',    meaning: '성인 흉부압박 깊이', confuse: '영아 4cm', category: 'CPR',      fav: true,  createdAt: 0 },
        { id: 'seed4', value: '110', unit: '회/분',  subject: 'ems',    meaning: '성인 흉부압박 속도', confuse: '',        category: 'CPR',      fav: false, createdAt: 0 },
        { id: 'seed5', value: '15',  unit: '배',     subject: 'rescue', meaning: '일반 로프 안전율',   confuse: '',        category: '로프',     fav: false, createdAt: 0 },
      ],
    };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultStore();
      return Object.assign(defaultStore(), JSON.parse(raw));
    } catch (e) { return defaultStore(); }
  }

  function saveStore(STORE) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(STORE)); } catch (e) { /* ignore */ }
  }

  function getLog(STORE, dateStr) {
    if (!STORE.dailyLog[dateStr]) {
      STORE.dailyLog[dateStr] = { completed: false, actualMinutes: null, note: '', history: [] };
    }
    return STORE.dailyLog[dateStr];
  }

  // ================= 파생 계산 =================
  const SUBJECT_ORDER = ['fire', 'rescue', 'ems'];
  const SUBJECT_LETTER = { fire: '화', rescue: '구', ems: '급' };

  function subjectRoundStats(STORE, subjectKey, round) {
    const days = SCHEDULE.filter(d => d.subject === subjectKey && d.round === round);
    const totalFiles = days.reduce((a, d) => a + d.fileCount, 0);
    const doneFiles = days.reduce((a, d) => {
      const log = STORE.dailyLog[d.dateStr];
      return a + (log && log.completed ? d.fileCount : 0);
    }, 0);
    return { totalFiles, doneFiles, pct: totalFiles ? Math.round((doneFiles / totalFiles) * 100) : 0 };
  }

  function computeStreak(STORE) {
    const idx = dayIndexOf(todayUTC());
    let streak = 0;
    for (let i = idx; i >= 0; i--) {
      const day = SCHEDULE[i];
      if (!day) break;
      const log = STORE.dailyLog[day.dateStr];
      if (log && log.completed) streak++;
      else break;
    }
    return streak;
  }

  function ddayText(target) {
    const t = todayUTC();
    const diff = Math.round((target - t) / 86400000);
    if (diff === 0) return 'D-DAY';
    return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
  }

  function beep() {
    try {
      const ctx = window.__beepCtx || (window.__beepCtx = new (window.AudioContext || window.webkitAudioContext)());
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.08;
      o.connect(g); g.connect(ctx.destination); o.start();
      setTimeout(() => o.stop(), 260);
    } catch (e) { /* ignore */ }
    if (navigator.vibrate) try { navigator.vibrate([120, 60, 120]); } catch (e) { }
  }

  // ================= 공개 API =================
  window.FT = {
    WD, START, EXAM_DATE, SCHEDULE, SUBJECTS, SUBJECT_ORDER, SUBJECT_LETTER,
    addDays, isWeekendD, fmt, fmtHuman, fmtShort, todayUTC, dayIndexOf, escapeHtml,
    loadStore, saveStore, getLog, defaultStore,
    subjectRoundStats, computeStreak, ddayText, beep,
    LS_KEY,
  };
})();
