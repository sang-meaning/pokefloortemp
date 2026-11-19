/* 아이템·배지: 인벤토리 탭, 박스에 놓기(꾸미기 모드의 '아이템' 탭), 회수
 * 아직 얻는 방법은 없어서 관리자 페이지에서 지급 */

let stacks = [];            // [{item, qty, placed}]
const ITEM_SCALE = 2;       // 30px 아이템 그림 → 60px
const BADGE_PX = 34;        // 배지 그림(85px)을 도트 느낌으로 줄여서 표시

const itemById = id => stacks.find(s => s.item.id === id)?.item;
const itemSize = item => item.kind === 'BADGE' ? BADGE_PX : 30 * ITEM_SCALE;

placedItems = [];
renderPlacedItem = p => {
  const item = itemById(p.itemId);
  const w = propWorld(p);
  if (!item || !w) return;
  if (!p.el) {
    p.el = document.createElement('div');
    p.el.className = 'entity item-ent';
    p.el.innerHTML = '<img alt="" draggable="false"><i class="item-shadow"></i>';
    entitiesEl.appendChild(p.el);
  }
  const img = p.el.firstChild;
  if (img.getAttribute('src') !== item.sprite) img.src = item.sprite;
  img.alt = item.nameKo;
  img.title = item.nameKo;
  img.classList.toggle('badge', item.kind === 'BADGE');
  img.style.width = img.style.height = `${itemSize(item)}px`;
  placeEntity(p.el, w[0] + 0.5, w[1] + 0.5);
};

async function reloadItems() {
  const inv = await api('/api/inventory');
  placedItems.forEach(p => p.el?.remove());
  stacks = inv.items;
  placedItems = inv.placed;
  placedItems.forEach(renderPlacedItem);
  placedItems.forEach(p => attachEditHandlers('item', p));
  rebuildBlocked();
}

function stackOf(itemId) { return stacks.find(s => s.item.id === itemId); }

/* ---------- 꾸미기 모드 연결 ---------- */
editKinds.item = {
  list: () => placedItems,
  name: o => itemById(o.itemId)?.nameKo || '아이템',
  render: o => renderPlacedItem(o),
  create: async (tool, boxId, x, y) => {
    const created = await api('/api/placed-items', { method: 'POST', body: { itemId: tool.itemId, boxId, x, y } });
    placedItems.push(created);
    const s = stackOf(tool.itemId);
    s.qty--; s.placed++;
    if (s.qty <= 0) setTool(null);
    return created;
  },
  move: (o, boxId, x, y) => api(`/api/placed-items/${o.id}`, { method: 'PATCH', body: { boxId, x, y } }),
  remove: async o => {
    await api(`/api/placed-items/${o.id}`, { method: 'DELETE' });
    placedItems.splice(placedItems.indexOf(o), 1);
    const s = stackOf(o.itemId);
    s.qty++; s.placed--;
    renderBag();
  },
  removeLabel: '↩ 인벤토리로',
};

paletteTabs.item = { label: '내 아이템', render: renderItemPalette };
toolFactories.item = el => {
  const item = itemById(+el.dataset.id);
  const size = itemSize(item);
  return { kind: 'item', itemId: item.id, src: item.sprite, w: size, h: size, name: item.nameKo };
};

function renderItemPalette() {
  const have = stacks.filter(s => s.qty > 0 || s.placed > 0);
  document.getElementById('palette-sub').textContent = have.length
    ? '인벤토리의 몬스터볼·배지 등을 박스에 놓아요. 놓인 것을 선택해 "인벤토리로"를 누르면 돌아와요.'
    : '아직 가진 아이템이 없어요. (지금은 관리자 페이지에서 지급할 수 있어요)';
  document.getElementById('palette-list').innerHTML = have.map(s => `
    <button class="pal-item" data-kind="item" data-id="${s.item.id}" ${s.qty > 0 ? '' : 'disabled'} title="${escapeHtml(s.item.nameKo)}">
      <em>×${s.qty}</em>
      <img src="${s.item.sprite}" alt="" class="${s.item.kind === 'BADGE' ? 'badge' : ''}" style="width:${s.item.kind === 'BADGE' ? 34 : 60}px;height:${s.item.kind === 'BADGE' ? 34 : 60}px">
      <span>${escapeHtml(s.item.nameKo)}</span>
    </button>`).join('');
  if (ed.tool) setTool(ed.tool);
}

/* ---------- 인벤토리 '아이템' 탭 ---------- */
function renderItemTab() {
  const have = stacks.filter(s => s.qty > 0 || s.placed > 0);
  const total = have.reduce((n, s) => n + s.qty, 0);
  const onBoard = have.reduce((n, s) => n + s.placed, 0);
  document.getElementById('bag-sub').textContent = `인벤토리 ${total}개 · 박스에 놓인 것 ${onBoard}개`;
  const list = document.getElementById('bag-list');
  if (!have.length) {
    list.innerHTML = '<div class="bag-empty">아직 아이템이 없어요.<br>몬스터볼·배지 등은 나중에 얻을 수 있어요.<br><small>(지금은 <a href="/admin.html#items">관리자</a>에서 지급)</small></div>';
    return;
  }
  let lastKind = null;
  list.innerHTML = have.map(s => {
    const head = s.item.kind !== lastKind ? `<div class="bag-group">${escapeHtml(s.item.kindName)}</div>` : '';
    lastKind = s.item.kind;
    return `${head}
      <div class="bag-item item-row${s.qty ? '' : ' placed'}" data-item="${s.item.id}">
        <img src="${s.item.sprite}" alt="" class="${s.item.kind === 'BADGE' ? 'badge' : ''}">
        <div class="who">
          <b>${escapeHtml(s.item.nameKo)}</b>
          <small>×${s.qty}${s.placed ? ` · 박스에 ${s.placed}개` : ''}</small>
        </div>
        <button class="btn small" data-act="put" ${s.qty ? '' : 'disabled'}>놓기</button>
      </div>`;
  }).join('');
}

/** 인벤토리에서 '놓기': 지금 보는 박스 중앙에서 가까운 빈칸 */
async function putItemInCurrentBox(itemId) {
  const box = currentBox;
  const c = toWorld(box, (N - 1) / 2, (N - 1) / 2);
  let best = null, bestD = Infinity;
  for (let ly = 0; ly < N; ly++) {
    for (let lx = 0; lx < N; lx++) {
      const t = { box, lx, ly, wx: toWorld(box, lx, ly)[0], wy: toWorld(box, lx, ly)[1] };
      if (!canPlaceAt(t) || monsters.some(m => m.tile[0] === t.wx && m.tile[1] === t.wy)) continue;
      const d = Math.hypot(t.wx - c[0], t.wy - c[1]) + Math.random() * 0.01;
      if (d < bestD) { bestD = d; best = t; }
    }
  }
  if (!best) { flash('이 박스에는 빈 칸이 없어요'); return; }
  const created = await editKinds.item.create({ itemId }, box.id, best.lx, best.ly);
  renderPlacedItem(created);
  attachEditHandlers('item', created);
  rebuildBlocked();
  renderBag();
  flash(`${itemById(itemId).nameKo}을(를) ${box.emoji} ${box.biomeName} 박스에 놓았어요 · 꾸미기 모드에서 옮길 수 있어요`);
}

async function initItems() {
  try {
    await reloadItems();
  } catch (err) {
    console.error('아이템 불러오기 실패', err);
  }
  bagTabs.item = renderItemTab;
  const tab = document.createElement('button');
  tab.dataset.tab = 'item';
  tab.textContent = '아이템·배지';
  document.getElementById('bag-tabs').appendChild(tab);

  document.getElementById('bag-list').addEventListener('click', async e => {
    const btn = e.target.closest('.item-row button[data-act="put"]');
    if (!btn) return;
    btn.disabled = true;
    try {
      await putItemInCurrentBox(+btn.closest('.item-row').dataset.item);
    } catch (err) {
      flash(err.message);
      btn.disabled = false;
    }
  });
}
