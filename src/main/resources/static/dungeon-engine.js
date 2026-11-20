/* =========================================================
 * 오늘의 던전 - 3분 서바이벌 + 보스전 (캔버스 엔진, 뱀파이어 서바이벌식)
 *
 *  입장 강화 → 몰려오는 야생 포켓몬 → 경험치 결정 줍기 → 레벨 업마다 카드 3장 중 하나
 *  (기술 레벨 업 · 지닌 물건 · 각성) → 1:30 중간 보스 → 3:00 정리, 보스 직전 강화
 *  → WARNING → 보스 (타입별 고유 패턴, 2페이즈) → 쓰러뜨리면 포획 화면 (dungeon.js)
 *
 *  파티 포켓몬은 대표 타입(mainType)의 기술로 자동 공격. 상성·치명타·지닌 물건이 피해에 반영.
 * ========================================================= */

const ARENA = 2400;            // 경기장 한 변 (월드 단위 = 화면 px × 배율)
const TILE = 32;
const RUN_TIME = 180;          // 진행도 기준 시간 (몬스터 강해지는 속도·이벤트 시점)
const ELITE_TIMES = [30, 65, 115, 145, 165];
const SWARM_TIMES = [50, 110, 160];
const SKILL_MAX = 8;
const ITEM_MAX = 5;
const ITEM_SLOTS = 6;
const EXPLODERS = new Set([74, 75, 76, 100, 101, 109, 110, 299, 337, 338, 343, 344, 436, 437]);
const xpNeed = lv => Math.round(6 + lv * 4 + lv * lv * 0.3);   // 판 하나에 레벨 업 10~12번 정도
const itemSprite = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${id}.png`;

/* ---------- 지닌 물건 (레벨 업 카드) ---------- */
const TYPE_ITEM = {
  '불꽃': ['charcoal', '목탄'], '물': ['mystic-water', '신비의물방울'], '풀': ['miracle-seed', '기적의씨'],
  '전기': ['magnet', '자석'], '얼음': ['never-melt-ice', '녹지않는얼음'], '격투': ['black-belt', '검은띠'],
  '독': ['poison-barb', '독바늘'], '땅': ['soft-sand', '부드러운모래'], '비행': ['sharp-beak', '예리한부리'],
  '에스퍼': ['twisted-spoon', '휘어진스푼'], '벌레': ['silver-powder', '은빛가루'], '바위': ['hard-stone', '딱딱한돌'],
  '고스트': ['spell-tag', '저주의부적'], '드래곤': ['dragon-fang', '용의이빨'], '악': ['black-glasses', '검은안경'],
  '강철': ['metal-coat', '금속코트'], '페어리': ['pixie-plate', '정령플레이트'], '노말': ['silk-scarf', '실크스카프'],
};
const HELD = [
  { id: 'life-orb', name: '생명의구슬', icon: '🔮', desc: '모든 공격 피해 +10%', apply: g => { g.mods.dmg *= 1.10; } },
  { id: 'quick-claw', name: '선제공격손톱', icon: '⏩', desc: '공격 간격 -8%', apply: g => { g.mods.rate *= 1.08; } },
  { id: 'wide-lens', name: '광각렌즈', icon: '◎', desc: '폭발·장판·궤도·빔 범위 +10%', apply: g => { g.mods.area *= 1.10; } },
  { id: 'scope-lens', name: '초점렌즈', icon: '✦', desc: '치명타 확률 +6%', apply: g => { g.mods.crit += 0.06; } },
  { id: 'choice-scarf', name: '구애스카프', icon: '👟', desc: '이동 속도 +7%', apply: g => { g.mods.move *= 1.07; } },
  { id: 'leftovers', name: '먹다남은음식', icon: '🍎', desc: '1초마다 최대 체력의 0.4% 회복', apply: g => { g.mods.regen += 0.004; } },
  { id: 'shell-bell', name: '조개껍질방울', icon: '🐚', desc: '쓰러뜨릴 때마다 체력 +1', apply: g => { g.mods.leech += 1; } },
  { id: 'rocky-helmet', name: '울퉁불퉁멧', icon: '🪖', desc: '받는 피해 -8%, 부딪힌 적에게 반격', apply: g => { g.mods.armor *= 0.92; g.mods.thorns += 6; } },
  { id: 'expert-belt', name: '달인의띠', icon: '🎯', desc: '효과가 굉장한 공격 +12%', apply: g => { g.mods.superEff *= 1.12; } },
  { id: 'exp-share', name: '학습장치', icon: '🧲', desc: '경험치·골드 줍는 범위 +30%', apply: g => { g.mods.magnet *= 1.3; } },
  { id: 'lucky-egg', name: '행복의알', icon: '🥚', desc: '얻는 경험치 +12%', apply: g => { g.mods.xp *= 1.12; } },
  { id: 'amulet-coin', name: '부적금화', icon: '💰', desc: '줍는 골드 +12%', apply: g => { g.mods.gold *= 1.12; } },
  { id: 'kings-rock', name: '왕의징표석', icon: '👑', desc: '공격할 때 4% 확률로 적이 풀죽어 멈춤', apply: g => { g.mods.flinch += 0.04; } },
  { id: 'bright-powder', name: '반짝가루', icon: '✨', desc: '적의 공격을 5% 확률로 피함', apply: g => { g.mods.dodge += 0.05; } },
  { id: 'focus-sash', name: '기합의띠', icon: '🎗', desc: '쓰러질 공격을 1번 버팀 (레벨마다 1번)', max: 3, apply: g => { g.mods.sash += 1; } },
  { id: 'big-root', name: '큰뿌리', icon: '🌱', desc: '최대 체력 +10%, 회복량 +15%', apply: g => { g.player.maxHp *= 1.1; g.player.hp *= 1.1; g.mods.healMul *= 1.15; } },
];
function skillUpDesc(lv) {
  const d = ['피해 +18%'];
  if (lv === 3 || lv === 6) d.push('발사 수 +1');
  if (lv === 2 || lv === 4 || lv === 7) d.push('범위 +10%');
  if (lv === 5 || lv === 8) d.push('재사용 -8%');
  return d.join(' · ');
}

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
    this.tier = start.tier || { no: 2, hp: 1, dmg: 1, spawn: 1, label: 'NORMAL' };
    this.ultDark = 0;
    this.time = 0;                   // 생존 시간 (보스 전까지)
    this.killTarget = start.killTarget || 390;   // 이만큼 쓰러뜨리면 보스
    this.clock = 0;                  // 연출용 전체 시간
    this.phase = 'loading';
    this.picks = 0;
    this.items = {};       // 지닌 물건 id → 레벨
    this.typeBoost = {};   // 타입 강화 물건: 타입 → 추가 피해 비율
    this.lv = 1;
    this.xp = 0;
    this.pendingLv = 0;
    this.mods = { dmg: 1, rate: 1, area: 1, extra: 0, move: 1, leech: 0, magnet: 1, gold: 1, crit: 0.05, armor: 1, superEff: 1,
      regen: 0, thorns: 0, xp: 1, flinch: 0, dodge: 0, sash: 0, healMul: 1 };
    this.gems = [];
    this.src = null;       // 지금 피해를 주는 파티원 (피해 통계용)
    this.chests = [];
    this.hazards = [];     // 보스가 남긴 장판
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
      if (b.use === 'BUFF_CRIT') this.mods.crit += b.value / 100;
    });
    this.potions = (start.brought || []).filter(b => b.use === 'HEAL').map(b => ({ ...b, left: b.qty }));
    this.revive = (start.brought || []).find(b => b.use === 'REVIVE');
    this.revivesLeft = this.revive ? this.revive.qty : 0;

    const party = start.party;
    const hp = 50 + party.reduce((n, m) => n + m.combat.hp, 0) * 0.9;
    this.player = { x: ARENA / 2, y: ARENA / 2, hp, maxHp: hp, inv: 0, vx: 0, vy: 0, def: party.reduce((n, m) => n + m.combat.defense, 0) / party.length };
    this.trail = [];
    this.members = party.map((m, i) => {
      const types = m.owned.pokemon.typesKo;
      const skill = skillOf(m.owned.pokemon);     // 대표 타입 기술 / 전설은 궁극기 (dungeon-skills.js)
      const legend = !!skill.legend;
      const sub = legend ? skillOf({ ...m.owned.pokemon, legendary: false }) : null;   // 전설: 궁극기 사이사이 쓰는 기본기
      const spd = m.combat.speed;
      if (skill.armor) this.mods.armor *= 1 - skill.armor;
      return {
        i, m, owned: m.owned, types, type: skill.t, pattern: skill.p, skill, sub, legend,
        color: typeColor(skill.t),
        x: ARENA / 2, y: ARENA / 2, flip: 1, cd: legend ? 1.2 : 0.4 + i * 0.25, cd2: 0.5,
        dmg: 8 + m.combat.attack * 0.12,
        slv: 1, power: 1, extra: 0, area: 1, awake: false, awT: 4,
        stat: { dmg: 0, boss: 0, hits: 0, crits: 0, kills: 0 },
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
    this.mobDefs = this.s.mobs.map(p => ({ p, types: p.typesKo, main: mainType(p) }));
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

  /** 카드 3장 만들기: 기술 레벨 업 · 지닌 물건(새로 / 레벨 업) · 각성 */
  buildCards(n = 3, chest = false) {
    const pool = [];
    const own = Object.keys(this.items).length;
    this.members.forEach(mb => {
      const tItem = TYPE_ITEM[mb.skill.t]?.[0];
      if (!mb.awake && mb.slv >= SKILL_MAX && tItem && this.items[tItem]) {
        pool.push({ id: `aw:${mb.i}`, kind: 'awaken', img: mb.sprites.still || mb.sprites.front, color: mb.color,
          name: `각성! ${mb.skill.name}`, desc: '피해 ×1.5 · 발사 수 +1 · 4초마다 타입 폭발 · 오라', lv: 0, max: 1, w: chest ? 50 : 8 });
      }
      if (mb.slv < SKILL_MAX) {
        pool.push({ id: `sk:${mb.i}`, kind: 'skill', img: mb.sprites.still || mb.sprites.front, color: mb.color,
          name: `${mb.skill.name} Lv.${mb.slv + 1}`, desc: skillUpDesc(mb.slv + 1), lv: mb.slv, max: SKILL_MAX, w: 3 });
      }
    });
    [...new Set(this.members.map(mb => mb.skill.t))].forEach(t => {
      const [id, name] = TYPE_ITEM[t] || [];
      if (!id) return;
      const lv = this.items[id] || 0;
      if (lv >= ITEM_MAX || (!lv && own >= ITEM_SLOTS)) return;
      pool.push({ id: `it:${id}`, kind: 'item', img: itemSprite(id), icon: '◆', color: typeColor(t),
        name: `${name}${lv ? ` Lv.${lv + 1}` : ''}`, desc: `${t} 타입 공격 피해 +12%${!lv ? ' · 각성 재료' : ''}`, lv, max: ITEM_MAX, w: 2.6 });
    });
    HELD.forEach(h => {
      const lv = this.items[h.id] || 0, max = h.max || ITEM_MAX;
      if (lv >= max || (!lv && own >= ITEM_SLOTS)) return;
      pool.push({ id: `it:${h.id}`, kind: 'item', img: itemSprite(h.id), icon: h.icon, color: '#ffd84a',
        name: `${h.name}${lv ? ` Lv.${lv + 1}` : ''}`, desc: h.desc, lv, max, w: lv ? 1.8 : 1.3 });
    });
    const cards = [];
    while (cards.length < n && pool.length) {
      let r = Math.random() * pool.reduce((t, c) => t + c.w, 0), k = 0;
      while (r > pool[k].w) { r -= pool[k].w; k++; }
      cards.push(pool.splice(Math.min(k, pool.length - 1), 1)[0]);
    }
    if (!cards.length) {
      cards.push({ id: 'heal', kind: 'misc', icon: '🍖', name: '맛있는 열매', desc: '체력 50% 회복', lv: 0, max: 0, color: '#7dffa0' },
        { id: 'gold', kind: 'misc', icon: '💰', name: '금덩이', desc: '골드 +40', lv: 0, max: 0, color: '#ffd84a' });
    }
    return cards;
  }

  applyCard(id) {
    const [k, v] = id.split(':');
    if (k === 'sk') {
      const mb = this.members[+v];
      mb.slv++;
      mb.power += 0.18;
      if (mb.slv === 3 || mb.slv === 6) mb.extra++;
      if ([2, 4, 7].includes(mb.slv)) mb.area *= 1.1;
      if (mb.slv === 5 || mb.slv === 8) mb.cdMul *= 0.92;
      this.text(mb.x, mb.y - 70, `${mb.skill.name} Lv.${mb.slv}!`, mb.color, 14);
    } else if (k === 'aw') {
      const mb = this.members[+v];
      mb.awake = true;
      mb.power *= 1.5;
      mb.extra++;
      this.hooks.onBanner(`✦ ${mb.owned.nickname || mb.owned.pokemon.nameKo} 각성! ✦`, 'win');
      this.flash = 0.6;
      this.shake = 10;
      this.parts.push({ kind: 'ring', x: mb.x, y: mb.y - 20, r: 10, R: 300, life: 0.6, max: 0.6, color: mb.color, w: 12 });
      this.burst(mb.x, mb.y - 20, mb.color, 60, 360, 'star');
      SFX.play('roar');
    } else if (k === 'it') {
      const lv = (this.items[v] || 0) + 1;
      this.items[v] = lv;
      const type = Object.keys(TYPE_ITEM).find(t => TYPE_ITEM[t][0] === v);
      if (type) this.typeBoost[type] = lv * 0.12;
      else HELD.find(h => h.id === v).apply(this);
    } else if (k === 'heal') {
      this.heal(this.player.maxHp * 0.5);
    } else if (k === 'gold') {
      this.gold += 40 * this.mods.gold;
    }
  }

  offerPick(title, sub, chest = false) {
    const cards = this.buildCards(3, chest);
    this.paused = true;
    this.picks++;
    this.picking = true;
    this.hooks.onPick(cards, title, sub, id => {
      this.applyCard(id);
      SFX.play('pick');
      this.burst(this.player.x, this.player.y, '#ffe680', 26, 220, 'star');
      this.picking = false;
      if (this.pendingLv > 0) {
        this.pendingLv--;
        setTimeout(() => this.offerPick(`레벨 ${this.lv - this.pendingLv}!`, '하나 더 골라요'), 120);
        return;
      }
      this.paused = false;
      this.afterPick?.();
      this.afterPick = null;
    });
  }

  gainXp(v) {
    this.xp += v * this.mods.xp;
    let ups = 0;
    while (this.xp >= xpNeed(this.lv)) { this.xp -= xpNeed(this.lv); this.lv++; ups++; }
    if (!ups) return;
    SFX.play('starup');
    this.parts.push({ kind: 'ring', x: this.player.x, y: this.player.y - 20, r: 10, R: 160, life: 0.5, max: 0.5, color: '#7fe0ff', w: 8 });
    this.burst(this.player.x, this.player.y - 20, '#9fe8ff', 30, 260, 'star');
    if (this.phase !== 'play' && this.phase !== 'boss') return;
    if (this.picking) { this.pendingLv += ups; return; }
    this.pendingLv += ups - 1;
    this.offerPick(`레벨 ${this.lv - this.pendingLv}!`, '카드를 하나 골라 강해져요');
  }

  update(raw) {
    this.clock += raw;
    // 느린 화면(보스 처치·쓰러짐) 서서히 복귀
    this.slowmo += (1 - this.slowmo) * Math.min(1, raw * 1.2);
    const dt = raw * this.slowmo;
    this.shake = Math.max(0, this.shake - raw * 30);
    this.ultDark = Math.max(0, this.ultDark - raw * 0.8);
    this.flash = Math.max(0, this.flash - raw * 2.5);

    this.refreshTargets();
    if (this.phase === 'play') {
      this.time += dt;
      this.timeline();
      this.spawn(dt);
    }
    if (this.phase !== 'dead' && this.phase !== 'end') this.movePlayer(dt);
    if (this.mods.regen && this.phase !== 'dead' && this.phase !== 'end') this.heal(this.player.maxHp * this.mods.regen * dt, true);
    this.updateHazards(dt);
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

  /** 진행 단계(초 단위): 실제 시간과 처치 진행도 중 앞선 쪽 → 빨리 쓸어버리면 몬스터도 빨리 강해짐 */
  stage() {
    return Math.max(this.time, Math.min(1, this.kills / this.killTarget) * 170);
  }

  timeline() {
    const t = this.stage();
    if (this.kills >= this.killTarget / 2 && !this.events.has('mid')) {
      this.events.add('mid');
      this.spawnMid();
    }
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
    if (this.kills >= this.killTarget) this.toBoss();
  }

  /* ---------- 3분 → 보스 ---------- */
  toBoss() {
    this.phase = 'clear';
    // 정화의 파동: 남은 몬스터 정리
    this.fx.push({ kind: 'purge', x: this.player.x, y: this.player.y, r: 0, life: 1.2, max: 1.2 });
    SFX.play('explode');
    this.shake = 10;
    this.enemies.forEach(e => {
      e.dying = 0.6 + Math.random() * 0.5;
    });
    // 남은 경험치 결정은 모두 빨려 들어옴
    this.gemRush = true;
    setTimeout(() => {
      this.afterPick = () => this.warning();
      this.offerPick('보스 직전 강화', `곧 ${this.s.boss.legendary ? '전설의 포켓몬' : '보스'}이(가) 나타나요. 마지막 강화!`, true);
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
    const legend = !!b.legendary;
    // 런 안에서 레벨 업으로 강해지는 만큼 보스도 튼튼하게
    const hp = (520 + st.bst * 2.3) * this.diff * (1 + 0.45 * (n - 1)) * (1.5 + this.lv * 0.035) * (legend ? 1.35 : 1) * this.tier.hp;
    if (legend) this.legendDmg = 1.2;
    const main = mainType(b);
    const cx = clamp(this.player.x, 700, ARENA - 700), cy = clamp(this.player.y - 220, 700, ARENA - 700);
    this.arenaRing = { x: cx, y: cy + 120, r: 560, a: 0 };
    this.boss = {
      kind: 'boss', p: b, types: b.typesKo, type: main, color: typeColor(main), legend,
      spr: this.bossSpr, shiny: this.s.bossShiny,
      x: cx, y: cy, z: 700, hp, max: hp, lag: hp, r: 46, scale: 2.1,
      state: 'enter', timer: 0, phase2: false, flash: 0, flip: 1, last: null, slow: 0,
    };
    this.phase = 'boss';
    this.gemRush = false;
    this.hooks.onBoss(this.boss);
    if (legend) this.hooks.onBanner('★ 전설의 포켓몬이 강림했다! ★', 'legend');
  }

  /* ---------- 생성 ---------- */
  spawn(dt) {
    const t = this.stage();
    // 파티가 적으면 조금 덜 몰려옴
    const rate = (0.8 + t * 0.022) * (0.7 + 0.15 * this.members.length) * this.tier.spawn;
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc--;
      if (this.enemies.length < 220) this.spawnEnemy(false);
    }
    // 다 쓸어버려도 화면이 비지 않게 최소 마릿수를 채움 → 강하면 그만큼 빨리 목표 처치 수에 도달
    const minAlive = Math.min(200, 20 + Math.min(1, this.kills / this.killTarget) * 75);
    if (this.enemies.length < minAlive) {
      this.fillAcc = (this.fillAcc || 0) + dt * 18;
      while (this.fillAcc >= 1) { this.fillAcc--; this.spawnEnemy(false); }
    }
  }

  spawnEnemy(elite, at) {
    const d = pickOne(this.mobDefs);
    if (!d) return null;
    const st = d.p.stats || { bst: 300, speed: 50, hp: 45 };
    const t = this.stage();
    let x, y;
    if (at) { ({ x, y } = at); } else {
      const a = Math.random() * Math.PI * 2, r = rand(560, 700);
      x = clamp(this.player.x + Math.cos(a) * r, 60, ARENA - 60);
      y = clamp(this.player.y + Math.sin(a) * r, 60, ARENA - 60);
    }
    let hp = (8 + st.bst * 0.02) * (1 + t / 60 * 0.7) * this.diff * (0.75 + 0.125 * this.members.length) * (elite ? 10 : 1) * this.tier.hp;
    const shiny = Math.random() < 0.04;
    // 대표 타입에 따라 움직임이 다름
    const main = d.main;
    let ai = 'chase';
    if (EXPLODERS.has(d.p.id)) ai = 'boom';
    else if (main === '비행') ai = 'zig';
    else if ((main === '고스트' || main === '에스퍼') && (elite || Math.random() < 0.4)) ai = 'shoot';
    else if (main === '바위' || main === '강철') ai = 'tank';
    else if (main === '전기') ai = 'dash';
    if (ai === 'tank') hp *= 1.6;
    const e = {
      kind: elite ? 'elite' : 'mob', d, types: d.types, main, ai, x, y, hp, max: hp,
      spd: Math.min(95, 46 + st.speed * 0.25) * (elite ? 0.8 : 1) * rand(0.9, 1.1) * (ai === 'tank' ? 0.75 : ai === 'zig' ? 1.15 : 1),
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

  /** 1:30 중간 보스: 크고 단단하고 탄막을 뿌림. 쓰러뜨리면 보물상자 */
  spawnMid() {
    const e = this.spawnEnemy(true);
    if (!e) return;
    e.mid = true;
    e.hp *= 3.5; e.max = e.hp;
    e.r = 44; e.scale = 1.9; e.ai = 'mid'; e.fireT = 2;
    e.spd *= 0.85;
    this.hooks.onBanner(`중간 보스 ${e.d.p.nameKo} 출현!`, 'elite');
    SFX.play('roar');
    this.shake = 10;
  }

  swarm() {
    this.hooks.onBanner('야생 포켓몬 무리가 몰려온다!', 'swarm');
    SFX.play('tele');
    const n = 22 + Math.floor(this.stage() / 10);
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
    if (this.mods.dodge && Math.random() < this.mods.dodge) {
      p.inv = 0.3;
      this.text(p.x, p.y - 50, 'MISS', '#c9e8ff', 13);
      return;
    }
    if (this.mods.thorns && from && (from.kind === 'mob' || from.kind === 'elite')) this.damage(from, this.mods.thorns * (1 + this.stage() / 60), '노말', p, 80, true);
    const reduced = amount * this.tier.dmg * (this.legendDmg || 1) * this.mods.armor * (100 / (100 + p.def * 0.5));
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
    if (p.hp <= 0) {
      if (this.mods.sash > 0) {
        this.mods.sash--;
        p.hp = 1; p.inv = 2;
        this.hooks.onBanner('기합의띠로 버텼다!', 'info');
        this.burst(p.x, p.y, '#ffffff', 30, 240, 'star');
        return;
      }
      if (this.revivesLeft > 0) {
        this.revivesLeft--;
        this.used[this.revive.code] = (this.used[this.revive.code] || 0) + 1;
        p.hp = p.maxHp * (this.revive.value || 50) / 100; p.inv = 3;
        this.hooks.onBanner('기력의조각! 다시 일어섰다!', 'win');
        this.flash = 0.8;
        this.parts.push({ kind: 'ring', x: p.x, y: p.y - 20, r: 10, R: 260, life: 0.6, max: 0.6, color: '#ffe680', w: 12 });
        this.burst(p.x, p.y - 20, '#ffe680', 60, 320, 'star');
        this.enemies.forEach(e => { if (dist2(e, p) < 260 * 260) { const a = Math.atan2(e.y - p.y, e.x - p.x); e.kx += Math.cos(a) * 400; e.ky += Math.sin(a) * 400; } });
        SFX.play('heal');
        return;
      }
      this.die();
    }
  }

  heal(n, quiet) {
    const p = this.player;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + n * this.mods.healMul);
    if (!quiet && p.hp - before >= 1) this.text(p.x, p.y - 60, `+${Math.round(p.hp - before)}`, '#6dff8a', 14);
  }

  usePotion(i) {
    const pt = this.potions[i];
    if (!pt || pt.left <= 0 || !['play', 'boss', 'clear', 'warning'].includes(this.phase) || this.paused) return;
    if (this.player.hp >= this.player.maxHp) { this.hooks.onBanner('체력이 가득 차 있어요', 'info'); return; }
    pt.left--;
    this.used[pt.code] = (this.used[pt.code] || 0) + 1;
    this.heal(this.player.maxHp * pt.value / 100);
    if (pt.code === 'full-restore') { this.player.inv = 3; this.hooks.onBanner('회복약! 3초 동안 무적', 'info'); }
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
      if (mb.skill.orbitN) this.orbit(mb, dt, { n: mb.skill.orbitN, R: 50, mul: 0.35, kind: mb.skill.orbitKind });
      if (mb.awake) {
        mb.awT -= dt;
        if (mb.awT <= 0 && this.targetsList.length) { mb.awT = 4; this.awakenNova(mb); }
      }
      if (mb.sub) {   // 전설: 기본기도 따로 씀
        mb.cd2 -= dt * this.mods.rate;
        if (mb.cd2 <= 0) {
          mb.lastCd = null;
          const fired = this.attack(mb, mb.sub);
          mb.cd2 = fired ? (mb.lastCd ?? mb.sub.cd ?? BASE_CD[mb.sub.p] ?? 1) * mb.cdMul * 1.15 : 0.15;
        }
      }
      if (mb.pattern === 'orbit') { this.orbit(mb, dt); return; }
      mb.cd -= dt * this.mods.rate;
      if (mb.cd <= 0) {
        mb.lastCd = null;
        const fired = this.attack(mb);
        const cd = mb.lastCd ?? mb.skill.cd ?? BASE_CD[mb.pattern] ?? 1;
        mb.cd = fired ? cd * mb.cdMul : 0.15;
        if (fired && mb.legend) {
          this.text(mb.x, mb.y - 80, `★ ${mb.skill.name}!`, '#ffe680', 16);
          this.burst(mb.x, mb.y - 30, '#ffe680', 18, 200, 'star');
        }
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
      r: o.r || 6, dmg: mb.dmg * mb.power * this.mods.dmg * (o.mul || 1), type: s.t, color: typeColor(s.t), owner: mb.m ? mb : this.src,
      life: o.life || 1.3, pierce: o.pierce || 1, hit: new Map(), kind: o.kind || 'bolt', t0: this.clock, ...o,
    });
  }

  addCloud(x, y, r, dmg, s) {
    this.fx.push({ kind: 'cloud', x, y, r, dmg, type: s.t, color: typeColor(s.t), life: 3, max: 3, tick: 0, every: 0.45 });
  }

  part(kind, x, y, vx, vy, life, size, color) {
    if (this.parts.length < 700) this.parts.push({ kind, x, y, vx, vy, life, max: life, size, color });
  }

  /** 기술의 지연 공격: 그 사이 생긴 투사체·효과도 이 파티원 것으로 기록 */
  later(mb, fn, ms) {
    return setTimeout(() => this.as(mb, fn), ms);
  }

  as(mb, fn) {
    const prev = this.src, n0 = this.fx.length;
    this.src = mb;
    try { return fn(); } finally {
      for (let i = n0; i < this.fx.length; i++) if (!this.fx[i].owner) this.fx[i].owner = mb;
      this.src = prev;
    }
  }

  attack(mb, s = mb.skill) {
    return this.as(mb, () => this.attackNow(mb, s));
  }

  attackNow(mb, s) {
    const P = s.p;
    const self = ['aura', 'quake', 'wave', 'sing', 'selfdestruct', 'splash', 'heal', 'pillars', 'timestop', 'mines', 'starfall', 'legendrandom'].includes(P);
    const tgt = this.nearest(mb, P === 'melee' || P === 'whip' ? 150 : P === 'sweep' || P === 'rend' ? 520 : 440);
    if (!tgt && !self) return false;
    if (P === 'sing' && !this.nearest(mb, (s.R || 190) * this.mods.area)) return false;
    if (s.legend && !this.nearest(mb, 520)) return false;
    const ang = tgt ? Math.atan2(tgt.y - mb.y, tgt.x - mb.x) : 0;
    return CAST[P](this, mb, s, tgt, ang, mb.dmg * mb.power * this.mods.dmg);
  }

  /** 각성: 4초마다 타입색 폭발 고리 */
  awakenNova(mb) {
    const n = 18, s = { t: mb.skill.t };
    for (let i = 0; i < n; i++) this.shot(mb, s, i * Math.PI * 2 / n + this.clock, { mul: 0.9, r: 9, speed: 380, kind: 'orb', pierce: 3, life: 1.1 });
    this.parts.push({ kind: 'ring', x: mb.x, y: mb.y - 14, r: 10, R: 220, life: 0.45, max: 0.45, color: mb.color, w: 10 });
    SFX.play('zap', 200);
  }

  orbit(mb, dt, o) {
    const s = o || mb.skill;
    const n = (s.n || 2) + this.mods.extra + mb.extra;
    if (o) mb.angle2 = (mb.angle2 || 0) + dt * 4; else mb.angle += dt * 3.3;
    const ang0 = o ? mb.angle2 : mb.angle;
    const R = (s.R || 72) * this.mods.area * mb.area;
    mb.orbKind = o ? o.kind : null;
    mb.orbs = [];
    for (let i = 0; i < n; i++) {
      const a = ang0 + i * Math.PI * 2 / n;
      const o = { x: mb.x + Math.cos(a) * R, y: mb.y - 10 + Math.sin(a) * R * 0.8, a };
      mb.orbs.push(o);
      for (const e of this.targetsList) {
        if (dist2(o, e) > (e.r + 14) ** 2) continue;
        e.orbHit = e.orbHit || new Map();
        const last = e.orbHit.get(mb) || 0;
        if (this.clock - last > 0.4) {
          e.orbHit.set(mb, this.clock);
          this.damage(e, mb.dmg * mb.power * this.mods.dmg * (s.mul || 0.6), mb.skill.t, mb);
        }
      }
    }
  }

  /** 피해: 상성·치명타·강화 반영, 숫자 표시, 넉백, 처치 처리 */
  damage(e, amount, type, from, knock = 40, quiet = false) {
    if (e.hp <= 0 || e.dying) return;
    let mult = typeMultiplier(type, e.types);
    if (mult > 1) mult *= this.mods.superEff;
    mult *= 1 + (this.typeBoost[type] || 0);
    if (this.mods.flinch && e.kind !== 'boss' && Math.random() < this.mods.flinch) e.sleep = Math.max(e.sleep || 0, 0.5);
    const crit = Math.random() < this.mods.crit + (from?.crit || 0);
    const dmg = amount * mult * (crit ? 1.5 : 1) * (e.kind === 'boss' && (e.state === 'enter' || e.state === 'vanish') ? 0 : 1);
    if (dmg <= 0) return;
    const who = from?.owner || (from?.m ? from : null) || this.src;
    if (who?.stat) {
      const real = Math.min(dmg, Math.max(0, e.hp));
      who.stat.dmg += real; who.stat.hits++;
      if (crit) who.stat.crits++;
      if (e.kind === 'boss') who.stat.boss += real;
      if (e.hp - dmg <= 0 && e.kind !== 'boss') who.stat.kills++;
    } else {
      this.otherDmg = (this.otherDmg || 0) + Math.min(dmg, Math.max(0, e.hp));
    }
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
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    if (e.kind === 'elite') this.elites++;
    SFX.play('kill', 50);
    this.burst(e.x, e.y - 10, typeColor(e.types[0]), e.kind === 'elite' ? 40 : 12, e.kind === 'elite' ? 280 : 170);
    this.parts.push({ kind: 'ring', x: e.x, y: e.y - 10, r: 6, R: e.kind === 'elite' ? 90 : 34, life: 0.3, max: 0.3, color: '#ffffff' });
    if (this.mods.leech) this.heal(this.mods.leech);
    const coins = e.kind === 'elite' ? 6 : Math.random() < 0.42 ? 1 : 0;
    const val = e.kind === 'elite' ? 3 : 1 + (this.stage() > 90 ? 1 : 0) * (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < coins; i++) this.coins.push({ x: e.x, y: e.y, vx: rand(-120, 120), vy: rand(-160, -40), v: val, t: 0 });
    if (e.shiny) { for (let i = 0; i < 4; i++) this.coins.push({ x: e.x, y: e.y, vx: rand(-150, 150), vy: rand(-180, -40), v: 3, t: 0 }); }
    if (Math.random() < (e.kind === 'elite' ? 1 : 0.018)) this.orbs.push({ x: e.x, y: e.y, amt: e.kind === 'elite' ? 0.2 : 0.08, t: 0 });
    // 경험치 결정
    const gv = e.mid ? 40 : e.kind === 'elite' ? 12 : 1 + (this.stage() > 60 ? 1 : 0) + (this.stage() > 125 ? 1 : 0);
    this.dropGem(e.x + rand(-6, 6), e.y + rand(-6, 6), gv);
    if (e.kind === 'elite') {
      this.chests.push({ x: e.x, y: e.y, t: 0, big: !!e.mid });
      if (e.mid) { this.hooks.onBanner('중간 보스를 쓰러뜨렸다! 보물상자!', 'win'); SFX.play('win'); }
    }
  }

  dropGem(x, y, v) {
    if (this.gems.length >= 450) {   // 너무 많으면 가장 오래된 결정에 합침
      const g = this.gems[0];
      g.v += v;
      return;
    }
    this.gems.push({ x, y, v, t: 0 });
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
      let spd = e.spd * (e.slow > 0 ? 0.55 : 1);
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      let mv = a;
      const d = Math.sqrt(dist2(e, p));
      if (e.ai === 'zig') { mv = a + Math.sin(e.phase * 3.2) * 0.9; }
      else if (e.ai === 'dash') {
        e.dashT = (e.dashT ?? rand(1, 3)) - dt;
        if (e.dashT < 0) {
          spd *= 3.2;
          if (Math.random() < 0.3) this.part('spark', e.x, e.y - 10, rand(-30, 30), rand(-30, 30), 0.2, 3, '#fff27a');
          if (e.dashT < -0.35) e.dashT = rand(2, 3.5);
        }
      } else if (e.ai === 'shoot' || e.ai === 'mid') {
        if (e.ai === 'shoot') { if (d < 230) spd *= -0.5; else if (d < 320) spd = 0; }
        e.fireT = (e.fireT ?? rand(1.5, 3)) - dt;
        if (e.fireT <= 0 && d < 520 && this.phase === 'play') {
          const col = typeColor(e.main), dm = 4 * this.diff * (1 + this.stage() / 120);
          if (e.ai === 'mid') {
            e.fireT = 2.4;
            const off = Math.random();
            for (let k = 0; k < 14; k++) this.ebullet(e.x, e.y - 30, off + k * Math.PI * 2 / 14, 170, col, dm * 1.4, 8);
            SFX.play('explode', 200);
          } else {
            e.fireT = rand(2.8, 3.8);
            this.ebullet(e.x, e.y - 14, a, 170, col, dm, 6);
          }
        }
      } else if (e.ai === 'boom') {
        if (e.fuse !== undefined) {
          e.fuse -= dt;
          spd = 0;
          if (e.fuse <= 0) {
            if (d < 80) this.hurt(e.dmg * 2.2, e);
            this.burst(e.x, e.y - 10, '#ffb238', 30, 280);
            this.burst(e.x, e.y - 10, '#ffffff', 12, 200);
            this.parts.push({ kind: 'ring', x: e.x, y: e.y - 10, r: 8, R: 80, life: 0.3, max: 0.3, color: '#ffb238', w: 8 });
            SFX.play('explode', 120);
            this.shake = Math.max(this.shake, 5);
            e.hp = 0;
            this.kill(e);
            continue;
          }
        } else if (d < 60) { e.fuse = 0.6; }
      }
      e.x += (Math.cos(mv) * spd + e.kx) * dt;
      e.y += (Math.sin(mv) * spd + e.ky) * dt;
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
      case 'laser': {
        b.timer -= dt;
        b.laserA += b.spinDir * 1.25 * rate * dt;
        const bx = b.x, by = b.y - 30, dx = p.x - bx, dy = p.y - by;
        const along = dx * Math.cos(b.laserA) + dy * Math.sin(b.laserA), side = -dx * Math.sin(b.laserA) + dy * Math.cos(b.laserA);
        if (along > 0 && along < 760 && Math.abs(side) < 30) this.hurt(14 * this.diff, null);
        if (Math.random() < 0.8) {
          const r = rand(40, 760);
          this.part('spark', bx + Math.cos(b.laserA) * r, by + Math.sin(b.laserA) * r, rand(-80, 80), rand(-80, 80), 0.3, 4, pickOne([b.color, '#ffffff']));
        }
        if (b.timer <= 0) { b.state = 'idle'; b.timer = 0.9 / rate; }
        break;
      }
      case 'cross': {
        b.timer -= dt;
        this.ultDark = 1;
        b.crossA += b.spinDir * 0.55 * dt;
        const bx = b.x, by = b.y - 30;
        for (let i = 0; i < b.crossN; i++) {
          const a = b.crossA + i * Math.PI * 2 / b.crossN, dx = p.x - bx, dy = p.y - by;
          const along = dx * Math.cos(a) + dy * Math.sin(a), side = -dx * Math.sin(a) + dy * Math.cos(a);
          if (along > 0 && along < 620 && Math.abs(side) < 26) this.hurt(13 * this.diff, null);
          if (Math.random() < 0.5) { const r = rand(40, 620); this.part('star', bx + Math.cos(a) * r, by + Math.sin(a) * r, rand(-60, 60), rand(-60, 60), 0.4, 4, pickOne(['#ffd84a', b.color, '#ffffff'])); }
        }
        if (b.timer <= 0) { b.state = 'idle'; b.timer = 1.0; }
        break;
      }
      case 'flower': {
        b.timer -= dt;
        this.ultDark = 1;
        b.spinT = (b.spinT || 0) - dt;
        if (b.spinT <= 0) {
          b.spinT = 0.11;
          b.spinA = (b.spinA || 0) + 0.19;
          const cols = ['#ff5a7a', '#ffd84a', '#6dff9a', '#5ec8ff', '#c38cff'];
          for (let k = 0; k < 5; k++) this.ebullet(b.x, b.y - 30, b.spinA + k * Math.PI * 2 / 5, 150, cols[k], 9 * this.diff, 8);
        }
        b.ringT -= dt;
        if (b.ringT <= 0) {
          b.ringT = 0.95;
          const gap = Math.atan2(p.y - b.y, p.x - b.x) + rand(-1, 1);
          for (let i = 0; i < 32; i++) {
            const a = i * Math.PI * 2 / 32;
            let da = a - gap;
            while (da > Math.PI) da -= Math.PI * 2;
            while (da < -Math.PI) da += Math.PI * 2;
            if (Math.abs(da) > 0.45) this.ebullet(b.x, b.y - 30, a, 120, '#ffffff', 9 * this.diff, 7);
          }
        }
        if (b.timer <= 0) { b.state = 'idle'; b.timer = 1.0; }
        break;
      }
      case 'vanish':
        b.timer -= dt;
        if (b.timer <= 0) {
          const a = Math.random() * Math.PI * 2;
          b.x = p.x + Math.cos(a) * 170; b.y = p.y + Math.sin(a) * 170;
          if (this.arenaRing) {
            const r = this.arenaRing, dd = Math.hypot(b.x - r.x, b.y - r.y);
            if (dd > r.r - 60) { b.x = r.x + (b.x - r.x) / dd * (r.r - 60); b.y = r.y + (b.y - r.y) / dd * (r.r - 60); }
          }
          b.state = 'tele'; b.attack = 'reappear'; b.timer = 0.55;
          this.teles.push({ kind: 'circle', x: b.x, y: b.y, r: 130, life: 0.55, max: 0.55, color: '#b28cff', dmg: 16 * this.diff, boom: true });
        }
        break;
      case 'pull': {
        b.timer -= dt;
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d > 90) { p.x -= (p.x - b.x) / d * 120 * dt; p.y -= (p.y - b.y) / d * 120 * dt; }
        b.spinT = (b.spinT || 0) - dt;
        if (b.spinT <= 0) {
          b.spinT = 0.16;
          b.spinA = (b.spinA || 0) + 0.5;
          for (let k = 0; k < 2; k++) this.ebullet(b.x, b.y - 20, b.spinA + k * Math.PI, 150, b.color);
        }
        if (Math.random() < 0.6) {
          const a = Math.random() * Math.PI * 2, r = rand(200, 380);
          this.part('puff', b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, -Math.cos(a) * 300, -Math.sin(a) * 300, 0.5, 4, '#9a7aff');
        }
        if (b.timer <= 0) { b.state = 'idle'; b.timer = 0.8 / rate; }
        break;
      }
      default:
        break;
    }
    if (b.state === 'vanish') return;
    if (dist2(b, p) < (b.r + 18) ** 2) this.hurt(b.state === 'dash' ? 18 * this.diff : 13 * this.diff, b);
  }

  bossName() { return `${this.s.boss.legendary ? '전설의 포켓몬 ' : '보스 '}${this.s.boss.nameKo}`; }

  bossChoose() {
    const b = this.boss, p = this.player;
    // 전설 보스: 세 번에 한 번(분노하면 두 번에 한 번) 궁극기
    if (b.legend) {
      b.ultN = (b.ultN || 0) + 1;
      if (b.ultN % (b.phase2 ? 2 : 3) === 0) { this.bossUltTele(); return; }
    }
    const opts = ['charge', 'burst', 'slam', 'summon'];
    const sig = BOSS_SIG[b.type] || ['waves', 'meteors'];
    opts.push(...sig, ...sig);                // 타입 고유 패턴은 더 자주
    if (b.legend) opts.push('spiral', ...sig);
    if (b.phase2) opts.push('spiral', ...sig);
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
    } else this.bossSigTele(pick);
  }

  /* ---------- 전설 보스 궁극기: 화면이 어두워지고 금빛 예고 → 피할 틈이 있는 화려한 패턴 ---------- */
  bossUltTele() {
    const b = this.boss, p = this.player;
    const u = pickOne(b.phase2 ? ['cross', 'starrain', 'flower', 'cross'] : ['cross', 'starrain', 'flower']);
    b.attack = `ult:${u}`;
    b.state = 'tele';
    b.timer = 1.4;
    const name = (typeof LEGEND_MOVE !== 'undefined' && LEGEND_MOVE[b.p.id]) || '전설의 힘';
    this.hooks.onBanner(`★ ${b.p.nameKo}의 ${name}! ★`, 'legend');
    this.ultDark = 1;
    this.shake = Math.max(this.shake, 8);
    SFX.play('roar');
    this.teles.push({ kind: 'glow', follow: b, life: 1.4, max: 1.4, color: '#ffd84a' });
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = rand(150, 320);
      this.part('star', b.x + Math.cos(a) * r, b.y - 40 + Math.sin(a) * r, -Math.cos(a) * r * 1.4, -Math.sin(a) * r * 1.4, 0.7, 4, pickOne(['#ffd84a', b.color, '#ffffff']));
    }
    if (u === 'cross') {
      b.crossN = b.phase2 ? 6 : 4;
      b.crossA = Math.random() * Math.PI;
      b.spinDir = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < b.crossN; i++) {
        this.teles.push({ kind: 'line', x: b.x, y: b.y - 30, a: b.crossA + i * Math.PI * 2 / b.crossN, len: 620, w: 40, life: 1.4, max: 1.4, follow: b });
      }
    } else if (u === 'starrain') {
      const n = 16 + this.tier.no * 2;
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          if (this.phase !== 'boss' || !this.boss || this.boss.hp <= 0) return;
          const q = this.player, aim = i % 4 === 0;
          this.teles.push({ kind: 'circle', x: q.x + (aim ? q.vx * 0.4 : rand(-320, 320)), y: q.y + (aim ? q.vy * 0.4 : rand(-240, 240)),
            r: 64, life: 1.15, max: 1.15, color: i % 2 ? '#ffd84a' : b.color, dmg: 15 * this.diff, boom: true, rock: true, star: true });
        }, 500 + i * 110);
      }
    }
  }

  bossUltAct(u) {
    const b = this.boss;
    SFX.play('explode');
    this.flash = Math.max(this.flash, 0.35);
    if (u === 'cross') { b.state = 'cross'; b.timer = 4.2; SFX.play('zap'); }
    else if (u === 'flower') { b.state = 'flower'; b.timer = 3.6; b.ringT = 0; }
    else { b.state = 'idle'; b.timer = 2.6; }
  }

  /* ---------- 보스 타입 고유 패턴: 예고 ---------- */
  bossSigTele(pick) {
    const b = this.boss, p = this.player, dm = this.diff;
    const alive = () => this.phase === 'boss' && this.boss && this.boss.hp > 0;
    if (pick === 'laser') {
      b.spinDir = Math.random() < 0.5 ? 1 : -1;
      b.laserA = Math.atan2(p.y - b.y, p.x - b.x) - b.spinDir * 1.0;
      b.timer = 0.9;
      this.teles.push({ kind: 'line', x: b.x, y: b.y - 30, a: b.laserA, len: 760, w: 44, life: 0.9, max: 0.9, follow: b });
      this.teles.push({ kind: 'glow', follow: b, life: 0.9, max: 0.9, color: b.color });
    } else if (pick === 'meteors') {
      b.timer = 0.3;
      const n = b.phase2 || b.legend ? 12 : 8;
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          if (!alive()) return;
          const q = this.player;
          this.teles.push({ kind: 'circle', x: q.x + rand(-260, 260), y: q.y + rand(-200, 200), r: 70, life: 1.0, max: 1.0,
            color: b.color, dmg: 14 * dm, boom: true, rock: true });
          if (i === 0) this.teles.push({ kind: 'circle', x: q.x, y: q.y, r: 70, life: 1.0, max: 1.0, color: b.color, dmg: 14 * dm, boom: true, rock: true });
        }, i * 110);
      }
    } else if (pick === 'puddles') {
      b.timer = 0.5;
      const n = b.phase2 ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : rand(90, 260);
        this.teles.push({ kind: 'circle', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 82, life: 0.9, max: 0.9, color: b.color, puddle: true });
      }
    } else if (pick === 'grid') {
      b.timer = 0.3;
      const n = b.phase2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          if (!alive()) return;
          const q = this.player, hor = i % 2 === 0, off = (i - (n - 1) / 2) * 30 + rand(-20, 20);
          this.teles.push(hor
            ? { kind: 'line', x: q.x - 800, y: q.y + off, a: 0, len: 1600, w: 46, life: 0.85, max: 0.85, boom: true, dmg: 15 * dm, color: b.color, zap: true }
            : { kind: 'line', x: q.x + off, y: q.y - 800, a: Math.PI / 2, len: 1600, w: 46, life: 0.85, max: 0.85, boom: true, dmg: 15 * dm, color: b.color, zap: true });
        }, i * 260);
      }
    } else if (pick === 'teleport') {
      b.timer = 0.45;
      this.teles.push({ kind: 'glow', follow: b, life: 0.45, max: 0.45, color: '#b28cff' });
    } else if (pick === 'waves') {
      b.timer = 0.4;
      this.teles.push({ kind: 'glow', follow: b, life: 0.4, max: 0.4, color: b.color });
    } else if (pick === 'pull') {
      b.timer = 0.6;
      this.teles.push({ kind: 'glow', follow: b, life: 0.6, max: 0.6, color: '#7a4fff' });
    }
  }

  /* ---------- 보스 타입 고유 패턴: 실행 ---------- */
  bossSigAct(pick) {
    const b = this.boss, p = this.player, rate = b.phase2 ? 1.35 : 1;
    if (pick === 'laser') {
      b.state = 'laser'; b.timer = 2.2;
      SFX.play('zap'); SFX.play('explode');
      this.shake = 8;
    } else if (pick === 'meteors' || pick === 'grid') {
      b.state = 'idle'; b.timer = 2.0 / rate;
    } else if (pick === 'puddles') {
      b.state = 'idle'; b.timer = 1.4 / rate;
    } else if (pick === 'teleport') {
      b.state = 'vanish'; b.timer = 0.55;
      this.burst(b.x, b.y - 40, '#b28cff', 30, 260);
      SFX.play('tele');
    } else if (pick === 'waves') {
      const rings = b.phase2 || b.legend ? 4 : 3;
      for (let r = 0; r < rings; r++) {
        setTimeout(() => {
          if (!this.boss || this.boss.hp <= 0 || this.phase !== 'boss') return;
          const n = 30, gap = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x) + rand(-1.2, 1.2);
          for (let i = 0; i < n; i++) {
            const a = i * Math.PI * 2 / n;
            let da = a - gap;
            while (da > Math.PI) da -= Math.PI * 2;
            while (da < -Math.PI) da += Math.PI * 2;
            if (Math.abs(da) < 0.42) continue;      // 빠져나갈 틈
            this.ebullet(this.boss.x, this.boss.y - 20, a, 190, r % 2 ? '#ffffff' : this.boss.color);
          }
          SFX.play('explode', 100);
        }, r * 480);
      }
      b.state = 'idle'; b.timer = (0.5 + rings * 0.48) / rate;
    } else if (pick === 'pull') {
      b.state = 'pull'; b.timer = 2.4;
      SFX.play('roar');
    }
  }

  updateHazards(dt) {
    const p = this.player;
    for (const h of this.hazards) {
      h.life -= dt;
      h.tick -= dt;
      if (h.tick <= 0 && dist2(h, p) < (h.r + 8) ** 2) { h.tick = 0.5; this.hurt(h.dmg, null); }
      if (Math.random() < 0.15) this.part('puff', h.x + rand(-h.r, h.r) * 0.7, h.y + rand(-h.r, h.r) * 0.4, 0, -20, 0.6, rand(4, 8), h.color);
    }
    this.hazards = this.hazards.filter(h => h.life > 0);
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
      case 'reappear': {
        const n = 16, off = Math.random();
        for (let i = 0; i < n; i++) this.ebullet(b.x, b.y - 20, off + i * Math.PI * 2 / n, 210, '#c9a6ff');
        this.burst(b.x, b.y - 30, '#b28cff', 40, 300);
        b.state = 'idle'; b.timer = 1.0 / rate;
        break;
      }
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
        if (String(b.attack).startsWith('ult:')) this.bossUltAct(b.attack.slice(4));
        else if (BOSS_SIG_ALL.has(b.attack)) this.bossSigAct(b.attack);
        else { b.state = 'idle'; b.timer = 1; }
    }
  }

  ebullet(x, y, a, speed, color, dmg, r) {
    this.ebullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: r || 9, dmg: dmg || 9 * this.diff, color, life: 4 });
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
      this.hooks.onBanner(`${this.bossName()}을(를) 쓰러뜨렸다!`, 'win');
      this.coinRush = true;
    }, 1400);
    setTimeout(() => this.end(true), 3600);
  }

  /* ---------- 투사체 / 공격 판정 ---------- */
  updateShots(dt) {
    for (const s of this.shots) {
      this.src = s.owner || null;
      s.life -= dt;
      if (s.accel) {
        const sp = Math.hypot(s.vx, s.vy), ns = Math.min(900, sp + s.accel * dt);
        s.vx *= ns / sp; s.vy *= ns / sp;
      }
      if (s.kind === 'missile' && Math.random() < 0.6) this.part('puff', s.x, s.y, rand(-15, 15), rand(-15, 15), 0.4, rand(3, 5), '#9aa3b5');
      if ((s.kind === 'wisp' || s.kind === 'spear') && Math.random() < 0.5) this.part('puff', s.x + rand(-4, 4), s.y + rand(-4, 4), 0, -30, 0.35, rand(3, 6), s.color);
      if (s.homing) {
        const t = this.nearest(s, s.kind === 'missile' || s.kind === 'spear' ? 700 : 400);
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
      if (s.kind === 'fire' && Math.random() < (s.big ? 0.9 : 0.5) && this.parts.length < 700) this.parts.push({ kind: 'flame', x: s.x + rand(-4, 4), y: s.y + rand(-4, 4), vx: rand(-20, 20) - s.vx * 0.08, vy: rand(-70, -30), life: 0.4, max: 0.4, size: rand(4, s.big ? 10 : 7), color: pickOne(['#ffb238', '#ff6a1a', '#ff3d1a']) });
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
          if (s.daimonji) this.daimonji(s.x, s.y, s.dmg * s.daimonji, s.type, s.area || 1);
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
    this.src = null;
    this.shots = this.shots.filter(s => s.life > 0 && s.x > 0 && s.y > 0 && s.x < ARENA && s.y < ARENA);
  }

  /** 大: 가운데에서 위·왼쪽·오른쪽·왼아래·오른아래로 불기둥이 차례로 번짐 */
  daimonji(x, y, dmg, type, area) {
    const arms = [[0, -1], [-1, 0], [1, 0], [-0.75, 0.85], [0.75, 0.85]], step = 28 * area;
    this.fx.push({ kind: 'flame', x, y, r: 34 * area, life: 0.9, max: 0.9, big: true });
    this.shake = Math.max(this.shake, 6);
    const owner = this.src;
    for (let k = 1; k <= 4; k++) {
      this.later(owner, () => {
        for (const [dx, dy] of arms) {
          const fx = x + dx * step * k, fy = y + dy * step * k;
          this.fx.push({ kind: 'flame', x: fx, y: fy, r: 24 * area, life: 0.8, max: 0.8 });
          for (const e of this.targetsList) if (e.hp > 0 && dist2(e, { x: fx, y: fy }) < (24 * area + e.r) ** 2) this.damage(e, dmg / 3, type, { x, y }, 50, true);
          if (this.parts.length < 680) this.part('flame', fx, fy - 6, rand(-20, 20), rand(-90, -40), 0.5, rand(5, 9), '#ff8a1a');
        }
        SFX.play('explode', 60);
      }, k * 55);
    }
  }

  explode(x, y, r, dmg, type, color, loud) {
    for (const e of this.targetsList) if (e.hp > 0 && dist2({ x, y }, e) < (r + e.r) ** 2) this.damage(e, dmg, type, { x, y }, 70);
    this.parts.push({ kind: 'ring', x, y, r: 6, R: r, life: 0.25, max: 0.25, color: loud ? '#ffffff' : '#ffe680', w: 5 });
    this.burst(x, y, color, loud ? 20 : 10, 200, type === '불꽃' ? 'flame' : 'spark');
    SFX.play('explode', 160);
  }

  updateFx(dt) {
    for (const f of this.fx) {
      this.src = f.owner || null;
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
            if (this.parts.length < 700) this.parts.push({ kind: f.type === '불꽃' ? 'flame' : 'puff', x: f.x + Math.cos(a) * r, y: f.y + Math.sin(a) * r, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - (f.type === '불꽃' ? 30 : 0), life: 0.35, max: 0.35, size: rand(5, 11), color: f.type === '불꽃' ? pickOne(['#ff3d1a', '#ff6a1a', '#ffb238', '#ffe680']) : pickOne([f.color, '#ffffff']) });
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
          this.burst(f.x, f.y, f.legend ? f.color : '#b08d57', f.legend ? 26 : 18, f.legend ? 300 : 220, f.legend ? 'star' : 'spark');
          this.parts.push({ kind: 'ring', x: f.x, y: f.y, r: 5, R: f.r * 1.2, life: 0.25, max: 0.25, color: f.legend ? f.color : '#e8d4a8', w: 5 });
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
      } else if (f.kind === 'mine') {
        f.arm -= dt;
        if (f.arm <= 0) {
          for (const e of this.targetsList) {
            if (e.hp > 0 && dist2(f, e) < (f.r * 0.55 + e.r) ** 2) {
              this.explode(f.x, f.y, f.r, f.dmg, f.type, f.color, true);
              f.life = 0;
              break;
            }
          }
        }
      } else if (f.kind === 'sweep') {
        f.x = f.mb.x; f.y = f.mb.y - 14;
        f.a += dt * 2.8;
        f.tick -= dt;
        if (f.tick <= 0) {
          f.tick = f.every;
          for (const e of this.targetsList) {
            const dx = e.x - f.x, dy = e.y - f.y;
            const along = dx * Math.cos(f.a) + dy * Math.sin(f.a), side = -dx * Math.sin(f.a) + dy * Math.cos(f.a);
            if (e.hp > 0 && along > 0 && along < f.len && Math.abs(side) < f.w / 2 + e.r) this.damage(e, f.dmg, f.type, f, 30, true);
          }
        }
        for (let i = 0; i < 2; i++) {
          const r = rand(30, f.len);
          this.part('spark', f.x + Math.cos(f.a) * r, f.y + Math.sin(f.a) * r, rand(-90, 90), rand(-90, 90), 0.35, rand(3, 5), pickOne([f.color, '#ffffff']));
        }
      } else if (f.kind === 'blackhole') {
        f.tick -= dt;
        const hit = f.tick <= 0;
        if (hit) f.tick = f.every;
        for (const e of this.targetsList) {
          if (e.hp <= 0) continue;
          const d2 = dist2(f, e);
          if (d2 > f.r * f.r) continue;
          if (e.kind !== 'boss') {
            const d = Math.sqrt(d2) || 1, pull = 260 * dt * (e.kind === 'elite' ? 0.4 : 1);
            e.x -= (e.x - f.x) / d * Math.min(d, pull); e.y -= (e.y - f.y) / d * Math.min(d, pull);
          }
          if (hit) this.damage(e, f.dmg, f.type, null, 0, true);
        }
        if (Math.random() < 0.9) {
          const a = Math.random() * Math.PI * 2, r = f.r * rand(0.6, 1);
          this.part('puff', f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.7, -Math.cos(a) * r * 1.6, -Math.sin(a) * r * 1.1, 0.5, rand(3, 6), pickOne([f.color, '#ffffff', '#3a2a5a']));
        }
        if (f.life <= 0 && !f.done) {
          f.done = true;
          this.explode(f.x, f.y, f.r * 0.7, f.dmg * 8, f.type, f.color, true);
          this.parts.push({ kind: 'ring', x: f.x, y: f.y, r: 10, R: f.r * 1.3, life: 0.5, max: 0.5, color: f.color, w: 14 });
          this.flash = Math.max(this.flash, 0.4);
          this.shake = Math.max(this.shake, 14);
        }
      } else if (f.kind === 'rend') {
        if (!f.hitDone && f.life < f.max * 0.7) {
          f.hitDone = true;
          for (const e of this.targetsList) {
            const dx = e.x - f.x, dy = e.y - f.y;
            const along = dx * Math.cos(f.a) + dy * Math.sin(f.a), side = -dx * Math.sin(f.a) + dy * Math.cos(f.a);
            if (e.hp > 0 && Math.abs(along) < f.len / 2 && Math.abs(side) < 40 + e.r) this.damage(e, f.dmg, f.type, f, 160);
          }
          this.shake = Math.max(this.shake, 10);
          this.flash = Math.max(this.flash, 0.25);
        }
      }
    }
    this.src = null;
    this.fx = this.fx.filter(f => f.life > 0);

    // 보스 공격 예고 → 터짐
    for (const t of this.teles) {
      t.life -= dt;
      if (t.follow && t.kind !== 'line') { t.x = t.follow.x; t.y = t.follow.y; }
      if (t.life <= 0 && t.puddle) {
        this.hazards.push({ x: t.x, y: t.y, r: t.r, life: 5, max: 5, tick: 0, dmg: 6 * this.diff, color: t.color });
        this.burst(t.x, t.y, t.color, 14, 160);
        SFX.play('splash', 120);
        continue;
      }
      if (t.life <= 0 && t.boom && t.kind === 'line') {
        const q = this.player, dx = q.x - t.x, dy = q.y - t.y;
        const along = dx * Math.cos(t.a) + dy * Math.sin(t.a), side = -dx * Math.sin(t.a) + dy * Math.cos(t.a);
        if (along > 0 && along < t.len && Math.abs(side) < t.w / 2 + 10) this.hurt(t.dmg, null);
        this.parts.push({ kind: 'line', x: t.x, y: t.y, a: t.a, len: t.len, w: t.w, life: 0.3, max: 0.3, color: t.color });
        this.shake = Math.max(this.shake, 7);
        SFX.play('zap', 80);
        continue;
      }
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
    for (const g of this.gems) {
      g.t += dt;
      const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
      if (d < R * 1.1 || this.gemRush || g.pull) {
        g.pull = true;
        const sp = this.gemRush ? 1000 : 260 + g.t * 40;
        g.x += dx / d * Math.min(d, sp * dt); g.y += dy / d * Math.min(d, sp * dt);
      }
      if (d < 22) {
        g.got = true;
        this.gainXp(g.v);
        SFX.play('coin', 35);
      }
    }
    if (this.gems.some(g => g.got)) this.gems = this.gems.filter(g => !g.got);
    for (const ch of this.chests) {
      ch.t += dt;
      if ((this.phase !== 'play' && this.phase !== 'boss') || this.paused) continue;
      if (dist2(ch, p) < 34 * 34) {
        ch.got = true;
        SFX.play('open');
        this.flash = 0.4;
        this.burst(ch.x, ch.y - 10, '#ffd84a', 50, 300, 'star');
        this.parts.push({ kind: 'ring', x: ch.x, y: ch.y - 10, r: 10, R: 180, life: 0.5, max: 0.5, color: '#ffd84a', w: 10 });
        for (let i = 0; i < (ch.big ? 30 : 12); i++) this.coins.push({ x: ch.x, y: ch.y, vx: rand(-200, 200), vy: rand(-260, -60), v: 2, t: 0 });
        this.offerPick(ch.big ? '🎁 커다란 보물상자!' : '🎁 보물상자!', '보물상자에서 고를 수 있어요 (각성이 잘 나와요)', true);
        break;
      }
    }
    this.chests = this.chests.filter(c => !c.got);
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
    // 바닥을 살짝 어둡게: 밝은 바이옴(설원·사막)에서도 기술 이펙트가 잘 보이게
    const dim = (FLOOR_DIM[this.biome] ?? 0.25) + this.ultDark * 0.4;
    c.fillStyle = `rgba(6,8,22,${dim})`;
    c.fillRect(this.cam.x - 10, this.cam.y - 10, vw + 20, vh + 20);

    this.drawArenaRing(c);
    this.drawGroundFx(c);
    this.drawTeles(c);

    // 보스 장판
    this.hazards.forEach(h => {
      const k = Math.min(1, h.life, (h.max - h.life) * 4);
      c.save();
      c.globalAlpha = 0.55 * k;
      c.fillStyle = hexA(h.color, 0.6);
      c.beginPath(); c.ellipse(h.x, h.y, h.r, h.r * 0.62, 0, 0, 7); c.fill();
      c.globalAlpha = k;
      c.strokeStyle = hexA(h.color, 0.9); c.lineWidth = 2;
      c.beginPath(); c.ellipse(h.x, h.y, h.r * (0.9 + Math.sin(this.clock * 4) * 0.05), h.r * 0.56, 0, 0, 7); c.stroke();
      c.restore();
    });
    // 경험치 결정 (크기·색 = 값)
    this.gems.forEach(g => {
      if (!inView(g.x, g.y, 30)) return;
      const big = g.v >= 10, col = g.v >= 10 ? '#ff7ad9' : g.v >= 3 ? '#ff6b6b' : g.v >= 2 ? '#6dff9a' : '#5ec8ff';
      const s = big ? 9 : 5 + Math.min(2, g.v - 1), y = g.y - 6 + Math.sin(this.clock * 5 + g.x) * 1.5;
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(g.x - s * 0.6, g.y - 1, s * 1.2, 2);
      c.fillStyle = col;
      c.beginPath(); c.moveTo(g.x, y - s * 1.4); c.lineTo(g.x + s, y); c.lineTo(g.x, y + s * 1.1); c.lineTo(g.x - s, y); c.fill();
      c.fillStyle = 'rgba(255,255,255,.75)';
      c.beginPath(); c.moveTo(g.x, y - s * 1.4); c.lineTo(g.x + s * 0.35, y - s * 0.2); c.lineTo(g.x - s * 0.4, y); c.fill();
    });
    // 보물상자
    this.chests.forEach(ch => {
      const bob = Math.sin(this.clock * 4) * 2, w = ch.big ? 34 : 26, h = ch.big ? 24 : 18;
      c.save(); c.globalCompositeOperation = 'lighter';
      glowDot(c, ch.x, ch.y - 12, 34 + Math.sin(this.clock * 6) * 4, 'rgba(255,210,80,.22)');
      c.restore();
      this.shadow(c, ch.x, ch.y, 18);
      c.fillStyle = '#7a4a1e'; c.fillRect(ch.x - w / 2, ch.y - h + bob, w, h);
      c.fillStyle = '#a8662a'; c.fillRect(ch.x - w / 2, ch.y - h + bob, w, h * 0.4);
      c.fillStyle = '#ffd84a'; c.fillRect(ch.x - w / 2, ch.y - h * 0.62 + bob, w, 3); c.fillRect(ch.x - 3, ch.y - h * 0.75 + bob, 6, 8);
      if (Math.random() < 0.2) this.part('star', ch.x + rand(-w, w) / 2, ch.y - rand(0, 30), 0, -30, 0.5, 3, '#ffe680');
    });
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
    this.drawBossLaser(c);
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
    const ts = this.fx.find(f => f.kind === 'timestop');
    if (ts) {
      const k = ts.life / ts.max;
      c.fillStyle = `rgba(40,70,140,${0.35 * Math.min(1, k * 3)})`;
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

  drawBossLaser(c) {
    const b = this.boss;
    if (b && b.state === 'cross') {
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < b.crossN; i++) {
        c.save();
        c.translate(b.x, b.y - 30);
        c.rotate(b.crossA + i * Math.PI * 2 / b.crossN);
        const w = 34 + Math.sin(this.clock * 40 + i) * 5;
        c.fillStyle = 'rgba(255,200,60,.25)'; c.fillRect(0, -w * 1.5, 620, w * 3);
        c.fillStyle = hexA(b.color, 0.8); c.fillRect(0, -w / 2, 620, w);
        c.fillStyle = '#fff6c0'; c.fillRect(0, -w / 5, 620, w / 2.5);
        c.restore();
      }
      glowDot(c, b.x, b.y - 30, 70 + Math.sin(this.clock * 12) * 8, 'rgba(255,215,90,.45)');
      c.restore();
      return;
    }
    if (!b || b.state !== 'laser') return;
    const len = 760, w = 30 + Math.sin(this.clock * 40) * 4;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.translate(b.x, b.y - 30);
    c.rotate(b.laserA);
    c.fillStyle = hexA(b.color, 0.3); c.fillRect(0, -w * 1.4, len, w * 2.8);
    c.fillStyle = hexA(b.color, 0.85); c.fillRect(0, -w / 2, len, w);
    c.fillStyle = '#ffffff'; c.fillRect(0, -w / 6, len, w / 3);
    glowDot(c, 0, 0, 40, hexA(b.color, 0.5));
    c.restore();
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
    if (mb.legend || mb.awake) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const col = mb.legend ? '#ffd84a' : mb.color;
      glowDot(c, mb.x, mb.y - 22, 30 + Math.sin(this.clock * 5 + mb.i) * 4, hexA(col, 0.18));
      c.strokeStyle = hexA(col, 0.7); c.lineWidth = 2;
      c.setLineDash([6, 6]); c.lineDashOffset = -this.clock * 30;
      c.beginPath(); c.ellipse(mb.x, mb.y, 26, 9, 0, 0, 7); c.stroke();
      c.restore();
      if (Math.random() < 0.12) this.part('star', mb.x + rand(-18, 18), mb.y - rand(5, 45), 0, -40, 0.6, 3, col);
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
      g.addColorStop(0, e.phase2 ? 'rgba(255,40,80,.45)' : e.legend ? 'rgba(255,215,90,.45)' : hexA(e.color, 0.35));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(e.x, e.y - 50 + lift, auraR * 1.6, 0, 7); c.fill();
      c.restore();
      const alpha = e.state === 'vanish' ? Math.max(0, e.timer / 0.55) : 1;
      if (e.legend && Math.random() < 0.3) this.part('star', e.x + rand(-70, 70), e.y - rand(20, 160), 0, -40, 0.7, 4, '#ffd84a');
      this.drawSprite(c, e.spr, e.x, e.y + lift, e.scale, e.flip, t, { alpha, tint: e.flash > 0 ? 'white' : e.phase2 ? 'rage' : null, speed: e.phase2 ? 1.6 : 1 });
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
    const tint = e.flash > 0 || (e.fuse !== undefined && Math.floor(this.clock * 16) % 2) ? 'white' : e.slow > 0 ? 'ice' : null;
    this.drawSprite(c, e.spr, e.x, e.y - (e.sleep > 0 ? 0 : bob), e.scale * (dying ? Math.max(0.1, e.dying) : 1), e.flip, e.sleep > 0 ? 0 : t,
      { tint, alpha: dying ? Math.max(0, e.dying) : 1, color: typeColor(e.types[0]) });
    if (e.sleep > 0) {
      c.fillStyle = '#e8f0ff'; c.font = 'bold 12px monospace';
      c.fillText('z', e.x + 10 + Math.sin(this.clock * 3) * 3, e.y - 40 - (this.clock * 20 % 14));
    }
    if (e.shiny && Math.random() < 0.08) this.parts.push({ kind: 'star', x: e.x + rand(-14, 14), y: e.y - rand(10, 40), vx: 0, vy: -20, life: 0.5, max: 0.5, size: 3, color: '#ffe680' });
    if (e.kind === 'elite' && !dying) {
      const w = e.mid ? 90 : 50;
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
          if (f.legend) {                    // 전설 유성: 빛나는 꼬리
            c.globalCompositeOperation = 'lighter';
            const x0 = f.x + h * 0.45, y0 = f.y - h;
            const grad = c.createLinearGradient(x0 + 60, y0 - 130, x0, y0);
            grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, hexA(f.look === 'rainbow' ? `#${['ff5a5a', 'ffd84a', '6dff8a', '5ec8ff', 'c38cff'][Math.floor(f.x) % 5]}` : f.color, 0.9));
            c.strokeStyle = grad; c.lineWidth = 10; c.lineCap = 'round';
            c.beginPath(); c.moveTo(x0 + 60, y0 - 130); c.lineTo(x0, y0); c.stroke();
            glowDot(c, x0, y0, 16, hexA(f.color, 0.5));
            if (f.look === 'heart') { c.fillStyle = '#ff9fd6'; c.beginPath(); c.arc(x0 - 4, y0 - 2, 5, 0, 7); c.arc(x0 + 4, y0 - 2, 5, 0, 7); c.moveTo(x0 - 9, y0); c.lineTo(x0, y0 + 9); c.lineTo(x0 + 9, y0); c.fill(); }
            else if (f.look === 'bolt') { c.strokeStyle = '#fff6a0'; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y0 - 12); c.lineTo(x0 - 5, y0); c.lineTo(x0 + 4, y0); c.lineTo(x0 - 2, y0 + 12); c.stroke(); }
            else glowDot(c, x0, y0, 7, '#ffffff');
          } else if (f.look === 'dig') {            // 구멍파기: 땅속에서 솟아오름
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
        if (t.star) {
          const h = (1 - k) * 520, x0 = t.x + h * 0.35, y0 = t.y - h;
          c.globalCompositeOperation = 'lighter';
          c.strokeStyle = hexA(t.color, 0.6); c.lineWidth = 8; c.lineCap = 'round';
          c.beginPath(); c.moveTo(x0 + 50, y0 - 140); c.lineTo(x0, y0); c.stroke();
          glowDot(c, x0, y0, 22, hexA(t.color, 0.45));
          c.fillStyle = '#fff6c0';
          c.beginPath();
          for (let q = 0; q < 10; q++) { const rr = q % 2 ? 5 : 12, a = q * Math.PI / 5 + this.clock * 6; c.lineTo(x0 + Math.cos(a) * rr, y0 + Math.sin(a) * rr); }
          c.fill();
        } else if (t.rock) {
          const h = (1 - k) * 420;
          c.fillStyle = hexA(t.color, 0.35); c.fillRect(t.x - 6, t.y - h - 60, 12, 60);
          c.fillStyle = t.color; c.beginPath(); c.arc(t.x, t.y - h, 12, 0, 7); c.fill();
          c.fillStyle = '#ffffff'; c.beginPath(); c.arc(t.x - 3, t.y - h - 3, 4, 0, 7); c.fill();
        }
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
    // 1) 어두운 테두리 (밝은 바닥 위에서도 모양이 보이게)
    c.save();
    c.fillStyle = 'rgba(0,0,10,.32)';
    c.beginPath();
    for (const s of this.shots) { const r = s.r * (s.big ? 2.4 : 1.9) + 2; c.moveTo(s.x + r, s.y); c.arc(s.x, s.y, r, 0, 7); }
    c.fill();
    for (const f of this.fx) {
      if (f.kind === 'beam' || f.kind === 'sweep') {
        c.save(); c.translate(f.x, f.y); c.rotate(f.a);
        c.fillStyle = `rgba(0,0,10,${0.3 * Math.min(1, f.life / f.max * 2)})`;
        c.fillRect(0, -f.w * 0.9, f.len, f.w * 1.8);
        c.restore();
      } else if (f.kind === 'flame' || f.kind === 'pillar' || f.kind === 'spike') {
        glowDot(c, f.x, f.y - 10, (f.r || 24) * 1.1, 'rgba(0,0,10,.22)');
      }
    }
    c.restore();
    // 2) 빛나는 본체
    c.save();
    c.globalCompositeOperation = 'lighter';
    this.shots.forEach(sh => drawShot(c, sh, this.clock));
    this.fx.forEach(f => drawFx(c, f, this.clock));
    c.restore();
  }

  drawEnemyBullets(c) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    this.ebullets.forEach(b => { c.fillStyle = hexA(b.color, 0.3); c.beginPath(); c.arc(b.x, b.y, b.r * 2, 0, 7); c.fill(); });
    c.restore();
    // 적 탄은 어두운 테두리 + 붉은 고리로 내 공격과 구분
    c.save();
    this.ebullets.forEach(b => {
      c.fillStyle = 'rgba(20,0,10,.8)'; c.beginPath(); c.arc(b.x, b.y, b.r + 2.5, 0, 7); c.fill();
      c.fillStyle = b.color; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill();
      c.strokeStyle = '#ff3355'; c.lineWidth = 1.5; c.beginPath(); c.arc(b.x, b.y, b.r + 1, 0, 7); c.stroke();
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
      } else if (q.kind === 'flame') {
        const s = q.size * (0.4 + k * 0.8);
        c.fillStyle = hexA(q.color, k);
        c.beginPath(); c.moveTo(q.x, q.y - s * 1.8); c.quadraticCurveTo(q.x + s, q.y - s * 0.2, q.x, q.y + s * 0.6); c.quadraticCurveTo(q.x - s, q.y - s * 0.2, q.x, q.y - s * 1.8); c.fill();
        c.fillStyle = `rgba(255,240,180,${k})`;
        c.beginPath(); c.arc(q.x, q.y - s * 0.1, s * 0.35, 0, 7); c.fill();
      } else if (q.kind === 'line') {
        c.save(); c.translate(q.x, q.y); c.rotate(q.a);
        c.fillStyle = hexA(q.color, 0.6 * k); c.fillRect(0, -q.w / 2, q.len, q.w);
        c.fillStyle = `rgba(255,255,255,${k})`; c.fillRect(0, -q.w / 6, q.len, q.w / 3);
        c.restore();
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
const BOSS_SIG = {
  '불꽃': ['laser', 'meteors'], '드래곤': ['laser', 'meteors'], '물': ['puddles', 'waves'], '독': ['puddles', 'waves'],
  '전기': ['grid', 'laser'], '얼음': ['meteors', 'waves'], '바위': ['meteors', 'grid'], '땅': ['meteors', 'grid'],
  '강철': ['laser', 'grid'], '에스퍼': ['teleport', 'pull'], '고스트': ['teleport', 'pull'], '악': ['teleport', 'waves'],
  '페어리': ['pull', 'waves'], '풀': ['puddles', 'waves'], '벌레': ['waves', 'puddles'], '노말': ['waves', 'meteors'],
  '격투': ['teleport', 'meteors'], '비행': ['waves', 'laser'],
};
const FLOOR_DIM = { SNOW: 0.48, DESERT: 0.4, MEADOW: 0.32, SEA: 0.3, VILLAGE: 0.3, FOREST: 0.26, CAVE: 0.18, VOLCANO: 0.2, GHOST: 0.15 };
const BOSS_SIG_ALL = new Set(['laser', 'meteors', 'puddles', 'grid', 'teleport', 'waves', 'pull']);
const typeColorHit = t => ({ '불꽃': '#ffb238', '물': '#8fd3ff', '전기': '#fff27a', '풀': '#9dff8a', '얼음': '#dff8ff', '고스트': '#b38cff', '독': '#d08cff' }[t] || '#ffffff');
