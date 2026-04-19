"use client";

import { useMemo, useState } from "react";
import { MOVE_BY_ID } from "@/data/moves";
import { tuneBulk, type Threat } from "@/domain/bulk-tuning";
import { calcDamage } from "@/domain/damage";
import { findRequiredOffense, type RequiredOffenseResult } from "@/domain/reverse";
import { PokemonForm } from "@/features/PokemonForm";
import { FieldForm } from "@/features/FieldForm";
import { MovePicker } from "@/features/MovePicker";
import { getAttackerMoveOptions } from "@/features/moveOptions";
import { defaultAttacker, defaultDefender, defaultField } from "@/features/defaults";
import type { PokemonInstance } from "@/domain/types";

type Mode = "bulk" | "required";

interface ThreatRow {
  id: string;
  attacker: PokemonInstance;
  moveId: string;
  goalKind: "survive" | "lessThan";
  rate: number;
}

let threatId = 1;
const newThreatRow = (): ThreatRow => ({
  id: `t${threatId++}`,
  attacker: defaultAttacker(),
  moveId: "じしん",
  goalKind: "survive",
  rate: 0,
});

export default function BulkPage() {
  const [mode, setMode] = useState<Mode>("bulk");

  // 耐久調整モード用
  const [defender, setDefender] = useState(defaultDefender);
  const [field] = useState(defaultField);
  const [threats, setThreats] = useState<ThreatRow[]>(() => [newThreatRow()]);
  const [axes, setAxes] = useState({ hp: true, def: true, spd: true });

  // 必要火力モード用
  const [reqAttacker, setReqAttacker] = useState(defaultAttacker);
  const [reqDefender, setReqDefender] = useState(defaultDefender);
  const [reqField, setReqField] = useState(defaultField);
  const [reqMoveId, setReqMoveId] = useState("じしん");
  const [goal, setGoal] = useState<"guaranteedKo" | "highRollKo">("guaranteedKo");
  const [highRollRate, setHighRollRate] = useState(0.5);
  const [offenseStat, setOffenseStat] = useState<"atk" | "spa">("atk");

  const compiledThreats: Threat[] = threats
    .map((t) => {
      const move = MOVE_BY_ID[t.moveId];
      if (!move) return null;
      return {
        id: t.id,
        input: { attacker: t.attacker, defender, move, field },
        goal:
          t.goalKind === "survive"
            ? { kind: "survive" as const }
            : { kind: "lessThan" as const, rate: t.rate },
      };
    })
    .filter(Boolean) as Threat[];

  const plans = useMemo(() => {
    if (mode !== "bulk") return [];
    if (compiledThreats.length === 0) return [];
    return tuneBulk({ defender, threats: compiledThreats, axes, topN: 10 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, defender, axes, JSON.stringify(threats)]);

  const baseline = useMemo(() => {
    if (mode !== "bulk") return [];
    return compiledThreats.map((t) => {
      const r = calcDamage(t.input);
      return {
        id: t.id,
        max: r.max,
        hp: r.defenderHp,
        oneShotRate: r.oneShotRate,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, JSON.stringify(threats), defender]);

  const reqMove = MOVE_BY_ID[reqMoveId];
  const reqBaseInput =
    reqMove ? { attacker: reqAttacker, defender: reqDefender, move: reqMove, field: reqField } : null;
  const reqLiveResult = reqBaseInput ? calcDamage(reqBaseInput) : null;

  const required: RequiredOffenseResult | null = useMemo(() => {
    if (mode !== "required" || !reqBaseInput) return null;
    return findRequiredOffense({
      base: reqBaseInput,
      goal:
        goal === "guaranteedKo"
          ? { kind: "guaranteedKo", turns: 1 }
          : { kind: "highRollKo", turns: 1, rate: highRollRate },
      offenseStatKey: offenseStat,
    });
  }, [mode, reqBaseInput, goal, offenseStat, highRollRate]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">ステータス調整</h1>

      <div className="flex gap-2">
        <button
          className={mode === "bulk" ? "btn" : "btn-ghost"}
          onClick={() => setMode("bulk")}
        >
          耐久調整
        </button>
        <button
          className={mode === "required" ? "btn" : "btn-ghost"}
          onClick={() => setMode("required")}
        >
          必要火力
        </button>
      </div>

      {mode === "bulk" && (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <PokemonForm
              title="守りたいポケモン（H/B/D 振りはここで探索する）"
              value={defender}
              onChange={setDefender}
              side="def"
            />
            <div className="panel space-y-3">
              <div className="text-sm text-gray-400">探索する能力ポイントの軸</div>
              <div className="flex gap-3 text-sm">
                {(["hp", "def", "spd"] as const).map((k) => (
                  <label key={k} className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={axes[k]}
                      onChange={(e) => setAxes({ ...axes, [k]: e.target.checked })}
                    />
                    {k === "hp" ? "H" : k === "def" ? "B" : "D"}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                軸に含まれない項目は現在の防御側設定の能力ポイントで固定。攻撃側の各脅威は下に追加してください。能力ポイント合計は 66 を超えないよう自動で除外。
              </p>
            </div>
          </div>

          <div className="panel space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">脅威リスト</div>
              <button className="btn-ghost" onClick={() => setThreats([...threats, newThreatRow()])}>
                ＋ 脅威を追加
              </button>
            </div>
            <div className="space-y-3">
              {threats.map((t, i) => {
                const baselineRow = baseline.find((b) => b.id === t.id);
                return (
                  <div key={t.id} className="border border-slate-200 rounded p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">脅威 #{i + 1}</div>
                      <button
                        className="text-xs text-red-600"
                        onClick={() => setThreats(threats.filter((x) => x.id !== t.id))}
                      >
                        削除
                      </button>
                    </div>
                    <div className="grid lg:grid-cols-2 gap-3">
                      <PokemonForm
                        title="攻撃側"
                        value={t.attacker}
                        onChange={(next) =>
                          setThreats(
                            threats.map((x) => (x.id === t.id ? { ...x, attacker: next } : x)),
                          )
                        }
                        side="atk"
                      />
                      <div className="space-y-2">
                        <label className="space-y-1 block">
                          <div className="label">技</div>
                          <select
                            className="input"
                            value={t.moveId}
                            onChange={(e) =>
                              setThreats(
                                threats.map((x) =>
                                  x.id === t.id ? { ...x, moveId: e.target.value } : x,
                                ),
                              )
                            }
                          >
                            {getAttackerMoveOptions(t.attacker.speciesId, t.moveId).map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 block">
                          <div className="label">達成条件</div>
                          <div className="flex items-center gap-2 text-sm">
                            <select
                              className="input w-40"
                              value={t.goalKind}
                              onChange={(e) =>
                                setThreats(
                                  threats.map((x) =>
                                    x.id === t.id
                                      ? { ...x, goalKind: e.target.value as "survive" | "lessThan" }
                                      : x,
                                  ),
                                )
                              }
                            >
                              <option value="survive">確定耐え</option>
                              <option value="lessThan">乱数1発が ◯以下</option>
                            </select>
                            {t.goalKind === "lessThan" && (
                              <input
                                type="number"
                                min={0}
                                max={1}
                                step={0.0625}
                                className="input w-20"
                                value={t.rate}
                                onChange={(e) =>
                                  setThreats(
                                    threats.map((x) =>
                                      x.id === t.id ? { ...x, rate: Number(e.target.value) } : x,
                                    ),
                                  )
                                }
                              />
                            )}
                          </div>
                        </label>
                        {baselineRow && (
                          <div className="text-xs text-gray-500 mt-2">
                            現状: 最大 {baselineRow.max} / HP {baselineRow.hp} (
                            {((baselineRow.max / baselineRow.hp) * 100).toFixed(1)}%) — 1HKO率{" "}
                            {(baselineRow.oneShotRate * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel space-y-2">
            <div className="text-sm text-gray-400">
              推奨配分（投資の少ない順）— {plans.length} 件
            </div>
            {plans.length === 0 ? (
              <div className="text-sm text-red-600">
                条件を満たす配分がありません。脅威を減らすか、軸を増やしてください。
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 text-left">
                  <tr>
                    <th className="py-1">H</th>
                    <th>B</th>
                    <th>D</th>
                    <th>HP</th>
                    <th>B実数</th>
                    <th>D実数</th>
                    <th>各脅威への被ダメ最大</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p, i) => (
                    <tr key={i} className="border-t border-slate-200 tabular-nums">
                      <td className="py-1">{p.hpAp}</td>
                      <td>{p.defAp}</td>
                      <td>{p.spdAp}</td>
                      <td>{p.hpStat}</td>
                      <td>{p.defStat}</td>
                      <td>{p.spdStat}</td>
                      <td className="text-xs">
                        {p.perThreat.map((t) => `${t.maxPercent.toFixed(1)}%`).join(" / ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {mode === "required" && (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <PokemonForm
              title="攻撃側 (自分)"
              value={reqAttacker}
              onChange={setReqAttacker}
              side="atk"
            />
            <PokemonForm
              title="防御側 (相手)"
              value={reqDefender}
              onChange={setReqDefender}
              side="def"
            />
            <div className="space-y-4">
              <MovePicker
                value={reqMoveId}
                onChange={setReqMoveId}
                attackerSpeciesId={reqAttacker.speciesId}
              />
              <FieldForm value={reqField} onChange={setReqField} />
            </div>
          </div>

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
              <span className="ml-4 text-gray-400">探索する自分の攻撃ステータス:</span>
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
                  {`必要な自分の能力ポイント（${offenseStat === "atk" ? "A" : "C"}）：`}
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

          {reqLiveResult && (
            <div className="text-xs text-gray-500">
              自分→相手 のライブ計算: 与ダメ {reqLiveResult.min}〜{reqLiveResult.max} (
              {((reqLiveResult.min / reqLiveResult.defenderHp) * 100).toFixed(1)}%〜
              {((reqLiveResult.max / reqLiveResult.defenderHp) * 100).toFixed(1)}%) /
              相手 HP {reqLiveResult.defenderHp}
            </div>
          )}
        </>
      )}
    </div>
  );
}
