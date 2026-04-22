# pokeChampTool

ポケモンチャンピオンズ(メガシンカ有り、Z技 / ダイマックス / テラスタル無し)向けの **ダメージ計算 / 逆引き / 耐久調整** Web ツール。

DB 不要。データはすべて `src/data/*.ts` で管理(ブラウザ単体で完結)。GitHub Pages で公開。

## チャンピオンズのステータス仕様

- **個体値**: 全ステータス固定 31
- **努力値廃止**: 代わりに **能力ポイント** を採用
  - 1 ステータスあたり上限 **32 ポイント**、全ステータス合計上限 **66 ポイント**
  - 1 ポイントにつき実数値が **+1**
- **レベル**: 50 固定
- **ステータス計算式**:
  - HP: `floor((種族値×2 + 31 + 能力P×2) × 50/100) + 60`
  - HP 以外: `floor((floor((種族値×2 + 31 + 能力P×2) × 50/100) + 5) × 性格補正)`

## 機能

- `/calc` ダメージ計算: 攻撃側・防御側・技・場の状態を入力 → 与ダメ%・確定数・乱数16段階を即時表示
  - 技の選択肢は攻撃側ポケモンが覚える技のみ(learnset ベース)で、**タイプ → 物理/特殊 → 威力(降順)** で並ぶ
  - 見出し横の **⇄ 攻撃/防御を入れ替え** ボタンで、攻撃側・防御側のポケモン設定(能力P・性格・特性・持ち物・ランク補正・やけど・メガ状態)を丸ごと入れ替え可能
  - 攻撃側・防御側・場・技の入力は **`/reverse` と同一のストア (zustand + localStorage) に保持** され、タブを切り替えても直前の状態が保たれる
- `/reverse` 逆引き
  - **自分視点トグル**: 「自分=攻撃側 / 自分=防御側」を切替。常に **相手側** の振り・性格・持ち物を推測する
  - 自分=攻撃側: 観測した相手残体力(%)から、相手の HP / B (or D) 能力ポイント候補を列挙
  - 自分=防御側: 観測した自分残 HP の実数値から、相手の A (or C) 能力ポイント候補を列挙
  - 候補ごとに **能力ポイント / 実数値 / 性格 (+/中/-) / 持ち物 (なし or 技タイプ強化) / 一致率** を表示
- `/bulk` 耐久調整: 脅威リスト(攻撃側+技+達成条件)を登録 → 全部耐えられる H/B/D 配分の上位案を提案(合計 66 以内)
- `/double` ダブルバトル ダメージ計算: 攻撃側 2 体 + 防御側 1 体を同時入力し、それぞれの与ダメを並べて表示(場・防御側は共有)

## セットアップ

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest (15 ケース)
npm run build    # 静的書き出し (out/)
```

## デプロイ

`main` ブランチへの push で GitHub Actions が自動ビルド・GitHub Pages へデプロイ(`.github/workflows/nextjs.yml`)。

`next.config.mjs` で `output: "export"` を指定しているため、`next build` で `out/` に静的サイトが生成される。

## ディレクトリ

```
src/
  app/              Next.js App Router ページ
  data/             ポケモン / 技 / アイテム / 性格 / タイプ相性
  domain/           純粋関数のドメイン層(stats / damage / reverse / bulk-tuning)
  features/         UI コンポーネント
tests/              vitest テスト
.github/workflows/  GitHub Pages デプロイ
```

## データ

- `src/data/pokemon.ts` — ポケモンチャンピオンズ登場ポケモン 284 エントリ(ベース / 公式メガ / 独自メガ / リージョン / 特殊フォーム)。種族値・特性は [smogon/pokemon-showdown](https://github.com/smogon/pokemon-showdown) の `data/` 由来の公式値ベース。独自メガはゲーム内データを直接反映
- `src/data/moves.ts` — 世代 9 (SV) までの技 866 件。`scripts/fetch-moves.py` で PokéAPI から自動生成(Z技 / ダイマックス技は除外)
- `src/data/learnsets.ts` — 各ポケモンが覚える技 ID の一覧。`scripts/extract-learnsets.py` で Pokémon Showdown の `data/learnsets.ts` から自動生成し、`src/features/MovePicker.tsx` で攻撃側の選択肢絞り込みに使用
- `src/data/natures.ts` — 全 25 性格
- `src/data/items.ts` — 計算に使う持ち物
- `src/data/type-chart.ts` — タイプ相性表

### 既知の TODO

- `src/data/pokemon.ts` の `weight` は全エントリで暫定 `0`。わざの威力計算で重さ参照が必要になった際に一括更新
- 独自メガの `megaStone` 名は暫定命名(例: `エンブオーナイト`)。正式名称が判明次第修正

## AI エージェント向けガイド

Claude Code / Codex / Cursor などを使う開発者は [AGENTS.md](AGENTS.md) を参照。
