"use client";

import { POKEMON, POKEMON_BY_ID } from "@/data/pokemon";
import { NATURES } from "@/data/natures";
import { ITEMS } from "@/data/items";
import type { PokemonInstance, Stats } from "@/domain/types";
import { resolveSpecies } from "@/domain/damage";
import { buildActualStats } from "@/domain/stats";
import { NATURE_BY_ID } from "@/data/natures";
import { useEffect, useMemo, useState } from "react";

const STAT_LABEL: Record<keyof Stats, string> = {
  hp: "H",
  atk: "A",
  def: "B",
  spa: "C",
  spd: "D",
  spe: "S",
};

interface Props {
  title: string;
  value: PokemonInstance;
  onChange: (next: PokemonInstance) => void;
  side: "atk" | "def";
}

export function PokemonForm({ title, value, onChange, side }: Props) {
  const species = useMemo(() => {
    try {
      return resolveSpecies(value);
    } catch {
      return POKEMON_BY_ID[value.speciesId] ?? POKEMON[0];
    }
  }, [value]);
  const baseSpecies = POKEMON_BY_ID[value.speciesId] ?? POKEMON[0];
  const megaOptions =
    baseSpecies.megas ??
    (baseSpecies.mega
      ? [
          {
            key: "_single",
            id: baseSpecies.mega,
            label: "メガシンカ",
            stone: baseSpecies.megaStone,
          },
        ]
      : []);
  const nature = NATURE_BY_ID[value.natureId] ?? NATURE_BY_ID["まじめ"];
  const selectablePokemon = useMemo(
    () => POKEMON.filter((p) => !p.id.includes("-mega")),
    [],
  );
  const [nameQuery, setNameQuery] = useState(baseSpecies.name);
  useEffect(() => {
    setNameQuery(baseSpecies.name);
  }, [baseSpecies.name]);
  const nameMatches = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) return selectablePokemon;
    return selectablePokemon.filter((p) => p.name.toLowerCase().includes(q));
  }, [nameQuery, selectablePokemon]);
  const commitName = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const exact = selectablePokemon.find((p) => p.name === q);
    const hit = exact ?? selectablePokemon.find((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    if (!hit || hit.id === value.speciesId) {
      setNameQuery(baseSpecies.name);
      return;
    }
    update({
      speciesId: hit.id,
      ability: hit.abilities[0] ?? "",
      mega: false,
      megaKey: undefined,
    });
    setNameQuery(hit.name);
  };
  const stats = useMemo(
    () => buildActualStats(species.baseStats, value.aps, nature),
    [species, value, nature],
  );

  const update = (patch: Partial<PokemonInstance>) => onChange({ ...value, ...patch });
  const updateAp = (key: keyof Stats, raw: number) => {
    const clamped = clampAp(raw);
    const otherSum = sumStats(value.aps) - value.aps[key];
    const ap = Math.min(clamped, Math.max(0, 66 - otherSum));
    onChange({ ...value, aps: { ...value.aps, [key]: ap } });
  };
  const updateBoost = (key: Exclude<keyof Stats, "hp">, b: number) =>
    onChange({ ...value, boosts: { ...value.boosts, [key]: clampBoost(b) } });

  return (
    <div className="panel space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">{title}</span>
        {megaOptions.length === 1 && (
          <label className="ml-auto inline-flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={!!value.mega}
              onChange={(e) =>
                update({ mega: e.target.checked, megaKey: undefined })
              }
            />
            {megaOptions[0].label}
          </label>
        )}
        {megaOptions.length >= 2 && (
          <div className="ml-auto inline-flex items-center gap-2 text-xs">
            {megaOptions.map((opt) => (
              <label key={opt.key} className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={!!value.mega && value.megaKey === opt.key}
                  onChange={(e) =>
                    update(
                      e.target.checked
                        ? { mega: true, megaKey: opt.key }
                        : { mega: false, megaKey: undefined },
                    )
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <div className="label">ポケモン</div>
          <input
            type="text"
            className="input"
            list={`pokemon-list-${side}`}
            value={nameQuery}
            placeholder="名前で検索"
            onChange={(e) => setNameQuery(e.target.value)}
            onBlur={(e) => commitName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitName((e.target as HTMLInputElement).value);
              }
            }}
          />
          <datalist id={`pokemon-list-${side}`}>
            {nameMatches.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </label>
        <label className="space-y-1">
          <div className="label">特性</div>
          <select
            className="input"
            value={value.ability}
            onChange={(e) => update({ ability: e.target.value })}
          >
            <option value="">--</option>
            {[...new Set(species.abilities)].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <div className="label">性格</div>
          <select
            className="input"
            value={value.natureId}
            onChange={(e) => update({ natureId: e.target.value })}
          >
            {NATURES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
                {n.plus && n.minus
                  ? ` (+${STAT_LABEL[n.plus as keyof Stats]} -${
                      STAT_LABEL[n.minus as keyof Stats]
                    })`
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <div className="label">持ち物</div>
          <select
            className="input"
            value={value.item ?? ""}
            onChange={(e) => update({ item: e.target.value || undefined })}
          >
            {ITEMS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="label mb-1">能力ポイント / 実数値</div>
        <div className="space-y-1">
          {(["hp", "atk", "def", "spa", "spd", "spe"] as const).map((k) => (
            <div key={k} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-gray-400">{STAT_LABEL[k]}</span>
              <input
                type="range"
                min={0}
                max={32}
                step={1}
                className="flex-1"
                value={value.aps[k]}
                onChange={(e) => updateAp(k, Number(e.target.value))}
              />
              <button
                type="button"
                className="input w-7 px-0 text-center"
                aria-label={`${STAT_LABEL[k]} を 1 減らす`}
                onClick={() => updateAp(k, value.aps[k] - 1)}
                disabled={value.aps[k] <= 0}
              >
                −
              </button>
              <input
                type="number"
                min={0}
                max={32}
                step={1}
                className="input w-14"
                value={value.aps[k]}
                onChange={(e) => updateAp(k, Number(e.target.value))}
              />
              <button
                type="button"
                className="input w-7 px-0 text-center"
                aria-label={`${STAT_LABEL[k]} を 1 増やす`}
                onClick={() => updateAp(k, value.aps[k] + 1)}
                disabled={value.aps[k] >= 32 || sumStats(value.aps) >= 66}
              >
                +
              </button>
              <span className="w-12 text-right tabular-nums">{stats[k]}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          能力ポイント合計: {sumStats(value.aps)} / 66
        </div>
      </div>

      <div>
        <div className="label mb-1">ランク補正</div>
        <div className="grid grid-cols-5 gap-2 text-xs">
          {(["atk", "def", "spa", "spd", "spe"] as const).map((k) => {
            const current = value.boosts?.[k] ?? 0;
            return (
              <div key={k} className="flex flex-col items-center gap-1">
                <span className="text-gray-400">{STAT_LABEL[k]}</span>
                <button
                  type="button"
                  className="input w-full px-0 py-0.5 text-center"
                  aria-label={`${STAT_LABEL[k]} ランクを 1 上げる`}
                  onClick={() => updateBoost(k, current + 1)}
                  disabled={current >= 6}
                >
                  +
                </button>
                <input
                  type="number"
                  min={-6}
                  max={6}
                  className="input w-full text-center"
                  value={current}
                  onChange={(e) => updateBoost(k, Number(e.target.value))}
                />
                <button
                  type="button"
                  className="input w-full px-0 py-0.5 text-center"
                  aria-label={`${STAT_LABEL[k]} ランクを 1 下げる`}
                  onClick={() => updateBoost(k, current - 1)}
                  disabled={current <= -6}
                >
                  −
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {side === "atk" && (
        <label className="inline-flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={value.status === "やけど"}
            onChange={(e) => update({ status: e.target.checked ? "やけど" : undefined })}
          />
          やけど状態
        </label>
      )}

      <div className="text-xs text-gray-500">
        {species.name} ({species.types.join("/")}) — 種族値 H{species.baseStats.hp} A
        {species.baseStats.atk} B{species.baseStats.def} C{species.baseStats.spa} D
        {species.baseStats.spd} S{species.baseStats.spe}
      </div>
    </div>
  );
}

function clampAp(n: number): number {
  if (Number.isNaN(n)) return 0;
  return clamp(Math.round(n), 0, 32);
}
function sumStats(s: Stats): number {
  return s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
}
function clampBoost(n: number): number {
  if (Number.isNaN(n)) return 0;
  return clamp(Math.round(n), -6, 6);
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
