/**
 * 遊戲音效與國語語音引擎（Web Audio API + Web Speech API）
 * 支援無外部資源依賴的即時遊戲音效與繁體中文（zh-TW）發音朗讀
 */

/**
 * 是否優先播放預先合成的「音節 × 聲調」音檔（public/audio/syllable/<注音><聲調>.mp3）。
 * 預設 false：直接用瀏覽器 zh-TW 語音朗讀代表字。
 * 跑過 tools/generate-syllable-audio.py 產生音檔後改成 true，所有裝置的發音與聲調就會一致。
 */
const USE_SYLLABLE_AUDIO_FILES = false;

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.zhVoice = null;
    this._audio = null;
    this._initVoice();
  }

  _ensureCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _initVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const norm = (v) => (v.lang || '').replace('_', '-').toLowerCase();
    // 粵語（zh-HK / yue）與國語發音完全不同，一律排除
    const isCantonese = (v) => /^zh-hk|^yue/.test(norm(v)) || /粵|廣東|cantonese|hong kong/i.test(v.name);
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices().filter((v) => !isCantonese(v));
      const tw = voices.filter((v) => norm(v) === 'zh-tw');
      // 同為 zh-TW 時優先挑神經網路／雲端語音（Natural、Online、Google），品質遠高於舊式離線語音
      const best = (list) =>
        list.find((v) => /natural|neural|online|google/i.test(v.name)) || list[0] || null;
      this.zhVoice =
        best(tw) ||
        best(voices.filter((v) => /^zh-cn|^cmn/.test(norm(v)))) ||
        best(voices.filter((v) => norm(v).startsWith('zh'))) ||
        null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) this._stopAudio();
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  _stopAudio() {
    if (this._audio) {
      this._audio.pause();
      this._audio = null;
    }
  }

  /**
   * 播放「單一注音符號」的標準發音。
   * 優先播放預錄／預先合成的音檔（public/audio/zhuyin/<id>.mp3，所有裝置發音一致），
   * 檔案不存在或播放失敗時，才退回瀏覽器語音合成。
   */
  speakSymbol(item, fallbackText) {
    if (this.muted || !item) return;
    const text = fallbackText || item.audioText || item.zhuyin;
    if (typeof Audio === 'undefined' || !item.id) {
      this.speak(text);
      return;
    }
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      this._stopAudio();
      const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
      const audio = new Audio(`${base}audio/zhuyin/${item.id}.mp3`);
      this._audio = audio;
      audio.onerror = () => {
        if (this._audio === audio) this.speak(text);
      };
      audio.play().catch(() => {
        if (this._audio === audio) this.speak(text);
      });
    } catch {
      this.speak(text);
    }
  }

  /**
   * 播放「組合後的整個音節」（含聲調）。
   * text 是該音節＋聲調的代表字（輕聲則是輕聲字在詞尾的示範詞）；audioKey 對應預錄音檔檔名。
   */
  speakSyllable(text, audioKey) {
    if (this.muted || !text) return;
    const fallback = () => this.speak(text, 0.75);
    if (!USE_SYLLABLE_AUDIO_FILES || !audioKey || typeof Audio === 'undefined') {
      fallback();
      return;
    }
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      this._stopAudio();
      const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
      const audio = new Audio(`${base}audio/syllable/${encodeURIComponent(audioKey)}.mp3`);
      this._audio = audio;
      audio.onerror = () => {
        if (this._audio === audio) fallback();
      };
      audio.play().catch(() => {
        if (this._audio === audio) fallback();
      });
    } catch {
      fallback();
    }
  }

  /**
   * 播放國語發音（採用 zh-TW 語音合成）
   */
  speak(text, rate = 0.9) {
    if (this.muted || !text) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-TW';
      if (this.zhVoice) utter.voice = this.zhVoice;
      utter.rate = rate;
      utter.pitch = 1.05;
      window.speechSynthesis.speak(utter);
    } catch {
      // 忽略瀏覽器語音播放限制
    }
  }

  playTone(freq, duration = 0.1, type = 'sine', volume = 0.14, delay = 0) {
    if (this.muted) return;
    const ctx = this._ensureCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playClick() {
    this.playTone(620, 0.06, 'triangle', 0.11);
  }

  playStep() {
    this.playTone(165 + Math.random() * 25, 0.04, 'sine', 0.035);
  }

  playPortal() {
    this.playTone(440, 0.12, 'sine', 0.1, 0);
    this.playTone(554.37, 0.12, 'sine', 0.1, 0.07);
    this.playTone(659.25, 0.18, 'triangle', 0.12, 0.14);
    this.playTone(880, 0.25, 'sine', 0.12, 0.21);
  }

  playCorrect() {
    this.playTone(523.25, 0.11, 'triangle', 0.15, 0);
    this.playTone(659.25, 0.11, 'triangle', 0.15, 0.08);
    this.playTone(783.99, 0.14, 'triangle', 0.16, 0.16);
    this.playTone(1046.5, 0.28, 'sine', 0.18, 0.24);
  }

  playWrong() {
    this.playTone(230, 0.14, 'sawtooth', 0.1, 0);
    this.playTone(185, 0.2, 'sawtooth', 0.1, 0.11);
  }

  playGoldPan() {
    this.playTone(740, 0.08, 'sine', 0.1, 0);
    this.playTone(987.77, 0.1, 'sine', 0.1, 0.07);
    this.playTone(1318.5, 0.18, 'triangle', 0.12, 0.14);
  }

  playStallAction(animType) {
    if (this.muted) return;
    switch (animType) {
      case 'shake_drink':
        for (let i = 0; i < 4; i++) {
          this.playTone(320 + (i % 2) * 90, 0.06, 'triangle', 0.09, i * 0.08);
        }
        break;
      case 'sizzle_fry':
      case 'charcoal_grill':
        this.playTone(480, 0.08, 'sawtooth', 0.05, 0);
        this.playTone(620, 0.09, 'sawtooth', 0.05, 0.09);
        this.playTone(760, 0.12, 'triangle', 0.08, 0.18);
        break;
      case 'claw_grab':
        this.playTone(300, 0.12, 'square', 0.06, 0);
        this.playTone(420, 0.14, 'square', 0.06, 0.15);
        this.playTone(880, 0.2, 'sine', 0.1, 0.32);
        break;
      case 'pinball_launch':
        this.playTone(392, 0.07, 'square', 0.07, 0);
        this.playTone(587, 0.07, 'square', 0.07, 0.08);
        this.playTone(784, 0.08, 'square', 0.07, 0.16);
        this.playTone(1174, 0.16, 'triangle', 0.1, 0.24);
        break;
      default:
        this.playTone(520, 0.09, 'sine', 0.1, 0);
        this.playTone(680, 0.14, 'triangle', 0.12, 0.08);
        break;
    }
  }
}

export const soundEngine = new SoundEngine();
