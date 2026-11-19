/* 카드 짝맞추기 게임 */
renderNav('game');

const state = {
  level: 'NORMAL',
  game: null,          // 서버가 준 판 정보
  opened: [],          // 지금 뒤집힌(아직 판정 전) 카드 인덱스
  matched: [],         // 맞춘 쌍 [[a,b], ...]
  moves: 0,
  deadline: 0,
  timer: null,
  locked: false,
  finished: false,
};

async function init() {
  const ov = await api('/api/game');
  const box = document.getElementById('levels');
  box.innerHTML = ov.levels.map(l => `
    <button class="level${l.level === state.level ? ' on' : ''}" data-level="${l.level}">
      <b>${l.label}</b>
      <span>${l.rows}×${l.cols} · ${l.pairs}쌍 · ${l.limitSeconds}초</span>
    </button>`).join('');
  box.addEventListener('click', e => {
    const b = e.target.closest('.level');
    if (!b) return;
    state.level = b.dataset.level;
    box.querySelectorAll('.level').forEach(x => x.classList.toggle('on', x === b));
  });
  document.getElementById('pool-info').textContent =
    `등장 가능한 포켓몬 ${ov.poolSize}마리 · 획득 ${ov.owned}마리`;
}

async function start() {
  const msg = document.getElementById('setup-msg');
  msg.textContent = '';
  try {
    state.game = await api('/api/game/start', { method: 'POST', body: { level: state.level } });
  } catch (err) {
    msg.textContent = err.message;
    return;
  }
  Object.assign(state, { opened: [], matched: [], moves: 0, locked: false, finished: false });
  const g = state.game;

  document.getElementById('setup').classList.add('hidden');
  document.getElementById('play').classList.remove('hidden');
  document.getElementById('hud-level').textContent = `${g.rows}×${g.cols}`;
  document.getElementById('hud-new').textContent =
    g.newCandidates ? `새 포켓몬 후보 ${g.newCandidates}마리` : '이번 판은 모두 이미 가진 포켓몬';
  updateHud();

  const board = document.getElementById('board');
  board.style.gridTemplateColumns = `repeat(${g.cols}, 1fr)`;
  board.style.maxWidth = `${g.cols * 120}px`;
  board.innerHTML = g.cards.map(c => `
    <div class="mcard" data-i="${c.index}">
      <div class="inner">
        <div class="face back"></div>
        <div class="face front"><img src="${c.image}" alt=""><span>${escapeHtml(c.name)}</span></div>
      </div>
    </div>`).join('');

  // 서버 시간 기준과 거의 같도록 지금부터 카운트
  state.deadline = performance.now() + g.limitSeconds * 1000;
  clearInterval(state.timer);
  state.timer = setInterval(tick, 200);
  tick();
}

function tick() {
  const left = Math.max(0, (state.deadline - performance.now()) / 1000);
  const g = state.game;
  document.getElementById('hud-time').textContent = Math.ceil(left);
  document.getElementById('timebar').style.width = `${left / g.limitSeconds * 100}%`;
  document.querySelector('.timebar').classList.toggle('danger', left < 10);
  if (left <= 0 && !state.finished) finish(false);
}

function updateHud() {
  document.getElementById('hud-pairs').textContent = `${state.matched.length} / ${state.game.cards.length / 2}`;
  document.getElementById('hud-moves').textContent = state.moves;
}

document.getElementById('board').addEventListener('click', e => {
  const el = e.target.closest('.mcard');
  if (!el || state.locked || state.finished) return;
  const i = +el.dataset.i;
  if (el.classList.contains('open') || el.classList.contains('done')) return;

  el.classList.add('open');
  state.opened.push(i);
  if (state.opened.length < 2) return;

  const [a, b] = state.opened;
  state.opened = [];
  state.moves++;
  const cards = state.game.cards;
  const elA = document.querySelector(`.mcard[data-i="${a}"]`);
  const elB = document.querySelector(`.mcard[data-i="${b}"]`);

  if (cards[a].pokemonId === cards[b].pokemonId) {
    state.matched.push([a, b]);
    setTimeout(() => { elA.classList.add('done'); elB.classList.add('done'); }, 250);
    updateHud();
    if (state.matched.length === cards.length / 2) setTimeout(() => finish(true), 450);
  } else {
    state.locked = true;
    elA.classList.add('wrong'); elB.classList.add('wrong');
    setTimeout(() => {
      elA.classList.remove('open', 'wrong'); elB.classList.remove('open', 'wrong');
      state.locked = false;
    }, 750);
    updateHud();
  }
});

async function finish(cleared) {
  if (state.finished) return;
  state.finished = true;
  clearInterval(state.timer);
  let res;
  try {
    res = await api(`/api/game/${state.game.gameId}/finish`, {
      method: 'POST', body: { matchedPairs: cleared ? state.matched : [] },
    });
  } catch (err) {
    res = { result: 'INVALID', message: err.message };
  }
  showResult(res);
}

function showResult(res) {
  const title = document.getElementById('result-title');
  const body = document.getElementById('result-body');
  const actions = document.getElementById('result-actions');
  const again = '<button class="btn" id="again">한 판 더</button>';

  if (res.result === 'WIN' && res.reward) {
    const p = res.reward.pokemon;
    const shiny = res.reward.shiny;
    title.textContent = shiny ? '✨ 이로치 포켓몬 획득!! ✨' : '🎉 새 포켓몬 획득!';
    body.innerHTML = `
      <img class="reward-img${shiny ? ' shiny' : ''}" src="${shiny ? p.sprites.shinyArtwork : (p.sprites.officialArtwork || p.sprites.frontAnimated)}" alt="">
      <div class="reward-name">${shiny ? '✨ ' : ''}${escapeHtml(p.nameKo)}</div>
      <div class="reward-meta">${dexNo(p.id)} · ${escapeHtml(p.genusKo)} · ${res.elapsedSeconds.toFixed(1)}초 클리어</div>
      <div class="reward-types">${typeChips(p.typesKo)}</div>
      <div class="nick-row">
        <input type="text" id="nick" maxlength="12" placeholder="별명 (선택)">
      </div>`;
    actions.innerHTML = `
      <button class="btn" id="place">메인 박스에서 만나기</button>
      <button class="btn ghost" id="again">한 판 더</button>
      <a class="btn ghost" href="/dex.html">도감 보기</a>`;
    document.getElementById('place').onclick = async () => {
      const nickname = document.getElementById('nick').value.trim();
      // 획득하면 이미 메인 박스 중앙(가까운 빈칸)에 나와 있음
      if (nickname) await api(`/api/collection/${p.id}`, { method: 'PATCH', body: { nickname } });
      location.href = '/';
    };
  } else if (res.result === 'WIN') {
    title.textContent = '클리어!';
    body.innerHTML = `<p>${escapeHtml(res.message)}</p>`;
    actions.innerHTML = again;
  } else {
    title.textContent = res.result === 'TIME_OVER' ? '⏰ 시간 초과' : '아쉬워요';
    body.innerHTML = `<p>${escapeHtml(res.message || '')}</p>`;
    actions.innerHTML = again;
  }
  document.getElementById('again').onclick = () => {
    document.getElementById('result').classList.add('hidden');
    backToSetup();
  };
  document.getElementById('result').classList.remove('hidden');
}

function backToSetup() {
  document.getElementById('play').classList.add('hidden');
  document.getElementById('setup').classList.remove('hidden');
  init();
}

document.getElementById('start').addEventListener('click', start);
document.getElementById('give-up').addEventListener('click', () => { if (!state.finished) finish(false); });

init();
