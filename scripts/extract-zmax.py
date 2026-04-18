#!/usr/bin/env python3
"""
Pokémon Showdown の data/moves.ts から isZ / isMax を持つ技の key を抽出する。

行ベースで簡易解析:
  - 行が `\\t<key>: {` (タブ1個) の場合、現在の key を更新
  - 行が `\\t\\tisZ:` / `\\t\\tisMax:` (タブ2個) の場合、現在の key に紐付ける
これで内部のテンプレ文字列やネスト関数定義に惑わされない。
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SRC = Path("/tmp/showdown-moves.ts")
OUT = Path(__file__).resolve().parent / "showdown-zmax.json"


def main() -> int:
    text = SRC.read_text()
    key_re = re.compile(r"^\t([a-z0-9]+):\s*\{\s*$")
    isz_re = re.compile(r"^\t\tisZ:\s*")
    ismax_re = re.compile(r"^\t\tisMax:\s*")

    current: str | None = None
    out_z: set[str] = set()
    out_max: set[str] = set()

    for line in text.split("\n"):
        m = key_re.match(line)
        if m:
            current = m.group(1)
            continue
        if current is None:
            continue
        if isz_re.match(line):
            out_z.add(current)
        elif ismax_re.match(line):
            out_max.add(current)

    print(f"isZ: {len(out_z)}, isMax: {len(out_max)}", file=sys.stderr)
    OUT.write_text(json.dumps({"isZ": sorted(out_z), "isMax": sorted(out_max)}, indent=2))
    print(f"wrote {OUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
