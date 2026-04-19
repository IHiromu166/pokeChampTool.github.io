import { NATURE_BY_ID } from "@/data/natures";
import { calcDamage, type DamageInput } from "./damage";
import { calcHp, calcStat, natureMultiplier } from "./stats";
import { resolveSpecies } from "./damage";
import type { PokemonInstance, Stats } from "./types";

const AP_STEP = 1;
const AP_MAX = 32;

export interface ReverseDefenseInput {
  base: DamageInput;
  /** 画面に表示された相手の残り体力 (0〜100 の整数 %) */
  observedRemainingPct: number;
  /** 探索する能力ポイントの対象（B か D） */
  defenseStatKey: "def" | "spd";
  /** 防御側の HP 能力ポイントも探索する */
  searchHp?: boolean;
}

export interface ReverseCandidate {
  hpAp: number;
  defAp: number;
  hpStat: number;
  defStat: number;
  rolls: number[];
  /** 観測ダメージレンジを満たす確率の概算（合致した乱数 / 16） */
  matchRate: number;
}

/**
 * 観測ダメージから防御側の (HP振り, B/D振り) 候補を列挙する。
 * 能力ポイントは 1 単位、性格補正は base.defender.natureId を尊重。
 */
export function reverseEstimateDefense(input: ReverseDefenseInput): ReverseCandidate[] {
  const { base, observedRemainingPct, defenseStatKey, searchHp = true } = input;
  const def = base.defender;
  const species = resolveSpecies(def);
  const nature = NATURE_BY_ID[def.natureId] ?? NATURE_BY_ID["まじめ"];
  const candidates: ReverseCandidate[] = [];

  const hpAps = searchHp ? apList() : [def.aps.hp];
  const defAps = apList();

  const defMul = natureMultiplier(nature, defenseStatKey);

  for (const hpAp of hpAps) {
    const hpStat = calcHp(species.baseStats.hp, hpAp);
    for (const defAp of defAps) {
      const defStat = calcStat(species.baseStats[defenseStatKey], defAp, defMul);

      const tweaked: PokemonInstance = {
        ...def,
        aps: { ...def.aps, hp: hpAp, [defenseStatKey]: defAp } as Stats,
      };

      const result = calcDamage({ ...base, defender: tweaked });
      const matched = result.rolls.filter(
        (d) => Math.max(0, Math.round(((hpStat - d) / hpStat) * 100)) === observedRemainingPct,
      ).length;
      if (matched > 0) {
        candidates.push({
          hpAp,
          defAp,
          hpStat,
          defStat,
          rolls: result.rolls,
          matchRate: matched / 16,
        });
      }
    }
  }

  // matchRate 高い順 → 投資が少ない順（HP+B 合計）
  candidates.sort((a, b) => {
    if (b.matchRate !== a.matchRate) return b.matchRate - a.matchRate;
    return a.hpAp + a.defAp - (b.hpAp + b.defAp);
  });
  return candidates;
}

export interface ReverseOffenseInput {
  base: DamageInput;
  /** 観測した防御側残HPの実数値 */
  observedRemainingHp: number;
  offenseStatKey: "atk" | "spa";
}

export interface ReverseOffenseCandidate {
  atkAp: number;
  attackStat: number;
  rolls: number[];
  matchRate: number;
}

export function reverseEstimateOffense(input: ReverseOffenseInput): ReverseOffenseCandidate[] {
  const { base, observedRemainingHp, offenseStatKey } = input;
  const candidates: ReverseOffenseCandidate[] = [];

  for (const ap of apList()) {
    const tweaked: PokemonInstance = {
      ...base.attacker,
      aps: { ...base.attacker.aps, [offenseStatKey]: ap } as Stats,
    };
    const result = calcDamage({ ...base, attacker: tweaked });
    const matched = result.rolls.filter(
      (d) => Math.max(0, result.defenderHp - d) === observedRemainingHp,
    ).length;
    if (matched > 0) {
      candidates.push({
        atkAp: ap,
        attackStat: result.attackStat,
        rolls: result.rolls,
        matchRate: matched / 16,
      });
    }
  }

  candidates.sort((a, b) => {
    if (b.matchRate !== a.matchRate) return b.matchRate - a.matchRate;
    return a.atkAp - b.atkAp;
  });
  return candidates;
}

export interface RequiredOffenseInput {
  base: DamageInput;
  /** "確定1発" or "乱数1発N%以上" or "乱数2発N%以上" */
  goal:
    | { kind: "guaranteedKo"; turns: number }
    | { kind: "highRollKo"; turns: number; rate: number };
  offenseStatKey: "atk" | "spa";
}

export interface RequiredOffenseResult {
  apRequired: number;
  attackStat: number;
  oneShotRate: number;
  rolls: number[];
}

/** 達成条件を満たす最小の攻撃側能力ポイントを求める（1 単位）。見つからなければ null */
export function findRequiredOffense(input: RequiredOffenseInput): RequiredOffenseResult | null {
  const { base, goal, offenseStatKey } = input;
  for (const ap of apList()) {
    const tweaked: PokemonInstance = {
      ...base.attacker,
      aps: { ...base.attacker.aps, [offenseStatKey]: ap } as Stats,
    };
    const r = calcDamage({ ...base, attacker: tweaked });
    if (meetsGoal(r.rolls, r.defenderHp, goal)) {
      return {
        apRequired: ap,
        attackStat: r.attackStat,
        oneShotRate: r.oneShotRate,
        rolls: r.rolls,
      };
    }
  }
  return null;
}

function meetsGoal(
  rolls: number[],
  hp: number,
  goal: RequiredOffenseInput["goal"],
): boolean {
  if (goal.kind === "guaranteedKo") {
    const minDmg = rolls[0];
    if (minDmg <= 0) return false;
    return Math.ceil(hp / minDmg) <= goal.turns;
  }
  if (goal.turns === 1) {
    const rate = rolls.filter((d) => d >= hp).length / rolls.length;
    return rate >= goal.rate;
  }
  const minDmg = rolls[0];
  const maxDmg = rolls[rolls.length - 1];
  return minDmg * (goal.turns - 1) + maxDmg >= hp;
}

export function apList(): number[] {
  const out: number[] = [];
  for (let a = 0; a <= AP_MAX; a += AP_STEP) out.push(a);
  return out;
}
