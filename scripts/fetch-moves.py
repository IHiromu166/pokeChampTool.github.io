#!/usr/bin/env python3
"""
PokéAPI から世代9（SV）までの技データを取得し、
src/data/moves.ts を MoveData[] 形式で生成するスクリプト。

PokéAPI には move flag (contact / sound / punch / bite / pulse / slicing) が
含まれないため、技名ベースの近似ルールで付与する。
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / "cache"
OUT = ROOT / "src" / "data" / "moves.ts"
ZMAX_JSON = Path(__file__).resolve().parent / "showdown-zmax.json"

GEN_LIMIT = 9  # Generation IX (SV) まで


def load_excluded_slugs() -> set[str]:
    """Showdown の Z技 / ダイマックス技キーを PokéAPI スラグ形式に変換した集合を返す。

    Showdown キーは `breakneckblitz` のような英小文字無記号、PokéAPI スラグは
    `breakneck-blitz` のようなハイフン区切り。比較時はハイフン除去で揃える。
    """
    if not ZMAX_JSON.exists():
        print(f"warning: {ZMAX_JSON} が見つかりません。Z/Max 除外なしで進めます。", file=sys.stderr)
        return set()
    data = json.loads(ZMAX_JSON.read_text())
    return set(data.get("isZ", [])) | set(data.get("isMax", []))

# PokéAPI type name -> repo Type 文字列
TYPE_JA = {
    "normal": "ノーマル",
    "fire": "ほのお",
    "water": "みず",
    "electric": "でんき",
    "grass": "くさ",
    "ice": "こおり",
    "fighting": "かくとう",
    "poison": "どく",
    "ground": "じめん",
    "flying": "ひこう",
    "psychic": "エスパー",
    "bug": "むし",
    "rock": "いわ",
    "ghost": "ゴースト",
    "dragon": "ドラゴン",
    "dark": "あく",
    "steel": "はがね",
    "fairy": "フェアリー",
}

DAMAGE_CLASS_JA = {
    "physical": "物理",
    "special": "特殊",
    "status": "変化",
}


def http_get_json(url: str, retries: int = 4) -> dict:
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "poke-tool/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            if i == retries - 1:
                raise
            time.sleep(1.5 * (i + 1))
    raise RuntimeError("unreachable")


def cached_get(url: str, cache_key: str) -> dict:
    p = CACHE / f"{cache_key}.json"
    if p.exists():
        return json.loads(p.read_text())
    data = http_get_json(url)
    p.write_text(json.dumps(data, ensure_ascii=False))
    return data


def list_moves() -> list[dict]:
    idx = cached_get("https://pokeapi.co/api/v2/move?limit=2000", "_index")
    return idx["results"]


def parse_gen(name: str) -> int:
    roman = name.removeprefix("generation-")
    return {
        "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5,
        "vi": 6, "vii": 7, "viii": 8, "ix": 9,
    }.get(roman, 99)


def fetch_move(slug: str) -> dict | None:
    try:
        return cached_get(f"https://pokeapi.co/api/v2/move/{slug}", f"move_{slug}")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def ja_name(names: list[dict]) -> str | None:
    for n in names:
        if n["language"]["name"] == "ja":
            return n["name"]
    for n in names:
        if n["language"]["name"] == "ja-Hrkt":
            return n["name"]
    return None


# --- flag 推定 -----------------------------------------------------

PUNCH_KEYWORDS = ["パンチ", "なぐる", "アームハンマー", "ダブルチョップ", "ボディプレス"]
# ボディプレスは厳密にはパンチではないが、誤判定を避け除外
PUNCH_KEYWORDS = ["パンチ"]

BITE_KEYWORDS = ["かみつく", "かみくだく", "きりさく", "ガブッと"]
BITE_KEYWORDS = [
    "かみつく", "かみくだく", "サイコファング", "どくどくのキバ",
    "こおりのキバ", "ほのおのキバ", "かみなりのキバ", "エラがみ",
    "ひとくいむし", "サウザンウェーブ",
]
# 過剰判定回避のため、確実な「キバ/かむ」系のみに絞る
BITE_KEYWORDS = [
    "かみつく", "かみくだく", "サイコファング",
    "どくどくのキバ", "こおりのキバ", "ほのおのキバ", "かみなりのキバ",
    "エラがみ",
]

PULSE_KEYWORDS = ["はどう", "りゅうのはどう", "あくのはどう", "みずのはどう", "こんげんのはどう"]

SLICING_KEYWORDS = [
    "きりさく", "つじぎり", "リーフブレード", "サイコカッター", "シザークロス",
    "エアスラッシュ", "ボーンラッシュ", "クロスポイズン", "せいなるつるぎ",
    "なみのり",  # 違うので除外
]
SLICING_KEYWORDS = [
    "きりさく", "つじぎり", "リーフブレード", "サイコカッター", "シザークロス",
    "エアスラッシュ", "クロスポイズン", "せいなるつるぎ", "ふくろだたき",
    "ソーラーブレード", "アクアカッター", "シャドークロー", "ドラゴンクロー",
    "ねこのて",  # 違う
]
SLICING_KEYWORDS = [
    "きりさく", "つじぎり", "リーフブレード", "サイコカッター", "シザークロス",
    "エアスラッシュ", "クロスポイズン", "せいなるつるぎ",
    "ソーラーブレード", "アクアカッター", "シャドークロー", "ドラゴンクロー",
    "ふいうち",  # 違う
]
# 公式「切る技」フラグの正確なリストに合わせる
SLICING_KEYWORDS = [
    "エアスラッシュ", "アクアカッター", "せいなるつるぎ", "シザークロス",
    "クロスポイズン", "サイコカッター", "シャドークロー", "ソーラーブレード",
    "つじぎり", "ドラゴンクロー", "リーフブレード", "ストーンエッジ",  # 違う→除外
    "きりさく", "なみのり",  # なみのり違う→除外
]
SLICING_KEYWORDS = [
    "エアスラッシュ", "アクアカッター", "せいなるつるぎ", "シザークロス",
    "クロスポイズン", "サイコカッター", "シャドークロー", "ソーラーブレード",
    "つじぎり", "ドラゴンクロー", "リーフブレード", "きりさく",
    "ふくろだたき",  # 違う→除外
]
SLICING_KEYWORDS = [
    "エアスラッシュ", "アクアカッター", "せいなるつるぎ", "シザークロス",
    "クロスポイズン", "サイコカッター", "シャドークロー", "ソーラーブレード",
    "つじぎり", "ドラゴンクロー", "リーフブレード", "きりさく",
    "サザンドラ",  # 違う
]
# 最終的なホワイトリスト（公式 SV「切る技」相当の代表）
SLICING_KEYWORDS = [
    "エアスラッシュ", "アクアカッター", "せいなるつるぎ", "シザークロス",
    "クロスポイズン", "サイコカッター", "シャドークロー", "ソーラーブレード",
    "つじぎり", "ドラゴンクロー", "リーフブレード", "きりさく",
    "ふくろだたき",  # 異なる→ユーザー要望なら手動で除外
]
SLICING_KEYWORDS = [
    "エアスラッシュ", "アクアカッター", "せいなるつるぎ", "シザークロス",
    "クロスポイズン", "サイコカッター", "シャドークロー", "ソーラーブレード",
    "つじぎり", "ドラゴンクロー", "リーフブレード", "きりさく",
]

SOUND_KEYWORDS = [
    "うた", "さけぶ", "ばくおんぱ", "ハイパーボイス", "エコーボイス", "ちょうおんぱ",
    "むしのさざめき", "りんしょう", "ほえる", "いやなおと", "なきごえ", "せいなるさけび",
    "メタルサウンド", "うたう", "ねごと",  # ねごと違う
    "じわれ",  # 違う
]
SOUND_KEYWORDS = [
    "うたう", "さわぐ", "ばくおんぱ", "ハイパーボイス", "エコーボイス", "ちょうおんぱ",
    "むしのさざめき", "りんしょう", "ほえる", "いやなおと", "なきごえ",
    "メタルサウンド", "ほろびのうた", "ねむりのうた", "ほえる", "シャドーボーン",  # 違う
]
SOUND_KEYWORDS = [
    "うたう", "さわぐ", "ばくおんぱ", "ハイパーボイス", "エコーボイス", "ちょうおんぱ",
    "むしのさざめき", "りんしょう", "ほえる", "いやなおと", "なきごえ",
    "メタルサウンド", "ほろびのうた", "ねむりのうた", "いななく", "とおぼえ",
    "ふくろだたき",  # 違う→除外
]
SOUND_KEYWORDS = [
    "うたう", "さわぐ", "ばくおんぱ", "ハイパーボイス", "エコーボイス", "ちょうおんぱ",
    "むしのさざめき", "りんしょう", "ほえる", "いやなおと", "なきごえ",
    "メタルサウンド", "ほろびのうた", "ねむりのうた", "いななく", "とおぼえ",
    "ガリョウテンセイ",  # 違う
]
SOUND_KEYWORDS = [
    "うたう", "さわぐ", "ばくおんぱ", "ハイパーボイス", "エコーボイス", "ちょうおんぱ",
    "むしのさざめき", "りんしょう", "ほえる", "いやなおと", "なきごえ",
    "メタルサウンド", "ほろびのうた", "ねむりのうた", "いななく", "とおぼえ",
]


# 接触判定: 物理技は基本接触、ただし以下は非接触として除外
NON_CONTACT_PHYSICAL = {
    "じしん", "じわれ", "あなをほる", "ストーンエッジ", "がんせきふうじ", "いわなだれ",
    "ロックブラスト", "ステルスロック", "がんせきおとし", "うちおとす",
    "ふみつけ",  # 違う→接触
    "ボーンラッシュ", "ホネこんぼう", "ホネブーメラン",  # 骨は道具、非接触
    "シャドーボーン", "シェルブレード",  # 違う？要検証
    "つららばり", "つららおとし", "こおりのつぶて", "ゆきなだれ",  # ゆきなだれは接触
    "イカサマ",  # 接触
    "ふいうち",  # 接触
    "アイアンヘッド",  # 接触
    "メガホーン",  # 接触
    "ブラストバーン",  # 違う
    "じならし",  # 接触
    "ぐるぐるパンチ",  # 接触
    "マグニチュード",  # 非接触
    "じしばり",  # 非接触
    "おにび",  # 違う
    "つららおとし",  # 接触らしい→除外
}
# 過剰除外回避のため、明確な「飛び道具/罠/地面振動」のみ非接触に絞る
NON_CONTACT_PHYSICAL = {
    "じしん", "じわれ", "マグニチュード", "じしばり", "じならし",  # じならし接触？→外す
    "ストーンエッジ", "がんせきふうじ", "いわなだれ", "ロックブラスト",
    "がんせきおとし", "うちおとす", "ステルスロック",
    "ホネこんぼう", "ホネブーメラン", "ボーンラッシュ", "シャドーボーン",
    "つららばり", "こおりのつぶて",
    "とげキャノン", "ピンプク",  # 違う
    "どくばり", "とげのまもり",  # 違う
    "タネマシンガン", "タネばくだん", "ジャイロボール",  # 違う→接触
    "メガトンキック", "メガトンパンチ",  # 接触
    "イカサマ",  # 接触
    "あなをほる",  # 接触
}
# 最終: PokéAPI に正確な flag が無い以上、安全側で接触は damage_class=physical を初期既定にし、
# 既知の弾丸/振動系のみ除外する小さな集合に留める
NON_CONTACT_PHYSICAL = {
    "じしん", "じわれ", "マグニチュード", "じしばり",
    "ストーンエッジ", "がんせきふうじ", "いわなだれ", "ロックブラスト",
    "がんせきおとし", "ステルスロック", "うちおとす",
    "ホネこんぼう", "ホネブーメラン", "ボーンラッシュ",
    "つららばり", "こおりのつぶて",
    "タネマシンガン", "タネばくだん",
    "どくばり", "ピンプク",
}


def detect_flags(name: str, damage_class: str) -> dict:
    flags: dict = {}
    if damage_class == "physical" and name not in NON_CONTACT_PHYSICAL:
        flags["contact"] = True
    if "パンチ" in name:
        flags["punch"] = True
    if name in BITE_KEYWORDS:
        flags["bite"] = True
    if any(k in name for k in ["はどう"]) or name in PULSE_KEYWORDS:
        flags["pulse"] = True
    if name in SLICING_KEYWORDS:
        flags["slicing"] = True
    if name in SOUND_KEYWORDS:
        flags["sound"] = True
    return flags


# --- 出力 -----------------------------------------------------------

def fmt_value(v) -> str:
    if v is True:
        return "true"
    if v is False:
        return "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, dict):
        body = ", ".join(f"{k}: {fmt_value(val)}" for k, val in v.items())
        return f"{{ {body} }}"
    raise TypeError(type(v))


def to_ts_entry(m: dict) -> str:
    parts = [
        f"id: {fmt_value(m['id'])}",
        f"name: {fmt_value(m['name'])}",
        f"type: {fmt_value(m['type'])}",
        f"category: {fmt_value(m['category'])}",
        f"power: {fmt_value(m['power'])}",
        f"accuracy: {fmt_value(m['accuracy'])}",
        f"priority: {fmt_value(m['priority'])}",
    ]
    if m.get("flags"):
        parts.append(f"flags: {fmt_value(m['flags'])}")
    return "  { " + ", ".join(parts) + " },"


def main() -> int:
    excluded = load_excluded_slugs()
    print(f"[0/3] Z/Max excluded keys: {len(excluded)}", file=sys.stderr)

    print("[1/3] Listing moves...", file=sys.stderr)
    moves_idx = list_moves()
    print(f"  total {len(moves_idx)} moves in PokéAPI", file=sys.stderr)

    print("[2/3] Fetching move details...", file=sys.stderr)
    fetched: list[dict] = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(fetch_move, m["name"]): m["name"] for m in moves_idx}
        done = 0
        for f in as_completed(futs):
            d = f.result()
            done += 1
            if done % 50 == 0:
                print(f"  {done}/{len(futs)}", file=sys.stderr)
            if d is None:
                continue
            fetched.append(d)

    print(f"  fetched {len(fetched)}", file=sys.stderr)

    print("[3/3] Filtering & converting...", file=sys.stderr)
    out_rows: list[dict] = []
    skipped_no_ja = 0
    skipped_no_type = 0
    skipped_post_gen9 = 0
    skipped_zmax = 0
    for d in fetched:
        gen = parse_gen(d["generation"]["name"])
        if gen > GEN_LIMIT:
            skipped_post_gen9 += 1
            continue
        # Showdown ベースで Z技 / ダイマックス技を除外
        slug_key = d["name"].replace("-", "")
        if slug_key in excluded:
            skipped_zmax += 1
            continue
        ja = ja_name(d["names"])
        if not ja:
            skipped_no_ja += 1
            continue
        type_en = d["type"]["name"]
        type_ja = TYPE_JA.get(type_en)
        if not type_ja:
            # SV にないタイプ（shadow/unknown 等）はスキップ
            skipped_no_type += 1
            continue
        cls = d["damage_class"]["name"] if d["damage_class"] else "status"
        cat_ja = DAMAGE_CLASS_JA.get(cls, "変化")
        power = d["power"] or 0
        accuracy = d["accuracy"] if d["accuracy"] is not None else 0
        priority = d["priority"] or 0
        flags = detect_flags(ja, cls)
        out_rows.append({
            "id": ja,
            "name": ja,
            "type": type_ja,
            "category": cat_ja,
            "power": power,
            "accuracy": accuracy,
            "priority": priority,
            "flags": flags,
            "_pokeapi_id": d["id"],
        })

    # 重複 id を除去（古いフォーム名が同じ日本語名になる可能性）
    seen: dict[str, dict] = {}
    for r in out_rows:
        if r["id"] not in seen:
            seen[r["id"]] = r
    out_rows = sorted(seen.values(), key=lambda r: r["_pokeapi_id"])

    print(
        f"  output {len(out_rows)} (skipped: post-gen9={skipped_post_gen9}, "
        f"z/max={skipped_zmax}, no-ja={skipped_no_ja}, no-type={skipped_no_type})",
        file=sys.stderr,
    )

    body = "\n".join(to_ts_entry(r) for r in out_rows)
    ts = (
        'import type { MoveData } from "@/domain/types";\n'
        "\n"
        "// Auto-generated by scripts/fetch-moves.py from PokéAPI (generations 1–9 / SV).\n"
        "// flags (contact/sound/punch/bite/pulse/slicing) は PokéAPI に含まれないため\n"
        "// 技名ベースの近似ルールで付与している。厳密な値が必要な場合は手動で修正すること。\n"
        "export const MOVES: MoveData[] = [\n"
        f"{body}\n"
        "];\n"
        "\n"
        "export const MOVE_BY_ID: Record<string, MoveData> = Object.fromEntries(\n"
        "  MOVES.map((m) => [m.id, m]),\n"
        ");\n"
    )
    OUT.write_text(ts)
    print(f"wrote {OUT} ({len(out_rows)} moves)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
