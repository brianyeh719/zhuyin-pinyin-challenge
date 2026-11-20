/**
 * 背景音樂（BGM）設定
 *
 * 音檔請放在 public/audio/bgm/ 資料夾，這裡只填「檔名」。
 * - 想換歌：只要改檔名（或直接用同名檔案覆蓋）。
 * - 想讓多個關卡共用同一首：填同一個檔名即可，切換時不會重新開始播放。
 * - 某個關卡填 null、或檔案不存在：該關卡會自動沿用所在區域（zones）的 BGM。
 * - 區域 BGM 也填 null 的話，該區域就沒有音樂。
 */
export const BGM_CONFIG = {
  // 音量 0 ~ 1（BGM 建議低一點，才不會蓋掉注音發音）
  volume: 0.25,

  // 沒有進入關卡時（在地圖上走動）播放的區域 BGM
  zones: {
    learning: 'zone-learning.mp3', // 九份淘金與注音學堂
    nightmarket: 'zone-nightmarket.mp3', // 夜市練習區
  },

  // 各關卡 BGM（key 必須等於 stallsData.js 裡的 id）
  levels: {
    // —— 學習區 ——
    zhuyin_board: 'level-zhuyin-board.mp3', // 注音對照大黑板
    gold_pan: 'level-gold-pan.mp3', // 九份溪邊淘金台
    combo_lab: 'level-combo-lab.mp3', // 雙拼積木實驗桌

    // —— 夜市 17 攤 ——
    boba: 'level-boba.mp3', // 珍珠奶茶
    chicken: 'level-chicken.mp3', // 雞排
    stinky_tofu: 'level-stinky-tofu.mp3', // 臭豆腐
    corn: 'level-corn.mp3', // 烤玉米
    tanghulu: 'level-tanghulu.mp3', // 糖葫蘆
    claw_machine: 'level-claw-machine.mp3', // 娃娃機
    goldfish: 'level-goldfish.mp3', // 撈魚
    pinball: 'level-pinball.mp3', // 打彈珠
    dachang: 'level-dachang.mp3', // 大腸
    luwei: 'level-luwei.mp3', // 滷味
    pork_ribs: 'level-pork-ribs.mp3', // 排骨酥
    meatball: 'level-meatball.mp3', // 肉圓
    fish_ball: 'level-fish-ball.mp3', // 魚蛋
    guava: 'level-guava.mp3', // 芭樂
    fried_squid: 'level-fried-squid.mp3', // 炸魷魚
    duck_head: 'level-duck-head.mp3', // 鴨頭
    mochi: 'level-mochi.mp3', // 烤麻糬

    // —— 夜市護照視窗（選填）——
    passport: null,
  },
};
