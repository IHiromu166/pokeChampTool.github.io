import { makeEvs, makePokemon, PERFECT_IVS } from "@/domain/factory";
import type { FieldState, PokemonInstance } from "@/domain/types";

export function defaultAttacker(): PokemonInstance {
  return makePokemon("garchomp", {
    natureId: "ようき",
    ability: "さめはだ",
    item: "なし",
    evs: makeEvs({ atk: 252, spe: 252, hp: 4 }),
    ivs: PERFECT_IVS,
  });
}

export function defaultDefender(): PokemonInstance {
  return makePokemon("scizor", {
    natureId: "わんぱく",
    ability: "テクニシャン",
    item: "なし",
    evs: makeEvs({ hp: 252, def: 252 }),
    ivs: PERFECT_IVS,
  });
}

export function defaultField(): FieldState {
  return { weather: "なし", terrain: "なし" };
}
