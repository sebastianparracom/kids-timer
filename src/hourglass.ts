import * as THREE from "three";

const PARTICLE_COUNT = 2600;
const STREAM_COUNT = 280;

function bulbRadius(y: number): number {
  const ay = Math.abs(y);
  if (ay < 0.07) return 0.05 + ay * 0.55;
  return 0.075 + 0.48 * Math.pow((ay - 0.07) / 1.0, 1.12);
}

function randomInSand(top: boolean, fill: number): THREE.Vector3 {
  const fillClamped = Math.max(0.02, fill);
  const y = top
    ? 0.08 + Math.random() * (0.95 * fillClamped)
    : -1.02 + Math.random() * (0.94 * fillClamped);
  const maxR = bulbRadius(y) * 0.8;
  const r = Math.sqrt(Math.random()) * maxR;
  const a = Math.random() * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
}

export class HourglassScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly root = new THREE.Group();
  private readonly clock = new THREE.Clock();
  private readonly observer: ResizeObserver;
  private readonly sandPositions: Float32Array;
  private readonly sandState: Uint8Array;
  private readonly sandGeometry: THREE.BufferGeometry;
  private readonly streamPositions: Float32Array;
  private readonly streamVel: Float32Array;
  private readonly streamGeometry: THREE.BufferGeometry;
  private readonly sandLight: THREE.PointLight;
  private pointer = { x: 0, y: 0 };
  private ratio = 1;
  private raf = 0;
  private flowing = false;
  private disposed = false;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
    this.camera.position.set(0, 0.05, 4.35);

    this.scene.fog = new THREE.FogExp2(0x07090d, 0.045);
    this.scene.add(this.root);

    this.addLights();
    this.buildFrame();
    this.buildGlass();

    this.sandPositions = new Float32Array(PARTICLE_COUNT * 3);
    this.sandState = new Uint8Array(PARTICLE_COUNT);
    this.sandGeometry = new THREE.BufferGeometry();
    this.sandGeometry.setAttribute("position", new THREE.BufferAttribute(this.sandPositions, 3));
    this.root.add(
      new THREE.Points(
        this.sandGeometry,
        new THREE.PointsMaterial({
          color: 0xe8c36a,
          size: 0.035,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        }),
      ),
    );

    this.streamPositions = new Float32Array(STREAM_COUNT * 3);
    this.streamVel = new Float32Array(STREAM_COUNT);
    this.streamGeometry = new THREE.BufferGeometry();
    this.streamGeometry.setAttribute("position", new THREE.BufferAttribute(this.streamPositions, 3));
    this.root.add(
      new THREE.Points(
        this.streamGeometry,
        new THREE.PointsMaterial({
          color: 0xffe19a,
          size: 0.028,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        }),
      ),
    );

    this.sandLight = new THREE.PointLight(0xffc45c, 1.4, 6, 2);
    this.sandLight.position.set(0, 0.15, 0.4);
    this.root.add(this.sandLight);

    this.seedSand(1);
    this.resetStream();
    for (let i = 0; i < STREAM_COUNT; i += 1) {
      this.streamPositions[i * 3 + 1] = 20;
    }
    this.streamGeometry.attributes.position.needsUpdate = true;

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();

    container.addEventListener("pointermove", this.onPointer);
    this.tick();
  }

  setAccent(hex: string): void {
    const color = new THREE.Color(hex);
    this.sandLight.color.lerp(color, 0.35);
  }

  update(remainingMs: number, durationMs: number, flowing: boolean): void {
    this.flowing = flowing && remainingMs > 0;
    const next = durationMs <= 0 ? 0 : Math.min(1, Math.max(0, remainingMs / durationMs));
    if (next - this.ratio > 0.04) {
      this.seedSand(next);
    }
    this.ratio = next;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.container.removeEventListener("pointermove", this.onPointer);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private addLights(): void {
    this.scene.add(new THREE.AmbientLight(0x7fd7ff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(2.2, 3.4, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x00e5ff, 0.65);
    rim.position.set(-3, -1, -2);
    this.scene.add(rim);
  }

  private buildGlass(): void {
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i <= 72; i += 1) {
      const y = 1.08 - (i / 72) * 2.16;
      profile.push(new THREE.Vector2(bulbRadius(y) + 0.03, y));
    }
    this.root.add(
      new THREE.Mesh(
        new THREE.LatheGeometry(profile, 64),
        new THREE.MeshPhysicalMaterial({
          color: 0xb9f3ff,
          transparent: true,
          opacity: 0.14,
          roughness: 0.05,
          metalness: 0.08,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x8fdfff,
      metalness: 0.85,
      roughness: 0.25,
    });
    for (const y of [1.1, 0, -1.1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(bulbRadius(y) + 0.045, 0.03, 10, 40), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      this.root.add(ring);
    }
  }

  private buildFrame(): void {
    const wood = new THREE.MeshStandardMaterial({
      color: 0x3a2718,
      roughness: 0.7,
      metalness: 0.08,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: 0x9ae7ff,
      metalness: 0.8,
      roughness: 0.3,
    });

    const makePlate = (y: number) => {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.1, 32), wood);
      plate.position.y = y;
      this.root.add(plate);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.035, 8, 40), metal);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = y;
      this.root.add(rim);
    };
    makePlate(1.28);
    makePlate(-1.28);

    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.56, 10), wood);
      pillar.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7);
      this.root.add(pillar);
    }
  }

  private seedSand(ratio: number): void {
    this.ratio = ratio;
    const topCount = Math.round(PARTICLE_COUNT * ratio);
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const top = i < topCount;
      const fill = top ? Math.max(ratio, 0.04) : Math.max(1 - ratio, 0.04);
      const p = randomInSand(top, fill);
      if ((!top && ratio > 0.97) || (top && ratio < 0.03)) {
        p.set(20, 20, 20);
      }
      this.sandState[i] = top ? 0 : 2;
      this.sandPositions[i * 3] = p.x;
      this.sandPositions[i * 3 + 1] = p.y;
      this.sandPositions[i * 3 + 2] = p.z;
    }
    this.sandGeometry.attributes.position.needsUpdate = true;
  }

  private drainTowardRatio(dt: number): void {
    const targetTop = Math.round(PARTICLE_COUNT * this.ratio);
    let topCount = 0;
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      if (this.sandState[i] === 0) topCount += 1;
    }

    const deficit = topCount - targetTop;
    const toRelease = this.flowing ? Math.min(deficit, Math.max(1, Math.floor(deficit * dt * 8))) : 0;
    let released = 0;
    if (toRelease > 0) {
      for (let i = 0; i < PARTICLE_COUNT && released < toRelease; i += 1) {
        if (this.sandState[i] !== 0) continue;
        if (this.sandPositions[i * 3 + 1] > 0.22 && Math.random() > 0.12) continue;
        this.sandState[i] = 1;
        this.sandPositions[i * 3] = (Math.random() - 0.5) * 0.05;
        this.sandPositions[i * 3 + 1] = 0.1;
        this.sandPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
        released += 1;
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      if (this.sandState[i] !== 1) continue;
      this.sandPositions[i * 3 + 1] -= (0.85 + Math.random() * 0.2) * dt;
      this.sandPositions[i * 3] *= 0.98;
      this.sandPositions[i * 3 + 2] *= 0.98;
      if (this.sandPositions[i * 3 + 1] <= -0.18) {
        this.sandState[i] = 2;
        const settled = randomInSand(false, Math.max(1 - this.ratio, 0.06));
        this.sandPositions[i * 3] = settled.x;
        this.sandPositions[i * 3 + 1] = settled.y;
        this.sandPositions[i * 3 + 2] = settled.z;
      }
    }
    this.sandGeometry.attributes.position.needsUpdate = true;
  }

  private resetStream(): void {
    for (let i = 0; i < STREAM_COUNT; i += 1) this.recycleStream(i, true);
  }

  private recycleStream(i: number, scatter: boolean): void {
    const y = scatter ? 0.35 - Math.random() * 0.9 : 0.12 + Math.random() * 0.08;
    this.streamPositions[i * 3] = (Math.random() - 0.5) * 0.06;
    this.streamPositions[i * 3 + 1] = y;
    this.streamPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
    this.streamVel[i] = 0.55 + Math.random() * 0.45;
  }

  private onPointer = (event: PointerEvent): void => {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  };

  private resize(): void {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private tick = (): void => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    this.root.rotation.y = THREE.MathUtils.lerp(this.root.rotation.y, this.pointer.x * 0.35, 0.05);
    this.root.rotation.x = THREE.MathUtils.lerp(this.root.rotation.x, this.pointer.y * 0.12, 0.05);
    this.root.position.y = Math.sin(t * 0.7) * 0.03;

    this.drainTowardRatio(dt);

    if (this.flowing && this.ratio > 0) {
      for (let i = 0; i < STREAM_COUNT; i += 1) {
        this.streamPositions[i * 3 + 1] -= this.streamVel[i] * dt;
        this.streamPositions[i * 3] += Math.sin(t * 8 + i) * 0.0008;
        if (this.streamPositions[i * 3 + 1] < -0.95) this.recycleStream(i, false);
      }
    } else {
      for (let i = 0; i < STREAM_COUNT; i += 1) {
        this.streamPositions[i * 3 + 1] = 20;
      }
    }
    this.streamGeometry.attributes.position.needsUpdate = true;
    this.sandLight.intensity = this.flowing ? 1.7 : 1.15;

    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.tick);
  };
}
