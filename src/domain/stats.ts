import type { Nature, StatKey, Stats } from "./types";

/**
 * HP 以外の実数値（チャンピオンズ式）
 *   floor( (floor((2*B + 31 + AP*2) * 50/100) + 5) * nature )
 */
export function calcStat(
  base: number,
  ap: number,
  natureMultiplier: 1 | 1.1 | 0.9,
): number {
  const inner = Math.floor((2 * base + 31 + ap * 2) * 50 / 100) + 5;
  return Math.floor(inner * natureMultiplier);
}

/** HP 実数値： floor((2*B + 31 + AP*2) * 50/100) + 60 */
export function calcHp(base: number, ap: number): number {
  if (base === 1) return 1; // ヌケニン
  return Math.floor((2 * base + 31 + ap * 2) * 50 / 100) + 60;
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
  aps: Stats,
  nature: Nature,
): Stats {
  return {
    hp: calcHp(base.hp, aps.hp),
    atk: calcStat(base.atk, aps.atk, natureMultiplier(nature, "atk")),
    def: calcStat(base.def, aps.def, natureMultiplier(nature, "def")),
    spa: calcStat(base.spa, aps.spa, natureMultiplier(nature, "spa")),
    spd: calcStat(base.spd, aps.spd, natureMultiplier(nature, "spd")),
    spe: calcStat(base.spe, aps.spe, natureMultiplier(nature, "spe")),
  };
}

/** ランク補正の倍率（HP 以外。急所時は防御側のプラス補正を無視するなどの処理は呼び出し側で） */
export function boostMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  if (s >= 0) return (2 + s) / 2;
  return 2 / (2 - s);
}
