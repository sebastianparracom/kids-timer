export type CharacterId = "sonic" | "amy";

export interface Character {
  id: CharacterId;
  name: string;
  accent: string;
  portrait: string;
  videos: {
    loop: string;
    win: string;
    lose: string;
  };
}

export const CHARACTERS: Character[] = [
  {
    id: "sonic",
    name: "Sonic",
    accent: "#1B9FFF",
    portrait: "/characters/sonic.png",
    videos: {
      loop: "/videos/sonic/loop.mp4",
      win: "/videos/sonic/win.mp4",
      lose: "/videos/sonic/lose.mp4",
    },
  },
  {
    id: "amy",
    name: "Amy",
    accent: "#FF4D8D",
    portrait: "/characters/amy.png",
    videos: {
      loop: "/videos/amy/loop.mp4",
      win: "/videos/amy/win.mp4",
      lose: "/videos/amy/lose.mp4",
    },
  },
];

export function getCharacter(id: CharacterId): Character {
  const found = CHARACTERS.find((character) => character.id === id);
  if (!found) throw new Error(`Personaje desconocido: ${id}`);
  return found;
}

export function videoList(character: Character): string[] {
  return [character.videos.loop, character.videos.win, character.videos.lose];
}
