"use client";

import type { FieldState, Terrain, Weather } from "@/domain/types";

const WEATHERS: Weather[] = ["なし", "はれ", "あめ", "すなあらし", "ゆき"];
const TERRAINS: Terrain[] = [
  "なし",
  "エレキフィールド",
  "グラスフィールド",
  "ミストフィールド",
  "サイコフィールド",
];

interface Props {
  value: FieldState;
  onChange: (next: FieldState) => void;
}

export function FieldForm({ value, onChange }: Props) {
  const update = (patch: Partial<FieldState>) => onChange({ ...value, ...patch });
  return (
    <div className="panel space-y-3">
      <div className="text-sm text-gray-400">場の状態</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <div className="label">天候</div>
          <select
            className="input"
            value={value.weather}
            onChange={(e) => update({ weather: e.target.value as Weather })}
          >
            {WEATHERS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <div className="label">フィールド</div>
          <select
            className="input"
            value={value.terrain}
            onChange={(e) => update({ terrain: e.target.value as Terrain })}
          >
            {TERRAINS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={!!value.reflect}
            onChange={(e) => update({ reflect: e.target.checked })}
          />
          リフレクター
        </label>
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={!!value.lightScreen}
            onChange={(e) => update({ lightScreen: e.target.checked })}
          />
          ひかりのかべ
        </label>
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={!!value.auroraVeil}
            onChange={(e) => update({ auroraVeil: e.target.checked })}
          />
          オーロラベール
        </label>
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={!!value.critical}
            onChange={(e) => update({ critical: e.target.checked })}
          />
          急所
        </label>
      </div>
    </div>
  );
}
