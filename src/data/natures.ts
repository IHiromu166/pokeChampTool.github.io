import type { Nature } from "@/domain/types";

export const NATURES: Nature[] = [
  { id: "がんばりや", name: "がんばりや" },
  { id: "さみしがり", name: "さみしがり", plus: "atk", minus: "def" },
  { id: "ゆうかん", name: "ゆうかん", plus: "atk", minus: "spe" },
  { id: "いじっぱり", name: "いじっぱり", plus: "atk", minus: "spa" },
  { id: "やんちゃ", name: "やんちゃ", plus: "atk", minus: "spd" },
  { id: "ずぶとい", name: "ずぶとい", plus: "def", minus: "atk" },
  { id: "すなお", name: "すなお" },
  { id: "のんき", name: "のんき", plus: "def", minus: "spe" },
  { id: "わんぱく", name: "わんぱく", plus: "def", minus: "spa" },
  { id: "のうてんき", name: "のうてんき", plus: "def", minus: "spd" },
  { id: "おくびょう", name: "おくびょう", plus: "spe", minus: "atk" },
  { id: "せっかち", name: "せっかち", plus: "spe", minus: "def" },
  { id: "まじめ", name: "まじめ" },
  { id: "ようき", name: "ようき", plus: "spe", minus: "spa" },
  { id: "むじゃき", name: "むじゃき", plus: "spe", minus: "spd" },
  { id: "ひかえめ", name: "ひかえめ", plus: "spa", minus: "atk" },
  { id: "おっとり", name: "おっとり", plus: "spa", minus: "def" },
  { id: "れいせい", name: "れいせい", plus: "spa", minus: "spe" },
  { id: "てれや", name: "てれや" },
  { id: "うっかりや", name: "うっかりや", plus: "spa", minus: "spd" },
  { id: "おだやか", name: "おだやか", plus: "spd", minus: "atk" },
  { id: "おとなしい", name: "おとなしい", plus: "spd", minus: "def" },
  { id: "なまいき", name: "なまいき", plus: "spd", minus: "spe" },
  { id: "しんちょう", name: "しんちょう", plus: "spd", minus: "spa" },
  { id: "きまぐれ", name: "きまぐれ" },
];

export const NATURE_BY_ID: Record<string, Nature> = Object.fromEntries(
  NATURES.map((n) => [n.id, n]),
);
