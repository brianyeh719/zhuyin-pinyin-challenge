import * as THREE from 'three';
import { assetLoader } from './AssetLoader3D.js';
import {
  createSignTexture,
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

const VENDOR_MODELS = [
  '/models/character-female-b.glb',
  '/models/character-male-b.glb',
  '/models/character-female-c.glb',
  '/models/character-male-c.glb',
];

const FOOD_MODEL_MAP = {
  boba: [
    { url: '/assets3d/food/frappe.glb', h: 0.62, x: -0.55, z: 0.12 },
    { url: '/assets3d/food/frappe.glb', h: 0.56, x: 0.0, z: 0.08 },
    { url: '/assets3d/food/cup-tea.glb', h: 0.44, x: 0.55, z: 0.12 },
  ],
  chicken: [
    { url: '/assets3d/food/frying-pan.glb', h: 0.34, x: -0.42, z: 0.05 },
    { url: '/assets3d/food/meat-cooked.glb', h: 0.44, x: 0.35, z: 0.08 },
  ],
  stinky_tofu: [
    { url: '/assets3d/food/pot-stew.glb', h: 0.52, x: -0.45, z: 0.02 },
    { url: '/assets3d/food/plate-dinner.glb', h: 0.32, x: 0.45, z: 0.1 },
  ],
  corn: [
    { url: '/assets3d/food/corn.glb', h: 0.44, x: -0.5, z: 0.08 },
    { url: '/assets3d/food/corn.glb', h: 0.44, x: 0.0, z: 0.08 },
    { url: '/assets3d/food/corn.glb', h: 0.44, x: 0.5, z: 0.08 },
  ],
  tanghulu: [
    { url: '/assets3d/food/skewer.glb', h: 0.62, x: -0.45, z: 0.06 },
    { url: '/assets3d/food/lollypop.glb', h: 0.58, x: 0.05, z: 0.08 },
    { url: '/assets3d/food/skewer.glb', h: 0.62, x: 0.5, z: 0.06 },
  ],
  dachang: [
    { url: '/assets3d/food/meat-sausage.glb', h: 0.4, x: -0.38, z: 0.08 },
    { url: '/assets3d/food/meat-sausage.glb', h: 0.4, x: 0.38, z: 0.08 },
  ],
  luwei: [
    { url: '/assets3d/food/pot-stew.glb', h: 0.52, x: -0.42, z: 0.04 },
    { url: '/assets3d/food/bowl-broth.glb', h: 0.42, x: 0.42, z: 0.1 },
  ],
  pork_ribs: [
    { url: '/assets3d/food/meat-ribs.glb', h: 0.46, x: -0.35, z: 0.08 },
    { url: '/assets3d/food/frying-pan.glb', h: 0.34, x: 0.45, z: 0.06 },
  ],
  meatball: [
    { url: '/assets3d/food/steamer.glb', h: 0.48, x: -0.4, z: 0.04 },
    { url: '/assets3d/food/dim-sum.glb', h: 0.4, x: 0.42, z: 0.1 },
  ],
  fish_ball: [
    { url: '/assets3d/food/bowl-soup.glb', h: 0.46, x: -0.35, z: 0.08 },
    { url: '/assets3d/food/skewer.glb', h: 0.58, x: 0.45, z: 0.08 },
  ],
  guava: [
    { url: '/assets3d/food/pear.glb', h: 0.44, x: -0.45, z: 0.08 },
    { url: '/assets3d/food/cutting-board.glb', h: 0.25, x: 0.35, z: 0.06 },
    { url: '/assets3d/food/pear.glb', h: 0.42, x: 0.35, z: 0.06, yOff: 0.08 },
  ],
  fried_squid: [
    { url: '/assets3d/food/frying-pan.glb', h: 0.34, x: -0.45, z: 0.06 },
    { url: '/assets3d/food/fish.glb', h: 0.42, x: 0.38, z: 0.1 },
  ],
  duck_head: [
    { url: '/assets3d/food/turkey.glb', h: 0.5, x: -0.32, z: 0.08 },
    { url: '/assets3d/food/chinese.glb', h: 0.44, x: 0.48, z: 0.1 },
  ],
  mochi: [
    { url: '/assets3d/food/rice-ball.glb', h: 0.38, x: -0.42, z: 0.08 },
    { url: '/assets3d/food/rice-ball.glb', h: 0.38, x: 0.05, z: 0.08 },
    { url: '/assets3d/food/skewer.glb', h: 0.56, x: 0.52, z: 0.06 },
  ],
};

/**
 * 獨立 3D 攤位與學習設施物件（採用 Kenney CC0 精緻 3D 模型與骨架動畫）
 */
export class Stall3D {
  constructor(config, index = 0) {
    this.config = config;
    this.index = index;
    this.id = config.id;
    this.name = config.name;
    this.animType = config.animType || 'steam_ladle';

    this.group = new THREE.Group();
    this.group.position.set(config.worldX, 0, config.worldZ);

    this.width = this.animType === 'claw_grab' || this.animType === 'pinball_launch' ? 2.6 : 3.5;
    this.depth = this.animType === 'claw_grab' || this.animType === 'pinball_launch' ? 2.4 : 2.5;

    this.state = 'idle';
    this.cleared = false;
    this.isHovered = false;
    this.time = Math.random() * 10;
    this.actionTimer = 0;
    this.actionDuration = 2.4;

    this.mixers = [];
    this.vendorActions = {};
    this.activeVendorAnim = null;
    this.showcaseProps = [];
    this.fishes = [];
    this.lanterns = [];
    this.particles = [];
    this.particleGroup = new THREE.Group();
    this.group.add(this.particleGroup);

    this._buildShell();
    this._loadArtAssets();
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
      z: this.config.worldZ + this.depth * 0.92,
    };
  }

  distanceTo(px, pz) {
    const dx = Math.max(0, Math.abs(px - this.config.worldX) - this.width * 0.45);
    const dz = Math.max(0, Math.abs(pz - this.config.worldZ) - this.depth * 0.45);
    return Math.hypot(dx, dyToZ(dz));

    function dyToZ(v) {
      return v;
    }
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
    this._playVendorAction(celebrate ? 'emote-yes' : 'interact-right');
    this._spawnParticles(celebrate ? 14 : 8, true);
    if (message) {
      this._setBubble(message, 'action');
    }
  }

  _playVendorAction(name) {
    if (!this.vendorMixer) return;
    let target = name;
    if (!this.vendorActions[target]) {
      target = this.vendorActions.idle ? 'idle' : Object.keys(this.vendorActions)[0];
    }
    if (!target || target === this.activeVendorAnim) return;
    const next = this.vendorActions[target];
    const prev = this.activeVendorAnim ? this.vendorActions[this.activeVendorAnim] : null;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (prev && prev !== next) {
      prev.crossFadeTo(next, 0.2, true);
    }
    this.activeVendorAnim = target;
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

  _buildShell() {
    // 1. 地面互動光環
    const ringGeo = new THREE.RingGeometry(
      Math.max(this.width, this.depth) * 0.56,
      Math.max(this.width, this.depth) * 0.63,
      36
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
    });
    this.proximityRing = new THREE.Mesh(ringGeo, ringMat);
    this.proximityRing.rotation.x = -Math.PI / 2;
    this.proximityRing.position.y = 0.03;
    this.group.add(this.proximityRing);

    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    // 2. 通用招牌
    this._buildSignboard();

    // 3. 通關星徽
    const starGeo = new THREE.OctahedronGeometry(0.28, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.75,
      metalness: 0.35,
      roughness: 0.2,
    });
    this.starBadge = new THREE.Mesh(starGeo, starMat);
    this.starBadge.position.set(this.width * 0.42, 4.1, 0.85);
    this.starBadge.visible = false;
    this.bodyGroup.add(this.starBadge);

    // 4. 漂浮文字氣泡
    this.bubbleSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ transparent: true, depthTest: false })
    );
    this.bubbleSprite.position.set(0, 4.85, 0.4);
    this.bubbleSprite.scale.set(4.1, 0.9, 1);
    this.bubbleSprite.visible = false;
    this.group.add(this.bubbleSprite);

    // 5. Raycast 點擊感應區
    const hitGeo = new THREE.BoxGeometry(this.width, 4.0, this.depth);
    this.hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
    this.hitMesh.position.y = 2.0;
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
    const signGeo = new THREE.BoxGeometry(2.65, 0.88, 0.12);
    const frontMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.5,
      emissive: 0xfff5d6,
      emissiveMap: tex,
      emissiveIntensity: 0.12,
    });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });
    const sign = new THREE.Mesh(signGeo, [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat]);

    const isArcade = this.animType === 'claw_grab' || this.animType === 'pinball_launch';
    const isLearning =
      this.animType === 'gold_pan' || this.animType === 'zhuyin_board' || this.animType === 'combo_lab';

    sign.position.set(0, isArcade ? 3.5 : isLearning ? 2.95 : 3.55, isArcade ? 0.5 : 1.05);
    sign.rotation.x = -0.22;
    sign.castShadow = true;
    this.bodyGroup.add(sign);
  }

  async _loadArtAssets() {
    if (this.animType === 'claw_grab') {
      await this._loadClawMachine();
    } else if (this.animType === 'pinball_launch') {
      await this._loadPinballArcade();
    } else if (this.animType === 'fish_scoop') {
      await this._loadGoldfishPool();
    } else if (this.animType === 'gold_pan') {
      await this._loadGoldPanStation();
    } else if (this.animType === 'zhuyin_board') {
      await this._loadZhuyinBoardStation();
    } else if (this.animType === 'combo_lab') {
      await this._loadComboLabStation();
    } else {
      await this._loadFoodStall();
    }
  }

  async _loadFoodStall() {
    // 1. 攤位主體（交錯使用 Kenney 紅棚與綠棚精緻木攤）
    const stallUrl =
      this.index % 2 === 0 ? '/assets3d/town/stall-red.glb' : '/assets3d/town/stall-green.glb';
    const { object: stallObj } = await assetLoader.createInstance(stallUrl, {
      targetHeight: 3.9,
    });
    // 旋轉 90° 使正面敞開朝向 +Z 廣場與鏡頭
    stallObj.rotation.y = Math.PI / 2;
    this.bodyGroup.add(stallObj);

    // 2. 攤位前緣垂吊小紅燈籠
    await this._attachHangingLantern(-1.45, 2.75, 1.08);
    await this._attachHangingLantern(1.45, 2.75, 1.08);

    // 3. 攤內暖光光暈
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0xffd280,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.scale.set(2.8, 2.0, 1);
    glow.position.set(0, 1.9, 0.1);
    this.bodyGroup.add(glow);

    // 4. 精緻 3D 骨架動畫店員（Kenney Mini-Characters）
    const vendorUrl = VENDOR_MODELS[this.index % VENDOR_MODELS.length];
    const { object: vendorObj, animations } = await assetLoader.createInstance(vendorUrl, {
      targetHeight: 1.85,
    });
    vendorObj.position.set(0, 0, -0.58);
    this.bodyGroup.add(vendorObj);

    if (animations.length > 0) {
      this.vendorMixer = new THREE.AnimationMixer(vendorObj);
      animations.forEach((clip) => {
        this.vendorActions[clip.name] = this.vendorMixer.clipAction(clip);
      });
      this.mixers.push(this.vendorMixer);
      this._playVendorAction('idle');
    }

    // 5. 櫃台上的專屬 3D 食物模型（y = 1.18 桌面高度）
    const foods = FOOD_MODEL_MAP[this.id] || [
      { url: '/assets3d/food/bowl-soup.glb', h: 0.45, x: 0, z: 0.08 },
    ];
    const counterTopY = 1.16;
    const counterZ = 0.62;

    for (const item of foods) {
      const { object: foodObj } = await assetLoader.createInstance(item.url, {
        targetHeight: item.h,
      });
      const baseY = counterTopY + (item.yOff || 0);
      foodObj.position.set(item.x, baseY, counterZ + (item.z || 0));
      foodObj.userData.baseY = baseY;
      this.bodyGroup.add(foodObj);
      this.showcaseProps.push(foodObj);
    }

    // 6. 旁側小板凳裝飾
    const { object: stool } = await assetLoader.createInstance('/assets3d/town/stall-stool.glb', {
      targetHeight: 0.55,
    });
    stool.position.set(1.9, 0, 0.65);
    this.bodyGroup.add(stool);
  }

  async _loadClawMachine() {
    const { object, animations } = await assetLoader.createInstance('/assets3d/arcade/claw-machine.glb', {
      targetHeight: 3.1,
    });
    this.bodyGroup.add(object);

    if (animations.length > 0) {
      const mixer = new THREE.AnimationMixer(object);
      const act = mixer.clipAction(animations[0]);
      act.play();
      this.mixers.push(mixer);
      this.clawMixer = mixer;
      this.clawAction = act;
    }

    const { object: stool } = await assetLoader.createInstance('/assets3d/town/stall-stool.glb', {
      targetHeight: 0.52,
    });
    stool.position.set(0, 0, 1.35);
    this.bodyGroup.add(stool);
  }

  async _loadPinballArcade() {
    const { object } = await assetLoader.createInstance('/assets3d/arcade/pinball.glb', {
      targetHeight: 2.75,
    });
    this.bodyGroup.add(object);

    const { object: prizes } = await assetLoader.createInstance('/assets3d/arcade/prizes.glb', {
      targetHeight: 1.4,
    });
    prizes.position.set(1.35, 0, 0.2);
    this.bodyGroup.add(prizes);
  }

  async _loadGoldfishPool() {
    // 1. 低矮木檯底座與清澈藍綠水池
    const { object: table } = await assetLoader.createInstance('/assets3d/town/stall.glb', {
      targetHeight: 0.85,
    });
    table.rotation.y = Math.PI / 2;
    table.scale.x *= 1.35;
    table.scale.z *= 1.45;
    this.bodyGroup.add(table);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 0.14, 28),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.22,
        transparent: true,
        opacity: 0.82,
        roughness: 0.15,
      })
    );
    water.position.set(0, 0.88, 0.05);
    this.bodyGroup.add(water);

    // 2. 真實 3D 魚模型游動
    for (let i = 0; i < 4; i++) {
      const { object: fish } = await assetLoader.createInstance('/assets3d/food/fish.glb', {
        targetHeight: 0.28,
      });
      fish.position.set(0, 0.94, 0.05);
      this.bodyGroup.add(fish);
      this.fishes.push(fish);
    }

    // 3. 木凳
    for (const sx of [-0.9, 0.9]) {
      const { object: stool } = await assetLoader.createInstance('/assets3d/town/stall-stool.glb', {
        targetHeight: 0.5,
      });
      stool.position.set(sx, 0, 1.35);
      this.bodyGroup.add(stool);
    }
  }

  async _loadGoldPanStation() {
    const { object: table } = await assetLoader.createInstance('/assets3d/town/stall.glb', {
      targetHeight: 0.92,
    });
    table.rotation.y = Math.PI / 2;
    this.bodyGroup.add(table);

    const { object: pan } = await assetLoader.createInstance('/assets3d/food/frying-pan.glb', {
      targetHeight: 0.45,
    });
    pan.position.set(0, 0.95, 0.1);
    pan.userData.baseY = 0.95;
    this.bodyGroup.add(pan);
    this.showcaseProps.push(pan);

    await this._attachHangingLantern(-1.3, 2.2, 0.6);
    await this._attachHangingLantern(1.3, 2.2, 0.6);
  }

  async _loadZhuyinBoardStation() {
    const { object: table } = await assetLoader.createInstance('/assets3d/town/stall-green.glb', {
      targetHeight: 3.4,
    });
    table.rotation.y = Math.PI / 2;
    this.bodyGroup.add(table);

    const { object: vendor } = await assetLoader.createInstance('/models/character-female-b.glb', {
      targetHeight: 1.8,
    });
    vendor.position.set(0, 0, -0.5);
    this.bodyGroup.add(vendor);

    await this._attachHangingLantern(-1.4, 2.4, 0.9);
    await this._attachHangingLantern(1.4, 2.4, 0.9);
  }

  async _loadComboLabStation() {
    const { object: table } = await assetLoader.createInstance('/assets3d/town/stall.glb', {
      targetHeight: 0.95,
    });
    table.rotation.y = Math.PI / 2;
    this.bodyGroup.add(table);

    const { object: bowl } = await assetLoader.createInstance('/assets3d/food/dim-sum.glb', {
      targetHeight: 0.48,
    });
    bowl.position.set(-0.45, 0.96, 0.08);
    bowl.userData.baseY = 0.96;
    const { object: tea } = await assetLoader.createInstance('/assets3d/food/cup-tea.glb', {
      targetHeight: 0.48,
    });
    tea.position.set(0.45, 0.96, 0.08);
    tea.userData.baseY = 0.96;
    this.bodyGroup.add(bowl, tea);
    this.showcaseProps.push(bowl, tea);
  }

  async _attachHangingLantern(x, y, z) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);

    const { object: lanternObj } = await assetLoader.createInstance('/assets3d/holiday/lantern-hanging.glb', {
      targetHeight: 0.62,
      alignBottom: false,
    });
    lanternObj.position.set(0, -0.32, 0);
    pivot.add(lanternObj);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0xffb347,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.scale.set(1.3, 1.3, 1);
    halo.position.set(0, -0.35, 0);
    pivot.add(halo);

    this.bodyGroup.add(pivot);
    this.lanterns.push({ pivot, halo });
  }

  _spawnParticles(count, isBurst = false) {
    const tex = assetLoader.getSoftParticleTexture();
    for (let i = 0; i < count; i++) {
      let color = 0xfde047;
      let isSteam = false;
      if (this.animType === 'fish_scoop') color = 0x7dd3fc;
      else if (this.animType === 'charcoal_grill') color = 0xff8c42;
      else if (this.animType === 'claw_grab' || this.animType === 'glaze_sparkle') color = 0xff9ec4;
      else if (this.animType === 'steam_ladle' && !isBurst) {
        color = 0xfff8ef;
        isSteam = true;
      }

      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: tex,
          color,
          transparent: true,
          opacity: isSteam ? 0.28 : 0.78,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      const size = isSteam ? 0.48 : 0.26;
      sprite.scale.set(size, size, 1);
      sprite.position.set(
        (Math.random() - 0.5) * 1.3,
        1.28 + Math.random() * 0.25,
        0.55 + (Math.random() - 0.5) * 0.35
      );
      this.particleGroup.add(sprite);

      this.particles.push({
        sprite,
        baseSize: size,
        vx: (Math.random() - 0.5) * (isBurst ? 1.6 : 0.22),
        vy: (isBurst ? 1.8 : 0.65) + Math.random() * (isBurst ? 1.2 : 0.4),
        vz: (Math.random() - 0.5) * (isBurst ? 1.4 : 0.22),
        life: isBurst ? 0.85 + Math.random() * 0.35 : 1.15,
        maxLife: 1.2,
        isSteam,
      });
    }
  }

  update(dt, isNearest) {
    this.time += dt;

    for (const m of this.mixers) {
      m.update(dt);
    }

    if (this.actionTimer > 0) {
      this.actionTimer -= dt;
      if (Math.random() < 0.22) this._spawnParticles(1, true);
      if (this.actionTimer <= 0) {
        this.state = isNearest ? 'proximity' : 'idle';
        this.bubbleSprite.visible = false;
        this._playVendorAction('idle');
      }
    } else {
      this.state = isNearest ? 'proximity' : 'idle';
    }

    const isAction = this.state === 'action' || this.state === 'celebrate';
    const progress = isAction ? 1 - Math.max(0, this.actionTimer / this.actionDuration) : 0;

    // 1. 地面光環
    if (this.proximityRing) {
      const targetOpacity = isAction ? 0.85 : isNearest || this.isHovered ? 0.62 : 0;
      this.proximityRing.material.opacity +=
        (targetOpacity - this.proximityRing.material.opacity) * Math.min(1, dt * 10);
      const pulse = 1 + Math.sin(this.time * 4.5) * 0.035;
      this.proximityRing.scale.set(pulse, pulse, 1);
    }

    if (!isAction) {
      if (isNearest) {
        this._setBubble(`按 E / 點擊開啟【${this.name}】`, 'prompt');
      } else {
        this.bubbleSprite.visible = false;
      }
    }

    // 2. 星徽旋轉
    if (this.starBadge && this.starBadge.visible) {
      this.starBadge.rotation.y = this.time * 2.0;
      this.starBadge.position.y = 4.1 + Math.sin(this.time * 3.0) * 0.08;
    }

    // 3. 燈籠柔順擺動
    this.lanterns.forEach((l, idx) => {
      const speed = isAction ? 5.5 : 1.8;
      const amp = isAction ? 0.14 : 0.05;
      l.pivot.rotation.z = Math.sin(this.time * speed + idx) * amp;
      if (l.halo) {
        l.halo.material.opacity = isAction ? 0.72 : 0.42 + Math.sin(this.time * 2.4 + idx) * 0.08;
      }
    });

    // 4. 展示食物優雅抬升旋轉（取代原本整棟攤位抖動）
    if (this.showcaseProps.length > 0) {
      // 平滑拱形曲線 sin(pi * progress)
      const lift = isAction ? Math.sin(progress * Math.PI) * 0.55 : 0;
      const spin = isAction ? progress * Math.PI * 2 : 0;
      this.showcaseProps.forEach((prop, idx) => {
        const baseY = prop.userData.baseY ?? 1.16;
        prop.position.y = baseY + lift + (isAction ? Math.sin(this.time * 8 + idx) * 0.04 : 0);
        prop.rotation.y = spin;
      });
    }

    // 5. 娃娃機速度切換
    if (this.clawAction) {
      this.clawAction.setEffectiveTimeScale(isAction ? 2.4 : 0.65);
    }

    // 6. 撈魚池 3D 魚群流暢路徑游動
    if (this.fishes.length > 0) {
      this.fishes.forEach((f, idx) => {
        const spd = isAction ? 2.6 : 1.05;
        const t = this.time * spd + idx * 1.65;
        const nx = Math.sin(t) * 0.85;
        const nz = 0.05 + Math.cos(t * 0.82) * 0.52;
        const dx = Math.cos(t) * 0.85;
        const dz = -Math.sin(t * 0.82) * 0.52 * 0.82;
        f.rotation.y = Math.atan2(dx, dz);
        f.position.set(nx, 0.94 + Math.sin(t * 2) * 0.02, nz);
      });
    }

    // 7. 柔和環境蒸氣精靈
    if (
      (this.animType === 'steam_ladle' || this.animType === 'sizzle_fry' || this.animType === 'charcoal_grill') &&
      Math.random() < dt * 2.0
    ) {
      this._spawnParticles(1, false);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.z += p.vz * dt;
      if (!p.isSteam) p.vy -= 2.8 * dt;
      p.life -= dt;
      const ratio = Math.max(0, p.life / p.maxLife);
      const scale = p.baseSize * (p.isSteam ? 1 + (1 - ratio) * 0.8 : ratio);
      p.sprite.scale.set(scale, scale, 1);
      p.sprite.material.opacity = ratio * (p.isSteam ? 0.28 : 0.78);
      if (p.life <= 0) {
        this.particleGroup.remove(p.sprite);
        p.sprite.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
}
