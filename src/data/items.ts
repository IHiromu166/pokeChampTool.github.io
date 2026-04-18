/**
 * アイテムは「効果コード」の集合として持つ。`damage.ts` で参照。
 * メガストーンは識別子のみ（持っていればメガシンカできる、というフラグ）。
 */
export interface ItemData {
  id: string;
  name: string;
  /** ATK / SPA を 1.5 倍 */
  choiceBand?: boolean;
  choiceSpecs?: boolean;
  choiceScarf?: boolean;
  /** 攻撃 1.3 倍 / 反動 1/10 */
  lifeOrb?: boolean;
  /** タイプ一致時 1.2 倍 */
  expertBelt?: boolean;
  /** 該当タイプ +20% */
  typeBoostType?: string;
  /** 効果ばつぐん時 0.5 倍（防御側） */
  weaknessPolicyDef?: never; // 例として将来追加
  /** 進化前で防御 / 特防 1.5 倍 */
  eviolite?: boolean;
  /** メガシンカ用（フラグのみ） */
  megaStoneFor?: string;
  /** ちからのハチマキ等 1.1 倍 */
  muscleBand?: boolean;
  wiseGlasses?: boolean;
}

export const ITEMS: ItemData[] = [
  { id: "なし", name: "なし" },
  { id: "こだわりハチマキ", name: "こだわりハチマキ", choiceBand: true },
  { id: "こだわりメガネ", name: "こだわりメガネ", choiceSpecs: true },
  { id: "こだわりスカーフ", name: "こだわりスカーフ", choiceScarf: true },
  { id: "いのちのたま", name: "いのちのたま", lifeOrb: true },
  { id: "たつじんのおび", name: "たつじんのおび", expertBelt: true },
  { id: "ちからのハチマキ", name: "ちからのハチマキ", muscleBand: true },
  { id: "ものしりメガネ", name: "ものしりメガネ", wiseGlasses: true },
  { id: "しんかのきせき", name: "しんかのきせき", eviolite: true },
  // タイプ強化アイテム（よく使う物のみ）
  { id: "もくたん", name: "もくたん", typeBoostType: "ほのお" },
  { id: "しんぴのしずく", name: "しんぴのしずく", typeBoostType: "みず" },
  { id: "じしゃく", name: "じしゃく", typeBoostType: "でんき" },
  { id: "きせきのタネ", name: "きせきのタネ", typeBoostType: "くさ" },
  { id: "とけないこおり", name: "とけないこおり", typeBoostType: "こおり" },
  { id: "くろおび", name: "くろおび", typeBoostType: "かくとう" },
  { id: "どくバリ", name: "どくバリ", typeBoostType: "どく" },
  { id: "やわらかいすな", name: "やわらかいすな", typeBoostType: "じめん" },
  { id: "するどいくちばし", name: "するどいくちばし", typeBoostType: "ひこう" },
  { id: "まがったスプーン", name: "まがったスプーン", typeBoostType: "エスパー" },
  { id: "ぎんのこな", name: "ぎんのこな", typeBoostType: "むし" },
  { id: "かたいいし", name: "かたいいし", typeBoostType: "いわ" },
  { id: "のろいのおふだ", name: "のろいのおふだ", typeBoostType: "ゴースト" },
  { id: "りゅうのキバ", name: "りゅうのキバ", typeBoostType: "ドラゴン" },
  { id: "くろメガネ", name: "くろメガネ", typeBoostType: "あく" },
  { id: "メタルコート", name: "メタルコート", typeBoostType: "はがね" },
  { id: "ようせいのハネ", name: "ようせいのハネ", typeBoostType: "フェアリー" },
];

export const ITEM_BY_ID: Record<string, ItemData> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i]),
);
