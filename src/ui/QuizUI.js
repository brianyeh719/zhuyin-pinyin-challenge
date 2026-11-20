import {
  ZHUYIN_INITIALS,
  ZHUYIN_FINALS,
  ALL_ZHUYIN_SYMBOLS,
  TONE_MARKS,
} from '../data/zhuyinData.js';
import { NIGHT_MARKET_STALLS } from '../data/stallsData.js';
import { soundEngine } from '../audio/soundEngine.js';
import { bgmManager } from '../audio/bgmManager.js';
import { icon } from './icons.js';

const findSymbolById = (id) => ALL_ZHUYIN_SYMBOLS.find((s) => s.id === id) || null;

/**
 * 遊戲式互動答題與學習系統 UI 控制器
 * 遵循設計工程規範：克制色階、同心圓角、統一 SVG 圖示、零閃爍局部更新
 */
export class QuizUI {
  constructor(callbacks) {
    this.callbacks = callbacks || {};
    this.modalRoot = document.getElementById('modal-root');

    this.state = this._loadProgress();

    this.currentStall = null;
    this.selectedInitial = null;
    this.selectedFinal = null;
    this.showPinyinHint = true;

    this.goldMode = 'zhuyin_to_pinyin';
    this.currentGoldItem = null;
    this.goldLocked = false;

    this.labInitial = 'ㄋ';
    this.labFinal = 'ㄞ';
    this.labTone = '3';
  }

  _loadProgress() {
    try {
      const raw = localStorage.getItem('zhuyin_nightmarket_save_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          clearedStalls: new Set(parsed.clearedStalls || []),
          unlockedGold: new Set(parsed.unlockedGold || []),
          score: parsed.score || 0,
          streak: parsed.streak || 0,
        };
      }
    } catch {
      // 忽略讀取錯誤
    }
    return {
      clearedStalls: new Set(),
      unlockedGold: new Set(),
      score: 0,
      streak: 0,
    };
  }

  _saveProgress() {
    try {
      localStorage.setItem(
        'zhuyin_nightmarket_save_v1',
        JSON.stringify({
          clearedStalls: [...this.state.clearedStalls],
          unlockedGold: [...this.state.unlockedGold],
          score: this.state.score,
          streak: this.state.streak,
        })
      );
    } catch {
      // 忽略寫入錯誤
    }
    this.updateHUD();
    if (this.callbacks.onProgressChange) {
      this.callbacks.onProgressChange(this.state);
    }
  }

  updateHUD() {
    const goldCountEl = document.getElementById('hud-gold-count');
    const stallCountEl = document.getElementById('hud-stall-count');
    const scoreEl = document.getElementById('hud-score');
    const streakEl = document.getElementById('hud-streak');

    if (goldCountEl) goldCountEl.textContent = `${this.state.unlockedGold.size}/37`;
    if (stallCountEl) stallCountEl.textContent = `${this.state.clearedStalls.size}/${NIGHT_MARKET_STALLS.length}`;
    if (scoreEl) scoreEl.textContent = this.state.score;
    if (streakEl) streakEl.textContent = this.state.streak;
  }

  closeModal() {
    if (this._peekTimer) {
      clearTimeout(this._peekTimer);
      this._peekTimer = null;
    }
    this.modalRoot.innerHTML = '';
    this.modalRoot.classList.add('hidden');
    bgmManager.leaveLevel(); // 離開關卡：回到區域 BGM
    if (this.callbacks.onModalToggle) this.callbacks.onModalToggle(false);
  }

  _openModalHtml(html) {
    const existingBackdrop = document.getElementById('modal-backdrop');
    if (existingBackdrop && !this.modalRoot.classList.contains('hidden')) {
      existingBackdrop.innerHTML = html;
      const card = existingBackdrop.querySelector('.quiz-card');
      if (card) card.style.animation = 'none';
      return;
    }

    this.modalRoot.innerHTML = `<div class="modal-backdrop" id="modal-backdrop">${html}</div>`;
    this.modalRoot.classList.remove('hidden');
    if (this.callbacks.onModalToggle) this.callbacks.onModalToggle(true);

    const backdrop = document.getElementById('modal-backdrop');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        soundEngine.playClick();
        this.closeModal();
      }
    });
  }

  /* ============================================================
     1. 夜市攤位挑戰視窗
     ============================================================ */
  openStallChallenge(stallConfig) {
    bgmManager.playLevel(stallConfig.id);
    this.currentStall = stallConfig;
    this.selectedInitial = null;
    this.selectedFinal = null;

    const isCleared = this.state.clearedStalls.has(stallConfig.id);
    const toneObj = TONE_MARKS.find((t) => t.id === stallConfig.tone) || TONE_MARKS[0];
    const toneDisplay = toneObj.mark || 'ˉ';

    const highlightedTitle = stallConfig.name
      .split('')
      .map((ch) =>
        ch === stallConfig.targetChar
          ? `<span class="highlight-char">${ch}</span>`
          : `<span>${ch}</span>`
      )
      .join('');

    const shuffledInitials = this._shuffle([...stallConfig.initialChoices]);
    const shuffledFinals = this._shuffle([...stallConfig.finalChoices]);

    const html = `
      <div class="quiz-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="quiz-header">
          <div class="header-title-group">
            <div class="header-eyebrow">
              <span>夜市雙拼挑戰</span>
              <span class="badge-tag">國語讀音</span>
              ${isCleared ? `<span class="badge-cleared">${icon('check')} 已完成</span>` : ''}
            </div>
            <h2 id="modal-title">${stallConfig.name}</h2>
            <p class="sub-focus">考察點 · ${stallConfig.focusPoint}</p>
          </div>
          <button class="icon-close-btn" id="btn-close-modal" aria-label="關閉">${icon('close')}</button>
        </div>

        <div class="toolbar-row">
          <div class="segmented-tabs" role="tablist">
            <button class="seg-tab active" data-tab="challenge" role="tab" aria-selected="true">雙拼挑戰</button>
            <button class="seg-tab" data-tab="breakdown" role="tab" aria-selected="false">全詞讀音卡</button>
          </div>
          <button class="ghost-btn" id="btn-trigger-stall-action" title="暫時縮小視窗觀看 3D 攤位動作">
            ${icon('play', 'ui-icon play-nudge')}
            <span>觀看動作 · ${stallConfig.actionName}</span>
          </button>
        </div>

        <div id="tab-challenge" class="tab-panel active">
          <div class="prompt-surface">
            <div class="word-display">
              <div class="word-chars">${highlightedTitle}</div>
              <div class="pinyin-row ${this.showPinyinHint ? '' : 'hidden-hint'}" id="pinyin-hint-row">
                <span>${stallConfig.pinyin}</span>
                <span class="dot-sep">·</span>
                <span>目標字「${stallConfig.targetChar}」<strong>${stallConfig.targetPinyin}</strong></span>
              </div>
            </div>
            <div class="prompt-tools">
              <button class="secondary-pill" id="btn-speak-word">
                ${icon('volumeOn')}
                <span>聽國語讀音</span>
              </button>
              <button class="secondary-pill muted" id="btn-toggle-hint">
                ${icon(this.showPinyinHint ? 'eyeOff' : 'eye')}
                <span>${this.showPinyinHint ? '隱藏拼音' : '顯示拼音'}</span>
              </button>
            </div>
          </div>

          <div class="assembly-section">
            <p class="section-caption">
              點選下方注音積木，組合「<strong>${stallConfig.targetChar}</strong>」的聲母與韻母
            </p>
            <div class="assembly-slots">
              <div class="slot-box" id="slot-initial">
                <span class="slot-label">聲母</span>
                <span class="slot-val" id="slot-initial-val">?</span>
              </div>
              <span class="plus-sign" aria-hidden="true">+</span>
              <div class="slot-box" id="slot-final">
                <span class="slot-label">韻母</span>
                <span class="slot-val" id="slot-final-val">?</span>
              </div>
              <span class="plus-sign" aria-hidden="true">+</span>
              <div class="slot-box tone-fixed">
                <span class="slot-label">${toneObj.label.slice(0, 2)}</span>
                <span class="slot-val">${toneDisplay}</span>
              </div>
            </div>
          </div>

          <div class="choices-grid-two">
            <div class="choice-column">
              <div class="col-title">聲母</div>
              <div class="tile-grid" id="initial-tiles">
                ${shuffledInitials
                  .map((sym) => `<button class="zhuyin-tile" data-type="initial" data-val="${sym}">${sym}</button>`)
                  .join('')}
              </div>
            </div>
            <div class="choice-column">
              <div class="col-title">韻母</div>
              <div class="tile-grid" id="final-tiles">
                ${shuffledFinals
                  .map((sym) => `<button class="zhuyin-tile" data-type="final" data-val="${sym}">${sym}</button>`)
                  .join('')}
              </div>
            </div>
          </div>

          <div id="quiz-feedback" class="feedback-banner hidden" role="status"></div>

          <div class="quiz-footer">
            <button class="secondary-btn" id="btn-clear-slots">重選</button>
            <button class="primary-btn" id="btn-submit-stall">確認雙拼答案</button>
          </div>
        </div>

        <div id="tab-breakdown" class="tab-panel">
          <div class="breakdown-panel">
            ${this._renderWordBreakdown(stallConfig)}
            <div class="tip-callout">
              <strong>教學考察點</strong>
              <p>${stallConfig.focusTip}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this._openModalHtml(html);
    soundEngine.speak(stallConfig.audioText || stallConfig.name);
    this._bindStallModalEvents(stallConfig);
  }

  _renderWordBreakdown(stall) {
    const chars = stall.name.split('');
    const pinyins = stall.pinyin.split(/\s+/);
    const zhuyins = stall.zhuyin.split(/\s+/);

    return `
      <div class="char-cards-row">
        ${chars
          .map(
            (ch, idx) => `
          <button class="char-detail-card ${ch === stall.targetChar ? 'is-target' : ''}" data-speak="${ch}">
            <span class="cd-zhuyin">${zhuyins[idx] || ''}</span>
            <span class="cd-char">${ch}</span>
            <span class="cd-pinyin">${pinyins[idx] || ''}</span>
            <span class="cd-audio">${icon('volumeOn')}</span>
          </button>
        `
          )
          .join('')}
      </div>
      <div class="full-read-row">
        <button class="secondary-pill" id="btn-speak-full-card">
          ${icon('volumeOn')}
          <span>完整朗讀「${stall.name}」</span>
        </button>
      </div>
    `;
  }

  _bindStallModalEvents(stall) {
    document.getElementById('btn-close-modal').onclick = () => {
      soundEngine.playClick();
      this.closeModal();
    };

    document.getElementById('btn-speak-word').onclick = () => {
      soundEngine.speak(stall.audioText || stall.name);
    };

    const fullCardBtn = document.getElementById('btn-speak-full-card');
    if (fullCardBtn) {
      fullCardBtn.onclick = () => soundEngine.speak(stall.name);
    }

    document.querySelectorAll('.char-detail-card').forEach((btn) => {
      btn.onclick = () => soundEngine.speak(btn.dataset.speak);
    });

    document.getElementById('btn-toggle-hint').onclick = (e) => {
      soundEngine.playClick();
      this.showPinyinHint = !this.showPinyinHint;
      const hintRow = document.getElementById('pinyin-hint-row');
      hintRow.classList.toggle('hidden-hint', !this.showPinyinHint);
      const btn = e.currentTarget;
      btn.innerHTML = `${icon(this.showPinyinHint ? 'eyeOff' : 'eye')}<span>${this.showPinyinHint ? '隱藏拼音' : '顯示拼音'}</span>`;
    };

    document.getElementById('btn-trigger-stall-action').onclick = () => {
      soundEngine.playClick();
      soundEngine.playStallAction(stall.animType);
      if (this.callbacks.onTriggerStallAction) {
        this.callbacks.onTriggerStallAction(stall.id, stall.actionVerb, false);
      }

      const backdrop = document.getElementById('modal-backdrop');
      if (!backdrop) return;

      backdrop.classList.add('peeking');
      let peekBanner = document.getElementById('peek-banner');
      if (!peekBanner) {
        peekBanner = document.createElement('button');
        peekBanner.id = 'peek-banner';
        peekBanner.className = 'peek-banner';
        peekBanner.innerHTML = `${icon('play', 'ui-icon play-nudge')} <span><strong>${stall.actionName}</strong> · ${stall.actionVerb}</span> <span class="peek-return">點擊返回題目</span>`;
        backdrop.appendChild(peekBanner);
      }

      const restoreModal = () => {
        if (this._peekTimer) {
          clearTimeout(this._peekTimer);
          this._peekTimer = null;
        }
        backdrop.classList.remove('peeking');
        if (peekBanner && peekBanner.parentNode) {
          peekBanner.remove();
        }
      };

      peekBanner.onclick = (ev) => {
        ev.stopPropagation();
        soundEngine.playClick();
        restoreModal();
      };

      if (this._peekTimer) clearTimeout(this._peekTimer);
      this._peekTimer = setTimeout(restoreModal, 2400);
    };

    document.querySelectorAll('.segmented-tabs .seg-tab').forEach((tabBtn) => {
      tabBtn.onclick = () => {
        soundEngine.playClick();
        document.querySelectorAll('.segmented-tabs .seg-tab').forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
        tabBtn.classList.add('active');
        tabBtn.setAttribute('aria-selected', 'true');
        document.getElementById(`tab-${tabBtn.dataset.tab}`).classList.add('active');
      };
    });

    document.querySelectorAll('.zhuyin-tile').forEach((tile) => {
      tile.onclick = () => {
        soundEngine.playClick();
        const type = tile.dataset.type;
        const val = tile.dataset.val;
        if (type === 'initial') {
          this.selectedInitial = val;
          document.getElementById('slot-initial-val').textContent = val;
          document.getElementById('slot-initial').classList.add('filled');
          document.querySelectorAll('#initial-tiles .zhuyin-tile').forEach((t) => t.classList.remove('selected'));
        } else {
          this.selectedFinal = val;
          document.getElementById('slot-final-val').textContent = val;
          document.getElementById('slot-final').classList.add('filled');
          document.querySelectorAll('#final-tiles .zhuyin-tile').forEach((t) => t.classList.remove('selected'));
        }
        tile.classList.add('selected');
      };
    });

    document.getElementById('btn-clear-slots').onclick = () => {
      soundEngine.playClick();
      this.selectedInitial = null;
      this.selectedFinal = null;
      document.getElementById('slot-initial-val').textContent = '?';
      document.getElementById('slot-final-val').textContent = '?';
      document.getElementById('slot-initial').classList.remove('filled', 'wrong-slot');
      document.getElementById('slot-final').classList.remove('filled', 'wrong-slot');
      document.querySelectorAll('.zhuyin-tile').forEach((t) => t.classList.remove('selected'));
      document.getElementById('quiz-feedback').classList.add('hidden');
    };

    document.getElementById('btn-submit-stall').onclick = () => {
      this._submitStallAnswer(stall);
    };
  }

  _submitStallAnswer(stall) {
    const fb = document.getElementById('quiz-feedback');
    const slotInit = document.getElementById('slot-initial');
    const slotFin = document.getElementById('slot-final');
    slotInit.classList.remove('wrong-slot');
    slotFin.classList.remove('wrong-slot');

    if (!this.selectedInitial || !this.selectedFinal) {
      soundEngine.playWrong();
      fb.className = 'feedback-banner warn';
      fb.textContent = '請先分別點選一個「聲母」與一個「韻母」積木。';
      return;
    }

    const initOk = this.selectedInitial === stall.initial;
    const finOk = this.selectedFinal === stall.final;

    if (initOk && finOk) {
      soundEngine.playCorrect();
      soundEngine.speak(stall.audioText || stall.name);
      const firstClear = !this.state.clearedStalls.has(stall.id);
      this.state.clearedStalls.add(stall.id);
      this.state.streak += 1;
      this.state.score += firstClear ? 100 + this.state.streak * 10 : 25;
      this._saveProgress();

      if (this.callbacks.onTriggerStallAction) {
        this.callbacks.onTriggerStallAction(stall.id, `${stall.actionVerb}`, true);
      }

      fb.className = 'feedback-banner success';
      fb.innerHTML = `
        <strong>拼對了 · ${stall.targetChar}（${stall.targetZhuyin} / ${stall.targetPinyin}）</strong>
        <p>${stall.focusTip}</p>
        <p class="action-toast">${stall.actionVerb}</p>
      `;

      const submitBtn = document.getElementById('btn-submit-stall');
      submitBtn.textContent = '繼續逛夜市';
      submitBtn.onclick = () => {
        soundEngine.playClick();
        this.closeModal();
      };
    } else {
      soundEngine.playWrong();
      this.state.streak = 0;
      this._saveProgress();

      if (!initOk) slotInit.classList.add('wrong-slot');
      if (!finOk) slotFin.classList.add('wrong-slot');

      const hintParts = [];
      if (!initOk) hintParts.push('聲母');
      if (!finOk) hintParts.push('韻母');

      fb.className = 'feedback-banner error';
      fb.innerHTML = `<strong>${hintParts.join('與')}還不太正確</strong><p>可點擊「聽國語讀音」或切換至「全詞讀音卡」確認。</p>`;
    }
  }

  /* ============================================================
     2. 學習區：九份溪邊淘金（37 符號識別挑戰）
     ============================================================ */
  openGoldPanning() {
    bgmManager.playLevel('gold_pan');
    this.goldLocked = false;
    const uncollected = ALL_ZHUYIN_SYMBOLS.filter((s) => !this.state.unlockedGold.has(s.id));
    const pool = uncollected.length > 0 ? uncollected : ALL_ZHUYIN_SYMBOLS;
    const target = pool[Math.floor(Math.random() * pool.length)];
    this.currentGoldItem = target;

    const isZhToPy = this.goldMode === 'zhuyin_to_pinyin';
    const promptSymbol = isZhToPy ? target.zhuyin : target.pinyin;

    const optionItems = [target];
    for (const cZh of target.confusable || []) {
      const found = ALL_ZHUYIN_SYMBOLS.find((x) => x.zhuyin === cZh);
      if (found && !optionItems.includes(found) && optionItems.length < 4) {
        optionItems.push(found);
      }
    }
    while (optionItems.length < 4) {
      const rnd = ALL_ZHUYIN_SYMBOLS[Math.floor(Math.random() * ALL_ZHUYIN_SYMBOLS.length)];
      if (!optionItems.includes(rnd)) optionItems.push(rnd);
    }
    const choices = this._shuffle(optionItems);

    const html = `
      <div class="quiz-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="quiz-header">
          <div class="header-title-group">
            <div class="header-eyebrow">
              <span>九份學堂</span>
              <span class="tabular-count">${this.state.unlockedGold.size}/37 已收錄</span>
            </div>
            <h2 id="modal-title">九份淘金 · 聲韻識別</h2>
            <p class="sub-focus">${target.group} · 易混淆符號對比練習</p>
          </div>
          <div class="header-actions">
            <button class="secondary-pill" id="btn-open-compendium">
              ${icon('book')}
              <span>金砂圖鑑</span>
            </button>
            <button class="icon-close-btn" id="btn-close-modal" aria-label="關閉">${icon('close')}</button>
          </div>
        </div>

        <div class="toolbar-row">
          <div class="segmented-tabs">
            <button class="seg-tab ${isZhToPy ? 'active' : ''}" id="mode-zh-py">注音選拼音</button>
            <button class="seg-tab ${!isZhToPy ? 'active' : ''}" id="mode-py-zh">拼音選注音</button>
          </div>
          <button class="secondary-pill" id="btn-speak-gold">
            ${icon('volumeOn')}
            <span>聽發音</span>
          </button>
        </div>

        <div class="jiufen-stage">
          <div class="gold-nugget-display">
            <div class="nugget-plaque">
              <span class="nugget-symbol">${promptSymbol}</span>
            </div>
            <span class="nugget-caption">${target.id.toUpperCase()}</span>
          </div>

          <div class="jiufen-choices-area">
            <div class="col-title">${isZhToPy ? '選出對應的漢語拼音' : '選出對應的注音符號'}</div>
            <div class="jiufen-options-grid">
              ${choices
                .map(
                  (c) => `
                <button class="jiufen-opt-btn" data-id="${c.id}">
                  ${isZhToPy ? c.pinyin : c.zhuyin}
                </button>
              `
                )
                .join('')}
            </div>
          </div>
        </div>

        <div id="gold-feedback" class="feedback-banner hidden" role="status"></div>

        <div class="quiz-footer">
          <button class="primary-btn" id="btn-gold-next">繼續淘金</button>
        </div>
      </div>
    `;

    this._openModalHtml(html);
    soundEngine.speakSymbol(target);

    document.getElementById('btn-close-modal').onclick = () => this.closeModal();
    document.getElementById('btn-open-compendium').onclick = () => {
      soundEngine.playClick();
      this.openCompendium();
    };
    document.getElementById('btn-speak-gold').onclick = () => soundEngine.speakSymbol(target);
    document.getElementById('mode-zh-py').onclick = () => {
      soundEngine.playClick();
      this.goldMode = 'zhuyin_to_pinyin';
      this.openGoldPanning();
    };
    document.getElementById('mode-py-zh').onclick = () => {
      soundEngine.playClick();
      this.goldMode = 'pinyin_to_zhuyin';
      this.openGoldPanning();
    };
    document.getElementById('btn-gold-next').onclick = () => {
      soundEngine.playGoldPan();
      if (this.callbacks.onTriggerStallAction) {
        this.callbacks.onTriggerStallAction('gold_pan', '淘出新金砂', false);
      }
      this.openGoldPanning();
    };

    document.querySelectorAll('.jiufen-opt-btn').forEach((btn) => {
      btn.onclick = () => {
        if (this.goldLocked) return;
        const pickedId = btn.dataset.id;
        const fb = document.getElementById('gold-feedback');
        if (pickedId === target.id) {
          this.goldLocked = true;
          btn.classList.add('correct');
          soundEngine.playCorrect();
          const isNew = !this.state.unlockedGold.has(target.id);
          this.state.unlockedGold.add(target.id);
          this.state.streak += 1;
          this.state.score += isNew ? 40 : 15;
          this._saveProgress();

          if (this.callbacks.onTriggerStallAction) {
            this.callbacks.onTriggerStallAction('gold_pan', `收錄 ${target.zhuyin}`, true);
          }

          fb.className = 'feedback-banner success';
          fb.innerHTML = `
            <strong>淘金成功 · ${target.zhuyin} = ${target.pinyin}</strong>
            <p>例詞：${target.example}</p>
            ${target.specialTip ? `<div class="special-tip-box">${target.specialTip}</div>` : ''}
          `;
        } else {
          btn.classList.add('wrong');
          soundEngine.playWrong();
          this.state.streak = 0;
          this._saveProgress();
          fb.className = 'feedback-banner error';
          fb.textContent = '這塊金砂不太對，點擊上方「聽發音」再試一次。';
        }
      };
    });
  }

  /* ============================================================
     3. 學習區：37 符號全圖鑑學習牆
     ============================================================ */
  openCompendium(defaultTab = 'initials') {
    bgmManager.playLevel('zhuyin_board');
    const renderCards = (list) =>
      list
        .map((item) => {
          const unlocked = this.state.unlockedGold.has(item.id);
          return `
            <button class="symbol-book-card ${unlocked ? 'unlocked' : ''}" data-speak="${item.audioText}" data-id="${item.id}">
              <div class="sb-top">
                <span class="sb-zhuyin">${item.zhuyin}</span>
                <span class="sb-status">${unlocked ? icon('check') : icon('volumeOn')}</span>
              </div>
              <div class="sb-pinyin">${item.pinyin}</div>
              <div class="sb-example">${item.example}</div>
            </button>
          `;
        })
        .join('');

    const html = `
      <div class="quiz-card wide-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="quiz-header">
          <div class="header-title-group">
            <div class="header-eyebrow">
              <span>九份學堂</span>
              <span class="tabular-count">${this.state.unlockedGold.size}/37 已解鎖</span>
            </div>
            <h2 id="modal-title">注音 × 拼音 37 符學習圖鑑</h2>
            <p class="sub-focus">點擊任一符號卡片即可聆聽國語發音</p>
          </div>
          <button class="icon-close-btn" id="btn-close-modal" aria-label="關閉">${icon('close')}</button>
        </div>

        <div class="toolbar-row">
          <div class="segmented-tabs">
            <button class="seg-tab ${defaultTab === 'initials' ? 'active' : ''}" data-tab="initials">21 個聲母</button>
            <button class="seg-tab ${defaultTab === 'finals' ? 'active' : ''}" data-tab="finals">16 個韻母（含介母）</button>
          </div>
          <button class="primary-btn compact-primary" id="btn-go-gold-pan">進入九份淘金測驗</button>
        </div>

        <div id="tab-initials" class="tab-panel ${defaultTab === 'initials' ? 'active' : ''}">
          <div class="symbol-book-grid">${renderCards(ZHUYIN_INITIALS)}</div>
          <div class="tip-callout">
            <strong>平翹舌對比口訣</strong>
            <p>翹舌音 <code>ㄓ ㄔ ㄕ ㄖ (zh ch sh r)</code> 舌尖需上翹；平舌音 <code>ㄗ ㄘ ㄙ (z c s)</code> 舌尖平伸抵齒背。</p>
          </div>
        </div>

        <div id="tab-finals" class="tab-panel ${defaultTab === 'finals' ? 'active' : ''}">
          <div class="symbol-book-grid">${renderCards(ZHUYIN_FINALS)}</div>
          <div class="tip-callout">
            <strong>隱藏教學點（ㄝ / ê）</strong>
            <p><code>ㄝ</code> 在拼音中單用才寫 <code>ê</code>，與聲母或介母拼時寫作 <code>e</code>（如「耶」<code>yē = ㄧㄝ</code>）。</p>
          </div>
        </div>
      </div>
    `;

    this._openModalHtml(html);

    document.getElementById('btn-close-modal').onclick = () => this.closeModal();
    document.getElementById('btn-go-gold-pan').onclick = () => {
      soundEngine.playClick();
      this.openGoldPanning();
    };

    document.querySelectorAll('.segmented-tabs .seg-tab[data-tab]').forEach((btn) => {
      btn.onclick = () => {
        soundEngine.playClick();
        document.querySelectorAll('.segmented-tabs .seg-tab[data-tab]').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      };
    });

    document.querySelectorAll('.symbol-book-card').forEach((card) => {
      card.onclick = () => {
        soundEngine.speakSymbol(findSymbolById(card.dataset.id), card.dataset.speak);
      };
    });
  }

  /* ============================================================
     4. 學習區：自由聲韻雙拼實驗桌（零閃爍局部更新）
     ============================================================ */
  openComboLab() {
    bgmManager.playLevel('combo_lab');
    const html = `
      <div class="quiz-card wide-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="quiz-header">
          <div class="header-title-group">
            <div class="header-eyebrow"><span>九份學堂</span></div>
            <h2 id="modal-title">雙拼積木實驗桌</h2>
            <p class="sub-focus">自由挑選聲母、韻母與聲調，即時對照拼音與夜市實戰詞彙</p>
          </div>
          <button class="icon-close-btn" id="btn-close-modal" aria-label="關閉">${icon('close')}</button>
        </div>

        <div class="lab-preview-bar">
          <div class="lab-result-pill">
            <span class="lab-zhuyin" id="lab-zhuyin"></span>
            <span class="lab-pinyin" id="lab-pinyin-text"></span>
          </div>
          <button class="secondary-pill" id="btn-lab-speak">
            ${icon('volumeOn')}
            <span>試聽組合參考音</span>
          </button>
        </div>

        <div id="lab-matched-callout"></div>

        <div class="lab-selectors">
          <div>
            <div class="col-title">聲母（21 個）</div>
            <div class="mini-tile-grid">
              ${ZHUYIN_INITIALS.map(
                (i) =>
                  `<button class="mini-tile ${i.zhuyin === this.labInitial ? 'selected' : ''}" data-kind="init" data-val="${i.zhuyin}">${i.zhuyin}<small>${i.pinyin}</small></button>`
              ).join('')}
            </div>
          </div>
          <div>
            <div class="col-title">韻母（16 個）</div>
            <div class="mini-tile-grid">
              ${ZHUYIN_FINALS.map(
                (f) =>
                  `<button class="mini-tile ${f.zhuyin === this.labFinal ? 'selected' : ''}" data-kind="fin" data-val="${f.zhuyin}">${f.zhuyin}<small>${f.shortPinyin}</small></button>`
              ).join('')}
            </div>
          </div>
          <div>
            <div class="col-title">聲調</div>
            <div class="mini-tile-grid tones-row">
              ${TONE_MARKS.map(
                (t) =>
                  `<button class="mini-tile ${t.id === this.labTone ? 'selected' : ''}" data-kind="tone" data-val="${t.id}">${t.symbolDisplay}<small>${t.label.slice(0, 2)}</small></button>`
              ).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    this._openModalHtml(html);

    const updatePreview = () => {
      const initObj = ZHUYIN_INITIALS.find((x) => x.zhuyin === this.labInitial);
      const finObj = ZHUYIN_FINALS.find((x) => x.zhuyin === this.labFinal);
      const toneObj = TONE_MARKS.find((t) => t.id === this.labTone) || TONE_MARKS[0];
      const combinedZhuyin = `${this.labInitial}${this.labFinal}${toneObj.mark}`;
      const approxPinyin = `${initObj ? initObj.pinyin : ''}${finObj ? finObj.shortPinyin || finObj.pinyin : ''}`;

      const matchedStalls = NIGHT_MARKET_STALLS.filter(
        (s) => s.initial === this.labInitial && s.final === this.labFinal
      );

      document.getElementById('lab-zhuyin').textContent = combinedZhuyin;
      document.getElementById('lab-pinyin-text').innerHTML =
        `拼音對應 <strong>${approxPinyin}</strong> · ${toneObj.label}`;

      const callout = document.getElementById('lab-matched-callout');
      if (matchedStalls.length > 0) {
        callout.innerHTML = `<div class="tip-callout"><strong>夜市實戰關聯</strong><p>${matchedStalls
          .map((s) => `<strong>${s.name}</strong>（${s.targetChar} ${s.targetZhuyin}）`)
          .join('、')}</p></div>`;
      } else {
        callout.innerHTML = '';
      }

      document.getElementById('btn-lab-speak').onclick = () => {
        if (matchedStalls.length > 0) {
          soundEngine.speak(matchedStalls[0].targetChar);
        } else {
          // 聲母＋韻母無對應整音節檔時，依序播放兩個符號的標準音檔
          soundEngine.speakSymbol(initObj || finObj);
          if (initObj && finObj) setTimeout(() => soundEngine.speakSymbol(finObj), 900);
        }
      };
    };

    updatePreview();
    document.getElementById('btn-close-modal').onclick = () => this.closeModal();

    document.querySelectorAll('.mini-tile').forEach((btn) => {
      btn.onclick = () => {
        soundEngine.playClick();
        const kind = btn.dataset.kind;
        const val = btn.dataset.val;
        if (kind === 'init') this.labInitial = val;
        else if (kind === 'fin') this.labFinal = val;
        else if (kind === 'tone') this.labTone = val;

        document
          .querySelectorAll(`.mini-tile[data-kind="${kind}"]`)
          .forEach((el) => el.classList.toggle('selected', el.dataset.val === val));

        updatePreview();
      };
    });
  }

  /* ============================================================
     5. 夜市美食護照（17 攤位進度總覽與一鍵尋路）
     ============================================================ */
  openNightMarketPassport() {
    bgmManager.playLevel('passport');
    const html = `
      <div class="quiz-card wide-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="quiz-header">
          <div class="header-title-group">
            <div class="header-eyebrow">
              <span>練習區進度</span>
              <span class="tabular-count">${this.state.clearedStalls.size}/${NIGHT_MARKET_STALLS.length} 已完成</span>
            </div>
            <h2 id="modal-title">夜市雙拼美食護照</h2>
            <p class="sub-focus">點擊「前往攤位」將自動引導角色走至攤前開啟挑戰</p>
          </div>
          <button class="icon-close-btn" id="btn-close-modal" aria-label="關閉">${icon('close')}</button>
        </div>

        <div class="passport-grid">
          ${NIGHT_MARKET_STALLS.map((s) => {
            const done = this.state.clearedStalls.has(s.id);
            return `
              <div class="passport-item ${done ? 'done' : ''}">
                <div class="pi-head">
                  <strong>${s.name}</strong>
                  <span class="pi-status ${done ? 'is-done' : ''}">${done ? icon('check') + ' 已通關' : '未挑戰'}</span>
                </div>
                <div class="pi-phonetic">${s.zhuyin}</div>
                <div class="pi-pinyin">${s.pinyin}</div>
                <div class="pi-focus">${s.focusPoint}</div>
                <div class="pi-actions">
                  <button class="secondary-pill mini-pill" data-speak="${s.audioText || s.name}">${icon('volumeOn')}<span>讀音</span></button>
                  <button class="primary-pill mini-pill" data-goto="${s.id}"><span>前往攤位</span>${icon('arrowRight')}</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this._openModalHtml(html);

    document.getElementById('btn-close-modal').onclick = () => this.closeModal();
    document.querySelectorAll('.secondary-pill[data-speak]').forEach((btn) => {
      btn.onclick = () => soundEngine.speak(btn.dataset.speak);
    });
    document.querySelectorAll('.primary-pill[data-goto]').forEach((btn) => {
      btn.onclick = () => {
        soundEngine.playClick();
        const stallId = btn.dataset.goto;
        this.closeModal();
        if (this.callbacks.onGotoStall) {
          this.callbacks.onGotoStall(stallId);
        }
      };
    });
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
