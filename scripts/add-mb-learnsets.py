#!/usr/bin/env python3
"""
M-B 新規ポケモンのリーンセットを src/data/learnsets.ts に追記するスクリプト。

slug -> 日本語技名 のマッピングを 2 段階で構築:
  1. Showdown moves.ts のステータスで一意マッチ (336 件ほど)
  2. 既存 learnsets.ts の制約伝播で残りを推定

PokéAPI 不要・オフライン動作。
前提:
  - /tmp/showdown-learnsets.ts  Showdown data/learnsets.ts
  - /tmp/showdown-moves.ts      Showdown data/moves.ts  (GitHub から取得済み)
  - src/data/moves.ts           日本語技データ
  - src/data/learnsets.ts       既存リーンセット
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEARNSETS_SRC = Path("/tmp/showdown-learnsets.ts")
MOVES_SRC = Path("/tmp/showdown-moves.ts")
LEARNSETS_TS = ROOT / "src" / "data" / "learnsets.ts"
MOVES_TS = ROOT / "src" / "data" / "moves.ts"

NEW_POKEMON_IDS = [
    "vileplume",
    "qwilfish",
    "sceptile",
    "sceptile-mega",
    "blaziken",
    "blaziken-mega",
    "swampert",
    "swampert-mega",
    "staraptor",
    "staraptor-mega",
    "musharna",
    "scolipede",
    "scolipede-mega",
    "scrafty",
    "scrafty-mega",
    "eelektross",
    "eelektross-mega",
    "pyroar",
    "pyroar-mega",
    "malamar",
    "malamar-mega",
    "barbaracle",
    "barbaracle-mega",
    "dragalge",
    "dragalge-mega",
    "grimmsnarl",
    "falinks",
    "falinks-mega",
    "annihilape",
    "gholdengo",
    "raichu-mega-x",
    "raichu-mega-y",
]

SPECIAL_MAP: dict[str, str] = {
    "raichu-mega-x": "raichu",
    "raichu-mega-y": "raichu",
    "kommo-o": "kommoo",
    "mr-rime": "mrrime",
    "aegislash-blade": "aegislash",
    "aegislash-shield": "aegislash",
}

TYPE_JA = {
    "Normal": "ノーマル", "Fire": "ほのお", "Water": "みず", "Electric": "でんき",
    "Grass": "くさ", "Ice": "こおり", "Fighting": "かくとう", "Poison": "どく",
    "Ground": "じめん", "Flying": "ひこう", "Psychic": "エスパー", "Bug": "むし",
    "Rock": "いわ", "Ghost": "ゴースト", "Dragon": "ドラゴン", "Dark": "あく",
    "Steel": "はがね", "Fairy": "フェアリー",
}
CATEGORY_JA = {"Physical": "物理", "Special": "特殊", "Status": "変化"}


def repo_id_to_showdown(repo_id: str) -> str:
    if repo_id in SPECIAL_MAP:
        return SPECIAL_MAP[repo_id]
    for suf in ("-mega-x", "-mega-y", "-mega"):
        if repo_id.endswith(suf):
            return repo_id_to_showdown(repo_id[: -len(suf)])
    return repo_id.replace("-", "")


def parse_showdown_learnsets() -> dict[str, list[str]]:
    text = LEARNSETS_SRC.read_text()
    out: dict[str, list[str]] = {}
    current: str | None = None
    in_learnset = False
    for line in text.split("\n"):
        if in_learnset:
            if re.match(r"^\t\t\},?\s*$", line):
                in_learnset = False
                continue
            m = re.match(r"^\t\t\t([a-z0-9]+):\s*\[", line)
            if m and current is not None:
                out.setdefault(current, []).append(m.group(1))
            continue
        m = re.match(r"^\t([a-z0-9]+):\s*\{\s*$", line)
        if m:
            current = m.group(1)
            continue
        if current is None:
            continue
        if re.match(r"^\t\tlearnset:\s*\{\s*$", line):
            in_learnset = True
    return out


def parse_showdown_moves() -> dict[str, dict]:
    text = MOVES_SRC.read_text()
    out: dict[str, dict] = {}
    entry_re = re.compile(r'^\t"?([a-z0-9]+)"?:\s*\{\s*$', re.MULTILINE)

    lines = text.split("\n")
    i = 0
    while i < len(lines):
        m = entry_re.match(lines[i])
        if not m:
            i += 1
            continue
        slug = m.group(1)
        depth = 1
        block_lines = [lines[i]]
        j = i + 1
        while j < len(lines) and depth > 0:
            line = lines[j]
            depth += line.count("{") - line.count("}")
            block_lines.append(line)
            j += 1
        block = "\n".join(block_lines)

        acc_m = re.search(r"accuracy:\s*(true|\d+)", block)
        accuracy = 0 if not acc_m or acc_m.group(1) == "true" else int(acc_m.group(1))
        bp_m = re.search(r"basePower:\s*(\d+)", block)
        power = int(bp_m.group(1)) if bp_m else 0
        cat_m = re.search(r'category:\s*"(Physical|Special|Status)"', block)
        cat_ja = CATEGORY_JA.get(cat_m.group(1), "変化") if cat_m else "変化"
        type_m = re.search(r'type:\s*"([A-Za-z]+)"', block)
        type_ja = TYPE_JA.get(type_m.group(1), "") if type_m else ""
        pri_m = re.search(r"priority:\s*(-?\d+)", block)
        priority = int(pri_m.group(1)) if pri_m else 0
        nonstandard = bool(re.search(r'isNonstandard:\s*"', block))

        out[slug] = {
            "type_ja": type_ja, "cat_ja": cat_ja,
            "power": power, "accuracy": accuracy,
            "priority": priority, "nonstandard": nonstandard,
        }
        i = j
    return out


def load_ja_moves() -> dict[str, dict]:
    text = MOVES_TS.read_text()
    out: dict[str, dict] = {}
    for line in text.split("\n"):
        m = re.match(
            r'\s*\{\s*id:\s*"([^"]+)",.*?type:\s*"([^"]+)",\s*category:\s*"([^"]+)",\s*power:\s*(\d+),\s*accuracy:\s*(\d+),\s*priority:\s*(-?\d+)',
            line,
        )
        if not m:
            continue
        ja, t, c, pw, acc, pri = m.group(1), m.group(2), m.group(3), int(m.group(4)), int(m.group(5)), int(m.group(6))
        out[ja] = {"type": t, "category": c, "power": pw, "accuracy": acc, "priority": pri}
    return out


def load_existing_learnsets() -> dict[str, list[str]]:
    text = LEARNSETS_TS.read_text()
    result: dict[str, list[str]] = {}
    for line in text.split("\n"):
        m = re.match(r'^\s+"([^"]+)":\s*\[([^\]]*)\],?\s*$', line)
        if not m:
            continue
        pid = m.group(1)
        raw = m.group(2).strip()
        result[pid] = re.findall(r'"([^"]+)"', raw) if raw else []
    return result


def build_mapping(
    showdown_moves: dict[str, dict],
    ja_moves: dict[str, dict],
    showdown_learnsets: dict[str, list[str]],
    existing_learnsets: dict[str, list[str]],
    repo_ids_existing: list[str],
) -> dict[str, str]:
    """2 段階で slug -> ja マッピングを構築する。"""

    # ─── Phase 1: stats だけで一意に決まるもの ───────────────────────────────
    # key (type_ja, cat_ja, power, accuracy, priority) -> list of ja_names
    key_to_ja: dict[tuple, list[str]] = defaultdict(list)
    for ja_name, props in ja_moves.items():
        key = (props["type"], props["category"], props["power"], props["accuracy"], props["priority"])
        key_to_ja[key].append(ja_name)

    # slug -> key for Showdown slugs
    slug_key: dict[str, tuple] = {}
    for slug, props in showdown_moves.items():
        if props["nonstandard"] or not props["type_ja"]:
            continue
        slug_key[slug] = (props["type_ja"], props["cat_ja"], props["power"], props["accuracy"], props["priority"])

    slug_to_ja: dict[str, str] = {}
    for slug, key in slug_key.items():
        candidates = key_to_ja.get(key, [])
        if len(candidates) == 1:
            slug_to_ja[slug] = candidates[0]

    print(f"  Phase 1: {len(slug_to_ja)} unambiguous by stats", file=sys.stderr)

    # ─── Phase 2: 制約伝播 ────────────────────────────────────────────────────
    # 既存リーンセット + Showdown learnset の制約を使う。
    # 各 ja_name J について、J の stats key に一致する slug のうち、
    # 既存 Pokemon P の learnset.ts に J があって かつ P の Showdown に
    # そのスラグがある場合のみカウント。

    # ja_name -> set of candidate slugs (stats matching + not yet assigned)
    ja_to_possible_slugs: dict[str, set[str]] = defaultdict(set)
    for slug, key in slug_key.items():
        if slug in slug_to_ja:
            continue  # already assigned
        for ja in key_to_ja.get(key, []):
            ja_to_possible_slugs[ja].add(slug)

    changed = True
    iteration = 0
    while changed:
        changed = False
        iteration += 1

        for rid in repo_ids_existing:
            sid = repo_id_to_showdown(rid)
            slugs_for_pid = set(showdown_learnsets.get(sid, []))
            ja_for_pid = set(existing_learnsets.get(rid, []))

            for ja_name in list(ja_for_pid):
                if ja_name in slug_to_ja.values():
                    # 既に別のスラグに割り当て済みか同じスラグに割り当て済み
                    continue
                possible = ja_to_possible_slugs.get(ja_name, set())
                # この Pokemon の Showdown learnset に存在 + まだ未割当
                restricted = possible & slugs_for_pid
                restricted -= slug_to_ja.keys()
                if len(restricted) == 1:
                    inferred_slug = next(iter(restricted))
                    slug_to_ja[inferred_slug] = ja_name
                    # 他の ja_name の possible から除去
                    for other_ja in list(ja_to_possible_slugs.keys()):
                        ja_to_possible_slugs[other_ja].discard(inferred_slug)
                    changed = True

        if iteration > 50:
            break

    print(f"  Phase 2: +{len(slug_to_ja) - int(slug_to_ja.__len__() - 0)} total {len(slug_to_ja)} (after {iteration} iterations)", file=sys.stderr)
    print(f"  Total slug->ja mappings: {len(slug_to_ja)}", file=sys.stderr)
    return slug_to_ja


def verify_mapping(
    slug_to_ja: dict[str, str],
    showdown_learnsets: dict[str, list[str]],
    existing_learnsets: dict[str, list[str]],
    repo_ids_existing: list[str],
) -> None:
    total_ja = 0
    matched = 0
    for pid in repo_ids_existing:
        sid = repo_id_to_showdown(pid)
        slugs = showdown_learnsets.get(sid, [])
        slug_set = set(slugs)
        mapped_from_slugs = {slug_to_ja[s] for s in slug_set if s in slug_to_ja}
        for ja in existing_learnsets.get(pid, []):
            total_ja += 1
            if ja in mapped_from_slugs:
                matched += 1
    if total_ja > 0:
        pct = 100 * matched // total_ja
        print(f"  Verification: {matched}/{total_ja} ({pct}%)", file=sys.stderr)


def main() -> int:
    for p in [LEARNSETS_SRC, MOVES_SRC]:
        if not p.exists():
            print(f"error: {p} が存在しません。", file=sys.stderr)
            return 1

    print("[1] Parsing Showdown learnsets...", file=sys.stderr)
    showdown_learnsets = parse_showdown_learnsets()
    print(f"  {len(showdown_learnsets)} species", file=sys.stderr)

    print("[2] Parsing Showdown data/moves.ts...", file=sys.stderr)
    showdown_moves = parse_showdown_moves()
    print(f"  {len(showdown_moves)} moves", file=sys.stderr)

    print("[3] Loading Japanese moves from moves.ts...", file=sys.stderr)
    ja_moves = load_ja_moves()
    print(f"  {len(ja_moves)} Japanese moves", file=sys.stderr)

    print("[4] Loading existing learnsets.ts...", file=sys.stderr)
    existing = load_existing_learnsets()
    print(f"  {len(existing)} existing entries", file=sys.stderr)

    # 既存 learnset に含まれる repo_id のリスト
    repo_ids_existing = list(existing.keys())

    print("[5] Building slug->ja mapping (2-phase)...", file=sys.stderr)
    slug_to_ja = build_mapping(
        showdown_moves, ja_moves, showdown_learnsets, existing, repo_ids_existing
    )

    print("[6] Verifying mapping quality...", file=sys.stderr)
    verify_mapping(slug_to_ja, showdown_learnsets, existing, repo_ids_existing)

    print("[7] Generating learnsets for new Pokémon...", file=sys.stderr)
    new_entries: dict[str, list[str]] = {}
    for rid in NEW_POKEMON_IDS:
        if rid in existing:
            print(f"  skip {rid} (already exists)", file=sys.stderr)
            continue
        sid = repo_id_to_showdown(rid)
        slugs = showdown_learnsets.get(sid)
        if slugs is None:
            print(f"  warning: no Showdown entry for {rid} -> {sid}", file=sys.stderr)
            new_entries[rid] = []
            continue
        seen: set[str] = set()
        moves: list[str] = []
        for s in slugs:
            ja = slug_to_ja.get(s)
            if ja and ja not in seen:
                seen.add(ja)
                moves.append(ja)
        new_entries[rid] = sorted(moves)
        print(f"  {rid} ({sid}): {len(new_entries[rid])} moves", file=sys.stderr)

    if not new_entries:
        print("No new entries to add.", file=sys.stderr)
        return 0

    print("[8] Writing updated learnsets.ts...", file=sys.stderr)
    # Remove last "}";" and add new entries
    text = LEARNSETS_TS.read_text().rstrip()
    if text.endswith("};"):
        text = text[:-2].rstrip()

    new_lines = []
    for rid in sorted(new_entries.keys()):
        moves = new_entries[rid]
        body = ", ".join(json.dumps(m, ensure_ascii=False) for m in moves)
        new_lines.append(f'  {json.dumps(rid)}: [{body}],')

    new_text = text + "\n" + "\n".join(new_lines) + "\n};\n"
    LEARNSETS_TS.write_text(new_text)
    print(f"Done! Added {len(new_entries)} new entries.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
