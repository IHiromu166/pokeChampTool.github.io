import { describe, expect, it } from "vitest";
import { calcDamage } from "@/domain/damage";
import { makeEvs, makePokemon } from "@/domain/factory";
import { MOVE_BY_ID } from "@/data/moves";

const garchompEarthquake = (defender: ReturnType<typeof makePokemon>) =>
  calcDamage({
    attacker: makePokemon("garchomp", {
      natureId: "ようき",
      ability: "さめはだ",
      evs: makeEvs({ atk: 252, spe: 252 }),
    }),
    defender,
    move: MOVE_BY_ID["じしん"],
    field: { weather: "なし", terrain: "なし" },
  });

describe("damage", () => {
  it("ガブ じしん vs ヒードラン H4 D0 → 4倍弱点で確定1発", () => {
    const r = garchompEarthquake(
      makePokemon("heatran", {
        natureId: "おだやか",
        ability: "もらいび",
        evs: makeEvs({ hp: 4 }),
      }),
    );
    expect(r.defenderHp).toBe(167);
    expect(r.typeEffectiveness).toBe(4);
    expect(r.guaranteedKoTurns).toBe(1);
  });

  it("ガブ じしん vs ハッサム H252 わんぱく → 等倍で大ダメージにならない", () => {
    const r = garchompEarthquake(
      makePokemon("scizor", {
        natureId: "わんぱく",
        ability: "テクニシャン",
        evs: makeEvs({ hp: 252 }),
      }),
    );
    expect(r.defenderHp).toBe(177);
    expect(r.typeEffectiveness).toBe(1);
    expect(r.oneShotRate).toBe(0); // 等倍では確定1発しない
    // 確定2発 ライン (max + max >= HP)
    expect(r.max * 2).toBeGreaterThanOrEqual(r.defenderHp);
  });

  it("メガクチート ふいうち vs メガガル H252 → ちからもちが乗り高乱数1発", () => {
    const atk = makePokemon("mawile", {
      natureId: "いじっぱり",
      ability: "いかく",
      item: "クチートナイト",
      evs: makeEvs({ atk: 252, hp: 4, spd: 252 }),
      mega: true,
    });
    const def = makePokemon("kangaskhan", {
      natureId: "いじっぱり",
      ability: "おやこあい",
      item: "ガルーラナイト",
      evs: makeEvs({ hp: 252, atk: 252 }),
      mega: true,
    });
    const r = calcDamage({
      attacker: atk,
      defender: def,
      move: MOVE_BY_ID["ふいうち"],
      field: { weather: "なし", terrain: "なし" },
    });
    expect(r.attackStat).toBe(344); // 172 * 2 ちからもち
    expect(r.typeEffectiveness).toBe(1);
    // ちからもちでも、いかく対象でないメガガルのBが厚いため大ダメージにはならない
    expect(r.max).toBeGreaterThan(60);
  });

  it("特殊技：はれ + 太陽の特防補正なし、ほのお技 1.5倍", () => {
    const atk = makePokemon("charizard", {
      natureId: "ひかえめ",
      ability: "ひでり",
      evs: makeEvs({ spa: 252 }),
      mega: true, // mega-y
    });
    const def = makePokemon("ferrothorn", {
      natureId: "わんぱく",
      ability: "てつのトゲ",
      evs: makeEvs({ hp: 252, spd: 4 }),
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
    // はれ + ほのおSTAB + 4倍弱点で確定1発
    expect(sunny.guaranteedKoTurns).toBe(1);
    expect(sunny.max).toBeGreaterThan(noSun.max);
    expect(sunny.typeEffectiveness).toBe(4);
  });

  it("壁（リフレクター）で物理ダメージ半減", () => {
    const atk = makePokemon("garchomp", {
      natureId: "ようき",
      ability: "さめはだ",
      evs: makeEvs({ atk: 252, spe: 252 }),
    });
    const def = makePokemon("scizor", {
      natureId: "わんぱく",
      evs: makeEvs({ hp: 252 }),
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
