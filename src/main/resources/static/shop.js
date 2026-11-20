/* 상점: 골드로 몬스터볼·상처약·X아이템·이상한사탕 사기, 이상한사탕 먹이기 */
renderNav('shop');

const GROUPS = [
  { title: '몬스터볼', sub: '보스를 쓰러뜨린 뒤 던져요. 상황에 맞는 볼은 85%! (전설은 마스터볼 빼고 ×0.7)', uses: ['BALL'] },
  { title: '회복', sub: '던전에 가지고 들어가 1~3 키로 사용, 기력의조각은 쓰러지면 자동 (안 쓰면 돌려받아요)', uses: ['HEAL', 'REVIVE'] },
  { title: '전투 도구', sub: '가지고 들어가면 그 판 동안 효과 (종류별 1개)', uses: ['BUFF_ATTACK', 'BUFF_SPEED', 'BUFF_DEFENSE', 'BUFF_CRIT', 'BUFF_EXP', 'BUFF_GOLD'] },
  { title: '성장', sub: '베이스캠프의 포켓몬에게 먹여요', uses: ['CANDY'] },
];
let shop = null;

async function load() {
  shop = await api('/api/shop');
  render();
}

function render() {
  document.getElementById('wallet').textContent = `💰 ${shop.gold.toLocaleString()}`;
  refreshGold(shop.gold);
  document.getElementById('sections').innerHTML = GROUPS.map(g => {
    const list = shop.entries.filter(e => g.uses.includes(e.use));
    return `<section class="shop-sec">
      <h2>${g.title} <small>${g.sub}</small></h2>
      <div class="shop-grid">${list.map(card).join('')}</div>
    </section>`;
  }).join('');
}

function card(e) {
  if (!e.item) return `<div class="shop-card off"><b>${e.code}</b><small>아이템 목록을 받는 중…</small></div>`;
  const can1 = shop.gold >= e.price, can5 = shop.gold >= e.price * 5;
  const badge = e.use === 'BALL' ? `<em class="rate">${e.value}%</em>` : '';
  return `<div class="shop-card${e.deal ? ' deal' : ''}" data-code="${e.code}">
    ${e.deal ? '<span class="deal-tag">오늘의 특가 -30%</span>' : ''}
    ${badge}
    <img src="${e.item.sprite}" alt="">
    <b>${escapeHtml(e.item.nameKo)}</b>
    <small>${escapeHtml(e.desc)}</small>
    <div class="own">보유 ${e.qty}</div>
    <div class="price">${e.deal ? `<s>${e.basePrice.toLocaleString()}</s> ` : ''}💰 ${e.price.toLocaleString()}</div>
    <div class="buy">
      <button class="btn small" data-q="1" ${can1 ? '' : 'disabled'}>사기</button>
      <button class="btn small ghost" data-q="5" ${can5 ? '' : 'disabled'}>×5</button>
      ${e.use === 'CANDY' && e.qty > 0 ? '<button class="btn small ghost" data-use="1">먹이기</button>' : ''}
    </div>
  </div>`;
}

document.getElementById('sections').addEventListener('click', async e => {
  const card = e.target.closest('.shop-card');
  if (!card) return;
  const code = card.dataset.code;
  if (e.target.dataset.use) { openCandy(code); return; }
  const q = e.target.closest('button[data-q]');
  if (!q) return;
  q.disabled = true;
  try {
    shop = await api('/api/shop/buy', { method: 'POST', body: { code, qty: +q.dataset.q } });
    SFX.play('coin');
    msg(`${shop.entries.find(x => x.code === code).item.nameKo} ×${q.dataset.q} 구입!`);
    render();
    const c = document.querySelector(`.shop-card[data-code="${code}"]`);
    c?.classList.add('bought');
  } catch (err) {
    msg(err.message, true);
    q.disabled = false;
  }
});

function msg(text, bad) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = `shop-msg show${bad ? ' bad' : ''}`;
  clearTimeout(msg.t);
  msg.t = setTimeout(() => { el.className = 'shop-msg'; }, 1800);
}

async function openCandy(code) {
  const list = (await api('/api/collection')).filter(o => o.nextLevelExp);
  document.getElementById('candy-list').innerHTML = list.length ? list.map(o => {
    const pct = lvPct(o);
    return `<button class="candy-mon" data-id="${o.pokemon.id}">
      <img src="${spritesOf(o).still || spritesOf(o).front}" alt="">
      <b>${escapeHtml(o.nickname || o.pokemon.nameKo)}</b>${lvHtml(o)}
      <i class="bar"><i style="width:${pct}%"></i></i>
    </button>`;
  }).join('') : '<p class="sub">먹일 수 있는 포켓몬이 없어요</p>';
  document.getElementById('candy').classList.remove('hidden');
  document.getElementById('candy').dataset.code = code;
}
document.getElementById('candy-close').onclick = () => document.getElementById('candy').classList.add('hidden');
document.getElementById('candy-list').addEventListener('click', async e => {
  const b = e.target.closest('.candy-mon');
  if (!b) return;
  try {
    const o = await api(`/api/collection/${b.dataset.id}/use-item`, { method: 'POST', body: { code: document.getElementById('candy').dataset.code } });
    SFX.play('starup');
    msg(`${o.nickname || o.pokemon.nameKo} 레벨 업! Lv.${o.level}`);
    document.getElementById('candy').classList.add('hidden');
    load();
  } catch (err) {
    msg(err.message, true);
  }
});

load();
