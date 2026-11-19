/* 관리자: 아이템·배지를 인벤토리에 지급/회수 */

let itemsAll = [];
let qtyMap = new Map();      // itemId → {qty, placed}

async function loadItems() {
  const [catalog, inv] = await Promise.all([api('/api/admin/items'), api('/api/inventory')]);
  itemsAll = catalog;
  qtyMap = new Map(inv.items.map(s => [s.item.id, { qty: s.qty, placed: s.placed }]));
  const kinds = [...new Map(catalog.map(i => [i.kind, i.kindName])).entries()];
  const sel = document.getElementById('item-kind');
  const cur = sel.value;
  sel.innerHTML = '<option value="">전체 분류</option>'
    + kinds.map(([k, n]) => `<option value="${k}">${escapeHtml(n)}</option>`).join('');
  sel.value = cur;
  renderItems();
}

function renderItems() {
  const q = document.getElementById('item-filter').value.trim().toLowerCase();
  const kind = document.getElementById('item-kind').value;
  const owned = document.getElementById('item-owned').checked;
  const shown = itemsAll.filter(i => (!kind || i.kind === kind)
    && (!q || i.nameKo.toLowerCase().includes(q) || i.code.includes(q))
    && (!owned || qtyMap.has(i.id)));
  document.getElementById('item-count').textContent = `아이템 ${itemsAll.length}종 · 표시 ${shown.length}`;
  document.getElementById('item-list').innerHTML = shown.map(i => {
    const s = qtyMap.get(i.id) || { qty: 0, placed: 0 };
    return `
    <div class="card" data-item="${i.id}">
      <img src="${i.sprite}" alt="" loading="lazy" class="${i.kind === 'BADGE' ? 'badge' : ''}">
      <div class="name">${escapeHtml(i.nameKo)}</div>
      <div class="kind">${escapeHtml(i.kindName)}</div>
      <div class="qty">인벤토리 <b>${s.qty}</b>${s.placed ? ` · 박스 ${s.placed}` : ''}</div>
      <div class="actions">
        <button class="btn small ghost" data-q="-1" ${s.qty ? '' : 'disabled'}>−1</button>
        <button class="btn small" data-q="1">+1</button>
        <button class="btn small ghost" data-q="5">+5</button>
      </div>
    </div>`;
  }).join('');
}

document.getElementById('item-list').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-q]');
  if (!btn) return;
  const id = +btn.closest('.card').dataset.item;
  btn.disabled = true;
  try {
    const s = await api(`/api/admin/items/${id}/grant?qty=${btn.dataset.q}`, { method: 'POST' });
    qtyMap.set(id, { qty: s.qty, placed: s.placed });
    renderItems();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
  }
});

document.getElementById('item-import').addEventListener('click', async () => {
  try {
    await api('/api/admin/items/import', { method: 'POST' });
  } catch (err) {
    alert(err.message);
  }
  pollItemImport();
});

async function pollItemImport() {
  const s = await api('/api/admin/items/import-status');
  const bar = document.getElementById('item-progress');
  if (s.running) {
    bar.classList.remove('hidden');
    bar.firstElementChild.style.width = s.total ? `${Math.round(s.done / s.total * 100)}%` : '5%';
    document.getElementById('item-count').textContent = `PokéAPI 에서 아이템 받는 중… ${s.done} / ${s.total || '?'}`;
    setTimeout(pollItemImport, 1000);
  } else {
    bar.classList.add('hidden');
    await loadItems();
  }
}

['item-filter', 'item-kind', 'item-owned'].forEach(id =>
  document.getElementById(id).addEventListener(id === 'item-filter' ? 'input' : 'change', renderItems));

pollItemImport();
