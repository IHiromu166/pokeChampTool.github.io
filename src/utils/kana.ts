export function hiraganaToKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60),
  );
}

export function normalizeName(s: string): string {
  return hiraganaToKatakana(s.trim().toLowerCase());
}
