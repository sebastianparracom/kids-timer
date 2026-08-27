export type VideoKind = "loop" | "win" | "lose" | "none";

export class VideoStage {
  private kind: VideoKind = "none";
  private sources: string[] = [];
  private loadId = 0;

  constructor(
    private readonly stage: HTMLElement,
    private readonly video: HTMLVideoElement,
    private readonly poster: HTMLImageElement,
    private readonly badge: HTMLElement,
  ) {
    this.video.addEventListener("error", () => this.tryNextSource());
    this.video.addEventListener("playing", () => {
      this.stage.classList.add("is-playing");
      this.badge.hidden = true;
    });
  }

  setPoster(src: string, alt: string): void {
    this.poster.src = src;
    this.poster.alt = alt;
  }

  showPoster(): void {
    this.kind = "none";
    this.sources = [];
    this.loadId += 1;
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
    this.stage.classList.remove("is-playing");
    this.badge.hidden = true;
  }

  play(kind: VideoKind, urls: string[]): void {
    if (kind === "none") {
      this.showPoster();
      return;
    }
    this.kind = kind;
    this.sources = [...urls];
    this.loadId += 1;
    this.video.loop = true;
    this.video.muted = true;
    this.video.playsInline = true;
    this.tryNextSource(this.loadId);
  }

  private tryNextSource(loadId = this.loadId): void {
    if (loadId !== this.loadId || this.kind === "none") return;
    const next = this.sources.shift();
    if (!next) {
      this.stage.classList.remove("is-playing");
      this.badge.hidden = false;
      this.badge.textContent = "Video pendiente";
      return;
    }
    this.video.src = next;
    void this.video.play().catch(() => undefined);
  }
}
