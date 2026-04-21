"use client";

import { useMemo, useState } from "react";
import { calcDamage } from "@/domain/damage";
import { MOVE_BY_ID } from "@/data/moves";
import { PokemonForm } from "@/features/PokemonForm";
import { FieldForm } from "@/features/FieldForm";
import { MovePicker } from "@/features/MovePicker";
import { resolveMove, type MoveOverride } from "@/features/moveOverride";
import { DamageResultView } from "@/features/DamageResult";
import { defaultAttacker, defaultDefender, defaultField } from "@/features/defaults";

export default function CalcPage() {
  const [attacker, setAttacker] = useState(defaultAttacker);
  const [defender, setDefender] = useState(defaultDefender);
  const [field, setField] = useState(defaultField);
  const [moveId, setMoveId] = useState("じしん");
  const [moveOverride, setMoveOverride] = useState<MoveOverride>({});

  const selectMove = (id: string) => {
    setMoveId(id);
    setMoveOverride({});
  };

  const swapSides = () => {
    setAttacker(defender);
    setDefender(attacker);
  };

  const result = useMemo(() => {
    const base = MOVE_BY_ID[moveId];
    if (!base) return null;
    const move = resolveMove(base, moveOverride);
    return calcDamage({ attacker, defender, move, field });
  }, [attacker, defender, moveId, moveOverride, field]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">ダメージ計算</h1>
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-1"
          onClick={swapSides}
          aria-label="攻撃側と防御側を入れ替える"
          title="攻撃側と防御側を入れ替える"
        >
          <span aria-hidden="true">⇄</span>
          <span>攻撃/防御を入れ替え</span>
        </button>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <PokemonForm
          title="攻撃側"
          value={attacker}
          onChange={setAttacker}
          side="atk"
        />
        <PokemonForm
          title="防御側"
          value={defender}
          onChange={setDefender}
          side="def"
        />
        <div className="space-y-4">
          <MovePicker
            value={moveId}
            onChange={selectMove}
            override={moveOverride}
            onOverrideChange={setMoveOverride}
            attackerSpeciesId={attacker.speciesId}
          />
          <FieldForm value={field} onChange={setField} />
        </div>
      </div>
      {result && <DamageResultView result={result} />}
    </div>
  );
}
