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

/* ---------- 손가락흔들기·변신에서 고를 수 있는 기술 ---------- */


/** 기술 레벨·각성·지닌 물건이 반영된 추가 발사 수 / 범위 배율 */
const xt = (g, mb) => g.mods.extra + (mb.extra || 0);
const ar = (g, mb) => g.mods.area * (mb.area || 1);

/* =========================================================
 * 공격 방식 구현: (게임, 파티원, 기술, 목표, 각도, 기본 피해) → 쐈으면 true
 * ========================================================= */
const CAST = {
  shot(g, mb, s, tgt, ang, base) {
    const n = (s.n || 1) + xt(g, mb);
    for (let i = 0; i < n; i++) {
      g.shot(mb, s, ang + (i - (n - 1) / 2) * 0.16, { mul: s.mul || 1, r: s.kind === 'needle' ? 4 : 6, kind: s.kind || 'bolt' });
    }
    SFX.play('shoot', 90);
    return true;
  },
  rapid(g, mb, s, tgt, ang) {
    const n = 1 + xt(g, mb);
    for (let i = 0; i < n; i++) {
      g.shot(mb, s, ang + rand(-0.15, 0.15), { mul: s.mul || 0.45, r: 4, speed: 600, kind: s.kind || 'bolt', pierce: s.pierce || 1, slow: s.slow });
    }
    SFX.play('shoot', 120);
    return true;
  },
  fireball(g, mb, s, tgt, ang) {
    for (let i = 0; i <= xt(g, mb); i++) {
      g.shot(mb, s, ang + (i - xt(g, mb) / 2) * 0.25, { r: 9, speed: 380, kind: 'fire', explode: (s.explode || 58) * ar(g, mb) });
    }
    SFX.play('shoot', 90);
    return true;
  },
  homing(g, mb, s, tgt, ang) {
    for (let i = 0; i <= xt(g, mb); i++) {
      g.shot(mb, s, ang + rand(-0.8, 0.8), { mul: s.mul || 0.9, r: s.kind === 'moon' ? 11 : 8, speed: 300, kind: s.kind || 'orb', homing: 5, life: 2.2 });
    }
    return true;
  },
  shadow(g, mb, s, tgt, ang) {
    for (let i = 0; i <= xt(g, mb); i++) {
      g.shot(mb, s, ang + (i - xt(g, mb) / 2) * 0.3, { mul: 1.2, r: 15 * Math.sqrt(ar(g, mb)), speed: 230, kind: 'shadow', pierce: 99, life: 2.4, tick: 0.35 });
    }
    return true;
  },
  spread(g, mb, s, tgt, ang) {
    const n = (s.n || 3) + xt(g, mb);
    const gap = s.kind === 'sand' || s.kind === 'string' ? 0.16 : 0.22;
    for (let i = 0; i < n; i++) {
      g.shot(mb, s, ang + (i - (n - 1) / 2) * gap, { mul: s.mul || 0.7, r: 6, speed: s.kind === 'sand' ? 420 : 480, kind: s.kind || 'ice', slow: s.slow, life: s.kind === 'sand' ? 0.6 : 1.3, crit: s.crit });
    }
    SFX.play('shoot', 90);
    return true;
  },
  boomerang(g, mb, s, tgt, ang) {
    for (let i = 0; i <= xt(g, mb); i++) {
      g.shot(mb, s, ang + (i - xt(g, mb) / 2) * 0.5, { mul: s.mul || 0.8, r: (s.kind === 'bone' ? 14 : 18) * ar(g, mb), speed: 420, kind: s.kind || 'gust', pierce: 99, life: 1.6, back: 0.75, tick: 0.3 });
    }
    return true;
  },
  pierce(g, mb, s, tgt, ang) {
    const n = (s.n || 1) + xt(g, mb);
    for (let i = 0; i < n; i++) {
      g.shot(mb, s, ang + (i - (n - 1) / 2) * 0.12, { mul: s.mul || 1.2, r: s.r || 9, speed: s.speed || 760, kind: 'lance', pierce: 6, life: 0.7, spin: s.spin });
    }
    SFX.play('dash', 250);
    return true;
  },
  beam(g, mb, s, tgt, ang, base) {
    g.fx.push({ kind: 'beam', x: mb.x, y: mb.y - 12, a: ang, len: (s.len || 330) * ar(g, mb), w: (s.w || 16) * ar(g, mb),
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
      const fire = off => g.fx.push({ kind: 'beam', big: true, x: mb.x, y: mb.y - 14, a: a + off, len: 620, w: (s.w || 34) * ar(g, mb),
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
    for (let i = 0; i < (maxN || 4) + xt(g, mb) && cur; i++) {
      hit.add(cur);
      pts.push({ x: cur.x, y: cur.y - 10 });
      g.damage(cur, base * (i === 0 ? (s.mul || 1) : 0.75), s.t, { x: from.x, y: from.y });
      from = cur;
      cur = g.nearest(cur, 170 * ar(g, mb), hit);
    }
    g.fx.push({ kind: 'lightning', pts, color: '#fff27a', life: 0.18, max: 0.18 });
    SFX.play('zap', 80);
    return true;
  },
  thunder(g, mb, s, tgt, ang, base) {
    const list = g.targetsList.filter(e => dist2(e, mb) < 450 * 450);
    for (let i = 0; i < (s.n || 3) + xt(g, mb) && list.length; i++) {
      const e = i === 0 ? tgt : pickOne(list);
      g.fx.push({ kind: 'bolt', x: e.x, y: e.y, life: 0.35, max: 0.35 });
      g.explode(e.x, e.y, 40 * ar(g, mb), base * (s.mul || 1.8), s.t, '#fff27a', true);
    }
    g.flash = Math.max(g.flash, 0.15);
    SFX.play('zap');
    return true;
  },
  melee(g, mb, s, tgt, ang, base) {
    g.fx.push({ kind: 'slash', x: mb.x, y: mb.y - 10, a: ang, r: (s.r || 90) * ar(g, mb), dmg: base * (s.mul || 1.2), type: s.t,
      color: g.colorOf(s), life: 0.2, max: 0.2, hit: new Set(), knock: s.knock || 160, bite: s.bite, cross: s.cross, chainTo: s.chainTo });
    SFX.play('hit', 80);
    return true;
  },
  whip(g, mb, s, tgt, ang, base) {
    g.fx.push({ kind: 'whip', x: mb.x, y: mb.y - 12, a: ang, len: (s.len || 160) * ar(g, mb), dmg: base * (s.mul || 1.1), type: s.t,
      color: g.colorOf(s), life: 0.25, max: 0.25, hit: new Set() });
    if (xt(g, mb)) g.fx.push({ kind: 'whip', x: mb.x, y: mb.y - 12, a: ang + Math.PI, len: (s.len || 160) * ar(g, mb), dmg: base * (s.mul || 1.1), type: s.t, color: g.colorOf(s), life: 0.25, max: 0.25, hit: new Set() });
    SFX.play('hit', 90);
    return true;
  },
  razor(g, mb, s, tgt, ang, base) {
    // 대상 주변을 여러 번 베기
    const n = (s.n || 3) + xt(g, mb);
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
    for (let i = 0; i <= xt(g, mb); i++) {
      const e = i === 0 ? tgt : pickOne(g.targetsList);
      if (e) g.addCloud(e.x + rand(-20, 20), e.y + rand(-20, 20), 62 * ar(g, mb), base * 0.35, s);
    }
    return true;
  },
  lob(g, mb, s, tgt, ang, base) {
    for (let i = 0; i <= xt(g, mb); i++) {
      const e = i === 0 ? tgt : pickOne(g.targetsList);
      if (!e) continue;
      g.fx.push({ kind: 'lob', x0: mb.x, y0: mb.y - 14, x1: e.x + rand(-10, 10), y1: e.y + rand(-10, 10), life: 0.6, max: 0.6,
        s, dmg: base * (s.mul || 1.2), color: g.colorOf(s) });
    }
    return true;
  },
  quake(g, mb, s, tgt, ang, base) {
    if (!g.nearest(mb, (s.R || 150) * ar(g, mb))) return false;
    g.fx.push({ kind: 'quake', x: mb.x, y: mb.y, r: 0, R: (s.R || 150) * ar(g, mb), dmg: base * (s.mul || 1.1), type: s.t,
      color: g.colorOf(s), life: 0.4, max: 0.4, hit: new Set(), knock: 120 });
    g.shake = Math.max(g.shake, 3);
    SFX.play('slam', 200);
    return true;
  },
  wave(g, mb, s, tgt, ang, base) {
    if (!g.nearest(mb, (s.R || 200) * ar(g, mb))) return false;
    const rings = s.rings || 2;
    for (let i = 0; i < rings; i++) {
      setTimeout(() => g.fx.push({ kind: 'quake', ring: true, x: mb.x, y: mb.y, r: 0, R: (s.R || 200) * ar(g, mb), dmg: base * (s.mul || 1.2) / rings * 1.5,
        type: s.t, color: g.colorOf(s), life: 0.5, max: 0.5, hit: new Set(), knock: 60 }), i * 150);
    }
    SFX.play('tele', 200);
    return true;
  },
  meteor(g, mb, s, tgt, ang, base) {
    for (let i = 0; i < (s.n || 1) + xt(g, mb); i++) {
      const e = i === 0 ? tgt : pickOne(g.targetsList);
      if (e) g.fx.push({ kind: 'meteor', x: e.x + rand(-15, 15), y: e.y + rand(-15, 15), r: 48 * ar(g, mb), dmg: base * (s.mul || 1.7),
        type: s.t, color: g.colorOf(s), life: 0.55, max: 0.55, landed: false, look: s.kind || 'rock' });
    }
    return true;
  },
  breath(g, mb, s, tgt, ang, base) {
    g.fx.push({ kind: 'breath', x: mb.x, y: mb.y - 12, a: ang, len: (s.len || 210) * ar(g, mb), spread: 0.55, dmg: base * (s.mul || 0.5),
      type: s.t, color: g.colorOf(s), life: 0.6, max: 0.6, tick: 0, every: 0.15, mb });
    SFX.play('dash', 300);
    return true;
  },
  nova(g, mb, s, tgt, ang, base) {
    const n = (s.n || 10) + xt(g, mb) * 3;
    const off = Math.random();
    for (let i = 0; i < n; i++) {
      g.shot(mb, s, off + i * Math.PI * 2 / n, { mul: s.mul || 1, r: s.kind === 'fire' ? 9 : 6, speed: 360, kind: s.kind || 'spark', life: 0.9, pierce: 2 });
    }
    g.parts.push({ kind: 'ring', x: mb.x, y: mb.y - 14, r: 6, R: 90, life: 0.3, max: 0.3, color: g.colorOf(s), w: 6 });
    SFX.play('explode', 300);
    return true;
  },
  aura(g, mb, s, tgt, ang, base) {
    const R = (s.R || 150) * ar(g, mb);
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
    const n = (s.n || 4) + xt(g, mb);
    for (let i = 0; i < n; i++) {
      g.shot(mb, s, ang + rand(-0.5, 0.5), { mul: s.mul || 0.6, r: rand(7, 12), speed: rand(150, 240), kind: s.kind === 'acid' ? 'acid' : 'bubble', life: 1.8, explode: 30 * ar(g, mb), wobble: true });
    }
    return true;
  },
  sing(g, mb, s, tgt, ang, base) {
    // 주변 몬스터를 잠재우기(1.4초 멈춤) + 약한 피해
    const R = (s.R || 190) * ar(g, mb);
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
    for (let i = 0; i <= xt(g, mb); i++) {
      g.shot(mb, s, ang + rand(-0.6, 0.6), { mul: s.mul || 0.8, r: 7, speed: 320, kind: 'leech', homing: 5, life: 2, heal: s.heal || 1 });
    }
    return true;
  },
  selfdestruct(g, mb, s, tgt, ang, base) {
    // 대폭발: 자기 주변 큰 폭발 (쓰러지지는 않음)
    const R = (s.R || 220) * ar(g, mb);
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
    const n = 2 + xt(g, mb);
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

/* =========================================================
 * 2~4세대까지: 대표 타입 × 성향(특수·물리·스피드·내구)별 기술 목록
 * ========================================================= */
Object.assign(MOVES, {
  // 불꽃
  '오버히트': { t: '불꽃', p: 'bigbeam', cd: 3.0, mul: 5, w: 34 },
  '불꽃펀치': { t: '불꽃', p: 'melee', cd: 0.75, mul: 1.3, r: 90 },
  '니트로차지': { t: '불꽃', p: 'pierce', cd: 0.9, mul: 1.3, speed: 820 },
  '도깨비불': { t: '불꽃', p: 'homing', cd: 0.8, kind: 'wisp', mul: 0.9, orbitN: 3, orbitKind: 'flame' },
  '분연': { t: '불꽃', p: 'missile', cd: 1.3, n: 3, mul: 1.0 },
  // 물
  '물의파동': { t: '물', p: 'nova', cd: 1.8, n: 12, kind: 'water', mul: 0.8 },
  '아쿠아테일': { t: '물', p: 'whip', cd: 0.9, mul: 1.3, len: 170 },
  '아쿠아제트': { t: '물', p: 'pierce', cd: 0.7, mul: 1.0, speed: 950 },
  '아쿠아링': { t: '물', p: 'orbit', n: 4, kind: 'bubble', mul: 0.5, R: 70, regen: 0.004 },
  // 풀
  '에너지볼': { t: '풀', p: 'homing', cd: 0.95, kind: 'energy', mul: 1.1 },
  '리프스톰': { t: '풀', p: 'nova', cd: 2.2, n: 16, kind: 'leaf', mul: 0.9 },
  '리프블레이드': { t: '풀', p: 'razor', cd: 0.85, n: 3, mul: 1.0, kind: 'leaf' },
  '씨폭탄': { t: '풀', p: 'lob', cd: 1.2, explode: 60, mul: 1.4, kind: 'seed' },
  '기가드레인': { t: '풀', p: 'leech', cd: 0.95, mul: 0.9, heal: 2 },
  // 전기
  '전격파': { t: '전기', p: 'missile', cd: 1.1, n: 3, mul: 0.9 },
  '와일드볼트': { t: '전기', p: 'pierce', cd: 1.0, mul: 1.6, r: 13 },
  // 얼음
  '얼음엄니': { t: '얼음', p: 'melee', cd: 0.8, mul: 1.3, r: 85, bite: true, slow: 1 },
  '고드름떨구기': { t: '얼음', p: 'meteor', cd: 1.3, n: 2, kind: 'ice', mul: 1.5 },
  '오로라빔': { t: '얼음', p: 'beam', cd: 1.1, slow: 1.2, w: 18 },
  // 격투
  '파동탄': { t: '격투', p: 'homing', cd: 0.9, kind: 'aura', mul: 1.2 },
  '크로스촙': { t: '격투', p: 'melee', cd: 0.8, mul: 1.5, r: 95, cross: true },
  '인파이트': { t: '격투', p: 'razor', cd: 0.75, n: 5, mul: 0.75, kind: 'fist' },
  '마하펀치': { t: '격투', p: 'rapid', cd: 0.25, kind: 'fist', mul: 0.5 },
  // 독
  '오물웨이브': { t: '독', p: 'wave', cd: 1.9, R: 200, mul: 1.1 },
  '독찌르기': { t: '독', p: 'pierce', cd: 0.9, mul: 1.3 },
  '크로스포이즌': { t: '독', p: 'melee', cd: 0.8, mul: 1.3, r: 90, cross: true },
  '독압정': { t: '독', p: 'mines', cd: 1.5, n: 3, mul: 1.6 },
  // 땅
  '대지의힘': { t: '땅', p: 'spikeline', cd: 1.4, mul: 1.3, len: 300 },
  '모래지옥': { t: '땅', p: 'aura', cd: 0.5, R: 130, mul: 0.45, slow: 0.8 },
  // 비행
  '에어슬래시': { t: '비행', p: 'spread', cd: 0.9, n: 3, kind: 'wind', mul: 0.85 },
  '폭풍': { t: '비행', p: 'boomerang', cd: 1.6, kind: 'gust', mul: 1.3 },
  '브레이브버드': { t: '비행', p: 'pierce', cd: 1.1, mul: 1.9, r: 14 },
  '제비반환': { t: '비행', p: 'homing', cd: 0.7, kind: 'feather', mul: 0.8 },
  // 에스퍼
  '사이코쇼크': { t: '에스퍼', p: 'missile', cd: 1.2, n: 3, mul: 1.0 },
  '사이코커터': { t: '에스퍼', p: 'razor', cd: 0.8, n: 3, mul: 0.95 },
  '사념의박치기': { t: '에스퍼', p: 'pierce', cd: 1.0, mul: 1.6, r: 13 },
  // 벌레
  '벌레의야단법석': { t: '벌레', p: 'nova', cd: 1.6, n: 14, kind: 'dust', mul: 0.6 },
  '시그널빔': { t: '벌레', p: 'beam', cd: 1.1 },
  '메가혼': { t: '벌레', p: 'pierce', cd: 1.2, mul: 2.0, r: 13 },
  // 바위
  '파워젬': { t: '바위', p: 'homing', cd: 0.9, kind: 'gem', mul: 1.1 },
  '스톤에지': { t: '바위', p: 'spikeline', cd: 1.3, mul: 1.5, len: 280 },
  '락블레스트': { t: '바위', p: 'rapid', cd: 0.3, kind: 'pebble', mul: 0.55 },
  '스텔스록': { t: '바위', p: 'mines', cd: 1.6, n: 3, mul: 1.5 },
  // 고스트
  '섀도크루': { t: '고스트', p: 'razor', cd: 0.8, n: 3, mul: 1.0, kind: 'claw' },
  '야습': { t: '고스트', p: 'pierce', cd: 0.8, mul: 1.2 },
  '괴상한빛': { t: '고스트', p: 'sing', cd: 2.4, R: 200, mul: 0.4, kind: 'hypno' },
  '원념의불꽃': { t: '고스트', p: 'homing', cd: 0.8, kind: 'wisp', mul: 0.9, orbitN: 3, orbitKind: 'ghostfire' },
  // 드래곤
  '용의파동': { t: '드래곤', p: 'beam', cd: 1.1, w: 20, mul: 1.3 },
  '용성군': { t: '드래곤', p: 'meteor', cd: 2.0, n: 5, kind: 'star', mul: 1.5 },
  '드래곤크루': { t: '드래곤', p: 'razor', cd: 0.8, n: 3, mul: 1.0, kind: 'claw' },
  '드래곤다이브': { t: '드래곤', p: 'meteor', cd: 1.3, n: 1, kind: 'dive', mul: 2.4 },
  // 악
  '악의파동': { t: '악', p: 'wave', cd: 1.7, R: 210, mul: 1.2 },
  '깨부수기': { t: '악', p: 'melee', cd: 1.0, mul: 2.0, r: 100, knock: 240 },
  '기습': { t: '악', p: 'pierce', cd: 0.75, mul: 1.1, speed: 1000 },
  '속여때리기': { t: '악', p: 'razor', cd: 0.75, n: 3, mul: 0.9, kind: 'claw' },
  // 강철
  '러스터캐논': { t: '강철', p: 'bigbeam', cd: 3.0, mul: 5, w: 32 },
  '아이언테일': { t: '강철', p: 'whip', cd: 1.0, mul: 1.5, len: 160 },
  '코멧펀치': { t: '강철', p: 'melee', cd: 0.85, mul: 1.6, r: 95, knock: 220 },
  '불릿펀치': { t: '강철', p: 'rapid', cd: 0.25, kind: 'fist', mul: 0.5 },
  '자이로볼': { t: '강철', p: 'orbit', n: 3, kind: 'gear', mul: 0.6, R: 76 },
  '미러샷': { t: '강철', p: 'missile', cd: 1.2, n: 3, mul: 1.0 },
  // 페어리
  '매지컬샤인': { t: '페어리', p: 'nova', cd: 1.7, n: 14, kind: 'sparkle', mul: 0.75 },
  '치근거리기': { t: '페어리', p: 'melee', cd: 0.75, mul: 1.3, r: 85 },
  '요정의바람': { t: '페어리', p: 'spread', cd: 0.9, n: 4, kind: 'sparkle', mul: 0.7 },
  '천사의키스': { t: '페어리', p: 'sing', cd: 2.4, R: 200, mul: 0.4 },
  // 노말
  '하이퍼보이스': { t: '노말', p: 'wave', cd: 1.7, R: 200, mul: 1.1, rings: 2 },
  '기가임팩트': { t: '노말', p: 'melee', cd: 1.2, mul: 2.4, r: 110, knock: 300 },
  '스피드스타': { t: '노말', p: 'homing', cd: 0.75, kind: 'starshot', mul: 0.8 },
});

/** 대표 타입별 기술: special(특수가 강함) / physical(공격이 강함) / fast(빠름) / tank(튼튼함) */
const ARSENAL = {
  '불꽃': { special: ['화염방사', '불대문자', '오버히트'], physical: ['불꽃펀치', '니트로차지'], fast: ['불꽃세례', '분연'], tank: ['화염자동차', '도깨비불'] },
  '물': { special: ['하이드로펌프', '물대포', '물의파동'], physical: ['아쿠아테일', '크랩해머'], fast: ['아쿠아제트', '거품광선'], tank: ['아쿠아링', '파도타기'] },
  '풀': { special: ['솔라빔', '에너지볼', '리프스톰'], physical: ['리프블레이드', '씨폭탄'], fast: ['잎날가르기', '기가드레인'], tank: ['꽃잎댄스', '덩굴채찍'] },
  '전기': { special: ['10만볼트', '번개', '전격파'], physical: ['번개펀치', '와일드볼트'], fast: ['전기쇼크', '전격 바늘'], tank: ['방전', '10만볼트'] },
  '얼음': { special: ['냉동빔', '눈보라'], physical: ['얼음엄니', '고드름떨구기'], fast: ['고드름침', '얼음뭉치'], tank: ['눈보라', '오로라빔'] },
  '격투': { special: ['파동탄'], physical: ['크로스촙', '메가톤펀치', '인파이트'], fast: ['마하펀치', '연속펀치'], tank: ['지옥의바퀴', '크로스촙'] },
  '독': { special: ['오물폭탄', '오물웨이브'], physical: ['독찌르기', '크로스포이즌'], fast: ['독침', '독찌르기'], tank: ['독가스', '독압정'] },
  '땅': { special: ['대지의힘'], physical: ['지진', '뼈다귀부메랑'], fast: ['모래뿌리기', '구멍파기'], tank: ['모래지옥', '지진'] },
  '비행': { special: ['에어슬래시', '폭풍'], physical: ['브레이브버드', '공중날기'], fast: ['쪼기', '제비반환'], tank: ['바람일으키기', '날개치기'] },
  '에스퍼': { special: ['사이코키네시스', '사이코쇼크'], physical: ['사이코커터', '사념의박치기'], fast: ['염동력'], tank: ['리플렉터', '최면술'] },
  '벌레': { special: ['벌레의야단법석', '시그널빔'], physical: ['시저크로스', '메가혼'], fast: ['바늘미사일', '더블니들'], tank: ['실뿜기', '흡혈'] },
  '바위': { special: ['파워젬'], physical: ['스톤에지', '스톤샤워'], fast: ['락블레스트'], tank: ['스텔스록', '돌떨구기'] },
  '고스트': { special: ['섀도볼', '나이트헤드'], physical: ['섀도크루', '혀로핥기'], fast: ['야습'], tank: ['원념의불꽃', '괴상한빛'] },
  '드래곤': { special: ['용의파동', '용성군'], physical: ['역린', '드래곤크루'], fast: ['드래곤다이브'], tank: ['용의분노'] },
  '악': { special: ['악의파동'], physical: ['깨물기', '깨부수기'], fast: ['기습', '속여때리기'], tank: ['악의파동'] },
  '강철': { special: ['러스터캐논', '미러샷'], physical: ['아이언테일', '코멧펀치'], fast: ['불릿펀치'], tank: ['자이로볼'] },
  '페어리': { special: ['문포스', '매지컬샤인'], physical: ['치근거리기'], fast: ['요정의바람'], tank: ['천사의키스', '문포스'] },
  '노말': { special: ['파괴광선', '하이퍼보이스'], physical: ['누르기', '기가임팩트'], fast: ['전광석화', '스피드스타'], tank: ['스피드스타', '몸통박치기'] },
};

/* ---------- 전설·환상: 전혀 다른 궁극기 (화면 전체급 연출) ---------- */
Object.assign(MOVES, {
  '절대영도': { p: 'pillars', cd: 3.6, mul: 2.4 },
  '뇌명': { p: 'starfall', cd: 3.4, n: 12, mul: 1.6, look: 'bolt' },
  '성스러운불꽃': { p: 'pillars', cd: 3.4, mul: 2.6 },
  '사이코브레이크': { p: 'psystrike', cd: 3.2, n: 5, mul: 2.2 },
  '원시의 손가락흔들기': { p: 'legendrandom', cd: 3.0 },
  '분화': { p: 'pillars', cd: 3.4, mul: 2.6 },
  '오로라 소용돌이': { p: 'sweep', cd: 3.8, mul: 0.9 },
  '에어로블라스트': { p: 'sweep', cd: 3.6, mul: 1.0 },
  '시간 여행': { p: 'starfall', cd: 3.4, n: 12, mul: 1.5, look: 'leaf' },
  '대지의 분노': { p: 'pillars', cd: 3.6, mul: 2.6 },
  '러스터 레이': { p: 'sweep', cd: 3.8, mul: 0.95 },
  '미스트볼': { p: 'psystrike', cd: 3.2, n: 4, mul: 2.2 },
  '라스트퍼지': { p: 'psystrike', cd: 3.2, n: 6, mul: 2.0 },
  '근원의파동': { p: 'sweep', cd: 3.6, mul: 1.1, twin: true },
  '단애의칼': { p: 'pillars', cd: 3.4, mul: 2.8 },
  '용성군 폭풍': { p: 'starfall', cd: 3.2, n: 16, mul: 1.7 },
  '파멸의소원': { p: 'starfall', cd: 3.6, n: 14, mul: 1.6, look: 'star' },
  '사이코부스트': { p: 'psystrike', cd: 2.8, n: 6, mul: 2.0 },
  '정신의 고리': { p: 'psystrike', cd: 3.2, n: 4, mul: 2.2 },
  '시간의포효': { p: 'timestop', cd: 6.5, mul: 4.5 },
  '아공절단': { p: 'rend', cd: 3.4, n: 3, mul: 3.0 },
  '마그마스톰': { p: 'blackhole', cd: 4.2, mul: 0.7 },
  '거인의 압박': { p: 'pillars', cd: 3.8, mul: 3.0 },
  '섀도다이브': { p: 'blackhole', cd: 4.0, mul: 0.75 },
  '초승달춤': { p: 'sweep', cd: 3.8, mul: 0.95 },
  '하트스웹': { p: 'starfall', cd: 3.6, n: 12, mul: 1.4, look: 'heart' },
  '다크홀': { p: 'blackhole', cd: 4.0, mul: 0.8 },
  '시드플레어': { p: 'pillars', cd: 3.4, mul: 2.6 },
  '심판의뭉치': { p: 'starfall', cd: 3.0, n: 18, mul: 1.6, look: 'rainbow' },
});
const LEGEND_MOVE = {
  144: '절대영도', 145: '뇌명', 146: '성스러운불꽃', 150: '사이코브레이크', 151: '원시의 손가락흔들기',
  243: '뇌명', 244: '분화', 245: '오로라 소용돌이', 249: '에어로블라스트', 250: '성스러운불꽃', 251: '시간 여행',
  377: '대지의 분노', 378: '절대영도', 379: '러스터 레이', 380: '미스트볼', 381: '라스트퍼지',
  382: '근원의파동', 383: '단애의칼', 384: '용성군 폭풍', 385: '파멸의소원', 386: '사이코부스트',
  480: '정신의 고리', 481: '정신의 고리', 482: '정신의 고리', 483: '시간의포효', 484: '아공절단', 485: '마그마스톰',
  486: '거인의 압박', 487: '섀도다이브', 488: '초승달춤', 489: '하트스웹', 490: '하트스웹', 491: '다크홀',
  492: '시드플레어', 493: '심판의뭉치',
};
Object.assign(BASE_CD, { missile: 1.2, mines: 1.5, spikeline: 1.3, sweep: 3.6, blackhole: 4, starfall: 3.4, pillars: 3.4, rend: 3.4, timestop: 6.5, psystrike: 3.2, legendrandom: 3 });

/** 성향: 종족값으로 판단 (fast 스피드형 / tank 내구형 / special 특수형 / physical 물리형) */
function roleOf(pokemon) {
  const st = pokemon.stats || { hp: 50, attack: 55, defense: 50, spAttack: 55, spDefense: 50, speed: 50 };
  const atk = Math.max(st.attack, st.spAttack), bulk = st.hp + st.defense + st.spDefense;
  return st.speed >= 95 && atk < 105 ? 'fast'
    : bulk >= 260 && atk < 95 ? 'tank'
      : st.spAttack > st.attack ? 'special' : 'physical';
}
const ROLE_NAME = { fast: '💨 스피드형', tank: '🛡 내구형', special: '✦ 특수형', physical: '⚔ 물리형' };

/** 포켓몬 공격 기술 고르기 — 공격 속성은 항상 대표 타입(mainType) */
function skillOf(pokemon) {
  const main = mainType(pokemon);
  // 1) 전설·환상: 궁극기
  if (pokemon.legendary && LEGEND_MOVE[pokemon.id]) {
    const name = LEGEND_MOVE[pokemon.id];
    return { name, ...MOVES[name], t: main, legend: true };
  }
  // 2) 1세대 고유 기술 (기술 타입이 대표 타입과 같을 때, 또는 상징적인 장난 기술)
  const sig = SPECIES_MOVE[pokemon.id];
  const FUN = ['튀어오르기', '변신', '손가락흔들기', '고양이돈받기', '알낳기', '노래하기', '대폭발'];
  if (sig && (MOVES[sig].t === main || FUN.includes(sig))) {
    return { name: sig, ...MOVES[sig], t: FUN.includes(sig) && MOVES[sig].t !== main ? main : MOVES[sig].t };
  }
  // 3) 대표 타입 × 성향
  const role = roleOf(pokemon);
  const list = (ARSENAL[main] || ARSENAL['노말'])[role];
  const name = list[pokemon.id % list.length];
  return { name, ...MOVES[name], t: main };
}

const RANDOM_MOVES = Object.keys(MOVES).filter(n => MOVES[n].t && !['metronome', 'transform', 'orbit', 'aura', 'heal', 'splash'].includes(MOVES[n].p));
const LEGEND_RANDOM = Object.keys(MOVES).filter(n => !MOVES[n].t && MOVES[n].p !== 'legendrandom');

/* =========================================================
 * 추가 공격 방식
 * ========================================================= */
Object.assign(CAST, {
  /** 유도 미사일: 연기 꼬리를 남기며 날아가 작은 폭발 */
  missile(g, mb, s, tgt, ang) {
    const n = (s.n || 3) + xt(g, mb);
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const a = ang + Math.PI + (i - (n - 1) / 2) * 0.5;   // 뒤로 쏘아 올렸다가 꺾여 들어감
        g.shot(mb, s, a, { mul: s.mul || 1, r: 6, speed: 340, kind: 'missile', homing: 7, life: 2.4, explode: 42 * ar(g, mb), accel: 520 });
        SFX.play('shoot', 60);
      }, i * 70);
    }
    return true;
  },
  /** 함정: 주변에 설치, 적이 밟으면 폭발 */
  mines(g, mb, s, tgt, ang, base) {
    const n = (s.n || 3) + xt(g, mb);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = rand(60, 200);
      g.fx.push({ kind: 'mine', x: mb.x + Math.cos(a) * r, y: mb.y + Math.sin(a) * r, life: 8, max: 8, arm: 0.4,
        r: 46 * ar(g, mb), dmg: base * (s.mul || 1.5), type: s.t, color: g.colorOf(s) });
    }
    return true;
  },
  /** 대지의힘·스톤에지: 목표 방향으로 가시가 차례로 솟음 */
  spikeline(g, mb, s, tgt, ang, base) {
    const lines = 1 + xt(g, mb);
    for (let l = 0; l < lines; l++) {
      const a = ang + (l - (lines - 1) / 2) * 0.35;
      const steps = Math.round((s.len || 280) * ar(g, mb) / 34);
      for (let i = 1; i <= steps; i++) {
        setTimeout(() => {
          const x = mb.x + Math.cos(a) * i * 34, y = mb.y + Math.sin(a) * i * 34;
          g.fx.push({ kind: 'spike', x, y, life: 0.35, max: 0.35, color: g.colorOf(s) });
          for (const e of g.targetsList) if (e.hp > 0 && dist2(e, { x, y }) < (26 + e.r) ** 2) g.damage(e, base * (s.mul || 1.4) / 2, s.t, { x, y }, 60, i > 1);
        }, i * 40);
      }
    }
    SFX.play('slam', 200);
    return true;
  },

  /* ----- 전설 궁극기 ----- */
  /** 360° 회전 광선 */
  sweep(g, mb, s, tgt, ang, base) {
    g.fx.push({ kind: 'charge', x: mb.x, y: mb.y - 14, life: 0.6, max: 0.6, color: g.colorOf(s), mb });
    SFX.play('tele');
    setTimeout(() => {
      const beams = s.twin ? 2 : 1;
      for (let b = 0; b < beams; b++) {
        g.fx.push({ kind: 'sweep', mb, a: ang + b * Math.PI, len: 560 * ar(g, mb), w: 40, life: 1.6, max: 1.6, dmg: base * (s.mul || 1),
          type: s.t, color: g.colorOf(s), tick: 0, every: 0.12 });
      }
      g.shake = Math.max(g.shake, 10);
      g.flash = Math.max(g.flash, 0.25);
      SFX.play('explode');
    }, 600);
    return true;
  },
  /** 블랙홀: 적을 빨아들이며 갈아버리고 마지막에 폭발 */
  blackhole(g, mb, s, tgt, ang, base) {
    if (!tgt) return false;
    g.fx.push({ kind: 'blackhole', x: tgt.x, y: tgt.y, r: 260 * ar(g, mb), life: 2.6, max: 2.6, dmg: base * (s.mul || 0.8),
      type: s.t, color: g.colorOf(s), tick: 0, every: 0.2 });
    SFX.play('roar', 400);
    return true;
  },
  /** 유성우: 화면 곳곳에 하늘에서 쏟아짐 */
  starfall(g, mb, s, tgt, ang, base) {
    const n = (s.n || 12) + xt(g, mb) * 3;
    const pool = g.targetsList.filter(e => dist2(e, mb) < 650 * 650);
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const e = pool.length ? pickOne(pool) : null;
        const x = e ? e.x + rand(-30, 30) : mb.x + rand(-450, 450), y = e ? e.y + rand(-30, 30) : mb.y + rand(-300, 300);
        g.fx.push({ kind: 'meteor', x, y, r: 60 * ar(g, mb), dmg: base * (s.mul || 1.5), type: s.t, color: g.colorOf(s),
          life: 0.6, max: 0.6, landed: false, look: s.look || 'star', legend: true });
      }, i * 90);
    }
    g.flash = Math.max(g.flash, 0.2);
    return true;
  },
  /** 기둥: 리더 주위로 두 겹의 기둥이 솟구침 */
  pillars(g, mb, s, tgt, ang, base) {
    [120, 230, 340].forEach((R, ring) => {
      setTimeout(() => {
        const n = 8 + ring * 4;
        for (let i = 0; i < n; i++) {
          const a = i * Math.PI * 2 / n + ring * 0.3;
          const x = mb.x + Math.cos(a) * R * ar(g, mb), y = mb.y + Math.sin(a) * R * 0.75 * ar(g, mb);
          g.fx.push({ kind: 'pillar', x, y, life: 0.7, max: 0.7, color: g.colorOf(s) });
          for (const e of g.targetsList) if (e.hp > 0 && dist2(e, { x, y }) < (48 + e.r) ** 2) g.damage(e, base * (s.mul || 2.4) / 2, s.t, { x, y }, 120, true);
        }
        g.shake = Math.max(g.shake, 9);
        SFX.play('slam');
      }, ring * 220);
    });
    return true;
  },
  /** 아공절단: 화면을 가로지르는 거대한 베기 */
  rend(g, mb, s, tgt, ang, base) {
    const n = (s.n || 3) + xt(g, mb);
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const e = g.nearest(mb, 600) || { x: mb.x + rand(-200, 200), y: mb.y + rand(-200, 200) };
        const a = rand(0, Math.PI);
        g.fx.push({ kind: 'rend', x: e.x, y: e.y, a, len: 1100, life: 0.5, max: 0.5, color: g.colorOf(s), hitDone: false, dmg: base * (s.mul || 3), type: s.t });
        SFX.play('dash');
      }, i * 160);
    }
    return true;
  },
  /** 시간의포효: 모든 것이 멈춘 뒤 한꺼번에 피해 */
  timestop(g, mb, s, tgt, ang, base) {
    g.timeStop = 1.6;
    g.fx.push({ kind: 'timestop', x: mb.x, y: mb.y, life: 1.6, max: 1.6, color: g.colorOf(s) });
    g.targetsList.forEach(e => { if (e.kind !== 'boss') e.sleep = 1.8; });
    SFX.play('tele');
    setTimeout(() => {
      g.targetsList.forEach(e => { if (dist2(e, g.player) < 700 * 700) g.damage(e, base * (s.mul || 4), s.t, g.player, 160); });
      g.flash = 0.9;
      g.shake = 20;
      SFX.play('explode');
      SFX.play('roar');
    }, 1600);
    return true;
  },
  /** 사이코브레이크: 거대한 염동 창 여러 개가 꿰뚫고, 충격파 */
  psystrike(g, mb, s, tgt, ang, base) {
    const n = (s.n || 5) + xt(g, mb);
    for (let i = 0; i < n; i++) {
      const a = ang + (i - (n - 1) / 2) * 0.3;
      g.shot(mb, s, a, { mul: s.mul || 2, r: 18, speed: 520, kind: 'spear', pierce: 99, life: 1.4, homing: 1.5, tick: 0.25 });
    }
    g.parts.push({ kind: 'ring', x: mb.x, y: mb.y - 14, r: 10, R: 220, life: 0.5, max: 0.5, color: g.colorOf(s), w: 10 });
    g.shake = Math.max(g.shake, 8);
    SFX.play('zap');
    return true;
  },
  /** 뮤: 아무 궁극기 */
  legendrandom(g, mb, s, tgt, ang, base) {
    const name = pickOne(LEGEND_RANDOM), m = { name, ...MOVES[name], t: s.t };
    g.text(mb.x, mb.y - 70, `✦ ${name}!`, '#ffd6f2', 14);
    mb.lastCd = m.cd;
    return CAST[m.p](g, mb, m, tgt, ang, base);
  },
});
