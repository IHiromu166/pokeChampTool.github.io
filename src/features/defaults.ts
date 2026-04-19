import { makeAps, makePokemon } from "@/domain/factory";
import type { FieldState, PokemonInstance } from "@/domain/types";

export function defaultAttacker(): PokemonInstance {
  return makePokemon("garchomp", {
    natureId: "ようき",
    ability: "さめはだ",
    item: "なし",
    aps: makeAps({}),
  });
}

export function defaultDefender(): PokemonInstance {
  return makePokemon("scizor", {
    natureId: "わんぱく",
    ability: "テクニシャン",
    item: "なし",
    aps: makeAps({}),
  });
}

export function defaultField(): FieldState {
  return { weather: "なし", terrain: "なし" };
}
