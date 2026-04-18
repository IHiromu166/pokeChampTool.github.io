"use client";

import { MOVES } from "@/data/moves";

interface Props {
  value: string;
  onChange: (id: string) => void;
  label?: string;
}

export function MovePicker({ value, onChange, label = "技" }: Props) {
  const move = MOVES.find((m) => m.id === value);
  return (
    <div className="panel space-y-2">
      <div className="text-sm text-gray-400">{label}</div>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {MOVES.map((m) => (
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
