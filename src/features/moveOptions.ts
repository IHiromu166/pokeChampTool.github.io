import { MOVES, MOVE_BY_ID } from "@/data/moves";
import { LEARNSETS } from "@/data/learnsets";
import type { MoveData } from "@/domain/types";
import { hiraganaToKatakana } from "@/utils/kana";

// ダメージ計算では補助技 (変化技) を選ぶ余地がないため除外。
const ATTACK_MOVES = MOVES.filter((m) => m.category !== "変化");

const KANA_COLLATOR = new Intl.Collator("ja", { sensitivity: "base" });

function compareMoves(a: MoveData, b: MoveData): number {
  return KANA_COLLATOR.compare(hiraganaToKatakana(a.name), hiraganaToKatakana(b.name));
}

const SORTED_ATTACK_MOVES: readonly MoveData[] = [...ATTACK_MOVES].sort(compareMoves);

/**
 * 攻撃側ポケモンが使える技の選択肢を返す。
 *
 * - `attackerSpeciesId` が未指定 / learnset 未登録なら全攻撃技を50音順で返す
 * - 指定があれば learnset で絞り込み、同じく50音順で並べる
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
