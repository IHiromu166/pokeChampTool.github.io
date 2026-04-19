import { calcDamage, type DamageInput } from "./damage";
import { ITEMS } from "@/data/items";
import type { PokemonInstance, Stats, StatKey } from "./types";

const AP_STEP = 1;
const AP_MAX = 32;

type NatureDir = "plus" | "neutral" | "minus";

const NATURE_REP: Record<Exclude<StatKey, "hp" | "spe">, Record<NatureDir, string>> = {
  atk: { plus: "いじっぱり", neutral: "がんばりや", minus: "ずぶとい" },
  def: { plus: "わんぱく", neutral: "がんばりや", minus: "おっとり" },
  spa: { plus: "ひかえめ", neutral: "がんばりや", minus: "いじっぱり" },
  spd: { plus: "しんちょう", neutral: "がんばりや", minus: "うっかりや" },
};

const NATURE_LABEL: Record<NatureDir, string> = {
  plus: "+",
  neutral: "中",
  minus: "-",
};

function itemOptionsForType(type: string): string[] {
  const opts = ["なし"];
  const boost = ITEMS.find((i) => i.typeBoostType === type);
  if (boost) opts.push(boost.id);
  return opts;
}

export interface ReverseDefenseInput {
  base: DamageInput;
  observedRemainingPct: number;
  defenseStatKey: "def" | "spd";
  searchHp?: boolean;
}

export interface ReverseCandidate {
  hpAp: number;
  defAp: number;
  hpStat: number;
  defStat: number;
  natureId: string;
  natureLabel: string;
  itemId: string;
  rolls: number[];
  matchRate: number;
}

export function reverseEstimateDefense(input: ReverseDefenseInput): ReverseCandidate[] {
  const { base, observedRemainingPct, defenseStatKey, searchHp = true } = input;
  const def = base.defender;
  const candidates: ReverseCandidate[] = [];

  const hpAps = searchHp ? apList() : [def.aps.hp];
  const defAps = apList();
  const itemOpts = itemOptionsForType(base.move.type);
  const natureDirs: NatureDir[] = ["plus", "neutral", "minus"];

  for (const dir of natureDirs) {
    const natureId = NATURE_REP[defenseStatKey][dir];
    for (const itemId of itemOpts) {
      for (const hpAp of hpAps) {
        for (const defAp of defAps) {
          const tweaked: PokemonInstance = {
            ...def,
            natureId,
            item: itemId,
            aps: { ...def.aps, hp: hpAp, [defenseStatKey]: defAp } as Stats,
          };

          const result = calcDamage({ ...base, defender: tweaked });
          const hpStat = result.defenderHp;
          const matched = result.rolls.filter(
            (d) => Math.max(0, Math.round(((hpStat - d) / hpStat) * 100)) === observedRemainingPct,
          ).length;
          if (matched > 0) {
            candidates.push({
              hpAp,
              defAp,
              hpStat,
              defStat: result.defenseStat,
              natureId,
              natureLabel: NATURE_LABEL[dir],
              itemId,
              rolls: result.rolls,
              matchRate: matched / 16,
            });
          }
        }
      }
    }
  }

  candidates.sort((a, b) => {
    if (b.matchRate !== a.matchRate) return b.matchRate - a.matchRate;
    return a.hpAp + a.defAp - (b.hpAp + b.defAp);
  });
  return candidates;
}

export interface ReverseOffenseInput {
  base: DamageInput;
  observedRemainingHp: number;
  offenseStatKey: "atk" | "spa";
}

export interface ReverseOffenseCandidate {
  atkAp: number;
  attackStat: number;
  natureId: string;
  natureLabel: string;
  itemId: string;
  rolls: number[];
  matchRate: number;
}

export function reverseEstimateOffense(input: ReverseOffenseInput): ReverseOffenseCandidate[] {
  const { base, observedRemainingHp, offenseStatKey } = input;
  const candidates: ReverseOffenseCandidate[] = [];
  const itemOpts = itemOptionsForType(base.move.type);
  const natureDirs: NatureDir[] = ["plus", "neutral", "minus"];

  for (const dir of natureDirs) {
    const natureId = NATURE_REP[offenseStatKey][dir];
    for (const itemId of itemOpts) {
      for (const ap of apList()) {
        const tweaked: PokemonInstance = {
          ...base.attacker,
          natureId,
          item: itemId,
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
            natureId,
            natureLabel: NATURE_LABEL[dir],
            itemId,
            rolls: result.rolls,
            matchRate: matched / 16,
          });
        }
      }
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
