import { GameEngine3D } from './game/GameEngine3D.js';
import { CHARACTER_SKINS } from './game/Player3D.js';
import { QuizUI } from './ui/QuizUI.js';
import { ICONS } from './ui/icons.js';
import { soundEngine } from './audio/soundEngine.js';
import { bgmManager } from './audio/bgmManager.js';

// 將靜態 HTML 中的 data-icon 槽位替換為統一 20px currentColor SVG
document.querySelectorAll('[data-icon]').forEach((el) => {
  const name = el.getAttribute('data-icon');
  if (ICONS[name]) el.innerHTML = ICONS[name];
});

const container = document.getElementById('game-container');
const btnZoneLearning = document.getElementById('btn-zone-learning');
const btnZoneNightmarket = document.getElementById('btn-zone-nightmarket');
const btnPassport = document.getElementById('btn-passport');
const btnGoldBook = document.getElementById('btn-gold-book');
const btnSkin = document.getElementById('btn-skin');
const btnSound = document.getElementById('btn-sound');
const soundIconSlot = document.getElementById('sound-icon-slot');
const interactFab = document.getElementById('interact-fab');
const interactFabLabel = document.getElementById('interact-fab-label');

let skinIndex = 0;
let engine = null;

const quizUI = new QuizUI({
  onModalToggle: (isOpen) => {
    if (engine) engine.setPaused(isOpen);
  },
  onProgressChange: (state) => {
    if (engine) engine.syncClearedStalls(state.clearedStalls);
  },
  onTriggerStallAction: (stallId, msg, celebrate) => {
    if (!engine) return;
    const stall = engine.getStallById(stallId);
    if (stall) {
      stall.triggerAction(msg, celebrate);
    }
    if (celebrate && engine.player) {
      engine.player.triggerCelebrate();
    }
  },
  onGotoStall: (stallId) => {
    if (!engine) return;
    if (engine.activeZone !== 'nightmarket') {
      engine.setZone('nightmarket');
    }
    const target = engine.getStallById(stallId);
    if (target) {
      const pt = target.getInteractPoint();
      engine.player.setPosition(pt.x, pt.z);
      engine.player.group.rotation.y = Math.PI;
    }
  },
});

engine = new GameEngine3D(container, {
  onZoneChange: (zoneId) => {
    bgmManager.playZone(zoneId);
    const isLearning = zoneId === 'learning';
    btnZoneLearning.classList.toggle('active', isLearning);
    btnZoneLearning.setAttribute('aria-selected', String(isLearning));
    btnZoneNightmarket.classList.toggle('active', !isLearning);
    btnZoneNightmarket.setAttribute('aria-selected', String(!isLearning));
  },
  onProximityChange: (nearestStall, nearPortal) => {
    if (nearPortal) {
      interactFab.classList.remove('hidden');
      interactFabLabel.textContent =
        engine.activeZone === 'learning' ? '進入夜市練習區 (E)' : '返回九份學堂 (E)';
    } else if (nearestStall) {
      interactFab.classList.remove('hidden');
      interactFabLabel.textContent = `開啟 ${nearestStall.name} (E)`;
    } else {
      interactFab.classList.add('hidden');
    }
  },
  onOpenStall: (stall) => {
    if (stall.id === 'gold_pan') {
      quizUI.openGoldPanning();
    } else if (stall.id === 'zhuyin_board') {
      quizUI.openCompendium('initials');
    } else if (stall.id === 'combo_lab') {
      quizUI.openComboLab();
    } else {
      quizUI.openStallChallenge(stall.config);
    }
  },
});

// 初始化 HUD 與已解鎖星號狀態
quizUI.updateHUD();
engine.syncClearedStalls(quizUI.state.clearedStalls);
engine.setZone('learning');
engine.start();

// 區域切換按鈕
btnZoneLearning.onclick = () => {
  soundEngine.playPortal();
  engine.setZone('learning');
};

btnZoneNightmarket.onclick = () => {
  soundEngine.playPortal();
  engine.setZone('nightmarket');
};

// 頂部進度開啟圖鑑／護照
btnGoldBook.onclick = () => {
  soundEngine.playClick();
  quizUI.openCompendium('initials');
};

btnPassport.onclick = () => {
  soundEngine.playClick();
  quizUI.openNightMarketPassport();
};

// 切換角色外觀
const skinLabelEl = document.getElementById('hud-skin-label');
btnSkin.onclick = () => {
  soundEngine.playClick();
  skinIndex = (skinIndex + 1) % CHARACTER_SKINS.length;
  const nextSkin = CHARACTER_SKINS[skinIndex];
  if (skinLabelEl) {
    skinLabelEl.textContent = nextSkin.label.replace(/^[^\s]+\s*/, '');
  }
  engine.setCharacterSkin(nextSkin.id);
};

// 視角控制列
document.getElementById('btn-cam-left').onclick = () => {
  soundEngine.playClick();
  engine.adjustCamera(0.32, 0, 0);
};
document.getElementById('btn-cam-right').onclick = () => {
  soundEngine.playClick();
  engine.adjustCamera(-0.32, 0, 0);
};
document.getElementById('btn-cam-up').onclick = () => {
  soundEngine.playClick();
  engine.adjustCamera(0, 0.12, 0);
};
document.getElementById('btn-cam-down').onclick = () => {
  soundEngine.playClick();
  engine.adjustCamera(0, -0.12, 0);
};
document.getElementById('btn-cam-in').onclick = () => {
  soundEngine.playClick();
  engine.adjustCamera(0, 0, -2.0);
};
document.getElementById('btn-cam-out').onclick = () => {
  soundEngine.playClick();
  engine.adjustCamera(0, 0, 2.0);
};
document.getElementById('btn-cam-reset').onclick = () => {
  soundEngine.playClick();
  engine.resetCamera();
};

// 靜音切換
btnSound.onclick = () => {
  const nextMuted = !soundEngine.muted;
  soundEngine.setMuted(nextMuted);
  bgmManager.setMuted(nextMuted);
  soundIconSlot.innerHTML = nextMuted ? ICONS.volumeOff : ICONS.volumeOn;
  btnSound.classList.toggle('is-muted', nextMuted);
};

// 浮動互動鈕
interactFab.onclick = () => {
  engine.interactNearest();
};

// 虛擬方向鍵控制
document.querySelectorAll('.dpad-btn').forEach((btn) => {
  const dx = Number(btn.dataset.x || 0);
  const dz = Number(btn.dataset.z || 0);

  const press = (e) => {
    e.preventDefault();
    engine.setVirtualInput(dx, dz);
  };
  const release = (e) => {
    e.preventDefault();
    engine.setVirtualInput(0, 0);
  };

  btn.addEventListener('mousedown', press);
  btn.addEventListener('mouseup', release);
  btn.addEventListener('mouseleave', release);
  btn.addEventListener('touchstart', press, { passive: false });
  btn.addEventListener('touchend', release, { passive: false });
});
