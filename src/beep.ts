export class BeepEngine {
  private context: AudioContext | null = null;
  private nextBeepAt = 0;

  async ensure(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  reset(now = performance.now()): void {
    this.nextBeepAt = now;
  }

  tick(running: boolean, intervalSec: number, now = performance.now()): void {
    if (!running || intervalSec <= 0) return;
    if (!this.context || this.context.state !== "running") return;
    if (now < this.nextBeepAt) return;

    this.play();
    this.nextBeepAt = now + intervalSec * 1000;
  }

  private play(): void {
    const ctx = this.context;
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }
}
