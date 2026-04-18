"use client";

import type { DamageResult } from "@/domain/damage";

interface Props {
  result: DamageResult;
}

export function DamageResultView({ result }: Props) {
  if (result.max === 0) {
    return (
      <div className="panel">
        <div className="text-sm text-gray-400">変化技 / 無効化のためダメージなし</div>
      </div>
    );
  }
  const pct = (n: number) => ((n / result.defenderHp) * 100).toFixed(1);
  const koLabel = describeKo(result);
  return (
    <div className="panel space-y-3">
      <div>
        <div className="label">与ダメージ</div>
        <div className="text-2xl font-semibold tabular-nums">
          {result.min} 〜 {result.max}
          <span className="text-base text-gray-400 ml-2">
            ({pct(result.min)}% 〜 {pct(result.max)}%)
          </span>
        </div>
        <div className="text-sm mt-1">
          相手 HP: <span className="tabular-nums">{result.defenderHp}</span>
          <span className="ml-3 text-gray-500">タイプ相性 ×{result.typeEffectiveness}</span>
        </div>
      </div>

      <div>
        <div className="label mb-1">確定数</div>
        <div className="text-lg">
          <span className={koColorClass(result)}>{koLabel}</span>
        </div>
      </div>

      <div>
        <div className="label mb-1">乱数 16 段階</div>
        <div className="grid grid-cols-8 gap-1 text-xs tabular-nums">
          {result.rolls.map((d, i) => (
            <span
              key={i}
              className={`px-1 py-0.5 rounded text-center border ${
                d >= result.defenderHp
                  ? "border-green-500 text-green-600"
                  : "border-slate-200 text-gray-500"
              }`}
              title={`${pct(d)}%`}
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500">
        攻撃側 実数値 {result.attackStat} / 防御側 実数値 {result.defenseStat}
      </div>
    </div>
  );
}

function describeKo(r: DamageResult): string {
  if (r.oneShotRate >= 1) return "確定1発";
  if (r.oneShotRate > 0) {
    return `乱数1発 (${(r.oneShotRate * 100).toFixed(2)}%)`;
  }
  if (r.guaranteedKoTurns) {
    return `確定${r.guaranteedKoTurns}発`;
  }
  return "倒せない";
}

function koColorClass(r: DamageResult): string {
  if (r.oneShotRate >= 1) return "text-green-600";
  if (r.oneShotRate > 0) return "text-amber-600";
  if (r.guaranteedKoTurns && r.guaranteedKoTurns <= 2) return "text-amber-600";
  return "text-gray-500";
}
