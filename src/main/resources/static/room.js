/* 내 방: 획득한 포켓몬 꺼내기/넣기, 별명, 가방 패널 */

let collection = [];   // /api/collection 결과

const displayName = owned => (owned && owned.nickname) || (owned && owned.pokemon.nameKo) || '';

function monsterOf(pokemonId) {
  return monsters.find(m => m.data.id === pokemonId);
}

function spawnOwned(owned) {
  if (monsterOf(owned.pokemon.id)) return;
  const m = new Monster(owned.pokemon, ...randomFreeTile());
  m.owned = owned;
  m.label.textContent = displayName(owned);
  monsters.push(m);
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

async function setPlaced(pokemonId, placed) {
  const updated = await api(`/api/collection/${pokemonId}`, { method: 'PATCH', body: { placed } });
  updateOwned(updated);
  if (placed) spawnOwned(updated); else despawn(pokemonId);
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

/* ---------- 가방 패널 ---------- */
function renderBag() {
  const placed = collection.filter(o => o.placed).length;
  document.getElementById('bag-sub').textContent =
    `획득 ${collection.length}마리 · 방에 ${placed}마리`;
  document.getElementById('bag-btn').textContent = `🎒 내 포켓몬 ${collection.length}`;
  const list = document.getElementById('bag-list');
  if (!collection.length) {
    list.innerHTML = '<div class="bag-empty">아직 획득한 포켓몬이 없어요.<br><a href="/game.html">카드 게임</a>에서 얻어 보세요!</div>';
    return;
  }
  list.innerHTML = collection.map(o => `
    <div class="bag-item${o.placed ? ' placed' : ''}" data-id="${o.pokemon.id}">
      <img src="${o.pokemon.sprites.frontStatic || o.pokemon.sprites.frontAnimated}" alt="">
      <div class="who">
        <b>${escapeHtml(displayName(o))}</b>
        <small>${dexNo(o.pokemon.id)} ${o.nickname ? escapeHtml(o.pokemon.nameKo) : ''}</small>
      </div>
      <button class="btn small ghost" data-act="rename" title="별명">✎</button>
      <button class="btn small${o.placed ? ' ghost' : ''}" data-act="toggle">${o.placed ? '넣기' : '꺼내기'}</button>
    </div>`).join('');
}

function openBag() { document.getElementById('bag').classList.remove('hidden'); }

/* ---------- 시작 (app.js main 에서 호출) ---------- */
async function initRoom() {
  renderNav('room', '<button class="btn ghost" id="bag-btn">🎒 내 포켓몬</button>');
  document.getElementById('bag-btn').addEventListener('click', () =>
    document.getElementById('bag').classList.toggle('hidden'));
  document.getElementById('bag-close').addEventListener('click', () =>
    document.getElementById('bag').classList.add('hidden'));
  document.getElementById('empty-open-bag').addEventListener('click', openBag);

  document.getElementById('bag-list').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = +btn.closest('.bag-item').dataset.id;
    btn.disabled = true;
    try {
      if (btn.dataset.act === 'toggle') {
        const o = collection.find(x => x.pokemon.id === id);
        await setPlaced(id, !o.placed);
      } else {
        await rename(id);
      }
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

  try {
    collection = await api('/api/collection');
  } catch (err) {
    console.error('획득 목록 불러오기 실패', err);
    collection = [];
  }
  collection.filter(o => o.placed).forEach(spawnOwned);
  renderBag();
  refreshEmpty();
}
