import { describe, expect, it } from "vitest";
import { tuneBulk, type Threat } from "@/domain/bulk-tuning";
import { makeEvs, makePokemon } from "@/domain/factory";
import { MOVE_BY_ID } from "@/data/moves";

describe("bulk-tuning", () => {
  it("メガクチート ふいうち を確定耐えする H/D 配分が提案される", () => {
    const defender = makePokemon("hydreigon", {
      natureId: "おだやか",
      ability: "ふゆう",
      evs: makeEvs({}, 0),
    });

    const threats: Threat[] = [
      {
        id: "メガクチート ふいうち",
        input: {
          attacker: makePokemon("mawile", {
            natureId: "いじっぱり",
            ability: "いかく",
            item: "クチートナイト",
            evs: makeEvs({ atk: 252 }),
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
    // すべての提案が脅威を耐えていること
    for (const p of plans) {
      expect(p.perThreat.every((t) => t.survives)).toBe(true);
    }
    // 最小投資のプランが先頭
    const sorted = [...plans].sort(
      (a, b) => a.hpEv + a.defEv + a.spdEv - (b.hpEv + b.defEv + b.spdEv),
    );
    expect(plans[0].hpEv + plans[0].defEv + plans[0].spdEv).toBe(
      sorted[0].hpEv + sorted[0].defEv + sorted[0].spdEv,
    );
  });
});
