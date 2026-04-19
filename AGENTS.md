# AGENTS.md

AI コーディングエージェント(Claude Code / Codex / Cursor など)向けの開発ガイド。人間向けの概要は [README.md](README.md) を参照。

## プロジェクト概要

ポケモンチャンピオンズ(メガシンカ有り / Z技・ダイマックス・テラスタル無し)用のダメージ計算・逆引き・耐久調整ツール。Next.js 15 (App Router) + React 19 + TypeScript の SPA 的な静的サイト。サーバー/DB 無し、全ロジックがブラウザ内。GitHub Pages に静的エクスポートで公開。

## セットアップ / 開発コマンド

| 用途 | コマンド |
| --- | --- |
| 依存インストール | `npm install` |
| 開発サーバー | `npm run dev` (`http://localhost:3000`) |
| 型チェック | `npx tsc --noEmit` |
| テスト | `npm test` (vitest, 15 ケース) |
| テスト (watch) | `npm run test:watch` |
| Lint | `npm run lint` (Next.js の ESLint ルール) |
| 静的ビルド | `npm run build` → `out/` に出力 |

**パッケージマネージャ**: `package-lock.json` が正。`pnpm-lock.yaml` は残置しているが CI では使わない。新規パッケージ追加は `npm install <pkg>` で行うこと。

## ディレクトリ構成と役割

```
src/
  app/              Next.js App Router (各ページ)
    page.tsx        トップ
    calc/           ダメージ計算
    reverse/        逆引き (ステータス推定 / 必要火力)
    bulk/           耐久調整
  data/             静的データ (*.ts、実行時変更なし)
    pokemon.ts      234 エントリ + POKEMON_BY_ID インデックス
    moves.ts        27 技 + MOVE_BY_ID
    natures.ts      25 性格
    items.ts        計算対象アイテム
    type-chart.ts   タイプ相性
  domain/           純粋関数のドメイン層 (UI 非依存)
    types.ts        型定義の中央集権: Type / Stats / PokemonSpecies / MoveData / Nature / PokemonInstance / FieldState
    stats.ts        実数値計算 (calcHp / calcStat / buildActualStats / boostMultiplier)
    damage.ts       ダメージ式 (resolveSpecies / calcDamage / chain)
    reverse.ts      逆引き (ステータス推定 / 必要火力)
    bulk-tuning.ts  耐久調整
    factory.ts      makeAps / makePokemon ヘルパ
  features/         UI コンポーネント (PokemonForm / MovePicker / FieldForm / DamageResult)
tests/              vitest テスト (damage / stats / reverse / bulk-tuning)
.github/workflows/  GitHub Pages デプロイ
```

## コード規約

### TypeScript
- `tsconfig.json` は `strict: true`。エラーは握り潰さない
- パスエイリアス `@/*` は `src/*` に解決(例: `@/data/pokemon`)
- 型は `src/domain/types.ts` に集約。ここを最初に読むとドメインの全体像がつかめる

### 言語
- **識別子**: 英語(`calcDamage`, `baseStats` など)
- **ポケモン/技/特性/タイプ名・性格**: 日本語文字列(例: `"ドラゴン"`, `"ようき"`, `"じしん"`)。`src/domain/types.ts` の `Type` / `MoveCategory` / `Weather` / `Terrain` は日本語 union 型
- **ポケモン id**: Pokémon Showdown スタイルの英小文字(`garchomp`, `charizard-mega-x`, `raichu-alola`, `tauros-paldea-combat`, `rotom-heat`, `aegislash-shield`, `basculegion-m` 等)。既存の id を勝手に改名しない(テストが参照している)

### コメント
- コメントは最小限。「なぜ」が非自明な場合のみ書く
- ダメージ式の細かい丸め処理など、仕様に根差した不思議に見える挙動は短いコメントで根拠を残す(`domain/damage.ts` に実例あり)

## ステータス計算の仕様

ポケモンチャンピオンズ固有のルールを厳守:

- **個体値**: 全ステータス固定 31
- **努力値廃止** → **能力ポイント (AP)**: 1 ステータス上限 32、合計上限 66、1 AP = 実数値 +1
- **レベル**: 50 固定
- HP: `floor((2*B + 31 + AP*2) * 50/100) + 60` (ヌケニン特例で base=1 → HP=1)
- HP 以外: `floor((floor((2*B + 31 + AP*2) * 50/100) + 5) * 性格補正)`

計算式の変更はダメージ計算の結果全体に響くため、テストを必ず先に追加してから本体を触ること。

## データ編集時の注意

### `src/data/pokemon.ts`
- 種族値・特性は [smogon/pokemon-showdown](https://github.com/smogon/pokemon-showdown) の `data/pokedex.ts` 由来の公式値ベース
- 独自メガ(メガメガニウム等、本家に存在しないもの)はゲーム内提供データを直接反映
- **`weight` は全エントリ暫定 `0`**。わざの威力計算で重さ参照が必要になったら一括更新する方針
- **既存 id の改名禁止**: `garchomp` / `charizard` / `charizard-mega-x` / `charizard-mega-y` / `gengar` はテストが参照

### 新しいポケモン追加時
1. `types.ts` の `PokemonSpecies` 型に従う(`types` は 1 〜 2 要素のタプル)
2. メガシンカ前には `mega: "<id>-mega"` と `megaStone: "<ストーン名>"` を付与
3. メガ後のエントリは `mega`/`megaStone` を持たない
4. id 命名は Showdown スタイル(英小文字ハイフン区切り)

### 新しい技追加時
- `MOVES` 配列に追加。接触・音・パンチ等のフラグは `flags` に集約

## テスト

- テストランナー: `vitest`(`vitest.config.ts` でエイリアス解決)
- 実計算の検証は `tests/stats.test.ts` と `tests/damage.test.ts` が基準
- ダメージ式やステータス式を変更するときは、既存テストが期待値ごと根拠で記述されている(コメント参照)ため、期待値を書き換える前に「なぜ変わるか」をコミットメッセージに残すこと
- 新機能には対応テストを追加

## Git / PR 運用

- **作業開始時は必ずセッションごとに新しいブランチを作成してから作業に入る**。`main` や別目的の既存ブランチ上で直接編集しない。依頼内容に応じて `feature/...` / `fix/...` / `docs/...` / `update/...` から適切なプレフィックスで切る
- ブランチ命名: `feature/...` / `fix/...` / `docs/...` / `update/...`
- コミットメッセージは日本語で OK。冒頭行で「何を・なぜ」が伝わるように
- PR は main 向け。マージ後に GitHub Actions が `main` への push を検知して自動デプロイ
- destructive 操作(`git push --force`、`reset --hard` など)は原則禁止。必要なら人間に確認

### PR 作成時のデフォルト方針(確認不要で適用)

- 直前の作業ブランチが別目的(例: `docs/...` で進行中)の場合、今回の変更用に**新しいブランチを切ってから** PR を作成する。ベースは原則 `main`
- **依頼と無関係な変更は PR に含めない**。作業中に見つかった未コミットの無関係な変更(他ファイルの差分や untracked ファイル)はステージせず、依頼に該当するファイルのみを `git add <path>` で個別に追加する
- **`.claude/settings.local.json` の permission 追加分は PR に含めない**。個人環境の設定であり、コミット対象外
- **PR 作成時は [README.md](README.md) を自動で更新する**。今回の変更によりユーザー向けの機能・画面構成・使い方・制約が変わる場合は、該当セクションを同じ PR 内で更新して一緒にコミットする。変更がドキュメントや内部実装のみで README の記述に影響しない場合は更新不要(その判断も併せて行うこと)

## デプロイ

- `.github/workflows/nextjs.yml` が `main` への push で起動
- `npm ci` → `npx --no-install next build` → `out/` を Pages アーティファクトにアップロード → デプロイ
- `next.config.mjs` の `output: "export"` で静的エクスポート。`images.unoptimized: true` は Pages で画像最適化サーバーが無いため
- ユーザーサイト形式 (`<user>.github.io`) のため `basePath` は不要

### デプロイが失敗した場合のチェック
1. `package-lock.json` が更新されていて、`npm ci` が通るか
2. `next build` がローカルで成功するか
3. 新しい静的パス追加時に `generateStaticParams` が抜けていないか(App Router 動的ルート使用時)

## 参考

- [Next.js 静的エクスポート](https://nextjs.org/docs/app/guides/static-exports)
- [Pokémon Showdown data](https://github.com/smogon/pokemon-showdown/tree/master/data) — ポケモン / 技データの出典
- 第6世代以降のダメージ式は 4096 ベース補正。本プロジェクトは表示用途で浮動小数のまま積算しているが、精度差が問題になった際は `domain/damage.ts` の `chain()` を丸め版に差し替える余地がある
