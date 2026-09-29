// Daily reflection uses local calendar dates, independent of timer sessions.
(function(root) {
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const shiftDate = (key, delta) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate()+delta); return dateKey(d); };
  const minutes = value => Math.max(0, Math.min(1440, Math.floor(Number(value) || 0)));
  const blank = () => ({ slots: [], study: '', rest: '', events: [], focusId: '', situation: '', reason: '', turning: '', alternative: '', win: '', cue: '', action: '', confirmed: false, check: '', helped: '', obstacle: '' });
  function slotRange(s) {
    const parse = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || '') ? Number(s.slice(0,2))*60+Number(s.slice(3)) : NaN;
    let a = parse(s.start), b = s.end === '24:00' ? 1440 : parse(s.end);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === a) return null;
    if (b < a) b += 1440;
    if (s.startNextDay) { a += 1440; b += 1440; }
    return { start: a, end: b, endNextDay: b >= 1440 };
  }
  function availability(slots) {
    const ranges = []; let invalid = false;
    for (const s of slots) {
      const range = slotRange(s);
      if (!range) { invalid = true; continue; }
      ranges.push([range.start,range.end]);
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
  function summarize(records = {}, end, length = 7) {
    const start = shiftDate(end, 1-length);
    const entries = Object.entries(records).filter(([key])=>key>=start && key<=end).sort((a,b)=>b[0].localeCompare(a[0]));
    const result = {start,end,entries,days:0,excluded:0,total:0,study:0,rest:0,lost:0,remaining:0,categories:{},reasons:{},situations:{},actions:[]};
    const actions = new Map();
    for (const [key, raw] of entries) {
      const d = {...blank(),...raw}, t = totals(d);
      if (t.total>0 && !t.invalid && !t.overlap && t.remaining>=0 && d.study!=='' && d.rest!=='') {
        result.days++;
        for (const k of ['total','study','rest','lost','remaining']) result[k]+=t[k];
        for (const e of d.events) result.categories[e.category]=(result.categories[e.category]||0)+minutes(e.minutes);
      } else result.excluded++;
      if(d.reason) result.reasons[d.reason]=(result.reasons[d.reason]||0)+1;
      if(d.context) result.situations[d.context]=(result.situations[d.context]||0)+1;
      const prev=records[shiftDate(key,-1)];
      if(prev?.confirmed && prev.action?.trim() && ['했음','일부 했음','못 했음'].includes(d.check)) {
        const id=JSON.stringify([prev.cue.trim(),prev.action.trim()]);
        const a=actions.get(id)||{cue:prev.cue,action:prev.action,checked:0,done:0,partial:0,helped:0};
        a.checked++; if(d.check==='했음') a.done++; if(d.check==='일부 했음') a.partial++;
        if(['했음','일부 했음'].includes(d.check) && d.helped==='도움 됐음') a.helped++;
        actions.set(id,a);
      }
    }
    result.actions=[...actions.values()].sort((a,b)=>b.helped-a.helped || b.checked-a.checked);
    result.rate=result.total ? Math.round(result.study/result.total*100):null;
    result.average=result.days ? Math.round(result.lost/result.days):null;
    return result;
  }
  const api = { dateKey, shiftDate, minutes, blank, summarize, slotRange, availability, totals, duration: n => `${Math.floor(n/60)}시간 ${n%60}분` };
  if (typeof module !== 'undefined') module.exports = api;
  root.ReflectionState = api;
})(typeof window !== 'undefined' ? window : globalThis);
