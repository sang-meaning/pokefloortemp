/* =========================================================
 * PokeFloor - Floor796 스타일 아이소메트릭 방 + 배회하는 포켓몬
 *
 * 좌표계
 *  - 타일 좌표 (x, y): 바닥 격자. x는 화면 오른쪽 아래, y는 왼쪽 아래 방향
 *  - 화면 좌표 (sx, sy): iso() 로 변환
 *  - 깊이(앞뒤 순서) = x + y. 값이 클수록 관람자에게 가까움 → z-index 큼
 * ========================================================= */

const TW = 64;          // 타일 가로 폭 (마름모)
const TH = 32;          // 타일 세로 폭
const WALL_H = 80;      // 바깥 벽 높이
const RAIL_H = 12;      // 방 사이 유리 칸막이 높이
const SLAB = 14;        // 바닥 두께
const MARGIN = 40;
const MON_SCALE = 1.0;  // 포켓몬 스프라이트 확대 배율

/* ---------- 방(박스) 정의: 나중에 DB에서 받아올 부분 ---------- */
const ROOMS = [
  { id: 'A', x: 0, y: 0, w: 8, h: 6, name: '풀숲 연구실', tile: ['#b7d39b', '#a9c98b'], wall: '#e9e4d4' },
  { id: 'B', x: 8, y: 0, w: 7, h: 6, name: '휴게실',     tile: ['#e6d3b3', '#dcc7a3'], wall: '#efe6d6' },
  { id: 'C', x: 0, y: 6, w: 8, h: 6, name: '수조실',     tile: ['#a9cfe0', '#9bc3d6'], wall: '#dde8ee' },
  { id: 'D', x: 8, y: 6, w: 7, h: 6, name: '창고',       tile: ['#c3c6cc', '#b6b9c0'], wall: '#e1e2e6' },
];

// 방과 방 사이 문: 인접한 두 타일 사이를 통과 가능하게 함
const DOORS = [
  [[7, 2], [8, 2]], [[7, 3], [8, 3]],   // A ↔ B
  [[3, 5], [3, 6]], [[4, 5], [4, 6]],   // A ↔ C
  [[11, 5], [11, 6]],                   // B ↔ D
  [[7, 8], [8, 8]], [[7, 9], [8, 9]],   // C ↔ D
];

// 가구 자리표시(임시 박스). 나중에 Kenney PNG 로 교체
const FURNITURE = [
  { x: 1, y: 1, h: 34, color: '#7a5c3e', name: '책상' },
  { x: 2, y: 1, h: 34, color: '#7a5c3e', name: '책상' },
  { x: 6, y: 4, h: 22, color: '#4f8a3c', name: '화분' },
  { x: 13, y: 1, h: 26, color: '#c0504d', name: '소파' },
  { x: 13, y: 2, h: 26, color: '#c0504d', name: '소파' },
  { x: 1, y: 9, h: 40, color: 'rgba(80,160,220,0.75)', name: '수조' },
  { x: 2, y: 9, h: 40, color: 'rgba(80,160,220,0.75)', name: '수조' },
  { x: 12, y: 9, h: 30, color: '#9c7b4f', name: '상자' },
  { x: 13, y: 9, h: 46, color: '#8d6e45', name: '상자' },
  { x: 13, y: 10, h: 30, color: '#9c7b4f', name: '상자' },
];

/* ---------- 격자 계산 ---------- */
const GRID_W = Math.max(...ROOMS.map(r => r.x + r.w));
const GRID_H = Math.max(...ROOMS.map(r => r.y + r.h));
const OX = GRID_H * TW / 2 + MARGIN;
const OY = WALL_H + MARGIN;
const STAGE_W = (GRID_W + GRID_H) * TW / 2 + MARGIN * 2;
const STAGE_H = (GRID_W + GRID_H) * TH / 2 + WALL_H + SLAB + MARGIN * 2;

const iso = (x, y) => ({ sx: (x - y) * TW / 2 + OX, sy: (x + y) * TH / 2 + OY });
const key = (x, y) => `${x},${y}`;

const roomAt = (x, y) => ROOMS.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
const blocked = new Set(FURNITURE.map(f => key(f.x, f.y)));
const doorSet = new Set();
DOORS.forEach(([a, b]) => {
  doorSet.add(`${key(...a)}|${key(...b)}`);
  doorSet.add(`${key(...b)}|${key(...a)}`);
});

function canStand(x, y) {
  return roomAt(x, y) && !blocked.has(key(x, y));
}
function canMove(x1, y1, x2, y2) {
  if (!canStand(x2, y2)) return false;
  if (roomAt(x1, y1) === roomAt(x2, y2)) return true;
  return doorSet.has(`${key(x1, y1)}|${key(x2, y2)}`);
}
const isDoorEdge = (x1, y1, x2, y2) => doorSet.has(`${key(x1, y1)}|${key(x2, y2)}`);

/* ---------- 배경(바닥 + 벽) 그리기 ---------- */
const floorCanvas = document.getElementById('floor');
floorCanvas.width = STAGE_W;
floorCanvas.height = STAGE_H;
const ctx = floorCanvas.getContext('2d');

function poly(points, fill, stroke) {
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
const up = (p, h) => ({ sx: p.sx, sy: p.sy - h });
const down = (p, h) => ({ sx: p.sx, sy: p.sy + h });

function shade(hex, amt) {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const c = s => Math.max(0, Math.min(255, ((n >> s) & 255) + amt));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

function drawBackground() {
  ctx.clearRect(0, 0, STAGE_W, STAGE_H);

  // 1) 바닥 두께(앞쪽 옆면)
  for (let x = 0; x < GRID_W; x++) {
    const r = roomAt(x, GRID_H - 1);
    if (!r) continue;
    const a = iso(x, GRID_H), b = iso(x + 1, GRID_H);
    poly([a, b, down(b, SLAB), down(a, SLAB)], shade(r.tile[0], -70));
  }
  for (let y = 0; y < GRID_H; y++) {
    const r = roomAt(GRID_W - 1, y);
    if (!r) continue;
    const a = iso(GRID_W, y), b = iso(GRID_W, y + 1);
    poly([a, b, down(b, SLAB), down(a, SLAB)], shade(r.tile[0], -45));
  }

  // 2) 바닥 타일 (체커 무늬)
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const r = roomAt(x, y);
      if (!r) continue;
      poly([iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)],
        r.tile[(x + y) % 2], 'rgba(0,0,0,0.06)');
    }
  }

  // 3) 벽: 각 방의 북쪽(y=r.y) / 서쪽(x=r.x) 변
  ROOMS.forEach(r => {
    for (let x = r.x; x < r.x + r.w; x++) {
      const outer = r.y === 0;
      if (!outer && isDoorEdge(x, r.y - 1, x, r.y)) continue;
      const a = iso(x, r.y), b = iso(x + 1, r.y);
      const h = outer ? WALL_H : RAIL_H;
      poly([a, b, up(b, h), up(a, h)],
        outer ? shade(r.wall, -18) : 'rgba(200,230,255,0.35)',
        outer ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.6)');
    }
    for (let y = r.y; y < r.y + r.h; y++) {
      const outer = r.x === 0;
      if (!outer && isDoorEdge(r.x - 1, y, r.x, y)) continue;
      const a = iso(r.x, y), b = iso(r.x, y + 1);
      const h = outer ? WALL_H : RAIL_H;
      poly([a, b, up(b, h), up(a, h)],
        outer ? r.wall : 'rgba(200,230,255,0.35)',
        outer ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.6)');
    }
  });

  // 4) 방 이름 (바닥 안쪽 모서리)
  ctx.font = 'bold 12px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ROOMS.forEach(r => {
    const p = iso(r.x + 1.1, r.y + 1.1);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(r.name, p.sx, p.sy);
  });
}

/* ---------- 엔티티 레이어(가구, 포켓몬) ---------- */
const entitiesEl = document.getElementById('entities');
const zIndexOf = depth => Math.round(depth * 100) + 1000;

function placeEntity(el, px, py) {
  const p = iso(px, py);
  el.style.left = `${p.sx}px`;
  el.style.top = `${p.sy}px`;
  el.style.zIndex = zIndexOf(px + py);
}

function createFurniture(f) {
  const el = document.createElement('div');
  el.className = 'entity furniture';
  el.title = f.name;
  const cv = document.createElement('canvas');
  cv.width = TW;
  cv.height = TH + f.h;
  cv.style.left = `${-TW / 2}px`;
  cv.style.top = `${-TH / 2 - f.h}px`;
  const c = cv.getContext('2d');
  const P = (x, y) => ({ sx: x, sy: y });
  const draw = (pts, fill) => {
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p.sx, p.sy) : c.moveTo(p.sx, p.sy)));
    c.closePath();
    c.fillStyle = fill; c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.15)'; c.stroke();
  };
  const ins = 6; // 타일보다 살짝 작게
  const T = P(TW / 2, ins / 2), R = P(TW - ins, TH / 2), B = P(TW / 2, TH - ins / 2), L = P(ins, TH / 2);
  const dn = p => P(p.sx, p.sy + f.h);
  draw([L, B, dn(B), dn(L)], shade(f.color, -25));
  draw([B, R, dn(R), dn(B)], shade(f.color, -45));
  draw([T, R, B, L], shade(f.color, 15));
  el.appendChild(cv);
  entitiesEl.appendChild(el);
  // 타일 중심 기준으로 배치 (중심 = x+0.5, y+0.5)
  placeEntity(el, f.x + 0.5, f.y + 0.5);
}

/* ---------- 포켓몬 ---------- */
const monsters = [];

class Monster {
  constructor(data, tx, ty) {
    this.data = data;
    this.px = tx + 0.5;            // 실수 좌표(타일 중심 = +0.5)
    this.py = ty + 0.5;
    this.tile = [tx, ty];          // 현재(또는 도착 예정) 타일
    this.path = [];
    this.state = 'idle';
    this.timer = 0.5 + Math.random() * 2;
    this.speed = 1.2 + Math.random() * 0.5;   // 타일/초
    this.walkT = 0;
    this.facing = 'front';
    this.flip = Math.random() < 0.5 ? 1 : -1;

    this.el = document.createElement('div');
    this.el.className = 'entity mon';
    this.el.innerHTML = '<div class="shadow"></div><img alt=""><div class="label"></div>';
    this.img = this.el.querySelector('img');
    this.label = this.el.querySelector('.label');
    this.label.textContent = data.nameKo;
    this.img.src = data.sprites.frontAnimated || data.sprites.frontStatic;
    this.img.addEventListener('load', () => {
      this.label.style.bottom = `${this.img.naturalHeight * MON_SCALE + 6}px`;
    });
    this.el.addEventListener('click', e => {
      if (suppressClick) return;
      e.stopPropagation();
      showInfo(this);
    });
    entitiesEl.appendChild(this.el);
    this.render();
  }

  occupiedBy(x, y) {
    return monsters.some(m => m !== this && m.tile[0] === x && m.tile[1] === y);
  }

  /** BFS 로 가까운(최대 7칸) 아무 타일을 골라 경로 생성 */
  planWander() {
    const [sx, sy] = this.tile;
    const prev = new Map([[key(sx, sy), null]]);
    const dist = new Map([[key(sx, sy), 0]]);
    const queue = [[sx, sy]];
    const candidates = [];
    while (queue.length) {
      const [x, y] = queue.shift();
      const d = dist.get(key(x, y));
      if (d >= 2 && !this.occupiedBy(x, y)) candidates.push([x, y]);
      if (d >= 7) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (prev.has(k) || !canMove(x, y, nx, ny)) continue;
        prev.set(k, [x, y]);
        dist.set(k, d + 1);
        queue.push([nx, ny]);
      }
    }
    if (!candidates.length) return [];
    let cur = candidates[Math.floor(Math.random() * candidates.length)];
    const path = [];
    while (cur && !(cur[0] === sx && cur[1] === sy)) {
      path.unshift(cur);
      cur = prev.get(key(...cur));
    }
    return path;
  }

  /** 이동 방향에 맞춰 앞/뒤 스프라이트와 좌우 반전 결정 */
  faceToward(dx, dy) {
    const screenX = dx - dy;      // +면 화면 오른쪽
    const screenY = dx + dy;      // +면 화면 아래(관람자 쪽)
    const facing = screenY > 0 ? 'front' : screenY < 0 ? 'back' : this.facing;
    if (facing !== this.facing) {
      this.facing = facing;
      const s = this.data.sprites;
      this.img.src = facing === 'front'
        ? (s.frontAnimated || s.frontStatic)
        : (s.backAnimated || s.frontAnimated || s.frontStatic);
    }
    // 앞모습 스프라이트는 왼쪽을, 뒷모습은 오른쪽을 보고 있음
    if (screenX !== 0) {
      if (this.facing === 'front') this.flip = screenX > 0 ? -1 : 1;
      else this.flip = screenX < 0 ? -1 : 1;
    }
  }

  update(dt) {
    if (this.state === 'idle') {
      this.timer -= dt;
      if (Math.random() < dt * 0.15) this.flip *= -1;   // 가끔 두리번
      if (this.timer <= 0) {
        this.path = this.planWander();
        if (this.path.length) {
          this.state = 'walk';
          this.startSegment();
        } else {
          this.timer = 1;
        }
      }
    } else {
      const [tx, ty] = this.path[0];
      const gx = tx + 0.5, gy = ty + 0.5;
      const dx = gx - this.px, dy = gy - this.py;
      const len = Math.hypot(dx, dy);
      const step = this.speed * dt;
      this.walkT += dt;
      if (len <= step) {
        this.px = gx; this.py = gy;
        this.path.shift();
        if (this.path.length) {
          this.startSegment();
        } else {
          this.state = 'idle';
          this.walkT = 0;
          this.timer = 1.5 + Math.random() * 4;
        }
      } else {
        this.px += dx / len * step;
        this.py += dy / len * step;
      }
    }
    this.render();
  }

  startSegment() {
    const [tx, ty] = this.path[0];
    this.tile = [tx, ty];   // 다음 칸을 미리 점유 → 다른 포켓몬과 겹치지 않음
    this.faceToward(tx + 0.5 - this.px, ty + 0.5 - this.py);
  }

  render() {
    placeEntity(this.el, this.px, this.py);
    const bob = this.state === 'walk' ? Math.abs(Math.sin(this.walkT * 9)) * 3 : 0;
    this.img.style.transform =
      `translate(-50%, ${-bob}px) scale(${this.flip * MON_SCALE}, ${MON_SCALE})`;
  }
}

/* ---------- 정보 패널 ---------- */
const TYPE_COLORS = {
  '노말': '#9fa19f', '불꽃': '#e62829', '물': '#2980ef', '풀': '#3fa129', '전기': '#d8b400',
  '얼음': '#3dcef3', '격투': '#ff8000', '독': '#9141cb', '땅': '#915121', '비행': '#81b9ef',
  '에스퍼': '#ef4179', '벌레': '#91a119', '바위': '#afa981', '고스트': '#704170',
  '드래곤': '#5060e1', '악': '#624d4e', '강철': '#60a1b8', '페어리': '#ef70ef',
};
let selected = null;

function showInfo(mon) {
  const d = mon.data;
  if (selected) selected.el.classList.remove('selected');
  selected = mon;
  mon.el.classList.add('selected');
  document.getElementById('info-img').src = d.sprites.frontAnimated || d.sprites.frontStatic;
  document.getElementById('info-no').textContent = `No.${String(d.id).padStart(4, '0')}`;
  document.getElementById('info-name').textContent = d.nameKo;
  document.getElementById('info-genus').textContent = d.genusKo;
  document.getElementById('info-types').innerHTML = d.typesKo
    .map(t => `<span class="type-chip" style="background:${TYPE_COLORS[t] || '#888'}">${t}</span>`)
    .join('');
  document.getElementById('info-height').textContent = `${d.heightM} m`;
  document.getElementById('info-weight').textContent = `${d.weightKg} kg`;
  document.getElementById('info-flavor').textContent = d.flavorTextKo;
  document.getElementById('info').classList.remove('hidden');
}
function hideInfo() {
  if (selected) selected.el.classList.remove('selected');
  selected = null;
  document.getElementById('info').classList.add('hidden');
}
document.getElementById('info-close').addEventListener('click', hideInfo);

/* ---------- 확대/축소, 드래그 이동 ---------- */
const viewport = document.getElementById('viewport');
const stage = document.getElementById('stage');
stage.style.width = `${STAGE_W}px`;
stage.style.height = `${STAGE_H}px`;
let zoom = 1, panX = 0, panY = 0, suppressClick = false;

function applyView() {
  stage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
}
function fitView() {
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  zoom = Math.min(vw / STAGE_W, vh / STAGE_H) * 0.95;
  panX = (vw - STAGE_W * zoom) / 2;
  panY = (vh - STAGE_H * zoom) / 2;
  applyView();
}
viewport.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const next = Math.min(4, Math.max(0.4, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
  panX = mx - (mx - panX) * next / zoom;
  panY = my - (my - panY) * next / zoom;
  zoom = next;
  applyView();
}, { passive: false });

let drag = null;
viewport.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, y: e.clientY, px: panX, py: panY, moved: false };
});
window.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) > 4) {
    drag.moved = true;
    viewport.classList.add('dragging');
  }
  if (drag.moved) {
    panX = drag.px + dx; panY = drag.py + dy;
    applyView();
  }
});
window.addEventListener('pointerup', () => {
  if (!drag) return;
  suppressClick = drag.moved;
  setTimeout(() => (suppressClick = false), 0);
  viewport.classList.remove('dragging');
  drag = null;
});
viewport.addEventListener('click', () => { if (!suppressClick) hideInfo(); });
window.addEventListener('resize', fitView);

/* ---------- 시작 ---------- */
function randomFreeTile() {
  for (let i = 0; i < 500; i++) {
    const x = Math.floor(Math.random() * GRID_W), y = Math.floor(Math.random() * GRID_H);
    if (canStand(x, y) && !monsters.some(m => m.tile[0] === x && m.tile[1] === y)) return [x, y];
  }
  return [3, 3];
}

async function main() {
  drawBackground();
  FURNITURE.forEach(createFurniture);
  fitView();

  // ?ids=1,4,7 처럼 여러 마리 가능. 기본은 이상해씨(1)
  const ids = (new URLSearchParams(location.search).get('ids') || '1')
    .split(',').map(s => parseInt(s, 10)).filter(n => n > 0);

  for (const id of ids) {
    try {
      const res = await fetch(`/api/pokemon/${id}`);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      monsters.push(new Monster(data, ...randomFreeTile()));
    } catch (err) {
      console.error(`포켓몬 ${id} 불러오기 실패`, err);
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    monsters.forEach(m => m.update(dt));
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main();
