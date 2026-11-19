/* 포켓몬 끌어다 놓기
 *  - 박스 위 포켓몬을 끌어 다른 칸·다른 박스로 옮김
 *  - 인벤토리 목록의 포켓몬 그림을 끌어 원하는 칸에 바로 꺼냄
 *  - 놓을 수 있는 칸: 박스 안, 소품·아이템이 없고 다른 포켓몬이 서 있지 않은 칸
 */

let monDrag = null;   // {mon?|owned?, x, y, moved, target, from}
let tileHl = null;    // 놓을 칸 표시(마름모)

function showTileHl(t, ok) {
  if (!tileHl) {
    tileHl = document.createElement('div');
    tileHl.className = 'tile-hl';
    entitiesEl.appendChild(tileHl);
  }
  tileHl.classList.toggle('hidden', !t);
  if (!t) return;
  const c = iso(t.wx + 0.5, t.wy + 0.5);
  tileHl.style.left = `${c.sx - TW / 2}px`;
  tileHl.style.top = `${c.sy - TH / 2}px`;
  tileHl.classList.toggle('bad', !ok);
}
function hideTileHl() { tileHl?.classList.add('hidden'); }

function canDropMon(t, mon) {
  if (!t || !canStand(t.wx, t.wy)) return false;
  return !monsters.some(m => m !== mon && m.tile[0] === t.wx && m.tile[1] === t.wy);
}

/** 발 위치 기준 칸: 포인터에서 잡은 높이만큼 내려서 계산 */
function dropTile(e) {
  return tileAtClient(e.clientX, e.clientY + (monDrag?.grabDy || 0));
}

function startMonDrag(e, payload) {
  if (e.button !== 0 || (typeof ed !== 'undefined' && ed.on)) return;
  e.stopPropagation();
  e.preventDefault();
  monDrag = { ...payload, x: e.clientX, y: e.clientY, moved: false, target: null };
}

window.addEventListener('pointermove', e => {
  const d = monDrag;
  if (!d) return;
  if (!d.moved) {
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return;
    d.moved = true;
    document.body.classList.add('mon-dragging');
    if (d.mon) {
      d.mon.held = true;
      d.mon.el.classList.add('held');
      d.mon.el.style.zIndex = 99999;
    } else {
      // 인벤토리에서 끌 때: 포인터를 따라다니는 그림
      d.float = document.createElement('img');
      d.float.className = 'drag-float';
      d.float.src = d.owned.pokemon.sprites.frontAnimated || d.owned.pokemon.sprites.frontStatic;
      document.body.appendChild(d.float);
    }
  }
  const t = dropTile(e);
  d.target = t;
  const ok = canDropMon(t, d.mon);
  showTileHl(t, ok);
  if (d.mon) {
    // 포켓몬은 포인터 아래에 붙어서 따라옴 (살짝 들린 모습)
    const rect = viewport.getBoundingClientRect();
    const sx = (e.clientX - rect.left - panX) / zoom, sy = (e.clientY - rect.top - panY) / zoom + d.grabDy / zoom;
    d.mon.el.style.left = `${sx}px`;
    d.mon.el.style.top = `${sy}px`;
    d.mon.img.style.transform = `translate(-50%, -10px) scale(${d.mon.flip * MON_SCALE}, ${MON_SCALE})`;
  } else {
    d.float.style.left = `${e.clientX}px`;
    d.float.style.top = `${e.clientY}px`;
  }
});

window.addEventListener('pointerup', async () => {
  const d = monDrag;
  if (!d) return;
  monDrag = null;
  document.body.classList.remove('mon-dragging');
  hideTileHl();
  d.float?.remove();
  if (!d.moved) return;                         // 그냥 클릭 → 정보 패널 (click 핸들러)
  suppressClick = true;
  setTimeout(() => (suppressClick = false), 0);

  const t = d.target;
  const mon = d.mon;
  if (mon) {
    mon.held = false;
    mon.el.classList.remove('held');
  }
  if (!canDropMon(t, mon)) {
    if (mon) mon.render();                      // 제자리로
    if (t) flash('여기에는 내려놓을 수 없어요');
    return;
  }
  const id = mon ? mon.data.id : d.owned.pokemon.id;
  const fromBox = mon?.box;
  if (mon) mon.warp(t.wx, t.wy);
  try {
    const updated = await api(`/api/collection/${id}`, {
      method: 'PATCH', body: { boxId: t.box.id, x: t.lx, y: t.ly },
    });
    updateOwned(updated);
    if (!mon) spawnOwned(updated);
    renderBag();
    refreshEmpty();
    const name = displayName(updated);
    if (!mon) flash(`${name}을(를) ${t.box.emoji} ${t.box.biomeName} 박스에 꺼냈어요`);
    else if (fromBox !== t.box) flash(`${name} → ${t.box.emoji} ${t.box.biomeName} 박스로 이사했어요`);
  } catch (err) {
    flash(err.message);
    if (mon && d.from) mon.warp(...d.from);
  }
});

function attachMonDrag(mon) {
  if (mon.dragReady) return;
  mon.dragReady = true;
  mon.img.addEventListener('pointerdown', e => {
    const feet = mon.el.getBoundingClientRect();
    startMonDrag(e, { mon, from: [...mon.tile], grabDy: feet.top - e.clientY });
  });
}

function initMonDrag() {
  monsters.forEach(attachMonDrag);
  // 새로 생기는 포켓몬에도 붙이기
  const spawn = spawnOwned;
  spawnOwned = owned => { spawn(owned); const m = monsterOf(owned.pokemon.id); if (m) attachMonDrag(m); };

  // 인벤토리 목록에서 끌어 꺼내기
  document.getElementById('bag-list').addEventListener('pointerdown', e => {
    const img = e.target.closest('.bag-item:not(.placed)[data-id] img');
    if (!img) return;
    const owned = collection.find(o => o.pokemon.id === +img.closest('.bag-item').dataset.id);
    if (owned) startMonDrag(e, { owned, grabDy: 20 });
  });
}
