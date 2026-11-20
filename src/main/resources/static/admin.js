/* 관리자: 포켓몬 추가 / 켜기·끄기 / 다시 받기 / 삭제 */
renderNav('admin');

let all = [];

async function load() {
  all = await api('/api/admin/pokemon');
  render();
}

function render() {
  const q = document.getElementById('filter').value.trim().toLowerCase();
  const onlyOff = document.getElementById('only-inactive').checked;
  const shown = all.filter(p => {
    if (onlyOff && p.active) return false;
    if (!q) return true;
    return String(p.id) === q || p.nameKo.toLowerCase().includes(q) || p.nameEn.includes(q)
      || p.typesKo.some(t => t.includes(q));
  });
  const on = all.filter(p => p.active).length;
  document.getElementById('count').textContent = `등록 ${all.length}마리 · 게임에 등장 ${on}마리 · 표시 ${shown.length}`;
  document.getElementById('list').innerHTML = shown.map(p => `
    <div class="card${p.active ? '' : ' off'}" data-id="${p.id}">
      <span class="state">${p.active ? '등장' : '꺼짐'}</span>
      <img class="sprite" src="${p.sprites.frontStatic || p.sprites.frontAnimated || ''}" alt="" loading="lazy">
      <div class="no">${dexNo(p.id)}</div>
      <div class="name">${escapeHtml(p.nameKo)}</div>
      <div class="types">${typeChips(p.typesKo)}</div>
      <div class="actions">
        <button class="btn small ghost" data-act="toggle">${p.active ? '끄기' : '켜기'}</button>
        <button class="btn small ghost" data-act="refresh" title="PokéAPI 에서 다시 받기">↻</button>
        <button class="btn small danger" data-act="delete">삭제</button>
      </div>
    </div>`).join('');
}

document.getElementById('list').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = +btn.closest('.card').dataset.id;
  const p = all.find(x => x.id === id);
  btn.disabled = true;
  try {
    if (btn.dataset.act === 'toggle') {
      Object.assign(p, await api(`/api/admin/pokemon/${id}?active=${!p.active}`, { method: 'PATCH' }));
    } else if (btn.dataset.act === 'refresh') {
      Object.assign(p, await api(`/api/admin/pokemon/${id}`, { method: 'POST' }));
    } else if (btn.dataset.act === 'delete') {
      if (!confirm(`${p.nameKo}(${dexNo(id)})를 삭제할까요?\n이미 획득한 기록도 함께 지워져요.`)) { btn.disabled = false; return; }
      await api(`/api/admin/pokemon/${id}`, { method: 'DELETE' });
      all = all.filter(x => x.id !== id);
    }
    render();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
  }
});

document.getElementById('add-one').addEventListener('submit', async e => {
  e.preventDefault();
  const id = +document.getElementById('one-id').value;
  const status = document.getElementById('import-status');
  status.className = 'msg';
  status.textContent = `${id}번 받는 중…`;
  try {
    const p = await api(`/api/admin/pokemon/${id}`, { method: 'POST' });
    all = all.filter(x => x.id !== p.id).concat(p).sort((a, b) => a.id - b.id);
    status.textContent = `${dexNo(p.id)} ${p.nameKo} 추가 완료`;
    render();
  } catch (err) {
    status.className = 'msg err';
    status.textContent = err.message;
  }
});

document.getElementById('add-range').addEventListener('submit', async e => {
  e.preventDefault();
  const from = +document.getElementById('range-from').value;
  const to = +document.getElementById('range-to').value;
  const status = document.getElementById('import-status');
  status.className = 'msg';
  try {
    await api(`/api/admin/pokemon/import?from=${from}&to=${to}`, { method: 'POST' });
    pollImport();
  } catch (err) {
    status.className = 'msg err';
    status.textContent = err.message;
  }
});

/** 범위 추가 진행 상황 표시 */
async function pollImport() {
  const status = document.getElementById('import-status');
  const bar = document.getElementById('import-progress');
  const s = await api('/api/pokemon/seed-status');
  if (s.running) {
    bar.classList.remove('hidden');
    bar.firstElementChild.style.width = `${Math.round(s.done / s.total * 100)}%`;
    status.textContent = `PokéAPI 에서 받는 중… ${s.done} / ${s.total}`;
    setTimeout(pollImport, 1000);
  } else {
    bar.classList.add('hidden');
    if (s.total) status.textContent = `받기 완료 · 현재 등록 ${s.stored}마리`;
    await load();
  }
}

document.getElementById('filter').addEventListener('input', render);
document.getElementById('only-inactive').addEventListener('change', render);

load().then(pollImport);

/* ---------- 던전 난이도 해금 (관리자) ---------- */
async function dungeonUnlock(cleared) {
  const r = await api(`/api/admin/dungeon/unlock${cleared === undefined ? '' : `?cleared=${cleared}`}`, { method: 'POST' });
  document.getElementById('dg-msg').textContent = r.cleared === 0 ? '모든 바이옴 진행도를 초기화했어요' : '모든 바이옴의 모든 난이도를 열었어요';
}
document.getElementById('dg-unlock').addEventListener('click', () => dungeonUnlock());
document.getElementById('dg-reset').addEventListener('click', () => { if (confirm('모든 바이옴의 던전 진행도를 지울까요?')) dungeonUnlock(0); });
