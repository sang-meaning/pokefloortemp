/* =========================================================
 * 오늘의 던전 - 3분 서바이벌 + 관장 보스전 (캔버스 엔진)
 *
 *  0:00 강화 → 몰려오는 야생 포켓몬 → 1:00 강화 → 2:00 강화 → 3:00 정리, 보스 직전 강화
 *  → WARNING → 관장의 보스 (2페이즈) → 쓰러뜨리면 포획 화면 (dungeon.js)
 *
 *  파티 포켓몬은 첫 번째 타입에 따라 공격 방식이 정해지고 자동으로 공격.
 *  상성(TYPE_CHART)·치명타·강화가 피해에 반영.
 * ========================================================= */

const ARENA = 2400;            // 경기장 한 변 (월드 단위 = 화면 px × 배율)
const TILE = 32;
const RUN_TIME = 180;          // 보스까지 3분
const PICK_TIMES = [60, 120];  // 입장(0초)과 보스 직전은 따로
const ELITE_TIMES = [30, 75, 100, 140, 165];
const SWARM_TIMES = [50, 110, 160];

/* ---------- 강화 (각각 조금씩, 최대 중첩 수 있음) ---------- */
const UPGRADES = [
  { id: 'dmg', icon: '⚔', name: '공격력', desc: '모든 공격 피해 +10%', max: 3, apply: m => { m.dmg *= 1.10; } },
  { id: 'rate', icon: '⏩', name: '공격 속도', desc: '공격 간격 -10%', max: 3, apply: m => { m.rate *= 1.10; } },
  { id: 'area', icon: '◎', name: '범위', desc: '폭발·장판·궤도·빔 범위 +15%', max: 3, apply: m => { m.area *= 1.15; } },
  { id: 'extra', icon: '✚', name: '추가 발사', desc: '투사체·연쇄·궤도 수 +1', max: 2, apply: m => { m.extra += 1; } },
  { id: 'move', icon: '👟', name: '발 빠르게', desc: '이동 속도 +8%', max: 3, apply: m => { m.move *= 1.08; } },
  { id: 'maxhp', icon: '❤', name: '튼튼함', desc: '최대 체력 +12%, 체력 30% 회복', max: 3,
    apply: (m, g) => { g.player.maxHp *= 1.12; g.heal(g.player.maxHp * 0.3); } },
  { id: 'leech', icon: '🩸', name: '흡수', desc: '쓰러뜨릴 때마다 체력 +1', max: 3, apply: m => { m.leech += 1; } },
  { id: 'magnet', icon: '🧲', name: '자석', desc: '골드·구슬 줍는 범위 +40%', max: 2, apply: m => { m.magnet *= 1.4; } },
  { id: 'greed', icon: '💰', name: '욕심', desc: '줍는 골드 +15%', max: 3, apply: m => { m.gold *= 1.15; } },
  { id: 'crit', icon: '✦', name: '급소 노리기', desc: '치명타 확률 +8% (피해 1.5배)', max: 3, apply: m => { m.crit += 0.08; } },
  { id: 'armor', icon: '🛡', name: '단단해지기', desc: '받는 피해 -8%', max: 3, apply: m => { m.armor *= 0.92; } },
  { id: 'super', icon: '🎯', name: '상성 집중', desc: '효과가 굉장한 공격 +15%', max: 2, apply: m => { m.superEff *= 1.15; } },
];

const rand = (a, b) => a + Math.random() * (b - a);
const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const typeColor = t => TYPE_COLORS[t] || '#ddd';

class DungeonGame {
  constructor(start, canvas, hooks) {
    this.s = start;
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;              // onPick(cards, title), onBanner(text), onWarning(boss), onEnd(result), onHud(state)
    this.biome = start.biome.id;
    this.diff = start.difficulty;
    this.time = 0;                   // 생존 시간 (보스 전까지)
    this.clock = 0;                  // 연출용 전체 시간
    this.phase = 'loading';
    this.picks = 0;
    this.stacks = {};
    this.mods = { dmg: 1, rate: 1, area: 1, extra: 0, move: 1, leech: 0, magnet: 1, gold: 1, crit: 0.05, armor: 1, superEff: 1 };
    this.enemies = [];
    this.targetsList = [];
    this.shots = [];       // 내 투사체
    this.fx = [];          // 빔·지진·장판·베기 같은 공격 판정
    this.ebullets = [];    // 보스 탄
    this.teles = [];       // 보스 공격 예고
    this.coins = [];
    this.orbs = [];
    this.parts = [];
    this.texts = [];
    this.kills = 0;
    this.elites = 0;
    this.gold = 0;
    this.used = {};
    this.shake = 0;
    this.slowmo = 1;
    this.flash = 0;
    this.events = new Set();
    this.keys = new Set();
    this.joy = null;
    this.boss = null;
    this.arenaRing = null;
    this.spawnAcc = 0;

    // X아이템: 출격할 때 그 판 효과
    (start.brought || []).forEach(b => {
      if (b.use === 'BUFF_ATTACK') this.mods.dmg *= 1 + b.value / 100;
      if (b.use === 'BUFF_SPEED') { this.mods.rate *= 1 + b.value / 100; this.mods.move *= 1 + b.value / 100; }
      if (b.use === 'BUFF_DEFENSE') this.mods.armor *= 1 - b.value / 100;
    });
    this.potions = (start.brought || []).filter(b => b.use === 'HEAL').map(b => ({ ...b, left: b.qty }));

    const party = start.party;
    const hp = 50 + party.reduce((n, m) => n + m.combat.hp, 0) * 0.9;
    this.player = { x: ARENA / 2, y: ARENA / 2, hp, maxHp: hp, inv: 0, vx: 0, vy: 0, def: party.reduce((n, m) => n + m.combat.defense, 0) / party.length };
    this.trail = [];
    this.members = party.map((m, i) => {
      const types = m.owned.pokemon.typesKo;
      const skill = skillOf(m.owned.pokemon);     // 포켓몬 고유 기술 (dungeon-skills.js)
      const spd = m.combat.speed;
      if (skill.armor) this.mods.armor *= 1 - skill.armor;
      return {
        i, m, owned: m.owned, types, type: skill.t, pattern: skill.p, skill,
        color: typeColor(skill.t),
        x: ARENA / 2, y: ARENA / 2, flip: 1, cd: 0.4 + i * 0.25,
        dmg: 8 + m.combat.attack * 0.12,
        cdMul: clamp(1.25 - spd / 250, 0.75, 1.15),
        angle: i * 2,
        spr: null,
        sprites: spritesOf(m.owned),
      };
    });
  }

  /* ---------- 준비: 그림 불러오기, 바닥 그리기 ---------- */
  async load(progress) {
    const urls = [];
    this.members.forEach(mb => urls.push(mb.sprites.front));
    this.mobDefs = this.s.mobs.map(p => ({ p, types: p.typesKo }));
    this.mobDefs.forEach(d => urls.push(d.p.sprites.frontAnimated || d.p.sprites.frontStatic));
    const bossSpr = this.s.bossShiny ? this.s.boss.sprites.shinyAnimated : this.s.boss.sprites.frontAnimated;
    urls.push(bossSpr);
    let done = 0;
    const all = await Promise.all(urls.map(u => loadSprite(u).then(r => { progress?.(++done / (urls.length + 1)); return r; })));
    this.members.forEach((mb, i) => { mb.spr = all[i]; });
    this.mobDefs.forEach((d, i) => { d.spr = all[this.members.length + i]; });
    this.bossSpr = all[all.length - 1];
    // 이로치 몬스터용 그림은 필요할 때 받음
    this.mobDefs.forEach(d => { d.shinyUrl = d.p.sprites.shinyAnimated; });

    this.propList = (await (await fetch('/assets/px/props.json')).json())
      .filter(p => p.biomes.includes(this.biome.toLowerCase()));
    this.decor = [];
    const imgs = {};
    await Promise.all(this.propList.map(p => new Promise(res => {
      const im = new Image(); im.onload = im.onerror = res; im.src = `/assets/px/${p.key}.png`; imgs[p.key] = im;
    })));
    for (let i = 0; i < 90 && this.propList.length; i++) {
      const p = pickOne(this.propList);
      const x = rand(120, ARENA - 120), y = rand(120, ARENA - 120);
      if (Math.hypot(x - ARENA / 2, y - ARENA / 2) < 260) continue;
      this.decor.push({ img: imgs[p.key], x, y, w: p.w * 3, h: p.h * 3 });
    }
    this.decor.sort((a, b) => a.y - b.y);
    this.floor = this.paintFloor();
    progress?.(1);
    this.resize();
  }

  /** 바이옴 팔레트로 2px 도트 바닥 (내 박스와 같은 무늬, 위에서 본 모습) */
  paintFloor() {
    const S = 2, n = ARENA / S, T = TILE / S;
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const x = c.getContext('2d');
    const img = x.createImageData(n, n), d = img.data;
    const st = styleOf(this.biome);
    const rim = 3 * T;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const wx = Math.floor(i / T), wy = Math.floor(j / T);
        const fx = (i % T) / T, fy = (j % T) / T;
        const h = hash2(i, j);
        let col;
        const edge = Math.min(i, j, n - 1 - i, n - 1 - j);
        if (edge < rim) {
          // 경기장 가장자리: 섬 옆면 색으로 테두리
          col = edge < rim / 3 ? st.side[1] : edge < rim * 2 / 3 ? st.side[0] : st.rim;
          if (h < 0.1) col = st.side[(i + j) & 1];
        } else {
          const tileH = Math.floor(hash2(wx * 31, wy * 17) * 1000);
          col = st.deco && st.deco(i, j, h, { fx, fy, h: tileH, wx, wy, row: wy });
          if (!col) col = h < 0.06 ? st.speck : h > 0.975 ? st.light : st.top[(wx + wy) & 1];
        }
        const [r, g, b] = rgbOf(col);
        const k = (j * n + i) * 4;
        d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  resize() {
    // 도트 그림이라 화면 배율(레티나)을 따르지 않아도 됨 → 그리는 픽셀 수 1/4
    const dpr = 1;
    this.cv.width = Math.floor(innerWidth * dpr);
    this.cv.height = Math.floor(innerHeight * dpr);
    this.cv.style.width = `${innerWidth}px`;
    this.cv.style.height = `${innerHeight}px`;
    this.dpr = dpr;
    this.scale = Math.min(innerWidth / 1150, innerHeight / 720) * dpr;
    this.vignettes = {};
  }

  /** 화면 가장자리 어둡게 (크기·색별로 한 번만 그려 둠) */
  vignette(color) {
    const W = this.cv.width, H = this.cv.height, k = `${color}`;
    if (!this.vignettes[k]) {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, color);
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      this.vignettes[k] = c;
    }
    return this.vignettes[k];
  }

  /* ---------- 진행 ---------- */
  begin() {
    this.phase = 'play';
    this.offerPick('입장 강화', '이번 판에서 쓸 강화를 하나 골라요');
    let last = performance.now();
    const loop = now => {
      if (this.stopped) return;
      const raw = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!this.paused) this.update(raw);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  offerPick(title, sub) {
    const avail = UPGRADES.filter(u => (this.stacks[u.id] || 0) < u.max);
    const cards = [];
    while (cards.length < 3 && avail.length) cards.push(avail.splice(Math.floor(Math.random() * avail.length), 1)[0]);
    this.paused = true;
    this.picks++;
    this.hooks.onPick(cards.map(u => ({ ...u, stack: this.stacks[u.id] || 0 })), title, sub, id => {
      const u = UPGRADES.find(x => x.id === id);
      this.stacks[id] = (this.stacks[id] || 0) + 1;
      u.apply(this.mods, this);
      SFX.play('pick');
      this.burst(this.player.x, this.player.y, '#ffe680', 26, 220, 'star');
      this.paused = false;
      this.afterPick?.();
      this.afterPick = null;
    });
  }

  update(raw) {
    this.clock += raw;
    // 느린 화면(보스 처치·쓰러짐) 서서히 복귀
    this.slowmo += (1 - this.slowmo) * Math.min(1, raw * 1.2);
    const dt = raw * this.slowmo;
    this.shake = Math.max(0, this.shake - raw * 30);
    this.flash = Math.max(0, this.flash - raw * 2.5);

    this.refreshTargets();
    if (this.phase === 'play') {
      this.time += dt;
      this.timeline();
      this.spawn(dt);
    }
    if (this.phase !== 'dead' && this.phase !== 'end') this.movePlayer(dt);
    this.updateMembers(dt);
    this.updateEnemies(dt);
    if (this.boss) this.updateBoss(dt);
    this.updateShots(dt);
    this.updateFx(dt);
    this.updateEnemyBullets(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.hudTick = (this.hudTick || 0) - raw;
    if (this.hudTick <= 0) { this.hudTick = 0.1; this.hooks.onHud(this); }
  }

  timeline() {
    const t = this.time;
    if (this.picks === 1 && t >= PICK_TIMES[0]) this.offerPick('1분 강화', '잘 버티고 있어요! 하나 더');
    else if (this.picks === 2 && t >= PICK_TIMES[1]) this.offerPick('2분 강화', '이제부터 몬스터가 거세져요');
    SWARM_TIMES.forEach(st => {
      if (t >= st && !this.events.has(`sw${st}`)) {
        this.events.add(`sw${st}`);
        this.swarm();
      }
    });
    ELITE_TIMES.forEach(et => {
      if (t >= et && !this.events.has(`el${et}`)) {
        this.events.add(`el${et}`);
        this.spawnEnemy(true);
        this.hooks.onBanner('강한 야생 포켓몬이 나타났다!', 'elite');
      }
    });
    if (t >= RUN_TIME) this.toBoss();
  }

  /* ---------- 3분 → 보스 ---------- */
  toBoss() {
    this.phase = 'clear';
    this.time = RUN_TIME;
    // 정화의 파동: 남은 몬스터 정리
    this.fx.push({ kind: 'purge', x: this.player.x, y: this.player.y, r: 0, life: 1.2, max: 1.2 });
    SFX.play('explode');
    this.shake = 10;
    this.enemies.forEach(e => {
      e.dying = 0.6 + Math.random() * 0.5;
    });
    setTimeout(() => {
      this.afterPick = () => this.warning();
      this.offerPick('보스 직전 강화', '곧 체육관 관장의 포켓몬이 나타나요. 마지막 강화!');
    }, 1300);
  }

  warning() {
    this.phase = 'warning';
    SFX.play('warn');
    this.hooks.onWarning(this.s.boss, this.s.bossShiny);
    setTimeout(() => this.spawnBoss(), 3000);
  }

  spawnBoss() {
    const b = this.s.boss, st = b.stats || { hp: 80, attack: 80, defense: 80, speed: 70, bst: 450 };
    const n = this.members.length;
    const hp = (520 + st.bst * 2.3) * this.diff * (1 + 0.45 * (n - 1));
    const cx = clamp(this.player.x, 700, ARENA - 700), cy = clamp(this.player.y - 220, 700, ARENA - 700);
    this.arenaRing = { x: cx, y: cy + 120, r: 560, a: 0 };
    this.boss = {
      kind: 'boss', p: b, types: b.typesKo, type: b.typesKo[0], color: typeColor(b.typesKo[0]),
      spr: this.bossSpr, shiny: this.s.bossShiny,
      x: cx, y: cy, z: 700, hp, max: hp, lag: hp, r: 46, scale: 2.1,
      state: 'enter', timer: 0, phase2: false, flash: 0, flip: 1, last: null, slow: 0,
    };
    this.phase = 'boss';
    this.hooks.onBoss(this.boss);
  }

  /* ---------- 생성 ---------- */
  spawn(dt) {
    const t = this.time;
    // 파티가 적으면 조금 덜 몰려옴
    const rate = (0.8 + t * 0.022) * (0.7 + 0.15 * this.members.length);
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc--;
      if (this.enemies.length < 220) this.spawnEnemy(false);
    }
  }

  spawnEnemy(elite, at) {
    const d = pickOne(this.mobDefs);
    if (!d) return null;
    const st = d.p.stats || { bst: 300, speed: 50, hp: 45 };
    const t = this.time;
    let x, y;
    if (at) { ({ x, y } = at); } else {
      const a = Math.random() * Math.PI * 2, r = rand(560, 700);
      x = clamp(this.player.x + Math.cos(a) * r, 60, ARENA - 60);
      y = clamp(this.player.y + Math.sin(a) * r, 60, ARENA - 60);
    }
    const hp = (8 + st.bst * 0.02) * (1 + t / 60 * 0.5) * this.diff * (0.75 + 0.125 * this.members.length) * (elite ? 10 : 1);
    const shiny = Math.random() < 0.04;
    const e = {
      kind: elite ? 'elite' : 'mob', d, types: d.types, x, y, hp, max: hp,
      spd: Math.min(95, 46 + st.speed * 0.25) * (elite ? 0.8 : 1) * rand(0.9, 1.1),
      r: elite ? 30 : 16, scale: elite ? 1.25 : 0.8,
      dmg: (5 + t * 0.04) * this.diff * (elite ? 1.6 : 1),
      flash: 0, slow: 0, kx: 0, ky: 0, flip: 1, shiny, phase: Math.random() * 6,
      spr: d.spr,
    };
    if (shiny && d.shinyUrl) loadSprite(d.shinyUrl).then(s => { if (s) e.spr = s; });
    if (elite) this.burst(x, y, '#ff5577', 20, 200);
    this.enemies.push(e);
    return e;
  }

  swarm() {
    this.hooks.onBanner('야생 포켓몬 무리가 몰려온다!', 'swarm');
    SFX.play('tele');
    const n = 22 + Math.floor(this.time / 10);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.spawnEnemy(false, {
        x: clamp(this.player.x + Math.cos(a) * 480, 60, ARENA - 60),
        y: clamp(this.player.y + Math.sin(a) * 480, 60, ARENA - 60),
      });
    }
  }

  /* ---------- 플레이어 ---------- */
  movePlayer(dt) {
    let dx = 0, dy = 0;
    const k = this.keys;
    if (k.has('ArrowLeft') || k.has('KeyA')) dx--;
    if (k.has('ArrowRight') || k.has('KeyD')) dx++;
    if (k.has('ArrowUp') || k.has('KeyW')) dy--;
    if (k.has('ArrowDown') || k.has('KeyS')) dy++;
    if (this.joy && this.joy.len > 8) { dx = this.joy.dx; dy = this.joy.dy; }
    const len = Math.hypot(dx, dy);
    const leader = this.members[0];
    const speed = (150 + leader.m.combat.speed * 0.6) * this.mods.move;
    const p = this.player;
    if (len > 0) {
      p.vx = dx / len * speed; p.vy = dy / len * speed;
      if (Math.abs(dx) > 0.1) p.face = dx > 0 ? -1 : 1;
    } else { p.vx *= 0.7; p.vy *= 0.7; }
    p.x = clamp(p.x + p.vx * dt, 70, ARENA - 70);
    p.y = clamp(p.y + p.vy * dt, 70, ARENA - 70);
    // 보스전: 결계 밖으로 못 나감
    if (this.arenaRing) {
      const r = this.arenaRing, ddx = p.x - r.x, ddy = p.y - r.y, dd = Math.hypot(ddx, ddy);
      if (dd > r.r - 20) { p.x = r.x + ddx / dd * (r.r - 20); p.y = r.y + ddy / dd * (r.r - 20); }
    }
    p.inv = Math.max(0, p.inv - dt);
    p.moving = len > 0;
    const lastT = this.trail[0];
    if (!lastT || Math.hypot(lastT.x - p.x, lastT.y - p.y) > 5) {
      this.trail.unshift({ x: p.x, y: p.y });
      if (this.trail.length > 60) this.trail.pop();
    }
  }

  hurt(amount, from) {
    const p = this.player;
    if (p.inv > 0 || this.phase === 'dead' || this.phase === 'end' || this.phase === 'bossdead') return;
    const reduced = amount * this.mods.armor * (100 / (100 + p.def * 0.5));
    p.hp -= reduced;
    p.inv = 0.5;
    this.shake = Math.max(this.shake, 7);
    this.flash = Math.max(this.flash, 0.35);
    this.hurtFlash = 0.25;
    SFX.play('hurt', 120);
    this.text(p.x, p.y - 50, `-${Math.round(reduced)}`, '#ff5a5a', 15);
    if (from) {
      const a = Math.atan2(p.y - from.y, p.x - from.x);
      p.x = clamp(p.x + Math.cos(a) * 18, 70, ARENA - 70);
      p.y = clamp(p.y + Math.sin(a) * 18, 70, ARENA - 70);
    }
    if (p.hp <= 0) this.die();
  }

  heal(n, quiet) {
    const p = this.player;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + n);
    if (!quiet && p.hp - before >= 1) this.text(p.x, p.y - 60, `+${Math.round(p.hp - before)}`, '#6dff8a', 14);
  }

  usePotion(i) {
    const pt = this.potions[i];
    if (!pt || pt.left <= 0 || !['play', 'boss', 'clear', 'warning'].includes(this.phase) || this.paused) return;
    if (this.player.hp >= this.player.maxHp) { this.hooks.onBanner('체력이 가득 차 있어요', 'info'); return; }
    pt.left--;
    this.used[pt.code] = (this.used[pt.code] || 0) + 1;
    this.heal(this.player.maxHp * pt.value / 100);
    SFX.play('heal');
    this.burst(this.player.x, this.player.y, '#7dffa0', 30, 160, 'star');
  }

  die() {
    this.phase = 'dead';
    this.slowmo = 0.2;
    this.shake = 16;
    SFX.play('lose');
    this.burst(this.player.x, this.player.y, '#ffffff', 50, 300);
    setTimeout(() => this.end(false), 1800);
  }

  end(won) {
    if (this.phase === 'end') return;
    this.phase = 'end';
    this.hooks.onEnd({ won, kills: this.kills, elites: this.elites, timeSec: Math.round(this.time), gold: Math.floor(this.gold), used: this.used });
  }

  /* ---------- 파티 공격 ---------- */
  updateMembers(dt) {
    const p = this.player;
    this.members.forEach((mb, i) => {
      if (i === 0) { mb.x = p.x; mb.y = p.y; } else {
        const tp = this.trail[Math.min(this.trail.length - 1, i * 9)] || p;
        mb.x += (tp.x - mb.x) * Math.min(1, dt * 10);
        mb.y += (tp.y - mb.y) * Math.min(1, dt * 10);
      }
      if (i === 0) mb.flip = p.face || 1;
      else if (Math.abs(mb.x - (mb.px ?? mb.x)) > 0.3) mb.flip = mb.x > mb.px ? -1 : 1;
      mb.px = mb.x;
      if (this.phase === 'dead' || this.phase === 'end' || this.phase === 'loading') return;
      mb.hop = Math.max(0, (mb.hop || 0) - dt);
      if (mb.pattern === 'orbit') { this.orbit(mb, dt); return; }
      mb.cd -= dt * this.mods.rate;
      if (mb.cd <= 0) {
        mb.lastCd = null;
        const fired = this.attack(mb);
        const cd = mb.lastCd ?? mb.skill.cd ?? BASE_CD[mb.pattern] ?? 1;
        mb.cd = fired ? cd * mb.cdMul : 0.15;
      }
    });
  }

  /** 이번 프레임의 공격 대상 (살아 있는 몬스터 + 보스) - update 마다 한 번 계산 */
  refreshTargets() {
    const list = [];
    for (const e of this.enemies) if (!e.dying && !e.dead && e.hp > 0) list.push(e);
    if (this.boss && this.boss.state !== 'enter' && this.boss.state !== 'dead' && this.boss.hp > 0) list.push(this.boss);
    this.targetsList = list;
  }

  targets() { return this.targetsList; }

  nearest(from, range = 420, skip) {
    let best = null, bd = range * range;
    for (const e of this.targetsList) {
      if (e.hp <= 0 || (skip && skip.has(e))) continue;
      const d = dist2(from, e);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  colorOf(s) { return typeColor(s.t); }

  /** 파티원 위치에서 투사체 발사 */
  shot(mb, s, a, o) {
    const speed = o.speed || 460;
    this.shots.push({
      x: mb.x, y: mb.y - 14, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      r: o.r || 6, dmg: mb.dmg * this.mods.dmg * (o.mul || 1), type: s.t, color: typeColor(s.t),
      life: o.life || 1.3, pierce: o.pierce || 1, hit: new Map(), kind: o.kind || 'bolt', t0: this.clock, ...o,
    });
  }

  addCloud(x, y, r, dmg, s) {
    this.fx.push({ kind: 'cloud', x, y, r, dmg, type: s.t, color: typeColor(s.t), life: 3, max: 3, tick: 0, every: 0.45 });
  }

  part(kind, x, y, vx, vy, life, size, color) {
    if (this.parts.length < 700) this.parts.push({ kind, x, y, vx, vy, life, max: life, size, color });
  }

  attack(mb) {
    const s = mb.skill, P = s.p;
    const self = ['aura', 'quake', 'wave', 'sing', 'selfdestruct', 'splash', 'heal'].includes(P);
    const tgt = this.nearest(mb, P === 'melee' || P === 'whip' ? 150 : 440);
    if (!tgt && !self) return false;
    if (P === 'sing' && !this.nearest(mb, (s.R || 190) * this.mods.area)) return false;
    const ang = tgt ? Math.atan2(tgt.y - mb.y, tgt.x - mb.x) : 0;
    return CAST[P](this, mb, s, tgt, ang, mb.dmg * this.mods.dmg);
  }

  orbit(mb, dt) {
    const s = mb.skill;
    const n = (s.n || 2) + this.mods.extra;
    mb.angle += dt * 3.3;
    const R = (s.R || 72) * this.mods.area;
    mb.orbs = [];
    for (let i = 0; i < n; i++) {
      const a = mb.angle + i * Math.PI * 2 / n;
      const o = { x: mb.x + Math.cos(a) * R, y: mb.y - 10 + Math.sin(a) * R * 0.8, a };
      mb.orbs.push(o);
      for (const e of this.targetsList) {
        if (dist2(o, e) > (e.r + 14) ** 2) continue;
        e.orbHit = e.orbHit || new Map();
        const last = e.orbHit.get(mb) || 0;
        if (this.clock - last > 0.4) {
          e.orbHit.set(mb, this.clock);
          this.damage(e, mb.dmg * this.mods.dmg * (s.mul || 0.6), s.t, mb);
        }
      }
    }
  }

  /** 피해: 상성·치명타·강화 반영, 숫자 표시, 넉백, 처치 처리 */
  damage(e, amount, type, from, knock = 40, quiet = false) {
    if (e.hp <= 0 || e.dying) return;
    let mult = typeMultiplier(type, e.types);
    if (mult > 1) mult *= this.mods.superEff;
    const crit = Math.random() < this.mods.crit + (from?.crit || 0);
    const dmg = amount * mult * (crit ? 1.5 : 1) * (e.kind === 'boss' && e.state === 'enter' ? 0 : 1);
    if (dmg <= 0) return;
    e.hp -= dmg;
    e.flash = 0.1;
    if (from && e.kind !== 'boss') {
      const a = Math.atan2(e.y - from.y, e.x - from.x);
      const k = knock * (e.kind === 'elite' ? 0.3 : 1);
      e.kx += Math.cos(a) * k; e.ky += Math.sin(a) * k;
    }
    const col = crit ? '#ffe34d' : mult > 1.05 ? '#ff9f43' : mult < 0.95 ? '#9aa4b8' : '#ffffff';
    // 숫자는 너무 많으면 생략 (치명타·보스·큰 피해는 항상)
    if (!quiet || crit || e.kind === 'boss') {
      if (crit || e.kind !== 'mob' || this.texts.length < 28) {
        this.text(e.x + rand(-8, 8), e.y - e.r - 10, `${Math.round(dmg)}${crit ? '!' : ''}`, col, crit ? 17 : e.kind === 'boss' ? 15 : 12);
      }
      if (mult > 1.05 && Math.random() < 0.08) this.text(e.x, e.y - e.r - 28, '효과가 굉장했다!', '#ff9f43', 11);
      this.burst(e.x, e.y - 10, typeColorHit(type), crit ? 6 : 3, 120);
      SFX.play('hit', 70);
    }
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    if (e.kind === 'boss') { this.bossDown(); return; }
    e.dead = true;
    this.kills++;
    if (e.kind === 'elite') this.elites++;
    SFX.play('kill', 50);
    this.burst(e.x, e.y - 10, typeColor(e.types[0]), e.kind === 'elite' ? 40 : 12, e.kind === 'elite' ? 280 : 170);
    this.parts.push({ kind: 'ring', x: e.x, y: e.y - 10, r: 6, R: e.kind === 'elite' ? 90 : 34, life: 0.3, max: 0.3, color: '#ffffff' });
    if (this.mods.leech) this.heal(this.mods.leech);
    const coins = e.kind === 'elite' ? 6 : Math.random() < 0.42 ? 1 : 0;
    const val = e.kind === 'elite' ? 3 : 1 + (this.time > 90 ? 1 : 0) * (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < coins; i++) this.coins.push({ x: e.x, y: e.y, vx: rand(-120, 120), vy: rand(-160, -40), v: val, t: 0 });
    if (e.shiny) { for (let i = 0; i < 4; i++) this.coins.push({ x: e.x, y: e.y, vx: rand(-150, 150), vy: rand(-180, -40), v: 3, t: 0 }); }
    if (Math.random() < (e.kind === 'elite' ? 1 : 0.018)) this.orbs.push({ x: e.x, y: e.y, amt: e.kind === 'elite' ? 0.2 : 0.08, t: 0 });
  }

  /* ---------- 몬스터 ---------- */
  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      e.phase += dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.dying !== undefined) {
        e.dying -= dt;
        if (e.dying <= 0 && !e.dead) {
          e.dead = true;
          this.burst(e.x, e.y - 10, '#ffffff', 8, 140);
        }
        continue;
      }
      e.slow = Math.max(0, e.slow - dt);
      if (e.sleep > 0) {   // 노래하기·최면술: 잠깐 잠듦
        e.sleep -= dt;
        e.x += e.kx * dt; e.y += e.ky * dt;
        e.kx *= Math.pow(0.02, dt); e.ky *= Math.pow(0.02, dt);
        continue;
      }
      const spd = e.spd * (e.slow > 0 ? 0.55 : 1);
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      e.x += (Math.cos(a) * spd + e.kx) * dt;
      e.y += (Math.sin(a) * spd + e.ky) * dt;
      e.kx *= Math.pow(0.02, dt); e.ky *= Math.pow(0.02, dt);
      e.flip = p.x > e.x ? -1 : 1;
      if (this.phase !== 'dead' && dist2(e, p) < (e.r + 16) ** 2) this.hurt(e.dmg, e);
    }
    // 서로 겹치지 않게 살짝 밀기 (가까운 몇 마리만)
    const es = this.enemies;
    for (let i = 0; i < es.length; i += 2) {
      const a = es[i], b = es[(i + 7) % es.length];
      if (!b || a === b) continue;
      const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        a.x += dx / d * push; a.y += dy / d * push; b.x -= dx / d * push; b.y -= dy / d * push;
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  /* ---------- 보스 ---------- */
  updateBoss(dt) {
    const b = this.boss, p = this.player;
    b.flash = Math.max(0, b.flash - dt);
    b.lag += (b.hp - b.lag) * Math.min(1, dt * 2.5);
    if (this.arenaRing) this.arenaRing.a += dt;
    if (b.state === 'dead') return;
    if (b.state === 'enter') {
      b.z = Math.max(0, b.z - dt * 900);
      if (b.z === 0) {
        b.state = 'idle';
        b.timer = 1.2;
        this.shake = 22;
        this.flash = 0.6;
        SFX.play('roar');
        this.parts.push({ kind: 'ring', x: b.x, y: b.y, r: 10, R: 360, life: 0.7, max: 0.7, color: b.color, w: 10 });
        this.burst(b.x, b.y, b.color, 60, 420);
        this.burst(b.x, b.y, '#ffffff', 30, 300);
        // 착지 충격파
        if (Math.hypot(p.x - b.x, p.y - b.y) < 170) this.hurt(12, b);
        this.beatT = 0;
      }
      return;
    }
    // 심장 박동 같은 북소리 (2페이즈에선 빠르게)
    this.beatT = (this.beatT || 0) - dt;
    if (this.beatT <= 0) { SFX.play('beat'); this.beatT = b.phase2 ? 0.42 : 0.62; }

    if (!b.phase2 && b.hp < b.max * 0.5) {
      b.phase2 = true;
      b.state = 'rage';
      b.timer = 1.1;
      this.shake = 18;
      this.flash = 0.5;
      SFX.play('roar');
      this.hooks.onBanner(`${this.bossName()} 이(가) 분노했다!`, 'rage');
      this.burst(b.x, b.y, '#ff3355', 70, 380);
      this.ebullets.length = 0;
    }
    const rate = b.phase2 ? 1.35 : 1;
    switch (b.state) {
      case 'rage':
        b.timer -= dt;
        if (b.timer <= 0) { b.state = 'idle'; b.timer = 0.4; }
        break;
      case 'idle': {
        const a = Math.atan2(p.y - b.y, p.x - b.x), d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d > 140) { b.x += Math.cos(a) * 70 * rate * dt; b.y += Math.sin(a) * 70 * rate * dt; }
        b.flip = p.x > b.x ? -1 : 1;
        b.timer -= dt;
        if (b.timer <= 0) this.bossChoose();
        break;
      }
      case 'tele':
        b.timer -= dt;
        if (b.attack === 'charge') b.flip = Math.cos(b.dir) > 0 ? -1 : 1;
        if (b.timer <= 0) this.bossAct();
        break;
      case 'dash':
        b.x = clamp(b.x + Math.cos(b.dir) * 980 * dt, 80, ARENA - 80);
        b.y = clamp(b.y + Math.sin(b.dir) * 980 * dt, 80, ARENA - 80);
        if (this.arenaRing) {
          const r = this.arenaRing, dd = Math.hypot(b.x - r.x, b.y - r.y);
          if (dd > r.r - 40) { b.timer = 0; this.shake = 10; SFX.play('slam'); }
        }
        if (Math.random() < 0.7) this.parts.push({ kind: 'ghost', x: b.x, y: b.y, life: 0.25, max: 0.25, flip: b.flip });
        b.timer -= dt;
        if (b.timer <= 0) { b.state = 'idle'; b.timer = 0.9 / rate; }
        break;
      case 'spiral':
        b.timer -= dt;
        b.spinT = (b.spinT || 0) - dt;
        if (b.spinT <= 0) {
          b.spinT = 0.07;
          b.spinA = (b.spinA || 0) + 0.32;
          for (let k = 0; k < 3; k++) this.ebullet(b.x, b.y - 20, b.spinA + k * Math.PI * 2 / 3, 210, b.color);
        }
        if (b.timer <= 0) { b.state = 'idle'; b.timer = 0.8; }
        break;
      default:
        break;
    }
    if (dist2(b, p) < (b.r + 18) ** 2) this.hurt(b.state === 'dash' ? 18 * this.diff : 13 * this.diff, b);
  }

  bossName() { return `관장의 ${this.s.boss.nameKo}`; }

  bossChoose() {
    const b = this.boss, p = this.player;
    const opts = ['charge', 'burst', 'slam', 'summon', 'burst', 'charge'];
    if (b.phase2) opts.push('spiral', 'spiral', 'slam');
    let pick;
    do { pick = pickOne(opts); } while (pick === b.last && Math.random() < 0.7);
    b.last = pick;
    b.attack = pick;
    b.state = 'tele';
    SFX.play('tele');
    if (pick === 'charge') {
      b.dir = Math.atan2(p.y - b.y, p.x - b.x);
      b.timer = b.phase2 ? 0.55 : 0.8;
      this.teles.push({ kind: 'line', x: b.x, y: b.y, a: b.dir, len: 900, w: b.r * 1.8, life: b.timer, max: b.timer, follow: b });
    } else if (pick === 'burst') {
      b.timer = 0.45;
      this.teles.push({ kind: 'glow', follow: b, life: 0.45, max: 0.45, color: b.color });
    } else if (pick === 'slam') {
      b.timer = 0.2;
      const n = b.phase2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          if (this.phase !== 'boss' || !this.boss || this.boss.hp <= 0) return;
          const lead = i === 0 ? 0 : 0.35;
          this.teles.push({
            kind: 'circle', x: this.player.x + this.player.vx * lead, y: this.player.y + this.player.vy * lead,
            r: 88, life: 0.85, max: 0.85, color: b.color, dmg: 16 * this.diff, boom: true,
          });
        }, i * 260);
      }
    } else if (pick === 'summon') {
      b.timer = 0.5;
      this.teles.push({ kind: 'glow', follow: b, life: 0.5, max: 0.5, color: '#b28cff' });
    } else if (pick === 'spiral') {
      b.timer = 0.4;
      this.teles.push({ kind: 'glow', follow: b, life: 0.4, max: 0.4, color: '#ff3355' });
    }
  }

  bossAct() {
    const b = this.boss;
    const rate = b.phase2 ? 1.35 : 1;
    switch (b.attack) {
      case 'charge':
        b.state = 'dash';
        b.timer = 0.6;
        SFX.play('dash');
        this.shake = 6;
        break;
      case 'burst': {
        const n = b.phase2 ? 22 : 16;
        const off = Math.random();
        for (let i = 0; i < n; i++) this.ebullet(b.x, b.y - 20, off + i * Math.PI * 2 / n, 230, b.color);
        if (b.phase2) {
          setTimeout(() => {
            if (!this.boss || this.boss.hp <= 0) return;
            for (let i = 0; i < n; i++) this.ebullet(this.boss.x, this.boss.y - 20, off + (i + 0.5) * Math.PI * 2 / n, 190, '#ffffff');
          }, 260);
        }
        SFX.play('explode');
        this.parts.push({ kind: 'ring', x: b.x, y: b.y - 20, r: 10, R: 120, life: 0.3, max: 0.3, color: b.color, w: 6 });
        b.state = 'idle'; b.timer = 1.4 / rate;
        break;
      }
      case 'slam':
        b.state = 'idle'; b.timer = 1.6 / rate;
        break;
      case 'summon': {
        const n = b.phase2 ? 7 : 5;
        for (let i = 0; i < n; i++) {
          const a = i * Math.PI * 2 / n;
          const e = this.spawnEnemy(false, { x: b.x + Math.cos(a) * 120, y: b.y + Math.sin(a) * 120 });
          if (e) { e.hp *= 1.5; e.max = e.hp; this.burst(e.x, e.y, '#b28cff', 12, 160); }
        }
        SFX.play('open');
        b.state = 'idle'; b.timer = 1.5 / rate;
        break;
      }
      case 'spiral':
        b.state = 'spiral'; b.timer = 2.0;
        break;
      default:
        b.state = 'idle'; b.timer = 1;
    }
  }

  ebullet(x, y, a, speed, color) {
    this.ebullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 9, dmg: 9 * this.diff, color, life: 4 });
  }

  bossDown() {
    const b = this.boss;
    if (b.state === 'dead') return;
    b.state = 'dead';
    b.hp = 0;
    this.phase = 'bossdead';
    this.slowmo = 0.15;
    this.shake = 26;
    this.flash = 1;
    this.ebullets.length = 0;
    this.teles.length = 0;
    this.enemies.forEach(e => { e.dying = rand(0.2, 0.8); });
    SFX.play('explode');
    SFX.play('roar');
    // 연쇄 폭발
    for (let i = 0; i < 7; i++) {
      setTimeout(() => {
        if (!this.boss) return;
        this.burst(b.x + rand(-50, 50), b.y - 30 + rand(-50, 40), pickOne([b.color, '#ffffff', '#ffe680']), 40, 360);
        this.parts.push({ kind: 'ring', x: b.x, y: b.y - 20, r: 10, R: 200 + i * 40, life: 0.5, max: 0.5, color: '#ffffff', w: 5 });
        SFX.play('explode');
        this.shake = 14;
      }, 150 + i * 170);
    }
    for (let i = 0; i < 70; i++) this.coins.push({ x: b.x, y: b.y, vx: rand(-320, 320), vy: rand(-380, -60), v: 5, t: 0 });
    this.kills++;
    setTimeout(() => {
      SFX.play('win');
      this.hooks.onBanner('관장의 포켓몬을 쓰러뜨렸다!', 'win');
      this.coinRush = true;
    }, 1400);
    setTimeout(() => this.end(true), 3600);
  }

  /* ---------- 투사체 / 공격 판정 ---------- */
  updateShots(dt) {
    for (const s of this.shots) {
      s.life -= dt;
      if (s.homing) {
        const t = this.nearest(s, 400);
        if (t) {
          const want = Math.atan2(t.y - s.y, t.x - s.x), cur = Math.atan2(s.vy, s.vx);
          let diff = want - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const na = cur + clamp(diff, -s.homing * dt, s.homing * dt), sp = Math.hypot(s.vx, s.vy);
          s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp;
        }
      }
      if (s.back !== undefined) {
        s.back -= dt;
        if (s.back <= 0) {
          const mb = this.player, a = Math.atan2(mb.y - s.y, mb.x - s.x), sp = Math.hypot(s.vx, s.vy);
          s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
          if (dist2(s, mb) < 900) s.life = 0;
        }
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.wobble) { s.vx *= Math.pow(0.5, dt); s.vy *= Math.pow(0.5, dt); s.y += Math.sin((this.clock - s.t0) * 9) * 0.6; }
      if (s.kind === 'fire' && Math.random() < 0.35) this.parts.push({ kind: 'puff', x: s.x, y: s.y, vx: rand(-20, 20), vy: rand(-40, -10), life: 0.35, max: 0.35, size: rand(3, 6), color: pickOne(['#ffb238', '#ff6a1a', '#ffe680']) });
      if (s.kind === 'shadow' && Math.random() < 0.3) this.parts.push({ kind: 'puff', x: s.x + rand(-8, 8), y: s.y + rand(-8, 8), vx: 0, vy: -20, life: 0.4, max: 0.4, size: rand(3, 6), color: '#7a4fb8' });
      if (s.kind === 'gust') s.spin = (s.spin || 0) + dt * 14;
      for (const e of this.targetsList) {
        if (s.life <= 0) break;
        if (e.hp <= 0) continue;
        if (dist2(s, e) > (e.r + s.r) ** 2) continue;
        const last = s.hit.get(e);
        if (last !== undefined && (!s.tick || this.clock - last < s.tick)) continue;
        s.hit.set(e, this.clock);
        if (s.explode) {
          this.explode(s.x, s.y, s.explode, s.dmg, s.type, s.color);
          s.life = 0;
          break;
        }
        this.damage(e, s.dmg, s.type, s);
        if (s.slow) e.slow = s.slow;
        if (s.heal) this.heal(s.heal, true);
        if (s.gold && Math.random() < s.gold) this.coins.push({ x: e.x, y: e.y, vx: rand(-80, 80), vy: rand(-140, -60), v: 1, t: 0 });
        if (--s.pierce <= 0) s.life = 0;
      }
    }
    this.shots = this.shots.filter(s => s.life > 0 && s.x > 0 && s.y > 0 && s.x < ARENA && s.y < ARENA);
  }

  explode(x, y, r, dmg, type, color, loud) {
    for (const e of this.targetsList) if (e.hp > 0 && dist2({ x, y }, e) < (r + e.r) ** 2) this.damage(e, dmg, type, { x, y }, 70);
    this.parts.push({ kind: 'ring', x, y, r: 6, R: r, life: 0.25, max: 0.25, color: loud ? '#ffffff' : '#ffe680', w: 5 });
    this.burst(x, y, color, loud ? 20 : 10, 200);
    SFX.play('explode', 160);
  }

  updateFx(dt) {
    for (const f of this.fx) {
      f.life -= dt;
      const prog = 1 - f.life / f.max;
      if (f.kind === 'beam' || f.kind === 'breath') {
        if (f.mb) { f.x = f.mb.x; f.y = f.mb.y - 12; }
        const hitTest = e => {
          const dx = e.x - f.x, dy = e.y - f.y;
          const along = dx * Math.cos(f.a) + dy * Math.sin(f.a);
          const side = -dx * Math.sin(f.a) + dy * Math.cos(f.a);
          if (along < 0 || along > f.len) return false;
          if (f.kind === 'beam') return Math.abs(side) < f.w / 2 + e.r;
          return Math.abs(Math.atan2(side, along)) < f.spread + e.r / Math.max(30, along);
        };
        if (f.kind === 'beam') {
          for (const e of this.targetsList) {
            if (e.hp > 0 && !f.hit.has(e) && hitTest(e)) { f.hit.add(e); this.damage(e, f.dmg, f.type, f); if (f.slow) e.slow = f.slow; }
          }
        } else {
          f.tick -= dt;
          if (f.tick <= 0) {
            f.tick = f.every;
            for (const e of this.targetsList) if (e.hp > 0 && hitTest(e)) this.damage(e, f.dmg, f.type, f, 20, true);
          }
          for (let i = 0; i < 2; i++) {
            const a = f.a + rand(-f.spread, f.spread), r = rand(20, f.len);
            if (this.parts.length < 700) this.parts.push({ kind: 'puff', x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.3, max: 0.3, size: rand(4, 9), color: pickOne([f.color, '#c4b5ff', '#ffffff']) });
          }
        }
      } else if (f.kind === 'slash') {
        this.targetsList.forEach(e => {
          if (e.hp <= 0 || f.hit.has(e) || dist2(f, e) > (f.r + e.r) ** 2) return;
          let da = Math.atan2(e.y - f.y, e.x - f.x) - f.a;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          if (Math.abs(da) < 1.1) { f.hit.add(e); this.damage(e, f.dmg, f.type, f, f.knock); }
        });
      } else if (f.kind === 'quake') {
        f.r = f.R * prog;
        for (const e of this.targetsList) {
          if (e.hp <= 0 || f.hit.has(e)) continue;
          const d = Math.sqrt(dist2(f, e));
          if (d < f.r + e.r) { f.hit.add(e); this.damage(e, f.dmg, f.type, f, f.knock); }
        }
        if (!f.ring && Math.random() < 0.4 && this.parts.length < 700) this.parts.push({ kind: 'rock', x: f.x + Math.cos(prog * 20) * f.r, y: f.y + Math.sin(prog * 20) * f.r, vx: rand(-30, 30), vy: rand(-120, -60), life: 0.4, max: 0.4, size: rand(3, 5), color: '#a07a4a' });
      } else if (f.kind === 'cloud') {
        f.tick -= dt;
        if (f.tick <= 0) {
          f.tick = f.every;
          for (const e of this.targetsList) if (e.hp > 0 && dist2(f, e) < (f.r + e.r) ** 2) this.damage(e, f.dmg, f.type, null, 0, true);
        }
        if (Math.random() < 0.25 && this.parts.length < 700) this.parts.push({ kind: 'puff', x: f.x + rand(-f.r, f.r) * 0.8, y: f.y + rand(-f.r, f.r) * 0.5, vx: 0, vy: -15, life: 0.8, max: 0.8, size: rand(5, 10), color: pickOne(['#a64fd6', '#7d3aa8', '#c58bf0']) });
      } else if (f.kind === 'meteor') {
        if (!f.landed && f.life <= 0.12) {
          f.landed = true;
          for (const e of this.targetsList) if (e.hp > 0 && dist2(f, e) < (f.r + e.r) ** 2) this.damage(e, f.dmg, f.type, f, 120);
          this.burst(f.x, f.y, '#b08d57', 18, 220);
          this.parts.push({ kind: 'ring', x: f.x, y: f.y, r: 5, R: f.r * 1.2, life: 0.25, max: 0.25, color: '#e8d4a8', w: 5 });
          this.shake = Math.max(this.shake, 4);
          SFX.play('slam', 150);
        }
      } else if (f.kind === 'purge') {
        f.r = 1600 * prog;
      } else if (f.kind === 'whip') {
        if (!f.done) {
          f.done = true;
          for (const e of this.targetsList) {
            const dx = e.x - f.x, dy = e.y - f.y;
            const along = dx * Math.cos(f.a) + dy * Math.sin(f.a), side = -dx * Math.sin(f.a) + dy * Math.cos(f.a);
            if (along > 0 && along < f.len && Math.abs(side) < 18 + e.r) this.damage(e, f.dmg, f.type, f, 90);
          }
        }
      } else if (f.kind === 'lob') {
        if (f.life <= 0) {
          const s = f.s;
          if (s.cloud) this.addCloud(f.x1, f.y1, s.cloud * this.mods.area, f.dmg * 0.3, s);
          this.explode(f.x1, f.y1, (s.explode || s.cloud || 50) * this.mods.area, f.dmg, s.t, f.color);
        }
      } else if (f.kind === 'charge' && f.mb) {
        f.x = f.mb.x; f.y = f.mb.y - 14;
      }
    }
    this.fx = this.fx.filter(f => f.life > 0);

    // 보스 공격 예고 → 터짐
    for (const t of this.teles) {
      t.life -= dt;
      if (t.follow && t.kind !== 'line') { t.x = t.follow.x; t.y = t.follow.y; }
      if (t.life <= 0 && t.boom) {
        if (Math.hypot(this.player.x - t.x, this.player.y - t.y) < t.r + 12) this.hurt(t.dmg, t);
        this.burst(t.x, t.y, t.color, 26, 300);
        this.burst(t.x, t.y, '#ffffff', 10, 200);
        this.parts.push({ kind: 'ring', x: t.x, y: t.y, r: 10, R: t.r * 1.15, life: 0.3, max: 0.3, color: t.color, w: 8 });
        this.shake = Math.max(this.shake, 9);
        SFX.play('slam');
      }
    }
    this.teles = this.teles.filter(t => t.life > 0);
  }

  updateEnemyBullets(dt) {
    const p = this.player;
    for (const b of this.ebullets) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (dist2(b, p) < (b.r + 12) ** 2) { this.hurt(b.dmg, b); b.life = 0; }
    }
    this.ebullets = this.ebullets.filter(b => b.life > 0 && b.x > 0 && b.y > 0 && b.x < ARENA && b.y < ARENA);
  }

  updatePickups(dt) {
    const p = this.player, R = 110 * this.mods.magnet;
    for (const c of this.coins) {
      c.t += dt;
      if (c.vx || c.vy) {
        c.x += c.vx * dt; c.y += c.vy * dt;
        c.vy += 500 * dt;
        c.vx *= Math.pow(0.1, dt);
        if (c.t > 0.35) { c.vx = 0; c.vy = 0; }
      }
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if ((d < R || this.coinRush) && c.t > 0.3) {
        const sp = this.coinRush ? 900 : 380;
        c.x += (p.x - c.x) / d * sp * dt; c.y += (p.y - c.y) / d * sp * dt;
      }
      if (d < 22 && c.t > 0.3) {
        c.got = true;
        this.gold += c.v * this.mods.gold;
        SFX.play('coin', 40);
        this.parts.push({ kind: 'spark', x: c.x, y: c.y, vx: 0, vy: -60, life: 0.25, max: 0.25, size: 3, color: '#ffe680' });
      }
    }
    this.coins = this.coins.filter(c => !c.got);
    for (const o of this.orbs) {
      o.t += dt;
      const d = Math.hypot(p.x - o.x, p.y - o.y);
      if (d < R) { o.x += (p.x - o.x) / d * 300 * dt; o.y += (p.y - o.y) / d * 300 * dt; }
      if (d < 24) { o.got = true; this.heal(p.maxHp * o.amt); SFX.play('heal'); }
    }
    this.orbs = this.orbs.filter(o => !o.got);
  }

  /* ---------- 파티클 ---------- */
  burst(x, y, color, n, speed, kind = 'spark') {
    n = Math.min(n, 760 - this.parts.length);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(speed * 0.3, speed);
      this.parts.push({ kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.6), max: 0.6, size: rand(2, 4.5), color });
    }
    if (this.parts.length > 700) this.parts.splice(0, this.parts.length - 700);
  }

  text(x, y, s, color, size) {
    this.texts.push({ x, y, s, color, size, life: 0.75, max: 0.75 });
    if (this.texts.length > 45) this.texts.shift();
  }

  updateParticles(dt) {
    for (const q of this.parts) {
      q.life -= dt;
      if (q.vx !== undefined) {
        q.x += q.vx * dt; q.y += q.vy * dt;
        q.vx *= Math.pow(0.08, dt); q.vy *= Math.pow(0.08, dt);
        if (q.kind === 'rock') q.vy += 400 * dt;
      }
    }
    this.parts = this.parts.filter(q => q.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y -= 40 * dt; }
    this.texts = this.texts.filter(t => t.life > 0);
  }

  /* =========================================================
   * 그리기
   * ========================================================= */
  render() {
    const c = this.ctx, W = this.cv.width, H = this.cv.height, S = this.scale;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#0b0d14';
    c.fillRect(0, 0, W, H);
    if (!this.floor) return;
    const p = this.player;
    const vw = W / S, vh = H / S;
    let cx = clamp(p.x, vw / 2 - 80, ARENA - vw / 2 + 80), cy = clamp(p.y, vh / 2 - 80, ARENA - vh / 2 + 80);
    if (this.shake > 0) { cx += rand(-this.shake, this.shake); cy += rand(-this.shake, this.shake); }
    this.cam = { x: cx - vw / 2, y: cy - vh / 2, vw, vh };
    c.setTransform(S, 0, 0, S, -this.cam.x * S, -this.cam.y * S);
    c.imageSmoothingEnabled = false;

    // 바닥은 보이는 부분만 잘라서 그림 (바닥 캔버스는 2px = 1칸)
    {
      const fx = clamp(this.cam.x, 0, ARENA), fy = clamp(this.cam.y, 0, ARENA);
      const fw = Math.min(ARENA - fx, vw + 4), fh = Math.min(ARENA - fy, vh + 4);
      if (fw > 0 && fh > 0) c.drawImage(this.floor, fx / 2, fy / 2, fw / 2, fh / 2, fx, fy, fw, fh);
    }
    const inView = (x, y, m = 120) => x > this.cam.x - m && x < this.cam.x + vw + m && y > this.cam.y - m && y < this.cam.y + vh + m;
    this.decor.forEach(d => { if (inView(d.x, d.y)) c.drawImage(d.img, d.x - d.w / 2, d.y - d.h, d.w, d.h); });

    this.drawArenaRing(c);
    this.drawGroundFx(c);
    this.drawTeles(c);

    // 줍는 것
    this.coins.forEach(k => {
      if (!inView(k.x, k.y)) return;
      const bob = Math.sin(this.clock * 8 + k.x) * 2;
      c.fillStyle = '#7a5a10'; c.fillRect(k.x - 5, k.y - 4 + bob, 10, 10);
      c.fillStyle = '#ffd84a'; c.fillRect(k.x - 4, k.y - 5 + bob, 8, 10);
      c.fillStyle = '#fff6b0'; c.fillRect(k.x - 2, k.y - 3 + bob, 2, 4);
    });
    this.orbs.forEach(o => {
      const r = 8 + Math.sin(this.clock * 6) * 2;
      c.save(); c.globalCompositeOperation = 'lighter';
      c.fillStyle = 'rgba(80,255,140,.35)'; c.beginPath(); c.arc(o.x, o.y - 8, r * 2, 0, 7); c.fill();
      c.fillStyle = '#9dffb8'; c.beginPath(); c.arc(o.x, o.y - 8, r * 0.7, 0, 7); c.fill();
      c.restore();
    });

    // 몸통들 (아래쪽이 앞에 오도록 y 정렬)
    const bodies = [];
    this.enemies.forEach(e => { if (inView(e.x, e.y)) bodies.push(e); });
    this.members.forEach(m => bodies.push(m));
    if (this.boss && this.boss.state !== 'dead') bodies.push(this.boss);
    bodies.sort((a, b) => a.y - b.y);
    bodies.forEach(o => (o.m ? this.drawMember(c, o) : this.drawEnemy(c, o)));

    this.drawShots(c);
    this.drawEnemyBullets(c);
    this.drawParticles(c);
    this.drawTexts(c);
    this.drawJoystick(c);

    // 화면 효과
    c.setTransform(1, 0, 0, 1, 0, 0);
    const lowHp = this.player.hp / this.player.maxHp < 0.3 && this.phase !== 'end';
    const rage = this.boss && this.boss.phase2 && this.boss.state !== 'dead';
    c.drawImage(this.vignette('rgba(0,0,0,.45)'), 0, 0);
    if (lowHp || rage) {
      c.globalAlpha = lowHp ? 0.55 + Math.sin(this.clock * 6) * 0.3 : 0.6;
      c.drawImage(this.vignette('rgba(170,0,25,.7)'), 0, 0);
      c.globalAlpha = 1;
    }
    if (this.phase === 'warning') {
      c.fillStyle = `rgba(200,0,30,${0.18 + Math.sin(this.clock * 10) * 0.12})`;
      c.fillRect(0, 0, W, H);
    }
    if (this.flash > 0) {
      c.fillStyle = `rgba(255,255,255,${this.flash * 0.6})`;
      c.fillRect(0, 0, W, H);
    }
    if (this.phase === 'dead' || (this.phase === 'end' && !this.won)) {
      c.fillStyle = 'rgba(10,10,20,.35)';
      c.fillRect(0, 0, W, H);
    }
  }

  drawSprite(c, spr, x, y, scale, flip, t, opts = {}) {
    let f = frameOf(spr, t, opts.speed || 1);
    if (f && opts.tint) f = tinted(f, opts.tint);
    if (!f) {
      c.fillStyle = opts.color || '#fff';
      c.beginPath(); c.arc(x, y - 16, 16 * scale, 0, 7); c.fill();
      return;
    }
    const w = f.width * scale, h = f.height * scale;
    c.save();
    c.translate(x, y);
    c.scale(flip, 1);
    if (opts.alpha !== undefined) c.globalAlpha = opts.alpha;
    c.drawImage(f, -w / 2, -h + (opts.lift || 0), w, h);
    c.restore();
  }

  shadow(c, x, y, r) {
    c.drawImage(SHADOW, x - r, y - r * 0.38, r * 2, r * 0.76);
  }

  drawMember(c, mb) {
    const p = this.player;
    const moving = p.moving;
    const bob = moving ? Math.abs(Math.sin(this.clock * 12 + mb.i)) * 4 : Math.sin(this.clock * 3 + mb.i) * 1;
    this.shadow(c, mb.x, mb.y, 16);
    const blink = p.inv > 0 && Math.floor(this.clock * 20) % 2 === 0;
    if (mb.i === 0) {
      // 리더 표시 고리
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(mb.x, mb.y, 22, 8, 0, 0, 7); c.stroke();
    }
    const hop = mb.hop > 0 ? Math.sin((0.45 - mb.hop) / 0.45 * Math.PI) * 40 : 0;
    this.drawSprite(c, mb.spr, mb.x, mb.y - bob - hop, 1, mb.flip, this.clock + mb.i, { alpha: blink ? 0.35 : 1, color: mb.color });
    if (mb.sprites.shiny && Math.random() < 0.05) this.parts.push({ kind: 'star', x: mb.x + rand(-18, 18), y: mb.y - rand(10, 50), vx: 0, vy: -20, life: 0.5, max: 0.5, size: 3, color: '#ffe680' });
    if (mb.orbs) drawOrbs(c, mb, this.clock);
  }

  drawEnemy(c, e) {
    const t = this.clock + (e.phase || 0);
    if (e.kind === 'boss') {
      const lift = -e.z;
      this.shadow(c, e.x, e.y, 46 * (e.z > 0 ? Math.max(0.3, 1 - e.z / 700) : 1));
      // 오라
      c.save(); c.globalCompositeOperation = 'lighter';
      const auraR = 70 + Math.sin(this.clock * 5) * 6;
      const g = c.createRadialGradient(e.x, e.y - 50 + lift, 10, e.x, e.y - 50 + lift, auraR * (e.phase2 ? 1.5 : 1));
      g.addColorStop(0, e.phase2 ? 'rgba(255,40,80,.45)' : hexA(e.color, 0.35));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(e.x, e.y - 50 + lift, auraR * 1.6, 0, 7); c.fill();
      c.restore();
      this.drawSprite(c, e.spr, e.x, e.y + lift, e.scale, e.flip, t, { tint: e.flash > 0 ? 'white' : e.phase2 ? 'rage' : null, speed: e.phase2 ? 1.6 : 1 });
      if (e.shiny && Math.random() < 0.25) this.parts.push({ kind: 'star', x: e.x + rand(-60, 60), y: e.y - rand(20, 140), vx: 0, vy: -30, life: 0.6, max: 0.6, size: 4, color: '#ffe680' });
      return;
    }
    const dying = e.dying !== undefined;
    const bob = Math.abs(Math.sin(t * 7)) * 2;
    this.shadow(c, e.x, e.y, e.r * 0.9);
    if (e.kind === 'elite') {
      c.save(); c.globalCompositeOperation = 'lighter';
      c.fillStyle = `rgba(255,60,90,${0.18 + Math.sin(t * 6) * 0.08})`;
      c.beginPath(); c.arc(e.x, e.y - 30, 46, 0, 7); c.fill(); c.restore();
    }
    const tint = e.flash > 0 ? 'white' : e.slow > 0 ? 'ice' : null;
    this.drawSprite(c, e.spr, e.x, e.y - (e.sleep > 0 ? 0 : bob), e.scale * (dying ? Math.max(0.1, e.dying) : 1), e.flip, e.sleep > 0 ? 0 : t,
      { tint, alpha: dying ? Math.max(0, e.dying) : 1, color: typeColor(e.types[0]) });
    if (e.sleep > 0) {
      c.fillStyle = '#e8f0ff'; c.font = 'bold 12px monospace';
      c.fillText('z', e.x + 10 + Math.sin(this.clock * 3) * 3, e.y - 40 - (this.clock * 20 % 14));
    }
    if (e.shiny && Math.random() < 0.08) this.parts.push({ kind: 'star', x: e.x + rand(-14, 14), y: e.y - rand(10, 40), vx: 0, vy: -20, life: 0.5, max: 0.5, size: 3, color: '#ffe680' });
    if (e.kind === 'elite' && !dying) {
      const w = 50;
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(e.x - w / 2, e.y + 6, w, 5);
      c.fillStyle = '#ff4d6d'; c.fillRect(e.x - w / 2, e.y + 6, w * Math.max(0, e.hp / e.max), 5);
    }
  }

  drawArenaRing(c) {
    const r = this.arenaRing;
    if (!r) return;
    const col = this.boss?.phase2 ? '#ff3355' : this.boss?.color || '#fff';
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = hexA(col, 0.25);
    c.lineWidth = 26;
    c.beginPath(); c.arc(r.x, r.y, r.r, 0, 7); c.stroke();
    c.strokeStyle = hexA(col, 0.8);
    c.lineWidth = 3;
    c.setLineDash([18, 14]);
    c.lineDashOffset = -r.a * 60;
    c.beginPath(); c.arc(r.x, r.y, r.r, 0, 7); c.stroke();
    c.restore();
    c.save();
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.beginPath(); c.rect(r.x - 3000, r.y - 3000, 6000, 6000); c.moveTo(r.x + r.r + 13, r.y); c.arc(r.x, r.y, r.r + 13, 0, Math.PI * 2, true); c.fill('evenodd');
    c.restore();
  }

  drawGroundFx(c) {
    this.fx.forEach(f => {
      const k = f.life / f.max;
      if (f.kind === 'cloud') {
        c.save(); c.globalAlpha = Math.min(1, f.life) * 0.5;
        const g = c.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.r);
        g.addColorStop(0, 'rgba(180,90,230,.8)'); g.addColorStop(1, 'rgba(120,40,170,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(f.x, f.y, f.r, f.r * 0.7, 0, 0, 7); c.fill(); c.restore();
      } else if (f.kind === 'quake') {
        c.save();
        c.strokeStyle = hexA(f.color || '#c8965a', k); c.lineWidth = 8 * k + 2;
        c.beginPath(); c.ellipse(f.x, f.y, f.r, f.r * 0.6, 0, 0, 7); c.stroke();
        c.strokeStyle = `rgba(255,240,220,${k * 0.8})`; c.lineWidth = 2;
        c.beginPath(); c.ellipse(f.x, f.y, f.r * 0.85, f.r * 0.5, 0, 0, 7); c.stroke();
        c.restore();
      } else if (f.kind === 'meteor') {
        const prog = 1 - k;
        c.save();
        c.strokeStyle = 'rgba(255,220,150,.8)'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(f.x, f.y, f.r, f.r * 0.6, 0, 0, 7); c.stroke();
        c.fillStyle = `rgba(255,200,120,${0.15 + prog * 0.2})`;
        c.beginPath(); c.ellipse(f.x, f.y, f.r * prog, f.r * 0.6 * prog, 0, 0, 7); c.fill();
        if (!f.landed) {
          const h = (1 - prog) * 380;
          if (f.look === 'dig') {            // 구멍파기: 땅속에서 솟아오름
            c.fillStyle = '#7a5530';
            for (let i = 0; i < 5; i++) c.fillRect(f.x + rand(-f.r, f.r) * 0.6, f.y + rand(-6, 6), 5, 5);
          } else if (f.look === 'dive') {    // 공중날기: 위에서 내리꽂음
            c.fillStyle = 'rgba(255,255,255,.8)';
            c.beginPath(); c.moveTo(f.x, f.y - h); c.lineTo(f.x - 14, f.y - h - 26); c.lineTo(f.x + 14, f.y - h - 26); c.fill();
          } else {
            c.fillStyle = '#8a6a43'; c.fillRect(f.x - 9, f.y - h - 18, 18, 18);
            c.fillStyle = '#c9a36b'; c.fillRect(f.x - 6, f.y - h - 18, 8, 6);
          }
        }
        c.restore();
      } else if (f.kind === 'purge') {
        c.save(); c.globalCompositeOperation = 'lighter';
        c.strokeStyle = `rgba(255,255,255,${k})`; c.lineWidth = 30 * k + 4;
        c.beginPath(); c.arc(f.x, f.y, f.r, 0, 7); c.stroke(); c.restore();
      }
    });
  }

  drawTeles(c) {
    this.teles.forEach(t => {
      const k = 1 - t.life / t.max;
      c.save();
      if (t.kind === 'line') {
        c.translate(t.follow ? t.follow.x : t.x, t.follow ? t.follow.y : t.y);
        c.rotate(t.a);
        c.fillStyle = `rgba(255,40,60,${0.12 + k * 0.25})`;
        c.fillRect(0, -t.w / 2, t.len, t.w);
        c.fillStyle = `rgba(255,80,90,${0.5 + k * 0.4})`;
        c.fillRect(0, -t.w / 2, t.len * k, t.w);
        c.strokeStyle = 'rgba(255,120,120,.9)'; c.lineWidth = 2;
        c.strokeRect(0, -t.w / 2, t.len, t.w);
      } else if (t.kind === 'circle') {
        c.fillStyle = `rgba(255,40,60,${0.12 + k * 0.2})`;
        c.beginPath(); c.ellipse(t.x, t.y, t.r, t.r * 0.65, 0, 0, 7); c.fill();
        c.fillStyle = `rgba(255,60,80,${0.35 + k * 0.35})`;
        c.beginPath(); c.ellipse(t.x, t.y, t.r * k, t.r * 0.65 * k, 0, 0, 7); c.fill();
        c.strokeStyle = 'rgba(255,140,140,.95)'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(t.x, t.y, t.r, t.r * 0.65, 0, 0, 7); c.stroke();
      } else if (t.kind === 'glow') {
        c.globalCompositeOperation = 'lighter';
        const r = 40 + k * 90;
        const g = c.createRadialGradient(t.x, t.y - 50, 5, t.x, t.y - 50, r);
        g.addColorStop(0, hexA(t.color, 0.7)); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.beginPath(); c.arc(t.x, t.y - 50, r, 0, 7); c.fill();
      }
      c.restore();
    });
  }

  drawShots(c) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    this.shots.forEach(sh => drawShot(c, sh, this.clock));
    this.fx.forEach(f => drawFx(c, f, this.clock));
    c.restore();
  }

  drawEnemyBullets(c) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    this.ebullets.forEach(b => {
      c.fillStyle = hexA(b.color, 0.35); c.beginPath(); c.arc(b.x, b.y, b.r * 1.9, 0, 7); c.fill();
      c.fillStyle = b.color; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(b.x, b.y, b.r * 0.45, 0, 7); c.fill();
    });
    c.restore();
  }

  drawParticles(c) {
    // 보스 돌진 잔상 (일반 합성)
    this.parts.forEach(q => {
      if (q.kind !== 'ghost') return;
      c.save();
      c.globalAlpha = Math.max(0, q.life / q.max) * 0.35;
      this.drawSprite(c, this.bossSpr, q.x, q.y, this.boss?.scale || 2, q.flip, this.clock, { tint: 'white' });
      c.restore();
    });
    c.save();
    c.globalCompositeOperation = 'lighter';
    this.parts.forEach(q => {
      const k = Math.max(0, q.life / q.max);
      if (q.kind === 'ghost') return;
      if (q.kind === 'ring') {
        const r = q.r + (q.R - q.r) * (1 - k);
        c.strokeStyle = hexA(q.color, k); c.lineWidth = (q.w || 3) * k + 1;
        c.beginPath(); c.ellipse(q.x, q.y, r, r * 0.7, 0, 0, 7); c.stroke();
      } else if (q.kind === 'star') {
        c.fillStyle = hexA(q.color, k);
        const s = q.size * (0.5 + k);
        c.fillRect(q.x - s, q.y - 0.75, s * 2, 1.5); c.fillRect(q.x - 0.75, q.y - s, 1.5, s * 2);
        c.fillRect(q.x - 1, q.y - 1, 2, 2);
      } else {
        c.fillStyle = hexA(q.color, k);
        const s = q.size * (q.kind === 'puff' ? 1 + (1 - k) : k + 0.3);
        c.fillRect(q.x - s / 2, q.y - s / 2, s, s);
      }
    });
    c.restore();
  }

  drawTexts(c) {
    c.save();
    c.textAlign = 'center';
    c.lineJoin = 'round';
    let lastSize = 0;
    this.texts.forEach(t => {
      const k = t.life / t.max;
      c.globalAlpha = Math.min(1, k * 2);
      const size = Math.round(t.size * (k > 0.8 ? 1.25 : 1));
      if (size !== lastSize) { c.font = `900 ${size}px "Pretendard", "Malgun Gothic", monospace`; lastSize = size; }
      c.lineWidth = 3;
      c.strokeStyle = 'rgba(0,0,0,.85)';
      c.strokeText(t.s, t.x, t.y);
      c.fillStyle = t.color;
      c.fillText(t.s, t.x, t.y);
    });
    c.restore();
  }

  drawJoystick(c) {
    const j = this.joy;
    if (!j) return;
    c.save();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3;
    c.beginPath(); c.arc(j.ox, j.oy, 46, 0, 7); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.35)';
    c.beginPath(); c.arc(j.ox + j.dx * Math.min(46, j.len), j.oy + j.dy * Math.min(46, j.len), 18, 0, 7); c.fill();
    c.restore();
  }
}

function hexA(hex, a) {
  if (!hex || hex[0] !== '#') return hex;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
}
const typeColorHit = t => ({ '불꽃': '#ffb238', '물': '#8fd3ff', '전기': '#fff27a', '풀': '#9dff8a', '얼음': '#dff8ff', '고스트': '#b38cff', '독': '#d08cff' }[t] || '#ffffff');
