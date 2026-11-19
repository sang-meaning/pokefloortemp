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

/* ---------- 타입 상성 (공격 타입 → 상대 타입) ---------- */
const TYPE_CHART = {
  '노말': { weak: ['바위', '강철'], immune: ['고스트'] },
  '불꽃': { super: ['풀', '얼음', '벌레', '강철'], weak: ['불꽃', '물', '바위', '드래곤'] },
  '물': { super: ['불꽃', '땅', '바위'], weak: ['물', '풀', '드래곤'] },
  '풀': { super: ['물', '땅', '바위'], weak: ['불꽃', '풀', '독', '비행', '벌레', '드래곤', '강철'] },
  '전기': { super: ['물', '비행'], weak: ['전기', '풀', '드래곤'], immune: ['땅'] },
  '얼음': { super: ['풀', '땅', '비행', '드래곤'], weak: ['불꽃', '물', '얼음', '강철'] },
  '격투': { super: ['노말', '얼음', '바위', '악', '강철'], weak: ['독', '비행', '에스퍼', '벌레', '페어리'], immune: ['고스트'] },
  '독': { super: ['풀', '페어리'], weak: ['독', '땅', '바위', '고스트'], immune: ['강철'] },
  '땅': { super: ['불꽃', '전기', '독', '바위', '강철'], weak: ['풀', '벌레'], immune: ['비행'] },
  '비행': { super: ['풀', '격투', '벌레'], weak: ['전기', '바위', '강철'] },
  '에스퍼': { super: ['격투', '독'], weak: ['에스퍼', '강철'], immune: ['악'] },
  '벌레': { super: ['풀', '에스퍼', '악'], weak: ['불꽃', '격투', '독', '비행', '고스트', '강철', '페어리'] },
  '바위': { super: ['불꽃', '얼음', '비행', '벌레'], weak: ['격투', '땅', '강철'] },
  '고스트': { super: ['에스퍼', '고스트'], weak: ['악'], immune: ['노말'] },
  '드래곤': { super: ['드래곤'], weak: ['강철'], immune: ['페어리'] },
  '악': { super: ['에스퍼', '고스트'], weak: ['격투', '악', '페어리'] },
  '강철': { super: ['얼음', '바위', '페어리'], weak: ['불꽃', '물', '전기', '강철'] },
  '페어리': { super: ['격투', '드래곤', '악'], weak: ['불꽃', '독', '강철'] },
};

/** 상성 배율 (게임용으로 완만하게: 굉장 1.5, 별로 0.75, 없음 0.5) */
function typeMultiplier(atkType, defTypes) {
  const c = TYPE_CHART[atkType] || {};
  let m = 1;
  (defTypes || []).forEach(t => {
    if (c.super?.includes(t)) m *= 1.5;
    else if (c.weak?.includes(t)) m *= 0.75;
    else if (c.immune?.includes(t)) m *= 0.5;
  });
  return Math.max(0.4, Math.min(2, m));
}

/** 별 0~3개 */
const starsHtml = (n, max = 3) =>
  `<span class="stars">${'★'.repeat(n)}<i>${'★'.repeat(Math.max(0, max - n))}</i></span>`;

/** 획득 정보에 맞는 그림 (이로치를 보이게 해 두었으면 이로치) */
function spritesOf(owned, pokemon = owned?.pokemon) {
  const s = pokemon.sprites;
  const shiny = owned ? owned.showShiny : false;
  return shiny
    ? { front: s.shinyAnimated, back: s.shinyBackAnimated, still: s.shinyStatic, art: s.shinyArtwork, shiny: true }
    : { front: s.frontAnimated || s.frontStatic, back: s.backAnimated, still: s.frontStatic, art: s.officialArtwork, shiny: false };
}

/** 상단 골드 표시 갱신 */
async function refreshGold(gold) {
  const el = document.getElementById('nav-gold');
  if (!el) return;
  if (gold === undefined) {
    try { gold = (await api('/api/wallet')).gold; } catch { return; }
  }
  el.textContent = `💰 ${Number(gold).toLocaleString()}`;
}

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

/** 상단 메뉴. page: 'room' | 'dungeon' | 'shop' | 'game' | 'dex' | 'admin' */
function renderNav(page, extraHtml = '') {
  const items = [
    ['room', '/', '🏝 내 박스'],
    ['dungeon', '/dungeon.html', '⚔ 오늘의 던전'],
    ['shop', '/shop.html', '🏪 상점'],
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
    <div class="nav-extra">${extraHtml}<span class="nav-gold" id="nav-gold" title="골드 (던전에서 벌고 상점에서 써요)">💰</span></div>
    <a href="/admin.html" class="nav-admin${page === 'admin' ? ' on' : ''}" title="관리자">⚙ 관리자</a>`;
  document.body.prepend(nav);
  refreshGold();
}
