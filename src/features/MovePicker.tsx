"use client";

import { useMemo } from "react";
import { MOVES, MOVE_BY_ID } from "@/data/moves";
import { LEARNSETS } from "@/data/learnsets";
import type { MoveData, Type } from "@/domain/types";

interface Props {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  /** 攻撃側のポケモン id。指定した場合、そのポケモンが覚える技のみ選択肢に出す。 */
  attackerSpeciesId?: string;
}

// ダメージ計算では補助技 (変化技) を選ぶ余地がないため除外。
const ATTACK_MOVES = MOVES.filter((m) => m.category !== "変化");

const TYPE_ORDER: Type[] = [
  "ノーマル", "ほのお", "みず", "でんき", "くさ", "こおり", "かくとう", "どく", "じめん",
  "ひこう", "エスパー", "むし", "いわ", "ゴースト", "ドラゴン", "あく", "はがね", "フェアリー",
];
const TYPE_RANK: Record<Type, number> = Object.fromEntries(
  TYPE_ORDER.map((t, i) => [t, i]),
) as Record<Type, number>;
// 物理 → 特殊 の順。
const CATEGORY_RANK: Record<MoveData["category"], number> = { 物理: 0, 特殊: 1, 変化: 2 };

function compareMoves(a: MoveData, b: MoveData): number {
  const t = TYPE_RANK[a.type] - TYPE_RANK[b.type];
  if (t !== 0) return t;
  const c = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
  if (c !== 0) return c;
  return b.power - a.power;
}

const SORTED_ATTACK_MOVES = [...ATTACK_MOVES].sort(compareMoves);

export function MovePicker({ value, onChange, label = "技", attackerSpeciesId }: Props) {
  const options = useMemo(() => {
    if (!attackerSpeciesId) return SORTED_ATTACK_MOVES;
    const learnable = LEARNSETS[attackerSpeciesId];
    if (!learnable || learnable.length === 0) return SORTED_ATTACK_MOVES;
    const learnableSet = new Set(learnable);
    const filtered = SORTED_ATTACK_MOVES.filter((m) => learnableSet.has(m.id));
    // 現在選択中の技が覚えない技でも値が飛ばないよう、先頭に追加しておく。
    if (value && !learnableSet.has(value)) {
      const current = MOVE_BY_ID[value];
      if (current) return [current, ...filtered];
    }
    return filtered;
  }, [attackerSpeciesId, value]);
  const move = MOVE_BY_ID[value];
  return (
    <div className="panel space-y-2">
      <div className="text-sm text-gray-400">{label}</div>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {move && (
        <div className="text-xs text-gray-500 grid grid-cols-2 gap-1">
          <span>タイプ: {move.type}</span>
          <span>分類: {move.category}</span>
          <span>威力: {move.power || "--"}</span>
          <span>命中: {move.accuracy || "必中"}</span>
          {move.priority !== 0 && <span>優先度: {move.priority}</span>}
        </div>
      )}
    </div>
  );
}
