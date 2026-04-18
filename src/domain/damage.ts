import { ITEM_BY_ID } from "@/data/items";
import { NATURE_BY_ID } from "@/data/natures";
import { POKEMON_BY_ID } from "@/data/pokemon";
import { getTypeEffectiveness } from "@/data/type-chart";
import { boostMultiplier, buildActualStats } from "./stats";
import type {
  FieldState,
  MoveData,
  PokemonInstance,
  PokemonSpecies,
  Stats,
  Type,
} from "./types";

/** ダメージ式に出てくる「チェイン補正」用の積算（4096 ベース）。 */
function chain(...modifiers: number[]): number {
  // 第6世代以降の補正は 4096 ベースで丸めながら掛けるが、
  // 表示用途では浮動小数演算で十分な精度になるため積をそのまま返す。
  return modifiers.reduce((a, b) => a * b, 1);
}

const RANDOM_ROLLS = [
  0.85, 0.86, 0.87, 0.88, 0.89, 0.9, 0.91, 0.92,
  0.93, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1.0,
];

export interface DamageInput {
  attacker: PokemonInstance;
  defender: PokemonInstance;
  move: MoveData;
  field: FieldState;
}

export interface DamageResult {
  /** 16 通りの最終ダメージ（昇順） */
  rolls: number[];
  min: number;
  max: number;
  defenderHp: number;
  /** 0..1。例：0.5625 → 56.25%乱数 */
  oneShotRate: number;
  /** 1=確定1発, 2=確定2発 など。乱数1発の場合は 1 */
  guaranteedKoTurns: number | null;
  /** 各ダメージ% */
  percents: number[];
  /** 攻撃側で使った A or C 実数値（逆引きで使用） */
  attackStat: number;
  /** 防御側で使った B or D 実数値 */
  defenseStat: number;
  /** タイプ相性倍率（0/0.25/0.5/1/2/4） */
  typeEffectiveness: number;
}

export function resolveSpecies(instance: PokemonInstance): PokemonSpecies {
  const base = POKEMON_BY_ID[instance.speciesId];
  if (!base) throw new Error(`unknown species: ${instance.speciesId}`);
  if (instance.mega && base.mega) {
    return POKEMON_BY_ID[base.mega] ?? base;
  }
  return base;
}

function resolveAbility(instance: PokemonInstance): string {
  const species = resolveSpecies(instance);
  if (instance.mega && species.id !== POKEMON_BY_ID[instance.speciesId].id) {
    // メガフォルム側の特性で上書き
    return species.abilities[0] ?? instance.ability;
  }
  return instance.ability;
}

export function calcDamage(input: DamageInput): DamageResult {
  const { attacker, defender, move, field } = input;

  if (move.category === "変化") {
    return zeroResult();
  }

  const atkSpecies = resolveSpecies(attacker);
  const defSpecies = resolveSpecies(defender);
  const atkAbility = resolveAbility(attacker);
  const defAbility = resolveAbility(defender);

  const atkNature = NATURE_BY_ID[attacker.natureId] ?? NATURE_BY_ID["まじめ"];
  const defNature = NATURE_BY_ID[defender.natureId] ?? NATURE_BY_ID["まじめ"];

  const atkStats = buildActualStats(
    atkSpecies.baseStats,
    attacker.ivs,
    attacker.evs,
    attacker.level,
    atkNature,
  );
  const defStats = buildActualStats(
    defSpecies.baseStats,
    defender.ivs,
    defender.evs,
    defender.level,
    defNature,
  );

  const isPhysical = move.category === "物理";
  const atkKey = isPhysical ? "atk" : "spa";
  const defKey = isPhysical ? "def" : "spd";

  // ── 攻撃 / 防御 実数値（ランク補正込） ──
  let A = atkStats[atkKey];
  let D = defStats[defKey];

  const atkBoost = attacker.boosts?.[atkKey] ?? 0;
  const defBoost = defender.boosts?.[defKey] ?? 0;

  // 急所時：攻撃側のマイナス補正と防御側のプラス補正を無視
  if (field.critical) {
    if (atkBoost > 0) A = Math.floor(A * boostMultiplier(atkBoost));
    if (defBoost < 0) D = Math.floor(D * boostMultiplier(defBoost));
  } else {
    A = Math.floor(A * boostMultiplier(atkBoost));
    D = Math.floor(D * boostMultiplier(defBoost));
  }

  // 砂嵐：いわタイプの D 1.5倍（特殊技ダメ計）
  if (field.weather === "すなあらし" && !isPhysical && defSpecies.types.includes("いわ")) {
    D = Math.floor(D * 1.5);
  }
  // 雪：こおりタイプの B 1.5倍（物理技ダメ計）
  if (field.weather === "ゆき" && isPhysical && defSpecies.types.includes("こおり")) {
    D = Math.floor(D * 1.5);
  }

  // しんかのきせき
  if (defender.item && ITEM_BY_ID[defender.item]?.eviolite) {
    D = Math.floor(D * 1.5);
  }

  // ちからもち / ヨガパワー
  if (isPhysical && (atkAbility === "ちからもち" || atkAbility === "ヨガパワー")) {
    A = A * 2;
  }

  // ── ベースダメージ ──
  const L = attacker.level;
  let base = Math.floor(Math.floor(Math.floor((2 * L) / 5 + 2) * move.power * A / D) / 50) + 2;

  // ── 補正 ──
  const modifiers: number[] = [];

  // 天候
  if (field.weather === "はれ") {
    if (move.type === "ほのお") modifiers.push(1.5);
    if (move.type === "みず") modifiers.push(0.5);
  } else if (field.weather === "あめ") {
    if (move.type === "みず") modifiers.push(1.5);
    if (move.type === "ほのお") modifiers.push(0.5);
  }

  // 急所
  if (field.critical) modifiers.push(1.5);

  // STAB
  const attackingTypes = atkSpecies.types as readonly Type[];
  if (attackingTypes.includes(move.type)) {
    if (atkAbility === "てきおうりょく") modifiers.push(2);
    else modifiers.push(1.5);
  }

  // タイプ相性
  const typeEff = getTypeEffectiveness(move.type, defSpecies.types as Type[]);
  modifiers.push(typeEff);

  // やけど（物理 0.5 倍。こんじょうは無視）
  if (isPhysical && attacker.status === "やけど" && atkAbility !== "こんじょう") {
    modifiers.push(0.5);
  }

  // 壁
  if (!field.critical && atkAbility !== "すりぬけ") {
    if (isPhysical && (field.reflect || field.auroraVeil)) modifiers.push(0.5);
    if (!isPhysical && (field.lightScreen || field.auroraVeil)) modifiers.push(0.5);
  }

  // 半減/弱点 補正特性（防御側）
  if (typeEff > 1) {
    if (defAbility === "ハードロック" || defAbility === "フィルター") modifiers.push(0.75);
    if (defAbility === "プリズムアーマー") modifiers.push(0.75);
  }

  // 攻撃側アイテム（攻撃倍率）
  const item = attacker.item ? ITEM_BY_ID[attacker.item] : undefined;
  if (item) {
    if (isPhysical && item.choiceBand) modifiers.push(1.5);
    if (!isPhysical && item.choiceSpecs) modifiers.push(1.5);
    if (item.lifeOrb) modifiers.push(1.3);
    if (item.muscleBand && isPhysical) modifiers.push(1.1);
    if (item.wiseGlasses && !isPhysical) modifiers.push(1.1);
    if (item.expertBelt && typeEff > 1) modifiers.push(1.2);
    if (item.typeBoostType && item.typeBoostType === move.type) modifiers.push(1.2);
  }

  // ── 乱数適用 ──
  const baseAfterMods = base * chain(...modifiers);
  const rolls = RANDOM_ROLLS.map((r) => Math.floor(baseAfterMods * r));
  const min = rolls[0];
  const max = rolls[rolls.length - 1];

  const defenderHp = defStats.hp;
  const oneShotRate = rolls.filter((d) => d >= defenderHp).length / rolls.length;
  const guaranteedKoTurns = computeGuaranteedKo(min, defenderHp);
  const percents = rolls.map((d) => (d / defenderHp) * 100);

  return {
    rolls,
    min,
    max,
    defenderHp,
    oneShotRate,
    guaranteedKoTurns,
    percents,
    attackStat: A,
    defenseStat: D,
    typeEffectiveness: typeEff,
  };
}

function computeGuaranteedKo(minDamage: number, hp: number): number | null {
  if (minDamage <= 0) return null;
  return Math.ceil(hp / minDamage);
}

function zeroResult(): DamageResult {
  return {
    rolls: Array(16).fill(0),
    min: 0,
    max: 0,
    defenderHp: 0,
    oneShotRate: 0,
    guaranteedKoTurns: null,
    percents: Array(16).fill(0),
    attackStat: 0,
    defenseStat: 0,
    typeEffectiveness: 1,
  };
}

/** EV を変えながら同じ計算をする際に使う、build 結果ベースの計算ヘルパ */
export interface PrebuiltContext {
  atkSpeciesTypes: readonly Type[];
  defSpeciesTypes: readonly Type[];
  level: number;
  movePower: number;
  moveType: Type;
  isPhysical: boolean;
  baseModifiers: number[];
  typeEffectiveness: number;
}

export function damageRollsRaw(A: number, D: number, ctx: PrebuiltContext): number[] {
  let base =
    Math.floor(
      Math.floor(Math.floor((2 * ctx.level) / 5 + 2) * ctx.movePower * A / D) / 50,
    ) + 2;
  const m = chain(...ctx.baseModifiers, ctx.typeEffectiveness);
  return RANDOM_ROLLS.map((r) => Math.floor(base * m * r));
}
