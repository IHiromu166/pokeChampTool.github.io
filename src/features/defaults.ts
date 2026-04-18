import { makeAps, makePokemon } from "@/domain/factory";
import type { FieldState, PokemonInstance } from "@/domain/types";

export function defaultAttacker(): PokemonInstance {
  return makePokemon("garchomp", {
    natureId: "ようき",
    ability: "さめはだ",
    item: "なし",
    aps: makeAps({ atk: 32, spe: 32 }),
  });
}

export function defaultDefender(): PokemonInstance {
  return makePokemon("scizor", {
    natureId: "わんぱく",
    ability: "テクニシャン",
    item: "なし",
    aps: makeAps({ hp: 32, def: 32 }),
  });
}

export function defaultField(): FieldState {
  return { weather: "なし", terrain: "なし" };
}
