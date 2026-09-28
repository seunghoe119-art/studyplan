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
