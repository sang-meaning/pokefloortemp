/* 던전 그리기 보조: 색칠해 둔 스프라이트(필터 대신), 그림자, 기술별 투사체·효과 모양 */

/* ---------- 색칠 캐시: ctx.filter 는 매우 느려서 프레임마다 미리 칠한 그림을 만들어 둠 ---------- */
const TINTS = {
  white: 'rgba(255,255,255,0.85)',     // 맞았을 때 번쩍
  ice: 'rgba(120,200,255,0.45)',       // 둔화
  rage: 'rgba(255,40,70,0.28)',        // 보스 분노
};
const tintCache = new WeakMap();

function tinted(frame, tint) {
  let m = tintCache.get(frame);
  if (!m) { m = {}; tintCache.set(frame, m); }
  if (!m[tint]) {
    const c = document.createElement('canvas');
    c.width = frame.width; c.height = frame.height;
    const x = c.getContext('2d');
    x.drawImage(frame, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = TINTS[tint];
    x.fillRect(0, 0, c.width, c.height);
    m[tint] = c;
  }
  return m[tint];
}

/** 동그란 그림자 한 장 (매번 경로를 그리지 않고 복사) */
const SHADOW = (() => {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 24;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,.28)';
  x.beginPath(); x.ellipse(32, 12, 32, 12, 0, 0, 7); x.fill();
  return c;
})();

function glowDot(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }

/* ---------- 궤도 (꽃잎댄스, 화염자동차, 휘감기, 고속스핀, 리플렉터, 강철 톱니) ---------- */
function drawOrbs(c, mb, t) {
  const kind = mb.skill.kind || (mb.type === '강철' ? 'gear' : 'leaf');
  c.save();
  c.globalCompositeOperation = 'lighter';
  mb.orbs.forEach((o, i) => {
    c.save();
    c.translate(o.x, o.y);
    if (kind === 'flame') {
      glowDot(c, 0, 0, 16, 'rgba(255,120,30,.35)');
      glowDot(c, 0, 0, 8, '#ffb238');
      glowDot(c, 0, -2, 4, '#fff3c0');
    } else if (kind === 'petal') {
      c.rotate(t * 6 + i);
      c.fillStyle = '#ff9fd6'; c.beginPath(); c.ellipse(0, 0, 9, 4, 0, 0, 7); c.fill();
      c.fillStyle = '#ffe3f4'; c.fillRect(-4, -1, 8, 2);
    } else if (kind === 'tentacle') {
      c.strokeStyle = '#6fc3ff'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-Math.cos(o.a) * 30, -Math.sin(o.a) * 24); c.quadraticCurveTo(Math.sin(t * 8) * 8, 0, 0, 0); c.stroke();
      glowDot(c, 0, 0, 6, '#c8ecff');
    } else if (kind === 'star') {
      c.rotate(t * 10);
      c.fillStyle = '#ffd84a';
      for (let k = 0; k < 5; k++) { c.rotate(Math.PI * 2 / 5); c.fillRect(-2, -10, 4, 10); }
      glowDot(c, 0, 0, 4, '#ff6bd5');
    } else if (kind === 'wall') {
      c.rotate(o.a);
      c.fillStyle = 'rgba(255,140,220,.35)'; c.fillRect(-3, -14, 6, 28);
      c.strokeStyle = '#ffd6f2'; c.lineWidth = 2; c.strokeRect(-3, -14, 6, 28);
    } else if (kind === 'gear') {
      c.rotate(t * 8);
      c.fillStyle = '#c8d4e0';
      for (let k = 0; k < 6; k++) { c.rotate(Math.PI / 3); c.fillRect(-2, -11, 4, 6); }
      c.beginPath(); c.arc(0, 0, 7, 0, 7); c.fill();
    } else {
      glowDot(c, 0, 0, 14, 'rgba(120,255,120,.3)');
      c.rotate(t * 10);
      c.fillStyle = '#5fd35f'; c.beginPath(); c.ellipse(0, 0, 10, 4, 0, 0, 7); c.fill();
      c.fillStyle = '#c9ffb0'; c.fillRect(-6, -1, 12, 2);
    }
    c.restore();
  });
  c.restore();
}

/* ---------- 투사체 ---------- */
function drawShot(c, s, t) {
  const ang = Math.atan2(s.vy, s.vx);
  switch (s.kind) {
    case 'fire':
      glowDot(c, s.x, s.y, s.r * 2.4, 'rgba(255,120,30,.35)'); glowDot(c, s.x, s.y, s.r, '#ffb238'); glowDot(c, s.x, s.y, s.r * 0.5, '#fff3c0');
      return;
    case 'shadow':
      glowDot(c, s.x, s.y, s.r * 1.8, 'rgba(110,60,180,.4)'); glowDot(c, s.x, s.y, s.r, '#4a2a7a'); glowDot(c, s.x, s.y, s.r * 0.45, '#c9a6ff');
      return;
    case 'night':
      glowDot(c, s.x, s.y, s.r * 2, 'rgba(70,20,90,.5)'); glowDot(c, s.x, s.y, s.r, '#1d0f2e');
      c.fillStyle = '#ff4466'; c.fillRect(s.x - 4, s.y - 2, 3, 3); c.fillRect(s.x + 1, s.y - 2, 3, 3);
      return;
    case 'moon':
      glowDot(c, s.x, s.y, s.r * 2.2, 'rgba(255,150,230,.35)'); glowDot(c, s.x, s.y, s.r, '#ffd6f2'); glowDot(c, s.x + 3, s.y - 3, s.r * 0.7, 'rgba(255,120,210,.9)');
      return;
    case 'orb':
      glowDot(c, s.x, s.y, s.r * 2.2, hexA(s.color, 0.35)); glowDot(c, s.x, s.y, s.r, s.color); glowDot(c, s.x, s.y, s.r * 0.4, '#ffffff');
      return;
    case 'leech':
      glowDot(c, s.x, s.y, s.r * 2, 'rgba(120,255,140,.3)'); glowDot(c, s.x, s.y, s.r, '#8dff9f');
      c.fillStyle = '#ff5a7a'; c.fillRect(s.x - 2, s.y - 2, 4, 4);
      return;
    case 'bubble':
    case 'acid': {
      const col = s.kind === 'acid' ? 'rgba(190,90,255,' : 'rgba(110,190,255,';
      c.strokeStyle = `${col}.9)`; c.lineWidth = 2;
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, 7); c.stroke();
      glowDot(c, s.x, s.y, s.r, `${col}.2)`);
      glowDot(c, s.x - s.r * 0.35, s.y - s.r * 0.35, s.r * 0.25, '#ffffff');
      return;
    }
    case 'coin':
      c.fillStyle = '#ffd84a'; c.fillRect(s.x - 5, s.y - 5, 10, 10);
      c.fillStyle = '#fff6b0'; c.fillRect(s.x - 2, s.y - 3, 2, 5);
      return;
    case 'gust':
    case 'bone': {
      c.save(); c.translate(s.x, s.y); c.rotate((t - s.t0) * 14);
      if (s.kind === 'bone') {
        c.fillStyle = '#f2ead8'; c.fillRect(-12, -2.5, 24, 5);
        glowDot(c, -12, -3, 3.5, '#f2ead8'); glowDot(c, -12, 3, 3.5, '#f2ead8'); glowDot(c, 12, -3, 3.5, '#f2ead8'); glowDot(c, 12, 3, 3.5, '#f2ead8');
      } else {
        c.strokeStyle = 'rgba(200,235,255,.8)'; c.lineWidth = 3;
        for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(0, 0, s.r * (0.4 + k * 0.25), k, k + 3.5); c.stroke(); }
      }
      c.restore();
      return;
    }
    default:
      break;
  }
  c.save();
  c.translate(s.x, s.y);
  c.rotate(s.spin ? (t - s.t0) * 20 : ang);
  switch (s.kind) {
    case 'ice': case 'icicle':
      c.fillStyle = 'rgba(150,230,255,.4)'; c.fillRect(-12, -5, 22, 10);
      c.fillStyle = '#dff8ff'; c.beginPath(); c.moveTo(11, 0); c.lineTo(-8, -4); c.lineTo(-8, 4); c.fill();
      break;
    case 'leaf':
      c.rotate((t - s.t0) * 18);
      c.fillStyle = '#6fe06f'; c.beginPath(); c.ellipse(0, 0, 10, 4, 0, 0, 7); c.fill();
      c.fillStyle = '#d6ffc4'; c.fillRect(-7, -0.5, 14, 1);
      break;
    case 'needle': case 'peck':
      c.fillStyle = hexA(s.color, 0.5); c.fillRect(-14, -2, 18, 4);
      c.fillStyle = '#ffffff'; c.fillRect(-6, -1, 12, 2);
      break;
    case 'string':
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-16, Math.sin(t * 20) * 2); c.lineTo(6, 0); c.stroke();
      break;
    case 'sand':
      c.fillStyle = 'rgba(230,200,130,.8)';
      for (let k = 0; k < 4; k++) c.fillRect(-k * 5, (k % 2 ? 2 : -2), 3, 3);
      break;
    case 'spark':
      c.strokeStyle = '#fff27a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-10, 0); c.lineTo(-4, -4); c.lineTo(2, 3); c.lineTo(8, 0); c.stroke();
      break;
    case 'dust':
      glowDot(c, 0, 0, 7, 'rgba(220,230,255,.35)'); glowDot(c, 0, 0, 3, '#ffffff');
      break;
    case 'lance':
      c.fillStyle = hexA(s.color, 0.35); c.fillRect(-34, -s.r, 40, s.r * 2);
      c.fillStyle = s.color; c.beginPath(); c.moveTo(12, 0); c.lineTo(-10, -s.r * 0.7); c.lineTo(-10, s.r * 0.7); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(-6, -1.5, 14, 3);
      break;
    default:
      c.fillStyle = hexA(s.color, 0.4); c.fillRect(-14, -s.r, 18, s.r * 2);
      c.fillStyle = s.color; c.fillRect(-6, -s.r * 0.7, 12, s.r * 1.4);
      c.fillStyle = '#ffffff'; c.fillRect(0, -1.5, 5, 3);
  }
  c.restore();
}

/* ---------- 빔·베기·번개 같은 효과 ---------- */
function drawFx(c, f, t) {
  const k = Math.max(0, f.life / f.max);
  if (f.kind === 'beam') {
    c.save(); c.translate(f.x, f.y); c.rotate(f.a);
    const col = f.color || '#3c96ff';
    c.fillStyle = hexA(col, 0.35 * k); c.fillRect(0, -f.w, f.len, f.w * 2);
    c.fillStyle = hexA(col, 0.9 * k); c.fillRect(0, -f.w / 2, f.len, f.w);
    c.fillStyle = `rgba(255,255,255,${k})`; c.fillRect(0, -(f.big ? f.w / 5 : 2), f.len, f.big ? f.w / 2.5 : 4);
    for (let i = 0; i < (f.big ? 10 : 4); i++) { c.fillStyle = `rgba(255,255,255,${k})`; c.fillRect(Math.random() * f.len, (Math.random() * 2 - 1) * f.w, 4, 4); }
    c.restore();
  } else if (f.kind === 'charge') {
    const r = 8 + (1 - k) * 22;
    glowDot(c, f.x, f.y, r * 1.8, hexA(f.color, 0.25));
    glowDot(c, f.x, f.y, r * 0.6, '#ffffff');
    c.strokeStyle = hexA(f.color, 0.8); c.lineWidth = 2;
    c.beginPath(); c.arc(f.x, f.y, 40 * k + 6, 0, 7); c.stroke();
  } else if (f.kind === 'slash') {
    c.save(); c.translate(f.x, f.y);
    c.strokeStyle = hexA(f.color, k); c.lineWidth = 10 * k + 2;
    c.beginPath(); c.arc(0, 0, f.r * (1.1 - k * 0.3), f.a - 1.1, f.a + 1.1); c.stroke();
    if (f.cross) { c.beginPath(); c.arc(0, 0, f.r * (0.9 - k * 0.3), f.a - 0.6, f.a + 0.6); c.stroke(); }
    if (f.bite) {
      c.fillStyle = `rgba(255,255,255,${k})`;
      for (let i = -2; i <= 2; i++) {
        const a = f.a + i * 0.25, r = f.r * 0.8;
        c.beginPath(); c.moveTo(Math.cos(a) * r, Math.sin(a) * r); c.lineTo(Math.cos(a) * (r - 14), Math.sin(a) * (r - 14) - 4); c.lineTo(Math.cos(a) * (r - 14), Math.sin(a) * (r - 14) + 4); c.fill();
      }
    }
    c.strokeStyle = `rgba(255,255,255,${k})`; c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, f.r * (1.05 - k * 0.3), f.a - 0.9, f.a + 0.9); c.stroke();
    c.restore();
  } else if (f.kind === 'whip') {
    c.save(); c.translate(f.x, f.y); c.rotate(f.a);
    c.strokeStyle = hexA(f.color, k); c.lineWidth = 6; c.lineCap = 'round';
    const wave = Math.sin((1 - k) * 12) * 18;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(f.len * 0.5, wave, f.len * (1.1 - k * 0.3), 0); c.stroke();
    c.strokeStyle = `rgba(255,255,255,${k})`; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(f.len * 0.5, wave, f.len * (1.1 - k * 0.3), 0); c.stroke();
    c.restore();
  } else if (f.kind === 'cut') {
    c.save(); c.translate(f.x, f.y); c.rotate(f.a);
    c.strokeStyle = hexA(f.color, k); c.lineWidth = 6 * k + 1;
    c.beginPath(); c.moveTo(-26, 0); c.lineTo(26, 0); c.stroke();
    c.strokeStyle = `rgba(255,255,255,${k})`; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-22, 0); c.lineTo(22, 0); c.stroke();
    c.restore();
  } else if (f.kind === 'bolt') {
    c.fillStyle = `rgba(255,250,170,${k * 0.5})`; c.fillRect(f.x - 14, f.y - 600, 28, 600);
    c.strokeStyle = `rgba(255,255,255,${k})`; c.lineWidth = 4;
    c.beginPath(); c.moveTo(f.x, f.y - 600);
    for (let y = f.y - 560; y < f.y; y += 40) c.lineTo(f.x + (Math.random() * 2 - 1) * 16, y);
    c.lineTo(f.x, f.y); c.stroke();
  } else if (f.kind === 'lob') {
    const p = 1 - k, x = f.x0 + (f.x1 - f.x0) * p, y = f.y0 + (f.y1 - f.y0) * p - Math.sin(p * Math.PI) * 120;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(f.x1, f.y1, 18 * p, 6 * p, 0, 0, 7); c.fill();
    if (f.s.kind === 'egg') { c.fillStyle = '#fff4e0'; c.beginPath(); c.ellipse(x, y, 7, 9, 0, 0, 7); c.fill(); c.fillStyle = '#ff9a9a'; c.fillRect(x - 3, y - 2, 3, 3); }
    else { glowDot(c, x, y, 12, 'rgba(160,70,220,.4)'); glowDot(c, x, y, 7, '#9a4fd0'); }
  } else if (f.kind === 'lightning') {
    c.strokeStyle = `rgba(255,250,150,${k})`; c.lineWidth = 3;
    c.beginPath();
    f.pts.forEach((pt, i) => {
      if (i === 0) { c.moveTo(pt.x, pt.y); return; }
      const prev = f.pts[i - 1];
      for (let s = 1; s <= 4; s++) {
        const tt = s / 4;
        c.lineTo(prev.x + (pt.x - prev.x) * tt + (s < 4 ? (Math.random() * 2 - 1) * 10 : 0), prev.y + (pt.y - prev.y) * tt + (s < 4 ? (Math.random() * 2 - 1) * 10 : 0));
      }
    });
    c.stroke();
    c.strokeStyle = `rgba(255,255,255,${k})`; c.lineWidth = 1; c.stroke();
  }
}
