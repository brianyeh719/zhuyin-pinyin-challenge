import * as THREE from 'three';

/**
 * 繪製攤位或設施的 Q 版圓潤雙色招牌貼圖
 */
export function createSignTexture(emoji, title, bgColor = '#fff7e6', borderColor = '#d97706') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 176;
  const ctx = canvas.getContext('2d');

  // 外框陰影與圓角木框
  ctx.fillStyle = borderColor;
  ctx.beginPath();
  ctx.roundRect(6, 6, 500, 164, 34);
  ctx.fill();

  // 內底色
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(18, 18, 476, 140, 26);
  ctx.fill();

  // 內裝飾雙線框
  ctx.strokeStyle = 'rgba(180, 83, 9, 0.28)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(28, 28, 456, 120, 18);
  ctx.stroke();

  // 左側可愛圓形圖示徽章
  if (emoji) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(96, 88, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = '58px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 96, 92);
  }

  // 攤位名稱文字
  ctx.fillStyle = '#3b1d0c';
  ctx.font = 'bold 58px "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textX = emoji ? 302 : 256;
  ctx.fillText(title, textX, 90, 310);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * 繪製柔和光暈貼圖（用於燈籠與暖光氛圍）
 */
export function createGlowHaloTexture(innerColor = 'rgba(255, 190, 85, 0.85)', outerColor = 'rgba(255, 120, 30, 0)') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.45, 'rgba(255, 155, 50, 0.35)');
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 繪製 Q 版條紋遮雨棚貼圖（附帶下緣陰影漸層）
 */
export function createStripedAwningTexture(color1, color2, stripes = 7) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const sw = canvas.width / stripes;

  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? color1 : color2;
    ctx.fillRect(i * sw, 0, sw + 1, canvas.height);
  }

  // 柔和頂部高光與邊緣立體感
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, 'rgba(255,255,255,0.28)');
  grad.addColorStop(0.65, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(80,30,10,0.16)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 繪製溫暖蜜糖色夜市石板地磚貼圖（對應參考圖暖橘紅磚感）
 */
export function createCobblestoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#6f4c3a';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const cols = 8;
  const tileW = 512 / cols;
  const tileH = 512 / rows;

  const tones = ['#a67255', '#b07b5d', '#9b674c', '#b88364', '#a16d51'];

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (tileW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const tx = c * tileW + offset + 3;
      const ty = r * tileH + 3;
      const tone = tones[(r * 7 + c * 3 + 16) % tones.length];
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tileW - 6, tileH - 6, 10);
      ctx.fill();

      // 柔和微反光
      ctx.fillStyle = 'rgba(255, 232, 200, 0.13)';
      ctx.fillRect(tx + 5, ty + 3, tileW - 16, 5);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(11, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 繪製九份學習區溫暖石階草地貼圖
 */
export function createJiufenGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#5c7c58';
  ctx.fillRect(0, 0, 512, 512);

  const tiles = 6;
  const size = 512 / tiles;
  for (let r = 0; r < tiles; r++) {
    for (let c = 0; c < tiles; c++) {
      const shade = (r + c) % 2 === 0 ? '#799c6e' : '#6d8f64';
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.roundRect(c * size + 4, r * size + 4, size - 8, size - 8, 14);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 250, 220, 0.12)';
      ctx.fillRect(c * size + 8, r * size + 6, size - 16, 6);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 繪製牌樓匾額貼圖
 */
export function createArchPlaqueTexture(title, bg = '#a8241d', fg = '#fef08a') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.roundRect(6, 6, 500, 180, 22);
  ctx.fill();

  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(18, 18, 476, 156, 16);
  ctx.fill();

  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 5;
  ctx.strokeRect(28, 28, 456, 136);

  ctx.fillStyle = fg;
  ctx.font = 'bold 74px "Microsoft JhengHei", "PingFang TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, 98);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 繪製黑板貼圖
 */
export function createChalkboardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1f513b';
  ctx.fillRect(0, 0, 512, 320);

  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, 484, 292);

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 34px "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('注音 × 拼音 37 符學堂', 256, 62);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px "Microsoft JhengHei", sans-serif';
  ctx.fillText('ㄅ b   ㄆ p   ㄇ m   ㄈ f', 256, 128);
  ctx.fillStyle = '#93c5fd';
  ctx.fillText('ㄐ j   ㄑ q   ㄒ x   ㄓ zh', 256, 182);
  ctx.fillStyle = '#fbcfe8';
  ctx.font = 'bold 26px "Microsoft JhengHei", sans-serif';
  ctx.fillText('ㄧ i   ㄨ u   ㄩ ü   ㄝ ê', 256, 238);
  ctx.fillStyle = '#86efac';
  ctx.font = 'bold 22px "Microsoft JhengHei", sans-serif';
  ctx.fillText('點擊開啟圖鑑與發音導覽', 256, 285);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 繪製 3D 空間漂浮文字氣泡 Sprite 貼圖
 */
export function createBubbleSpriteTexture(text, variant = 'prompt') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');

  const isAction = variant === 'action';
  ctx.fillStyle = isAction ? '#fffbeb' : 'rgba(42, 22, 12, 0.92)';
  ctx.beginPath();
  ctx.roundRect(16, 16, 480, 76, 36);
  ctx.fill();

  ctx.strokeStyle = isAction ? '#f59e0b' : '#fde047';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = isAction ? '#78350f' : '#fef08a';
  ctx.font = 'bold 30px "Microsoft JhengHei", "PingFang TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 55, 448);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
