interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export class FxLayer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private raf = 0;
  private mode: "off" | "win" | "lose" = "off";
  private burstAt = 0;
  private cssWidth = 1;
  private cssHeight = 1;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo iniciar el canvas de efectos");
    this.canvas = canvas;
    this.ctx = ctx;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  startWin(): void {
    this.mode = "win";
    this.burstAt = performance.now();
    this.particles = [];
    this.burst(90);
    this.loop();
  }

  startLose(): void {
    this.mode = "lose";
    this.burstAt = performance.now();
    this.particles = [];
    this.loop();
  }

  stop(): void {
    this.mode = "off";
    this.particles = [];
    cancelAnimationFrame(this.raf);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private burst(count: number): void {
    const width = this.cssWidth;
    const colors = ["#00e5ff", "#f5c542", "#ffffff", "#1b9fff", "#ff4d8d"];
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x: width * (0.15 + Math.random() * 0.7),
        y: -20,
        vx: (Math.random() - 0.5) * 6,
        vy: 2 + Math.random() * 6,
        life: 1,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 6,
      });
    }
  }

  private loop = (): void => {
    if (this.mode === "off") return;
    const width = this.cssWidth;
    const height = this.cssHeight;
    this.ctx.clearRect(0, 0, width, height);

    if (this.mode === "win") {
      if (performance.now() - this.burstAt > 700 && this.particles.length < 220) {
        this.burst(24);
        this.burstAt = performance.now();
      }
      this.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= 0.004;
        this.ctx.globalAlpha = Math.max(0, p.life);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
      });
      this.particles = this.particles.filter((p) => p.life > 0 && p.y < height + 20);
    } else {
      const pulse = 0.18 + Math.sin(performance.now() / 240) * 0.08;
      const gradient = this.ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.1,
        width / 2,
        height / 2,
        width * 0.7,
      );
      gradient.addColorStop(0, "rgba(255,40,40,0)");
      gradient.addColorStop(1, `rgba(180,0,0,${pulse})`);
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, width, height);
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  private resize(): void {
    this.cssWidth = window.innerWidth;
    this.cssHeight = window.innerHeight;
    this.canvas.width = this.cssWidth * devicePixelRatio;
    this.canvas.height = this.cssHeight * devicePixelRatio;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
}
