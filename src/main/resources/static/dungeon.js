/* 오늘의 던전: 로비(바이옴·파티·도구) → 전투(dungeon-engine.js) → 포획 → 결과 */
renderNav('dungeon');

const $ = id => document.getElementById(id);
const state = {
  today: null, collection: [], shop: null,
  biome: null, party: [], bring: {},
  run: null, game: null, finish: null, caught: null,
};

/* ---------- 능력치 (서버 RunService.combat 과 같은 식) ---------- */
function growthRate(bst) { return 0.10 + 0.10 * Math.max(0, Math.min(1, (600 - bst) / 300)); }
function combatOf(o) {
  const st = o.pokemon.stats || { hp: 50, attack: 55, spAttack: 55, defense: 50, spDefense: 50, speed: 50, bst: 300 };
  const m = Math.pow(1 + growthRate(st.bst), o.stars);
  return {
    hp: Math.round(st.hp * m), atk: Math.round(Math.max(st.attack, st.spAttack) * m),
    def: Math.round((st.defense + st.spDefense) / 2 * m), spd: Math.round(st.speed * m), growth: growthRate(st.bst),
  };
}

/* =========================================================
 * 로비
 * ========================================================= */
async function loadLobby() {
  const [today, collection, shop] = await Promise.all([api('/api/dungeon/today'), api('/api/collection'), api('/api/shop')]);
  Object.assign(state, { today, collection, shop });
  refreshGold(shop.gold);
  $('today-sub').textContent = `${today.date} · 오늘의 바이옴 3곳 중 하나를 골라 출격해요 (개발 중이라 횟수 제한 없음)`;

  $('starter').classList.toggle('hidden', collection.length > 0);
  if (!collection.length) renderStarter();
  if (!state.biome) state.biome = today.options[0].id;
  if (!state.party.length && collection.length) {
    state.party = [...collection].sort((a, b) => b.stars - a.stars || b.exp - a.exp).slice(0, 3).map(o => o.pokemon.id);
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
      <small>${PATTERN_INFO[PATTERN[p.typesKo[0]]].name}</small>
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
        <small>${escapeHtml(b.description)}</small>
        <div class="bo-row">👑 관장 보스 ${typeChips(b.bossTypes)}</div>
        <div class="bo-row">👾 몬스터 ${typeChips(b.mobTypes)}</div>
      </div>
    </button>`).join('');
  el.querySelectorAll('canvas').forEach(cv => biomePreview(cv, cv.dataset.biome));
}
$('biome-pick').addEventListener('click', e => {
  const b = e.target.closest('.biome-opt');
  if (!b) return;
  state.biome = b.dataset.id;
  SFX.play('open');
  renderBiomes();
  renderParty();
});

/** 지금 고른 바이옴의 보스·몬스터 타입에 대한 상성 요약 */
function matchup(o) {
  const b = state.today.options.find(x => x.id === state.biome);
  if (!b) return '';
  const atk = o.pokemon.typesKo[0];
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
      ${starsHtml(o.stars)}
    </button>`;
  }).join('');
  if (!own.length) { $('party-list').innerHTML = ''; return; }
  $('party-list').innerHTML = [...own].sort((a, b) => b.stars - a.stars || a.pokemon.id - b.pokemon.id).map(o => {
    const c = combatOf(o), sp = spritesOf(o), on = state.party.includes(o.pokemon.id);
    const pat = PATTERN_INFO[PATTERN[o.pokemon.typesKo[0]] || 'shot'];
    const expPct = o.nextStarExp ? Math.round((o.exp - o.starExp) / (o.nextStarExp - o.starExp) * 100) : 100;
    return `<button class="pcard${on ? ' on' : ''}" data-id="${o.pokemon.id}">
      <img src="${sp.still || sp.front}" alt="">
      <div class="pc-body">
        <b>${sp.shiny ? '<span class="shiny-mark">✨</span>' : ''}${escapeHtml(o.nickname || o.pokemon.nameKo)} ${starsHtml(o.stars)}</b>
        <div>${typeChips(o.pokemon.typesKo)} <small class="pat">${pat.name}</small> ${matchup(o)}</div>
        <div class="pc-stats">❤${c.hp} ⚔${c.atk} 🛡${c.def} 💨${c.spd} <small>별당 +${Math.round(c.growth * 100)}%</small></div>
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
  const entries = state.shop.entries.filter(e => e.item && ['HEAL', 'BUFF_ATTACK', 'BUFF_SPEED', 'BUFF_DEFENSE'].includes(e.use));
  const owned = entries.filter(e => e.qty > 0);
  $('bring').innerHTML = owned.length ? owned.map(e => {
    const n = state.bring[e.code] || 0, max = Math.min(e.qty, e.use === 'HEAL' ? 5 : 1);
    return `<div class="bring-item${n ? ' on' : ''}" data-code="${e.code}">
      <img src="${e.item.sprite}" alt="">
      <div><b>${escapeHtml(e.item.nameKo)}</b><small>${escapeHtml(e.desc)} · 보유 ${e.qty}</small></div>
      <div class="cnt"><button data-d="-1" ${n ? '' : 'disabled'}>−</button><span>${n}</span><button data-d="1" ${n < max ? '' : 'disabled'}>＋</button></div>
    </div>`;
  }).join('') : '<div class="muted">가져갈 상처약·X아이템이 없어요. <a href="/shop.html">상점</a>에서 살 수 있어요.</div>';

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
    state.run = await api('/api/runs', { method: 'POST', body: { biome: state.biome, party: state.party, bring } });
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
      <button class="pick-card" data-id="${u.id}" style="animation-delay:${i * 0.08}s">
        <span class="pk-key">${i + 1}</span>
        <span class="pk-icon">${u.icon}</span>
        <b>${escapeHtml(u.name)}</b>
        <small>${escapeHtml(u.desc)}</small>
        <span class="pk-stack">${'●'.repeat(u.stack)}${'○'.repeat(u.max - u.stack)}</span>
      </button>`).join('');
    $('pick').classList.remove('hidden');
    SFX.play('open');
    state.choosePick = id => {
      $('pick').classList.add('hidden');
      state.choosePick = null;
      choose(id);
      renderBuffs();
    };
  },
  onBanner(text, kind) { banner(text, kind); },
  onWarning(boss, shiny) {
    $('warn-sub').innerHTML = `체육관 관장의 ${shiny ? '✨이로치 ' : ''}<b>${escapeHtml(boss.nameKo)}</b>이(가) 나타난다! ${typeChips(boss.typesKo)}`;
    $('warning').classList.remove('hidden');
    setTimeout(() => $('warning').classList.add('hidden'), 3000);
  },
  onBoss(b) {
    $('bb-name').innerHTML = `${b.shiny ? '<span class="shiny-mark">✨</span>' : ''}관장의 ${escapeHtml(b.p.nameKo)} ${typeChips(b.types)}`;
    $('bossbar').classList.remove('hidden');
  },
  onHud(g) {
    const p = g.player;
    $('hp-fill').style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
    $('hp-text').textContent = `${Math.max(0, Math.ceil(p.hp))} / ${Math.round(p.maxHp)}`;
    $('hp-fill').parentElement.classList.toggle('low', p.hp / p.maxHp < 0.3);
    const t = Math.min(RUN_TIME, g.time);
    $('tl-fill').style.width = `${t / RUN_TIME * 100}%`;
    const left = Math.max(0, RUN_TIME - t);
    $('tl-text').textContent = g.boss ? (g.boss.state === 'dead' ? '승리!' : '보스전') : `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} 남음`;
    $('gold').textContent = `💰 ${Math.floor(g.gold)}`;
    $('kills').textContent = `처치 ${g.kills}`;
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
    <div class="ph" title="${escapeHtml(PATTERN_INFO[mb.pattern].name)}">
      <img src="${mb.sprites.still || mb.sprites.front}" alt="">
      <span>${starsHtml(mb.owned.stars)}</span>
      <small style="color:${mb.color}">${PATTERN_INFO[mb.pattern].name}</small>
    </div>`).join('');
}

function renderPotions() {
  $('potions').innerHTML = state.game.potions.map((pt, i) => `
    <button class="potion" data-i="${i}" title="${escapeHtml(pt.name)} (${i + 1})">
      <img src="${pt.sprite}" alt=""><em>${pt.left}</em><kbd>${i + 1}</kbd>
    </button>`).join('');
}
$('potions').addEventListener('click', e => {
  const b = e.target.closest('.potion');
  if (b) state.game.usePotion(+b.dataset.i);
});

function renderBuffs() {
  const g = state.game;
  const chips = (state.run.brought || []).filter(b => b.use.startsWith('BUFF')).map(b => `<span class="buff">${escapeHtml(b.name)}</span>`);
  Object.entries(g.stacks).forEach(([id, n]) => {
    const u = UPGRADES.find(x => x.id === id);
    chips.push(`<span class="buff" title="${escapeHtml(u.desc)}">${u.icon} ${escapeHtml(u.name)}${n > 1 ? ` ×${n}` : ''}</span>`);
  });
  $('buffs').innerHTML = chips.join('');
}

function bindInput(g) {
  window.addEventListener('keydown', e => {
    if (state.choosePick && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
      const cards = document.querySelectorAll('.pick-card');
      const c = cards[+e.code.slice(-1) - 1];
      if (c) state.choosePick(c.dataset.id);
      return;
    }
    if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) { g.usePotion(+e.code.slice(-1) - 1); return; }
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
  $('cap-title').innerHTML = `${state.run.bossShiny ? '<span class="shiny-mark">✨</span>' : ''}관장의 ${escapeHtml(b.nameKo)}이(가) 지쳐 있다!`;
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
    </button>`).join('') : '<div class="warn">몬스터볼이 없어요! 다음엔 <a href="/shop.html">상점</a>에서 사 오세요.</div>';
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

function showResult() {
  const f = state.finish, g = state.game;
  $('result').classList.remove('hidden');
  $('res-title').innerHTML = f.won ? '🏆 던전 클리어!' : '💫 눈앞이 캄캄해졌다…';
  $('res-gold').innerHTML = `<span>💰 +<b id="gold-count">0</b></span><small>${f.won ? '' : '쓰러져서 골드 절반 · '}처치 ${g.kills} · 보유 ${f.walletGold.toLocaleString()}</small>`;
  // 골드 숫자 올라가기
  const target = f.gold;
  let cur = 0;
  const step = () => {
    cur = Math.min(target, cur + Math.max(1, Math.ceil(target / 40)));
    $('gold-count').textContent = cur;
    if (cur < target) { SFX.play('coin', 60); requestAnimationFrame(step); }
  };
  step();

  $('res-exp').innerHTML = f.exp.map((x, i) => {
    const o = x.owned, sp = spritesOf(o);
    const up = o.stars > x.starsBefore;
    const pct = o.nextStarExp ? Math.round((o.exp - o.starExp) / (o.nextStarExp - o.starExp) * 100) : 100;
    return `<div class="re-row${up ? ' up' : ''}" style="animation-delay:${0.3 + i * 0.25}s">
      <img src="${sp.front}" alt="">
      <div>
        <b>${escapeHtml(o.nickname || o.pokemon.nameKo)} ${starsHtml(o.stars)}</b>
        <div class="re-bar"><i style="--w:${pct}%"></i></div>
        <small>경험치 +${x.gained}${o.nextStarExp ? ` · 다음 별까지 ${o.nextStarExp - o.exp}` : ' · 최고 등급!'}</small>
      </div>
      ${up ? '<span class="re-up">★ 별이 올랐다!</span>' : ''}
    </div>`;
  }).join('');
  if (f.exp.some(x => x.owned.stars > x.starsBefore)) setTimeout(() => SFX.play('starup'), 900);

  const c = state.caught;
  $('res-caught').innerHTML = c
    ? `<img src="${spritesOf(c).front}" alt=""><div><b>새 친구! ${c.showShiny ? '<span class="shiny-mark">✨</span>' : ''}${escapeHtml(c.pokemon.nameKo)}</b><small>메인 박스에 나타났어요</small></div>`
    : f.won && !f.capturable ? `<div><small>${escapeHtml(f.captureNote)} (+100 골드)</small></div>` : '';
}

loadLobby().catch(err => { $('go-msg').textContent = err.message; });
