"use client";

import { useMemo } from "react";
import { MOVE_BY_ID } from "@/data/moves";
import { getAttackerMoveOptions } from "./moveOptions";

interface Props {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  /** 攻撃側のポケモン id。指定した場合、そのポケモンが覚える技のみ選択肢に出す。 */
  attackerSpeciesId?: string;
}

export function MovePicker({ value, onChange, label = "技", attackerSpeciesId }: Props) {
  const options = useMemo(
    () => getAttackerMoveOptions(attackerSpeciesId, value),
    [attackerSpeciesId, value],
  );
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
