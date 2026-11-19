/* 던전 보조: 움직이는 GIF 를 캔버스에 그리기(프레임 분해), 효과음(WebAudio 합성) */

/* ---------- 스프라이트: GIF 는 ImageDecoder 로 프레임을 모두 꺼내 캔버스에서 재생 ---------- */
const SPRITES = new Map();

/** url → {frames: [ImageBitmap|Image], delays: [ms], total, w, h} */
function loadSprite(url) {
  if (!url) return Promise.resolve(null);
  if (SPRITES.has(url)) return SPRITES.get(url);
  const p = (async () => {
    if (url.endsWith('.gif') && 'ImageDecoder' in window) {
      try {
        const res = await fetch(url, { mode: 'cors' });
        const dec = new ImageDecoder({ data: res.body, type: 'image/gif' });
        await dec.tracks.ready;
        const count = dec.tracks.selectedTrack.frameCount;
        const frames = [], delays = [];
        for (let i = 0; i < count; i++) {
          const { image } = await dec.decode({ frameIndex: i });
          frames.push(await createImageBitmap(image));
          delays.push(Math.max(20, (image.duration || 80000) / 1000));
          image.close();
        }
        dec.close();
        return { frames, delays, total: delays.reduce((a, b) => a + b, 0), w: frames[0].width, h: frames[0].height };
      } catch (e) {
        console.warn('GIF 분해 실패, 정지 이미지로', url, e);
      }
    }
    const img = await new Promise(resolve => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = url;
    });
    return img && { frames: [img], delays: [1000], total: 1000, w: img.width, h: img.height };
  })();
  SPRITES.set(url, p);
  return p;
}

/** 경과 시간(초)에 맞는 프레임 */
function frameOf(spr, t, speed = 1) {
  if (!spr) return null;
  if (spr.frames.length === 1) return spr.frames[0];
  let ms = (t * 1000 * speed) % spr.total;
  for (let i = 0; i < spr.delays.length; i++) {
    ms -= spr.delays[i];
    if (ms < 0) return spr.frames[i];
  }
  return spr.frames[0];
}

/* ---------- 효과음: 파일 없이 오실레이터로 합성 ---------- */
const SFX = (() => {
  let ac = null, master = null;
  let muted = false;
  try { muted = localStorage.getItem('pf-mute') === '1'; } catch { /* 저장소 없음 */ }
  const last = {};

  function ctx() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.35;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone({ f = 440, f2 = null, dur = 0.1, type = 'square', vol = 0.2, delay = 0 }) {
    const a = ctx(), t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  let noiseBuf = null;   // 잡음은 한 번만 만들어 재사용
  function noise({ dur = 0.3, vol = 0.3, from = 2000, to = 200, delay = 0 }) {
    const a = ctx(), t = a.currentTime + delay;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, Math.floor(a.sampleRate * 1.2), a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = a.createBufferSource();
    src.buffer = noiseBuf;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t, 0, dur);
  }

  const sounds = {
    shoot: () => tone({ f: 880, f2: 440, dur: 0.05, vol: 0.03 }),
    hit: () => tone({ f: 220, f2: 90, dur: 0.06, type: 'triangle', vol: 0.08 }),
    kill: () => tone({ f: 520, f2: 180, dur: 0.08, vol: 0.05 }),
    coin: () => { tone({ f: 988, dur: 0.05, vol: 0.06 }); tone({ f: 1319, dur: 0.09, vol: 0.06, delay: 0.05 }); },
    heal: () => [523, 659, 784].forEach((f, i) => tone({ f, dur: 0.12, type: 'triangle', vol: 0.12, delay: i * 0.07 })),
    hurt: () => tone({ f: 160, f2: 60, dur: 0.18, type: 'sawtooth', vol: 0.12 }),
    pick: () => [523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.14, type: 'triangle', vol: 0.12, delay: i * 0.06 })),
    open: () => [392, 523].forEach((f, i) => tone({ f, dur: 0.12, type: 'triangle', vol: 0.1, delay: i * 0.08 })),
    explode: () => noise({ dur: 0.45, vol: 0.35, from: 1800, to: 80 }),
    zap: () => tone({ f: 1400, f2: 300, dur: 0.07, type: 'sawtooth', vol: 0.04 }),
    warn: () => {
      for (let i = 0; i < 4; i++) {
        tone({ f: 660, dur: 0.32, type: 'square', vol: 0.12, delay: i * 0.7 });
        tone({ f: 440, dur: 0.32, type: 'square', vol: 0.12, delay: i * 0.7 + 0.35 });
      }
    },
    roar: () => { noise({ dur: 1.1, vol: 0.5, from: 900, to: 60 }); tone({ f: 110, f2: 40, dur: 1.0, type: 'sawtooth', vol: 0.25 }); },
    slam: () => { noise({ dur: 0.3, vol: 0.4, from: 600, to: 50 }); tone({ f: 80, f2: 30, dur: 0.3, type: 'sine', vol: 0.4 }); },
    tele: () => tone({ f: 300, f2: 600, dur: 0.25, type: 'triangle', vol: 0.06 }),
    dash: () => noise({ dur: 0.35, vol: 0.25, from: 3000, to: 300 }),
    beat: () => { tone({ f: 70, f2: 40, dur: 0.18, type: 'sine', vol: 0.35 }); },
    throw: () => tone({ f: 300, f2: 900, dur: 0.35, type: 'triangle', vol: 0.12 }),
    shake: () => { tone({ f: 180, dur: 0.05, type: 'square', vol: 0.12 }); tone({ f: 140, dur: 0.05, type: 'square', vol: 0.1, delay: 0.08 }); },
    caught: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      tone({ f, dur: i === 5 ? 0.5 : 0.13, type: 'square', vol: 0.12, delay: i * 0.12 })),
    escape: () => { noise({ dur: 0.2, vol: 0.3, from: 3000, to: 500 }); tone({ f: 600, f2: 200, dur: 0.25, vol: 0.1 }); },
    win: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.2, type: 'square', vol: 0.1, delay: i * 0.1 })),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone({ f, dur: 0.3, type: 'triangle', vol: 0.12, delay: i * 0.18 })),
    starup: () => [784, 988, 1175, 1568].forEach((f, i) => tone({ f, dur: 0.15, type: 'triangle', vol: 0.12, delay: i * 0.08 })),
  };

  return {
    play(name, minGap = 0) {
      if (muted || !sounds[name]) return;
      const now = performance.now();
      if (minGap && last[name] && now - last[name] < minGap) return;
      last[name] = now;
      try { sounds[name](); } catch { /* 오디오 불가 */ }
    },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('pf-mute', muted ? '1' : '0'); } catch { /* 무시 */ }
      return muted;
    },
    unlock() { try { ctx(); } catch { /* 무시 */ } },
  };
})();
