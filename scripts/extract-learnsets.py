#!/usr/bin/env python3
"""
Pokémon Showdown の data/learnsets.ts と PokéAPI キャッシュから
src/data/learnsets.ts（repoPokemonId -> 日本語技IDの配列）を生成する。

前提:
  - /tmp/showdown-learnsets.ts に Showdown の learnsets.ts を配置済み
  - scripts/cache/move_<slug>.json に PokéAPI の move 詳細が保存済み
    （scripts/fetch-moves.py で生成されるキャッシュを流用）
  - src/data/pokemon.ts の id 規約は既知（base / mega / regional / etc）

行ベース解析:
  - \t<key>: {        ... 種族キー (top-level)
  - \t\tlearnset: {   ... learnset ブロック開始
  - \t\t\t<moveKey>:  ... 技スラグ
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / "cache"
LEARNSETS_SRC = Path("/tmp/showdown-learnsets.ts")
POKEMON_TS = ROOT / "src" / "data" / "pokemon.ts"
OUT = ROOT / "src" / "data" / "learnsets.ts"


# repoId -> Showdown learnset id
# フォーム名を Showdown の id へ正規化する個別マッピング。
# メガ/regional の一般ルールは下のコードで処理するので、
# ここには「ハイフンを消してもマッチしない」例外だけを書く。
SPECIAL_MAP: dict[str, str] = {
    # Aegislash: ブレード/シールド どちらも同じ learnset (aegislash)
    "aegislash-blade": "aegislash",
    "aegislash-shield": "aegislash",
    # Gourgeist のサイズは全て gourgeist
    "gourgeist-average": "gourgeist",
    "gourgeist-small": "gourgeist",
    "gourgeist-large": "gourgeist",
    "gourgeist-super": "gourgeist",
    # Lycanroc: midday は lycanroc、midnight/dusk は個別
    "lycanroc-midday": "lycanroc",
    "lycanroc-midnight": "lycanrocmidnight",
    "lycanroc-dusk": "lycanrocdusk",
    # Basculegion: m は basculegion、f は basculegionf
    "basculegion-m": "basculegion",
    "basculegion-f": "basculegionf",
    # Palafin: hero/zero ともに palafin
    "palafin-hero": "palafin",
    # Meowstic: m=meowstic, f=meowsticf (mega は各元へ)
    "meowstic-m": "meowstic",
    "meowstic-f": "meowsticf",
    "meowstic-m-mega": "meowstic",
    "meowstic-f-mega": "meowsticf",
    # Floette eternal / mega
    "floette-eternal-mega": "floetteeternal",
    # Kommo-o は kommoo
    "kommo-o": "kommoo",
    # Mr. Rime
    "mr-rime": "mrrime",
}


def repo_id_to_showdown(repo_id: str) -> str:
    """repo の pokemon id を Showdown learnset の key に変換する。

    1. SPECIAL_MAP に該当するならそれを返す
    2. 末尾 "-mega"/"-mega-x"/"-mega-y" を剥がして再帰
    3. 残りは単にハイフンを除去（`ninetales-alola` -> `ninetalesalola`）
    """
    if repo_id in SPECIAL_MAP:
        return SPECIAL_MAP[repo_id]
    # メガ (-mega, -mega-x, -mega-y) は base 形の learnset に従う
    for suf in ("-mega-x", "-mega-y", "-mega"):
        if repo_id.endswith(suf):
            return repo_id_to_showdown(repo_id[: -len(suf)])
    return repo_id.replace("-", "")


def parse_repo_pokemon_ids() -> list[str]:
    text = POKEMON_TS.read_text()
    ids = re.findall(r'^\s*id:\s*"([^"]+)",', text, flags=re.MULTILINE)
    # 重複排除（念のため）
    seen: set[str] = set()
    out: list[str] = []
    for i in ids:
        if i in seen:
            continue
        seen.add(i)
        out.append(i)
    return out


def parse_showdown_learnsets() -> dict[str, list[str]]:
    """showdown-learnsets.ts をパースして species_key -> list[move_slug] を返す。"""
    text = LEARNSETS_SRC.read_text()
    species_re = re.compile(r"^\t([a-z0-9]+):\s*\{\s*$")
    learnset_begin_re = re.compile(r"^\t\tlearnset:\s*\{\s*$")
    learnset_end_re = re.compile(r"^\t\t\},?\s*$")
    move_re = re.compile(r"^\t\t\t([a-z0-9]+):\s*\[")

    out: dict[str, list[str]] = {}
    current_species: str | None = None
    in_learnset = False

    for line in text.split("\n"):
        if in_learnset:
            if learnset_end_re.match(line):
                in_learnset = False
                continue
            m = move_re.match(line)
            if m and current_species is not None:
                out.setdefault(current_species, []).append(m.group(1))
            continue

        m = species_re.match(line)
        if m:
            current_species = m.group(1)
            continue
        if current_species is None:
            continue
        if learnset_begin_re.match(line):
            in_learnset = True

    return out


def build_slug_to_ja() -> dict[str, str]:
    """PokéAPI キャッシュから Showdown 風 slug (ハイフン除去) -> 日本語技名を構築。

    cache のファイル名は `move_<pokeapi-slug>.json`。
    Showdown の move key はハイフンを持たないので、PokéAPI slug からハイフンを
    除去して突き合わせる。
    """
    mapping: dict[str, str] = {}
    for p in CACHE.glob("move_*.json"):
        slug_full = p.stem[len("move_") :]  # e.g. "thunder-punch"
        key = slug_full.replace("-", "")
        try:
            d = json.loads(p.read_text())
        except Exception:
            continue
        ja: str | None = None
        for n in d.get("names", []):
            if n.get("language", {}).get("name") == "ja":
                ja = n.get("name")
                break
        if ja is None:
            for n in d.get("names", []):
                if n.get("language", {}).get("name") == "ja-Hrkt":
                    ja = n.get("name")
                    break
        if ja:
            mapping[key] = ja
    return mapping


def load_moves_ts_ids() -> set[str]:
    """src/data/moves.ts に存在する技 id 集合を返す。"""
    ts = (ROOT / "src" / "data" / "moves.ts").read_text()
    return set(re.findall(r'\{\s*id:\s*"([^"]+)"', ts))


def fmt_ts(d: dict[str, list[str]]) -> str:
    lines = [
        "// Auto-generated by scripts/extract-learnsets.py",
        "// from Pokémon Showdown (data/learnsets.ts) + PokéAPI move 名マッピング。",
        "// 値は src/data/moves.ts に実在する日本語技 id のみ。",
        "export const LEARNSETS: Record<string, readonly string[]> = {",
    ]
    for species_id in sorted(d.keys()):
        moves = sorted(d[species_id])
        body = ", ".join(json.dumps(m, ensure_ascii=False) for m in moves)
        lines.append(f'  {json.dumps(species_id)}: [{body}],')
    lines.append("};")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    if not LEARNSETS_SRC.exists():
        print(f"error: {LEARNSETS_SRC} が存在しません。Showdown の learnsets.ts を配置してください。", file=sys.stderr)
        return 1

    repo_ids = parse_repo_pokemon_ids()
    print(f"[1/4] repo pokemon ids: {len(repo_ids)}", file=sys.stderr)

    learnsets = parse_showdown_learnsets()
    print(f"[2/4] showdown learnset entries: {len(learnsets)}", file=sys.stderr)

    slug_to_ja = build_slug_to_ja()
    print(f"[3/4] move slug -> ja mappings: {len(slug_to_ja)}", file=sys.stderr)

    valid_ja_ids = load_moves_ts_ids()
    print(f"       moves.ts 有効 id: {len(valid_ja_ids)}", file=sys.stderr)

    out: dict[str, list[str]] = {}
    missing_species: list[str] = []
    missing_slugs: dict[str, int] = {}
    dropped_unknown_move: dict[str, int] = {}

    for rid in repo_ids:
        sid = repo_id_to_showdown(rid)
        slugs = learnsets.get(sid)
        if slugs is None:
            missing_species.append(f"{rid} -> {sid}")
            out[rid] = []
            continue
        seen: set[str] = set()
        moves: list[str] = []
        for slug in slugs:
            ja = slug_to_ja.get(slug)
            if ja is None:
                missing_slugs[slug] = missing_slugs.get(slug, 0) + 1
                continue
            if ja not in valid_ja_ids:
                dropped_unknown_move[ja] = dropped_unknown_move.get(ja, 0) + 1
                continue
            if ja in seen:
                continue
            seen.add(ja)
            moves.append(ja)
        out[rid] = moves

    print(f"[4/4] species で learnset 未取得: {len(missing_species)}", file=sys.stderr)
    if missing_species:
        for m in missing_species[:20]:
            print(f"  - {m}", file=sys.stderr)
    if missing_slugs:
        top = sorted(missing_slugs.items(), key=lambda x: -x[1])[:10]
        print(f"  PokéAPI キャッシュに無い move slug 件数 (上位): {top}", file=sys.stderr)
    if dropped_unknown_move:
        print(f"  moves.ts に無い ja 技名 (除外) 種類: {len(dropped_unknown_move)}", file=sys.stderr)

    OUT.write_text(fmt_ts(out))
    total_moves = sum(len(v) for v in out.values())
    print(f"wrote {OUT} ({len(out)} pokemon / {total_moves} move entries)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
