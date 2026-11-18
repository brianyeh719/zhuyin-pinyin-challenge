import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const CHARACTER_SKINS = [
  { id: 'boy', label: '👦 小男孩', url: '/models/character-male-a.glb' },
  { id: 'girl', label: '👧 小女孩', url: '/models/character-female-a.glb' },
  { id: 'mascot', label: '🌟 萌萌星', url: '/models/character.glb' },
];

/**
 * 3D 玩家角色控制器（採用 Kenney CC0 免費 Q版 3D 角色素材 + AnimationMixer 骨架動畫）
 * 支援四／八方向平滑移動、自動轉向、碰撞滑行、點擊地面尋路與角色造型切換
 */
export class Player3D {
  constructor() {
    this.group = new THREE.Group();
    this.modelRoot = new THREE.Group();
    this.group.add(this.modelRoot);

    this.radius = 0.62;
    this.speed = 7.4;
    this.stepSoundTimer = 0;
    this.isMoving = false;
    this.targetPos = null; // { x, z }

    this.loader = new GLTFLoader();
    this.mixer = null;
    this.actions = {};
    this.activeActionName = null;
    this.currentSkinId = 'boy';
    this.emoteTimer = 0;

    // 地面陰影圓盤
    const shadowGeo = new THREE.CircleGeometry(0.62, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x100805,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;
    this.group.add(shadow);

    // 初始面朝北方 (-Z)
    this.group.rotation.y = Math.PI;
    this.loadSkin('boy');
  }

  loadSkin(skinId) {
    const skin = CHARACTER_SKINS.find((s) => s.id === skinId) || CHARACTER_SKINS[0];
    this.currentSkinId = skin.id;

    this.loader.load(
      skin.url,
      (gltf) => {
        // 清除舊模型
        while (this.modelRoot.children.length > 0) {
          this.modelRoot.remove(this.modelRoot.children[0]);
        }
        if (this.mixer) {
          this.mixer.stopAllAction();
          this.mixer = null;
        }
        this.actions = {};
        this.activeActionName = null;

        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = Math.max(0.55, child.material.roughness ?? 0.7);
            }
          }
        });

        // 依邊界盒自動縮放至合適遊戲身高 (~1.85 單位) 並貼齊地面 y=0
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const targetHeight = skin.id === 'mascot' ? 1.55 : 1.85;
        const scale = size.y > 0.01 ? targetHeight / size.y : 2.0;
        model.scale.setScalar(scale);

        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.y = -scaledBox.min.y;

        this.modelRoot.add(model);

        // 初始化骨架動畫
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => {
            this.actions[clip.name] = this.mixer.clipAction(clip);
          });
          this._playAction(this.isMoving ? 'walk' : 'idle', 0);
        }
      },
      undefined,
      (err) => {
        console.warn('無法載入角色模型:', skin.url, err);
      }
    );
  }

  _playAction(name, fadeDuration = 0.18) {
    if (!this.mixer) return;
    let targetName = name;
    if (!this.actions[targetName]) {
      targetName = this.actions.idle ? 'idle' : Object.keys(this.actions)[0];
    }
    if (!targetName || targetName === this.activeActionName) return;

    const nextAction = this.actions[targetName];
    const prevAction = this.activeActionName ? this.actions[this.activeActionName] : null;

    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(targetName === 'walk' ? 1.25 : 1.0);
    nextAction.setEffectiveWeight(1.0);
    nextAction.play();

    if (prevAction && prevAction !== nextAction && fadeDuration > 0) {
      prevAction.crossFadeTo(nextAction, fadeDuration, true);
    }

    this.activeActionName = targetName;
  }

  triggerCelebrate() {
    if (this.actions['emote-yes'] || this.actions.jump) {
      this.emoteTimer = 1.2;
      this._playAction(this.actions['emote-yes'] ? 'emote-yes' : 'jump', 0.12);
    }
  }

  setPosition(x, z) {
    this.group.position.set(x, 0, z);
    this.targetPos = null;
  }

  getPosition() {
    return { x: this.group.position.x, z: this.group.position.z };
  }

  setMoveTarget(x, z) {
    this.targetPos = { x, z };
  }

  clearMoveTarget() {
    this.targetPos = null;
  }

  update(dt, inputVec, colliders, bounds, onStep) {
    if (this.mixer) {
      this.mixer.update(dt);
    }

    if (this.emoteTimer > 0) {
      this.emoteTimer -= dt;
    }

    let dx = inputVec.x;
    let dz = inputVec.z;

    if (Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05) {
      this.targetPos = null;
    } else if (this.targetPos) {
      const tx = this.targetPos.x - this.group.position.x;
      const tz = this.targetPos.z - this.group.position.z;
      const dist = Math.hypot(tx, tz);
      if (dist > 0.25) {
        dx = tx / dist;
        dz = tz / dist;
      } else {
        this.targetPos = null;
      }
    }

    const len = Math.hypot(dx, dz);
    if (len > 0.01) {
      dx /= len;
      dz /= len;
      this.isMoving = true;
      this.emoteTimer = 0;
      this.stepSoundTimer += dt;
      if (this.stepSoundTimer >= 0.27) {
        this.stepSoundTimer = 0;
        if (onStep) onStep();
      }

      // 平滑旋轉面向移動方向
      const targetAngle = Math.atan2(dx, dz);
      let diff = targetAngle - this.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, dt * 14);

      const stepX = dx * this.speed * dt;
      const stepZ = dz * this.speed * dt;

      this.group.position.x += stepX;
      this._resolveCollisions(colliders, bounds);

      this.group.position.z += stepZ;
      this._resolveCollisions(colliders, bounds);

      this._playAction('walk', 0.15);
    } else {
      this.isMoving = false;
      this.stepSoundTimer = 0.2;
      if (this.emoteTimer <= 0) {
        this._playAction('idle', 0.2);
      }
    }
  }

  _resolveCollisions(colliders, bounds) {
    const pos = this.group.position;
    const pad = this.radius + 0.2;
    pos.x = Math.max(bounds.minX + pad, Math.min(bounds.maxX - pad, pos.x));
    pos.z = Math.max(bounds.minZ + pad, Math.min(bounds.maxZ - pad, pos.z));

    for (const box of colliders) {
      const closestX = Math.max(box.minX, Math.min(pos.x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(pos.z, box.maxZ));
      const distX = pos.x - closestX;
      const distZ = pos.z - closestZ;
      const distSq = distX * distX + distZ * distZ;

      if (distSq < this.radius * this.radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const overlap = this.radius - dist;
          pos.x += (distX / dist) * overlap;
          pos.z += (distZ / dist) * overlap;
        } else {
          pos.z += this.radius;
        }
      }
    }
  }
}
