export type GameStatus = "idle" | "running" | "paused" | "won" | "lost";
export type BeepInterval = 5 | 10 | 30 | 0;

export interface GameState {
  status: GameStatus;
  characterId: import("./characters").CharacterId;
  durationMinutes: number;
  remainingMs: number;
  beepInterval: BeepInterval;
}

export const MIN_MINUTES = 1;
export const MAX_MINUTES = 60;
export const DEFAULT_MINUTES = 10;
export const DEFAULT_BEEP: BeepInterval = 10;

export function clampMinutes(value: number): number {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(value)));
}

export function minutesToMs(minutes: number): number {
  return clampMinutes(minutes) * 60_000;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function createInitialState(): GameState {
  return {
    status: "idle",
    characterId: "sonic",
    durationMinutes: DEFAULT_MINUTES,
    remainingMs: minutesToMs(DEFAULT_MINUTES),
    beepInterval: DEFAULT_BEEP,
  };
}
