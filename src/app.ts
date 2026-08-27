import { BeepEngine } from "./beep";
import { CHARACTERS, getCharacter, videoList, type CharacterId } from "./characters";
import { FxLayer } from "./fx";
import { HourglassScene } from "./hourglass";
import {
  clampMinutes,
  createInitialState,
  formatClock,
  minutesToMs,
  type BeepInterval,
  type GameState,
} from "./state";
import { VideoStage } from "./video";

export function mountApp(root: HTMLElement): void {
  const state: GameState = createInitialState();
  const beep = new BeepEngine();
  const fx = new FxLayer(document.querySelector("#fx-canvas") as HTMLCanvasElement);
  const hourglass = new HourglassScene(document.querySelector("#hourglass") as HTMLElement);
  const video = new VideoStage(
    document.querySelector("#video-stage") as HTMLElement,
    document.querySelector("#player") as HTMLVideoElement,
    document.querySelector("#poster") as HTMLImageElement,
    document.querySelector("#video-badge") as HTMLElement,
  );

  const characterList = document.querySelector("#character-list") as HTMLElement;
  const minutesValue = document.querySelector("#minutes-value") as HTMLOutputElement;
  const clockEl = document.querySelector("#hourglass-clock") as HTMLElement;
  const toggleBtn = document.querySelector("#toggle-run") as HTMLButtonElement;
  const resetBtn = document.querySelector("#reset") as HTMLButtonElement;
  const finishBtn = document.querySelector("#finish") as HTMLButtonElement;
  const minutesDown = document.querySelector("#minutes-down") as HTMLButtonElement;
  const minutesUp = document.querySelector("#minutes-up") as HTMLButtonElement;
  const outcome = document.querySelector("#outcome") as HTMLElement;
  const outcomeKicker = document.querySelector("#outcome-kicker") as HTMLElement;
  const outcomeTitle = document.querySelector("#outcome-title") as HTMLElement;
  const outcomeCopy = document.querySelector("#outcome-copy") as HTMLElement;

  let lastTs = performance.now();

  CHARACTERS.forEach((character) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "character-card";
    button.dataset.id = character.id;
    button.innerHTML = `<img alt="${character.name}" src="${character.portrait}" /><span>${character.name}</span>`;
    button.addEventListener("click", () => selectCharacter(character.id));
    characterList.append(button);
    preloadVideos(character);
  });

  video.setPoster(getCharacter(state.characterId).portrait, getCharacter(state.characterId).name);

  document.querySelectorAll<HTMLButtonElement>("[data-beep]").forEach((button) => {
    button.addEventListener("click", () => {
      state.beepInterval = Number(button.dataset.beep) as BeepInterval;
      if (state.status === "running") beep.reset(performance.now() + state.beepInterval * 1000);
      syncBeepButtons();
    });
  });

  minutesDown.addEventListener("click", () => changeMinutes(state.durationMinutes - 1));
  minutesUp.addEventListener("click", () => changeMinutes(state.durationMinutes + 1));
  toggleBtn.addEventListener("click", () => void toggleRun());
  resetBtn.addEventListener("click", () => resetGame());
  finishBtn.addEventListener("click", () => finishWin());

  function selectCharacter(id: CharacterId): void {
    if (state.status !== "idle") return;
    state.characterId = id;
    const character = getCharacter(id);
    hourglass.setAccent(character.accent);
    video.setPoster(character.portrait, character.name);
    render();
  }

  function changeMinutes(next: number): void {
    if (state.status === "won" || state.status === "lost") return;
    const minutes = clampMinutes(next);
    state.durationMinutes = minutes;
    state.remainingMs = minutesToMs(minutes);
    if (state.status === "running") {
      beep.reset(performance.now() + state.beepInterval * 1000);
    }
    render();
  }

  async function toggleRun(): Promise<void> {
    if (state.status === "won" || state.status === "lost") return;
    if (state.status === "idle" || state.status === "paused") {
      await beep.ensure();
      const wasIdle = state.status === "idle";
      state.status = "running";
      beep.reset(performance.now() + state.beepInterval * 1000);
      if (wasIdle) {
        const character = getCharacter(state.characterId);
        video.play("loop", [character.videos.loop]);
      }
    } else if (state.status === "running") {
      state.status = "paused";
    }
    render();
  }

  function resetGame(): void {
    const minutes = state.durationMinutes;
    const characterId = state.characterId;
    const beepInterval = state.beepInterval;
    Object.assign(state, createInitialState(), { durationMinutes: minutes, characterId, beepInterval });
    state.remainingMs = minutesToMs(minutes);
    video.showPoster();
    fx.stop();
    outcome.hidden = true;
    render();
  }

  function finishWin(): void {
    if (state.status !== "running" && state.status !== "paused") return;
    state.status = "won";
    const character = getCharacter(state.characterId);
    video.play("win", [character.videos.win]);
    fx.startWin();
    outcome.hidden = false;
    outcomeKicker.textContent = "Misión cumplida";
    outcomeTitle.textContent = "¡Lo lograste!";
    outcomeCopy.textContent = "¡Personaje liberado! Pulsa Reiniciar para jugar otra vez.";
    render();
  }

  function finishLose(): void {
    state.status = "lost";
    state.remainingMs = 0;
    const character = getCharacter(state.characterId);
    video.play("lose", [character.videos.lose]);
    fx.startLose();
    outcome.hidden = false;
    outcomeKicker.textContent = "Tiempo agotado";
    outcomeTitle.textContent = "¡Se acabó el tiempo!";
    outcomeCopy.textContent = `No llegaste a rescatar a ${character.name}. Pulsa Reiniciar para intentarlo de nuevo.`;
    render();
  }

  function render(): void {
    root.dataset.character = state.characterId;
    root.dataset.status = state.status;
    minutesValue.value = String(state.durationMinutes);
    clockEl.textContent = formatClock(state.remainingMs);

    const lockedCharacter = state.status !== "idle";
    const lockedMinutes = state.status === "won" || state.status === "lost";
    const canFinish = state.status === "running" || state.status === "paused";
    const canToggle = state.status === "idle" || state.status === "running" || state.status === "paused";

    characterList.querySelectorAll<HTMLButtonElement>(".character-card").forEach((card) => {
      card.classList.toggle("is-selected", card.dataset.id === state.characterId);
      card.disabled = lockedCharacter;
    });

    minutesDown.disabled = lockedMinutes || state.durationMinutes <= 1;
    minutesUp.disabled = lockedMinutes || state.durationMinutes >= 60;
    finishBtn.disabled = !canFinish;
    toggleBtn.disabled = !canToggle;
    toggleBtn.textContent =
      state.status === "running" ? "Pausar" : state.status === "paused" ? "Reanudar" : "Iniciar";

    syncBeepButtons();
    hourglass.setAccent(getCharacter(state.characterId).accent);
  }

  function syncBeepButtons(): void {
    document.querySelectorAll<HTMLButtonElement>("[data-beep]").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.beep) === state.beepInterval);
    });
  }

  function frame(ts: number): void {
    const dt = ts - lastTs;
    lastTs = ts;
    if (state.status === "running") {
      state.remainingMs -= dt;
      if (state.remainingMs <= 0) {
        finishLose();
      } else {
        beep.tick(true, state.beepInterval, ts);
      }
      clockEl.textContent = formatClock(state.remainingMs);
    }
    hourglass.update(
      state.remainingMs,
      minutesToMs(state.durationMinutes),
      state.status === "running",
    );
    requestAnimationFrame(frame);
  }

  function preloadVideos(character: ReturnType<typeof getCharacter>): void {
    videoList(character).forEach((src) => {
      const el = document.createElement("video");
      el.preload = "auto";
      el.muted = true;
      el.src = src;
    });
  }

  render();
  requestAnimationFrame(frame);
}
