import { POKEMON } from "@/data/pokemon";
import { makeAps, makePokemon } from "./factory";
import type { PokemonInstance } from "./types";

export const PARTY_SIZE = 6;
export const MAX_MOVES_PER_POKEMON = 4;

export interface PartyPokemon {
  pokemon: PokemonInstance;
  moves: string[];
}

export interface Party {
  id: string;
  name: string;
  members: PartyPokemon[];
  updatedAt: number;
}

export function defaultPartyMember(): PartyPokemon {
  const species = POKEMON[0];
  return {
    pokemon: makePokemon(species.id, {
      ability: species.abilities[0] ?? "",
      aps: makeAps({}),
    }),
    moves: [],
  };
}

export function defaultPartyName(index: number): string {
  return `パーティ ${index + 1}`;
}

export function createEmptyParty(name: string): Party {
  return {
    id: generatePartyId(),
    name,
    members: Array.from({ length: PARTY_SIZE }, () => defaultPartyMember()),
    updatedAt: Date.now(),
  };
}

function generatePartyId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `party-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
