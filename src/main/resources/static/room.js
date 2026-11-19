/* 내 박스들: 획득한 포켓몬 꺼내기/넣기, 별명, 인벤토리 패널, 박스 추가/삭제 */

let collection = [];   // /api/collection 결과
let biomes = [];       // /api/biomes

const displayName = owned => (owned && owned.nickname) || (owned && owned.pokemon.nameKo) || '';

function flash(msg) {
  const el = document.getElementById('flash');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(flash.t);
  flash.t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- 포켓몬 ---------- */
function monsterOf(pokemonId) {
  return monsters.find(m => m.data.id === pokemonId);
}

function spawnOwned(owned) {
  if (monsterOf(owned.pokemon.id)) return;
  const box = boxById(owned.boxId);
  if (!box) return;
  const m = new Monster(owned.pokemon, ...toWorld(box, owned.x ?? N / 2, owned.y ?? N / 2));
  m.owned = owned;
  m.label.textContent = displayName(owned);
  monsters.push(m);
  m.unstick();
}

function despawn(pokemonId) {
  const i = monsters.findIndex(m => m.data.id === pokemonId);
  if (i < 0) return;
  if (selected === monsters[i]) hideInfo();
  monsters[i].el.remove();
  monsters.splice(i, 1);
}

function updateOwned(updated) {
  const i = collection.findIndex(o => o.pokemon.id === updated.pokemon.id);
  if (i >= 0) collection[i] = updated;
  const m = monsterOf(updated.pokemon.id);
  if (m) {
    m.owned = updated;
    m.label.textContent = displayName(updated);
  }
}

/** 꺼내기 = 메인 박스 중앙(가까운 빈칸)에 나타남, 넣기 = 인벤토리(미배치) */
async function setPlaced(pokemonId, placed) {
  const updated = await api(`/api/collection/${pokemonId}`, { method: 'PATCH', body: { placed } });
  updateOwned(updated);
  if (placed) {
    spawnOwned(updated);
    focusBox(boxById(updated.boxId));
  } else {
    despawn(pokemonId);
  }
  renderBag();
  refreshEmpty();
}

async function rename(pokemonId) {
  const o = collection.find(x => x.pokemon.id === pokemonId);
  const input = prompt(`${o.pokemon.nameKo}의 별명 (최대 12자, 비우면 본래 이름)`, o.nickname || '');
  if (input === null) return;
  try {
    updateOwned(await api(`/api/collection/${pokemonId}`, { method: 'PATCH', body: { nickname: input } }));
    renderBag();
    const m = monsterOf(pokemonId);
    if (m && selected === m) showInfo(m);
  } catch (err) {
    alert(err.message);
  }
}

function refreshEmpty() {
  document.getElementById('empty-room').classList.toggle('hidden', monsters.length > 0);
}

/* ---------- 인벤토리 패널 ---------- */
let bagTab = 'mon';
const bagTabs = { mon: () => renderMonTab() };   // items.js 가 'item' 탭을 추가

function renderBag() {
  const stored = collection.filter(o => !o.placed).length;
  document.getElementById('bag-btn').textContent = `🎒 인벤토리`;
  document.querySelectorAll('#bag-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === bagTab));
  (bagTabs[bagTab] || bagTabs.mon)();
  return stored;
}

function renderMonTab() {
  const placed = collection.filter(o => o.placed).length;
  document.getElementById('bag-sub').textContent =
    `획득 ${collection.length}마리 · 박스에 ${placed}마리 · 인벤토리 ${collection.length - placed}마리`;
  const list = document.getElementById('bag-list');
  if (!collection.length) {
    list.innerHTML = '<div class="bag-empty">아직 획득한 포켓몬이 없어요.<br><a href="/game.html">카드 게임</a>에서 얻어 보세요!</div>';
    return;
  }
  // 인벤토리(미배치) 먼저
  const sorted = [...collection].sort((a, b) => a.placed - b.placed);
  list.innerHTML = sorted.map(o => {
    const box = o.placed && boxById(o.boxId);
    return `
    <div class="bag-item${o.placed ? ' placed' : ''}" data-id="${o.pokemon.id}">
      <img src="${o.pokemon.sprites.frontStatic || o.pokemon.sprites.frontAnimated}" alt="">
      <div class="who">
        <b>${escapeHtml(displayName(o))}</b>
        <small>${dexNo(o.pokemon.id)} ${o.nickname ? escapeHtml(o.pokemon.nameKo) : ''}
          ${box ? ` · ${box.emoji} ${escapeHtml(box.biomeName)}` : ' · 인벤토리'}</small>
      </div>
      <button class="btn small ghost" data-act="rename" title="별명">✎</button>
      ${o.placed ? '<button class="btn small ghost" data-act="find" title="어디 있는지 보기">👀</button>' : ''}
      <button class="btn small${o.placed ? ' ghost' : ''}" data-act="toggle">${o.placed ? '넣기' : '꺼내기'}</button>
    </div>`;
  }).join('');
}

function openBag(tab) {
  if (tab) bagTab = tab;
  renderBag();
  document.getElementById('bag').classList.remove('hidden');
}

/* ---------- 박스 추가 ---------- */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
let pick = { slot: null, biome: null };

/** 지금 보는 박스의 상하좌우 빈자리 */
function candidateSlots(box) {
  return DIRS.map(([dx, dy]) => [box.bx + dx, box.by + dy]).filter(([x, y]) => !boxAtGrid(x, y));
}

function biomeSwatch(id) {
  const st = styleOf(id);
  return `background: linear-gradient(135deg, ${st.top[0]} 0 55%, ${st.speck} 55% 62%, ${st.top[1]} 62% 80%, ${st.side[0]} 80%)`;
}

function openBoxModal() {
  const base = currentBox;
  const slots = candidateSlots(base);
  pick = { slot: slots[0] || null, biome: pick.biome || 'FOREST' };
  document.getElementById('box-modal-sub').textContent =
    `지금 보고 있는 ${base.emoji} ${base.biomeName} 박스 옆에 붙여요. 자리와 바이옴을 고르세요.`;
  renderMinimap(base, slots);
  renderBiomeList();
  updateBoxModal();
  document.getElementById('box-modal').classList.remove('hidden');
}

function renderMinimap(base, slots) {
  const xs = boxes.map(b => b.bx).concat(slots.map(s => s[0]));
  const ys = boxes.map(b => b.by).concat(slots.map(s => s[1]));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const map = document.getElementById('minimap');
  map.style.gridTemplateColumns = `repeat(${x1 - x0 + 1}, 52px)`;
  let html = '';
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const b = boxAtGrid(x, y);
      const slot = slots.some(s => s[0] === x && s[1] === y);
      if (b) {
        html += `<div class="mm-cell box${b === base ? ' base' : ''}" style="${biomeSwatch(b.biome)}" title="${escapeHtml(b.biomeName)}"><span>${b.emoji}</span></div>`;
      } else if (slot) {
        html += `<button class="mm-cell slot" data-x="${x}" data-y="${y}" title="여기에 추가"><span>＋</span></button>`;
      } else {
        html += '<div class="mm-cell"></div>';
      }
    }
  }
  map.innerHTML = html;
}

function renderBiomeList() {
  document.getElementById('biome-list').innerHTML = biomes.map(b => `
    <button class="biome-card" data-biome="${b.id}">
      <i style="${biomeSwatch(b.id)}"></i>
      <b>${b.emoji} ${escapeHtml(b.name)}</b>
      <small>${escapeHtml(b.description)}</small>
    </button>`).join('');
}

function updateBoxModal() {
  document.querySelectorAll('#minimap .slot').forEach(el =>
    el.classList.toggle('on', !!pick.slot && +el.dataset.x === pick.slot[0] && +el.dataset.y === pick.slot[1]));
  document.querySelectorAll('.biome-card').forEach(el => el.classList.toggle('on', el.dataset.biome === pick.biome));
  const ok = pick.slot && pick.biome;
  document.getElementById('box-create').disabled = !ok;
  document.getElementById('box-modal-msg').textContent = pick.slot ? '' : '이 박스 옆에는 빈자리가 없어요. 다른 박스로 화면을 옮겨 보세요.';
}

async function createBox() {
  const btn = document.getElementById('box-create');
  btn.disabled = true;
  try {
    const created = await api('/api/boxes', {
      method: 'POST', body: { bx: pick.slot[0], by: pick.slot[1], biome: pick.biome },
    });
    await loadWorld();
    document.getElementById('box-modal').classList.add('hidden');
    focusBox(boxById(created.id));
    flash(`${created.emoji} ${created.biomeName} 박스를 만들었어요`);
  } catch (err) {
    document.getElementById('box-modal-msg').textContent = err.message;
    btn.disabled = false;
  }
}

/* ---------- 박스 삭제 ---------- */
async function deleteCurrentBox() {
  const box = currentBox;
  if (!box || box.main) return;
  const nProps = props.filter(p => p.boxId === box.id).length;
  const nMons = collection.filter(o => o.placed && o.boxId === box.id).length;
  const nItems = placedItems.filter(i => i.boxId === box.id).length;
  const ok = confirm(`${box.emoji} ${box.biomeName} 박스를 지울까요?\n\n`
    + `· 소품 ${nProps}개는 함께 사라져요\n`
    + `· 포켓몬 ${nMons}마리와 아이템 ${nItems}개는 인벤토리로 돌아가요`);
  if (!ok) return;
  try {
    const r = await api(`/api/boxes/${box.id}`, { method: 'DELETE' });
    collection.filter(o => o.boxId === box.id).forEach(o => despawn(o.pokemon.id));
    collection = await api('/api/collection');
    if (typeof reloadItems === 'function') await reloadItems();
    await loadWorld();
    renderBag();
    refreshEmpty();
    flash(`박스를 지웠어요 · 포켓몬 ${r.pokemonReturned}마리, 아이템 ${r.itemsReturned}개를 인벤토리로`);
  } catch (err) {
    alert(err.message);
  }
}

function onCurrentBox(box) {
  const el = document.getElementById('cur-box');
  el.textContent = `${box.emoji} ${box.biomeName}${box.main ? ' (메인)' : ''}`;
  const del = document.getElementById('box-del-btn');
  del.disabled = box.main;
  del.title = box.main ? '메인 박스는 지울 수 없어요' : '지금 보는 박스 지우기';
}

/* ---------- 시작 (app.js main 에서 호출) ---------- */
async function initRoom() {
  renderNav('room', `
    <span class="cur-box" title="화면 가운데에 있는 박스">📍 <b id="cur-box"></b></span>
    <button class="btn ghost" id="box-add-btn">＋ 박스 추가</button>
    <button class="btn ghost" id="box-del-btn">🗑 박스 삭제</button>
    <button class="btn ghost" id="bag-btn">🎒 인벤토리</button>`);
  currentBoxListeners.push(onCurrentBox);
  if (currentBox) onCurrentBox(currentBox);

  document.getElementById('bag-btn').addEventListener('click', () => {
    const bag = document.getElementById('bag');
    if (bag.classList.contains('hidden')) openBag(); else bag.classList.add('hidden');
  });
  document.getElementById('bag-close').addEventListener('click', () =>
    document.getElementById('bag').classList.add('hidden'));
  document.getElementById('empty-open-bag').addEventListener('click', () => openBag('mon'));
  document.getElementById('bag-tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (b) { bagTab = b.dataset.tab; renderBag(); }
  });

  document.getElementById('bag-list').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn || !btn.closest('.bag-item[data-id]')) return;
    const id = +btn.closest('.bag-item').dataset.id;
    btn.disabled = true;
    try {
      const o = collection.find(x => x.pokemon.id === id);
      if (btn.dataset.act === 'toggle') await setPlaced(id, !o.placed);
      else if (btn.dataset.act === 'find') { const m = monsterOf(id); if (m.box) focusBox(m.box); showInfo(m); }
      else await rename(id);
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('info-rename').addEventListener('click', () => {
    if (selected) rename(selected.data.id);
  });
  document.getElementById('info-unplace').addEventListener('click', () => {
    if (selected) setPlaced(selected.data.id, false);
  });

  // 박스 추가 / 삭제
  document.getElementById('box-add-btn').addEventListener('click', openBoxModal);
  document.getElementById('box-del-btn').addEventListener('click', deleteCurrentBox);
  document.getElementById('box-modal-close').addEventListener('click', () =>
    document.getElementById('box-modal').classList.add('hidden'));
  document.getElementById('box-modal').addEventListener('click', e => {
    if (e.target.id === 'box-modal') e.target.classList.add('hidden');
    const slot = e.target.closest('.slot');
    if (slot) { pick.slot = [+slot.dataset.x, +slot.dataset.y]; updateBoxModal(); }
    const card = e.target.closest('.biome-card');
    if (card) { pick.biome = card.dataset.biome; updateBoxModal(); }
  });
  document.getElementById('box-create').addEventListener('click', createBox);

  try {
    [collection, biomes] = await Promise.all([api('/api/collection'), api('/api/biomes')]);
  } catch (err) {
    console.error('불러오기 실패', err);
  }
  collection.filter(o => o.placed).forEach(spawnOwned);
  renderBag();
  refreshEmpty();
}
