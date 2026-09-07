// Persistent countdown state. All times are milliseconds, independent of JS ticks.
(function (root) {
  function fresh(day) {
    return { phaseIdx: 0, remainingMs: (day.phases[0]?.minutes || 0) * 60000,
      running: false, anchor: null, history: [], completed: false };
  }
  function advance(saved, day, now) {
    const s = saved ? { ...saved, history: [...saved.history] } : fresh(day);
    if (!s.running || s.completed) return s;
    let elapsed = Math.max(0, now - s.anchor);
    s.anchor = Math.max(s.anchor, now);
    while (s.phaseIdx < day.phases.length && elapsed >= s.remainingMs) {
      elapsed -= s.remainingMs;
      const phase = day.phases[s.phaseIdx];
      s.history.push({ phase: phase.label, plannedSec: phase.minutes * 60, actualSec: phase.minutes * 60 });
      s.phaseIdx++;
      s.remainingMs = (day.phases[s.phaseIdx]?.minutes || 0) * 60000;
    }
    if (s.phaseIdx === day.phases.length) {
      s.completed = true;
      s.running = false;
      s.anchor = null;
    } else s.remainingMs -= elapsed;
    return s;
  }
  function action(saved, day, now, type) {
    let s = advance(saved, day, now);
    if (type === 'reset') return fresh(day);
    if (!day.phases.length || s.completed) return s;
    if (type === 'toggle') {
      s.running = !s.running;
      s.anchor = s.running ? now : null;
    }
    if (type === 'skip') {
      const phase = day.phases[s.phaseIdx];
      s.history.push({ phase: phase.label, plannedSec: phase.minutes * 60,
        actualSec: Math.max(0, phase.minutes * 60 - s.remainingMs / 1000) });
      s.phaseIdx++;
      s.remainingMs = (day.phases[s.phaseIdx]?.minutes || 0) * 60000;
      if (s.phaseIdx === day.phases.length) {
        s.completed = true; s.running = false; s.anchor = null;
      }
    }
    return s;
  }
  root.TimerState = { fresh, advance, action };
})(typeof window === 'undefined' ? globalThis : window);
