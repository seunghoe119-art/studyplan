function Reflection({store, setStore}) {
  const R = window.ReflectionState;
  const [date, setDate] = React.useState(R.dateKey);
  const [status, setStatus] = React.useState('');
  const day = {...R.blank(), ...store.reflections?.[date]};
  const totals = R.totals(day);
  const previous = store.reflections?.[R.shiftDate(date,-1)];
  const update = (patch, extra = {}) => {
    const next = {...store, ...extra, reflections: {...store.reflections, [date]: {...day, ...patch}}};
    const ok = window.FT.saveStore(next);
    setStore(next);
    setStatus(ok ? '자동 저장됨' : '저장하지 못했어요. 설정에서 데이터를 백업해주세요.');
  };
  const field = (key, label, placeholder) => <label className="rf-field">{label}<textarea rows="2" value={day[key]} placeholder={placeholder} onChange={e=>update({[key]:e.target.value, ...(['cue','action'].includes(key) ? {confirmed:false} : {})})}/></label>;
  const choices = (key, values) => <div className="rf-chips">{values.map(v=><button key={v} className="btn sm" aria-pressed={day[key]===v} onClick={()=>update({[key]:v, ...(key==='check' ? {helped:'',obstacle:''} : {})})}>{v}</button>)}</div>;
  const changeEvent = (id, patch) => update({events:day.events.map(e=>e.id===id?{...e,...patch}:e)});
  const recent = Array.from({length:7},(_,i)=>({date:R.shiftDate(date,-i), ...store.reflections?.[R.shiftDate(date,-i)]}));
  const counts = {};
  recent.forEach(d=>{if(d.reason) counts[d.reason]=(counts[d.reason]||0)+1;});
  const reasons = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const effective = recent.filter(d=>['했음','일부 했음'].includes(d.check) && d.helped==='도움 됐음' && store.reflections?.[R.shiftDate(d.date,-1)]?.confirmed);
  return <div className="view reflection-view">
    <div className="hero rf-hero"><span className="hero-kicker">하루 복기</span><h1>오늘을 이해하고,<br/>내일 하나만 바꾸기.</h1><p>공부할 수 있었던 시간부터 차분히 돌아봐요.</p>
      <div className="rf-date"><button className="navbtn" aria-label="이전 날짜" onClick={()=>{setDate(R.shiftDate(date,-1));setStatus('');}}><Icons.chev dir="left" size={16}/></button><label><span className="rf-sr">복기 날짜</span><input type="date" value={date} max={R.dateKey()} onChange={e=>{if(e.target.value && e.target.value<=R.dateKey()){setDate(e.target.value);setStatus('');}}}/></label><button className="navbtn" aria-label="다음 날짜" disabled={date>=R.dateKey()} onClick={()=>{setDate(R.shiftDate(date,1));setStatus('');}}><Icons.chev dir="right" size={16}/></button><button className="btn sm ghost" onClick={()=>setDate(R.dateKey())}>오늘</button></div>
    </div>
    <div className="rf-save" role="status">{status || '입력하면 이 기기에 자동 저장돼요'}</div>
    {previous?.confirmed && <section className="card rf-stack"><div className="section-label"><span>먼저, 어제의 약속</span><span className="badge good">실행 확인</span></div><div className="rf-promise"><small>{previous.cue}</small><strong>{previous.action}</strong></div>{choices('check',['했음','일부 했음','못 했음','해당 상황 없었음'])}{['했음','일부 했음'].includes(day.check) && <><p className="rf-hint">실제로 도움이 됐나요?</p>{choices('helped',['도움 됐음','별 차이 없었음'])}</>}{['일부 했음','못 했음'].includes(day.check) && field('obstacle','무엇이 막았나요?','예: 피곤해서 문제를 푸는 것부터 부담됐다. 아래 내일 행동을 더 작게 정해봐요.')}</section>}
    <section className="card rf-stack"><h2><span className="rf-step">01</span> 공부할 수 있었던 시간</h2><p className="rf-hint">식사·출근·약속은 빼고 시간대를 추가하세요. 자정을 넘으면 날짜를 나눠 입력해요.</p>
      {day.slots.map((s,i)=><div className="rf-slot" key={i}><input aria-label={`${i+1}번째 시작 시간`} type="time" value={s.start} onChange={e=>update({slots:day.slots.map((v,j)=>j===i?{...v,start:e.target.value}:v)})}/><span>—</span><input aria-label={`${i+1}번째 종료 시간`} type="time" value={s.end==='24:00'?'':s.end} onChange={e=>update({slots:day.slots.map((v,j)=>j===i?{...v,end:e.target.value}:v)})}/><button className="btn sm" aria-pressed={s.end==='24:00'} onClick={()=>update({slots:day.slots.map((v,j)=>j===i?{...v,end:'24:00'}:v)})}>자정</button><button className="icon-btn" aria-label={`${i+1}번째 시간대 삭제`} onClick={()=>update({slots:day.slots.filter((_,j)=>j!==i)})}><Icons.close size={14}/></button></div>)}
      <div className="rf-chips"><button className="btn sm" onClick={()=>update({slots:[...day.slots,{start:'',end:''}]})}>+ 시간대 추가</button><button className="btn sm ghost" disabled={!day.slots.length || totals.invalid || totals.overlap} onClick={()=>{update({}, {reflectionTemplate:day.slots.map(s=>({...s}))});}}>평소 시간표로 저장</button>{store.reflectionTemplate?.length>0 && <button className="btn sm ghost" onClick={()=>{if(!day.slots.length || confirm('현재 시간대를 평소 시간표로 바꿀까요?')) update({slots:store.reflectionTemplate.map(s=>({...s}))});}}>평소 시간표 불러오기</button>}</div>
      {totals.invalid && <p className="rf-error" role="alert">시작과 종료 시간을 확인해주세요. 종료는 시작보다 늦어야 해요.</p>}{totals.overlap && <p className="rf-error" role="alert">겹친 시간은 한 번만 계산했어요. 시간대를 정리해주세요.</p>}
      <div className="rf-total"><span>전체 공부 가능 시간</span><strong>{R.duration(totals.total)}</strong></div>
      <div className="rf-two">{[['study','실제 공부'],['rest','필요한 휴식']].map(([k,l])=><label className="rf-field" key={k}>{l}<div className="rf-unit"><input aria-label={l} type="number" min="0" max="1440" step="1" value={day[k]} placeholder="0" onChange={e=>update({[k]:e.target.value===''?'':R.minutes(e.target.value)})}/><span>분</span></div></label>)}</div>
      <div className="rf-bar" aria-label="공부 가능 시간 사용 비율">{[[totals.study,'var(--good)'],[totals.rest,'var(--phase-a)'],[totals.lost,'var(--accent)'],[Math.max(0,totals.remaining),'var(--bg-muted)']].map(([n,c],i)=><span key={i} style={{width:`${n/Math.max(1,totals.total,totals.study+totals.rest+totals.lost)*100}%`,background:c}}/>)}</div>
      <div className="rf-legend"><span>공부 {totals.study}분</span><span>휴식 {totals.rest}분</span><span>아쉬운 시간 {totals.lost}분</span><span>미분류 {Math.max(0,totals.remaining)}분</span></div>
      {totals.remaining<0 ? <p className="rf-error" role="alert">기록이 공부 가능 시간보다 {-totals.remaining}분 많아요. 중복된 시간이나 시간대를 확인해주세요.</p> : <p className="rf-hint">기억나지 않는 시간은 미분류로 남겨도 괜찮아요.</p>}
    </section>
    <section className="card rf-stack"><h2><span className="rf-step">02</span> 어디에서 시간이 새었나요?</h2><p className="rf-hint">공부 가능 시간 안에서 생긴 일만 기록해요. 식후 유튜브는 한 건으로 남겨요.</p><div className="rf-chips">{['유튜브','SNS·웹서핑','게임','식후 딴짓','멍때림','기타'].map(category=><button className="btn sm" key={category} onClick={()=>{const id=`${Date.now()}-${Math.random().toString(36).slice(2)}`; update({events:[...day.events,{id,category,minutes:15}],focusId:day.focusId||id});}}>+ {category}</button>)}</div>
      {!day.events.length && <div className="rf-empty">떠오르는 일이 있다면 하나만 추가해보세요.</div>}
      {day.events.map(e=><div className="rf-event" key={e.id}><div className="rf-event-head"><strong>{e.category}</strong><button className="btn sm ghost" onClick={()=>update({events:day.events.filter(v=>v.id!==e.id),focusId:day.focusId===e.id?'':day.focusId})}>삭제</button></div><div className="rf-chips">{[5,15,30].map(n=><button className="btn sm" key={n} aria-pressed={e.minutes===n} onClick={()=>changeEvent(e.id,{minutes:n})}>{n}분</button>)}<label className="rf-unit"><input aria-label={`${e.category} 시간(분)`} type="number" min="0" max="1440" value={e.minutes} onChange={v=>changeEvent(e.id,{minutes:v.target.value===''?'':R.minutes(v.target.value)})}/><span>분</span></label><button className="btn sm" aria-pressed={day.focusId===e.id} onClick={()=>update({focusId:e.id})}>{day.focusId===e.id?'복기할 장면 ✓':'이 장면 복기'}</button></div></div>)}
    </section>
    <section className="card rf-stack"><h2><span className="rf-step">03</span> 가장 아쉬운 장면 하나</h2><p className="rf-hint">{day.events.find(e=>e.id===day.focusId)?.category || '시간 기록이 없어도 기억나는 장면을 돌아볼 수 있어요.'}</p>{field('situation','어떤 상황이었나요?','예: 저녁을 먹고 소파에 앉아 영상을 켰다.')}<div className="rf-field">왜 시작했나요?{choices('reason',['피곤해서','공부가 막막해서','습관적으로','알림 때문에','기타'])}</div>{field('turning','어디서 끊을 수 있었나요?','예: 첫 영상이 끝났을 때 자동재생을 껐으면 됐다.')}{field('alternative','대신 할 수 있었던 작은 행동은?','예: 책상에서 오답 1개만 보기')}{field('win','오늘 잘된 선택 하나','예: 오전에는 폰을 다른 방에 두니 집중이 됐다.')}</section>
    <section className="card rf-stack"><h2><span className="rf-step">04</span> 내일 바꿀 행동 하나</h2><p className="rf-hint">언제, 무엇을 할지 정해요. 내일 이 탭에서 실행 여부를 확인할 수 있어요.</p>{field('cue','언제 할까요?','예: 저녁을 먹고 나면')}<button className="btn sm rf-draft" disabled={!day.alternative.trim()} onClick={()=>update({action:day.alternative,confirmed:false})}>복기에서 적은 대안 가져오기</button>{field('action','어떤 행동을 할까요?','예: 폰을 충전대에 두고 책상에서 오답 1개 보기')}<div className="rf-promise"><small>{day.cue || '내일 이 상황이 오면'}</small><strong>{day.action || '실행할 수 있는 작은 행동 하나'}</strong></div><button className="btn primary" disabled={!day.cue.trim() || !day.action.trim() || totals.invalid || totals.overlap || totals.remaining<0} onClick={()=>update({confirmed:true})}>{day.confirmed?'내일의 행동 확정됨 ✓':'내일의 행동 확정'}</button></section>
    <section className="card rf-stack"><h2>최근 7일, 나에게 맞는 방법</h2><p className="rf-hint">{R.shiftDate(date,-6)} — {date}</p>{reasons.length ? <div className="rf-chips">{reasons.map(([r,n])=><span className="badge weekday" key={r}>{r} · {n}일</span>)}</div>:<p className="rf-hint">복기가 쌓이면 자주 반복되는 이유가 보여요.</p>}{effective.length>0 ? effective.map(d=><div className="rf-promise" key={d.date}><small>{d.date} · 도움 됐던 행동</small><strong>{store.reflections[R.shiftDate(d.date,-1)].action}</strong></div>):<p className="rf-hint">전날 행동을 해보고 ‘도움 됐음’을 선택하면 여기에 모아드려요.</p>}</section>
  </div>;
}
window.Reflection = Reflection;
