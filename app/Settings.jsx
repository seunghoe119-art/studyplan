// Settings.jsx — 설정 모달

function SettingsModal({ open, onClose, store, setStore }) {
  const F = window.FT;
  const [backupText, setBackupText] = React.useState('');

  if (!open) return null;

  const setTheme = (theme) => {
    store.theme = theme;
    F.saveStore(store);
    applyTheme(theme);
    setStore({ ...store });
  };
  const setAccent = (accent) => {
    store.accent = accent;
    F.saveStore(store);
    applyAccent(accent);
    setStore({ ...store });
  };

  const exportData = () => {
    setBackupText(JSON.stringify(store, null, 2));
  };
  const importData = () => {
    try {
      const parsed = JSON.parse(backupText);
      const merged = Object.assign(F.defaultStore(), parsed);
      Object.assign(store, merged);
      F.saveStore(store);
      applyTheme(store.theme);
      applyAccent(store.accent);
      setStore({ ...store });
      alert('가져오기 완료!');
    } catch (e) {
      alert('JSON 형식을 확인해주세요.');
    }
  };

  const themes = [
    { key: 'light', label: '라이트' },
    { key: 'dark', label: '다크' },
    { key: 'system', label: '시스템' },
  ];
  const accents = [
    { key: 'fire',   color: '#E63946', label: '소방' },
    { key: 'ember',  color: '#B8232E', label: 'Ember' },
    { key: 'cobalt', color: '#3D5AFE', label: 'Cobalt' },
  ];

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>설정</h2>
          <button className="icon-btn" onClick={onClose}><Icons.close /></button>
        </div>

        <div className="settings-section">
          <div className="label">테마</div>
          <div className="seg-group">
            {themes.map(t => (
              <button
                key={t.key}
                className={store.theme === t.key ? 'active' : ''}
                onClick={() => setTheme(t.key)}
              >{t.label}</button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="label">액센트 컬러</div>
          <div className="swatches">
            {accents.map(a => (
              <div
                key={a.key}
                className={`swatch ${store.accent === a.key ? 'active' : ''}`}
                onClick={() => setAccent(a.key)}
                title={a.label}
              >
                <div className="sw-color" style={{ background: a.color }} />
                <span className="sw-label">{a.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-section" style={{ marginTop: 32 }}>
          <div className="label">데이터 백업 (이 브라우저 localStorage)</div>
          <textarea
            className="backup-area"
            placeholder="'내보내기'를 누르면 전체 데이터가 표시됩니다. 복원하려면 JSON을 붙여넣고 '가져오기'."
            value={backupText}
            onChange={e => setBackupText(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn sm" onClick={exportData}>내보내기</button>
            <button className="btn sm" onClick={importData}>가져오기</button>
            <button
              className="btn sm ghost"
              onClick={() => {
                if (confirm('모든 학습 기록을 초기화합니다. 계속?')) {
                  const fresh = F.defaultStore();
                  Object.keys(store).forEach(k => delete store[k]);
                  Object.assign(store, fresh);
                  F.saveStore(store);
                  applyTheme(store.theme);
                  applyAccent(store.accent);
                  setStore({ ...store });
                }
              }}
              style={{ marginLeft: 'auto', color: 'var(--bad)' }}
            >초기화</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 테마/액센트 적용 유틸 (전역)
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}
function applyAccent(accent) {
  const root = document.documentElement;
  if (accent && accent !== 'fire') root.setAttribute('data-accent', accent);
  else root.removeAttribute('data-accent');
}

window.SettingsModal = SettingsModal;
window.applyTheme = applyTheme;
window.applyAccent = applyAccent;
