"use client";

import { useEffect, useState } from "react";
import { PokemonForm } from "@/features/PokemonForm";
import { getAttackerMoveOptions } from "@/features/moveOptions";
import { useParties } from "@/store/party";
import { MAX_MOVES_PER_POKEMON, PARTY_SIZE } from "@/domain/party";

export default function PartyPage() {
  const {
    parties,
    selectedPartyId,
    createParty,
    renameParty,
    deleteParty,
    selectParty,
    updateMemberPokemon,
    updateMemberMoves,
  } = useParties();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selected = parties.find((p) => p.id === selectedPartyId) ?? null;

  if (!mounted) {
    return <div className="text-sm text-gray-500">読み込み中…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">マイパーティ</h1>
        <button
          type="button"
          className="input px-3 py-1 text-sm"
          onClick={() => createParty()}
        >
          + 新規作成
        </button>
      </div>

      {parties.length === 0 ? (
        <div className="panel text-sm text-gray-500">
          まだパーティがありません。「+ 新規作成」で 6 体のパーティを作成できます。
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {parties.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`input px-3 py-1 text-sm ${
                p.id === selectedPartyId ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => selectParty(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-3">
          <div className="panel flex flex-wrap items-center gap-2">
            <label className="flex flex-1 items-center gap-2 text-sm">
              <span className="label">パーティ名</span>
              <input
                className="input flex-1"
                value={selected.name}
                onChange={(e) => renameParty(selected.id, e.target.value)}
              />
            </label>
            <button
              type="button"
              className="input px-3 py-1 text-sm text-red-600"
              onClick={() => {
                if (confirm(`「${selected.name}」を削除しますか？`)) {
                  deleteParty(selected.id);
                }
              }}
            >
              削除
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {selected.members.map((member, slot) => {
              const moveOptions = getAttackerMoveOptions(member.pokemon.speciesId);
              return (
                <div key={slot} className="space-y-2">
                  <PokemonForm
                    title={`スロット ${slot + 1}`}
                    value={member.pokemon}
                    onChange={(p) => updateMemberPokemon(selected.id, slot, p)}
                    side="atk"
                    inputIdSuffix={`party-${slot}`}
                  />
                  <div className="panel space-y-1">
                    <div className="label">技</div>
                    {Array.from({ length: MAX_MOVES_PER_POKEMON }, (_, i) => {
                      const current = member.moves[i] ?? "";
                      return (
                        <select
                          key={i}
                          className="input w-full text-sm"
                          value={current}
                          onChange={(e) => {
                            const next = [...member.moves];
                            while (next.length < MAX_MOVES_PER_POKEMON) next.push("");
                            next[i] = e.target.value;
                            updateMemberMoves(
                              selected.id,
                              slot,
                              next.slice(0, MAX_MOVES_PER_POKEMON),
                            );
                          }}
                        >
                          <option value="">(未設定)</option>
                          {moveOptions.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-500">
            ここで保存したパーティ（最大 {PARTY_SIZE} 体）は各計算ページの
            「パーティから読込」ボタンから呼び出せます。技を選んでおくと読込時にワンクリックで適用できます。
          </p>
        </div>
      )}
    </div>
  );
}
