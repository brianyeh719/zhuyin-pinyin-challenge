/**
 * 背景音樂管理器
 *
 * 規則：
 *   進入關卡 → 播放該關卡 BGM（淡出舊的、淡入新的）
 *   離開關卡 → 回到所在區域（學習區／夜市）的 BGM
 *   關卡沒有設定音檔，或檔案載入失敗 → 自動沿用區域 BGM
 *   瀏覽器擋住自動播放時 → 等玩家第一次點擊／按鍵後自動開始
 */
import { BGM_CONFIG } from './bgmConfig.js';

const FADE_MS = 600;
const FADE_STEP_MS = 40;

class BgmManager {
  constructor() {
    this.muted = false;
    this.zoneId = null;
    this.levelId = null;
    this.current = null; // { file, audio }
    this._cache = new Map(); // file -> HTMLAudioElement
    this._failed = new Set(); // 載入失敗的檔名
    this._waitingGesture = false;
    this._token = 0;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.current) return;
        if (document.hidden) this.current.audio.pause();
        else if (!this.muted) this.current.audio.play().catch(() => {});
      });
    }
  }

  /* ---------- 對外 API ---------- */

  /** 切換地圖區域（learning / nightmarket） */
  playZone(zoneId) {
    this.zoneId = zoneId;
    this._apply();
  }

  /** 進入關卡（id 對應 stallsData.js 的 id） */
  playLevel(levelId) {
    this.levelId = levelId;
    this._apply();
  }

  /** 離開關卡，回到區域 BGM */
  leaveLevel() {
    this.levelId = null;
    this._apply();
  }

  setMuted(muted) {
    this.muted = muted;
    this._apply();
  }

  /* ---------- 內部實作 ---------- */

  _resolveFile() {
    const usable = (f) => f && !this._failed.has(f);
    const levelFile = this.levelId ? BGM_CONFIG.levels[this.levelId] : null;
    if (usable(levelFile)) return levelFile;
    const zoneFile = this.zoneId ? BGM_CONFIG.zones[this.zoneId] : null;
    return usable(zoneFile) ? zoneFile : null;
  }

  _apply() {
    const file = this.muted ? null : this._resolveFile();
    // 每次呼叫都換新 token，讓還在載入中的舊請求自動作廢
    const token = ++this._token;

    // 已經在播同一首：不重播（同首歌跨關卡也不會中斷）
    if (this.current && this.current.file === file) {
      if (this.current.audio.paused && !document.hidden) this.current.audio.play().catch(() => {});
      return;
    }

    const old = this.current;

    // 不需要任何 BGM（靜音或沒設定）：淡出目前這首
    if (!file) {
      if (old) {
        this.current = null;
        this._fade(old.audio, 0, () => old.audio.pause());
      }
      return;
    }

    // 先在旁邊試播新音檔；成功才淡出舊的、淡入新的。
    // 新音檔不存在或播放失敗時，舊的那首完全不受影響、繼續接著播。
    const audio = this._getAudio(file);
    audio.currentTime = 0;
    audio.volume = 0;

    audio
      .play()
      .then(() => {
        if (token !== this._token) {
          // 玩家已經又切換了，這首作廢
          audio.pause();
          return;
        }
        this.current = { file, audio };
        if (old) this._fade(old.audio, 0, () => old.audio.pause());
        this._fade(audio, BGM_CONFIG.volume);
      })
      .catch((err) => {
        // 瀏覽器尚未允許自動播放：等玩家第一次互動再開始
        if (err && err.name === 'NotAllowedError' && token === this._token) this._waitForGesture();
        // 其他錯誤（檔案不存在等）由 audio 的 error 事件處理，會標記為失敗
      });
  }

  _getAudio(file) {
    let audio = this._cache.get(file);
    if (audio) return audio;

    const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
    audio = new Audio(`${base}audio/bgm/${file}`);
    audio.loop = true;
    audio.preload = 'auto';
    audio.addEventListener('error', () => {
      // 檔案不存在或無法解碼：記下來，改用區域 BGM
      this._failed.add(file);
      this._cache.delete(file);
      this._apply(); // 重新判斷：會落回區域 BGM，而它正在播，所以不會中斷
    });
    this._cache.set(file, audio);
    return audio;
  }

  _waitForGesture() {
    if (this._waitingGesture || typeof window === 'undefined') return;
    this._waitingGesture = true;
    const resume = () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
      window.removeEventListener('touchstart', resume);
      this._waitingGesture = false;
      this._apply();
    };
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);
    window.addEventListener('touchstart', resume);
  }

  _fade(audio, target, done) {
    if (audio._fadeTimer) clearInterval(audio._fadeTimer);
    const steps = Math.max(1, Math.round(FADE_MS / FADE_STEP_MS));
    const delta = (target - audio.volume) / steps;
    let n = 0;
    audio._fadeTimer = setInterval(() => {
      n += 1;
      audio.volume = Math.min(1, Math.max(0, audio.volume + delta));
      if (n >= steps) {
        clearInterval(audio._fadeTimer);
        audio._fadeTimer = null;
        audio.volume = target;
        if (done) done();
      }
    }, FADE_STEP_MS);
  }
}

export const bgmManager = new BgmManager();
