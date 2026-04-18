"use client";

import { useMemo, useState } from "react";
import { calcDamage } from "@/domain/damage";
import { MOVE_BY_ID } from "@/data/moves";
import {
  findRequiredOffense,
  reverseEstimateDefense,
  type ReverseCandidate,
  type RequiredOffenseResult,
} from "@/domain/reverse";
import { PokemonForm } from "@/features/PokemonForm";
import { FieldForm } from "@/features/FieldForm";
import { MovePicker } from "@/features/MovePicker";
import { defaultAttacker, defaultDefender, defaultField } from "@/features/defaults";

type Mode = "estimate" | "required";

export default function ReversePage() {
  const [mode, setMode] = useState<Mode>("estimate");
  const [attacker, setAttacker] = useState(defaultAttacker);
  const [defender, setDefender] = useState(defaultDefender);
  const [field, setField] = useState(defaultField);
  const [moveId, setMoveId] = useState("じしん");

  // 推定モード用
  const [observedRemaining, setObservedRemaining] = useState(63);
  const [defStat, setDefStat] = useState<"def" | "spd">("def");

  // 必要火力モード用
  const [goal, setGoal] = useState<"guaranteedKo" | "highRollKo">("guaranteedKo");
  const [highRollRate, setHighRollRate] = useState(0.5);
  const [offenseStat, setOffenseStat] = useState<"atk" | "spa">("atk");

  const move = MOVE_BY_ID[moveId];
  const baseInput = move ? { attacker, defender, move, field } : null;
  const liveResult = baseInput ? calcDamage(baseInput) : null;

  const candidates: ReverseCandidate[] = useMemo(() => {
    if (mode !== "estimate" || !baseInput) return [];
    return reverseEstimateDefense({
      base: baseInput,
      observedRemainingPct: observedRemaining,
      defenseStatKey: defStat,
    }).slice(0, 30);
  }, [mode, baseInput, observedRemaining, defStat]);

  const required: RequiredOffenseResult | null = useMemo(() => {
    if (mode !== "required" || !baseInput) return null;
    return findRequiredOffense({
      base: baseInput,
      goal:
        goal === "guaranteedKo"
          ? { kind: "guaranteedKo", turns: 1 }
          : { kind: "highRollKo", turns: 1, rate: highRollRate },
      offenseStatKey: offenseStat,
    });
  }, [mode, baseInput, goal, offenseStat, highRollRate]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">逆引き</h1>

      <div className="flex gap-2">
        <button
          className={mode === "estimate" ? "btn" : "btn-ghost"}
          onClick={() => setMode("estimate")}
        >
          ステータス推定
        </button>
        <button
          className={mode === "required" ? "btn" : "btn-ghost"}
          onClick={() => setMode("required")}
        >
          必要火力
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <PokemonForm title="攻撃側" value={attacker} onChange={setAttacker} side="atk" />
        <PokemonForm title="防御側" value={defender} onChange={setDefender} side="def" />
        <div className="space-y-4">
          <MovePicker
            value={moveId}
            onChange={setMoveId}
            attackerSpeciesId={attacker.speciesId}
          />
          <FieldForm value={field} onChange={setField} />
        </div>
      </div>

      {mode === "estimate" && (
        <div className="panel space-y-3">
          <div className="text-sm text-gray-400">相手の残り体力 (%)</div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="number"
              min={0}
              max={100}
              className="input w-20"
              value={observedRemaining}
              onChange={(e) => setObservedRemaining(Number(e.target.value))}
            />
            <span>%</span>
            <span className="ml-4 text-gray-400">推定対象:</span>
            <select
              className="input w-32"
              value={defStat}
              onChange={(e) => setDefStat(e.target.value as "def" | "spd")}
            >
              <option value="def">B (防御)</option>
              <option value="spd">D (特防)</option>
            </select>
          </div>
          <div>
            <div className="label mb-2">候補（投資の少ない順 / 一致率高い順）</div>
            {candidates.length === 0 ? (
              <div className="text-sm text-gray-500">該当する能力ポイント配分なし。範囲を広げてください。</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 text-left">
                  <tr>
                    <th className="py-1">H能力P</th>
                    <th>{defStat === "def" ? "B" : "D"}能力P</th>
                    <th>HP実数値</th>
                    <th>{defStat === "def" ? "B" : "D"}実数値</th>
                    <th>一致率</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, i) => (
                    <tr key={i} className="border-t border-slate-200 tabular-nums">
                      <td className="py-1">{c.hpAp}</td>
                      <td>{c.defAp}</td>
                      <td>{c.hpStat}</td>
                      <td>{c.defStat}</td>
                      <td>{(c.matchRate * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {mode === "required" && (
        <div className="panel space-y-3">
          <div className="text-sm text-gray-400">達成条件</div>
          <div className="flex items-center gap-2 text-sm">
            <select
              className="input w-40"
              value={goal}
              onChange={(e) => setGoal(e.target.value as "guaranteedKo" | "highRollKo")}
            >
              <option value="guaranteedKo">確定1発</option>
              <option value="highRollKo">乱数1発（指定%以上）</option>
            </select>
            {goal === "highRollKo" && (
              <>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.0625}
                  className="input w-24"
                  value={highRollRate}
                  onChange={(e) => setHighRollRate(Number(e.target.value))}
                />
                <span>(0〜1)</span>
              </>
            )}
            <span className="ml-4 text-gray-400">探索する攻撃ステータス:</span>
            <select
              className="input w-32"
              value={offenseStat}
              onChange={(e) => setOffenseStat(e.target.value as "atk" | "spa")}
            >
              <option value="atk">A (こうげき)</option>
              <option value="spa">C (とくこう)</option>
            </select>
          </div>

          {required ? (
            <div className="text-sm space-y-1">
              <div>
                必要能力ポイント（{offenseStat === "atk" ? "A" : "C"}）：
                <span className="text-green-600 font-semibold ml-1">{required.apRequired}</span>
              </div>
              <div className="text-gray-400">
                対応する実数値: {required.attackStat} ／ 1発で倒せる確率:{" "}
                {(required.oneShotRate * 100).toFixed(2)}%
              </div>
            </div>
          ) : (
            <div className="text-sm text-red-600">この条件を満たす振りはありません。</div>
          )}
        </div>
      )}

      {liveResult && (
        <div className="text-xs text-gray-500">
          現在の入力でのライブ計算: 与ダメ {liveResult.min}〜{liveResult.max} (
          {((liveResult.min / liveResult.defenderHp) * 100).toFixed(1)}%〜
          {((liveResult.max / liveResult.defenderHp) * 100).toFixed(1)}%) /
          相手 HP {liveResult.defenderHp}
        </div>
      )}
    </div>
  );
}
