"use client";

import { MOVES } from "@/data/moves";

interface Props {
  value: string;
  onChange: (id: string) => void;
  label?: string;
}

// ダメージ計算では補助技 (変化技) を選ぶ余地がないため除外。
const ATTACK_MOVES = MOVES.filter((m) => m.category !== "変化");

export function MovePicker({ value, onChange, label = "技" }: Props) {
  const move = ATTACK_MOVES.find((m) => m.id === value);
  return (
    <div className="panel space-y-2">
      <div className="text-sm text-gray-400">{label}</div>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {ATTACK_MOVES.map((m) => (
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
