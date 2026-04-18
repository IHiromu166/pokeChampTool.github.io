import { describe, expect, it } from "vitest";
import { tuneBulk, type Threat } from "@/domain/bulk-tuning";
import { makeAps, makePokemon } from "@/domain/factory";
import { MOVE_BY_ID } from "@/data/moves";

describe("bulk-tuning", () => {
  it("メガクチート ふいうち を確定耐えする H/D 配分が提案される", () => {
    const defender = makePokemon("hydreigon", {
      natureId: "おだやか",
      ability: "ふゆう",
      aps: makeAps({}),
    });

    const threats: Threat[] = [
      {
        id: "メガクチート ふいうち",
        input: {
          attacker: makePokemon("mawile", {
            natureId: "いじっぱり",
            ability: "いかく",
            item: "クチートナイト",
            aps: makeAps({ atk: 32 }),
            mega: true,
          }),
          defender,
          move: MOVE_BY_ID["ふいうち"],
          field: { weather: "なし", terrain: "なし" },
        },
        goal: { kind: "survive" },
      },
    ];

    const plans = tuneBulk({
      defender,
      threats,
      axes: { hp: true, def: true, spd: false },
      topN: 5,
    });

    expect(plans.length).toBeGreaterThan(0);
    for (const p of plans) {
      expect(p.perThreat.every((t) => t.survives)).toBe(true);
    }
    // 最小投資のプランが先頭
    const sorted = [...plans].sort(
      (a, b) => a.hpAp + a.defAp + a.spdAp - (b.hpAp + b.defAp + b.spdAp),
    );
    expect(plans[0].hpAp + plans[0].defAp + plans[0].spdAp).toBe(
      sorted[0].hpAp + sorted[0].defAp + sorted[0].spdAp,
    );
  });
});
