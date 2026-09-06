// Numbers.jsx — 숫자 암기 시트

function Numbers({ store, setStore }) {
  const F = window.FT;
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [quizMode, setQuizMode] = React.useState(false);
  const [revealed, setRevealed] = React.useState({});
  const [form, setForm] = React.useState({
    value: '', unit: '', meaning: '', category: '', confuse: '', subject: 'fire',
  });

  const SUBJ_NAME = { fire: '화재', rescue: '구조', ems: '구급', common: '공통' };
  const SUBJ_COLOR = { fire: 'var(--fire)', rescue: 'var(--rescue)', ems: 'var(--ems)', common: 'var(--text-ter)' };

  const filters = [
    { key: 'all', label: '전체' },
    { key: 'fire', label: '화재' },
    { key: 'rescue', label: '구조' },
    { key: 'ems', label: '구급' },
    { key: 'fav', label: '⭐ 즐겨찾기' },
  ];

  const items = store.numbers
    .filter(n => {
      const matchQ = !q.trim() || (n.value + n.meaning + (n.confuse || '') + (n.category || '')).toLowerCase().includes(q.trim().toLowerCase());
      const matchF = filter === 'all' || (filter === 'fav' ? !!n.fav : n.subject === filter);
      return matchQ && matchF;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const groups = {};
  const order = [];
  items.forEach(n => {
    const key = (n.category && n.category.trim()) || SUBJ_NAME[n.subject] || '기타';
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(n);
  });

  const addNumber = (e) => {
    e.preventDefault();
    if (!form.value.trim() || !form.meaning.trim()) return;
    const newN = {
      id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6),
      value: form.value.trim(),
      unit: form.unit.trim(),
      meaning: form.meaning.trim(),
      category: form.category.trim(),
      confuse: form.confuse.trim(),
      subject: form.subject,
      fav: false,
      createdAt: Date.now(),
    };
    store.numbers.push(newN);
    F.saveStore(store);
    setStore({ ...store });
    setForm({ value: '', unit: '', meaning: '', category: '', confuse: '', subject: form.subject });
  };

  const toggleFav = (id) => {
    const n = store.numbers.find(x => x.id === id);
    if (n) { n.fav = !n.fav; F.saveStore(store); setStore({ ...store }); }
  };
  const deleteNumber = (id) => {
    if (!confirm('삭제하시겠어요?')) return;
    store.numbers = store.numbers.filter(x => x.id !== id);
    F.saveStore(store);
    setStore({ ...store });
  };
  const reveal = (id) => setRevealed(r => ({ ...r, [id]: !r[id] }));

  return (
    <div className="numbers-view">
      {/* 추가 폼 */}
      <div>
        <div className="section-label">
          <span>새 숫자 추가</span>
          <span className="sub">— 시험 포인트를 능동 회상 연습용으로</span>
        </div>
        <div className="card">
          <form className="numform" onSubmit={addNumber}>
            <input
              type="text" placeholder="숫자/값 (예: 130)" required
              value={form.value}
              onChange={e => setForm({ ...form, value: e.target.value })}
            />
            <input
              type="text" placeholder="단위 (예: L/min)"
              value={form.unit}
              onChange={e => setForm({ ...form, unit: e.target.value })}
            />
            <input
              type="text" className="full" placeholder="의미 (예: 옥내소화전 방수량)" required
              value={form.meaning}
              onChange={e => setForm({ ...form, meaning: e.target.value })}
            />
            <select
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
            >
              <option value="fire">화재</option>
              <option value="rescue">구조</option>
              <option value="ems">구급</option>
              <option value="common">공통</option>
            </select>
            <input
              type="text" placeholder="분류 (예: 소방시설)"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            />
            <input
              type="text" className="full" placeholder="헷갈리는 비슷한 숫자 (선택)"
              value={form.confuse}
              onChange={e => setForm({ ...form, confuse: e.target.value })}
            />
            <button type="submit" className="btn primary">추가</button>
          </form>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div>
        <div className="section-label">
          <span>총 {store.numbers.length}개</span>
          <span className="sub">보이는 항목 {items.length}개</span>
        </div>
        <div className="card">
          <div className="searchbar">
            <div className="input-wrap">
              <Icons.search size={16} />
              <input
                type="text" placeholder="숫자, 의미, 키워드 검색..."
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
            <button
              className={`btn sm ${quizMode ? 'primary' : ''}`}
              onClick={() => { setQuizMode(!quizMode); setRevealed({}); }}
            >
              {quizMode ? '퀴즈 해제' : '퀴즈 모드'}
            </button>
          </div>

          <div className="pillrow">
            {filters.map(f => (
              <button
                key={f.key}
                className={`pill ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {items.length === 0 && (
            <div className="empty-note">
              {store.numbers.length === 0
                ? '등록된 숫자가 없습니다. 위 폼으로 시험 포인트 숫자를 추가해보세요.'
                : '검색 결과가 없습니다.'}
            </div>
          )}

          {order.map(cat => (
            <div className="numgroup" key={cat}>
              <div className="ghead">
                <span>{cat}</span>
                <span className="gcount">{groups[cat].length}</span>
              </div>
              <div className="glist">
                {groups[cat].map(n => {
                  const isRev = revealed[n.id];
                  return (
                    <div
                      key={n.id}
                      className={`numrow${quizMode ? ' quiz-mode' : ''}${isRev ? ' revealed' : ''}`}
                      onClick={() => quizMode && reveal(n.id)}
                    >
                      <div className="nbar" style={{ background: SUBJ_COLOR[n.subject] }} />
                      <button
                        className={`nstar ${n.fav ? 'on' : ''}`}
                        onClick={e => { e.stopPropagation(); toggleFav(n.id); }}
                        title="즐겨찾기"
                      >{n.fav ? '★' : '☆'}</button>
                      <div className="nbody">
                        <div className="meaning">{n.meaning}</div>
                        {n.confuse && (
                          <div className="confuse">
                            <Icons.warn size={11} /> {n.confuse}
                          </div>
                        )}
                      </div>
                      <div className="value">
                        <span>{n.value}</span>
                        {n.unit && <span className="u">{n.unit}</span>}
                      </div>
                      <button
                        className="ndel"
                        onClick={e => { e.stopPropagation(); deleteNumber(n.id); }}
                        title="삭제"
                      >
                        <Icons.close size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.Numbers = Numbers;
