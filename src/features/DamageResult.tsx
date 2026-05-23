"use client";

import type { DamageResult } from "@/domain/damage";

const MAX_SHOWN_TURNS = 4;

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
  const ko = describeKo(result);
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
        <div className="text-lg space-y-0.5">
          <div className={ko.primaryColor}>{ko.primary}</div>
          {ko.secondary && (
            <div className="text-sm text-gray-500">{ko.secondary}</div>
          )}
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

interface KoLabel {
  primary: string;
  primaryColor: string;
  secondary?: string;
}

function describeKo(r: DamageResult): KoLabel {
  const { possibleKoTurns, possibleKoRate, guaranteedKoTurns } = r;

  if (possibleKoTurns === null || possibleKoTurns > MAX_SHOWN_TURNS) {
    return { primary: "倒せない", primaryColor: "text-gray-500" };
  }

  // 全乱数でKO確定
  if (possibleKoRate >= 1) {
    const color =
      possibleKoTurns === 1
        ? "text-green-600"
        : possibleKoTurns <= 2
          ? "text-amber-600"
          : "text-gray-500";
    return { primary: `確定${possibleKoTurns}発`, primaryColor: color };
  }

  // 乱数次第でKO可能
  const ratePct = (possibleKoRate * 100).toFixed(2);
  const primary = `乱数${possibleKoTurns}発 (${ratePct}%)`;
  const primaryColor = possibleKoTurns === 1 ? "text-amber-600" : "text-orange-500";

  let secondary: string | undefined;
  if (guaranteedKoTurns !== null && guaranteedKoTurns <= MAX_SHOWN_TURNS) {
    secondary = `確定${guaranteedKoTurns}発`;
  } else if (guaranteedKoTurns !== null) {
    secondary = `確定${guaranteedKoTurns}発`;
  }

  return { primary, primaryColor, secondary };
}
