import type { PokemonInstance, Stats } from "./types";

export function makeAps(partial: Partial<Stats>, fill = 0): Stats {
  return {
    hp: partial.hp ?? fill,
    atk: partial.atk ?? fill,
    def: partial.def ?? fill,
    spa: partial.spa ?? fill,
    spd: partial.spd ?? fill,
    spe: partial.spe ?? fill,
  };
}

export const ZERO_APS: Stats = makeAps({}, 0);

export function makePokemon(
  speciesId: string,
  opts: Partial<Omit<PokemonInstance, "speciesId">> = {},
): PokemonInstance {
  return {
    speciesId,
    natureId: opts.natureId ?? "まじめ",
    ability: opts.ability ?? "",
    item: opts.item,
    aps: opts.aps ?? ZERO_APS,
    boosts: opts.boosts,
    status: opts.status,
    mega: opts.mega,
  };
}
