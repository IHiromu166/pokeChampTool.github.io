export type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

export const TYPES = [
  "ノーマル",
  "ほのお",
  "みず",
  "でんき",
  "くさ",
  "こおり",
  "かくとう",
  "どく",
  "じめん",
  "ひこう",
  "エスパー",
  "むし",
  "いわ",
  "ゴースト",
  "ドラゴン",
  "あく",
  "はがね",
  "フェアリー",
] as const;

export type Type = (typeof TYPES)[number];

export type MoveCategory = "物理" | "特殊" | "変化";

export type Weather = "なし" | "はれ" | "あめ" | "すなあらし" | "ゆき";

export type Terrain =
  | "なし"
  | "エレキフィールド"
  | "グラスフィールド"
  | "ミストフィールド"
  | "サイコフィールド";

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface PokemonSpecies {
  id: string;
  name: string;
  types: [Type] | [Type, Type];
  baseStats: Stats;
  abilities: string[];
  /** メガシンカ後フォルム id（無ければ undefined） */
  mega?: string;
  /** メガシンカに必要な持ち物（メガストーン名） */
  megaStone?: string;
  /** 複数メガシンカがある種族用。設定時は mega/megaStone より優先。 */
  megas?: Array<{ key: string; id: string; label: string; stone?: string }>;
  weight: number;
}

export interface MoveData {
  id: string;
  name: string;
  type: Type;
  category: MoveCategory;
  power: number;
  accuracy: number; // 0=必中
  priority: number;
  flags?: {
    contact?: boolean;
    sound?: boolean;
    punch?: boolean;
    bite?: boolean;
    pulse?: boolean;
    slicing?: boolean;
    /** 接触技でも素手判定にしたい場合等 */
    multihit?: number | [number, number];
  };
}

export interface Nature {
  id: string;
  name: string;
  /** +10% 補正 */
  plus?: Exclude<StatKey, "hp">;
  /** −10% 補正 */
  minus?: Exclude<StatKey, "hp">;
}

export type ApSpread = Stats;

export interface PokemonInstance {
  speciesId: string;
  natureId: string;
  ability: string;
  item?: string;
  aps: ApSpread;
  /** ランク補正 (-6 〜 +6) */
  boosts?: Partial<Record<Exclude<StatKey, "hp">, number>>;
  status?: "やけど" | "なし";
  /** メガシンカを発動した状態として扱う */
  mega?: boolean;
  /** megas を持つ種族で、どの形態を選んでいるか (例: "x" | "y")。 */
  megaKey?: string;
}

export interface FieldState {
  weather: Weather;
  terrain: Terrain;
  /** 防御側に壁が貼ってある */
  reflect?: boolean;
  lightScreen?: boolean;
  auroraVeil?: boolean;
  /** 急所込み計算 */
  critical?: boolean;
}
