import { describe, expect, it } from "vitest";
import { buildActualStats, calcHp, calcStat } from "@/domain/stats";
import { NATURE_BY_ID } from "@/data/natures";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { makeAps } from "@/domain/factory";

describe("stats", () => {
  it("HP 計算（ガブリアス 能力P=0）", () => {
    // floor((216+31+0)*50/100) + 60 = floor(123.5) + 60 = 183
    expect(calcHp(108, 0)).toBe(183);
  });

  it("HP 計算（ガブリアス 能力P=32）", () => {
    // floor((216+31+64)*50/100) + 60 = floor(155.5) + 60 = 215
    expect(calcHp(108, 32)).toBe(215);
  });

  it("HP 計算（ハピナス 能力P=0）", () => {
    // floor((510+31+0)*50/100) + 60 = floor(270.5) + 60 = 330
    expect(calcHp(255, 0)).toBe(330);
  });

  it("ATK 性格補正あり（種族値105 能力P=0 いじっぱり）", () => {
    // floor((floor((210+31+0)*50/100) + 5) * 1.1) = floor(125*1.1) = floor(137.5) = 137
    expect(calcStat(105, 0, 1.1)).toBe(137);
  });

  it("buildActualStats でガブ ATK能力P=32 SPE能力P=32 ようき", () => {
    const sp = POKEMON_BY_ID["garchomp"];
    const nature = NATURE_BY_ID["ようき"]; // +S -C
    const stats = buildActualStats(
      sp.baseStats,
      makeAps({ atk: 32, spe: 32 }),
      nature,
    );
    // ATK base=130, AP=32, neutral: floor((floor(355*0.5)+5)*1.0) = floor(177+5) = 182
    expect(stats.atk).toBe(182);
    // SPE base=102, AP=32, +10%: floor((floor(299*0.5)+5)*1.1) = floor(154*1.1) = floor(169.4) = 169
    expect(stats.spe).toBe(169);
    // SPA base=80, AP=0, -10%: floor((floor(191*0.5)+5)*0.9) = floor(100*0.9) = 90
    expect(stats.spa).toBe(90);
  });
});
