const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../app/reflection-state.js');
test('availability merges overlapping slots without double counting',()=>{
 assert.deepEqual(R.availability([{start:'09:00',end:'12:00'},{start:'11:00',end:'14:00'},{start:'20:00',end:'22:00'}]),{total:420,invalid:false,overlap:true});
});
test('invalid and overnight slots require correction; midnight is supported',()=>{
 assert.equal(R.availability([{start:'22:00',end:'01:00'}]).invalid,true);
 assert.equal(R.availability([{start:'22:00',end:'24:00'}]).total,120);
 assert.equal(R.availability([{start:'',end:''}]).invalid,true);
});
test('unclassified time is independent of timer and over-allocation is visible',()=>{
 const d={...R.blank(),slots:[{start:'09:00',end:'12:00'}],study:100,rest:20,events:[{minutes:30}]};
 assert.equal(R.totals(d).remaining,30);
 assert.equal(R.totals({...d,study:180}).remaining,-50);
});
test('calendar day moves across month and year boundaries',()=>{
 assert.equal(R.shiftDate('2026-01-01',-1),'2025-12-31');
 assert.equal(R.shiftDate('2024-02-28',1),'2024-02-29');
});
test('summary excludes incomplete days and computes weighted study share',()=>{
 const day={...R.blank(),slots:[{start:'09:00',end:'11:00'}],study:60,rest:30,events:[{category:'유튜브',minutes:10}]};
 const records={'2026-09-01':day,'2026-09-02':{...day,study:''},'2026-09-03':{...day,study:90,rest:10},'2026-08-01':day};
 const s=R.summarize(records,'2026-09-07',7);
 assert.equal(s.days,2);assert.equal(s.excluded,1);assert.equal(s.rate,63);assert.equal(s.average,10);assert.equal(s.remaining,30);
});
test('action outcomes join previous day and ignore non-applicable checks',()=>{
 const records={'2026-09-01':{confirmed:true,cue:'식후',action:'책 펴기'},'2026-09-02':{check:'했음',helped:'도움 됐음',confirmed:true,cue:'식후',action:'책 펴기'},'2026-09-03':{check:'해당 상황 없었음',helped:'도움 됐음'}};
 const s=R.summarize(records,'2026-09-07',7);
 assert.equal(s.actions[0].checked,1);assert.equal(s.actions[0].helped,1);
 assert.equal(R.summarize({},'2026-09-07').rate,null);
});
