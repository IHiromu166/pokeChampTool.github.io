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

export default function DoublePage() {
  const [attacker1, setAttacker1] = useState(defaultAttacker);
  const [moveId1, setMoveId1] = useState("じしん");
  const [moveOverride1, setMoveOverride1] = useState<MoveOverride>({});

  const [attacker2, setAttacker2] = useState(defaultAttacker);
  const [moveId2, setMoveId2] = useState("りゅうせいぐん");
  const [moveOverride2, setMoveOverride2] = useState<MoveOverride>({});

  const [defender, setDefender] = useState(defaultDefender);
  const [field, setField] = useState(defaultField);

  const selectMove1 = (id: string) => {
    setMoveId1(id);
    setMoveOverride1({});
  };

  const selectMove2 = (id: string) => {
    setMoveId2(id);
    setMoveOverride2({});
  };

  const result1 = useMemo(() => {
    const base = MOVE_BY_ID[moveId1];
    if (!base) return null;
    return calcDamage({
      attacker: attacker1,
      defender,
      move: resolveMove(base, moveOverride1),
      field,
    });
  }, [attacker1, defender, moveId1, moveOverride1, field]);

  const result2 = useMemo(() => {
    const base = MOVE_BY_ID[moveId2];
    if (!base) return null;
    return calcDamage({
      attacker: attacker2,
      defender,
      move: resolveMove(base, moveOverride2),
      field,
    });
  }, [attacker2, defender, moveId2, moveOverride2, field]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">ダブルバトル ダメージ計算</h1>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <PokemonForm
            title="攻撃側 1"
            value={attacker1}
            onChange={setAttacker1}
            side="atk"
            inputIdSuffix="1"
            onSelectMove={selectMove1}
          />
          <MovePicker
            value={moveId1}
            onChange={selectMove1}
            override={moveOverride1}
            onOverrideChange={setMoveOverride1}
            attackerSpeciesId={attacker1.speciesId}
          />
        </div>

        <div className="space-y-4">
          <PokemonForm
            title="攻撃側 2"
            value={attacker2}
            onChange={setAttacker2}
            side="atk"
            inputIdSuffix="2"
            onSelectMove={selectMove2}
          />
          <MovePicker
            value={moveId2}
            onChange={selectMove2}
            override={moveOverride2}
            onOverrideChange={setMoveOverride2}
            attackerSpeciesId={attacker2.speciesId}
          />
        </div>

        <div className="space-y-4">
          <PokemonForm
            title="防御側"
            value={defender}
            onChange={setDefender}
            side="def"
          />
          <FieldForm value={field} onChange={setField} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <div className="label mb-2">攻撃側 1 の結果</div>
          {result1 && <DamageResultView result={result1} />}
        </div>
        <div>
          <div className="label mb-2">攻撃側 2 の結果</div>
          {result2 && <DamageResultView result={result2} />}
        </div>
      </div>
    </div>
  );
}
