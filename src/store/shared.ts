import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PokemonInstance, FieldState } from "@/domain/types";
import type { MoveOverride } from "@/features/moveOverride";
import { defaultAttacker, defaultDefender, defaultField } from "@/features/defaults";

interface SharedCalcState {
  attacker: PokemonInstance;
  defender: PokemonInstance;
  field: FieldState;
  moveId: string;
  moveOverride: MoveOverride;
  setAttacker: (p: PokemonInstance) => void;
  setDefender: (p: PokemonInstance) => void;
  setField: (f: FieldState) => void;
  setMoveId: (id: string) => void;
  setMoveOverride: (o: MoveOverride) => void;
  swapSides: () => void;
}

export const useSharedCalc = create<SharedCalcState>()(
  persist(
    (set, get) => ({
      attacker: defaultAttacker(),
      defender: defaultDefender(),
      field: defaultField(),
      moveId: "じしん",
      moveOverride: {},
      setAttacker: (attacker) => set({ attacker }),
      setDefender: (defender) => set({ defender }),
      setField: (field) => set({ field }),
      setMoveId: (moveId) => set({ moveId, moveOverride: {} }),
      setMoveOverride: (moveOverride) => set({ moveOverride }),
      swapSides: () => set({ attacker: get().defender, defender: get().attacker }),
    }),
    {
      name: "pokechamptool-shared-calc",
      // ストア全体を永続化（attacker, defender, field, moveId, moveOverride）
      // セッター関数は除外される
    },
  ),
);
