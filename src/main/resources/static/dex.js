/* 도감: 전체 포켓몬 중 획득한 것만 보이고, 나머지는 그림자 */
renderNav('dex');

let allPokemon = [];
let ownedMap = new Map();   // pokemonId → 획득 정보
let filter = 'all';

async function load() {
  const [pokemon, owned] = await Promise.all([api('/api/pokemon'), api('/api/collection')]);
  allPokemon = pokemon;
  ownedMap = new Map(owned.map(o => [o.pokemon.id, o]));
  render();
}

function render() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const ownedCount = allPokemon.filter(p => ownedMap.has(p.id)).length;
  document.getElementById('owned-count').textContent = ownedCount;
  document.getElementById('total-count').textContent = allPokemon.length;
  document.getElementById('dex-bar').style.width =
    `${allPokemon.length ? ownedCount / allPokemon.length * 100 : 0}%`;

  const shown = allPokemon.filter(p => {
    const o = ownedMap.get(p.id);
    if (filter === 'owned' && !o) return false;
    if (filter === 'missing' && o) return false;
    if (!q) return true;
    if (String(p.id) === q || dexNo(p.id).toLowerCase().includes(q)) return true;
    // 이름은 획득한 포켓몬만 검색 (미획득은 정체를 숨김)
    return !!o && (p.nameKo.includes(q) || (o.nickname || '').toLowerCase().includes(q));
  });

  document.getElementById('dex').innerHTML = shown.map(p => {
    const o = ownedMap.get(p.id);
    const img = p.sprites.frontStatic || p.sprites.frontAnimated;
    return `
      <div class="card ${o ? 'owned' : 'missing'}" data-id="${p.id}">
        ${o && o.placed ? '<span class="placed-tag">박스에 있음</span>' : ''}
        <img class="sprite" src="${img}" alt="" loading="lazy">
        <div class="no">${dexNo(p.id)}</div>
        <div class="name">${o ? escapeHtml(p.nameKo) : '???'}</div>
        <div class="nick">${o && o.nickname ? '“' + escapeHtml(o.nickname) + '”' : ''}</div>
        <div class="types">${o ? typeChips(p.typesKo) : ''}</div>
      </div>`;
  }).join('') || '<p class="msg">해당하는 포켓몬이 없어요.</p>';
}

function openDetail(id) {
  const p = allPokemon.find(x => x.id === id);
  const o = ownedMap.get(id);
  const box = document.getElementById('detail-box');
  const art = p.sprites.officialArtwork || p.sprites.home || p.sprites.frontStatic;

  if (!o) {
    box.innerHTML = `
      <button class="close" data-close>×</button>
      <img class="detail-img shadow" src="${art}" alt="">
      <div class="detail-no">${dexNo(p.id)}</div>
      <div class="detail-name">???</div>
      <p class="detail-real">아직 만나지 못한 포켓몬이에요.</p>
      <div class="detail-actions"><a class="btn" href="/game.html">🃏 카드 게임 하러 가기</a></div>`;
  } else {
    const date = new Date(o.obtainedAt).toLocaleString('ko-KR');
    box.innerHTML = `
      <button class="close" data-close>×</button>
      <img class="detail-img" src="${art}" alt="">
      <div class="detail-no">${dexNo(p.id)} · ${escapeHtml(p.genusKo)}</div>
      <div class="detail-name">${escapeHtml(o.nickname || p.nameKo)}</div>
      ${o.nickname ? `<div class="detail-real">본래 이름 ${escapeHtml(p.nameKo)}</div>` : ''}
      <div class="detail-types">${typeChips(p.typesKo)}</div>
      <div class="detail-stats"><span>키 ${p.heightM} m</span><span>몸무게 ${p.weightKg} kg</span></div>
      <p class="detail-flavor">${escapeHtml(p.flavorTextKo)}</p>
      <div class="nick-row">
        <input type="text" id="nick-input" maxlength="12" placeholder="별명 (비우면 본래 이름)" value="${escapeHtml(o.nickname || '')}">
        <button class="btn small" id="nick-save">별명 저장</button>
      </div>
      <div class="detail-actions">
        <button class="btn${o.placed ? ' ghost' : ''}" id="toggle-place">${o.placed ? '인벤토리에 넣기' : '메인 박스에 꺼내기'}</button>
        <a class="btn ghost" href="/">🏝 내 박스 보기</a>
      </div>
      <div class="detail-meta">획득 ${date}</div>`;
    box.querySelector('#nick-save').onclick = async () => {
      try {
        const updated = await api(`/api/collection/${id}`, {
          method: 'PATCH', body: { nickname: box.querySelector('#nick-input').value },
        });
        ownedMap.set(id, updated);
        render();
        openDetail(id);
      } catch (err) { alert(err.message); }
    };
    box.querySelector('#toggle-place').onclick = async () => {
      const updated = await api(`/api/collection/${id}`, { method: 'PATCH', body: { placed: !o.placed } });
      ownedMap.set(id, updated);
      render();
      openDetail(id);
    };
  }
  document.getElementById('detail').classList.remove('hidden');
}

document.getElementById('dex').addEventListener('click', e => {
  const card = e.target.closest('.card');
  if (card) openDetail(+card.dataset.id);
});
document.getElementById('detail').addEventListener('click', e => {
  if (e.target.id === 'detail' || e.target.hasAttribute('data-close')) {
    document.getElementById('detail').classList.add('hidden');
  }
});
document.getElementById('filter').addEventListener('click', e => {
  const b = e.target.closest('button[data-f]');
  if (!b) return;
  filter = b.dataset.f;
  document.querySelectorAll('#filter button').forEach(x => x.classList.toggle('on', x === b));
  render();
});
document.getElementById('search').addEventListener('input', render);

load();
