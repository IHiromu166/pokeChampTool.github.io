import { NATURE_BY_ID } from "@/data/natures";
import { calcDamage, resolveSpecies, type DamageInput } from "./damage";
import { calcHp, calcStat, natureMultiplier } from "./stats";
import { apList } from "./reverse";
import type { PokemonInstance, Stats } from "./types";

export interface Threat {
  id: string;
  /** 攻撃側ポケモン + 技 + 場の状態 */
  input: DamageInput;
  /** 達成条件：確定耐え or 乱数N%以下で倒される */
  goal: { kind: "survive" } | { kind: "lessThan"; rate: number };
}

export interface BulkPlan {
  hpAp: number;
  defAp: number;
  spdAp: number;
  hpStat: number;
  defStat: number;
  spdStat: number;
  /** 各脅威への被ダメ% （最大乱数のパーセント） */
  perThreat: { id: string; maxPercent: number; oneShotRate: number; survives: boolean }[];
}

export interface BulkTuningInput {
  defender: PokemonInstance;
  threats: Threat[];
  /** どの軸を探索するか。指定された軸のみ能力ポイントを変動 */
  axes: { hp: boolean; def: boolean; spd: boolean };
  /** 結果上位件数（デフォルト 10） */
  topN?: number;
}

/**
 * 全脅威条件を満たす H/B/D 能力ポイント配分の上位案を返す。
 * 能力ポイントは 1 単位。指定軸以外は defender.aps の値で固定。
 */
export function tuneBulk(input: BulkTuningInput): BulkPlan[] {
  const { defender, threats, axes, topN = 10 } = input;
  const species = resolveSpecies(defender);
  const nature = NATURE_BY_ID[defender.natureId] ?? NATURE_BY_ID["まじめ"];
  const defMul = natureMultiplier(nature, "def");
  const spdMul = natureMultiplier(nature, "spd");

  const otherApSum =
    defender.aps.atk + defender.aps.spa + defender.aps.spe;
  const apCap = 66 - otherApSum;

  const hpRange = axes.hp ? apList() : [defender.aps.hp];
  const defRange = axes.def ? apList() : [defender.aps.def];
  const spdRange = axes.spd ? apList() : [defender.aps.spd];

  const plans: BulkPlan[] = [];

  for (const hpAp of hpRange) {
    for (const defAp of defRange) {
      if (hpAp + defAp > apCap) continue;
      for (const spdAp of spdRange) {
        if (hpAp + defAp + spdAp > apCap) continue;
        const hpStat = calcHp(species.baseStats.hp, hpAp);
        const defStat = calcStat(species.baseStats.def, defAp, defMul);
        const spdStat = calcStat(species.baseStats.spd, spdAp, spdMul);

        const tweaked: PokemonInstance = {
          ...defender,
          aps: { ...defender.aps, hp: hpAp, def: defAp, spd: spdAp } as Stats,
        };

        const perThreat: BulkPlan["perThreat"] = [];
        let allOk = true;
        for (const t of threats) {
          const r = calcDamage({ ...t.input, defender: tweaked });
          const maxDmg = r.rolls[r.rolls.length - 1];
          const maxPercent = (maxDmg / r.defenderHp) * 100;
          const oneShotRate = r.oneShotRate;

          let survives = true;
          if (t.goal.kind === "survive") {
            survives = maxDmg < r.defenderHp;
          } else {
            survives = oneShotRate <= t.goal.rate;
          }
          if (!survives) {
            allOk = false;
            perThreat.push({ id: t.id, maxPercent, oneShotRate, survives });
            break;
          }
          perThreat.push({ id: t.id, maxPercent, oneShotRate, survives });
        }

        if (!allOk) continue;

        plans.push({ hpAp, defAp, spdAp, hpStat, defStat, spdStat, perThreat });
      }
    }
  }

  // ランキング：投資が少ない順 → HP 実数値が高い順 → B/D バランスの良い順
  plans.sort((a, b) => {
    const sumA = a.hpAp + a.defAp + a.spdAp;
    const sumB = b.hpAp + b.defAp + b.spdAp;
    if (sumA !== sumB) return sumA - sumB;
    if (b.hpStat !== a.hpStat) return b.hpStat - a.hpStat;
    return Math.abs(a.defStat - a.spdStat) - Math.abs(b.defStat - b.spdStat);
  });

  return plans.slice(0, topN);
}
