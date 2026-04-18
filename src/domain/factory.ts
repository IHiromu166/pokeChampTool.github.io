import type { PokemonInstance, Stats } from "./types";

export function fullEv(stat: keyof Stats, base = 0): Stats {
  return makeEvs({ [stat]: 252 } as Partial<Stats>, base);
}

export function makeEvs(partial: Partial<Stats>, fill = 0): Stats {
  return {
    hp: partial.hp ?? fill,
    atk: partial.atk ?? fill,
    def: partial.def ?? fill,
    spa: partial.spa ?? fill,
    spd: partial.spd ?? fill,
    spe: partial.spe ?? fill,
  };
}

export const PERFECT_IVS: Stats = {
  hp: 31,
  atk: 31,
  def: 31,
  spa: 31,
  spd: 31,
  spe: 31,
};

export const ZERO_EVS: Stats = makeEvs({}, 0);

export function makePokemon(
  speciesId: string,
  opts: Partial<Omit<PokemonInstance, "speciesId">> = {},
): PokemonInstance {
  return {
    speciesId,
    level: opts.level ?? 50,
    natureId: opts.natureId ?? "まじめ",
    ability: opts.ability ?? "",
    item: opts.item,
    evs: opts.evs ?? ZERO_EVS,
    ivs: opts.ivs ?? PERFECT_IVS,
    boosts: opts.boosts,
    status: opts.status,
    mega: opts.mega,
  };
}
