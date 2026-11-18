import * as THREE from 'three';
import {
  createSignTexture,
  createStripedAwningTexture,
  createChalkboardTexture,
  createBubbleSpriteTexture,
  createGlowHaloTexture,
} from './textureUtils.js';

let sharedGlowTex = null;
function getGlowTexture() {
  if (!sharedGlowTex) {
    sharedGlowTex = createGlowHaloTexture();
  }
  return sharedGlowTex;
}

/**
 * 獨立 3D Q版攤位與學習設施物件（Stall3D）
 * 每個攤位皆為獨立物件，包含：
 * - 獨立位置、碰撞框、互動半徑與 Raycast 點擊識別
 * - 狀態機：'idle' | 'proximity' | 'action' | 'celebrate'
 * - 專屬待機 (idle) 與互動動作 (action) 3D 動畫與粒子特效
 */
export class Stall3D {
  constructor(config) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.animType = config.animType || 'steam_ladle';

    this.group = new THREE.Group();
    this.group.position.set(config.worldX, 0, config.worldZ);

    this.width = this.animType === 'claw_grab' ? 2.8 : 3.8;
    this.depth = this.animType === 'claw_grab' ? 2.4 : 2.6;

    this.state = 'idle';
    this.cleared = false;
    this.isHovered = false;
    this.time = Math.random() * 10;
    this.actionTimer = 0;
    this.actionDuration = 2.4;

    this.animatedParts = {};
    this.lanterns = [];
    this.particles = [];
    this.particleGroup = new THREE.Group();
    this.group.add(this.particleGroup);

    this._buildMesh();
  }

  getCollider() {
    const hw = this.width * 0.48;
    const hd = this.depth * 0.45;
    return {
      minX: this.config.worldX - hw,
      maxX: this.config.worldX + hw,
      minZ: this.config.worldZ - hd,
      maxZ: this.config.worldZ + hd,
    };
  }

  getInteractPoint() {
    return {
      x: this.config.worldX,
      z: this.config.worldZ + this.depth * 0.88,
    };
  }

  distanceTo(px, pz) {
    const dx = Math.max(0, Math.abs(px - this.config.worldX) - this.width * 0.45);
    const dz = Math.max(0, Math.abs(pz - this.config.worldZ) - this.depth * 0.45);
    return Math.hypot(dx, dz);
  }

  setCleared(val) {
    this.cleared = Boolean(val);
    if (this.starBadge) {
      this.starBadge.visible = this.cleared;
    }
  }

  triggerAction(message = '', celebrate = false) {
    this.state = celebrate ? 'celebrate' : 'action';
    this.actionTimer = this.actionDuration;
    this._spawnParticles(celebrate ? 18 : 10, true);
    if (message) {
      this._setBubble(message, 'action');
    }
  }

  _setBubble(text, variant = 'prompt') {
    if (!this.bubbleSprite) return;
    if (this.lastBubbleText === text && this.lastBubbleVariant === variant) {
      this.bubbleSprite.visible = true;
      return;
    }
    this.lastBubbleText = text;
    this.lastBubbleVariant = variant;
    if (this.bubbleSprite.material.map) {
      this.bubbleSprite.material.map.dispose();
    }
    this.bubbleSprite.material.map = createBubbleSpriteTexture(text, variant);
    this.bubbleSprite.material.needsUpdate = true;
    this.bubbleSprite.visible = true;
  }

  _buildMesh() {
    // 1. 地面互動發光環
    const ringGeo = new THREE.RingGeometry(
      Math.max(this.width, this.depth) * 0.56,
      Math.max(this.width, this.depth) * 0.64,
      36
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
    });
    this.proximityRing = new THREE.Mesh(ringGeo, ringMat);
    this.proximityRing.rotation.x = -Math.PI / 2;
    this.proximityRing.position.y = 0.03;
    this.group.add(this.proximityRing);

    // 2. 攤位本體根節點
    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    if (this.animType === 'claw_grab') {
      this._buildClawMachine();
    } else if (this.animType === 'fish_scoop') {
      this._buildGoldfishPool();
    } else if (this.animType === 'pinball_launch') {
      this._buildPinballArcade();
    } else if (this.animType === 'gold_pan') {
      this._buildGoldPanStation();
    } else if (this.animType === 'zhuyin_board') {
      this._buildZhuyinBoardStation();
    } else if (this.animType === 'combo_lab') {
      this._buildComboLabStation();
    } else {
      this._buildFoodStall();
    }

    // 3. 通用招牌（斜向鏡頭，清楚易讀且不遮擋店員與商品）
    this._buildSignboard();

    // 4. 通關金星徽章
    const starGeo = new THREE.OctahedronGeometry(0.32, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      metalness: 0.3,
      roughness: 0.2,
    });
    this.starBadge = new THREE.Mesh(starGeo, starMat);
    this.starBadge.position.set(this.width * 0.44, 3.65, 0.9);
    this.starBadge.visible = false;
    this.bodyGroup.add(this.starBadge);

    // 5. 漂浮文字提示 Sprite
    const spriteMat = new THREE.SpriteMaterial({
      transparent: true,
      depthTest: false,
    });
    this.bubbleSprite = new THREE.Sprite(spriteMat);
    this.bubbleSprite.position.set(0, 4.45, 0.4);
    this.bubbleSprite.scale.set(4.1, 0.9, 1);
    this.bubbleSprite.visible = false;
    this.group.add(this.bubbleSprite);

    // 6. Raycast 點擊盒
    const hitGeo = new THREE.BoxGeometry(this.width, 3.8, this.depth);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitMesh = new THREE.Mesh(hitGeo, hitMat);
    this.hitMesh.position.y = 1.9;
    this.hitMesh.userData.stallId = this.id;
    this.group.add(this.hitMesh);
  }

  _buildSignboard() {
    const tex = createSignTexture(
      this.config.iconEmoji,
      this.config.name,
      this.config.signBg || '#fff7e6',
      this.config.awningColors?.[0] || '#d97706'
    );
    const signGeo = new THREE.BoxGeometry(2.85, 0.96, 0.14);
    const frontMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.55,
      emissive: 0xfff5d6,
      emissiveMap: tex,
      emissiveIntensity: 0.1,
    });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 });
    const sign = new THREE.Mesh(signGeo, [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat]);

    const isFood =
      this.animType !== 'claw_grab' &&
      this.animType !== 'fish_scoop' &&
      this.animType !== 'pinball_launch' &&
      this.animType !== 'gold_pan' &&
      this.animType !== 'zhuyin_board' &&
      this.animType !== 'combo_lab';

    const signY = isFood ? 3.12 : this.animType === 'claw_grab' ? 3.22 : 2.75;
    const signZ = isFood ? 1.12 : 0.72;
    sign.position.set(0, signY, signZ);
    sign.rotation.x = -0.22; // 微微仰角面向斜上方攝影機，文字超清晰！
    sign.castShadow = true;
    this.bodyGroup.add(sign);
  }

  _addLantern(x, y, z) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);

    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.2, 6),
      new THREE.MeshBasicMaterial({ color: 0x3b1d0c })
    );
    cord.position.y = -0.1;
    pivot.add(cord);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0xff5a36,
        emissive: 0xff6b2b,
        emissiveIntensity: 1.15,
        roughness: 0.35,
      })
    );
    bulb.scale.set(1, 1.18, 1);
    bulb.position.y = -0.32;
    pivot.add(bulb);

    // 暖橘色發光光暈 Sprite
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0xffb347,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.scale.set(1.35, 1.35, 1);
    halo.position.y = -0.32;
    pivot.add(halo);

    const capMat = new THREE.MeshStandardMaterial({ color: 0xfde047 });
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 8), capMat);
    capTop.position.y = -0.14;
    const capBot = capTop.clone();
    capBot.position.y = -0.5;
    pivot.add(capTop, capBot);

    this.bodyGroup.add(pivot);
    this.lanterns.push({ pivot, bulb, halo });
  }

  _buildVendor(style) {
    if (!style) return;
    const vendor = new THREE.Group();
    // 站得稍微高一點讓 Q 版頭臉完全從櫃台後方露出來
    vendor.position.set(0, 1.08, -0.25);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdcc0, roughness: 0.65 });
    const apronMat = new THREE.MeshStandardMaterial({ color: style.apron || '#e11d48', roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: style.hair || '#4a2e1b', roughness: 0.8 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e130d });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8da1, transparent: true, opacity: 0.65 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.58, 0.4), apronMat);
    torso.position.y = 0.28;
    vendor.add(torso);

    // 圓滾滾 Q 版大頭
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 16), skinMat);
    head.position.y = 0.84;
    vendor.add(head);

    // 萌萌大眼睛＋反光高光點
    [-0.13, 0.13].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), eyeMat);
      eye.position.set(ex, 0.84, 0.36);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), shineMat);
      shine.position.set(ex + 0.02, 0.86, 0.4);
      vendor.add(eye, shine);
    });

    // 粉紅腮紅
    [-0.22, 0.22].forEach((bx) => {
      const blush = new THREE.Mesh(new THREE.CircleGeometry(0.065, 10), blushMat);
      blush.position.set(bx, 0.76, 0.37);
      vendor.add(blush);
    });

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      hairMat
    );
    hair.position.y = 0.86;
    vendor.add(hair);

    // 頭飾
    if (style.hat === 'straw') {
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.66, 0.7, 0.06, 18),
        new THREE.MeshStandardMaterial({ color: 0xf3cc6e })
      );
      brim.position.y = 1.14;
      const dome = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.42, 0.2, 14),
        new THREE.MeshStandardMaterial({ color: 0xe5b954 })
      );
      dome.position.y = 1.25;
      vendor.add(brim, dome);
    } else if (style.hat === 'headband') {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.41, 0.41, 0.11, 18),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      band.position.y = 1.02;
      vendor.add(band);
    } else if (style.hat === 'ribbon_red') {
      const bow = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.16, 0.14),
        new THREE.MeshStandardMaterial({ color: 0xfb7185 })
      );
      bow.position.set(0, 1.22, 0.06);
      vendor.add(bow);
    } else if (style.hat?.startsWith('cap')) {
      const capColor = style.hat === 'cap_red' ? 0xef4444 : 0x475569;
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.46),
        new THREE.MeshStandardMaterial({ color: capColor })
      );
      cap.position.y = 0.94;
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.05, 0.3),
        new THREE.MeshStandardMaterial({ color: capColor })
      );
      visor.position.set(0, 1.06, 0.34);
      vendor.add(cap, visor);
    }

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), skinMat);
    arm.position.set(0.44, 0.44, 0.18);
    arm.rotation.z = -0.4;
    vendor.add(arm);

    this.bodyGroup.add(vendor);
    this.animatedParts.vendor = vendor;
    this.animatedParts.vendorArm = arm;
  }

  _buildFoodStall() {
    const [c1, c2] = this.config.awningColors || ['#e84a3c', '#fff8ec'];
    const woodMid = new THREE.MeshStandardMaterial({ color: 0xb8703b, roughness: 0.72 });
    const woodLight = new THREE.MeshStandardMaterial({ color: 0xe39e62, roughness: 0.62 });
    const warmInteriorMat = new THREE.MeshStandardMaterial({
      color: 0xe3b886,
      emissive: 0xd98a3b,
      emissiveIntensity: 0.14,
      roughness: 0.85,
    });

    // 攤車木頭櫃台底座（更暖亮的木色）
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.45, 1.05, 1.45), woodMid);
    counter.position.set(0, 0.525, 0.42);
    counter.castShadow = true;
    counter.receiveShadow = true;
    this.bodyGroup.add(counter);

    // 圓潤檯面桌面
    const topSlab = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.14, 1.65), woodLight);
    topSlab.position.set(0, 1.08, 0.44);
    topSlab.castShadow = true;
    this.bodyGroup.add(topSlab);

    // 溫暖明亮的攤位後背板
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(3.35, 2.5, 0.18), warmInteriorMat);
    backWall.position.set(0, 1.25, -0.88);
    backWall.castShadow = true;
    this.bodyGroup.add(backWall);

    // 四角木柱
    const postGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.65, 10);
    [-1.62, 1.62].forEach((px) => {
      const pFront = new THREE.Mesh(postGeo, woodMid);
      pFront.position.set(px, 1.325, 1.05);
      const pBack = new THREE.Mesh(postGeo, woodMid);
      pBack.position.set(px, 1.325, -0.85);
      this.bodyGroup.add(pFront, pBack);
    });

    // 抬高並適度前傾的條紋遮雨棚，確保能清楚看到內部店員與美食！
    const awningTex = createStripedAwningTexture(c1, c2, 7);
    const awningMat = new THREE.MeshStandardMaterial({
      map: awningTex,
      roughness: 0.6,
      emissive: 0xffe4b5,
      emissiveMap: awningTex,
      emissiveIntensity: 0.05,
    });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.14, 2.2), awningMat);
    awning.position.set(0, 2.74, 0.08);
    awning.rotation.x = 0.18;
    awning.castShadow = true;
    this.bodyGroup.add(awning);

    // 可愛波浪棚緣飾球
    const scallopCount = 7;
    for (let i = 0; i < scallopCount; i++) {
      const sx = -1.6 + (i * 3.2) / (scallopCount - 1);
      const col = i % 2 === 0 ? c1 : c2;
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 10, 8),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 })
      );
      puff.scale.set(1.15, 0.65, 0.6);
      puff.position.set(sx, 2.52, 1.15);
      this.bodyGroup.add(puff);
    }

    // 內部暖色燈光光暈
    const interiorGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0xffd280,
        transparent: true,
        opacity: 0.36,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    interiorGlow.scale.set(3.2, 2.2, 1);
    interiorGlow.position.set(0, 1.85, 0.15);
    this.bodyGroup.add(interiorGlow);

    // 兩側懸掛紅燈籠
    this._addLantern(-1.76, 2.38, 1.22);
    this._addLantern(1.76, 2.38, 1.22);

    // 右側小黑板菜單（對應參考圖）
    const chalkFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.78, 0.08),
      woodLight
    );
    chalkFrame.position.set(1.98, 0.55, 1.02);
    chalkFrame.rotation.y = -0.35;
    chalkFrame.rotation.x = -0.15;
    const chalkFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.45, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x26353a })
    );
    chalkFace.position.set(0, 0, 0.045);
    chalkFrame.add(chalkFace);
    this.bodyGroup.add(chalkFrame);

    // 店員
    this._buildVendor(this.config.vendorStyle);

    // 櫃台專屬商品道具（移向前緣，清楚可見！）
    this._buildCounterProps();
  }

  _buildCounterProps() {
    const propsGroup = new THREE.Group();
    propsGroup.position.set(0, 1.16, 0.74);
    this.bodyGroup.add(propsGroup);
    this.animatedParts.props = [];

    if (this.animType === 'shake_drink') {
      const cupMat = new THREE.MeshStandardMaterial({ color: 0xfff3dc, transparent: true, opacity: 0.94 });
      const teaMat = new THREE.MeshStandardMaterial({ color: 0xc98249 });
      const strawMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
      for (let i = -1; i <= 1; i++) {
        const cupGroup = new THREE.Group();
        cupGroup.position.set(i * 0.75, 0, 0);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.15, 0.54, 14), cupMat);
        cup.position.y = 0.27;
        const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.4, 14), teaMat);
        tea.position.y = 0.21;
        const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 8), strawMat);
        straw.position.set(0.04, 0.58, 0);
        straw.rotation.z = -0.15;
        cupGroup.add(cup, tea, straw);
        propsGroup.add(cupGroup);
        this.animatedParts.props.push(cupGroup);
      }
    } else if (this.animType === 'charcoal_grill') {
      const grill = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.14, 0.85),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      grill.position.y = 0.07;
      const emberMat = new THREE.MeshStandardMaterial({
        color: 0xff6b35,
        emissive: 0xff5500,
        emissiveIntensity: 1.15,
      });
      const ember = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.7), emberMat);
      ember.position.y = 0.15;
      propsGroup.add(grill, ember);
      this.animatedParts.emberMat = emberMat;

      const itemColor = this.id === 'mochi' ? 0xfffaf0 : this.id === 'dachang' ? 0xe07b28 : 0xfde047;
      for (let i = 0; i < 4; i++) {
        const food = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.14, 0.36, 6, 10),
          new THREE.MeshStandardMaterial({ color: itemColor, roughness: 0.45 })
        );
        food.rotation.x = Math.PI / 2;
        food.position.set(-0.82 + i * 0.55, 0.3, 0);
        propsGroup.add(food);
        this.animatedParts.props.push(food);
      }
    } else if (this.animType === 'glaze_sparkle') {
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.12, 0.65),
        new THREE.MeshStandardMaterial({ color: 0xb45309 })
      );
      stand.position.y = 0.06;
      propsGroup.add(stand);

      const ballColor = this.id === 'guava' ? 0x84cc16 : 0xef4444;
      for (let i = 0; i < 4; i++) {
        const skewer = new THREE.Group();
        skewer.position.set(-0.82 + i * 0.55, 0.12, 0);
        const stick = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, 0.78, 6),
          new THREE.MeshStandardMaterial({ color: 0xfef3c7 })
        );
        stick.position.y = 0.39;
        skewer.add(stick);
        for (let b = 0; b < 3; b++) {
          const berry = new THREE.Mesh(
            new THREE.SphereGeometry(0.125, 10, 10),
            new THREE.MeshStandardMaterial({ color: ballColor, roughness: 0.2, metalness: 0.1 })
          );
          berry.position.y = 0.3 + b * 0.21;
          skewer.add(berry);
        }
        propsGroup.add(skewer);
        this.animatedParts.props.push(skewer);
      }
    } else {
      const tray = new THREE.Mesh(
        new THREE.BoxGeometry(2.35, 0.16, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.35, roughness: 0.25 })
      );
      tray.position.y = 0.08;
      propsGroup.add(tray);

      const itemColor = this.animType === 'sizzle_fry' ? 0xfbbf24 : 0xd97706;
      for (let i = 0; i < 4; i++) {
        const piece = new THREE.Mesh(
          new THREE.SphereGeometry(0.21, 12, 10),
          new THREE.MeshStandardMaterial({ color: itemColor, roughness: 0.45 })
        );
        piece.scale.set(1.25, 0.8, 1.0);
        piece.position.set(-0.78 + i * 0.52, 0.27, (i % 2) * 0.12 - 0.06);
        propsGroup.add(piece);
        this.animatedParts.props.push(piece);
      }
    }
  }

  _buildClawMachine() {
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.45 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfff1f2, roughness: 0.45 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.32,
      roughness: 0.1,
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.15, 1.8), pinkMat);
    base.position.y = 0.575;
    base.castShadow = true;
    this.bodyGroup.add(base);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.45, 1.9), pinkMat);
    roof.position.y = 2.72;
    roof.castShadow = true;
    this.bodyGroup.add(roof);

    const postGeo = new THREE.BoxGeometry(0.18, 1.45, 0.18);
    [
      [-1.0, -0.8],
      [1.0, -0.8],
      [-1.0, 0.8],
      [1.0, 0.8],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, whiteMat);
      post.position.set(px, 1.8, pz);
      this.bodyGroup.add(post);
    });

    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.02, 1.38, 1.62), glassMat);
    glass.position.y = 1.8;
    this.bodyGroup.add(glass);

    // 內照明背板
    const innerPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.3),
      new THREE.MeshBasicMaterial({ color: 0xffe4f2 })
    );
    innerPanel.position.set(0, 1.8, -0.78);
    this.bodyGroup.add(innerPanel);

    const bearMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75 });
    this.animatedParts.bears = [];
    [-0.55, 0, 0.55].forEach((bx, idx) => {
      const bear = new THREE.Group();
      bear.position.set(bx, 1.35, 0);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), bearMat);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), bearMat);
      head.position.y = 0.28;
      const earL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), bearMat);
      earL.position.set(-0.14, 0.42, 0);
      const earR = earL.clone();
      earR.position.x = 0.14;
      bear.add(body, head, earL, earR);
      this.bodyGroup.add(bear);
      this.animatedParts.bears.push(bear);
      if (idx === 1) this.animatedParts.targetBear = bear;
    });

    const crane = new THREE.Group();
    crane.position.set(0, 2.45, 0);
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x64748b })
    );
    cable.position.y = -0.25;
    const clawHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.24, 6),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5 })
    );
    clawHead.position.y = -0.52;
    crane.add(cable, clawHead);
    this.bodyGroup.add(crane);
    this.animatedParts.crane = crane;
  }

  _buildGoldfishPool() {
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x4b93f5, roughness: 0.45 });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x5eead4,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.82,
      roughness: 0.15,
    });

    const wall = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.78, 2.25), poolMat);
    wall.position.y = 0.39;
    wall.castShadow = true;
    this.bodyGroup.add(wall);

    const water = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.14, 1.9), waterMat);
    water.position.y = 0.75;
    this.bodyGroup.add(water);

    this.animatedParts.fishes = [];
    for (let i = 0; i < 5; i++) {
      const fish = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 8),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xf97316 : 0xef4444 })
      );
      fish.scale.set(1.5, 0.8, 0.7);
      fish.position.set(0, 0.82, 0);
      this.bodyGroup.add(fish);
      this.animatedParts.fishes.push(fish);
    }

    const netGroup = new THREE.Group();
    netGroup.position.set(0.6, 1.08, 0.2);
    const hoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.035, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7 })
    );
    hoop.rotation.x = Math.PI / 2;
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444 })
    );
    handle.rotation.z = -0.9;
    handle.position.set(0.4, 0.18, 0);
    netGroup.add(hoop, handle);
    this.bodyGroup.add(netGroup);
    this.animatedParts.fishNet = netGroup;

    const stoolMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    [-0.95, 0.95].forEach((sx) => {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.36, 12), stoolMat);
      stool.position.set(sx, 0.18, 1.42);
      this.bodyGroup.add(stool);
    });

    this._addLantern(-1.6, 2.35, 0.8);
    this._addLantern(1.6, 2.35, 0.8);
  }

  _buildPinballArcade() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.55 });

    const stand = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.95, 1.85), bodyMat);
    stand.position.y = 0.475;
    stand.castShadow = true;
    this.bodyGroup.add(stand);

    const board = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.16, 1.6), boardMat);
    board.position.set(0, 1.15, 0.1);
    board.rotation.x = 0.32;
    this.bodyGroup.add(board);

    this.animatedParts.bulbs = [];
    const bulbColors = [0xef4444, 0x3b82f6, 0x22c55e, 0xeab308];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const bMat = new THREE.MeshStandardMaterial({
          color: bulbColors[(r + c) % 4],
          emissive: bulbColors[(r + c) % 4],
          emissiveIntensity: 0.55,
        });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), bMat);
        bulb.position.set(-0.75 + c * 0.5, 1.28 - r * 0.14, -0.25 + r * 0.45);
        this.bodyGroup.add(bulb);
        this.animatedParts.bulbs.push({ mesh: bulb, mat: bMat });
      }
    }

    const marble = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.75, roughness: 0.15 })
    );
    marble.position.set(0, 1.32, 0.15);
    this.bodyGroup.add(marble);
    this.animatedParts.marble = marble;
  }

  _buildGoldPanStation() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb06e3a, roughness: 0.75 });
    const dock = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.45, 2.25), woodMat);
    dock.position.y = 0.225;
    dock.receiveShadow = true;
    this.bodyGroup.add(dock);

    const panGroup = new THREE.Group();
    panGroup.position.set(0, 0.68, 0.22);
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.6, 0.36, 20),
      new THREE.MeshStandardMaterial({ color: 0xc97b40 })
    );
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.78, 0.06, 20),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    water.position.y = 0.15;
    panGroup.add(bowl, water);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      metalness: 0.45,
      roughness: 0.2,
    });
    for (let i = 0; i < 5; i++) {
      const nugget = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), goldMat);
      nugget.position.set(Math.cos(i * 1.2) * 0.36, 0.2, Math.sin(i * 1.2) * 0.36);
      panGroup.add(nugget);
    }

    this.bodyGroup.add(panGroup);
    this.animatedParts.goldPan = panGroup;
    this._addLantern(-1.45, 2.25, 0.6);
    this._addLantern(1.45, 2.25, 0.6);
  }

  _buildZhuyinBoardStation() {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x9c5a2d, roughness: 0.75 });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(3.55, 2.45, 0.28), frameMat);
    stand.position.set(0, 1.38, -0.2);
    stand.castShadow = true;
    this.bodyGroup.add(stand);

    const boardTex = createChalkboardTexture();
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2.0),
      new THREE.MeshStandardMaterial({
        map: boardTex,
        emissive: 0xffffff,
        emissiveMap: boardTex,
        emissiveIntensity: 0.25,
        roughness: 0.6,
      })
    );
    board.position.set(0, 1.42, -0.05);
    this.bodyGroup.add(board);

    this._addLantern(-1.6, 2.45, 0.2);
    this._addLantern(1.6, 2.45, 0.2);
  }

  _buildComboLabStation() {
    const deskMat = new THREE.MeshStandardMaterial({ color: 0xa46233, roughness: 0.75 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.98, 1.7), deskMat);
    desk.position.y = 0.49;
    desk.castShadow = true;
    this.bodyGroup.add(desk);

    const blockA = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xfb923c, emissive: 0xf97316, emissiveIntensity: 0.35 })
    );
    blockA.position.set(-0.58, 1.48, 0);
    const blockB = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.35 })
    );
    blockB.position.set(0.58, 1.48, 0);

    this.bodyGroup.add(blockA, blockB);
    this.animatedParts.blockA = blockA;
    this.animatedParts.blockB = blockB;
    this._addLantern(-1.4, 2.25, 0.5);
    this._addLantern(1.4, 2.25, 0.5);
  }

  _spawnParticles(count, isBurst = false) {
    for (let i = 0; i < count; i++) {
      let color = 0xfde047;
      let isSteam = false;
      if (this.animType === 'fish_scoop') color = 0x7dd3fc;
      else if (this.animType === 'charcoal_grill') color = 0xff7b42;
      else if (this.animType === 'claw_grab' || this.animType === 'glaze_sparkle') color = 0xff85b3;
      else if (this.animType === 'steam_ladle' && !isBurst) {
        color = 0xfffaf0;
        isSteam = true;
      }

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(isSteam ? 0.14 : 0.09, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: isSteam ? 0.45 : 0.95 })
      );
      mesh.position.set(
        (Math.random() - 0.5) * 1.6,
        1.3 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.6 + 0.55
      );
      this.particleGroup.add(mesh);

      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * (isBurst ? 2.8 : 0.4),
        vy: (isBurst ? 2.5 : 1.0) + Math.random() * (isBurst ? 2.2 : 0.6),
        vz: (Math.random() - 0.5) * (isBurst ? 2.2 : 0.4),
        life: isBurst ? 0.9 + Math.random() * 0.4 : 1.0,
        maxLife: 1.3,
        isSteam,
      });
    }
  }

  update(dt, isNearest) {
    this.time += dt;

    if (this.actionTimer > 0) {
      this.actionTimer -= dt;
      if (Math.random() < 0.35) this._spawnParticles(1, true);
      if (this.actionTimer <= 0) {
        this.state = isNearest ? 'proximity' : 'idle';
        this.bubbleSprite.visible = false;
      }
    } else {
      this.state = isNearest ? 'proximity' : 'idle';
    }

    const isAction = this.state === 'action' || this.state === 'celebrate';
    const actionRatio = isAction ? Math.max(0, this.actionTimer / this.actionDuration) : 0;

    if (this.proximityRing) {
      const targetOpacity = isAction ? 0.9 : isNearest || this.isHovered ? 0.68 : 0;
      this.proximityRing.material.opacity += (targetOpacity - this.proximityRing.material.opacity) * Math.min(1, dt * 10);
      const pulse = 1 + Math.sin(this.time * 5) * 0.04;
      this.proximityRing.scale.set(pulse, pulse, 1);
    }

    if (!isAction) {
      if (isNearest) {
        this._setBubble(`按 E / 點擊開啟【${this.name}】`, 'prompt');
      } else {
        this.bubbleSprite.visible = false;
      }
    }

    if (this.starBadge && this.starBadge.visible) {
      this.starBadge.rotation.y = this.time * 2.4;
      this.starBadge.position.y = 3.65 + Math.sin(this.time * 3.5) * 0.1;
    }

    this.lanterns.forEach((l, idx) => {
      const speed = isAction ? 9 : 2.2;
      const amp = isAction ? 0.25 : 0.08;
      l.pivot.rotation.z = Math.sin(this.time * speed + idx) * amp;
      l.bulb.material.emissiveIntensity = isAction ? 1.6 : 1.0 + Math.sin(this.time * 3 + idx) * 0.2;
      if (l.halo) {
        l.halo.material.opacity = isAction ? 0.9 : 0.58 + Math.sin(this.time * 3 + idx) * 0.12;
      }
    });

    this.bodyGroup.position.y = isAction ? Math.abs(Math.sin(this.time * 16)) * 0.14 * actionRatio : 0;

    if (this.animatedParts.vendor) {
      this.animatedParts.vendor.position.y =
        1.08 + (isAction ? Math.abs(Math.sin(this.time * 18)) * 0.16 : Math.sin(this.time * 2.8) * 0.03);
      if (this.animatedParts.vendorArm) {
        this.animatedParts.vendorArm.rotation.z = isAction
          ? -0.4 + Math.sin(this.time * 24) * 0.9
          : -0.4 + Math.sin(this.time * 3) * 0.12;
      }
    }

    if (this.animatedParts.props) {
      this.animatedParts.props.forEach((prop, idx) => {
        if (this.animType === 'shake_drink') {
          prop.position.y = isAction ? Math.abs(Math.sin(this.time * 18 + idx)) * 0.28 : Math.sin(this.time * 3 + idx) * 0.02;
          prop.rotation.z = isAction ? Math.sin(this.time * 22 + idx) * 0.25 : 0;
        } else if (this.animType === 'charcoal_grill') {
          prop.rotation.y = isAction ? this.time * 8 + idx : Math.sin(this.time * 2 + idx) * 0.15;
          prop.position.y = 0.3 + (isAction ? Math.abs(Math.sin(this.time * 15 + idx)) * 0.14 : 0);
        } else if (this.animType === 'glaze_sparkle') {
          prop.rotation.y = this.time * (isAction ? 7 : 1.1) + idx;
        } else {
          prop.position.y = 0.27 + (isAction ? Math.abs(Math.sin(this.time * 16 + idx)) * 0.18 : 0);
        }
      });
    }

    if (this.animatedParts.emberMat) {
      this.animatedParts.emberMat.emissiveIntensity = isAction
        ? 1.7 + Math.sin(this.time * 20) * 0.5
        : 0.95 + Math.sin(this.time * 4) * 0.25;
    }

    if (this.animatedParts.crane) {
      if (isAction) {
        this.animatedParts.crane.position.x = 0;
        const drop = Math.sin((1 - actionRatio) * Math.PI);
        this.animatedParts.crane.position.y = 2.45 - drop * 0.72;
        if (this.animatedParts.targetBear) {
          this.animatedParts.targetBear.position.y = 1.35 + Math.max(0, drop - 0.35) * 0.85;
        }
      } else {
        this.animatedParts.crane.position.x = Math.sin(this.time * 1.6) * 0.62;
        this.animatedParts.crane.position.y = 2.45;
        if (this.animatedParts.targetBear) {
          this.animatedParts.targetBear.position.y = 1.35 + Math.sin(this.time * 2.5) * 0.02;
        }
      }
    }

    if (this.animatedParts.fishes) {
      this.animatedParts.fishes.forEach((f, idx) => {
        const spd = isAction ? 3.2 : 1.2;
        const t = this.time * spd + idx * 1.4;
        const nx = Math.sin(t) * 1.05;
        const nz = Math.cos(t * 0.85) * 0.55;
        f.rotation.y = Math.atan2(Math.cos(t) * 1.05, -Math.sin(t * 0.85) * 0.55);
        f.position.set(nx, 0.82, nz);
      });
      if (this.animatedParts.fishNet) {
        this.animatedParts.fishNet.position.y = isAction
          ? 0.92 + Math.sin(this.time * 14) * 0.24
          : 1.08 + Math.sin(this.time * 2.4) * 0.04;
      }
    }

    if (this.animatedParts.bulbs) {
      this.animatedParts.bulbs.forEach((b, idx) => {
        const speed = isAction ? 16 : 3;
        const on = Math.sin(this.time * speed + idx * 1.3) > 0;
        b.mat.emissiveIntensity = on ? (isAction ? 1.9 : 1.0) : 0.25;
      });
      if (this.animatedParts.marble) {
        const mSpd = isAction ? 14 : 2.5;
        this.animatedParts.marble.position.x = Math.sin(this.time * mSpd) * 0.85;
        this.animatedParts.marble.position.z = Math.cos(this.time * mSpd * 1.3) * 0.45;
      }
    }

    if (this.animatedParts.goldPan) {
      if (isAction) {
        this.animatedParts.goldPan.position.x = Math.sin(this.time * 24) * 0.18;
        this.animatedParts.goldPan.rotation.z = Math.sin(this.time * 24) * 0.16;
      } else {
        this.animatedParts.goldPan.position.x = 0;
        this.animatedParts.goldPan.rotation.z = Math.sin(this.time * 2) * 0.03;
      }
    }

    if (this.animatedParts.blockA && this.animatedParts.blockB) {
      if (isAction) {
        const merge = Math.sin((1 - actionRatio) * Math.PI) * 0.26;
        this.animatedParts.blockA.position.x = -0.58 + merge;
        this.animatedParts.blockB.position.x = 0.58 - merge;
        this.animatedParts.blockA.rotation.y = this.time * 6;
        this.animatedParts.blockB.rotation.y = -this.time * 6;
      } else {
        this.animatedParts.blockA.position.x = -0.58;
        this.animatedParts.blockB.position.x = 0.58;
        this.animatedParts.blockA.position.y = 1.48 + Math.sin(this.time * 2.5) * 0.08;
        this.animatedParts.blockB.position.y = 1.48 + Math.cos(this.time * 2.5) * 0.08;
        this.animatedParts.blockA.rotation.y = this.time * 0.7;
        this.animatedParts.blockB.rotation.y = -this.time * 0.7;
      }
    }

    if (
      (this.animType === 'steam_ladle' || this.animType === 'sizzle_fry' || this.animType === 'charcoal_grill') &&
      Math.random() < dt * 2.5
    ) {
      this._spawnParticles(1, false);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (!p.isSteam) p.vy -= 5.2 * dt;
      p.life -= dt;
      p.mesh.material.opacity = Math.max(0, (p.life / p.maxLife) * (p.isSteam ? 0.45 : 0.95));
      if (p.life <= 0) {
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
}
