import { describe, expect, it } from "vitest";
import { calcDamage } from "@/domain/damage";
import { findRequiredOffense, reverseEstimateDefense } from "@/domain/reverse";
import { makeEvs, makePokemon } from "@/domain/factory";
import { MOVE_BY_ID } from "@/data/moves";

describe("reverse", () => {
  it("往復一致：H252/D252 ヒードランで観測したダメージから振りを推定でき、元の振りが候補に含まれる", () => {
    const attacker = makePokemon("garchomp", {
      natureId: "ようき",
      ability: "さめはだ",
      evs: makeEvs({ atk: 252, spe: 252 }),
    });
    const defender = makePokemon("heatran", {
      natureId: "おだやか",
      ability: "もらいび",
      evs: makeEvs({ hp: 252, spd: 252, def: 4 }),
    });
    const base = {
      attacker,
      defender,
      move: MOVE_BY_ID["じしん"],
      field: { weather: "なし" as const, terrain: "なし" as const },
    };
    const result = calcDamage(base);

    // 観測：実数 min..max のレンジが見えた、と仮定して逆引き
    const candidates = reverseEstimateDefense({
      base,
      observedDamage: { min: result.min, max: result.max },
      defenseStatKey: "def",
    });

    expect(candidates.length).toBeGreaterThan(0);
    const matched = candidates.find((c) => c.hpEv === 252 && c.defEv === 4);
    expect(matched).toBeDefined();
    expect(matched?.matchRate).toBe(1);
  });

  it("必要火力：ガブで H4 ヒードランを確定1発に必要な A 努力値は 0 で足りる", () => {
    const attacker = makePokemon("garchomp", {
      natureId: "ようき",
      ability: "さめはだ",
      evs: makeEvs({ spe: 252 }), // ATK は 0 から探索
    });
    const defender = makePokemon("heatran", {
      natureId: "おだやか",
      ability: "もらいび",
      evs: makeEvs({ hp: 4 }),
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
    expect(r?.evRequired).toBe(0);
  });

  it("必要火力：素ガブの じしん で H252/B252 ハッサム わんぱくを確定1発するには A 努力値が大きく必要", () => {
    const attacker = makePokemon("garchomp", {
      natureId: "いじっぱり",
      ability: "さめはだ",
      evs: makeEvs({ spe: 0 }),
    });
    const defender = makePokemon("scizor", {
      natureId: "わんぱく",
      ability: "テクニシャン",
      evs: makeEvs({ hp: 252, def: 252 }),
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
    // 等倍 1HKO は厳しい。null か非常に大きい EV のはず
    if (r) {
      expect(r.evRequired).toBeGreaterThan(200);
    }
  });
});
