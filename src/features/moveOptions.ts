import { MOVES, MOVE_BY_ID } from "@/data/moves";
import { LEARNSETS } from "@/data/learnsets";
import type { MoveData, Type } from "@/domain/types";

// ダメージ計算では補助技 (変化技) を選ぶ余地がないため除外。
const ATTACK_MOVES = MOVES.filter((m) => m.category !== "変化");

const TYPE_ORDER: Type[] = [
  "ノーマル", "ほのお", "みず", "でんき", "くさ", "こおり", "かくとう", "どく", "じめん",
  "ひこう", "エスパー", "むし", "いわ", "ゴースト", "ドラゴン", "あく", "はがね", "フェアリー",
];
const TYPE_RANK: Record<Type, number> = Object.fromEntries(
  TYPE_ORDER.map((t, i) => [t, i]),
) as Record<Type, number>;
// 物理 → 特殊 の順。
const CATEGORY_RANK: Record<MoveData["category"], number> = { 物理: 0, 特殊: 1, 変化: 2 };

function compareMoves(a: MoveData, b: MoveData): number {
  const t = TYPE_RANK[a.type] - TYPE_RANK[b.type];
  if (t !== 0) return t;
  const c = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
  if (c !== 0) return c;
  return b.power - a.power;
}

const SORTED_ATTACK_MOVES: readonly MoveData[] = [...ATTACK_MOVES].sort(compareMoves);

/**
 * 攻撃側ポケモンが使える技の選択肢を返す。
 *
 * - `attackerSpeciesId` が未指定 / learnset 未登録なら全攻撃技をソート済みで返す
 * - 指定があれば learnset で絞り込み、タイプ → 物理/特殊 → 威力(降順) で並べる
 * - 現在選択中 (`currentMoveId`) が learnset 外でも値が飛ばないよう先頭に残す
 */
export function getAttackerMoveOptions(
  attackerSpeciesId?: string,
  currentMoveId?: string,
): readonly MoveData[] {
  if (!attackerSpeciesId) return SORTED_ATTACK_MOVES;
  const learnable = LEARNSETS[attackerSpeciesId];
  if (!learnable || learnable.length === 0) return SORTED_ATTACK_MOVES;
  const learnableSet = new Set(learnable);
  const filtered = SORTED_ATTACK_MOVES.filter((m) => learnableSet.has(m.id));
  if (currentMoveId && !learnableSet.has(currentMoveId)) {
    const current = MOVE_BY_ID[currentMoveId];
    if (current) return [current, ...filtered];
  }
  return filtered;
}
