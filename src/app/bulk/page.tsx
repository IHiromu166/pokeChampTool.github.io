"use client";

import { useMemo, useState } from "react";
import { MOVE_BY_ID } from "@/data/moves";
import { tuneBulk, type Threat } from "@/domain/bulk-tuning";
import { calcDamage } from "@/domain/damage";
import { PokemonForm } from "@/features/PokemonForm";
import { getAttackerMoveOptions } from "@/features/moveOptions";
import { defaultAttacker, defaultDefender, defaultField } from "@/features/defaults";
import type { PokemonInstance } from "@/domain/types";

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
  const [defender, setDefender] = useState(defaultDefender);
  const [field] = useState(defaultField);
  const [threats, setThreats] = useState<ThreatRow[]>(() => [newThreatRow()]);
  const [axes, setAxes] = useState({ hp: true, def: true, spd: true });

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
    if (compiledThreats.length === 0) return [];
    return tuneBulk({ defender, threats: compiledThreats, axes, topN: 10 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defender, axes, JSON.stringify(threats)]);

  const baseline = useMemo(() => {
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
  }, [JSON.stringify(threats), defender]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">耐久調整</h1>

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
    </div>
  );
}
