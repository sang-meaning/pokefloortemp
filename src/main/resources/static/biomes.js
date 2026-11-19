/* 바이옴 도트 팔레트 (내 박스 바닥, 던전 바닥이 같이 사용) */

/* ---------- 바이옴 도트 팔레트 ----------
 * top: 바닥 두 톤(체크), speck: 잔무늬, light: 밝은 점, side: [왼쪽 면, 오른쪽 면], rim: 옆면 윗줄
 * deco(i, j, h, t): 특수 무늬 (null 이면 없음) */
const BIOME_STYLE = {
  MEADOW: {
    top: ['#7ec850', '#79c34c'], speck: '#63aa3c', light: '#9ce06c', rim: '#5d9e37',
    side: ['#8a5a36', '#6f4529'],
    deco: (i, j, h) => (h < 0.004 ? '#fff6c8' : h < 0.007 ? '#ffd84a' : null),
  },
  FOREST: {
    top: ['#4f9a40', '#4b953c'], speck: '#3a7a30', light: '#66b250', rim: '#3a7a30',
    side: ['#7a4e2e', '#5f3b22'],
    deco: (i, j, h) => (h < 0.01 ? '#8a6a2f' : h < 0.013 ? '#c9533a' : null),
  },
  CAVE: {
    top: ['#7b7169', '#766c64'], speck: '#5f564f', light: '#958a80', rim: '#5f564f',
    side: ['#4f4842', '#3d3732'],
    deco: (i, j, h) => (h < 0.012 ? '#a59a8f' : null),
  },
  VOLCANO: {
    top: ['#3f3637', '#3a3132'], speck: '#2b2425', light: '#55494a', rim: '#2b2425',
    side: ['#2e2627', '#231d1e'],
    deco: (i, j, h, t) => {
      // 몇몇 줄을 따라 구불구불 흐르는 용암 (타일을 이어서 강처럼)
      if (t.row % 3 === 1) {
        const off = Math.abs(t.fy - 0.5 - 0.22 * Math.sin((t.wx + t.fx) * 1.7 + t.wy));
        if (off < 0.07) return off < 0.035 ? '#ffb238' : '#ff6a1a';
        if (off < 0.12) return '#8a2a14';
      }
      return h < 0.005 ? '#ff6a1a' : null;
    },
  },
  SEA: {
    top: ['#3a8fd8', '#378ad1'], speck: '#2f7cc0', light: '#5aa8ec', rim: '#8fd3ff',
    side: ['#2b67a3', '#22548a'],
    deco: (i, j) => ((j + Math.floor(i / 7)) % 10 === 0 && i % 7 < 4 ? '#8fd3ff' : null),
  },
  DESERT: {
    top: ['#e9cf88', '#e4c980'], speck: '#d2b36e', light: '#f5e2a8', rim: '#cfa95e',
    side: ['#c08f4f', '#a2763c'],
    deco: (i, j) => ((j * 3 + Math.floor(i / 5)) % 17 === 0 ? '#d6b56c' : null),
  },
  SNOW: {
    top: ['#f2f7fc', '#ebf2f9'], speck: '#d5e2ef', light: '#ffffff', rim: '#ffffff',
    side: ['#a3c9e8', '#80abd0'],
    deco: (i, j, h) => (h < 0.006 ? '#bcd3ea' : null),
  },
  VILLAGE: {
    top: ['#c3b59b', '#bcae93'], speck: '#a99a7e', light: '#d3c6ad', rim: '#7ab84c',
    side: ['#8a7155', '#6e5942'],
    deco: (i, j) => {
      // 돌길: 4px 높이 줄, 8px 폭 벽돌, 줄마다 엇갈림
      const row = Math.floor(j / 4);
      if (j % 4 === 0 || (i + (row % 2) * 4) % 8 === 0) return '#968870';
      return null;
    },
  },
  GHOST: {
    top: ['#5e4e7a', '#594974'], speck: '#47395f', light: '#7a66a0', rim: '#3f3256',
    side: ['#3c2f4d', '#2e243c'],
    deco: (i, j, h) => (h < 0.004 ? '#b7f0e0' : h < 0.006 ? '#9a7fd0' : null),
  },
};
const styleOf = biome => BIOME_STYLE[biome] || BIOME_STYLE.MEADOW;

// 결정적 난수 (같은 좌표는 항상 같은 무늬)
function hash2(a, b) {
  let h = (a * 374761393 + b * 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const RGB = {};
const rgbOf = hex => RGB[hex] || (RGB[hex] = hexRgb(hex));

