import type { MoveData } from "@/domain/types";

export const MOVES: MoveData[] = [
  // 物理
  { id: "じしん", name: "じしん", type: "じめん", category: "物理", power: 100, accuracy: 100, priority: 0 },
  { id: "げきりん", name: "げきりん", type: "ドラゴン", category: "物理", power: 120, accuracy: 100, priority: 0 },
  { id: "ストーンエッジ", name: "ストーンエッジ", type: "いわ", category: "物理", power: 100, accuracy: 80, priority: 0 },
  { id: "つるぎのまい", name: "つるぎのまい", type: "ノーマル", category: "変化", power: 0, accuracy: 0, priority: 0 },
  { id: "ふいうち", name: "ふいうち", type: "あく", category: "物理", power: 70, accuracy: 100, priority: 1, flags: { contact: true } },
  { id: "アイアンヘッド", name: "アイアンヘッド", type: "はがね", category: "物理", power: 80, accuracy: 100, priority: 0, flags: { contact: true } },
  { id: "じゃれつく", name: "じゃれつく", type: "フェアリー", category: "物理", power: 90, accuracy: 90, priority: 0, flags: { contact: true } },
  { id: "しねんのずつき", name: "しねんのずつき", type: "エスパー", category: "物理", power: 80, accuracy: 90, priority: 0, flags: { contact: true } },
  { id: "コメットパンチ", name: "コメットパンチ", type: "はがね", category: "物理", power: 90, accuracy: 90, priority: 0, flags: { contact: true, punch: true } },
  { id: "バレットパンチ", name: "バレットパンチ", type: "はがね", category: "物理", power: 40, accuracy: 100, priority: 1, flags: { contact: true, punch: true } },
  { id: "とんぼがえり", name: "とんぼがえり", type: "むし", category: "物理", power: 70, accuracy: 100, priority: 0, flags: { contact: true } },
  { id: "おんがえし", name: "おんがえし", type: "ノーマル", category: "物理", power: 102, accuracy: 100, priority: 0, flags: { contact: true } },
  { id: "ねこだまし", name: "ねこだまし", type: "ノーマル", category: "物理", power: 40, accuracy: 100, priority: 3, flags: { contact: true } },
  { id: "フレアドライブ", name: "フレアドライブ", type: "ほのお", category: "物理", power: 120, accuracy: 100, priority: 0, flags: { contact: true } },
  { id: "りゅうのまい", name: "りゅうのまい", type: "ドラゴン", category: "変化", power: 0, accuracy: 0, priority: 0 },
  // 特殊
  { id: "かえんほうしゃ", name: "かえんほうしゃ", type: "ほのお", category: "特殊", power: 90, accuracy: 100, priority: 0 },
  { id: "だいもんじ", name: "だいもんじ", type: "ほのお", category: "特殊", power: 110, accuracy: 85, priority: 0 },
  { id: "ヘドロばくだん", name: "ヘドロばくだん", type: "どく", category: "特殊", power: 90, accuracy: 100, priority: 0 },
  { id: "シャドーボール", name: "シャドーボール", type: "ゴースト", category: "特殊", power: 80, accuracy: 100, priority: 0 },
  { id: "りゅうせいぐん", name: "りゅうせいぐん", type: "ドラゴン", category: "特殊", power: 130, accuracy: 90, priority: 0 },
  { id: "あくのはどう", name: "あくのはどう", type: "あく", category: "特殊", power: 80, accuracy: 100, priority: 0, flags: { pulse: true } },
  { id: "サイコキネシス", name: "サイコキネシス", type: "エスパー", category: "特殊", power: 90, accuracy: 100, priority: 0 },
  { id: "10まんボルト", name: "10まんボルト", type: "でんき", category: "特殊", power: 90, accuracy: 100, priority: 0 },
  { id: "れいとうビーム", name: "れいとうビーム", type: "こおり", category: "特殊", power: 90, accuracy: 100, priority: 0 },
  { id: "なみのり", name: "なみのり", type: "みず", category: "特殊", power: 90, accuracy: 100, priority: 0 },
  { id: "マジカルシャイン", name: "マジカルシャイン", type: "フェアリー", category: "特殊", power: 80, accuracy: 100, priority: 0 },
  { id: "ラスターカノン", name: "ラスターカノン", type: "はがね", category: "特殊", power: 80, accuracy: 100, priority: 0 },
];

export const MOVE_BY_ID: Record<string, MoveData> = Object.fromEntries(
  MOVES.map((m) => [m.id, m]),
);
