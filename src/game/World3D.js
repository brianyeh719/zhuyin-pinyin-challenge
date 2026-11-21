import * as THREE from 'three';
import { NIGHT_MARKET_STALLS, LEARNING_STATIONS } from '../data/stallsData.js';
import { Stall3D } from './Stall3D.js';
import { assetLoader } from './AssetLoader3D.js';
import {
  createCobblestoneTexture,
  createJiufenGroundTexture,
  createArchPlaqueTexture,
  createBubbleSpriteTexture,
  createGlowHaloTexture,
} from './textureUtils.js';

/**
 * 雙區域 3D 地圖場景管理器（全面採用 Kenney CC0 精緻 3D 場景物件）
 * 1. learning（學習區：九份淘金與注音學堂）
 * 2. nightmarket（練習區：台灣夜市 17 攤雙拼挑戰）
 */
export class World3D {
  constructor(scene) {
    this.scene = scene;
    this.glowTex = createGlowHaloTexture();
    this.zoneGroups = {
      learning: new THREE.Group(),
      nightmarket: new THREE.Group(),
    };
    this.stallsByZone = {
      learning: [],
      nightmarket: [],
    };
    this.collidersByZone = {
      learning: [],
      nightmarket: [],
    };
    this.portals = {};
    this.boundsByZone = {
      learning: { minX: -12.5, maxX: 12.5, minZ: -10.5, maxZ: 13 },
      nightmarket: { minX: -18.5, maxX: 18.5, minZ: -14.2, maxZ: 14.5 },
    };
    this.spawnByZone = {
      learning: { x: 0, z: 11.5 },
      nightmarket: { x: 0, z: -2.2 },
    };

    this.lanternStrings = [];
    this.fireflies = [];
    this.time = 0;

    this._buildLearningZone();
    this._buildNightMarketZone();

    this.scene.add(this.zoneGroups.learning);
    this.scene.add(this.zoneGroups.nightmarket);
  }

  _buildArchwayPortal(parentGroup, title, plaqueBg, x, z, targetZone, titleEn = '') {
    const arch = new THREE.Group();
    arch.position.set(x, 0, z);

    const redMat = new THREE.MeshStandardMaterial({ color: 0xd93829, roughness: 0.55 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x294b9e, roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.3 });

    [-2.4, 2.4].forEach((px) => {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.42, 0.75),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1 })
      );
      base.position.set(px, 0.21, 0);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 3.6, 12), redMat);
      pillar.position.set(px, 2.0, 0);
      pillar.castShadow = true;
      arch.add(base, pillar);
    });

    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.46, 0.58), redMat);
    beam.position.set(0, 3.55, 0);
    const roof1 = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.4, 1.55), roofMat);
    roof1.position.set(0, 4.15, 0);
    roof1.castShadow = true;
    const roof2 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.36, 1.15), roofMat);
    roof2.position.set(0, 4.52, 0);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.16, 0.24), goldMat);
    ridge.position.set(0, 4.74, 0);
    arch.add(beam, roof1, roof2, ridge);

    const plaqueTex = createArchPlaqueTexture(title, plaqueBg, '#fef08a', titleEn);
    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(2.85, 1.0, 0.26),
      new THREE.MeshStandardMaterial({
        map: plaqueTex,
        emissive: 0xffe4a0,
        emissiveMap: plaqueTex,
        emissiveIntensity: 0.18,
      })
    );
    plaque.position.set(0, 3.35, 0.3);
    arch.add(plaque);

    [-1.8, 1.8].forEach(async (lx) => {
      const { object: lObj } = await assetLoader.createInstance('/assets3d/holiday/lantern-hanging.glb', {
        targetHeight: 0.9,
        alignBottom: false,
      });
      lObj.position.set(lx, 2.85, 0.38);
      arch.add(lObj);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.glowTex,
          color: 0xffb347,
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      halo.scale.set(2.0, 2.0, 1);
      halo.position.set(lx, 2.75, 0.38);
      arch.add(halo);
    });

    const portalRing = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.48, 32),
      new THREE.MeshBasicMaterial({
        color: targetZone === 'nightmarket' ? 0xfde047 : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      })
    );
    portalRing.rotation.x = -Math.PI / 2;
    portalRing.position.set(0, 0.04, 0.9);
    arch.add(portalRing);

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createBubbleSpriteTexture(
          targetZone === 'nightmarket' ? '按 E / 走入前往【夜市練習區】' : '按 E / 走入回到【學習區】',
          'prompt'
        ),
        transparent: true,
        depthTest: false,
      })
    );
    sprite.position.set(0, 5.25, 0);
    sprite.scale.set(4.4, 0.92, 1);
    sprite.visible = false;
    arch.add(sprite);

    parentGroup.add(arch);

    return {
      x,
      z: z + 0.9,
      targetZone,
      ring: portalRing,
      sprite,
      colliders: [
        { minX: x - 2.85, maxX: x - 1.95, minZ: z - 0.45, maxZ: z + 0.45 },
        { minX: x + 1.95, maxX: x + 2.85, minZ: z - 0.45, maxZ: z + 0.45 },
      ],
    };
  }

  _buildLanternString(parentGroup, y, z, xStart, xEnd, count) {
    const group = new THREE.Group();
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x3b1d0c });
    const length = xEnd - xStart;
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, length, 6), cableMat);
    cable.rotation.z = Math.PI / 2;
    cable.position.set((xStart + xEnd) / 2, y, z);
    group.add(cable);

    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const lx = xStart + length * t;
      const sag = Math.sin(t * Math.PI) * 0.42;

      const pivot = new THREE.Group();
      pivot.position.set(lx, y - sag, z);

      assetLoader
        .createInstance('/assets3d/holiday/lantern-hanging.glb', {
          targetHeight: 0.65,
          alignBottom: false,
        })
        .then(({ object: lObj }) => {
          lObj.position.y = -0.32;
          pivot.add(lObj);
        });

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.glowTex,
          color: 0xffb347,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      halo.scale.set(1.5, 1.5, 1);
      halo.position.y = -0.32;
      pivot.add(halo);

      group.add(pivot);
      this.lanternStrings.push({ pivot, phase: i * 0.7 });
    }

    parentGroup.add(group);
  }

  _placeProp(parentGroup, url, x, z, targetHeight, rotY = 0, colliders = null, colRadius = 0) {
    assetLoader.createInstance(url, { targetHeight }).then(({ object }) => {
      object.position.set(x, 0, z);
      object.rotation.y = rotY;
      parentGroup.add(object);
    });
    if (colliders && colRadius > 0) {
      colliders.push({
        minX: x - colRadius,
        maxX: x + colRadius,
        minZ: z - colRadius,
        maxZ: z + colRadius,
      });
    }
  }

  _buildBackgroundTown(parentGroup) {
    const houseMat = new THREE.MeshStandardMaterial({ color: 0x463d6e, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x322b54, roughness: 0.85 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });

    const buildings = [
      { x: -16, z: -17.5, w: 5.5, h: 6.2 },
      { x: -9.5, z: -18.0, w: 5.0, h: 7.4 },
      { x: 9.5, z: -18.0, w: 5.2, h: 6.8 },
      { x: 16, z: -17.5, w: 5.8, h: 6.0 },
    ];

    buildings.forEach((b) => {
      const g = new THREE.Group();
      g.position.set(b.x, 0, b.z);
      const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, 3.2), houseMat);
      body.position.y = b.h / 2;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.5, 0.5, 3.6), roofMat);
      roof.position.y = b.h + 0.25;
      g.add(body, roof);

      for (let r = 0; r < 2; r++) {
        for (let c = -1; c <= 1; c += 2) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.95), winMat);
          win.position.set(c * 1.1, b.h - 1.5 - r * 1.7, 1.62);
          g.add(win);
        }
      }
      parentGroup.add(g);
    });
  }

  _buildFireflies(parentGroup, spreadX, spreadZ) {
    const tex = assetLoader.getSoftParticleTexture();
    const count = 42;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spreadX;
      positions[i * 3 + 1] = 0.8 + Math.random() * 2.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spreadZ;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      map: tex,
      color: 0xfef08a,
      size: 0.26,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    parentGroup.add(pts);
    this.fireflies.push(pts);
  }

  _buildLearningZone() {
    const g = this.zoneGroups.learning;
    const colliders = this.collidersByZone.learning;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 30),
      new THREE.MeshStandardMaterial({ map: createJiufenGroundTexture(), roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    g.add(ground);

    // 九份閃亮山溪
    const stream = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 2.6),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.82,
        roughness: 0.15,
      })
    );
    stream.rotation.x = -Math.PI / 2;
    stream.position.set(0, 0.02, 2.4);
    g.add(stream);

    // 使用 Kenney 精緻木橋模型跨越溪流
    const BRIDGE_XS = [-5.8, 5.8];
    BRIDGE_XS.forEach((bx) => {
      this._placeProp(g, '/assets3d/forest/bridge.glb', bx, 2.4, 1.35, Math.PI / 2);
    });

    // 溪流碰撞：玩家無法涉水，只能從橋面通過（橋寬約 2.3，兩側各留 1.2 的通道）
    const RIVER_MIN_Z = 1.3;
    const RIVER_MAX_Z = 3.5;
    const BRIDGE_HALF_GAP = 1.2;
    const WORLD_EDGE = 20;
    const edges = [-WORLD_EDGE];
    BRIDGE_XS.slice()
      .sort((a, b) => a - b)
      .forEach((bx) => edges.push(bx - BRIDGE_HALF_GAP, bx + BRIDGE_HALF_GAP));
    edges.push(WORLD_EDGE);
    for (let i = 0; i < edges.length; i += 2) {
      colliders.push({
        minX: edges[i],
        maxX: edges[i + 1],
        minZ: RIVER_MIN_Z,
        maxZ: RIVER_MAX_Z,
      });
    }

    // 溪邊岩石、花草、燈籠與大樹
    this._placeProp(g, '/assets3d/forest/rocks-high.glb', -9.5, 2.5, 1.4, 0.4, colliders, 0.8);
    this._placeProp(g, '/assets3d/forest/rocks-high.glb', 9.5, 2.5, 1.4, -0.5, colliders, 0.8);
    this._placeProp(g, '/assets3d/town/tree-high-round.glb', -11.2, -9.2, 4.6, 0.2);
    this._placeProp(g, '/assets3d/town/tree-high-round.glb', 11.2, -9.2, 4.6, -0.3);
    this._placeProp(g, '/assets3d/town/lantern.glb', -9.2, 6.2, 2.1, 0, colliders, 0.45);
    this._placeProp(g, '/assets3d/town/lantern.glb', 9.2, 6.2, 2.1, 0, colliders, 0.45);
    this._placeProp(g, '/assets3d/holiday/bench.glb', -6.8, 6.4, 0.95, 0, colliders, 0.7);
    this._placeProp(g, '/assets3d/holiday/bench.glb', 6.8, 6.4, 0.95, 0, colliders, 0.7);

    this._buildLanternString(g, 3.8, -7.2, -10.5, 10.5, 9);

    const portal = this._buildArchwayPortal(g, '前往夜市 ➔', '#1e3a8a', 0, -9.2, 'nightmarket', 'To the Night Market');
    this.portals.learning = portal;
    colliders.push(...portal.colliders);

    LEARNING_STATIONS.forEach((cfg, idx) => {
      const stall = new Stall3D(cfg, idx);
      g.add(stall.group);
      this.stallsByZone.learning.push(stall);
      colliders.push(stall.getCollider());
    });

    this._buildFireflies(g, 24, 18);
  }

  _buildNightMarketZone() {
    const g = this.zoneGroups.nightmarket;
    const colliders = this.collidersByZone.nightmarket;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(52, 42),
      new THREE.MeshStandardMaterial({ map: createCobblestoneTexture(), roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);

    this._buildBackgroundTown(g);

    // 精緻 3D 圓樹與樹籬
    this._placeProp(g, '/assets3d/town/tree-high-round.glb', -18.5, -13.5, 5.2, 0.3);
    this._placeProp(g, '/assets3d/town/tree-high-round.glb', -13.0, -14.2, 4.4, -0.4);
    this._placeProp(g, '/assets3d/town/tree-high-round.glb', 13.0, -14.2, 4.4, 0.5);
    this._placeProp(g, '/assets3d/town/tree-high-round.glb', 18.5, -13.5, 5.2, -0.2);

    // 廣場樹籬花台與燈柱
    this._placeProp(g, '/assets3d/town/hedge.glb', -3.2, -5.2, 1.35, 0, colliders, 0.85);
    this._placeProp(g, '/assets3d/town/hedge.glb', -3.2, 2.2, 1.35, 0, colliders, 0.85);
    this._placeProp(g, '/assets3d/town/lantern.glb', -4.2, -9.8, 2.4, 0, colliders, 0.45);
    this._placeProp(g, '/assets3d/town/lantern.glb', 4.2, -9.8, 2.4, 0, colliders, 0.45);

    // 廣場水溝蓋
    const manhole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.72, 0.03, 20),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.55, metalness: 0.25 })
    );
    manhole.position.set(-3.8, 0.015, -1.6);
    g.add(manhole);

    // 精緻木椅與木推車
    this._placeProp(g, '/assets3d/holiday/bench.glb', -11.4, -10.8, 0.95, 0, colliders, 0.8);
    this._placeProp(g, '/assets3d/town/cart.glb', 11.4, -10.6, 1.65, -0.4, colliders, 0.95);

    this._buildLanternString(g, 4.1, -11.4, -17, -3.2, 6);
    this._buildLanternString(g, 4.1, -11.4, 3.2, 17, 6);
    this._buildLanternString(g, 4.1, 8.2, -16, 16, 12);

    const portal = this._buildArchwayPortal(g, '夜市（回學堂）', '#a8241d', 0, -12.4, 'learning', 'Back to Jiufen');
    this.portals.nightmarket = portal;
    colliders.push(...portal.colliders);

    NIGHT_MARKET_STALLS.forEach((cfg, idx) => {
      const stall = new Stall3D(cfg, idx);
      g.add(stall.group);
      this.stallsByZone.nightmarket.push(stall);
      colliders.push(stall.getCollider());
    });

    this._buildFireflies(g, 36, 26);
  }

  setActiveZone(zoneId) {
    this.zoneGroups.learning.visible = zoneId === 'learning';
    this.zoneGroups.nightmarket.visible = zoneId === 'nightmarket';
  }

  getStalls(zoneId) {
    return this.stallsByZone[zoneId] || [];
  }

  getColliders(zoneId) {
    return this.collidersByZone[zoneId] || [];
  }

  getBounds(zoneId) {
    return this.boundsByZone[zoneId];
  }

  getSpawn(zoneId) {
    return this.spawnByZone[zoneId];
  }

  getPortal(zoneId) {
    return this.portals[zoneId];
  }

  update(dt, activeZone, playerPos) {
    this.time += dt;

    this.lanternStrings.forEach((l) => {
      l.pivot.rotation.z = Math.sin(this.time * 2.0 + l.phase) * 0.06;
    });

    this.fireflies.forEach((pts) => {
      pts.position.y = Math.sin(this.time * 1.1) * 0.16;
    });

    const portal = this.portals[activeZone];
    let nearPortal = false;
    if (portal && playerPos) {
      const dist = Math.hypot(playerPos.x - portal.x, playerPos.z - portal.z);
      nearPortal = dist < 2.2;
      portal.sprite.visible = nearPortal;
      portal.ring.material.opacity = nearPortal ? 0.98 : 0.6 + Math.sin(this.time * 3) * 0.15;
    }

    return nearPortal;
  }
}
