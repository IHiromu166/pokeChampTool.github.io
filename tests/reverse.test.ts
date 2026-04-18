import { describe, expect, it } from "vitest";
import { calcDamage } from "@/domain/damage";
import { findRequiredOffense, reverseEstimateDefense } from "@/domain/reverse";
import { calcHp } from "@/domain/stats";
import { makeAps, makePokemon } from "@/domain/factory";
import { MOVE_BY_ID } from "@/data/moves";

describe("reverse", () => {
  it("往復一致：AP=0 ヒードランで観測した残り体力%から振りを推定でき、元の振りが候補に含まれる", () => {
    const attacker = makePokemon("garchomp", {
      natureId: "ようき",
      ability: "さめはだ",
      aps: makeAps({ atk: 32, spe: 32 }),
    });
    const defender = makePokemon("heatran", {
      natureId: "おだやか",
      ability: "もらいび",
      aps: makeAps({}),
    });
    const base = {
      attacker,
      defender,
      move: MOVE_BY_ID["じしん"],
      field: { weather: "なし" as const, terrain: "なし" as const },
    };
    const result = calcDamage(base);
    // AP=0 ヒードランの HP 実数値から、最小ダメージ時の残り体力% を算出して入力値とする
    const hpStat = calcHp(91, 0); // ヒードラン base HP = 91
    const remainingPct = Math.max(0, Math.round(((hpStat - result.min) / hpStat) * 100));

    const candidates = reverseEstimateDefense({
      base,
      observedRemainingPct: remainingPct,
      defenseStatKey: "def",
    });

    expect(candidates.length).toBeGreaterThan(0);
    const matched = candidates.find((c) => c.hpAp === 0 && c.defAp === 0);
    expect(matched).toBeDefined();
  });

  it("必要火力：ガブで AP=0 ヒードランを確定1発に必要な A 能力ポイントは 0 で足りる", () => {
    const attacker = makePokemon("garchomp", {
      natureId: "ようき",
      ability: "さめはだ",
      aps: makeAps({ spe: 32 }),
    });
    const defender = makePokemon("heatran", {
      natureId: "おだやか",
      ability: "もらいび",
      aps: makeAps({}),
    });
    const r = findRequiredOffense({
      base: {
        attacker,
        defender,
        move: MOVE_BY_ID["じしん"],
        field: { weather: "なし", terrain: "なし" },
      },
      goal: { kind: "guaranteedKo", turns: 1 },
      offenseStatKey: "atk",
    });
    expect(r).not.toBeNull();
    expect(r?.apRequired).toBe(0);
  });

  it("必要火力：素ガブの じしん で H50/B50 ハッサム わんぱくを確定1発するには AP=50 でも足りない", () => {
    const attacker = makePokemon("garchomp", {
      natureId: "いじっぱり",
      ability: "さめはだ",
      aps: makeAps({}),
    });
    const defender = makePokemon("scizor", {
      natureId: "わんぱく",
      ability: "テクニシャン",
      aps: makeAps({ hp: 50, def: 50 }),
    });
    const r = findRequiredOffense({
      base: {
        attacker,
        defender,
        move: MOVE_BY_ID["じしん"],
        field: { weather: "なし", terrain: "なし" },
      },
      goal: { kind: "guaranteedKo", turns: 1 },
      offenseStatKey: "atk",
    });
    // 等倍 1HKO は最大 AP=50 でも達成できない
    expect(r).toBeNull();
  });
});
