/**
 * 九份淘金台：金塊造型
 * 取代原本的「金色方框」。共 6 種金塊，全部用 SVG 繪製（含刻面與反光），符號文字疊在金塊正中央。
 * 造型依符號在 37 個符號中的順序輪流指派，同一個符號永遠是同一種金塊。
 */

const DEFS_INNER = `
    <radialGradient id="gnBase" cx="32%" cy="24%" r="88%">
      <stop offset="0" stop-color="#fff3ad"/>
      <stop offset=".42" stop-color="#f6c743"/>
      <stop offset="1" stop-color="#c78612"/>
    </radialGradient>
    <linearGradient id="gnLight" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fffbe0"/>
      <stop offset="1" stop-color="#f8d65e"/>
    </linearGradient>
    <linearGradient id="gnDark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d89c20"/>
      <stop offset="1" stop-color="#94610f"/>
    </linearGradient>`;

/**
 * 漸層定義只放一份：圖鑑一次會畫出 37 個金塊，如果每個 SVG 各帶一份同 id 的漸層，
 * 切換分頁（display:none）後瀏覽器會找不到漸層而讓金塊變成黑色。
 * 做法：整個視窗放一個「寬高 0 但仍參與渲染」的 SVG 來存放漸層，卡片內的 SVG 共用它。
 */
export function renderGoldNuggetDefs() {
  return `<svg class="nugget-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>${DEFS_INNER}</defs></svg>`;
}

const EDGE = 'stroke="#9a6710" stroke-width="2" stroke-linejoin="round"';

/** text：符號文字中心點（佔金塊寬高的 %）；body：SVG 內容 */
export const GOLD_NUGGET_SHAPES = [
  {
    name: '圓潤砂金',
    text: { x: 50, y: 50 },
    body: `
      <path d="M24 78 C14 52 36 24 70 20 C104 14 138 30 146 62 C154 92 130 120 94 124 C58 128 32 108 24 78 Z" fill="url(#gnBase)" ${EDGE}/>
      <path d="M30 86 C44 114 82 124 114 114 C132 108 144 90 146 66 C140 98 112 114 80 114 C56 114 38 102 30 86 Z" fill="#8a5a0c" opacity=".28"/>
      <path d="M42 52 C50 36 70 28 90 28" stroke="#fffbe0" stroke-width="6" stroke-linecap="round" fill="none" opacity=".75"/>
      <circle cx="116" cy="42" r="4" fill="#fffbe0" opacity=".6"/>`,
  },
  {
    name: '稜角礦塊',
    text: { x: 50, y: 52 },
    body: `
      <polygon points="30,70 52,30 96,18 134,40 148,82 120,118 70,122 36,104" fill="url(#gnBase)" ${EDGE}/>
      <polygon points="52,30 96,18 134,40 104,60 62,56" fill="url(#gnLight)" opacity=".9"/>
      <polygon points="104,60 134,40 148,82 120,118 90,96" fill="url(#gnDark)" opacity=".75"/>
      <polygon points="30,70 52,30 62,56 56,88 36,104" fill="#f1bb36" opacity=".8"/>
      <polygon points="56,88 90,96 120,118 70,122 36,104" fill="url(#gnDark)" opacity=".55"/>`,
  },
  {
    name: '金條',
    text: { x: 50, y: 63 },
    body: `
      <polygon points="22,62 142,62 130,114 34,114" fill="url(#gnBase)" ${EDGE}/>
      <polygon points="44,34 120,34 142,62 22,62" fill="url(#gnLight)" ${EDGE}/>
      <polygon points="34,114 130,114 128,122 36,122" fill="#8a5a0c" opacity=".55"/>
      <polygon points="130,114 142,62 144,70 132,122" fill="#8a5a0c" opacity=".4"/>
      <path d="M50 42 L112 42" stroke="#fffdf0" stroke-width="4" stroke-linecap="round" opacity=".8"/>
      <path d="M30 70 L134 70" stroke="#fffbe0" stroke-width="2" opacity=".5"/>`,
  },
  {
    name: '金元寶',
    text: { x: 50, y: 49 },
    body: `
      <path d="M10 60 C8 42 24 32 40 40 C52 46 58 54 68 56 L92 56 C102 54 108 46 120 40 C136 32 152 42 150 60 C150 76 136 84 126 90 C116 110 98 120 80 120 C62 120 44 110 34 90 C24 84 10 76 10 60 Z" fill="url(#gnBase)" ${EDGE}/>
      <path d="M36 92 C48 112 66 118 80 118 C96 118 114 112 124 92 C112 104 96 108 80 108 C64 108 48 104 36 92 Z" fill="#8a5a0c" opacity=".3"/>
      <path d="M18 56 C20 46 30 40 40 44" stroke="#fffbe0" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/>
      <path d="M142 56 C140 46 130 40 120 44" stroke="#fffbe0" stroke-width="5" stroke-linecap="round" fill="none" opacity=".5"/>
      <path d="M46 70 C44 34 116 34 114 70 C112 90 98 98 80 98 C62 98 48 90 46 70 Z" fill="url(#gnLight)" ${EDGE}/>
      <path d="M58 54 C66 44 84 42 98 46" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".8"/>`,
  },
  {
    name: '金片',
    text: { x: 50, y: 51 },
    body: `
      <polygon points="38,116 116,108 146,64 146,76 118,120 38,128" fill="url(#gnDark)" ${EDGE}/>
      <polygon points="26,84 56,40 132,30 146,64 116,108 38,116" fill="url(#gnBase)" ${EDGE}/>
      <polygon points="56,40 132,30 122,52 70,60" fill="url(#gnLight)" opacity=".9"/>
      <polygon points="26,84 56,40 70,60 62,92 38,116" fill="#f1bb36" opacity=".75"/>
      <path d="M70 60 L122 52" stroke="#9a6710" stroke-width="1.2" opacity=".45"/>`,
  },
  {
    name: '叢生金塊',
    text: { x: 52, y: 47 },
    body: `
      <path d="M14 104 C12 90 26 82 38 88 C48 94 46 110 34 114 C24 118 16 114 14 104 Z" fill="url(#gnBase)" ${EDGE}/>
      <path d="M118 108 C116 96 130 90 142 96 C152 102 148 118 136 120 C126 122 119 118 118 108 Z" fill="url(#gnBase)" ${EDGE}/>
      <path d="M38 70 C34 44 60 22 86 24 C114 26 132 48 128 76 C124 102 98 114 74 112 C50 110 40 94 38 70 Z" fill="url(#gnBase)" ${EDGE}/>
      <path d="M44 96 C54 108 80 114 104 106 C118 100 126 90 128 78 C122 98 100 108 78 106 C62 104 50 100 44 96 Z" fill="#8a5a0c" opacity=".28"/>
      <path d="M50 46 C58 32 76 26 94 28" stroke="#fffbe0" stroke-width="6" stroke-linecap="round" fill="none" opacity=".75"/>
      <circle cx="104" cy="124" r="3.5" fill="#f1bb36" stroke="#9a6710" stroke-width="1.2"/>
      <circle cx="66" cy="126" r="2.5" fill="#f1bb36" stroke="#9a6710" stroke-width="1"/>`,
  },
];

const GLINT = (cls) =>
  `<svg class="nugget-glint ${cls}" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#fff6c2"/></svg>`;

/**
 * 回傳金塊 HTML；shapeIndex 會自動取餘數。
 * options.withDefs：此 SVG 是否自帶漸層定義（單顆金塊用 true；一次畫很多顆時改 false，改由 renderGoldNuggetDefs 提供）
 * options.glints：閃光數量 0~3
 */
export function renderGoldNugget(shapeIndex, label, { withDefs = true, glints = 3 } = {}) {
  const n = GOLD_NUGGET_SHAPES.length;
  const shape = GOLD_NUGGET_SHAPES[((shapeIndex % n) + n) % n];
  const len = [...String(label)].length;
  const sizeClass = len > 5 ? 'is-xs' : len > 2 ? 'is-sm' : '';
  const defs = withDefs ? `<defs>${DEFS_INNER}</defs>` : '';
  const glintHtml = ['g1', 'g2', 'g3'].slice(0, glints).map(GLINT).join('');
  return {
    name: shape.name,
    html: `
      <div class="nugget-body" data-shape="${shape.name}">
        <svg class="nugget-svg" viewBox="0 0 160 140" aria-hidden="true">${defs}${shape.body}</svg>
        <span class="nugget-symbol ${sizeClass}" style="left:${shape.text.x}%;top:${shape.text.y}%">${label}</span>
        ${glintHtml}
      </div>`,
  };
}
