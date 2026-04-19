"use client";

import { useMemo, useState } from "react";
import { calcDamage, resolveSpecies } from "@/domain/damage";
import { calcHp } from "@/domain/stats";
import { MOVE_BY_ID } from "@/data/moves";
import {
  reverseEstimateDefense,
  reverseEstimateOffense,
  type ReverseCandidate,
  type ReverseOffenseCandidate,
} from "@/domain/reverse";
import { PokemonForm } from "@/features/PokemonForm";
import { FieldForm } from "@/features/FieldForm";
import { MovePicker } from "@/features/MovePicker";
import { defaultAttacker, defaultDefender, defaultField } from "@/features/defaults";

type SelfSide = "atk" | "def";

export default function ReversePage() {
  const [selfSide, setSelfSide] = useState<SelfSide>("atk");
  const [attacker, setAttacker] = useState(defaultAttacker);
  const [defender, setDefender] = useState(defaultDefender);
  const [field, setField] = useState(defaultField);
  const [moveId, setMoveId] = useState("じしん");

  const [observedRemainingPct, setObservedRemainingPct] = useState(63);
  const [observedRemainingHp, setObservedRemainingHp] = useState(100);
  const [defStat, setDefStat] = useState<"def" | "spd">("def");
  const [offenseStat, setOffenseStat] = useState<"atk" | "spa">("atk");

  const move = MOVE_BY_ID[moveId];
  const baseInput = move ? { attacker, defender, move, field } : null;
  const liveResult = baseInput ? calcDamage(baseInput) : null;

  const selfHp = useMemo(
    () => calcHp(resolveSpecies(defender).baseStats.hp, defender.aps.hp),
    [defender],
  );

  const defenseCandidates: ReverseCandidate[] = useMemo(() => {
    if (selfSide !== "atk" || !baseInput) return [];
    return reverseEstimateDefense({
      base: baseInput,
      observedRemainingPct,
      defenseStatKey: defStat,
    }).slice(0, 30);
  }, [selfSide, baseInput, observedRemainingPct, defStat]);

  const offenseCandidates: ReverseOffenseCandidate[] = useMemo(() => {
    if (selfSide !== "def" || !baseInput) return [];
    return reverseEstimateOffense({
      base: baseInput,
      observedRemainingHp,
      offenseStatKey: offenseStat,
    }).slice(0, 30);
  }, [selfSide, baseInput, observedRemainingHp, offenseStat]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">逆引き</h1>

      <div className="flex gap-2">
        <button
          className={selfSide === "atk" ? "btn" : "btn-ghost"}
          onClick={() => setSelfSide("atk")}
        >
          自分=攻撃側
        </button>
        <button
          className={selfSide === "def" ? "btn" : "btn-ghost"}
          onClick={() => setSelfSide("def")}
        >
          自分=防御側
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <PokemonForm
          title={selfSide === "atk" ? "攻撃側 (自分)" : "攻撃側 (相手)"}
          value={attacker}
          onChange={setAttacker}
          side="atk"
        />
        <PokemonForm
          title={selfSide === "def" ? "防御側 (自分)" : "防御側 (相手)"}
          value={defender}
          onChange={setDefender}
          side="def"
        />
        <div className="space-y-4">
          <MovePicker
            value={moveId}
            onChange={setMoveId}
            attackerSpeciesId={attacker.speciesId}
          />
          <FieldForm value={field} onChange={setField} />
        </div>
      </div>

      <div className="panel space-y-3">
        <div className="text-sm text-gray-400">
          {selfSide === "atk" ? "相手の残り体力" : "自分の残り体力"}
        </div>
        <div className="flex items-center gap-2 text-sm">
          {selfSide === "atk" ? (
            <>
              <input
                type="number"
                min={0}
                max={100}
                className="input w-20"
                value={observedRemainingPct}
                onChange={(e) => setObservedRemainingPct(Number(e.target.value))}
              />
              <span>%</span>
            </>
          ) : (
            <>
              <input
                type="number"
                min={0}
                max={selfHp}
                className="input w-24"
                value={observedRemainingHp}
                onChange={(e) => setObservedRemainingHp(Number(e.target.value))}
              />
              <span>/ {selfHp}</span>
            </>
          )}
          <span className="ml-4 text-gray-400">推定対象:</span>
          {selfSide === "atk" ? (
            <select
              className="input w-32"
              value={defStat}
              onChange={(e) => setDefStat(e.target.value as "def" | "spd")}
            >
              <option value="def">B (防御)</option>
              <option value="spd">D (特防)</option>
            </select>
          ) : (
            <select
              className="input w-32"
              value={offenseStat}
              onChange={(e) => setOffenseStat(e.target.value as "atk" | "spa")}
            >
              <option value="atk">A (こうげき)</option>
              <option value="spa">C (とくこう)</option>
            </select>
          )}
        </div>
        <div>
          <div className="label mb-2">候補（一致率高い順 / 投資の少ない順）</div>
          {selfSide === "atk" ? (
            defenseCandidates.length === 0 ? (
              <div className="text-sm text-gray-500">該当する能力ポイント配分なし。範囲を広げてください。</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 text-left">
                  <tr>
                    <th className="py-1">H能力P</th>
                    <th>{defStat === "def" ? "B" : "D"}能力P</th>
                    <th>HP実数値</th>
                    <th>{defStat === "def" ? "B" : "D"}実数値</th>
                    <th>性格</th>
                    <th>持ち物</th>
                    <th>一致率</th>
                  </tr>
                </thead>
                <tbody>
                  {defenseCandidates.map((c, i) => (
                    <tr key={i} className="border-t border-slate-200 tabular-nums">
                      <td className="py-1">{c.hpAp}</td>
                      <td>{c.defAp}</td>
                      <td>{c.hpStat}</td>
                      <td>{c.defStat}</td>
                      <td>{c.natureLabel}({c.natureId})</td>
                      <td>{c.itemId}</td>
                      <td>{(c.matchRate * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : offenseCandidates.length === 0 ? (
            <div className="text-sm text-gray-500">該当する能力ポイント配分なし。範囲を広げてください。</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 text-left">
                <tr>
                  <th className="py-1">{offenseStat === "atk" ? "A" : "C"}能力P</th>
                  <th>{offenseStat === "atk" ? "A" : "C"}実数値</th>
                  <th>性格</th>
                  <th>持ち物</th>
                  <th>一致率</th>
                </tr>
              </thead>
              <tbody>
                {offenseCandidates.map((c, i) => (
                  <tr key={i} className="border-t border-slate-200 tabular-nums">
                    <td className="py-1">{c.atkAp}</td>
                    <td>{c.attackStat}</td>
                    <td>{c.natureLabel}({c.natureId})</td>
                    <td>{c.itemId}</td>
                    <td>{(c.matchRate * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {liveResult && (
        <div className="text-xs text-gray-500">
          {selfSide === "atk" ? "自分→相手" : "相手→自分"} のライブ計算: 与ダメ {liveResult.min}〜{liveResult.max} (
          {((liveResult.min / liveResult.defenderHp) * 100).toFixed(1)}%〜
          {((liveResult.max / liveResult.defenderHp) * 100).toFixed(1)}%) /
          相手 HP {liveResult.defenderHp}
        </div>
      )}
    </div>
  );
}
