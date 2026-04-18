import { NATURE_BY_ID } from "@/data/natures";
import { calcDamage, type DamageInput } from "./damage";
import { calcHp, calcStat, natureMultiplier } from "./stats";
import { resolveSpecies } from "./damage";
import type { PokemonInstance, Stats } from "./types";

const EV_STEP = 4;

export interface ReverseDefenseInput {
  base: DamageInput;
  /** 防御側の HP が「実数値で」減ったダメージ。% で来た場合は呼び出し側で実数化する */
  observedDamage: { min: number; max: number };
  /** 探索する努力値の対象（B か D） */
  defenseStatKey: "def" | "spd";
  /** 防御側の HP 努力値も探索する */
  searchHp?: boolean;
}

export interface ReverseCandidate {
  hpEv: number;
  defEv: number;
  hpStat: number;
  defStat: number;
  rolls: number[];
  /** 観測ダメージレンジを満たす確率の概算（合致した乱数 / 16） */
  matchRate: number;
}

/**
 * 観測ダメージから防御側の (HP振り, B/D振り) 候補を列挙する。
 * 努力値は 4 単位、性格補正は base.defender.natureId を尊重。
 */
export function reverseEstimateDefense(input: ReverseDefenseInput): ReverseCandidate[] {
  const { base, observedDamage, defenseStatKey, searchHp = true } = input;
  const def = base.defender;
  const species = resolveSpecies(def);
  const nature = NATURE_BY_ID[def.natureId] ?? NATURE_BY_ID["まじめ"];
  const candidates: ReverseCandidate[] = [];

  const hpEvs = searchHp ? evList() : [def.evs.hp];
  const defEvs = evList();

  const defMul = natureMultiplier(nature, defenseStatKey);

  for (const hpEv of hpEvs) {
    const hpStat = calcHp(species.baseStats.hp, def.ivs.hp, hpEv, def.level);
    for (const defEv of defEvs) {
      const defStat = calcStat(
        species.baseStats[defenseStatKey],
        def.ivs[defenseStatKey],
        defEv,
        def.level,
        defMul,
      );

      const tweaked: PokemonInstance = {
        ...def,
        evs: { ...def.evs, hp: hpEv, [defenseStatKey]: defEv } as Stats,
      };

      const result = calcDamage({ ...base, defender: tweaked });
      const matched = result.rolls.filter(
        (d) => d >= observedDamage.min && d <= observedDamage.max,
      ).length;
      if (matched > 0) {
        candidates.push({
          hpEv,
          defEv,
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
    return a.hpEv + a.defEv - (b.hpEv + b.defEv);
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
  evRequired: number;
  attackStat: number;
  oneShotRate: number;
  rolls: number[];
}

/** 達成条件を満たす最小の攻撃側 EV を求める（4 単位）。見つからなければ null */
export function findRequiredOffense(input: RequiredOffenseInput): RequiredOffenseResult | null {
  const { base, goal, offenseStatKey } = input;
  for (const ev of evList()) {
    const tweaked: PokemonInstance = {
      ...base.attacker,
      evs: { ...base.attacker.evs, [offenseStatKey]: ev } as Stats,
    };
    const r = calcDamage({ ...base, attacker: tweaked });
    if (meetsGoal(r.rolls, r.defenderHp, goal)) {
      return {
        evRequired: ev,
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
  // highRollKo：N ターン以内に倒せる乱数の割合がしきい値以上
  // 1ターンで倒せる乱数 = damage>=hp の割合
  if (goal.turns === 1) {
    const rate = rolls.filter((d) => d >= hp).length / rolls.length;
    return rate >= goal.rate;
  }
  // 簡易：2ターン以上の高乱数判定は「最低ダメージ * (turns - 1) + 最高ダメージ >= HP」で代替
  const minDmg = rolls[0];
  const maxDmg = rolls[rolls.length - 1];
  const possible = minDmg * (goal.turns - 1) + maxDmg >= hp;
  return possible;
}

export function evList(): number[] {
  const out: number[] = [];
  for (let e = 0; e <= 252; e += EV_STEP) out.push(e);
  return out;
}
