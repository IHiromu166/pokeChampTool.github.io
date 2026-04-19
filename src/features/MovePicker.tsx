"use client";

import { useMemo } from "react";
import { MOVE_BY_ID } from "@/data/moves";
import { TYPES, type MoveCategory, type Type } from "@/domain/types";
import { getAttackerMoveOptions } from "./moveOptions";
import type { MoveOverride } from "./moveOverride";

interface Props {
  value: string;
  onChange: (id: string) => void;
  override: MoveOverride;
  onOverrideChange: (next: MoveOverride) => void;
  label?: string;
  /** 攻撃側のポケモン id。指定した場合、そのポケモンが覚える技のみ選択肢に出す。 */
  attackerSpeciesId?: string;
  /** "bare" は外枠 panel を外す（他カード内で使う場合）。既定は "panel"。 */
  variant?: "panel" | "bare";
}

const CATEGORY_OPTIONS: Array<Exclude<MoveCategory, "変化">> = ["物理", "特殊"];

export function MovePicker({
  value,
  onChange,
  override,
  onOverrideChange,
  label = "技",
  attackerSpeciesId,
  variant = "panel",
}: Props) {
  const options = useMemo(
    () => getAttackerMoveOptions(attackerSpeciesId, value),
    [attackerSpeciesId, value],
  );
  const move = MOVE_BY_ID[value];
  const wrapperClass = variant === "panel" ? "panel space-y-2" : "space-y-2";

  const effectiveType: Type | undefined = override.type ?? move?.type;
  const effectiveCategory = override.category ?? (move?.category as Exclude<MoveCategory, "変化"> | undefined);
  const effectivePower = override.power ?? move?.power ?? 0;

  return (
    <div className={wrapperClass}>
      <div className="text-sm text-gray-400">{label}</div>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {move && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="space-y-1 block">
            <span className="label">タイプ</span>
            <select
              className="input"
              value={effectiveType}
              onChange={(e) =>
                onOverrideChange({ ...override, type: e.target.value as Type })
              }
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="label">分類</span>
            <select
              className="input"
              value={effectiveCategory}
              onChange={(e) =>
                onOverrideChange({
                  ...override,
                  category: e.target.value as Exclude<MoveCategory, "変化">,
                })
              }
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="label">威力</span>
            <input
              type="number"
              min={0}
              className="input"
              value={effectivePower}
              onChange={(e) =>
                onOverrideChange({ ...override, power: Number(e.target.value) })
              }
            />
          </label>
          <div className="space-y-1 text-gray-500">
            <span className="label block">命中 / 優先度</span>
            <span>
              {move.accuracy || "必中"}
              {move.priority !== 0 ? ` / 優先度 ${move.priority}` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
