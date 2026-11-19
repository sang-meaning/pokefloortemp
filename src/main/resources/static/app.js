/* =========================================================
 * PokeFloor - 떠 있는 도트 바이옴 섬(박스) 위를 돌아다니는 포켓몬
 *
 * 좌표계
 *  - 박스: 박스 격자 (bx, by). 메인 박스 = (0, 0). 박스 하나 = 8×8 타일
 *  - 월드 타일 (wx, wy) = (bx*STRIDE + lx, by*STRIDE + ly). 박스 사이에 2칸 틈
 *  - 화면 좌표 (sx, sy) = iso(wx, wy). x 는 화면 오른쪽 아래, y 는 왼쪽 아래
 *  - 깊이(앞뒤 순서) = wx + wy. 클수록 관람자에게 가까움 → z-index 큼
 * ========================================================= */

const TW = 64;                 // 타일 가로 (2:1 도트 아이소메트릭)
const TH = 32;                 // 타일 세로
const PX = 2;                  // 바닥 도트 1칸 = 화면 2px
const N = 8;                   // 박스 한 변 타일 수
const STRIDE = N + 2;          // 박스 간격 (2칸 틈 → 떠 있는 섬처럼)
const SLAB = 28;               // 섬 두께(px)
const PROP_SCALE = 3;          // 16px 소품 → 48px
const MON_SCALE = 1;           // 포켓몬 GIF 배율
const MARGIN = 48;
const TOP_PAD = 150;           // 위쪽 여백 (키 큰 소품·포켓몬)

/* ---------- 바이옴 도트 팔레트 ----------
 * top: 바닥 두 톤(체크), speck: 잔무늬, light: 밝은 점, side: [왼쪽 면, 오른쪽 면], rim: 옆면 윗줄
 * deco(i, j, h, t): 특수 무늬 (null 이면 없음) */
const BIOME_STYLE = {
  MEADOW: {
    top: ['#7ec850', '#79c34c'], speck: '#63aa3c', light: '#9ce06c', rim: '#5d9e37',
    side: ['#8a5a36', '#6f4529'],
    deco: (i, j, h) => (h < 0.004 ? '#fff6c8' : h < 0.007 ? '#ffd84a' : null),
  },
  FOREST: {
    top: ['#4f9a40', '#4b953c'], speck: '#3a7a30', light: '#66b250', rim: '#3a7a30',
    side: ['#7a4e2e', '#5f3b22'],
    deco: (i, j, h) => (h < 0.01 ? '#8a6a2f' : h < 0.013 ? '#c9533a' : null),
  },
  CAVE: {
    top: ['#7b7169', '#766c64'], speck: '#5f564f', light: '#958a80', rim: '#5f564f',
    side: ['#4f4842', '#3d3732'],
    deco: (i, j, h) => (h < 0.012 ? '#a59a8f' : null),
  },
  VOLCANO: {
    top: ['#3f3637', '#3a3132'], speck: '#2b2425', light: '#55494a', rim: '#2b2425',
    side: ['#2e2627', '#231d1e'],
    deco: (i, j, h, t) => {
      // 몇몇 줄을 따라 구불구불 흐르는 용암 (타일을 이어서 강처럼)
      if (t.row % 3 === 1) {
        const off = Math.abs(t.fy - 0.5 - 0.22 * Math.sin((t.wx + t.fx) * 1.7 + t.wy));
        if (off < 0.07) return off < 0.035 ? '#ffb238' : '#ff6a1a';
        if (off < 0.12) return '#8a2a14';
      }
      return h < 0.005 ? '#ff6a1a' : null;
    },
  },
  SEA: {
    top: ['#3a8fd8', '#378ad1'], speck: '#2f7cc0', light: '#5aa8ec', rim: '#8fd3ff',
    side: ['#2b67a3', '#22548a'],
    deco: (i, j) => ((j + Math.floor(i / 7)) % 10 === 0 && i % 7 < 4 ? '#8fd3ff' : null),
  },
  DESERT: {
    top: ['#e9cf88', '#e4c980'], speck: '#d2b36e', light: '#f5e2a8', rim: '#cfa95e',
    side: ['#c08f4f', '#a2763c'],
    deco: (i, j) => ((j * 3 + Math.floor(i / 5)) % 17 === 0 ? '#d6b56c' : null),
  },
  SNOW: {
    top: ['#f2f7fc', '#ebf2f9'], speck: '#d5e2ef', light: '#ffffff', rim: '#ffffff',
    side: ['#a3c9e8', '#80abd0'],
    deco: (i, j, h) => (h < 0.006 ? '#bcd3ea' : null),
  },
  VILLAGE: {
    top: ['#c3b59b', '#bcae93'], speck: '#a99a7e', light: '#d3c6ad', rim: '#7ab84c',
    side: ['#8a7155', '#6e5942'],
    deco: (i, j) => {
      // 돌길: 4px 높이 줄, 8px 폭 벽돌, 줄마다 엇갈림
      const row = Math.floor(j / 4);
      if (j % 4 === 0 || (i + (row % 2) * 4) % 8 === 0) return '#968870';
      return null;
    },
  },
  GHOST: {
    top: ['#5e4e7a', '#594974'], speck: '#47395f', light: '#7a66a0', rim: '#3f3256',
    side: ['#3c2f4d', '#2e243c'],
    deco: (i, j, h) => (h < 0.004 ? '#b7f0e0' : h < 0.006 ? '#9a7fd0' : null),
  },
};
const styleOf = biome => BIOME_STYLE[biome] || BIOME_STYLE.MEADOW;

/* ---------- 월드 상태 ---------- */
let boxes = [];          // [{id, bx, by, biome, biomeName, emoji, main}]
let props = [];          // [{id, boxId, key, x, y, el}]
let PROP_INFO = {};      // props.json: key → {name, biomes, w, h}
let editGrid = false;    // 꾸미기 모드에서 타일 격자 표시

const boxById = id => boxes.find(b => b.id === id);
const boxAtGrid = (bx, by) => boxes.find(b => b.bx === bx && b.by === by);
const key = (x, y) => `${x},${y}`;
const toWorld = (box, lx, ly) => [box.bx * STRIDE + lx, box.by * STRIDE + ly];

/** 월드 타일 → {box, lx, ly} (박스 밖이면 null) */
function tileInfo(wx, wy) {
  const bx = Math.floor(wx / STRIDE), by = Math.floor(wy / STRIDE);
  const lx = wx - bx * STRIDE, ly = wy - by * STRIDE;
  if (lx >= N || ly >= N) return null;
  const box = boxAtGrid(bx, by);
  return box ? { box, lx, ly } : null;
}

/* ---------- 화면 크기 / 좌표 변환 (박스가 바뀌면 다시 계산) ---------- */
let OX = 0, OY = 0, STAGE_W = 0, STAGE_H = 0;
let bounds = { x0: 0, y0: 0, x1: N, y1: N };   // 월드 타일 범위 [x0, x1)

const iso = (x, y) => ({ sx: (x - y) * TW / 2 + OX, sy: (x + y) * TH / 2 + OY });

/** 화면(스테이지) 좌표 → 실수 월드 좌표 */
function unIso(sx, sy) {
  const u = (sx - OX) / (TW / 2), v = (sy - OY) / (TH / 2);
  return { x: (u + v) / 2, y: (v - u) / 2 };
}

function computeLayout() {
  const bxs = boxes.map(b => b.bx), bys = boxes.map(b => b.by);
  bounds = {
    x0: Math.min(...bxs) * STRIDE, y0: Math.min(...bys) * STRIDE,
    x1: Math.max(...bxs) * STRIDE + N, y1: Math.max(...bys) * STRIDE + N,
  };
  const { x0, y0, x1, y1 } = bounds;
  OX = (y1 - x0) * TW / 2 + MARGIN;
  OY = -(x0 + y0) * TH / 2 + TOP_PAD;
  STAGE_W = Math.ceil(((x1 - x0) + (y1 - y0)) * TW / 2 + MARGIN * 2);
  STAGE_H = Math.ceil(((x1 + y1) - (x0 + y0)) * TH / 2 + TOP_PAD + SLAB + MARGIN);
  // 짝수로 맞춰 도트가 반 칸 어긋나지 않게
  OX = Math.round(OX / PX) * PX;
  OY = Math.round(OY / PX) * PX;
  STAGE_W += STAGE_W % PX;
  STAGE_H += STAGE_H % PX;
}

/* ---------- 바닥 그리기: 저해상도 캔버스에 도트 하나하나 칠하고 2배 확대 ---------- */
const floorCanvas = document.getElementById('floor');
const ctx = floorCanvas.getContext('2d');

// 결정적 난수 (같은 좌표는 항상 같은 무늬)
function hash2(a, b) {
  let h = (a * 374761393 + b * 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const RGB = {};
const rgbOf = hex => RGB[hex] || (RGB[hex] = hexRgb(hex));

function topColor(box, wx, wy, fx, fy, i, j) {
  const st = styleOf(box.biome);
  const h = hash2(i, j);
  const tileH = Math.floor(hash2(wx * 31, wy * 17) * 1000);
  const deco = st.deco && st.deco(i, j, h, { fx, fy, h: tileH, wx, wy, row: wy - box.by * STRIDE });
  if (deco) return deco;
  if (h < 0.06) return st.speck;
  if (h > 0.975) return st.light;
  let c = st.top[(wx + wy) & 1];
  // 섬 가장자리(앞쪽 두 변) 한 줄 밝게 → 입체감
  const lx = wx - box.bx * STRIDE, ly = wy - box.by * STRIDE;
  if ((ly === N - 1 && fy > 0.94) || (lx === N - 1 && fx > 0.94)) c = st.light;
  if (editGrid && (fx < 0.035 || fy < 0.035)) c = st.speck;
  return c;
}

function drawFloor() {
  floorCanvas.width = STAGE_W / PX;
  floorCanvas.height = STAGE_H / PX;
  floorCanvas.style.width = `${STAGE_W}px`;
  floorCanvas.style.height = `${STAGE_H}px`;
  const W = floorCanvas.width, H = floorCanvas.height;
  const img = ctx.createImageData(W, H);
  const data = img.data;
  const slabPx = SLAB / PX;

  const put = (hex, k) => {
    const [r, g, b] = rgbOf(hex);
    data[k] = r; data[k + 1] = g; data[k + 2] = b; data[k + 3] = 255;
  };

  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = (j * W + i) * 4;
      const sx = i * PX + PX / 2, sy = j * PX + PX / 2;
      // 1) 윗면
      let p = unIso(sx, sy);
      let wx = Math.floor(p.x), wy = Math.floor(p.y);
      let t = tileInfo(wx, wy);
      if (t) {
        put(topColor(t.box, wx, wy, p.x - wx, p.y - wy, i, j), k);
        continue;
      }
      // 2) 옆면: 위로 올라가며 처음 만나는 섬 타일 = 그 섬의 앞쪽 가장자리 → 옆면
      for (let d = 1; d <= slabPx; d++) {
        p = unIso(sx, sy - d * PX);
        wx = Math.floor(p.x); wy = Math.floor(p.y);
        t = tileInfo(wx, wy);
        if (!t) continue;
        // 섬 앞 꼭짓점보다 왼쪽이면 왼쪽 면, 오른쪽이면 오른쪽 면
        const corner = iso(...toWorld(t.box, N, N));
        const leftFace = sx < corner.sx;
        const st = styleOf(t.box.biome);
        let c = st.side[leftFace ? 0 : 1];
        if (d <= 2) c = st.rim;                                        // 윗줄: 풀/눈 테두리
        else if (d > slabPx - 2 && (i + j) % 3 === 0) break;           // 아래쪽 들쭉날쭉
        else if (hash2(i, j) < 0.08) c = st.side[leftFace ? 1 : 0];    // 흙 알갱이
        put(c, k);
        break;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* ---------- 엔티티 레이어 (소품, 포켓몬, 박스 이름) ---------- */
const entitiesEl = document.getElementById('entities');
const zIndexOf = depth => Math.round(depth * 100) + 1000;

function placeEntity(el, px, py) {
  const p = iso(px, py);
  el.style.left = `${p.sx}px`;
  el.style.top = `${p.sy}px`;
  el.style.zIndex = zIndexOf(px + py);
}

/* ---------- 소품 ---------- */
const blocked = new Set();   // 소품·아이템이 놓인 월드 타일

async function loadPropInfo() {
  const list = await (await fetch('/assets/px/props.json')).json();
  PROP_INFO = Object.fromEntries(list.map(p => [p.key, p]));
}

/** 박스 안 좌표(boxId, x, y)를 가진 것 → 월드 타일 */
function propWorld(p) {
  const b = boxById(p.boxId);
  return b ? toWorld(b, p.x, p.y) : null;
}

/** 소품 요소를 만들거나 위치 갱신 */
function renderProp(p) {
  const w = propWorld(p);
  const info = PROP_INFO[p.key];
  if (!w || !info) return;
  if (!p.el) {
    p.el = document.createElement('div');
    p.el.className = 'entity prop';
    p.el.innerHTML = '<img alt="" draggable="false">';
    entitiesEl.appendChild(p.el);
  }
  const img = p.el.firstChild;
  if (!img.src.endsWith(`/${p.key}.png`)) img.src = `/assets/px/${p.key}.png`;
  img.alt = info.name;
  img.style.width = `${info.w * PROP_SCALE}px`;
  img.style.height = `${info.h * PROP_SCALE}px`;
  placeEntity(p.el, w[0] + 0.5, w[1] + 0.5);
  p.el.style.top = `${parseFloat(p.el.style.top) + 6}px`;   // 발이 타일 중심보다 살짝 앞
}

let placedItems = [];   // items.js 에서 채움
let renderPlacedItem = () => {};

function rebuildBlocked() {
  blocked.clear();
  [...props, ...placedItems].forEach(p => { const w = propWorld(p); if (w) blocked.add(key(...w)); });
}

function canStand(wx, wy) {
  return !!tileInfo(wx, wy) && !blocked.has(key(wx, wy));
}
function canMove(x1, y1, x2, y2) {
  if (!canStand(x2, y2)) return false;
  return tileInfo(x1, y1)?.box === tileInfo(x2, y2).box;   // 박스 밖으로는 못 나감
}

/* ---------- 박스 이름표 ---------- */
let boxLabels = [];
function renderBoxLabels() {
  boxLabels.forEach(el => el.remove());
  boxLabels = boxes.map(b => {
    const el = document.createElement('button');
    el.className = 'box-label';
    el.textContent = `${b.emoji} ${b.biomeName}${b.main ? ' · 메인' : ''}`;
    const [wx, wy] = toWorld(b, N, N);
    const p = iso(wx, wy);
    el.style.left = `${p.sx}px`;
    el.style.top = `${p.sy + SLAB + 6}px`;
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.addEventListener('click', e => { e.stopPropagation(); focusBox(b); });
    entitiesEl.appendChild(el);
    return el;
  });
}

/* ---------- 포켓몬 ---------- */
const monsters = [];

class Monster {
  constructor(data, wx, wy) {
    this.data = data;
    this.px = wx + 0.5;            // 실수 좌표(타일 중심 = +0.5)
    this.py = wy + 0.5;
    this.tile = [wx, wy];          // 현재(또는 도착 예정) 타일
    this.path = [];
    this.state = 'idle';
    this.timer = 0.5 + Math.random() * 2;
    this.speed = 1.1 + Math.random() * 0.5;   // 타일/초
    this.walkT = 0;
    this.facing = 'front';
    this.flip = Math.random() < 0.5 ? 1 : -1;
    this.held = false;             // 드래그 중이면 true (dragmon.js)

    this.el = document.createElement('div');
    this.el.className = 'entity mon';
    this.el.innerHTML = '<div class="shadow"></div><img alt="" draggable="false"><div class="label"></div>';
    this.img = this.el.querySelector('img');
    this.label = this.el.querySelector('.label');
    this.label.textContent = data.nameKo;
    this.owned = null;   // 획득 정보(별명, 박스). room.js 에서 채움
    this.img.src = data.sprites.frontAnimated || data.sprites.frontStatic;
    this.img.addEventListener('load', () => {
      this.label.style.bottom = `${this.img.naturalHeight * MON_SCALE + 4}px`;
    });
    this.el.addEventListener('click', e => {
      if (suppressClick) return;
      e.stopPropagation();
      showInfo(this);
    });
    entitiesEl.appendChild(this.el);
    this.render();
  }

  get box() { return tileInfo(...this.tile)?.box || null; }

  occupiedBy(x, y) {
    return monsters.some(m => m !== this && m.tile[0] === x && m.tile[1] === y);
  }

  /** 지금 칸이 막혔으면(소품이 놓임) 같은 박스의 가까운 빈 칸으로 */
  unstick() {
    if (canStand(...this.tile)) return;
    const box = this.box || boxById(this.owned?.boxId);
    const t = box && nearestFreeTile(box, this.tile, this);
    if (t) this.warp(...t);
  }

  warp(wx, wy) {
    this.tile = [wx, wy];
    this.px = wx + 0.5;
    this.py = wy + 0.5;
    this.path = [];
    this.state = 'idle';
    this.timer = 1 + Math.random() * 2;
    this.render();
  }

  /** BFS 로 같은 박스 안 가까운(최대 6칸) 아무 타일을 골라 경로 생성 */
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
      if (d >= 6) continue;
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
    if (this.held) return;
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
        // 걷는 도중 앞 칸에 소품이 놓이면 멈춤
        if (this.path.length && canStand(...this.path[0])) {
          this.startSegment();
        } else {
          this.path = [];
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
    if (this.held) return;
    placeEntity(this.el, this.px, this.py);
    const bob = this.state === 'walk' ? Math.abs(Math.sin(this.walkT * 9)) * 3 : 0;
    this.img.style.transform =
      `translate(-50%, ${-bob}px) scale(${this.flip * MON_SCALE}, ${MON_SCALE})`;
  }
}

/** 박스 안에서 from 에 가장 가까운 빈 칸 (소품·다른 포켓몬 없는 칸) */
function nearestFreeTile(box, from, ignoreMon) {
  let best = null, bestD = Infinity;
  for (let ly = 0; ly < N; ly++) {
    for (let lx = 0; lx < N; lx++) {
      const [wx, wy] = toWorld(box, lx, ly);
      if (!canStand(wx, wy)) continue;
      if (monsters.some(m => m !== ignoreMon && m.tile[0] === wx && m.tile[1] === wy)) continue;
      const d = Math.hypot(wx - from[0], wy - from[1]);
      if (d < bestD) { bestD = d; best = [wx, wy]; }
    }
  }
  return best;
}

/* ---------- 정보 패널 ---------- */
let selected = null;

function showInfo(mon) {
  const d = mon.data;
  const owned = mon.owned;
  if (selected) selected.el.classList.remove('selected');
  selected = mon;
  mon.el.classList.add('selected');
  document.getElementById('info-img').src =
    d.sprites.officialArtwork || d.sprites.frontAnimated || d.sprites.frontStatic;
  document.getElementById('info-no').textContent = `No.${String(d.id).padStart(4, '0')}`;
  document.getElementById('info-name').textContent = displayName(owned);
  document.getElementById('info-genus').textContent =
    owned && owned.nickname ? `${d.nameKo} · ${d.genusKo}` : d.genusKo;
  document.getElementById('info-types').innerHTML = typeChips(d.typesKo);
  document.getElementById('info-height').textContent = `${d.heightM} m`;
  document.getElementById('info-weight').textContent = `${d.weightKg} kg`;
  document.getElementById('info-flavor').textContent = d.flavorTextKo;
  const box = mon.box;
  document.getElementById('info-where').textContent = box ? `${box.emoji} ${box.biomeName} 박스에서 지내요` : '';
  document.getElementById('info').classList.remove('hidden');
}
function hideInfo() {
  if (selected) selected.el.classList.remove('selected');
  selected = null;
  document.getElementById('info').classList.add('hidden');
}
document.getElementById('info-close').addEventListener('click', hideInfo);

/* ---------- 확대/축소, 드래그로 화면 이동 ---------- */
const viewport = document.getElementById('viewport');
const stage = document.getElementById('stage');
let zoom = 1, panX = 0, panY = 0, suppressClick = false;

function applyView() {
  stage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  updateCurrentBox();
}

/** 박스 중심을 화면 가운데로 */
function focusBox(box, z) {
  if (z) zoom = z;
  const [wx, wy] = toWorld(box, N / 2, N / 2);
  const p = iso(wx, wy);
  panX = viewport.clientWidth / 2 - p.sx * zoom;
  panY = viewport.clientHeight / 2 - (p.sy - 20) * zoom;
  applyView();
}

function fitView() {
  const main = boxes.find(b => b.main) || boxes[0];
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  // 박스 하나가 화면에 넉넉히 들어오는 배율 (도트가 고르게 보이게 0.5 단위)
  const fit = Math.min(vw / ((N + 3) * TW), vh / ((N + 5) * TH + SLAB));
  focusBox(main, Math.max(0.5, Math.min(3, Math.floor(fit * 2) / 2)));
}

viewport.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const next = Math.min(4, Math.max(0.3, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
  panX = mx - (mx - panX) * next / zoom;
  panY = my - (my - panY) * next / zoom;
  zoom = next;
  applyView();
}, { passive: false });

// 포켓몬·소품을 끄는 핸들러는 pointerdown 에서 stopPropagation → 여기까지 오지 않음
let drag = null;
viewport.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
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
window.addEventListener('resize', applyView);

/** 화면(클라이언트) 좌표 → 실수 월드 좌표 */
function clientToWorld(cx, cy) {
  const rect = viewport.getBoundingClientRect();
  return unIso((cx - rect.left - panX) / zoom, (cy - rect.top - panY) / zoom);
}

/* ---------- 지금 보고 있는 박스 = 화면 가운데에 가장 가까운 박스 ---------- */
let currentBox = null;
const currentBoxListeners = [];

function updateCurrentBox() {
  if (!boxes.length) return;
  const rect = viewport.getBoundingClientRect();
  const c = clientToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
  let best = null, bestD = Infinity;
  boxes.forEach(b => {
    const [wx, wy] = toWorld(b, N / 2, N / 2);
    const d = Math.hypot(wx - c.x, wy - c.y);
    if (d < bestD) { bestD = d; best = b; }
  });
  if (best !== currentBox) {
    currentBox = best;
    boxLabels.forEach((el, i) => el.classList.toggle('on', boxes[i] === best));
    currentBoxListeners.forEach(fn => fn(best));
  }
}

/* ---------- 월드 불러오기 / 다시 그리기 ---------- */
async function loadWorld() {
  const w = await api('/api/world');
  props.forEach(p => p.el?.remove());
  boxes = w.boxes;
  props = w.props;
  rebuildWorld();
}

/** 박스가 늘거나 줄었을 때: 화면 크기·바닥·모든 엔티티 위치를 다시 계산. 보던 화면은 그 자리 유지 */
function rebuildWorld() {
  const oldOX = OX, oldOY = OY, first = STAGE_W === 0;
  computeLayout();
  stage.style.width = `${STAGE_W}px`;
  stage.style.height = `${STAGE_H}px`;
  if (!first) {
    panX -= (OX - oldOX) * zoom;
    panY -= (OY - oldOY) * zoom;
  }
  drawFloor();
  props.forEach(renderProp);
  placedItems.forEach(renderPlacedItem);
  rebuildBlocked();
  renderBoxLabels();
  monsters.forEach(m => { m.unstick(); m.render(); });
  currentBox = null;
  applyView();
}

async function main() {
  await loadPropInfo();
  await loadWorld();
  fitView();

  if (typeof initItems === 'function') await initItems();   // items.js: 아이템·배지
  await initRoom();                                         // room.js: 포켓몬·인벤토리·박스 추가/삭제
  if (typeof initEditor === 'function') initEditor();       // editor.js: 꾸미기 모드
  if (typeof initMonDrag === 'function') initMonDrag();     // dragmon.js: 포켓몬 끌어서 옮기기

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
