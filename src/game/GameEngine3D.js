import * as THREE from 'three';
import { Player3D } from './Player3D.js';
import { World3D } from './World3D.js';
import { soundEngine } from '../audio/soundEngine.js';

/**
 * Three.js 2.5D 遊戲主引擎
 * 負責渲染迴圈、2.5D 俯視攝影機跟隨、滑鼠 Raycast 點擊互動、鍵盤／虛擬搖桿移動、區域傳送與攤位狀態更新
 */
export class GameEngine3D {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks || {};

    this.activeZone = 'nightmarket'; // 預設可從夜市或學習區切換，初始先於夜市或提供切換
    this.isPaused = false;
    this.keys = new Set();
    this.virtualInput = { x: 0, z: 0 };
    this.nearestStall = null;
    this.nearPortal = false;
    this.pendingInteractStallId = null;

    this.cameraDistance = 16.5;
    this.camYaw = 0; // 水平旋轉角 (radians)
    this.camPitch = 0.54; // 俯仰角 (0.24 ~ 1.25 radians)
    this.isDraggingCamera = false;
    this.dragMoved = false;
    this.dragStart = { x: 0, y: 0 };
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this._initScene();
    this._bindEvents();
    this.setZone('learning'); // 先從「學習區：九份淘金與注音學堂」開始導引，也可一鍵切換「夜市練習區」！
  }

  _initScene() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2b244d);
    this.scene.fog = new THREE.FogExp2(0x2b244d, 0.005);

    // 斜角 2.5D 夜市透視攝影機（FOV 42°，低仰角清楚呈現攤販招牌、店員與內部商品）
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 130);
    this.camera.position.set(0, 9.2, 15.2);
    this.camera.lookAt(0, 1.1, -2.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.container.appendChild(this.renderer.domElement);

    // 適中暖色夜市光影（柔和不陰沉、亦不過曝）
    const ambient = new THREE.AmbientLight(0xffe9d0, 0.52);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xffdfb8, 0x7d5840, 0.88);
    this.scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffe8c2, 1.05);
    dirLight.position.set(8, 20, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 70;
    const d = 26;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);

    // 玩家隨身暖光
    this.playerLight = new THREE.PointLight(0xffbf69, 2.5, 17, 1.2);
    this.playerLight.position.set(0, 3.4, 0);
    this.scene.add(this.playerLight);

    // 地面點擊目標光圈
    this.waypointMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.42, 24),
      new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    this.waypointMarker.rotation.x = -Math.PI / 2;
    this.waypointMarker.position.y = 0.04;
    this.waypointMarker.visible = false;
    this.scene.add(this.waypointMarker);

    this.world = new World3D(this.scene);
    this.player = new Player3D();
    this.scene.add(this.player.group);

    this.clock = new THREE.Clock();
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      if (!this.container) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    window.addEventListener('keydown', (e) => {
      if (this.isPaused) return;
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
      }
      this.keys.add(key);

      if (key === 'e' || key === ' ' || key === 'enter') {
        this.interactNearest();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    const dom = this.renderer.domElement;
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('mousedown', (e) => {
      if (this.isPaused) return;
      this.isDraggingCamera = true;
      this.dragMoved = false;
      this.dragStart = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPaused) return;
      if (this.isDraggingCamera) {
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        if (Math.hypot(dx, dy) > 4) {
          this.dragMoved = true;
        }
        if (this.dragMoved) {
          this.camYaw -= dx * 0.0065;
          this.camPitch = Math.max(0.24, Math.min(1.22, this.camPitch + dy * 0.0055));
          this.dragStart = { x: e.clientX, y: e.clientY };
          dom.style.cursor = 'grabbing';
          return;
        }
      }
      this._onPointerMove(e);
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingCamera = false;
    });

    dom.addEventListener('click', (e) => {
      if (this.dragMoved) {
        this.dragMoved = false;
        return;
      }
      this._onPointerClick(e);
    });

    dom.addEventListener(
      'wheel',
      (e) => {
        if (this.isPaused) return;
        e.preventDefault();
        this.cameraDistance = Math.max(10, Math.min(25, this.cameraDistance + e.deltaY * 0.01));
      },
      { passive: false }
    );
  }

  adjustCamera(dYaw = 0, dPitch = 0, dDist = 0) {
    this.camYaw += dYaw;
    this.camPitch = Math.max(0.24, Math.min(1.22, this.camPitch + dPitch));
    this.cameraDistance = Math.max(10, Math.min(25, this.cameraDistance + dDist));
  }

  resetCamera() {
    this.camYaw = 0;
    this.camPitch = 0.54;
    this.cameraDistance = 16.5;
  }

  setCharacterSkin(skinId) {
    this.player.loadSkin(skinId);
  }

  _updatePointer(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _onPointerMove(e) {
    if (this.isPaused) return;
    this._updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const stalls = this.world.getStalls(this.activeZone);
    const hitMeshes = stalls.map((s) => s.hitMesh);
    const hits = this.raycaster.intersectObjects(hitMeshes, false);

    stalls.forEach((s) => (s.isHovered = false));
    if (hits.length > 0) {
      const id = hits[0].object.userData.stallId;
      const target = stalls.find((s) => s.id === id);
      if (target) target.isHovered = true;
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  _onPointerClick(e) {
    if (this.isPaused) return;
    this._updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const stalls = this.world.getStalls(this.activeZone);
    const hitMeshes = stalls.map((s) => s.hitMesh);
    const stallHits = this.raycaster.intersectObjects(hitMeshes, false);

    if (stallHits.length > 0) {
      const id = stallHits[0].object.userData.stallId;
      const target = stalls.find((s) => s.id === id);
      if (target) {
        const pos = this.player.getPosition();
        if (target.distanceTo(pos.x, pos.z) < 2.5) {
          this._openStall(target);
        } else {
          soundEngine.playClick();
          target.triggerAction(`請走近【${target.name}】再開啟題目`, false);
        }
      }
    }
  }

  setVirtualInput(x, z) {
    this.virtualInput.x = x;
    this.virtualInput.z = z;
  }

  setPaused(paused) {
    this.isPaused = paused;
    if (paused) this.keys.clear();
  }

  setZone(zoneId) {
    if (zoneId !== 'learning' && zoneId !== 'nightmarket') return;
    this.activeZone = zoneId;
    this.world.setActiveZone(zoneId);
    const spawn = this.world.getSpawn(zoneId);
    this.player.setPosition(spawn.x, spawn.z);
    this.pendingInteractStallId = null;

    // 切換天色氣氛（學習區：九份暖暮藍；夜市區：溫馨紫藍夜色）
    const bgHex = zoneId === 'learning' ? 0x223b5e : 0x2b244d;
    this.scene.background.setHex(bgHex);
    this.scene.fog.color.setHex(bgHex);

    // 立即將攝影機對準出生點
    this._snapCameraTo(spawn.x, spawn.z);

    if (this.callbacks.onZoneChange) {
      this.callbacks.onZoneChange(zoneId);
    }
  }

  _computeCameraTarget(px, pz) {
    const lookX = px * 0.9 - Math.sin(this.camYaw) * 1.6;
    const lookY = 1.15;
    const lookZ = pz - Math.cos(this.camYaw) * 1.6;

    const horiz = Math.cos(this.camPitch) * this.cameraDistance;
    const vert = Math.sin(this.camPitch) * this.cameraDistance;

    return {
      camX: lookX + Math.sin(this.camYaw) * horiz,
      camY: vert + 0.8,
      camZ: lookZ + Math.cos(this.camYaw) * horiz,
      lookX,
      lookY,
      lookZ,
    };
  }

  _snapCameraTo(px, pz) {
    const t = this._computeCameraTarget(px, pz);
    this.camera.position.set(t.camX, t.camY, t.camZ);
    this.camera.lookAt(t.lookX, t.lookY, t.lookZ);
  }

  /**
   * 同步已通關攤位星號
   */
  syncClearedStalls(clearedSet) {
    ['learning', 'nightmarket'].forEach((zone) => {
      this.world.getStalls(zone).forEach((stall) => {
        stall.setCleared(clearedSet.has(stall.id));
      });
    });
  }

  getStallById(id) {
    return (
      this.world.getStalls('nightmarket').find((s) => s.id === id) ||
      this.world.getStalls('learning').find((s) => s.id === id) ||
      null
    );
  }

  interactNearest() {
    if (this.nearPortal) {
      const portal = this.world.getPortal(this.activeZone);
      if (portal) {
        soundEngine.playPortal();
        this.setZone(portal.targetZone);
      }
      return;
    }

    if (this.nearestStall) {
      this._openStall(this.nearestStall);
    }
  }

  _openStall(stall) {
    this.pendingInteractStallId = null;
    this.player.clearMoveTarget();
    stall.triggerAction(stall.config.actionVerb || '', false);
    soundEngine.playStallAction(stall.animType);
    if (this.callbacks.onOpenStall) {
      this.callbacks.onOpenStall(stall);
    }
  }

  _getInputVector() {
    let rawX = this.virtualInput.x;
    let rawZ = this.virtualInput.z;
    if (this.keys.has('w') || this.keys.has('arrowup')) rawZ -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) rawZ += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) rawX -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) rawX += 1;

    // 依當前視角旋轉角度轉換移動方向
    const cos = Math.cos(this.camYaw);
    const sin = Math.sin(this.camYaw);
    return {
      x: rawX * cos + rawZ * sin,
      z: -rawX * sin + rawZ * cos,
    };
  }

  start() {
    const animate = () => {
      requestAnimationFrame(animate);
      const dt = Math.min(0.05, this.clock.getDelta());
      this._update(dt);
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  _update(dt) {
    if (!this.isPaused) {
      if (this.keys.has('q')) this.camYaw += 1.6 * dt;
      if (this.keys.has('r')) this.camYaw -= 1.6 * dt;
    }

    const input = this.isPaused ? { x: 0, z: 0 } : this._getInputVector();
    const colliders = this.world.getColliders(this.activeZone);
    const bounds = this.world.getBounds(this.activeZone);

    this.player.update(dt, input, colliders, bounds, () => soundEngine.playStep());

    const pos = this.player.getPosition();
    this.playerLight.position.set(pos.x, 3.4, pos.z);

    // 地面尋路標記更新
    if (this.player.targetPos) {
      this.waypointMarker.visible = true;
      this.waypointMarker.position.x = this.player.targetPos.x;
      this.waypointMarker.position.z = this.player.targetPos.z;
      const s = 1 + Math.sin(performance.now() * 0.01) * 0.15;
      this.waypointMarker.scale.set(s, s, 1);
    } else {
      this.waypointMarker.visible = false;
    }

    // 偵測最近攤位
    const stalls = this.world.getStalls(this.activeZone);
    let best = null;
    let bestDist = 2.0;
    for (const s of stalls) {
      const d = s.distanceTo(pos.x, pos.z);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    this.nearestStall = best;

    // 若玩家正在自動走往點擊的攤位，到達後立即開啟
    if (this.pendingInteractStallId && best && best.id === this.pendingInteractStallId && !this.isPaused) {
      this._openStall(best);
    }

    stalls.forEach((s) => s.update(dt, s === this.nearestStall));

    // 更新世界動態 & 傳送門狀態
    this.nearPortal = this.world.update(dt, this.activeZone, pos);

    // 若走進傳送門光圈中心且沒有暫停，提示或自動切換
    if (this.callbacks.onProximityChange) {
      this.callbacks.onProximityChange(this.nearestStall, this.nearPortal);
    }

    // 平滑軌道攝影機跟隨（支援拖曳與按鈕調整角度）
    const target = this._computeCameraTarget(pos.x, pos.z);
    const lerp = Math.min(1, dt * 8);
    this.camera.position.x += (target.camX - this.camera.position.x) * lerp;
    this.camera.position.y += (target.camY - this.camera.position.y) * lerp;
    this.camera.position.z += (target.camZ - this.camera.position.z) * lerp;
    this.camera.lookAt(target.lookX, target.lookY, target.lookZ);
  }
}
