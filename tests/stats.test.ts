import { describe, expect, it } from "vitest";
import { buildActualStats, calcHp, calcStat } from "@/domain/stats";
import { NATURE_BY_ID } from "@/data/natures";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { PERFECT_IVS, makeEvs } from "@/domain/factory";

describe("stats", () => {
  it("HP 計算（ガブリアス Lv50 H252）", () => {
    expect(calcHp(108, 31, 252, 50)).toBe(215);
  });

  it("HP 計算（ハピナス Lv50 H252）", () => {
    expect(calcHp(255, 31, 252, 50)).toBe(362);
  });

  it("ATK 性格補正あり（メガクチート Lv50 A252 いじっぱり = 172, ちからもちで実質 344）", () => {
    expect(calcStat(105, 31, 252, 50, 1.1)).toBe(172);
  });

  it("buildActualStats でガブ A252 ようき", () => {
    const sp = POKEMON_BY_ID["garchomp"];
    const nature = NATURE_BY_ID["ようき"]; // +S -C
    const stats = buildActualStats(
      sp.baseStats,
      PERFECT_IVS,
      makeEvs({ atk: 252, spe: 252 }),
      50,
      nature,
    );
    expect(stats.atk).toBe(182);
    expect(stats.spe).toBe(169);
    expect(stats.spa).toBe(90); // base 80, EV0, ようき -SPA → floor(100*0.9)=90
  });
});
