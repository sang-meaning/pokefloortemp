/* =========================================================
 * 배경 편집 모드
 *  - 🛠 배경 편집 버튼으로 켜고 끔. 켜져 있는 동안 포켓몬은 흐리게, 가구만 조작 가능
 *  - 가구 클릭 = 선택, 끌기 = 이동 (타일 단위로 딱딱 맞춰짐)
 *  - R = 회전, Delete = 삭제, Esc = 선택 해제
 *  - 왼쪽 목록에서 가구를 고르면 마우스를 따라다니고, 바닥을 클릭하면 놓임
 *  - 소품(모니터, TV 등)은 책상·테이블 위에 놓으면 그 위에 얹힘
 * ========================================================= */

const editor = {
  on: false,
  selected: null,        // 선택된 가구 (furniture 배열의 항목)
  drag: null,            // { f, offX, offY, startX, startY, moved, cand }
  placing: null,         // 목록에서 고른 새 가구 { sprite, x, y, lift }
  ghost: null,           // 놓을 위치 미리보기 요소
  category: FURNITURE_CATEGORIES[0],
};

/* ---------- 좌표 변환: 마우스 → 타일 ---------- */
function pointerToTile(clientX, clientY) {
  const rect = viewport.getBoundingClientRect();
  const wx = (clientX - rect.left - panX) / zoom;
  const wy = (clientY - rect.top - panY) / zoom;
  const a = (wx - OX) / (TW / 2);   // x - y
  const b = (wy - OY) / (TH / 2);   // x + y
  return { fx: (a + b) / 2, fy: (b - a) / 2 };
}

/* ---------- 놓을 수 있는지 검사 ---------- */
const sameTile = (f, x, y) => f.x === x && f.y === y;

/** 소품을 얹을 수 있는 가구(바닥에 놓인, surface 가 있는 것) */
function hostAt(x, y, ignore) {
  return furniture.find(o => o !== ignore && !o.lift && sameTile(o, x, y) && catalogOf(o.sprite).surface);
}

/**
 * 후보 위치에 놓을 수 있으면 { ok: true, lift } 반환
 * ignore: 지금 옮기는 가구 자신, 그리고 같이 따라가는 얹힌 소품
 */
function checkPlace(cand, ignoreList = []) {
  if (!roomAt(cand.x, cand.y)) return { ok: false };
  const info = catalogOf(cand.sprite);
  const others = furniture.filter(o => !ignoreList.includes(o));

  if (info.flat) return { ok: true, lift: 0 };   // 러그는 어디든

  if (info.top) {
    const host = hostAt(cand.x, cand.y, null);
    if (host && !ignoreList.includes(host)) {
      const taken = others.some(o => o.lift && sameTile(o, cand.x, cand.y));
      return { ok: !taken, lift: info.surface || catalogOf(host.sprite).surface };
    }
  }

  const fp = footprint({ ...cand, lift: 0 });
  if (!fp) return { ok: false };
  const occupied = new Set();
  others.forEach(o => footprint(o)?.tiles.forEach(([x, y]) => occupied.add(key(x, y))));
  const ok = fp.tiles.every(([x, y]) => roomAt(x, y) && !occupied.has(key(x, y)));
  return { ok, lift: 0 };
}

/** 이 가구 위에 얹힌 소품들 (가구를 옮기거나 지우면 같이) */
const topsOn = f => (f.lift ? [] : furniture.filter(o => o !== f && o.lift && sameTile(o, f.x, f.y)));

/* ---------- 저장 ---------- */
const payload = f => ({ sprite: f.sprite, x: f.x, y: f.y, lift: f.lift || 0 });

async function saveMove(f, x, y, lift) {
  const tops = topsOn(f);
  const before = { x: f.x, y: f.y, lift: f.lift };
  Object.assign(f, { x, y, lift });
  tops.forEach(t => Object.assign(t, { x, y }));
  refreshFurniture([f, ...tops]);
  try {
    await Promise.all([f, ...tops].map(o => api(`/api/furniture/${o.id}`, { method: 'PUT', body: payload(o) })));
  } catch (err) {
    alert(`저장 실패: ${err.message}`);
    Object.assign(f, before);
    tops.forEach(t => Object.assign(t, { x: before.x, y: before.y }));
    refreshFurniture([f, ...tops]);
  }
}

async function rotateSelected() {
  const f = editor.selected;
  if (!f) return;
  const next = DIRECTIONS[(DIRECTIONS.indexOf(dirOf(f.sprite)) + 1) % 4];
  const sprite = `${baseOf(f.sprite)}_${next}`;
  if (!MANIFEST[sprite]) return;
  const old = f.sprite;
  f.sprite = sprite;
  // 회전하면 차지하는 칸이 달라질 수 있음 → 겹치면 취소
  if (!checkPlace(f, [f, ...topsOn(f)]).ok && !f.lift) {
    f.sprite = old;
    flash('여기서는 돌릴 수 없어요 (다른 가구와 겹쳐요)');
    return;
  }
  refreshFurniture([f]);
  try {
    await api(`/api/furniture/${f.id}`, { method: 'PUT', body: payload(f) });
  } catch (err) {
    f.sprite = old;
    refreshFurniture([f]);
    alert(`저장 실패: ${err.message}`);
  }
  updateToolbar();
}

async function deleteSelected() {
  const f = editor.selected;
  if (!f) return;
  const targets = [f, ...topsOn(f)];
  try {
    await Promise.all(targets.map(o => api(`/api/furniture/${o.id}`, { method: 'DELETE' })));
  } catch (err) {
    alert(`삭제 실패: ${err.message}`);
    return;
  }
  targets.forEach(o => o.el.remove());
  furniture = furniture.filter(o => !targets.includes(o));
  select(null);
  rebuildBlocked();
}

async function placeNew(x, y) {
  const p = editor.placing;
  const cand = { sprite: p.sprite, x, y };
  const chk = checkPlace(cand);
  if (!chk.ok) { flash('여기에는 놓을 수 없어요'); return; }
  try {
    const saved = await api('/api/furniture', { method: 'POST', body: { ...cand, lift: chk.lift } });
    saved.el = renderFurniture(saved);
    furniture.push(saved);
    rebuildBlocked();
    flash(`${catalogOf(saved.sprite).name} 배치!`);
  } catch (err) {
    alert(`저장 실패: ${err.message}`);
  }
}

async function resetLayout() {
  if (!confirm('가구 배치를 처음 상태로 되돌릴까요? 지금 배치는 사라져요.')) return;
  const list = await api('/api/furniture/reset', { method: 'POST' });
  furniture.forEach(f => f.el.remove());
  furniture = list;
  furniture.forEach(f => { f.el = renderFurniture(f); });
  rebuildBlocked();
  select(null);
}

function refreshFurniture(list) {
  list.forEach(f => renderFurniture(f));
  rebuildBlocked();
}

/* ---------- 선택 & 툴바 ---------- */
function select(f) {
  if (editor.selected?.el) editor.selected.el.classList.remove('sel');
  editor.selected = f;
  if (f) f.el.classList.add('sel');
  updateToolbar();
}

function updateToolbar() {
  const bar = document.getElementById('edit-toolbar');
  const f = editor.selected;
  bar.querySelector('.et-name').textContent = f
    ? `${catalogOf(f.sprite).name}${f.lift ? ' (얹힘)' : ''}`
    : (editor.placing ? `${catalogOf(editor.placing.sprite).name} 놓는 중 · 바닥을 클릭하세요 (R 회전, Esc 취소)` : '가구를 클릭해 선택하거나, 왼쪽 목록에서 새 가구를 고르세요');
  bar.querySelectorAll('[data-need-sel]').forEach(b => { b.disabled = !f; });
}

let flashTimer = null;
function flash(msg) {
  const el = document.getElementById('edit-flash');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

/* ---------- 왼쪽 가구 목록 ---------- */
function renderPalette() {
  document.getElementById('palette-tabs').innerHTML = FURNITURE_CATEGORIES.map(c =>
    `<button data-cat="${c}" class="${c === editor.category ? 'on' : ''}">${c}</button>`).join('');
  document.getElementById('palette-list').innerHTML = FURNITURE_CATALOG
    .filter(c => c.cat === editor.category)
    .map(c => `
      <button class="pal-item${editor.placing && baseOf(editor.placing.sprite) === c.base ? ' on' : ''}" data-base="${c.base}">
        <img src="${ASSET}${c.base}_SE.png" alt="" loading="lazy">
        <span>${c.name}${c.top ? ' <small>얹기</small>' : ''}</span>
      </button>`).join('');
}

function startPlacing(base) {
  select(null);
  editor.placing = { sprite: `${base}_SE` };
  if (!editor.ghost) {
    editor.ghost = renderFurniture({ sprite: editor.placing.sprite, x: 0, y: 0, lift: 0 }, null);
    editor.ghost.classList.add('ghost', 'hidden-ghost');
  }
  renderPalette();
  updateToolbar();
}

function stopPlacing() {
  editor.placing = null;
  if (editor.ghost) { editor.ghost.remove(); editor.ghost = null; }
  renderPalette();
  updateToolbar();
}

function moveGhost(clientX, clientY) {
  const p = editor.placing;
  if (!p || !editor.ghost) return;
  const { fx, fy } = pointerToTile(clientX, clientY);
  const x = Math.floor(fx), y = Math.floor(fy);
  const chk = checkPlace({ sprite: p.sprite, x, y });
  Object.assign(p, { x, y, lift: chk.lift || 0 });
  renderFurniture(p, editor.ghost);
  editor.ghost.classList.remove('hidden-ghost');
  editor.ghost.classList.toggle('invalid', !chk.ok);
}

/* ---------- 마우스 조작 ---------- */
function onFurniturePointerDown(e) {
  if (!editor.on || editor.placing) return;
  const el = e.target.closest('.furniture');
  const f = el && furniture.find(o => o.el === el);
  if (!f) return;
  e.stopPropagation();     // 화면 이동(드래그)과 겹치지 않게
  e.preventDefault();
  select(f);
  const { fx, fy } = pointerToTile(e.clientX, e.clientY);
  editor.drag = { f, offX: fx - f.x, offY: fy - f.y, startX: e.clientX, startY: e.clientY, moved: false, cand: null };
}

function onPointerMove(e) {
  if (!editor.on) return;
  if (editor.placing) { moveGhost(e.clientX, e.clientY); return; }
  const d = editor.drag;
  if (!d) return;
  if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return;
  d.moved = true;
  const { fx, fy } = pointerToTile(e.clientX, e.clientY);
  const x = Math.round(fx - d.offX), y = Math.round(fy - d.offY);
  const moving = [d.f, ...topsOn(d.f)];
  const chk = checkPlace({ sprite: d.f.sprite, x, y }, moving);
  d.cand = { x, y, lift: d.f.lift && !chk.lift ? 0 : chk.lift || 0, ok: chk.ok };
  // 미리보기: 실제 데이터는 놓을 때 바꿈
  renderFurniture({ ...d.f, x, y, lift: d.cand.lift }, d.f.el);
  d.f.el.classList.toggle('invalid', !chk.ok);
}

async function onPointerUp() {
  const d = editor.drag;
  editor.drag = null;
  if (!d) return;
  d.f.el.classList.remove('invalid');
  if (!d.moved || !d.cand) return;
  if (!d.cand.ok || (d.cand.x === d.f.x && d.cand.y === d.f.y && d.cand.lift === (d.f.lift || 0))) {
    renderFurniture(d.f);   // 제자리로
    if (!d.cand.ok) flash('여기에는 놓을 수 없어요');
    return;
  }
  await saveMove(d.f, d.cand.x, d.cand.y, d.cand.lift);
  updateToolbar();
}

function onViewportClick(e) {
  if (!editor.on || suppressClick) return;
  if (editor.placing) {
    const { fx, fy } = pointerToTile(e.clientX, e.clientY);
    placeNew(Math.floor(fx), Math.floor(fy));
    return;
  }
  if (!e.target.closest('.furniture')) select(null);
}

function onKey(e) {
  if (!editor.on || e.target.matches('input, textarea')) return;
  if (e.key === 'Escape') { if (editor.placing) stopPlacing(); else select(null); }
  if (e.key === 'r' || e.key === 'R') {
    if (editor.placing) {
      const p = editor.placing;
      p.sprite = `${baseOf(p.sprite)}_${DIRECTIONS[(DIRECTIONS.indexOf(dirOf(p.sprite)) + 1) % 4]}`;
      if (p.x !== undefined) {
        const chk = checkPlace(p);
        p.lift = chk.lift || 0;
        renderFurniture(p, editor.ghost);
        editor.ghost.classList.toggle('invalid', !chk.ok);
      }
    } else {
      rotateSelected();
    }
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && editor.selected) deleteSelected();
}

/* ---------- 켜기 / 끄기 ---------- */
function setEditMode(on) {
  editor.on = on;
  document.body.classList.toggle('editing', on);
  document.getElementById('edit-btn').classList.toggle('on', on);
  document.getElementById('edit-btn').textContent = on ? '✓ 편집 끝내기' : '🛠 배경 편집';
  document.getElementById('palette').classList.toggle('hidden', !on);
  document.getElementById('edit-toolbar').classList.toggle('hidden', !on);
  if (on) {
    hideInfo();
    document.getElementById('bag')?.classList.add('hidden');
    renderPalette();
  } else {
    stopPlacing();
    select(null);
  }
  updateToolbar();
}

function initEditor() {
  const extra = document.querySelector('.nav-extra');
  const btn = document.createElement('button');
  btn.id = 'edit-btn';
  btn.className = 'btn ghost';
  btn.textContent = '🛠 배경 편집';
  extra.prepend(btn);
  btn.addEventListener('click', () => setEditMode(!editor.on));

  document.getElementById('palette-tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-cat]');
    if (!b) return;
    editor.category = b.dataset.cat;
    renderPalette();
  });
  document.getElementById('palette-list').addEventListener('click', e => {
    const b = e.target.closest('.pal-item');
    if (!b) return;
    if (editor.placing && baseOf(editor.placing.sprite) === b.dataset.base) stopPlacing();
    else startPlacing(b.dataset.base);
  });
  document.getElementById('palette-reset').addEventListener('click', resetLayout);
  document.getElementById('et-rotate').addEventListener('click', rotateSelected);
  document.getElementById('et-delete').addEventListener('click', deleteSelected);
  document.getElementById('et-done').addEventListener('click', () => setEditMode(false));

  entitiesEl.addEventListener('pointerdown', onFurniturePointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  viewport.addEventListener('click', onViewportClick);
  window.addEventListener('keydown', onKey);
}
