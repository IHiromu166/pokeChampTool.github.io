import { describe, expect, it } from "vitest";
import { hiraganaToKatakana, normalizeName } from "@/utils/kana";

describe("hiraganaToKatakana", () => {
  it("ひらがなをカタカナに変換する", () => {
    expect(hiraganaToKatakana("ふしぎばな")).toBe("フシギバナ");
  });

  it("濁点・半濁点付きの文字も変換する", () => {
    expect(hiraganaToKatakana("ばぴゃ")).toBe("バピャ");
  });

  it("カタカナはそのまま", () => {
    expect(hiraganaToKatakana("フシギバナ")).toBe("フシギバナ");
  });

  it("ひらがな・カタカナ混在でもひらがな部分のみ変換する", () => {
    expect(hiraganaToKatakana("フシギばな")).toBe("フシギバナ");
  });

  it("英数字や記号は変更しない", () => {
    expect(hiraganaToKatakana("abc 123 -!")).toBe("abc 123 -!");
  });

  it("空文字を受け付ける", () => {
    expect(hiraganaToKatakana("")).toBe("");
  });
});

describe("normalizeName", () => {
  it("前後空白を除去する", () => {
    expect(normalizeName("  フシギバナ  ")).toBe("フシギバナ");
  });

  it("英字を小文字化する", () => {
    expect(normalizeName("ABC")).toBe("abc");
  });

  it("ひらがな/カタカナを同一視する (両方カタカナに寄せる)", () => {
    expect(normalizeName("ふしぎばな")).toBe(normalizeName("フシギバナ"));
  });

  it("濁点は保持される", () => {
    expect(normalizeName("ばひ")).toBe("バヒ");
  });
});
