/* 오늘의 던전: 로비(바이옴·파티·도구) → 전투(dungeon-engine.js) → 포획 → 결과 */
renderNav('dungeon');

const $ = id => document.getElementById(id);
const state = {
  today: null, collection: [], shop: null,
  biome: null, party: [], bring: {}, tier: null,
  run: null, game: null, finish: null, caught: null,
};

/* ---------- 능력치 (서버 RunService.combat 과 같은 식) ---------- */
/** 레벨마다 능력치 +2%, 전설은 종족값 합 600 기준으로 맞춤 (일반 최종진화보다 20% 정도 강함) */
function combatOf(o) {
  const st = o.pokemon.stats || { hp: 50, attack: 55, spAttack: 55, defense: 50, spDefense: 50, speed: 50, bst: 300 };
  const cap = o.pokemon.legendary && st.bst > 600 ? 600 / st.bst : 1;
  const m = (1 + 0.02 * (o.level - 1)) * cap;
  return {
    hp: Math.round(st.hp * m), atk: Math.round(Math.max(st.attack, st.spAttack) * m),
    def: Math.round((st.defense + st.spDefense) / 2 * m), spd: Math.round(st.speed * m),
  };
}

/* =========================================================
 * 로비
 * ========================================================= */
async function loadLobby() {
  const [today, collection, shop] = await Promise.all([api('/api/dungeon/today'), api('/api/collection'), api('/api/shop')]);
  Object.assign(state, { today, collection, shop });
  refreshGold(shop.gold);
  $('today-sub').textContent = '바이옴을 골라 출격해요 · 난이도 진행은 바이옴마다 따로예요';

  $('starter').classList.toggle('hidden', collection.length > 0);
  if (!collection.length) renderStarter();
  if (!state.biome) state.biome = today.options[0].id;
  pickTierFor(state.biome, true);
  renderTiers();
  if (!state.party.length && collection.length) {
    state.party = [...collection].sort((a, b) => b.level - a.level || b.exp - a.exp).slice(0, 3).map(o => o.pokemon.id);
  }
  renderBiomes();
  renderParty();
  renderBring();
  updateGo();
}

async function renderStarter() {
  const ids = [1, 4, 7];
  const list = await Promise.all(ids.map(id => api(`/api/pokemon/${id}`).catch(() => null)));
  $('starter-list').innerHTML = list.filter(Boolean).map(p => `
    <button class="starter-card" data-id="${p.id}">
      <img src="${p.sprites.frontAnimated || p.sprites.frontStatic}" alt="">
      <b>${escapeHtml(p.nameKo)}</b>
      <span>${typeChips(p.typesKo)}</span>
      <small>기술: ${skillChip(skillOf(p))}</small>
    </button>`).join('');
}
$('starter-list').addEventListener('click', async e => {
  const b = e.target.closest('.starter-card');
  if (!b) return;
  await api('/api/collection/starter', { method: 'POST', body: { pokemonId: +b.dataset.id } });
  SFX.play('caught');
  state.party = [+b.dataset.id];
  loadLobby();
});

const TIER_ICON = { EASY: '🌱', NORMAL: '⚔', HARD: '🔥', EXTREME: '💀', NIGHTMARE: '👁', ABYSS: '🕳' };
const TIER_RULES = {
  NIGHTMARE: '적이 빠르고 원거리·강한 개체가 많음<br>회복 구슬 드묾 · 보스도 궁극기 사용',
  ABYSS: '나이트메어 규칙 + 회복 구슬 없음<br>쓰러진 적이 탄을 뿌림 · 보스 70%부터 분노',
};
/** 이 바이옴의 단계별 해금·클리어 */
function tiersFor(biome) {
  const c = state.today.progress[biome] || 0;
  return state.today.tiers.map(t => ({ ...t, unlocked: t.no <= c + 1, cleared: t.no <= c }));
}
/** 바이옴을 바꾸면 그 바이옴에서 열린 가장 높은 단계로 */
function pickTierFor(biome, keep) {
  const open = tiersFor(biome).filter(t => t.unlocked);
  if (!keep || !open.some(t => t.id === state.tier)) state.tier = open[open.length - 1].id;
}
function renderTiers() {
  const list = tiersFor(state.biome);
  const b = state.today.options.find(x => x.id === state.biome);
  $('tier-note').textContent = `${b ? `${b.emoji} ${b.name}` : ''} 진행도 · 바이옴마다 따로, 앞 단계를 클리어하면 다음 단계가 열려요`;
  $('tier-pick').innerHTML = list.map(t => t.id === 'ABYSS' && !t.unlocked ? `
    <button class="tier t-secret locked" disabled>
      <span class="ti-icon">❔</span>
      <b>? ? ?</b>
      <small>숨겨진 단계</small>
      <em>NIGHTMARE 를 클리어하면<br>무언가 깨어나요…</em>
    </button>` : `
    <button class="tier t-${t.id.toLowerCase()}${state.tier === t.id ? ' on' : ''}${t.unlocked ? '' : ' locked'}" data-id="${t.id}" ${t.unlocked ? '' : 'disabled'}>
      <span class="ti-icon">${t.unlocked ? TIER_ICON[t.id] : '🔒'}</span>
      <b>${t.label}</b>
      <small>${t.nameKo}${t.cleared ? ' · ✔ 클리어' : ''}</small>
      ${TIER_RULES[t.id] && t.unlocked ? `<i class="ti-rules">${TIER_RULES[t.id]}</i>` : ''}
      <em>${t.unlocked ? `적 체력 ×${t.hp} · 공격 ×${t.dmg}<br>보상 💰×${t.gold} · 경험치 ×${t.exp}<br>전설 보스 등장 ${+(t.legend * 100).toFixed(1)}%` : `${list[t.no - 2]?.label} 클리어하면 열려요`}</em>
    </button>`).join('');
}
$('tier-pick').addEventListener('click', e => {
  const b = e.target.closest('.tier');
  if (!b || b.disabled) return;
  state.tier = b.dataset.id;
  SFX.play('open');
  renderTiers();
});

function biomePreview(canvas, biome) {
  const W = 110, H = 56;
  canvas.width = W; canvas.height = H;
  const x = canvas.getContext('2d'), img = x.createImageData(W, H), st = styleOf(biome);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const wx = Math.floor(i / 16), wy = Math.floor(j / 16), h = hash2(i + 7, j + 3);
      let col = st.deco && st.deco(i, j, h, { fx: (i % 16) / 16, fy: (j % 16) / 16, h: Math.floor(hash2(wx * 31, wy * 17) * 1000), wx, wy, row: wy });
      if (!col) col = h < 0.06 ? st.speck : h > 0.975 ? st.light : st.top[(wx + wy) & 1];
      const [r, g, b] = rgbOf(col), k = (j * W + i) * 4;
      img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
}

function renderBiomes() {
  const el = $('biome-pick');
  el.innerHTML = state.today.options.map(b => `
    <button class="biome-opt${state.biome === b.id ? ' on' : ''}" data-id="${b.id}">
      <canvas data-biome="${b.id}"></canvas>
      <div class="bo-body">
        <b>${b.emoji} ${escapeHtml(b.name)}</b>
        <span class="bo-prog">${state.today.progress[b.id] ? `🏆 ${state.today.tiers[state.today.progress[b.id] - 1].label} 클리어` : '도전 전'}</span>
        <small>${escapeHtml(b.description)}</small>
        <div class="bo-row">👑 보스 ${typeChips(b.bossTypes)}</div>
        <div class="bo-row">👾 몬스터 ${typeChips(b.mobTypes)}</div>
      </div>
    </button>`).join('');
  el.querySelectorAll('canvas').forEach(cv => biomePreview(cv, cv.dataset.biome));
  if (!renderBiomes.done) {   // 처음엔 고른 바이옴이 보이게
    renderBiomes.done = true;
    el.querySelector('.biome-opt.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  setTimeout(updateArrows, 0);
}
$('biome-pick').addEventListener('click', e => {
  const b = e.target.closest('.biome-opt');
  if (!b || carousel.dragged) return;
  state.biome = b.dataset.id;
  SFX.play('open');
  pickTierFor(state.biome, false);
  renderBiomes();
  renderTiers();
  renderParty();
  b.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
});

/* ---------- 바이옴 카드: 좌우로 끌기 / 화살표 ---------- */
const carousel = { el: $('biome-pick'), down: false, dragged: false, x0: 0, s0: 0 };
function slideBiomes(dir) {
  const card = carousel.el.querySelector('.biome-opt');
  const step = card ? card.offsetWidth + 12 : 300;
  carousel.el.scrollBy({ left: dir * step, behavior: 'smooth' });
}
$('bc-left').addEventListener('click', () => slideBiomes(-1));
$('bc-right').addEventListener('click', () => slideBiomes(1));
carousel.el.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  Object.assign(carousel, { down: true, dragged: false, x0: e.clientX, s0: carousel.el.scrollLeft });
});
window.addEventListener('pointermove', e => {
  if (!carousel.down) return;
  const dx = e.clientX - carousel.x0;
  if (!carousel.dragged && Math.abs(dx) > 6) { carousel.dragged = true; carousel.el.classList.add('dragging'); }
  if (carousel.dragged) carousel.el.scrollLeft = carousel.s0 - dx;
});
window.addEventListener('pointerup', () => {
  if (!carousel.down) return;
  carousel.down = false;
  if (carousel.dragged) {
    carousel.el.classList.remove('dragging');
    // 가장 가까운 카드에 부드럽게 맞춤
    const card = carousel.el.querySelector('.biome-opt'), step = card ? card.offsetWidth + 12 : 300;
    carousel.el.scrollTo({ left: Math.round(carousel.el.scrollLeft / step) * step, behavior: 'smooth' });
    setTimeout(() => { carousel.dragged = false; }, 0);
  }
});
const updateArrows = () => {
  const el = carousel.el;
  $('bc-left').classList.toggle('off', el.scrollLeft < 4);
  $('bc-right').classList.toggle('off', el.scrollLeft + el.clientWidth > el.scrollWidth - 4);
};
carousel.el.addEventListener('scroll', updateArrows);
window.addEventListener('resize', updateArrows);

/** 지금 고른 바이옴의 보스·몬스터 타입에 대한 상성 요약 */
/** 기술 이름표 (기술 타입 색) */
const skillChip = sk => `<span class="skill-chip" style="--c:${TYPE_COLORS[sk.t] || '#888'}">${escapeHtml(sk.name)}</span>`;

function matchup(o) {
  const b = state.today.options.find(x => x.id === state.biome);
  if (!b) return '';
  const atk = skillOf(o.pokemon).t;
  const vsBoss = Math.max(...b.bossTypes.map(t => typeMultiplier(atk, [t])));
  if (vsBoss > 1.05) return '<em class="good">보스에게 효과 굉장</em>';
  if (vsBoss < 0.95) return '<em class="bad">보스에게 약함</em>';
  return '';
}

function renderParty() {
  const own = state.collection;
  const byId = id => own.find(o => o.pokemon.id === id);
  $('party-slots').innerHTML = [0, 1, 2].map(i => {
    const o = byId(state.party[i]);
    if (!o) return `<div class="slot empty">${i === 0 ? '리더' : `동료 ${i}`}<small>아래에서 골라요</small></div>`;
    const sp = spritesOf(o);
    return `<button class="slot" data-id="${o.pokemon.id}" title="빼기">
      <span class="slot-tag">${i === 0 ? '👑 리더' : `동료 ${i}`}</span>
      <img src="${sp.front}" alt="">
      <b>${sp.shiny ? '<span class="shiny-mark">✨</span>' : ''}${escapeHtml(o.nickname || o.pokemon.nameKo)}</b>
      ${lvHtml(o)} ${legendMark(o.pokemon)}
    </button>`;
  }).join('');
  if (!own.length) { $('party-list').innerHTML = ''; return; }
  $('party-list').innerHTML = [...own].sort((a, b) => b.level - a.level || a.pokemon.id - b.pokemon.id).map(o => {
    const c = combatOf(o), sp = spritesOf(o), on = state.party.includes(o.pokemon.id);
    const sk = skillOf(o.pokemon);
    const expPct = lvPct(o);
    return `<button class="pcard${on ? ' on' : ''}" data-id="${o.pokemon.id}">
      <img src="${sp.still || sp.front}" alt="">
      <div class="pc-body">
        <b>${sp.shiny ? '<span class="shiny-mark">✨</span>' : ''}${escapeHtml(o.nickname || o.pokemon.nameKo)} ${lvHtml(o)} ${legendMark(o.pokemon)}</b>
        <div>${typeChips(o.pokemon.typesKo)} ${skillChip(sk)} ${matchup(o)}</div>
        <div class="pc-stats">❤${c.hp} ⚔${c.atk} 🛡${c.def} 💨${c.spd} <small>레벨당 +2%</small></div>
        <div class="pc-exp"><i style="width:${expPct}%"></i></div>
      </div>
    </button>`;
  }).join('');
}
$('party-list').addEventListener('click', e => {
  const b = e.target.closest('.pcard');
  if (!b) return;
  const id = +b.dataset.id;
  if (state.party.includes(id)) state.party = state.party.filter(x => x !== id);
  else if (state.party.length < 3) state.party.push(id);
  else { state.party[state.party.length - 1] = id; }
  SFX.play('open');
  renderParty();
  updateGo();
});
$('party-slots').addEventListener('click', e => {
  const b = e.target.closest('.slot[data-id]');
  if (!b) return;
  state.party = state.party.filter(x => x !== +b.dataset.id);
  renderParty();
  updateGo();
});

function renderBring() {
  const entries = state.shop.entries.filter(e => e.item && ['HEAL', 'REVIVE', 'BUFF_ATTACK', 'BUFF_SPEED', 'BUFF_DEFENSE', 'BUFF_CRIT', 'BUFF_EXP', 'BUFF_GOLD'].includes(e.use));
  const owned = entries.filter(e => e.qty > 0);
  $('bring').innerHTML = owned.length ? owned.map(e => {
    const n = state.bring[e.code] || 0, max = Math.min(e.qty, e.use === 'HEAL' ? 5 : 1);
    return `<div class="bring-item${n ? ' on' : ''}" data-code="${e.code}">
      <img src="${e.item.sprite}" alt="">
      <div><b>${escapeHtml(e.item.nameKo)}</b><small>${escapeHtml(e.desc)} · 보유 ${e.qty}</small></div>
      <div class="cnt"><button data-d="-1" ${n ? '' : 'disabled'}>−</button><span>${n}</span><button data-d="1" ${n < max ? '' : 'disabled'}>＋</button></div>
    </div>`;
  }).join('') : '<div class="muted">가져갈 상처약·기력의조각·X아이템이 없어요. <a href="/shop.html">상점</a>에서 살 수 있어요.</div>';

  const balls = state.shop.entries.filter(e => e.use === 'BALL' && e.qty > 0);
  $('ball-note').innerHTML = balls.length
    ? `보스를 잡을 몬스터볼: ${balls.map(b => `<span class="ball-chip"><img src="${b.item.sprite}" alt="">${escapeHtml(b.item.nameKo)} ×${b.qty} <small>${b.value}%</small></span>`).join('')}`
    : '<span class="warn">⚠ 몬스터볼이 없어요! 보스를 쓰러뜨려도 잡을 수 없어요 → <a href="/shop.html">상점</a></span>';
}
$('bring').addEventListener('click', e => {
  const b = e.target.closest('button[data-d]');
  if (!b) return;
  const code = b.closest('.bring-item').dataset.code;
  state.bring[code] = Math.max(0, (state.bring[code] || 0) + +b.dataset.d);
  renderBring();
});

function updateGo() {
  const ok = state.party.length > 0 && state.biome;
  $('go').disabled = !ok;
  $('go-msg').textContent = ok ? '' : state.collection.length ? '파티에 포켓몬을 넣어 주세요' : '먼저 포켓몬을 골라요';
}

$('go').addEventListener('click', async () => {
  SFX.unlock();
  $('go').disabled = true;
  try {
    const bring = Object.fromEntries(Object.entries(state.bring).filter(([, n]) => n > 0));
    state.run = await api('/api/runs', { method: 'POST', body: { biome: state.biome, party: state.party, bring, tier: state.tier } });
    startGame();
  } catch (err) {
    $('go-msg').textContent = err.message;
    $('go').disabled = false;
  }
});

/* =========================================================
 * 전투
 * ========================================================= */
async function startGame() {
  $('lobby').classList.add('hidden');
  document.querySelector('.topbar').classList.add('hidden');
  $('game').classList.remove('hidden');
  const run = state.run;
  const g = new DungeonGame(run, $('cv'), hooks);
  state.game = g;
  banner(`${run.biome.emoji} ${run.biome.name} 던전 불러오는 중…`, 'info', 99);
  await g.load(p => { $('banner').textContent = `${run.biome.emoji} ${run.biome.name} 던전 불러오는 중… ${Math.round(p * 100)}%`; });
  hideBanner();
  renderPartyHud();
  renderPotions();
  renderBuffs();
  bindInput(g);
  g.begin();
}

const hooks = {
  onPick(cards, title, sub, choose) {
    $('pick-title').textContent = title;
    $('pick-sub').textContent = sub;
    $('pick-cards').innerHTML = cards.map((u, i) => `
      <button class="pick-card ${u.kind}${u.lv ? '' : ' new'}" data-id="${u.id}" style="animation-delay:${i * 0.08}s;--c:${u.color || '#ffd84a'}">
        <span class="pk-key">${i + 1}</span>
        ${u.kind !== 'awaken' && !u.lv && u.kind !== 'misc' ? '<span class="pk-new">NEW</span>' : ''}
        <span class="pk-icon">${u.img ? `<img src="${u.img}" alt="" onerror="this.replaceWith(document.createTextNode('${u.icon || '◆'}'))">` : u.icon}</span>
        <b>${escapeHtml(u.name)}</b>
        <small>${escapeHtml(u.desc)}</small>
        ${u.max ? `<span class="pk-stack">${'●'.repeat(u.lv)}${'○'.repeat(Math.max(0, u.max - u.lv))}</span>` : ''}
      </button>`).join('');
    $('pick').classList.remove('hidden');
    SFX.play('open');
    state.pickSel = 0;
    state.pickOpenAt = performance.now();
    markPick();
    state.choosePick = id => {
      $('pick').classList.add('hidden');
      state.choosePick = null;
      choose(id);
      renderBuffs();
      renderPartyHud();
    };
  },
  onBanner(text, kind) { banner(text, kind); },
  onWarning(boss, shiny) {
    $('warn-sub').innerHTML = `${boss.legendary ? '★ 전설의 포켓몬 ' : '보스 '}${shiny ? '✨이로치 ' : ''}<b>${escapeHtml(boss.nameKo)}</b>이(가) 나타난다! ${typeChips(boss.typesKo)}`;
    $('warning').classList.toggle('legend', !!boss.legendary);
    $('warning').classList.remove('hidden');
    setTimeout(() => $('warning').classList.add('hidden'), 3000);
  },
  onBoss(b) {
    $('bb-name').innerHTML = `${b.shiny ? '<span class="shiny-mark">✨</span>' : ''}${b.legend ? '★ 전설의 포켓몬 ' : '보스 '}${escapeHtml(b.p.nameKo)} <span class="lv">Lv.${state.run.bossLevel}</span> ${typeChips(b.p.typesKo)}`;
    $('bossbar').classList.toggle('legend', !!b.legend);
    $('bossbar').classList.remove('hidden');
  },
  onHud(g) {
    const p = g.player;
    $('hp-fill').style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
    $('hp-text').textContent = `${Math.max(0, Math.ceil(p.hp))} / ${Math.round(p.maxHp)}`;
    $('hp-fill').parentElement.classList.toggle('low', p.hp / p.maxHp < 0.3);
    $('tl-fill').style.width = `${Math.max(Math.min(1, g.kills / g.killTarget), Math.min(1, g.time / RUN_TIME)) * 100}%`;
    $('tl-text').dataset.tier = g.tier.label;
    const left = Math.max(0, RUN_TIME - g.time), clock = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    $('tl-text').textContent = g.boss ? (g.boss.state === 'dead' ? '승리!' : '보스전')
      : g.kills >= g.killTarget ? `목표 달성! 보스 도전 가능 · 자동 ${clock}` : `보스까지 ${g.killTarget - g.kills}마리 · 자동 ${clock}`;
    $('gold').textContent = `💰 ${Math.floor(g.gold)}`;
    $('kills').textContent = `처치 ${g.kills}`;
    $('boss-go').classList.toggle('hidden', !g.canChallenge());
    $('xp-fill').style.width = `${Math.min(100, g.xp / xpNeed(g.lv) * 100)}%`;
    $('xp-lv').textContent = `Lv.${g.lv}`;
    if (g.boss) {
      const b = g.boss;
      $('bb-fill').style.width = `${Math.max(0, b.hp / b.max * 100)}%`;
      $('bb-lag').style.width = `${Math.max(0, b.lag / b.max * 100)}%`;
      $('bossbar').classList.toggle('rage', b.phase2);
    }
    g.potions.forEach((pt, i) => {
      const el = document.querySelector(`.potion[data-i="${i}"] em`);
      if (el) el.textContent = pt.left;
      document.querySelector(`.potion[data-i="${i}"]`)?.classList.toggle('empty', pt.left <= 0);
    });
  },
  onEnd(result) { finishRun(result); },
};

$('pick-cards').addEventListener('click', e => {
  const c = e.target.closest('.pick-card');
  if (c && state.choosePick) state.choosePick(c.dataset.id);
});

/** 키보드로 고르는 카드 표시 */
function markPick() {
  document.querySelectorAll('.pick-card').forEach((c, i) => c.classList.toggle('sel', i === state.pickSel));
}
$('pick-cards').addEventListener('mousemove', e => {
  const c = e.target.closest('.pick-card');
  if (!c) return;
  state.pickSel = [...document.querySelectorAll('.pick-card')].indexOf(c);
  markPick();
});

function banner(text, kind = 'info', secs = 2.2) {
  const el = $('banner');
  el.textContent = text;
  el.className = `banner ${kind}`;
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(banner.t);
  banner.t = setTimeout(hideBanner, secs * 1000);
}
function hideBanner() { $('banner').classList.add('hidden'); $('banner').classList.remove('show'); }

function renderPartyHud() {
  $('party-hud').innerHTML = state.game.members.map(mb => `
    <div class="ph${mb.awake ? ' awake' : ''}${mb.legend ? ' legend' : ''}" title="${escapeHtml(mb.skill.name)}" style="--c:${mb.color}">
      <img src="${mb.sprites.still || mb.sprites.front}" alt="">
      <span class="lv">Lv.${mb.owned.level}</span>
      <small style="color:${mb.color}">${escapeHtml(mb.skill.name)} <b>${mb.awake ? '각성' : `Lv.${mb.slv}`}</b></small>
    </div>`).join('');
}

function renderPotions() {
  $('potions').innerHTML = state.game.potions.map((pt, i) => `
    <button class="potion" data-i="${i}" title="${escapeHtml(pt.name)} (${i + 1})">
      <img src="${pt.sprite}" alt=""><em>${pt.left}</em><kbd>${i + 1}</kbd>
    </button>`).join('');
}
$('boss-go').addEventListener('click', () => { if (state.game?.canChallenge()) state.game.challenge(); });
$('potions').addEventListener('click', e => {
  const b = e.target.closest('.potion');
  if (b) state.game.usePotion(+b.dataset.i);
});

function renderBuffs() {
  const g = state.game;
  const chips = (state.run.brought || []).filter(b => b.use.startsWith('BUFF')).map(b => `<span class="buff">${escapeHtml(b.name)}</span>`);
  if (g.revivesLeft) chips.push(`<span class="buff">기력의조각 ×${g.revivesLeft}</span>`);
  $('buffs').innerHTML = chips.join('');
  $('items-hud').innerHTML = Object.entries(g.items).map(([id, lv]) => {
    const h = HELD.find(x => x.id === id);
    const t = Object.keys(TYPE_ITEM).find(k => TYPE_ITEM[k][0] === id);
    const name = h ? h.name : TYPE_ITEM[t][1];
    return `<span class="ih" title="${escapeHtml(name)} Lv.${lv}"><img src="${itemSprite(id)}" alt="" onerror="this.replaceWith(document.createTextNode('${h ? h.icon : '◆'}'))"><em>${lv}</em></span>`;
  }).join('');
}

function bindInput(g) {
  window.addEventListener('keydown', e => {
    if (state.choosePick) {
      const cards = document.querySelectorAll('.pick-card');
      e.preventDefault();
      g.keys.clear();
      if (['ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW'].includes(e.code)) { state.pickSel = (state.pickSel + cards.length - 1) % cards.length; markPick(); SFX.play('coin'); }
      else if (['ArrowRight', 'KeyD', 'ArrowDown', 'KeyS'].includes(e.code)) { state.pickSel = (state.pickSel + 1) % cards.length; markPick(); SFX.play('coin'); }
      else if (['Enter', 'Space', 'NumpadEnter'].includes(e.code)) {
        // 이동하다 눌린 키로 실수로 고르지 않게: 연타 무시 + 창이 뜬 직후 0.25초는 무시
        if (!e.repeat && performance.now() - state.pickOpenAt > 250 && cards[state.pickSel]) state.choosePick(cards[state.pickSel].dataset.id);
      } else if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
        const c = cards[+e.code.slice(-1) - 1];
        if (c && !e.repeat) state.choosePick(c.dataset.id);
      }
      return;
    }
    if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) { g.usePotion(+e.code.slice(-1) - 1); return; }
    if (e.code === 'KeyB' && g.canChallenge()) { g.challenge(); return; }
    if (e.code === 'Escape') { togglePause(); return; }
    g.keys.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    $('controls-hint').classList.add('fade');
  });
  window.addEventListener('keyup', e => g.keys.delete(e.code));
  window.addEventListener('blur', () => g.keys.clear());
  const cv = $('cv');
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId);
    g.joy = { ox: e.clientX, oy: e.clientY, dx: 0, dy: 0, len: 0 };
  });
  cv.addEventListener('pointermove', e => {
    if (!g.joy) return;
    const dx = e.clientX - g.joy.ox, dy = e.clientY - g.joy.oy, len = Math.hypot(dx, dy);
    Object.assign(g.joy, { dx: len ? dx / len : 0, dy: len ? dy / len : 0, len });
  });
  const up = () => { g.joy = null; };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  window.addEventListener('resize', () => g.resize());
  document.addEventListener('visibilitychange', () => { if (document.hidden && !g.paused) togglePause(true); });
}

function togglePause(force) {
  const g = state.game;
  if (!g || state.choosePick || ['end', 'dead', 'bossdead'].includes(g.phase)) return;
  const on = force ?? $('pause').classList.contains('hidden');
  $('pause').classList.toggle('hidden', !on);
  g.paused = on;
}
$('resume').addEventListener('click', () => togglePause(false));
$('giveup').addEventListener('click', () => {
  $('pause').classList.add('hidden');
  state.game.paused = false;
  state.game.player.hp = 0;
  state.game.die();
});
$('mute').addEventListener('click', () => { $('mute').textContent = SFX.toggle() ? '🔇' : '🔊'; });
$('mute').textContent = SFX.muted ? '🔇' : '🔊';

/* =========================================================
 * 끝 → 포획 → 결과
 * ========================================================= */
async function finishRun(result) {
  try {
    state.finish = await api(`/api/runs/${state.run.runId}/finish`, { method: 'POST', body: result });
  } catch (err) {
    banner(`결과 저장 실패: ${err.message}`, 'rage', 5);
    return;
  }
  refreshGold(state.finish.walletGold);
  if (state.finish.won && state.finish.capturable) openCapture();
  else showResult();
}

function bossSprite() {
  const b = state.run.boss;
  return state.run.bossShiny ? b.sprites.shinyAnimated : (b.sprites.frontAnimated || b.sprites.frontStatic);
}

function openCapture() {
  const f = state.finish, b = state.run.boss;
  $('capture').classList.remove('hidden');
  $('cap-boss').src = bossSprite();
  $('cap-boss').className = 'cap-boss idle';
  $('cap-title').innerHTML = `${state.run.bossShiny ? '<span class="shiny-mark">✨</span>' : ''}${b.legendary ? '★ 전설의 포켓몬 ' : ''}${escapeHtml(b.nameKo)}이(가) 지쳐 있다!`;
  state.throwsLeft = 3;
  renderBalls(f.balls, f.captureNote);
}

function renderBalls(balls, note) {
  $('cap-sub').textContent = `${note || ''} · 남은 기회 ${state.throwsLeft}번`;
  $('cap-balls').innerHTML = balls.length ? balls.map(b => `
    <button class="cap-ball-btn" data-code="${b.code}">
      <img src="${b.sprite}" alt="">
      <b>${escapeHtml(b.name)}</b>
      <span>×${b.qty}</span>
      <em>${b.rate}%</em>
      ${b.note ? `<small>${escapeHtml(b.note)}</small>` : ''}
    </button>`).join('') : '<div class="warn">몬스터볼이 없어요! 다음엔 상점에서 사 오세요.</div>';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

$('cap-balls').addEventListener('click', async e => {
  const btn = e.target.closest('.cap-ball-btn');
  if (!btn || state.throwing) return;
  state.throwing = true;
  document.querySelectorAll('.cap-ball-btn').forEach(b => { b.disabled = true; });
  $('cap-skip').disabled = true;
  const code = btn.dataset.code;
  const sprite = btn.querySelector('img').src;
  let res;
  try {
    res = await api(`/api/runs/${state.run.runId}/capture`, { method: 'POST', body: { ball: code } });
  } catch (err) {
    $('cap-sub').textContent = err.message;
    state.throwing = false;
    document.querySelectorAll('.cap-ball-btn').forEach(b => { b.disabled = false; });
    $('cap-skip').disabled = false;
    return;
  }
  state.throwsLeft = res.throwsLeft;
  await throwAnimation(sprite, res);
  state.throwing = false;
  $('cap-skip').disabled = false;
  if (res.success) {
    state.caught = res.caught;
    await sleep(1600);
    $('capture').classList.add('hidden');
    showResult();
  } else if (res.fled) {
    $('cap-title').textContent = '보스가 도망쳤다…';
    $('cap-boss').className = 'cap-boss flee';
    await sleep(1600);
    $('capture').classList.add('hidden');
    showResult();
  } else {
    renderBalls(res.balls, '다시 던져 보세요!');
  }
});
$('cap-skip').addEventListener('click', () => { $('capture').classList.add('hidden'); showResult(); });

/** 몬스터볼 던지기 연출: 포물선 → 빨려 들어감 → 떨어짐 → 흔들림 → 딸깍 / 탈출 */
async function throwAnimation(sprite, res) {
  const ball = $('cap-ball'), boss = $('cap-boss'), stage = document.querySelector('.cap-stage');
  ball.src = sprite;
  ball.className = 'cap-ball';
  const sr = stage.getBoundingClientRect(), br = boss.getBoundingClientRect();
  const tx = br.left + br.width / 2 - sr.left, ty = br.top + br.height * 0.55 - sr.top;
  const fx = sr.width / 2, fy = sr.height + 40;
  SFX.play('throw');
  await ball.animate([
    { transform: `translate(${fx}px, ${fy}px) rotate(0deg) scale(1.4)` },
    { transform: `translate(${(fx + tx) / 2}px, ${Math.min(fy, ty) - 160}px) rotate(540deg) scale(1.1)`, offset: 0.5 },
    { transform: `translate(${tx}px, ${ty}px) rotate(1080deg) scale(1)` },
  ], { duration: 650, easing: 'cubic-bezier(.3,.7,.5,1)', fill: 'forwards' }).finished;
  // 빨려 들어감
  burst('#ffffff', 16);
  SFX.play('open');
  boss.className = 'cap-boss absorb';
  await sleep(520);
  // 떨어짐
  const groundY = sr.height * 0.78;
  await ball.animate([
    { transform: `translate(${tx}px, ${ty}px)` },
    { transform: `translate(${tx}px, ${groundY}px)`, offset: 0.6 },
    { transform: `translate(${tx}px, ${groundY - 30}px)`, offset: 0.8 },
    { transform: `translate(${tx}px, ${groundY}px)` },
  ], { duration: 520, easing: 'ease-in', fill: 'forwards' }).finished;
  SFX.play('slam');
  await sleep(400);
  for (let i = 0; i < res.shakes; i++) {
    $('cap-sub').textContent = ['…', '… …', '… … …'][i];
    SFX.play('shake');
    await ball.animate([
      { transform: `translate(${tx}px, ${groundY}px) rotate(0deg)` },
      { transform: `translate(${tx - 6}px, ${groundY}px) rotate(-28deg)`, offset: 0.25 },
      { transform: `translate(${tx + 6}px, ${groundY}px) rotate(28deg)`, offset: 0.65 },
      { transform: `translate(${tx}px, ${groundY}px) rotate(0deg)` },
    ], { duration: 520, fill: 'forwards' }).finished;
    await sleep(380);
  }
  if (res.success) {
    SFX.play('caught');
    ball.classList.add('caught');
    burst('#ffe680', 30, true);
    $('cap-title').innerHTML = `잡았다! ${escapeHtml(state.run.boss.nameKo)}${state.run.bossShiny ? ' <span class="shiny-mark">✨이로치</span>' : ''}`;
    $('cap-sub').textContent = '메인 박스로 보냈어요. 도감에도 등록!';
    $('cap-balls').innerHTML = '';
  } else {
    SFX.play('escape');
    ball.className = 'cap-ball hidden';
    burst('#ff6b6b', 20);
    boss.className = 'cap-boss escape';
    $('cap-title').textContent = res.shakes >= 2 ? '아깝다! 조금만 더 하면 잡을 수 있었는데!' : '앗! 몬스터볼에서 빠져나왔다!';
    await sleep(700);
  }
}

function burst(color, n, stars) {
  const el = $('cap-burst');
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 160;
    s.className = stars ? 'star' : '';
    s.style.background = stars ? 'none' : color;
    s.style.color = color;
    s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * d}px`);
    el.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
}

/** 피해 통계: 파티원별 준 피해, 비율, 보스 피해, 처치, 치명타 */
function renderDamage(g) {
  const rows = g.members.map(mb => ({ mb, ...mb.stat }));
  const total = rows.reduce((n, r) => n + r.dmg, 0) + (g.otherDmg || 0);
  if (total <= 0) { $('res-dmg').innerHTML = ''; return; }
  const fmt = n => Math.round(n).toLocaleString();
  rows.sort((a, b) => b.dmg - a.dmg);
  $('res-dmg').innerHTML = `<h3>⚔ 피해 통계 <small>총 ${fmt(total)}</small></h3>` + rows.map((r, i) => {
    const pct = r.dmg / total * 100, sp = r.mb.sprites;
    return `<div class="rd-row" style="--c:${r.mb.color};animation-delay:${0.15 + i * 0.12}s">
      <img src="${sp.still || sp.front}" alt="">
      <div class="rd-body">
        <div class="rd-top"><b>${i === 0 ? '👑 ' : ''}${escapeHtml(r.mb.owned.nickname || r.mb.owned.pokemon.nameKo)}</b>
          <span class="rd-skill">${escapeHtml(r.mb.skill.name)}${r.mb.awake ? ' · 각성' : ` Lv.${r.mb.slv}`}</span>
          <em>${pct.toFixed(1)}%</em></div>
        <div class="rd-bar"><i style="--w:${pct}%"></i></div>
        <small>피해 ${fmt(r.dmg)} · 보스 ${fmt(r.boss)} · 처치 ${r.kills} · 치명타 ${r.hits ? Math.round(r.crits / r.hits * 100) : 0}%</small>
      </div>
    </div>`;
  }).join('') + (g.otherDmg > 0 ? `<div class="rd-other">반격·기타 ${fmt(g.otherDmg)} (${(g.otherDmg / total * 100).toFixed(1)}%)</div>` : '');
}

function showResult() {
  const f = state.finish, g = state.game;
  $('result').classList.remove('hidden');
  $('res-title').innerHTML = (f.won ? `🏆 ${state.run.tier.label} 클리어!` : '💫 눈앞이 캄캄해졌다…')
    + (f.tierUnlocked === 'ABYSS' ? '<div class="res-unlock nm">🕳 숨겨진 단계 ABYSS 가 깨어났다…</div>'
      : f.tierUnlocked ? `<div class="res-unlock">🔓 ${f.tierUnlocked} 단계가 열렸어요!</div>` : '');
  $('res-gold').innerHTML = `<span>💰 +<b id="gold-count">0</b></span><small>${f.won ? '' : '쓰러져서 골드 절반 · '}처치 ${g.kills} · 던전 Lv.${g.lv} · 보유 ${f.walletGold.toLocaleString()}</small>`;
  // 골드 숫자 올라가기
  const target = f.gold;
  let cur = 0;
  const step = () => {
    cur = Math.min(target, cur + Math.max(1, Math.ceil(target / 40)));
    $('gold-count').textContent = cur;
    if (cur < target) { SFX.play('coin', 60); requestAnimationFrame(step); }
  };
  step();

  renderDamage(g);
  $('res-exp').innerHTML = f.exp.map((x, i) => {
    const o = x.owned, sp = spritesOf(o);
    const up = o.level > x.levelBefore;
    const pct = lvPct(o);
    return `<div class="re-row${up ? ' up' : ''}" style="animation-delay:${0.3 + i * 0.25}s">
      <img src="${sp.front}" alt="">
      <div>
        <b>${escapeHtml(o.nickname || o.pokemon.nameKo)} ${lvHtml(o)}</b>
        <div class="re-bar"><i style="--w:${pct}%"></i></div>
        <small>경험치 +${x.gained}${o.nextLevelExp ? ` · 다음 레벨까지 ${o.nextLevelExp - o.exp}` : ' · 최고 레벨!'}</small>
      </div>
      ${up ? `<span class="re-up">▲ 레벨 업! Lv.${x.levelBefore} → ${o.level}</span>` : ''}
    </div>`;
  }).join('');
  if (f.exp.some(x => x.owned.level > x.levelBefore)) setTimeout(() => SFX.play('starup'), 900);

  const c = state.caught;
  $('res-caught').innerHTML = c
    ? `<img src="${spritesOf(c).front}" alt=""><div><b>새 친구! ${c.showShiny ? '<span class="shiny-mark">✨</span>' : ''}${escapeHtml(c.pokemon.nameKo)}</b><small>메인 박스에 나타났어요</small></div>`
    : f.won && !f.capturable ? `<div><small>${escapeHtml(f.captureNote)} (+100 골드)</small></div>` : '';
}

loadLobby().catch(err => { $('go-msg').textContent = err.message; });
