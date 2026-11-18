/**
 * 注音與漢語拼音對照資料（全 37 符號：21 聲母 + 16 韻母含介母）
 * 對應「第一區：九份淘金」與「學習區圖鑑／自由拼讀實驗台」
 */

export const ZHUYIN_INITIALS = [
  { id: 'gold01', zhuyin: 'ㄅ', pinyin: 'b', group: '雙唇音', example: '芭樂 (bā)', audioText: '波', confusable: ['ㄆ', 'ㄉ', 'ㄇ'] },
  { id: 'gold02', zhuyin: 'ㄆ', pinyin: 'p', group: '雙唇音', example: '排骨酥 (pái)', audioText: '坡', confusable: ['ㄅ', 'ㄈ', 'ㄊ'] },
  { id: 'gold03', zhuyin: 'ㄇ', pinyin: 'm', group: '雙唇音', example: '麻糬 (má)', audioText: '摸', confusable: ['ㄅ', 'ㄈ', 'ㄋ'] },
  { id: 'gold04', zhuyin: 'ㄈ', pinyin: 'f', group: '唇齒音', example: '臭豆腐 (fu)', audioText: '佛', confusable: ['ㄆ', 'ㄇ', 'ㄏ'] },
  { id: 'gold05', zhuyin: 'ㄉ', pinyin: 'd', group: '舌尖中音', example: '打彈珠 (dǎ)', audioText: '得', confusable: ['ㄊ', 'ㄋ', 'ㄅ'] },
  { id: 'gold06', zhuyin: 'ㄊ', pinyin: 't', group: '舌尖中音', example: '糖葫蘆 (táng)', audioText: '特', confusable: ['ㄉ', 'ㄌ', 'ㄆ'] },
  { id: 'gold07', zhuyin: 'ㄋ', pinyin: 'n', group: '舌尖中音', example: '奶茶 (nǎi)', audioText: '訥', confusable: ['ㄌ', 'ㄇ', 'ㄉ'] },
  { id: 'gold08', zhuyin: 'ㄌ', pinyin: 'l', group: '舌尖中音', example: '滷味 (lǔ)', audioText: '勒', confusable: ['ㄋ', 'ㄊ', 'ㄖ'] },
  { id: 'gold09', zhuyin: 'ㄍ', pinyin: 'g', group: '舌根音', example: '排骨酥 (gǔ)', audioText: '哥', confusable: ['ㄎ', 'ㄏ', 'ㄐ'] },
  { id: 'gold10', zhuyin: 'ㄎ', pinyin: 'k', group: '舌根音', example: '烤玉米 (kǎo)', audioText: '科', confusable: ['ㄍ', 'ㄏ', 'ㄑ'] },
  { id: 'gold11', zhuyin: 'ㄏ', pinyin: 'h', group: '舌根音', example: '糖葫蘆 (hú)', audioText: '喝', confusable: ['ㄍ', 'ㄎ', 'ㄈ'] },
  { id: 'gold12', zhuyin: 'ㄐ', pinyin: 'j', group: '舌面音', example: '雞排 (jī)', audioText: '基', confusable: ['ㄑ', 'ㄒ', 'ㄓ'] },
  { id: 'gold13', zhuyin: 'ㄑ', pinyin: 'q', group: '舌面音', example: '搶頭香 (qiǎng)', audioText: '欺', confusable: ['ㄐ', 'ㄒ', 'ㄔ'] },
  { id: 'gold14', zhuyin: 'ㄒ', pinyin: 'x', group: '舌面音', example: '薪水 (xīn)', audioText: '希', confusable: ['ㄐ', 'ㄑ', 'ㄕ'] },
  { id: 'gold15', zhuyin: 'ㄓ', pinyin: 'zh', group: '翹舌音', example: '珍珠 (zhēn)', audioText: '知', confusable: ['ㄗ', 'ㄔ', 'ㄕ'] },
  { id: 'gold16', zhuyin: 'ㄔ', pinyin: 'ch', group: '翹舌音', example: '大腸 (cháng)', audioText: '吃', confusable: ['ㄘ', 'ㄓ', 'ㄕ'] },
  { id: 'gold17', zhuyin: 'ㄕ', pinyin: 'sh', group: '翹舌音', example: '麻糬 (shu)', audioText: '詩', confusable: ['ㄙ', 'ㄓ', 'ㄔ'] },
  { id: 'gold18', zhuyin: 'ㄖ', pinyin: 'r', group: '翹舌音', example: '肉圓 (ròu)', audioText: '日', confusable: ['ㄌ', 'ㄗ', 'ㄓ'] },
  { id: 'gold19', zhuyin: 'ㄗ', pinyin: 'z', group: '平舌音', example: '資 (zī)', audioText: '資', confusable: ['ㄓ', 'ㄘ', 'ㄙ'] },
  { id: 'gold20', zhuyin: 'ㄘ', pinyin: 'c', group: '平舌音', example: '發財 (cái)', audioText: '雌', confusable: ['ㄔ', 'ㄗ', 'ㄙ'] },
  { id: 'gold21', zhuyin: 'ㄙ', pinyin: 's', group: '平舌音', example: '排骨酥 (sū)', audioText: '思', confusable: ['ㄕ', 'ㄗ', 'ㄘ'] },
];

export const ZHUYIN_FINALS = [
  { id: 'gold22', zhuyin: 'ㄧ', pinyin: 'i / yi', shortPinyin: 'i', group: '介母／單韻母', example: '雞排 (jī)', audioText: '衣', confusable: ['ㄨ', 'ㄩ', 'ㄟ'] },
  { id: 'gold23', zhuyin: 'ㄨ', pinyin: 'u / wu', shortPinyin: 'u', group: '介母／單韻母', example: '滷味 (lǔ)', audioText: '烏', confusable: ['ㄧ', 'ㄩ', 'ㄡ'] },
  { id: 'gold24', zhuyin: 'ㄩ', pinyin: 'ü / yu', shortPinyin: 'ü', group: '介母／單韻母', example: '魚蛋 (yú)', audioText: '迂', confusable: ['ㄧ', 'ㄨ', 'ㄠ'] },
  { id: 'gold25', zhuyin: 'ㄚ', pinyin: 'a', shortPinyin: 'a', group: '單韻母', example: '芭樂 (bā)', audioText: '啊', confusable: ['ㄛ', 'ㄜ', 'ㄞ'] },
  { id: 'gold26', zhuyin: 'ㄛ', pinyin: 'o', shortPinyin: 'o', group: '單韻母', example: '波 (bo)', audioText: '喔', confusable: ['ㄜ', 'ㄚ', 'ㄡ'] },
  { id: 'gold27', zhuyin: 'ㄜ', pinyin: 'e', shortPinyin: 'e', group: '單韻母', example: '芭樂 (lè)', audioText: '鵝', confusable: ['ㄝ', 'ㄛ', 'ㄦ'] },
  {
    id: 'gold28',
    zhuyin: 'ㄝ',
    pinyin: 'ê',
    shortPinyin: 'ê',
    group: '單韻母（特殊規則）',
    example: '耶 (yē = ㄧㄝ)',
    audioText: '欸',
    confusable: ['ㄜ', 'ㄟ', 'ㄞ'],
    specialTip: '隱藏教學點：我是特別的 ㄝ，單飛時拼音寫成 ê 哦！與聲母或介母拼時則寫作 e（如「耶」ye 的韻母部分）。'
  },
  { id: 'gold29', zhuyin: 'ㄞ', pinyin: 'ai', shortPinyin: 'ai', group: '複韻母', example: '奶茶 (nǎi)', audioText: '哀', confusable: ['ㄟ', 'ㄠ', 'ㄢ'] },
  { id: 'gold30', zhuyin: 'ㄟ', pinyin: 'ei', shortPinyin: 'ei', group: '複韻母', example: '滷味 (wèi)', audioText: '欸', confusable: ['ㄞ', 'ㄧ', 'ㄝ'] },
  { id: 'gold31', zhuyin: 'ㄠ', pinyin: 'ao', shortPinyin: 'ao', group: '複韻母', example: '烤玉米 (kǎo)', audioText: '熬', confusable: ['ㄡ', 'ㄞ', 'ㄤ'] },
  { id: 'gold32', zhuyin: 'ㄡ', pinyin: 'ou', shortPinyin: 'ou', group: '複韻母', example: '臭豆腐 (dòu)', audioText: '歐', confusable: ['ㄠ', 'ㄨ', 'ㄛ'] },
  { id: 'gold33', zhuyin: 'ㄢ', pinyin: 'an', shortPinyin: 'an', group: '鼻韻母（前）', example: '魚蛋 (dàn)', audioText: '安', confusable: ['ㄤ', 'ㄣ', 'ㄞ'] },
  { id: 'gold34', zhuyin: 'ㄣ', pinyin: 'en', shortPinyin: 'en', group: '鼻韻母（前）', example: '珍珠 (zhēn)', audioText: '恩', confusable: ['ㄥ', 'ㄢ', 'ㄜ'] },
  { id: 'gold35', zhuyin: 'ㄤ', pinyin: 'ang', shortPinyin: 'ang', group: '鼻韻母（後）', example: '大腸 (cháng)', audioText: '昂', confusable: ['ㄢ', 'ㄥ', 'ㄠ'] },
  { id: 'gold36', zhuyin: 'ㄥ', pinyin: 'eng', shortPinyin: 'eng', group: '鼻韻母（後）', example: '燈 (dēng)', audioText: '哼', confusable: ['ㄣ', 'ㄤ', 'ㄨ'] },
  { id: 'gold37', zhuyin: 'ㄦ', pinyin: 'er', shortPinyin: 'er', group: '捲舌韻母', example: '二 (èr)', audioText: '兒', confusable: ['ㄜ', 'ㄣ', 'ㄧ'] },
];

export const ALL_ZHUYIN_SYMBOLS = [...ZHUYIN_INITIALS, ...ZHUYIN_FINALS];

export const TONE_MARKS = [
  { id: '1', mark: '', label: '一聲（陰平）', symbolDisplay: 'ˉ', example: '陰平高平調' },
  { id: '2', mark: 'ˊ', label: '二聲（陽平）', symbolDisplay: 'ˊ', example: '由中升到高' },
  { id: '3', mark: 'ˇ', label: '三聲（上聲）', symbolDisplay: 'ˇ', example: '先降後微揚' },
  { id: '4', mark: 'ˋ', label: '四聲（去聲）', symbolDisplay: 'ˋ', example: '由高急降下' },
];

/**
 * 查詢對應符號
 */
export function findZhuyinSymbol(char) {
  return ALL_ZHUYIN_SYMBOLS.find((item) => item.zhuyin === char) || null;
}
