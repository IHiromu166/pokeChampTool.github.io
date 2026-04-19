import type { MoveCategory, MoveData, Type } from "@/domain/types";

export interface MoveOverride {
  power?: number;
  type?: Type;
  category?: Exclude<MoveCategory, "変化">;
}

export const EMPTY_OVERRIDE: MoveOverride = {};

export function resolveMove(base: MoveData, ov?: MoveOverride): MoveData {
  if (!ov) return base;
  return {
    ...base,
    power: ov.power ?? base.power,
    type: ov.type ?? base.type,
    category: ov.category ?? base.category,
  };
}
