/* 꾸미기 모드: 도트 소품(과 아이템)을 놓고, 끌어서 옮기고(다른 박스로도), 지우기
 *
 *  - 팔레트에서 하나 고르고 바닥 칸을 클릭하면 놓임 (계속 놓을 수 있음, Esc 로 그만)
 *  - 놓인 것을 끌면 이동, 클릭하면 선택 → Delete 키나 툴바 버튼으로 삭제
 *  - 한 칸에는 소품/아이템 하나만
 */

/* 놓을 수 있는 것의 종류. items.js 가 'item' 을 추가로 등록 */
const editKinds = {
  prop: {
    list: () => props,
    name: o => PROP_INFO[o.key]?.name || o.key,
    render: o => renderProp(o),
    create: (tool, boxId, x, y) => api('/api/props', { method: 'POST', body: { key: tool.key, boxId, x, y } })
      .then(created => { props.push(created); return created; }),
    move: (o, boxId, x, y) => api(`/api/props/${o.id}`, { method: 'PATCH', body: { boxId, x, y } }),
    remove: o => api(`/api/props/${o.id}`, { method: 'DELETE' })
      .then(() => { props.splice(props.indexOf(o), 1); }),
    removeLabel: '🗑 삭제',
  },
};

const ed = {
  on: false,
  tab: 'biome',          // 팔레트 탭: biome(지금 박스 바이옴) | all | item
  tool: null,            // 놓으려고 고른 것 {kind, key|itemId, src, w, h, name}
  sel: null,             // 선택된 놓인 것 {kind, obj}
  drag: null,            // 끌고 있는 것
  ghost: null,           // 미리보기 요소
};
const paletteTabs = {
  biome: { label: '이 바이옴', render: () => renderPropPalette(true) },
  all: { label: '모든 소품', render: () => renderPropPalette(false) },
};

/* ---------- 칸 계산 ---------- */
/** 그 칸에 놓을 수 있는지 (ignore: 지금 옮기는 자기 자신) */
function canPlaceAt(t, ignore) {
  if (!t) return false;
  return ![...props, ...placedItems].some(o => o !== ignore && o.boxId === t.box.id && o.x === t.lx && o.y === t.ly);
}

/* ---------- 미리보기(고스트) ---------- */
function showGhost(t, ok) {
  if (!ed.tool) return;
  if (!ed.ghost) {
    ed.ghost = document.createElement('div');
    ed.ghost.className = 'entity prop ghost';
    ed.ghost.innerHTML = '<img alt="" draggable="false">';
    entitiesEl.appendChild(ed.ghost);
  }
  const img = ed.ghost.firstChild;
  if (img.getAttribute('src') !== ed.tool.src) img.src = ed.tool.src;
  img.style.width = `${ed.tool.w}px`;
  img.style.height = `${ed.tool.h}px`;
  ed.ghost.classList.toggle('hidden', !t);
  ed.ghost.classList.toggle('invalid', !ok);
  if (t) placeEntity(ed.ghost, t.wx + 0.5, t.wy + 0.5);
}
function hideGhost() {
  ed.ghost?.remove();
  ed.ghost = null;
}

/* ---------- 선택 / 툴바 ---------- */
function select(kind, obj) {
  if (ed.sel) ed.sel.obj.el?.classList.remove('sel');
  ed.sel = obj ? { kind, obj } : null;
  if (obj) obj.el.classList.add('sel');
  const bar = document.getElementById('edit-toolbar');
  bar.querySelector('.et-name').textContent = obj
    ? `선택: ${editKinds[kind].name(obj)}`
    : ed.tool ? `놓을 것: ${ed.tool.name} — 바닥 칸을 클릭하세요 (Esc: 그만)` : '팔레트에서 고르거나, 놓인 것을 끌어서 옮기세요';
  const del = document.getElementById('et-delete');
  del.disabled = !obj;
  del.textContent = obj ? editKinds[kind].removeLabel : '🗑 삭제';
}

function setTool(tool) {
  ed.tool = tool;
  if (!tool) hideGhost();
  select(null, null);
  document.querySelectorAll('.pal-item').forEach(el =>
    el.classList.toggle('on', !!tool && el.dataset.id === String(tool.key ?? tool.itemId)));
}

function editFlash(msg) { flash(msg); }

/* ---------- 놓기 / 옮기기 / 지우기 ---------- */
async function placeAt(t) {
  if (!canPlaceAt(t)) { editFlash('이미 무언가 놓인 칸이에요'); return; }
  const tool = ed.tool;
  try {
    const created = await editKinds[tool.kind].create(tool, t.box.id, t.lx, t.ly);
    editKinds[tool.kind].render(created);
    attachEditHandlers(tool.kind, created);
    rebuildBlocked();
    monsters.forEach(m => m.unstick());
    if (tool.kind !== 'prop') renderPalette();   // 아이템은 개수가 줄어듦
  } catch (err) {
    editFlash(err.message);
  }
}

async function deleteSelected() {
  if (!ed.sel) return;
  const { kind, obj } = ed.sel;
  select(null, null);
  try {
    await editKinds[kind].remove(obj);
    obj.el.remove();
    rebuildBlocked();
    if (kind !== 'prop') renderPalette();
  } catch (err) {
    editFlash(err.message);
  }
}

/** 놓인 것을 끌어서 옮기기 */
function attachEditHandlers(kind, obj) {
  const img = obj.el.firstChild;
  img.addEventListener('pointerdown', e => {
    if (!ed.on || e.button !== 0) return;
    e.stopPropagation();          // 화면 이동 막기
    e.preventDefault();
    const feet = obj.el.getBoundingClientRect();   // 크기 0인 기준점 = 발 위치
    ed.drag = {
      kind, obj, moved: false,
      x: e.clientX, y: e.clientY,
      offX: e.clientX - feet.left, offY: e.clientY - feet.top,
      target: null,
    };
  });
}

window.addEventListener('pointermove', e => {
  if (!ed.on) return;
  const d = ed.drag;
  if (d) {
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return;
    d.moved = true;
    d.obj.el.classList.add('dragging-ent');
    // 잡은 지점만큼 빼서 발 위치 기준으로 칸 계산 (반 칸 아래로 보정)
    const t = tileAtClient(e.clientX - d.offX, e.clientY - d.offY - TH / 4 * zoom);
    d.target = t;
    const ok = canPlaceAt(t, d.obj);
    d.obj.el.classList.toggle('invalid', !ok);
    if (t) {
      placeEntity(d.obj.el, t.wx + 0.5, t.wy + 0.5);
      d.obj.el.style.zIndex = 99999;
    }
    return;
  }
  if (ed.tool) {
    const t = tileAtClient(e.clientX, e.clientY);
    showGhost(t, canPlaceAt(t));
  }
});

window.addEventListener('pointerup', async () => {
  const d = ed.drag;
  if (!d) return;
  ed.drag = null;
  d.obj.el.classList.remove('dragging-ent', 'invalid');
  suppressClick = true;                 // 뒤따르는 바닥 클릭(선택 해제/놓기) 막기
  setTimeout(() => (suppressClick = false), 0);
  if (!d.moved) {                       // 클릭 = 선택
    setTool(null);
    select(d.kind, d.obj);
    return;
  }
  const t = d.target;
  if (!t || !canPlaceAt(t, d.obj)) {     // 놓을 수 없는 곳 → 제자리로
    editKinds[d.kind].render(d.obj);
    if (t) editFlash('여기에는 놓을 수 없어요');
    return;
  }
  const before = { boxId: d.obj.boxId, x: d.obj.x, y: d.obj.y };
  Object.assign(d.obj, { boxId: t.box.id, x: t.lx, y: t.ly });
  editKinds[d.kind].render(d.obj);
  rebuildBlocked();
  try {
    await editKinds[d.kind].move(d.obj, t.box.id, t.lx, t.ly);
    monsters.forEach(m => m.unstick());
  } catch (err) {
    Object.assign(d.obj, before);
    editKinds[d.kind].render(d.obj);
    rebuildBlocked();
    editFlash(err.message);
  }
});

/* ---------- 팔레트 ---------- */
function renderPalette() {
  if (!ed.on) return;
  const tabs = document.getElementById('palette-tabs');
  tabs.innerHTML = Object.entries(paletteTabs).map(([id, t]) =>
    `<button data-tab="${id}" class="${id === ed.tab ? 'on' : ''}">${t.label}</button>`).join('');
  (paletteTabs[ed.tab] || paletteTabs.biome).render();
}

function renderPropPalette(onlyBiome) {
  const box = currentBox;
  const tag = box?.biome.toLowerCase();
  const list = Object.values(PROP_INFO).filter(p => !onlyBiome || p.biomes.includes(tag));
  document.getElementById('palette-sub').textContent = onlyBiome
    ? `${box.emoji} ${box.biomeName}에 어울리는 소품 ${list.length}개 · 다른 바이옴 소품도 '모든 소품'에서 쓸 수 있어요`
    : `소품 ${list.length}개 · 어느 박스에나 자유롭게 놓을 수 있어요`;
  document.getElementById('palette-list').innerHTML = list.map(p => `
    <button class="pal-item" data-kind="prop" data-id="${p.key}" title="${escapeHtml(p.name)}">
      <img src="/assets/px/${p.key}.png" alt="" style="width:${p.w * 2}px;height:${p.h * 2}px">
      <span>${escapeHtml(p.name)}</span>
    </button>`).join('');
  if (ed.tool) setTool(ed.tool);
}

function propTool(key) {
  const p = PROP_INFO[key];
  return { kind: 'prop', key, src: `/assets/px/${key}.png`, w: p.w * PROP_SCALE, h: p.h * PROP_SCALE, name: p.name };
}
/** 팔레트 항목 → 도구. items.js 가 'item' 을 추가 */
const toolFactories = { prop: el => propTool(el.dataset.id) };

/* ---------- 모드 켜고 끄기 ---------- */
function setEditMode(on) {
  ed.on = on;
  document.body.classList.toggle('editing', on);
  document.getElementById('edit-btn').classList.toggle('on', on);
  document.getElementById('edit-btn').textContent = on ? '✔ 꾸미기 끝' : '🛠 꾸미기';
  document.getElementById('palette').classList.toggle('hidden', !on);
  document.getElementById('edit-toolbar').classList.toggle('hidden', !on);
  document.getElementById('room-hint').textContent = on
    ? '꾸미기 모드 · 팔레트에서 골라 칸을 클릭 · 놓인 것은 끌어서 이동(다른 박스로도) · 클릭 후 Delete 로 삭제'
    : '포켓몬을 클릭해 보세요 · 포켓몬을 끌어서 다른 칸·박스로 옮길 수 있어요 · 휠로 확대/축소';
  if (on) {
    document.getElementById('bag').classList.add('hidden');
    hideInfo();
  }
  setTool(null);
  editGrid = on;
  drawFloor();
  renderPalette();
}

function initEditor() {
  const extra = document.querySelector('.nav-extra');
  const btn = document.createElement('button');
  btn.className = 'btn ghost';
  btn.id = 'edit-btn';
  extra.insertBefore(btn, document.getElementById('bag-btn'));
  btn.addEventListener('click', () => setEditMode(!ed.on));

  Object.entries(editKinds).forEach(([kind, k]) => k.list().forEach(o => attachEditHandlers(kind, o)));

  document.getElementById('palette-tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (b) { ed.tab = b.dataset.tab; renderPalette(); }
  });
  document.getElementById('palette-list').addEventListener('click', e => {
    const el = e.target.closest('.pal-item');
    if (!el || el.disabled) return;
    const same = ed.tool && String(ed.tool.key ?? ed.tool.itemId) === el.dataset.id;
    setTool(same ? null : toolFactories[el.dataset.kind](el));
  });
  document.getElementById('et-delete').addEventListener('click', deleteSelected);
  document.getElementById('et-done').addEventListener('click', () => setEditMode(false));

  viewport.addEventListener('click', e => {
    if (!ed.on || suppressClick) return;
    if (ed.tool) {
      placeAt(tileAtClient(e.clientX, e.clientY));
    } else {
      select(null, null);
    }
  });
  viewport.addEventListener('pointerleave', () => ed.ghost?.classList.add('hidden'));

  window.addEventListener('keydown', e => {
    if (!ed.on || e.target.matches('input, textarea')) return;
    if (e.key === 'Escape') { setTool(null); }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
  });

  // 보고 있는 박스가 바뀌면 '이 바이옴' 팔레트도 바뀜
  currentBoxListeners.push(() => { if (ed.on && ed.tab === 'biome') renderPalette(); });
  setEditMode(false);
}
