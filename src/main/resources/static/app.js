/* =========================================================
 * PokeFloor - Floor796 스타일 아이소메트릭 방 + 배회하는 포켓몬
 *
 * 좌표계
 *  - 타일 좌표 (x, y): 바닥 격자. x는 화면 오른쪽 아래, y는 왼쪽 아래 방향
 *  - 화면 좌표 (sx, sy): iso() 로 변환
 *  - 깊이(앞뒤 순서) = x + y. 값이 클수록 관람자에게 가까움 → z-index 큼
 * ========================================================= */

/* Kenney Furniture Kit(CC0) 의 아이소메트릭 각도에 맞춤
 * 원본 바닥 타일 151×110 px → 세로/가로 비율 0.728 */
const KENNEY_TILE_W = 151;
const TW = 96;                       // 타일 가로 폭 (마름모)
const TH = 70;                       // 타일 세로 폭 (= TW × 0.728)
// Kenney 바닥 1칸 = 약 2m → 우리 타일 2×2 칸에 해당하도록 2배
const KS = (TW / KENNEY_TILE_W) * 2; // Kenney 이미지 배율
const WALL_H = 140;                  // 바깥 벽 높이(여백 계산용)
const RAIL_H = 14;                   // 방 사이 유리 칸막이 높이
const SLAB = 16;                     // 바닥 두께
const MARGIN = 40;
const MON_SCALE = 1.5;               // 포켓몬 스프라이트 확대 배율
// 그림 스타일: 기본 = 원본 Kenney 렌더(smooth), ?style=pixel 로 도트 변환판과 비교
const PARAMS = new URLSearchParams(location.search);
const STYLE = PARAMS.get('style') === 'pixel' ? 'pixel' : 'smooth';
// 포켓몬 이미지: 기본 = 움직이는 GIF, ?mon=home 이면 고해상도 HOME 3D 렌더(정지 이미지 + 코드 애니메이션)
const MON_MODE = PARAMS.get('mon') === 'home' ? 'home' : 'gif';
const PX = 2;                        // 도트 1개 = 화면 2px (바닥·벽·가구 공통)
const ASSET = STYLE === 'pixel' ? '/assets/kenney-pixel/' : '/assets/kenney/';
const SPR = STYLE === 'pixel' ? PX : KS;   // manifest 좌표 → 화면 px 배율

/* ---------- 방(박스) 정의: 나중에 DB에서 받아올 부분 ---------- */
const ROOMS = [
  { id: 'A', x: 0, y: 0, w: 7, h: 6, name: '연구실', tile: ['#d9c7a5', '#cfbb97'] },
  { id: 'B', x: 7, y: 0, w: 7, h: 6, name: '거실',   tile: ['#b9d39f', '#adc992'] },
  { id: 'C', x: 0, y: 6, w: 7, h: 6, name: '침실',   tile: ['#c9d6e8', '#bccbe0'] },
  { id: 'D', x: 7, y: 6, w: 7, h: 6, name: '부엌',   tile: ['#e8e2d6', '#ddd5c6'] },
];

// 방과 방 사이 문: 인접한 두 타일 사이를 통과 가능하게 함
const DOORS = [
  [[6, 3], [7, 3]],     // A ↔ B
  [[4, 5], [4, 6]],     // A ↔ C
  [[12, 5], [12, 6]],   // B ↔ D
  [[6, 9], [7, 9]],     // C ↔ D
];

// 바깥 벽 중 창문이 있는 칸 (벽 이미지 1장 = 타일 2칸, 시작 타일 번호로 지정)
const WINDOWS = { north: [2, 10], west: [2, 8] };

/* 가구 (Kenney Furniture Kit, CC0)
 *  sprite : assets/kenney/ 의 파일명 (방향 _SE/_SW/_NE/_NW)
 *  x, y   : 놓을 타일 (큰 가구는 이 타일에서 오른쪽/아래로 차지)
 *  snap   : 'N' = 뒤쪽(북쪽) 벽에 붙이기, 'W' = 왼쪽(서쪽) 벽에 붙이기
 *  flat   : 바닥 깔개(러그) → 위로 걸어다닐 수 있고 항상 맨 아래
 *  lift   : 다른 가구 위에 올릴 때 높이(px, 원본 기준)
 *  name   : 가구 이름 */
const FURNITURE = [
  // A 연구실
  { sprite: 'bookcaseOpen_SW',        x: 1,  y: 0, snap: 'N', name: '책장' },
  { sprite: 'bookcaseClosedWide_SW',  x: 2,  y: 0, snap: 'N', name: '책장' },
  { sprite: 'pottedPlant_SW',         x: 6,  y: 0, snap: 'N', name: '화분' },
  { sprite: 'desk_SE',                x: 0,  y: 2, snap: 'W', name: '책상' },
  { sprite: 'computerScreen_SE',      x: 0,  y: 2, snap: 'W', lift: 46, name: '모니터' },
  { sprite: 'chairDesk_NW',           x: 2,  y: 2, name: '의자' },
  { sprite: 'lampRoundFloor_SE',      x: 0,  y: 5, snap: 'W', name: '스탠드' },

  // B 거실
  { sprite: 'rugRectangle_SW',        x: 9,  y: 2, flat: true, name: '러그' },
  { sprite: 'loungeSofa_SW',          x: 9,  y: 0, snap: 'N', name: '소파' },
  { sprite: 'tableCoffee_SW',         x: 9,  y: 2, name: '커피 테이블' },
  { sprite: 'cabinetTelevision_NE',   x: 9,  y: 4, name: 'TV 장' },
  { sprite: 'televisionModern_NE',    x: 9,  y: 4, lift: 30, name: 'TV' },
  { sprite: 'loungeChair_SE',         x: 7,  y: 1, name: '라운지 체어' },
  { sprite: 'lampRoundFloor_SW',      x: 12, y: 0, snap: 'N', name: '스탠드' },
  { sprite: 'pottedPlant_SW',         x: 13, y: 0, snap: 'N', name: '화분' },

  // C 침실
  { sprite: 'rugRound_SE',            x: 3,  y: 9, flat: true, name: '러그' },
  { sprite: 'bedDouble_SE',           x: 0,  y: 7, snap: 'W', name: '침대' },
  { sprite: 'cabinetBedDrawerTable_SE', x: 0, y: 6, snap: 'W', name: '협탁' },
  { sprite: 'bookcaseOpenLow_SE',     x: 0,  y: 10, snap: 'W', name: '낮은 책장' },
  { sprite: 'bear_SE',                x: 4,  y: 10, name: '곰인형' },
  { sprite: 'pottedPlant_SE',         x: 6,  y: 11, name: '화분' },

  // D 부엌 (뒤쪽 유리벽에 붙여서)
  { sprite: 'kitchenFridge_SW',       x: 7,  y: 6, snap: 'N', name: '냉장고' },
  { sprite: 'kitchenStove_SW',        x: 8,  y: 6, snap: 'N', name: '가스레인지' },
  { sprite: 'kitchenSink_SW',         x: 9,  y: 6, snap: 'N', name: '싱크대' },
  { sprite: 'kitchenCabinet_SW',      x: 10, y: 6, snap: 'N', name: '수납장' },
  { sprite: 'tableRound_SE',          x: 9,  y: 9, name: '식탁' },
  { sprite: 'chair_SW',               x: 9,  y: 8, name: '의자' },
  { sprite: 'chair_NE',               x: 9,  y: 10, name: '의자' },
  { sprite: 'cardboardBoxClosed_SE',  x: 13, y: 11, name: '상자' },
  { sprite: 'cardboardBoxOpen_SE',    x: 12, y: 11, name: '상자' },
  { sprite: 'trashcan_SE',            x: 13, y: 8, name: '휴지통' },
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
const blocked = new Set(FURNITURE.filter(f => !f.flat).map(f => key(f.x, f.y)));
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
const ctx = floorCanvas.getContext('2d');
if (STYLE === 'pixel') {
  // 낮은 해상도로 그린 뒤 CSS로 확대 → 바닥/벽도 도트처럼 보임
  floorCanvas.width = Math.ceil(STAGE_W / PX);
  floorCanvas.height = Math.ceil(STAGE_H / PX);
  ctx.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0);
  ctx.imageSmoothingEnabled = false;
  document.body.classList.add('pixel');
} else {
  floorCanvas.width = STAGE_W;
  floorCanvas.height = STAGE_H;
}
floorCanvas.style.width = `${STAGE_W}px`;
floorCanvas.style.height = `${STAGE_H}px`;

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

/* ---------- Kenney 에셋 로드 ---------- */
// manifest.json: 각 이미지의 크기와 "바닥 앞 꼭짓점"(가장 아래 픽셀) 위치(ax, ay)
let MANIFEST = {};
const IMG = {};

async function loadAssets() {
  MANIFEST = await (await fetch(`${ASSET}manifest.json`)).json();
  await Promise.all(Object.keys(MANIFEST).map(name => new Promise(resolve => {
    const im = new Image();
    im.onload = im.onerror = resolve;
    im.src = `${ASSET}${name}.png`;
    IMG[name] = im;
  })));
}

/** 이미지의 기준점(ax, ay)을 화면 좌표 p 에 맞춰 캔버스에 그림 */
function drawSprite(name, p) {
  const m = MANIFEST[name];
  ctx.drawImage(IMG[name], p.sx - m.ax * SPR, p.sy - m.ay * SPR, m.w * SPR, m.h * SPR);
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

  // 3) 바깥 벽: Kenney 벽/창문 이미지 (먼 쪽부터 그림)
  for (let i = 0; i < GRID_W; i += 2) {       // 북쪽 벽 (y = 0), 오른쪽 위
    drawSprite(WINDOWS.north.includes(i) ? 'wallWindow_SW' : 'wall_SW', iso(i + 2, 0));
  }
  for (let j = 0; j < GRID_H; j += 2) {       // 서쪽 벽 (x = 0), 왼쪽 위
    drawSprite(WINDOWS.west.includes(j) ? 'wallWindow_SE' : 'wall_SE', iso(0, j + 2));
  }

  // 4) 방 사이 유리 칸막이 (문 자리는 비움)
  const glass = (a, b) => poly([a, b, up(b, RAIL_H), up(a, RAIL_H)],
    'rgba(200,230,255,0.35)', 'rgba(255,255,255,0.7)');
  ROOMS.forEach(r => {
    if (r.y > 0) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (!isDoorEdge(x, r.y - 1, x, r.y)) glass(iso(x, r.y), iso(x + 1, r.y));
      }
    }
    if (r.x > 0) {
      for (let y = r.y; y < r.y + r.h; y++) {
        if (!isDoorEdge(r.x - 1, y, r.x, y)) glass(iso(r.x, y), iso(r.x, y + 1));
      }
    }
  });

  // 5) 방 이름 (바닥 앞쪽 모서리)
  ctx.font = 'bold 16px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ROOMS.forEach(r => {
    const p = iso(r.x + r.w - 0.6, r.y + r.h - 0.6);
    ctx.fillText(r.name, p.sx, p.sy + 4);
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
  const m = MANIFEST[f.sprite];
  if (!m) { console.warn('에셋 없음', f.sprite); return; }

  // 이미지 폭으로 물체의 바닥 크기(타일 단위)를 추정: 앞 꼭짓점 기준 왼쪽 = x축, 오른쪽 = y축
  const perTile = (TW / 2) / SPR;             // 이미지에서 타일 1칸의 반폭(px)
  const fw = Math.min(2, m.ax / perTile);
  const fh = Math.min(2, (m.w - m.ax) / perTile);

  // 기본은 타일 중앙, snap 이면 벽 쪽으로 붙임
  let cx = f.x + 0.5, cy = f.y + 0.5;
  if (f.snap === 'N') cy = f.y + fh / 2 + 0.03;
  if (f.snap === 'W') cx = f.x + fw / 2 + 0.03;

  // 큰 가구는 여러 칸 차지 → 겹치는 타일 모두 통행 불가
  if (!f.flat) {
    for (let ty = Math.floor(cy - fh / 2 + 0.15); ty <= Math.floor(cy + fh / 2 - 0.15); ty++) {
      for (let tx = Math.floor(cx - fw / 2 + 0.15); tx <= Math.floor(cx + fw / 2 - 0.15); tx++) {
        blocked.add(key(tx, ty));
      }
    }
  }

  const front = iso(cx + fw / 2, cy + fh / 2);   // 물체 바닥의 앞 꼭짓점
  const lift = (f.lift || 0) * KS;

  const el = document.createElement('div');
  el.className = 'entity furniture';
  el.style.left = `${front.sx}px`;
  el.style.top = `${front.sy}px`;
  el.style.zIndex = f.flat ? 1 : zIndexOf(cx + cy + (f.lift ? 0.01 : 0));

  const img = document.createElement('img');
  img.src = `${ASSET}${f.sprite}.png`;
  img.alt = f.name;
  img.style.left = `${-m.ax * SPR}px`;
  img.style.top = `${-m.ay * SPR - lift}px`;
  img.style.width = `${m.w * SPR}px`;
  el.appendChild(img);
  entitiesEl.appendChild(el);
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
    this.owned = null;   // 획득 정보(별명 등). room.js 에서 채움
    this.hires = MON_MODE === 'home' && !!data.sprites.home;
    this.phase = Math.random() * 10;
    if (this.hires) {
      // 실제 키에 비례한 크기 (너무 작거나 크지 않게 제한)
      this.drawH = Math.max(60, Math.min(150, 55 + data.heightM * 50));
      this.img.classList.add('hires');
      this.img.style.height = `${this.drawH}px`;
      this.img.src = data.sprites.home;
      this.label.style.bottom = `${this.drawH + 6}px`;
    } else {
      this.img.src = data.sprites.frontAnimated || data.sprites.frontStatic;
      this.img.addEventListener('load', () => {
        this.label.style.bottom = `${this.img.naturalHeight * MON_SCALE + 6}px`;
      });
    }
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
    if (this.hires) return this.faceFlip(screenX);   // HOME 이미지는 앞모습만 있음
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

  faceFlip(screenX) {
    // HOME 렌더는 왼쪽 아래를 보고 있음 → 오른쪽으로 갈 때 반전
    if (screenX !== 0) this.flip = screenX > 0 ? -1 : 1;
  }

  update(dt) {
    this.phase += dt;
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
    const walking = this.state === 'walk';
    const bob = walking ? Math.abs(Math.sin(this.walkT * 9)) * (this.hires ? 5 : 3) : 0;
    if (this.hires) {
      // 정지 이미지라서 숨쉬기(살짝 늘었다 줄었다) + 걸을 때 통통 튀기 + 기울기로 생동감
      const breathe = Math.sin(this.phase * 3) * 0.025;
      const tilt = walking ? Math.sin(this.walkT * 9) * 4 : 0;
      this.img.style.transform =
        `translate(-50%, ${-bob}px) rotate(${tilt}deg) scale(${this.flip * (1 - breathe / 2)}, ${1 + breathe})`;
    } else {
      this.img.style.transform =
        `translate(-50%, ${-bob}px) scale(${this.flip * MON_SCALE}, ${MON_SCALE})`;
    }
  }
}

/* ---------- 정보 패널 ---------- */
// TYPE_COLORS 는 common.js
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
  await loadAssets();
  drawBackground();
  FURNITURE.forEach(createFurniture);
  fitView();

  // 내가 획득해서 방에 꺼내 둔 포켓몬 (room.js)
  await initRoom();

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
