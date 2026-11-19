/* =========================================================
 * 포켓몬마다 고유 기술 (1세대 151마리) + 공용 공격 방식
 *
 *  MOVES[기술명] = { t: 기술 타입(색·상성), p: 공격 방식, cd: 재사용(초), 그 밖의 옵션 }
 *  SPECIES_MOVE[도감번호] = 기술명   (없으면 첫 번째 타입의 기본 기술)
 *  공격 방식(p)은 여러 기술이 같이 쓰고, 옵션(크기·개수·둔화·회복 등)으로 차이를 줌
 * ========================================================= */

const MOVES = {
  // 풀
  '덩굴채찍': { t: '풀', p: 'whip', cd: 0.9, mul: 1.1, len: 170 },
  '잎날가르기': { t: '풀', p: 'spread', cd: 0.95, n: 3, kind: 'leaf', mul: 0.8, crit: 0.15 },
  '솔라빔': { t: '풀', p: 'bigbeam', cd: 3.2, mul: 5.5, w: 36 },
  '메가드레인': { t: '풀', p: 'leech', cd: 1.0, mul: 0.8, heal: 1.5 },
  '꽃잎댄스': { t: '풀', p: 'orbit', n: 4, kind: 'petal', mul: 0.55, R: 84 },
  '바늘미사일': { t: '벌레', p: 'rapid', cd: 0.22, kind: 'needle', mul: 0.4 },
  // 불꽃
  '불꽃세례': { t: '불꽃', p: 'fireball', cd: 1.0, explode: 52 },
  '화염방사': { t: '불꽃', p: 'breath', cd: 1.4, len: 230, mul: 0.55 },
  '불대문자': { t: '불꽃', p: 'nova', cd: 2.4, n: 10, kind: 'fire', mul: 1.2 },
  '화염자동차': { t: '불꽃', p: 'orbit', n: 2, kind: 'flame', mul: 0.75, R: 70 },
  // 물
  '물대포': { t: '물', p: 'beam', cd: 1.05 },
  '거품광선': { t: '물', p: 'bubble', cd: 1.0, n: 4, mul: 0.6 },
  '하이드로펌프': { t: '물', p: 'bigbeam', cd: 2.8, mul: 4.5, w: 30, twin: true },
  '파도타기': { t: '물', p: 'wave', cd: 2.2, R: 230, mul: 1.4 },
  '휘감기': { t: '물', p: 'orbit', n: 3, kind: 'tentacle', mul: 0.5, R: 64 },
  '크랩해머': { t: '물', p: 'melee', cd: 0.9, mul: 1.6, r: 95, knock: 220 },
  '폭포오르기': { t: '물', p: 'pierce', cd: 1.1, mul: 1.3 },
  '고속스핀': { t: '물', p: 'orbit', n: 3, kind: 'star', mul: 0.55, R: 76 },
  // 전기
  '10만볼트': { t: '전기', p: 'chain', cd: 1.15 },
  '번개': { t: '전기', p: 'thunder', cd: 1.9, n: 3, mul: 1.8 },
  '전기쇼크': { t: '전기', p: 'shot', cd: 0.5, kind: 'spark' },
  '방전': { t: '전기', p: 'nova', cd: 1.8, n: 12, kind: 'spark', mul: 0.8 },
  '번개펀치': { t: '전기', p: 'melee', cd: 0.75, mul: 1.3, r: 90, chainTo: 2 },
  '전격 바늘': { t: '전기', p: 'rapid', cd: 0.24, kind: 'needle', mul: 0.45 },
  // 얼음
  '냉동빔': { t: '얼음', p: 'beam', cd: 1.2, slow: 1.6, w: 12 },
  '눈보라': { t: '얼음', p: 'aura', cd: 0.5, R: 150, mul: 0.4, slow: 1.0 },
  '얼음뭉치': { t: '얼음', p: 'spread', cd: 1.0, n: 3, kind: 'ice', slow: 1.5, mul: 0.7 },
  '고드름침': { t: '얼음', p: 'rapid', cd: 0.26, kind: 'icicle', mul: 0.45, slow: 0.6 },
  // 노말
  '몸통박치기': { t: '노말', p: 'shot', cd: 0.55 },
  '전광석화': { t: '노말', p: 'pierce', cd: 0.7, mul: 0.8, speed: 900 },
  '신속': { t: '노말', p: 'pierce', cd: 0.55, mul: 0.9, speed: 1000, n: 2 },
  '파괴광선': { t: '노말', p: 'bigbeam', cd: 3.6, mul: 7, w: 42 },
  '노래하기': { t: '노말', p: 'sing', cd: 2.4, R: 200, mul: 0.4 },
  '튀어오르기': { t: '노말', p: 'splash', cd: 0.6 },
  '대폭발': { t: '노말', p: 'selfdestruct', cd: 6, R: 230, mul: 9 },
  '누르기': { t: '노말', p: 'quake', cd: 1.5, R: 140, mul: 1.3 },
  '베어가르기': { t: '노말', p: 'razor', cd: 0.9, n: 3, mul: 0.9 },
  '트라이어택': { t: '노말', p: 'triattack', cd: 1.0 },
  '알폭탄': { t: '노말', p: 'lob', cd: 1.4, explode: 70, mul: 1.6, kind: 'egg' },
  '알낳기': { t: '노말', p: 'heal', cd: 3.5, pct: 0.06 },
  '고양이돈받기': { t: '노말', p: 'payday', cd: 0.6 },
  '손가락흔들기': { t: '노말', p: 'metronome', cd: 1.0 },
  '변신': { t: '노말', p: 'transform', cd: 1.0 },
  '뿔드릴': { t: '노말', p: 'pierce', cd: 1.3, mul: 2.2, r: 12 },
  '돌진': { t: '노말', p: 'pierce', cd: 1.1, mul: 1.6, r: 14 },
  '핥기': { t: '노말', p: 'melee', cd: 0.7, mul: 1.0, r: 80 },
  // 벌레
  '실뿜기': { t: '벌레', p: 'spread', cd: 1.2, n: 5, kind: 'string', slow: 1.8, mul: 0.35 },
  '더블니들': { t: '벌레', p: 'rapid', cd: 0.2, kind: 'needle', mul: 0.38, pierce: 2 },
  '흡혈': { t: '벌레', p: 'leech', cd: 0.9, mul: 0.7, heal: 1 },
  '은빛바람': { t: '벌레', p: 'nova', cd: 1.7, n: 14, kind: 'dust', mul: 0.55 },
  '연속자르기': { t: '벌레', p: 'razor', cd: 0.7, n: 4, mul: 0.7 },
  '시저크로스': { t: '벌레', p: 'melee', cd: 0.8, mul: 1.5, r: 100, cross: true },
  // 독
  '독침': { t: '독', p: 'shot', cd: 0.45, kind: 'needle', mul: 0.8, poison: true },
  '오물폭탄': { t: '독', p: 'lob', cd: 1.6, cloud: 80, mul: 1.0, kind: 'sludge' },
  '독가스': { t: '독', p: 'cloud', cd: 1.6 },
  '용해액': { t: '독', p: 'bubble', cd: 1.0, n: 3, mul: 0.6, kind: 'acid' },
  // 땅
  '지진': { t: '땅', p: 'quake', cd: 1.7, R: 200, mul: 1.4 },
  '구멍파기': { t: '땅', p: 'meteor', cd: 1.3, n: 1, kind: 'dig', mul: 1.9 },
  '뼈다귀부메랑': { t: '땅', p: 'boomerang', cd: 1.1, kind: 'bone', mul: 1.0 },
  '모래뿌리기': { t: '땅', p: 'spread', cd: 0.9, n: 5, kind: 'sand', mul: 0.45 },
  // 바위
  '스톤샤워': { t: '바위', p: 'meteor', cd: 1.6, n: 3, mul: 1.5 },
  '돌떨구기': { t: '바위', p: 'meteor', cd: 1.2, n: 1, mul: 1.7 },
  // 비행
  '바람일으키기': { t: '비행', p: 'boomerang', cd: 1.2, kind: 'gust', mul: 0.8 },
  '날개치기': { t: '비행', p: 'razor', cd: 0.9, n: 2, mul: 0.9, kind: 'wing' },
  '회전부리': { t: '비행', p: 'pierce', cd: 1.0, mul: 1.5, r: 10, spin: true },
  '쪼기': { t: '비행', p: 'rapid', cd: 0.3, kind: 'peck', mul: 0.5 },
  '공중날기': { t: '비행', p: 'meteor', cd: 1.5, n: 1, kind: 'dive', mul: 2.4 },
  // 에스퍼
  '사이코키네시스': { t: '에스퍼', p: 'wave', cd: 1.8, R: 210, mul: 1.2, rings: 3 },
  '염동력': { t: '에스퍼', p: 'homing', cd: 0.9 },
  '최면술': { t: '에스퍼', p: 'sing', cd: 2.6, R: 190, mul: 0.3, kind: 'hypno' },
  '리플렉터': { t: '에스퍼', p: 'orbit', n: 3, kind: 'wall', mul: 0.5, R: 60, armor: 0.06 },
  '사이코브레이크': { t: '에스퍼', p: 'wave', cd: 1.4, R: 280, mul: 1.8, rings: 4 },
  // 고스트
  '섀도볼': { t: '고스트', p: 'shadow', cd: 1.3 },
  '나이트헤드': { t: '고스트', p: 'homing', cd: 1.0, kind: 'night', mul: 1.2 },
  '혀로핥기': { t: '고스트', p: 'melee', cd: 0.7, mul: 1.0, r: 80 },
  // 드래곤
  '용의분노': { t: '드래곤', p: 'breath', cd: 1.5, len: 210 },
  '역린': { t: '드래곤', p: 'razor', cd: 0.8, n: 5, mul: 0.9, kind: 'dragon' },
  // 격투
  '연속펀치': { t: '격투', p: 'melee', cd: 0.45, mul: 0.7, r: 80 },
  '메가톤펀치': { t: '격투', p: 'melee', cd: 1.1, mul: 2.2, r: 100, knock: 260 },
  '지옥의바퀴': { t: '격투', p: 'quake', cd: 1.5, R: 150, mul: 1.4 },
  '무릎차기': { t: '격투', p: 'pierce', cd: 1.0, mul: 1.8, r: 12 },
  // 악 / 강철 / 페어리
  '깨물기': { t: '악', p: 'melee', cd: 0.7, mul: 1.2, r: 80, bite: true },
  '쇠꼬리': { t: '강철', p: 'whip', cd: 1.0, mul: 1.4, len: 150 },
  '문포스': { t: '페어리', p: 'homing', cd: 1.1, kind: 'moon', mul: 1.5 },
};

/** 타입별 기본 기술 (새로 추가된 2세대 이후 포켓몬 등) */
const TYPE_MOVE = {
  '노말': '몸통박치기', '불꽃': '불꽃세례', '물': '물대포', '풀': '잎날가르기', '전기': '10만볼트', '얼음': '얼음뭉치',
  '격투': '연속펀치', '독': '독침', '땅': '지진', '비행': '바람일으키기', '에스퍼': '염동력', '벌레': '더블니들',
  '바위': '스톤샤워', '고스트': '섀도볼', '드래곤': '용의분노', '악': '깨물기', '강철': '쇠꼬리', '페어리': '문포스',
};

const SPECIES_MOVE = {
  1: '덩굴채찍', 2: '잎날가르기', 3: '솔라빔', 4: '불꽃세례', 5: '화염방사', 6: '불대문자',
  7: '물대포', 8: '거품광선', 9: '하이드로펌프', 10: '실뿜기', 11: '몸통박치기', 12: '은빛바람',
  13: '독침', 14: '독침', 15: '더블니들', 16: '바람일으키기', 17: '날개치기', 18: '공중날기',
  19: '전광석화', 20: '깨물기', 21: '쪼기', 22: '회전부리', 23: '독침', 24: '오물폭탄',
  25: '10만볼트', 26: '번개', 27: '모래뿌리기', 28: '구멍파기', 29: '독침', 30: '독침', 31: '지진',
  32: '독침', 33: '뿔드릴', 34: '지진', 35: '손가락흔들기', 36: '문포스', 37: '불꽃세례', 38: '불대문자',
  39: '노래하기', 40: '노래하기', 41: '흡혈', 42: '흡혈', 43: '메가드레인', 44: '독가스', 45: '꽃잎댄스',
  46: '흡혈', 47: '독가스', 48: '염동력', 49: '은빛바람', 50: '구멍파기', 51: '지진',
  52: '고양이돈받기', 53: '깨물기', 54: '물대포', 55: '사이코키네시스', 56: '연속펀치', 57: '메가톤펀치',
  58: '화염자동차', 59: '신속', 60: '거품광선', 61: '물대포', 62: '지옥의바퀴', 63: '염동력', 64: '사이코키네시스',
  65: '사이코키네시스', 66: '연속펀치', 67: '메가톤펀치', 68: '지옥의바퀴', 69: '덩굴채찍', 70: '용해액',
  71: '잎날가르기', 72: '용해액', 73: '휘감기', 74: '돌떨구기', 75: '스톤샤워', 76: '대폭발',
  77: '화염자동차', 78: '화염방사', 79: '염동력', 80: '사이코키네시스', 81: '전기쇼크', 82: '방전',
  83: '베어가르기', 84: '쪼기', 85: '트라이어택', 86: '냉동빔', 87: '눈보라', 88: '오물폭탄', 89: '오물폭탄',
  90: '고드름침', 91: '얼음뭉치', 92: '혀로핥기', 93: '나이트헤드', 94: '섀도볼', 95: '스톤샤워',
  96: '최면술', 97: '사이코키네시스', 98: '거품광선', 99: '크랩해머', 100: '대폭발', 101: '대폭발',
  102: '알폭탄', 103: '알폭탄', 104: '뼈다귀부메랑', 105: '뼈다귀부메랑', 106: '무릎차기', 107: '연속펀치',
  108: '핥기', 109: '독가스', 110: '오물폭탄', 111: '뿔드릴', 112: '지진', 113: '알낳기', 114: '덩굴채찍',
  115: '연속펀치', 116: '물대포', 117: '하이드로펌프', 118: '폭포오르기', 119: '폭포오르기', 120: '고속스핀',
  121: '사이코키네시스', 122: '리플렉터', 123: '연속자르기', 124: '눈보라', 125: '번개펀치', 126: '화염방사',
  127: '시저크로스', 128: '돌진', 129: '튀어오르기', 130: '파괴광선', 131: '파도타기', 132: '변신',
  133: '전광석화', 134: '거품광선', 135: '전격 바늘', 136: '화염방사', 137: '트라이어택', 138: '거품광선',
  139: '하이드로펌프', 140: '흡혈', 141: '베어가르기', 142: '공중날기', 143: '누르기', 144: '눈보라',
  145: '번개', 146: '불대문자', 147: '용의분노', 148: '용의분노', 149: '역린', 150: '사이코브레이크', 151: '손가락흔들기',
};

/** 기본 재사용 시간 (기술에 cd 가 없을 때) */
const BASE_CD = {
  shot: 0.55, rapid: 0.28, fireball: 1.1, beam: 1.05, orbit: 0, chain: 1.15, spread: 1.0, melee: 0.75, cloud: 1.6,
  quake: 1.5, boomerang: 1.2, homing: 0.9, meteor: 1.35, shadow: 1.3, breath: 1.5, bigbeam: 3, nova: 2, aura: 0.5,
  bubble: 1, sing: 2.4, leech: 1, pierce: 1, selfdestruct: 6, splash: 0.6, payday: 0.6, triattack: 1, lob: 1.4,
  heal: 3.5, metronome: 1, transform: 1, thunder: 1.9, whip: 0.9, wave: 2, razor: 0.9,
};

/** 포켓몬 → {name, ...기술} */
function skillOf(pokemon) {
  const name = SPECIES_MOVE[pokemon.id] || TYPE_MOVE[pokemon.typesKo[0]] || '몸통박치기';
  return { name, ...MOVES[name] };
}

/* ---------- 손가락흔들기·변신에서 고를 수 있는 기술 ---------- */
const RANDOM_MOVES = Object.keys(MOVES).filter(n => !['metronome', 'transform', 'orbit', 'aura', 'heal', 'splash'].includes(MOVES[n].p));

/* =========================================================
 * 공격 방식 구현: (게임, 파티원, 기술, 목표, 각도, 기본 피해) → 쐈으면 true
 * ========================================================= */
const CAST = {
  shot(g, mb, s, tgt, ang, base) {
    const n = (s.n || 1) + g.mods.extra;
    for (let i = 0; i < n; i++) {
      g.shot(mb, s, ang + (i - (n - 1) / 2) * 0.16, { mul: s.mul || 1, r: s.kind === 'needle' ? 4 : 6, kind: s.kind || 'bolt' });
    }
    SFX.play('shoot', 90);
    return true;
  },
  rapid(g, mb, s, tgt, ang) {
    const n = 1 + g.mods.extra;
    for (let i = 0; i < n; i++) {
      g.shot(mb, s, ang + rand(-0.15, 0.15), { mul: s.mul || 0.45, r: 4, speed: 600, kind: s.kind || 'bolt', pierce: s.pierce || 1, slow: s.slow });
    }
    SFX.play('shoot', 120);
    return true;
  },
  fireball(g, mb, s, tgt, ang) {
    for (let i = 0; i <= g.mods.extra; i++) {
      g.shot(mb, s, ang + (i - g.mods.extra / 2) * 0.25, { r: 9, speed: 380, kind: 'fire', explode: (s.explode || 58) * g.mods.area });
    }
    SFX.play('shoot', 90);
    return true;
  },
  homing(g, mb, s, tgt, ang) {
    for (let i = 0; i <= g.mods.extra; i++) {
      g.shot(mb, s, ang + rand(-0.8, 0.8), { mul: s.mul || 0.9, r: s.kind === 'moon' ? 11 : 8, speed: 300, kind: s.kind || 'orb', homing: 5, life: 2.2 });
    }
    return true;
  },
  shadow(g, mb, s, tgt, ang) {
    for (let i = 0; i <= g.mods.extra; i++) {
      g.shot(mb, s, ang + (i - g.mods.extra / 2) * 0.3, { mul: 1.2, r: 15 * Math.sqrt(g.mods.area), speed: 230, kind: 'shadow', pierce: 99, life: 2.4, tick: 0.35 });
    }
    return true;
  },
  spread(g, mb, s, tgt, ang) {
    const n = (s.n || 3) + g.mods.extra;
    const gap = s.kind === 'sand' || s.kind === 'string' ? 0.16 : 0.22;
    for (let i = 0; i < n; i++) {
      g.shot(mb, s, ang + (i - (n - 1) / 2) * gap, { mul: s.mul || 0.7, r: 6, speed: s.kind === 'sand' ? 420 : 480, kind: s.kind || 'ice', slow: s.slow, life: s.kind === 'sand' ? 0.6 : 1.3, crit: s.crit });
    }
    SFX.play('shoot', 90);
    return true;
  },
  boomerang(g, mb, s, tgt, ang) {
    for (let i = 0; i <= g.mods.extra; i++) {
      g.shot(mb, s, ang + (i - g.mods.extra / 2) * 0.5, { mul: s.mul || 0.8, r: (s.kind === 'bone' ? 14 : 18) * g.mods.area, speed: 420, kind: s.kind || 'gust', pierce: 99, life: 1.6, back: 0.75, tick: 0.3 });
    }
    return true;
  },
  pierce(g, mb, s, tgt, ang) {
    const n = (s.n || 1) + g.mods.extra;
    for (let i = 0; i < n; i++) {
      g.shot(mb, s, ang + (i - (n - 1) / 2) * 0.12, { mul: s.mul || 1.2, r: s.r || 9, speed: s.speed || 760, kind: 'lance', pierce: 6, life: 0.7, spin: s.spin });
    }
    SFX.play('dash', 250);
    return true;
  },
  beam(g, mb, s, tgt, ang, base) {
    g.fx.push({ kind: 'beam', x: mb.x, y: mb.y - 12, a: ang, len: (s.len || 330) * g.mods.area, w: (s.w || 16) * g.mods.area,
      dmg: base * (s.mul || 1.1), type: s.t, color: g.colorOf(s), life: 0.28, max: 0.28, hit: new Set(), mb, slow: s.slow });
    SFX.play('zap', 120);
    return true;
  },
  bigbeam(g, mb, s, tgt, ang, base) {
    // 0.5초 모았다가 굵은 광선 (하이드로펌프는 두 줄)
    const color = g.colorOf(s);
    g.fx.push({ kind: 'charge', x: mb.x, y: mb.y - 14, life: 0.5, max: 0.5, color, mb });
    SFX.play('tele', 300);
    setTimeout(() => {
      const t2 = g.nearest(mb, 600);
      const a = t2 ? Math.atan2(t2.y - mb.y, t2.x - mb.x) : ang;
      const fire = off => g.fx.push({ kind: 'beam', big: true, x: mb.x, y: mb.y - 14, a: a + off, len: 620, w: (s.w || 34) * g.mods.area,
        dmg: base * (s.mul || 4), type: s.t, color, life: 0.45, max: 0.45, hit: new Set(), mb });
      if (s.twin) { fire(-0.12); fire(0.12); } else fire(0);
      g.shake = Math.max(g.shake, 8);
      SFX.play('explode', 200);
    }, 500);
    return true;
  },
  chain(g, mb, s, tgt, ang, base, maxN) {
    const hit = new Set();
    let from = { x: mb.x, y: mb.y - 14 }, cur = tgt;
    const pts = [from];
    for (let i = 0; i < (maxN || 4) + g.mods.extra && cur; i++) {
      hit.add(cur);
      pts.push({ x: cur.x, y: cur.y - 10 });
      g.damage(cur, base * (i === 0 ? (s.mul || 1) : 0.75), s.t, { x: from.x, y: from.y });
      from = cur;
      cur = g.nearest(cur, 170 * g.mods.area, hit);
    }
    g.fx.push({ kind: 'lightning', pts, color: '#fff27a', life: 0.18, max: 0.18 });
    SFX.play('zap', 80);
    return true;
  },
  thunder(g, mb, s, tgt, ang, base) {
    const list = g.targetsList.filter(e => dist2(e, mb) < 450 * 450);
    for (let i = 0; i < (s.n || 3) + g.mods.extra && list.length; i++) {
      const e = i === 0 ? tgt : pickOne(list);
      g.fx.push({ kind: 'bolt', x: e.x, y: e.y, life: 0.35, max: 0.35 });
      g.explode(e.x, e.y, 40 * g.mods.area, base * (s.mul || 1.8), s.t, '#fff27a', true);
    }
    g.flash = Math.max(g.flash, 0.15);
    SFX.play('zap');
    return true;
  },
  melee(g, mb, s, tgt, ang, base) {
    g.fx.push({ kind: 'slash', x: mb.x, y: mb.y - 10, a: ang, r: (s.r || 90) * g.mods.area, dmg: base * (s.mul || 1.2), type: s.t,
      color: g.colorOf(s), life: 0.2, max: 0.2, hit: new Set(), knock: s.knock || 160, bite: s.bite, cross: s.cross, chainTo: s.chainTo });
    SFX.play('hit', 80);
    return true;
  },
  whip(g, mb, s, tgt, ang, base) {
    g.fx.push({ kind: 'whip', x: mb.x, y: mb.y - 12, a: ang, len: (s.len || 160) * g.mods.area, dmg: base * (s.mul || 1.1), type: s.t,
      color: g.colorOf(s), life: 0.25, max: 0.25, hit: new Set() });
    if (g.mods.extra) g.fx.push({ kind: 'whip', x: mb.x, y: mb.y - 12, a: ang + Math.PI, len: (s.len || 160) * g.mods.area, dmg: base * (s.mul || 1.1), type: s.t, color: g.colorOf(s), life: 0.25, max: 0.25, hit: new Set() });
    SFX.play('hit', 90);
    return true;
  },
  razor(g, mb, s, tgt, ang, base) {
    // 대상 주변을 여러 번 베기
    const n = (s.n || 3) + g.mods.extra;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const e = i === 0 ? tgt : g.nearest(mb, 260);
        if (!e) return;
        g.fx.push({ kind: 'cut', x: e.x, y: e.y - 14, a: rand(0, Math.PI), life: 0.18, max: 0.18, color: g.colorOf(s) });
        g.damage(e, base * (s.mul || 0.9), s.t, mb, 30);
      }, i * 90);
    }
    SFX.play('hit', 80);
    return true;
  },
  cloud(g, mb, s, tgt, ang, base) {
    for (let i = 0; i <= g.mods.extra; i++) {
      const e = i === 0 ? tgt : pickOne(g.targetsList);
      if (e) g.addCloud(e.x + rand(-20, 20), e.y + rand(-20, 20), 62 * g.mods.area, base * 0.35, s);
    }
    return true;
  },
  lob(g, mb, s, tgt, ang, base) {
    for (let i = 0; i <= g.mods.extra; i++) {
      const e = i === 0 ? tgt : pickOne(g.targetsList);
      if (!e) continue;
      g.fx.push({ kind: 'lob', x0: mb.x, y0: mb.y - 14, x1: e.x + rand(-10, 10), y1: e.y + rand(-10, 10), life: 0.6, max: 0.6,
        s, dmg: base * (s.mul || 1.2), color: g.colorOf(s) });
    }
    return true;
  },
  quake(g, mb, s, tgt, ang, base) {
    if (!g.nearest(mb, (s.R || 150) * g.mods.area)) return false;
    g.fx.push({ kind: 'quake', x: mb.x, y: mb.y, r: 0, R: (s.R || 150) * g.mods.area, dmg: base * (s.mul || 1.1), type: s.t,
      color: g.colorOf(s), life: 0.4, max: 0.4, hit: new Set(), knock: 120 });
    g.shake = Math.max(g.shake, 3);
    SFX.play('slam', 200);
    return true;
  },
  wave(g, mb, s, tgt, ang, base) {
    if (!g.nearest(mb, (s.R || 200) * g.mods.area)) return false;
    const rings = s.rings || 2;
    for (let i = 0; i < rings; i++) {
      setTimeout(() => g.fx.push({ kind: 'quake', ring: true, x: mb.x, y: mb.y, r: 0, R: (s.R || 200) * g.mods.area, dmg: base * (s.mul || 1.2) / rings * 1.5,
        type: s.t, color: g.colorOf(s), life: 0.5, max: 0.5, hit: new Set(), knock: 60 }), i * 150);
    }
    SFX.play('tele', 200);
    return true;
  },
  meteor(g, mb, s, tgt, ang, base) {
    for (let i = 0; i < (s.n || 1) + g.mods.extra; i++) {
      const e = i === 0 ? tgt : pickOne(g.targetsList);
      if (e) g.fx.push({ kind: 'meteor', x: e.x + rand(-15, 15), y: e.y + rand(-15, 15), r: 48 * g.mods.area, dmg: base * (s.mul || 1.7),
        type: s.t, color: g.colorOf(s), life: 0.55, max: 0.55, landed: false, look: s.kind || 'rock' });
    }
    return true;
  },
  breath(g, mb, s, tgt, ang, base) {
    g.fx.push({ kind: 'breath', x: mb.x, y: mb.y - 12, a: ang, len: (s.len || 210) * g.mods.area, spread: 0.55, dmg: base * (s.mul || 0.5),
      type: s.t, color: g.colorOf(s), life: 0.6, max: 0.6, tick: 0, every: 0.15, mb });
    SFX.play('dash', 300);
    return true;
  },
  nova(g, mb, s, tgt, ang, base) {
    const n = (s.n || 10) + g.mods.extra * 3;
    const off = Math.random();
    for (let i = 0; i < n; i++) {
      g.shot(mb, s, off + i * Math.PI * 2 / n, { mul: s.mul || 1, r: s.kind === 'fire' ? 9 : 6, speed: 360, kind: s.kind || 'spark', life: 0.9, pierce: 2 });
    }
    g.parts.push({ kind: 'ring', x: mb.x, y: mb.y - 14, r: 6, R: 90, life: 0.3, max: 0.3, color: g.colorOf(s), w: 6 });
    SFX.play('explode', 300);
    return true;
  },
  aura(g, mb, s, tgt, ang, base) {
    const R = (s.R || 150) * g.mods.area;
    let any = false;
    g.targetsList.forEach(e => {
      if (dist2(e, mb) < (R + e.r) ** 2) {
        any = true;
        g.damage(e, base * (s.mul || 0.4), s.t, null, 0, true);
        if (s.slow) e.slow = s.slow;
      }
    });
    for (let i = 0; i < 6; i++) {
      const a = rand(0, Math.PI * 2), r = rand(20, R);
      g.part('flake', mb.x + Math.cos(a) * r, mb.y + Math.sin(a) * r * 0.7, Math.cos(a + 1.6) * 80, Math.sin(a + 1.6) * 50, 0.6, rand(2, 4), '#e6fbff');
    }
    return any;
  },
  bubble(g, mb, s, tgt, ang) {
    const n = (s.n || 4) + g.mods.extra;
    for (let i = 0; i < n; i++) {
      g.shot(mb, s, ang + rand(-0.5, 0.5), { mul: s.mul || 0.6, r: rand(7, 12), speed: rand(150, 240), kind: s.kind === 'acid' ? 'acid' : 'bubble', life: 1.8, explode: 30 * g.mods.area, wobble: true });
    }
    return true;
  },
  sing(g, mb, s, tgt, ang, base) {
    // 주변 몬스터를 잠재우기(1.4초 멈춤) + 약한 피해
    const R = (s.R || 190) * g.mods.area;
    g.targetsList.forEach(e => {
      if (dist2(e, mb) < R * R) {
        g.damage(e, base * (s.mul || 0.4), s.t, null, 0, true);
        if (e.kind !== 'boss') e.sleep = 1.4;
      }
    });
    g.parts.push({ kind: 'ring', x: mb.x, y: mb.y - 10, r: 10, R, life: 0.6, max: 0.6, color: s.kind === 'hypno' ? '#ff8fd0' : '#ffd6f2', w: 4 });
    for (let i = 0; i < 10; i++) g.texts.push({ x: mb.x + rand(-R, R) * 0.6, y: mb.y + rand(-R, R) * 0.4, s: s.kind === 'hypno' ? '◎' : '♪', color: '#ffb3e6', size: 16, life: 0.9, max: 0.9 });
    SFX.play('pick', 600);
    return true;
  },
  leech(g, mb, s, tgt, ang) {
    for (let i = 0; i <= g.mods.extra; i++) {
      g.shot(mb, s, ang + rand(-0.6, 0.6), { mul: s.mul || 0.8, r: 7, speed: 320, kind: 'leech', homing: 5, life: 2, heal: s.heal || 1 });
    }
    return true;
  },
  selfdestruct(g, mb, s, tgt, ang, base) {
    // 대폭발: 자기 주변 큰 폭발 (쓰러지지는 않음)
    const R = (s.R || 220) * g.mods.area;
    if (!g.nearest(mb, R * 0.8)) return false;
    g.fx.push({ kind: 'charge', x: mb.x, y: mb.y - 14, life: 0.6, max: 0.6, color: '#ffffff', mb });
    setTimeout(() => {
      g.explode(mb.x, mb.y, R, base * (s.mul || 8), s.t, '#ffe680', true);
      g.burst(mb.x, mb.y, '#ffffff', 40, 420);
      g.burst(mb.x, mb.y, '#ff9f43', 40, 360);
      g.flash = Math.max(g.flash, 0.7);
      g.shake = Math.max(g.shake, 16);
    }, 600);
    return true;
  },
  splash(g, mb) {
    // 튀어오르기: 아무 일도 일어나지 않… 지 않고 아주 조금 아픔
    mb.hop = 0.45;
    if (Math.random() < 0.15) g.text(mb.x, mb.y - 60, '그러나 아무 일도 일어나지 않았다!', '#c9d1e0', 11);
    g.targetsList.forEach(e => { if (dist2(e, mb) < 50 * 50) g.damage(e, 1, '노말', mb, 100); });
    return true;
  },
  payday(g, mb, s, tgt, ang) {
    // 고양이돈받기: 맞히면 가끔 동전이 더 떨어짐
    const n = 2 + g.mods.extra;
    for (let i = 0; i < n; i++) g.shot(mb, s, ang + (i - (n - 1) / 2) * 0.2, { mul: 0.7, r: 6, speed: 520, kind: 'coin', gold: 0.35 });
    SFX.play('coin', 120);
    return true;
  },
  triattack(g, mb, s, tgt, ang) {
    // 트라이어택: 불꽃·얼음·전기 3갈래, 각각의 타입 상성
    ['불꽃', '얼음', '전기'].forEach((t, i) => {
      g.shot(mb, { ...s, t }, ang + (i - 1) * 0.2, { mul: 0.8, r: 7, speed: 480, kind: t === '불꽃' ? 'fire' : t === '얼음' ? 'ice' : 'spark', slow: t === '얼음' ? 1 : 0 });
    });
    SFX.play('shoot', 90);
    return true;
  },
  heal(g, mb, s, tgt, ang, base) {
    // 알낳기: 파티 체력 회복 + 알 하나 던지기
    g.heal(g.player.maxHp * (s.pct || 0.06));
    g.burst(g.player.x, g.player.y, '#ffd6e6', 16, 140, 'star');
    if (tgt) CAST.lob(g, mb, { ...MOVES['알폭탄'], name: '알폭탄' }, tgt, ang, base);
    SFX.play('heal', 800);
    return true;
  },
  metronome(g, mb, s, tgt, ang, base) {
    // 손가락흔들기: 매번 아무 기술이나
    const name = pickOne(RANDOM_MOVES), m = { name, ...MOVES[name] };
    g.text(mb.x, mb.y - 64, `손가락흔들기 → ${name}!`, typeColor(m.t), 12);
    mb.lastCd = m.cd || BASE_CD[m.p];
    return CAST[m.p](g, mb, m, tgt, ang, base);
  },
  transform(g, mb, s, tgt, ang, base) {
    // 변신: 리더(또는 다른 파티원)의 기술을 따라 함
    const other = g.members.find(o => o !== mb && o.skill.p !== 'transform');
    const m = other ? other.skill : { name: '몸통박치기', ...MOVES['몸통박치기'] };
    if (m.p === 'orbit' || m.p === 'aura') return CAST.homing(g, mb, { ...m }, tgt, ang, base);
    mb.lastCd = m.cd || BASE_CD[m.p];
    return CAST[m.p](g, mb, m, tgt, ang, base);
  },
};
