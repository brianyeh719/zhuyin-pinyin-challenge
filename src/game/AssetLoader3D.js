import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * 3D GLB 素材快取與標準化載入器
 * 所有 Kenney CC0 模型僅下載與解析一次，並支援骨架動畫克隆（SkeletonUtils.clone）
 */
class AssetLoader3D {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.softParticleTex = null;
  }

  getSoftParticleTexture() {
    if (this.softParticleTex) return this.softParticleTex;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.65)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.softParticleTex = tex;
    return tex;
  }

  load(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }
    const promise = new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.roughness = Math.max(0.45, child.material.roughness ?? 0.65);
              }
            }
          });
          resolve(gltf);
        },
        undefined,
        (err) => {
          console.warn('3D 模型載入失敗:', url, err);
          reject(err);
        }
      );
    });
    this.cache.set(url, promise);
    return promise;
  }

  /**
   * 載入並回傳縮放貼齊地面／置中後的模型克隆
   */
  async createInstance(url, { targetHeight = null, targetWidth = null, alignBottom = true, centerXZ = true } = {}) {
    const gltf = await this.load(url);
    const hasSkin = Boolean(gltf.animations && gltf.animations.length > 0);
    const root = hasSkin ? SkeletonUtils.clone(gltf.scene) : gltf.scene.clone();

    const wrapper = new THREE.Group();
    wrapper.add(root);

    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    let scale = 1;
    if (targetHeight && size.y > 0.001) {
      scale = targetHeight / size.y;
    } else if (targetWidth && size.x > 0.001) {
      scale = targetWidth / size.x;
    }
    root.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(root);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);

    if (centerXZ) {
      root.position.x -= scaledCenter.x;
      root.position.z -= scaledCenter.z;
    }
    if (alignBottom) {
      root.position.y -= scaledBox.min.y;
    }

    return {
      object: wrapper,
      animations: gltf.animations || [],
    };
  }
}

export const assetLoader = new AssetLoader3D();
