import type { Nature, StatKey, Stats } from "./types";

/**
 * 通常ステータス（HP 以外）の実数値計算（第3世代以降同式）。
 *   floor( (floor((2*B + I + floor(E/4)) * L / 100) + 5) * nature )
 */
export function calcStat(
  base: number,
  iv: number,
  ev: number,
  level: number,
  natureMultiplier: 1 | 1.1 | 0.9,
): number {
  const inner = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
  return Math.floor(inner * natureMultiplier);
}

/** HP 実数値： floor((2*B + I + floor(E/4)) * L / 100) + L + 10 */
export function calcHp(base: number, iv: number, ev: number, level: number): number {
  if (base === 1) return 1; // ヌケニン
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
}

export function natureMultiplier(
  nature: Nature,
  stat: Exclude<StatKey, "hp">,
): 1 | 1.1 | 0.9 {
  if (nature.plus === stat && nature.minus !== stat) return 1.1;
  if (nature.minus === stat && nature.plus !== stat) return 0.9;
  return 1;
}

export function buildActualStats(
  base: Stats,
  ivs: Stats,
  evs: Stats,
  level: number,
  nature: Nature,
): Stats {
  return {
    hp: calcHp(base.hp, ivs.hp, evs.hp, level),
    atk: calcStat(base.atk, ivs.atk, evs.atk, level, natureMultiplier(nature, "atk")),
    def: calcStat(base.def, ivs.def, evs.def, level, natureMultiplier(nature, "def")),
    spa: calcStat(base.spa, ivs.spa, evs.spa, level, natureMultiplier(nature, "spa")),
    spd: calcStat(base.spd, ivs.spd, evs.spd, level, natureMultiplier(nature, "spd")),
    spe: calcStat(base.spe, ivs.spe, evs.spe, level, natureMultiplier(nature, "spe")),
  };
}

/** ランク補正の倍率（HP 以外。急所時は防御側のプラス補正を無視するなどの処理は呼び出し側で） */
export function boostMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  if (s >= 0) return (2 + s) / 2;
  return 2 / (2 - s);
}
