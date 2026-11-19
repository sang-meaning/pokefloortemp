/* 모든 페이지 공통: 상단 메뉴, API 호출, 타입 색 */

const TYPE_COLORS = {
  '노말': '#9fa19f', '불꽃': '#e62829', '물': '#2980ef', '풀': '#3fa129', '전기': '#d8b400',
  '얼음': '#3dcef3', '격투': '#ff8000', '독': '#9141cb', '땅': '#915121', '비행': '#81b9ef',
  '에스퍼': '#ef4179', '벌레': '#91a119', '바위': '#afa981', '고스트': '#704170',
  '드래곤': '#5060e1', '악': '#624d4e', '강철': '#60a1b8', '페어리': '#ef70ef',
};

const typeChips = types => (types || [])
  .map(t => `<span class="type-chip" style="background:${TYPE_COLORS[t] || '#888'}">${t}</span>`).join('');

const dexNo = id => `No.${String(id).padStart(4, '0')}`;

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** fetch + JSON. 실패하면 서버 메시지를 담아 throw */
async function api(url, options = {}) {
  const opts = { ...options };
  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
    opts.headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  }
  const res = await fetch(url, opts);
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.message || data.detail || data.error)) || `${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/** 상단 메뉴. page: 'room' | 'game' | 'dex' | 'admin' */
function renderNav(page, extraHtml = '') {
  const items = [
    ['room', '/', '🏝 내 박스'],
    ['game', '/game.html', '🃏 카드 게임'],
    ['dex', '/dex.html', '📖 도감'],
  ];
  const links = items.map(([key, href, label]) =>
    `<a href="${href}" class="nav-link${key === page ? ' on' : ''}">${label}</a>`).join('');
  const nav = document.createElement('header');
  nav.className = 'topbar';
  nav.innerHTML = `
    <a href="/" class="brand">PokeFloor</a>
    <nav class="nav">${links}</nav>
    <div class="nav-extra">${extraHtml}</div>
    <a href="/admin.html" class="nav-admin${page === 'admin' ? ' on' : ''}" title="관리자">⚙ 관리자</a>`;
  document.body.prepend(nav);
}
