import { NATURE_BY_ID } from "@/data/natures";
import { calcDamage, resolveSpecies, type DamageInput } from "./damage";
import { calcHp, calcStat, natureMultiplier } from "./stats";
import { evList } from "./reverse";
import type { PokemonInstance, Stats } from "./types";

export interface Threat {
  id: string;
  /** 攻撃側ポケモン + 技 + 場の状態 */
  input: DamageInput;
  /** 達成条件：確定耐え or 乱数N%以下で倒される */
  goal: { kind: "survive" } | { kind: "lessThan"; rate: number };
}

export interface BulkPlan {
  hpEv: number;
  defEv: number;
  spdEv: number;
  hpStat: number;
  defStat: number;
  spdStat: number;
  /** 余り EV */
  remainingEv: number;
  /** 各脅威への被ダメ% （最大乱数のパーセント） */
  perThreat: { id: string; maxPercent: number; oneShotRate: number; survives: boolean }[];
}

export interface BulkTuningInput {
  defender: PokemonInstance;
  threats: Threat[];
  /** どの軸を探索するか。指定された軸のみ EV を変動 */
  axes: { hp: boolean; def: boolean; spd: boolean };
  /** 結果上位件数（デフォルト 10） */
  topN?: number;
}

/**
 * 全脅威条件を満たす H/B/D 努力値配分の上位案を返す。
 * EV 4 単位、合計 ≤ 510。指定軸以外は defender.evs の値で固定。
 */
export function tuneBulk(input: BulkTuningInput): BulkPlan[] {
  const { defender, threats, axes, topN = 10 } = input;
  const species = resolveSpecies(defender);
  const nature = NATURE_BY_ID[defender.natureId] ?? NATURE_BY_ID["まじめ"];
  const defMul = natureMultiplier(nature, "def");
  const spdMul = natureMultiplier(nature, "spd");

  const otherEvSum =
    defender.evs.atk + defender.evs.spa + defender.evs.spe; // HP / B / D 以外の合計
  const evCap = 510 - otherEvSum;

  const hpRange = axes.hp ? evList() : [defender.evs.hp];
  const defRange = axes.def ? evList() : [defender.evs.def];
  const spdRange = axes.spd ? evList() : [defender.evs.spd];

  // 脅威ごとに「攻撃側 + 技 + 場 + 攻撃側ステータス」を 1 度評価しても、
  // 防御側ステータスが変わるため毎回 calcDamage が必要。
  // ただし軸に含まれない値は固定で済むので range が短ければ高速。

  const plans: BulkPlan[] = [];

  for (const hpEv of hpRange) {
    for (const defEv of defRange) {
      if (hpEv + defEv > evCap) continue;
      for (const spdEv of spdRange) {
        if (hpEv + defEv + spdEv > evCap) continue;

        const hpStat = calcHp(species.baseStats.hp, defender.ivs.hp, hpEv, defender.level);
        const defStat = calcStat(
          species.baseStats.def, defender.ivs.def, defEv, defender.level, defMul,
        );
        const spdStat = calcStat(
          species.baseStats.spd, defender.ivs.spd, spdEv, defender.level, spdMul,
        );

        const tweaked: PokemonInstance = {
          ...defender,
          evs: { ...defender.evs, hp: hpEv, def: defEv, spd: spdEv } as Stats,
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
            // 早期に切り上げ
            perThreat.push({ id: t.id, maxPercent, oneShotRate, survives });
            break;
          }
          perThreat.push({ id: t.id, maxPercent, oneShotRate, survives });
        }

        if (!allOk) continue;

        plans.push({
          hpEv,
          defEv,
          spdEv,
          hpStat,
          defStat,
          spdStat,
          remainingEv: evCap - hpEv - defEv - spdEv,
          perThreat,
        });
      }
    }
  }

  // ランキング：投資が少ない順 → HP 実数値が高い順 → B/D バランスの良い順
  plans.sort((a, b) => {
    const sumA = a.hpEv + a.defEv + a.spdEv;
    const sumB = b.hpEv + b.defEv + b.spdEv;
    if (sumA !== sumB) return sumA - sumB;
    if (b.hpStat !== a.hpStat) return b.hpStat - a.hpStat;
    return Math.abs(a.defStat - a.spdStat) - Math.abs(b.defStat - b.spdStat);
  });

  return plans.slice(0, topN);
}
