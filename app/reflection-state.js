// Daily reflection uses local calendar dates, independent of timer sessions.
(function(root) {
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const shiftDate = (key, delta) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate()+delta); return dateKey(d); };
  const minutes = value => Math.max(0, Math.min(1440, Math.floor(Number(value) || 0)));
  const blank = () => ({ slots: [], study: '', rest: '', events: [], focusId: '', situation: '', reason: '', turning: '', alternative: '', win: '', cue: '', action: '', confirmed: false, check: '', helped: '', obstacle: '' });
  function availability(slots) {
    const ranges = []; let invalid = false;
    const parse = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || '') ? Number(s.slice(0,2))*60+Number(s.slice(3)) : NaN;
    for (const s of slots) {
      const a = parse(s.start), b = s.end === '24:00' ? 1440 : parse(s.end);
      if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) { invalid = true; continue; }
      ranges.push([a,b]);
    }
    ranges.sort((a,b)=>a[0]-b[0]);
    let total = 0, end = -1, overlap = false;
    for (const [a,b] of ranges) { if (a < end) overlap = true; total += Math.max(0,b-Math.max(a,end)); end = Math.max(end,b); }
    return { total, invalid, overlap };
  }
  function totals(day) {
    const available = availability(day.slots);
    const study = minutes(day.study), rest = minutes(day.rest), lost = day.events.reduce((n,e)=>n+minutes(e.minutes),0);
    return { ...available, study, rest, lost, remaining: available.total-study-rest-lost };
  }
  const api = { dateKey, shiftDate, minutes, blank, availability, totals, duration: n => `${Math.floor(n/60)}시간 ${n%60}분` };
  if (typeof module !== 'undefined') module.exports = api;
  root.ReflectionState = api;
})(typeof window !== 'undefined' ? window : globalThis);
