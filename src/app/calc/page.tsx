"use client";

import { useMemo, useState } from "react";
import { calcDamage } from "@/domain/damage";
import { MOVE_BY_ID } from "@/data/moves";
import { PokemonForm } from "@/features/PokemonForm";
import { FieldForm } from "@/features/FieldForm";
import { MovePicker } from "@/features/MovePicker";
import { DamageResultView } from "@/features/DamageResult";
import { defaultAttacker, defaultDefender, defaultField } from "@/features/defaults";

export default function CalcPage() {
  const [attacker, setAttacker] = useState(defaultAttacker);
  const [defender, setDefender] = useState(defaultDefender);
  const [field, setField] = useState(defaultField);
  const [moveId, setMoveId] = useState("じしん");

  const result = useMemo(() => {
    const move = MOVE_BY_ID[moveId];
    if (!move) return null;
    return calcDamage({ attacker, defender, move, field });
  }, [attacker, defender, moveId, field]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">ダメージ計算</h1>
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
          <MovePicker value={moveId} onChange={setMoveId} />
          <FieldForm value={field} onChange={setField} />
        </div>
      </div>
      {result && <DamageResultView result={result} />}
    </div>
  );
}
