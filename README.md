# poke-tool

ポケモンチャンピオンズ（メガシンカ有り、Z技 / ダイマックス / テラスタル無し、天候・場・ステータス計算式は SV(第9世代) 準拠）向けの **ダメージ計算 / 逆引き / 耐久調整** Web ツール。

DB 不要。データはすべて `src/data/*.ts` で管理（ブラウザ単体で完結）。

## 機能

- `/calc` ダメージ計算：攻撃側・防御側・技・場の状態を入力 → 与ダメ%・確定数・乱数16段階を即時表示。
- `/reverse` 逆引き：
  - **ステータス推定**：観測した「相手の HP が ◯%減った」から、相手の HP / B (or D) 振り候補を列挙。
  - **必要火力**：「確定1発 / 乱数1発N%以上」の達成に必要な攻撃側 EV を算出。
- `/bulk` 耐久調整：脅威リスト（攻撃側＋技＋達成条件）を登録 → 全部耐えられる H/B/D 配分の上位案を提案。

## セットアップ

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm test     # vitest（14 ケース）
pnpm build    # 静的書き出し
```

## ディレクトリ

```
src/
  app/              Next.js App Router ページ
  data/             ポケモン / 技 / アイテム / 性格 / タイプ相性
  domain/           純粋関数のドメイン層（stats / damage / reverse / bulk-tuning）
  features/         UI コンポーネント
tests/              vitest テスト
```

## データ拡張

`src/data/pokemon.ts` は代表種 + メガフォーム 22 件、`src/data/moves.ts` は主要技 27 件で初期化。
全種族・全技を投入したい場合は [`smogon/pokemon-showdown`](https://github.com/smogon/pokemon-showdown) の `data/` から
スクリプトで抽出して `src/data/*.ts` を置き換える運用を想定（スクリプト同梱なし）。
