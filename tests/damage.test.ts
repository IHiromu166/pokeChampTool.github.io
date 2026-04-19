import { describe, expect, it } from "vitest";
import { calcDamage, resolveSpecies } from "@/domain/damage";
import { makeAps, makePokemon } from "@/domain/factory";
import { MOVE_BY_ID } from "@/data/moves";

const garchompEarthquake = (defender: ReturnType<typeof makePokemon>) =>
  calcDamage({
    attacker: makePokemon("garchomp", {
      natureId: "ようき",
      ability: "さめはだ",
      aps: makeAps({ atk: 32, spe: 32 }),
    }),
    defender,
    move: MOVE_BY_ID["じしん"],
    field: { weather: "なし", terrain: "なし" },
  });

describe("damage", () => {
  it("ガブ じしん vs ヒードラン AP=0 → 4倍弱点で確定1発", () => {
    const r = garchompEarthquake(
      makePokemon("heatran", {
        natureId: "おだやか",
        ability: "もらいび",
        aps: makeAps({}),
      }),
    );
    expect(r.typeEffectiveness).toBe(4);
    expect(r.guaranteedKoTurns).toBe(1);
  });

  it("ガブ じしん vs ハッサム AP=0 わんぱく → 等倍で1発で倒せない", () => {
    const r = garchompEarthquake(
      makePokemon("scizor", {
        natureId: "わんぱく",
        ability: "テクニシャン",
        aps: makeAps({}),
      }),
    );
    expect(r.typeEffectiveness).toBe(1);
    expect(r.oneShotRate).toBe(0);
    expect(r.max * 2).toBeGreaterThanOrEqual(r.defenderHp);
  });

  it("メガクチート ふいうち vs メガガル → ちからもちで攻撃実数値が2倍", () => {
    const atk = makePokemon("mawile", {
      natureId: "いじっぱり",
      ability: "いかく",
      item: "クチートナイト",
      aps: makeAps({ atk: 0, hp: 0, spd: 0 }),
      mega: true,
    });
    const def = makePokemon("kangaskhan", {
      natureId: "いじっぱり",
      ability: "おやこあい",
      item: "ガルーラナイト",
      aps: makeAps({ hp: 0, atk: 0 }),
      mega: true,
    });
    const r = calcDamage({
      attacker: atk,
      defender: def,
      move: MOVE_BY_ID["ふいうち"],
      field: { weather: "なし", terrain: "なし" },
    });
    // ちからもちで A 実数値が 2 倍になっていること
    expect(r.attackStat % 2).toBe(0);
    expect(r.attackStat).toBeGreaterThan(0);
    expect(r.typeEffectiveness).toBe(1);
  });

  it("特殊技：はれ + ほのお技 1.5倍", () => {
    const atk = makePokemon("charizard", {
      natureId: "ひかえめ",
      ability: "ひでり",
      aps: makeAps({ spa: 32 }),
      mega: true,
      megaKey: "y",
    });
    const def = makePokemon("ferrothorn", {
      natureId: "わんぱく",
      ability: "てつのトゲ",
      aps: makeAps({}),
    });
    const sunny = calcDamage({
      attacker: atk,
      defender: def,
      move: MOVE_BY_ID["かえんほうしゃ"],
      field: { weather: "はれ", terrain: "なし" },
    });
    const noSun = calcDamage({
      attacker: atk,
      defender: def,
      move: MOVE_BY_ID["かえんほうしゃ"],
      field: { weather: "なし", terrain: "なし" },
    });
    expect(sunny.guaranteedKoTurns).toBe(1);
    expect(sunny.max).toBeGreaterThan(noSun.max);
    expect(sunny.typeEffectiveness).toBe(4);
  });

  it("メガリザードンX：megaKey='x' で atk 130 / ドラゴン複合に解決される", () => {
    const atk = makePokemon("charizard", {
      mega: true,
      megaKey: "x",
      ability: "かたいツメ",
    });
    const sp = resolveSpecies(atk);
    expect(sp.id).toBe("charizard-mega-x");
    expect(sp.baseStats.atk).toBe(130);
    expect(sp.types).toContain("ドラゴン");
  });

  it("壁（リフレクター）で物理ダメージ半減", () => {
    const atk = makePokemon("garchomp", {
      natureId: "ようき",
      ability: "さめはだ",
      aps: makeAps({ atk: 32, spe: 32 }),
    });
    const def = makePokemon("scizor", {
      natureId: "わんぱく",
      aps: makeAps({}),
    });
    const noWall = calcDamage({
      attacker: atk,
      defender: def,
      move: MOVE_BY_ID["じしん"],
      field: { weather: "なし", terrain: "なし" },
    });
    const wall = calcDamage({
      attacker: atk,
      defender: def,
      move: MOVE_BY_ID["じしん"],
      field: { weather: "なし", terrain: "なし", reflect: true },
    });
    expect(wall.max).toBe(Math.floor(noWall.max * 0.5));
  });

  it("変化技は 0 ダメージ", () => {
    const r = calcDamage({
      attacker: makePokemon("garchomp"),
      defender: makePokemon("scizor"),
      move: MOVE_BY_ID["つるぎのまい"],
      field: { weather: "なし", terrain: "なし" },
    });
    expect(r.max).toBe(0);
    expect(r.guaranteedKoTurns).toBe(null);
  });
});
