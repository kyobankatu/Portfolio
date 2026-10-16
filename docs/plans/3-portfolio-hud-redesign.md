# Issue #3: Portfolio HUD redesign

## Phase 0 — 調査・計画

| 項目 | 記入内容 |
| --- | --- |
| 目的・意図 | 現行の単一ページ構成と表示情報、E2E境界を確認し、HUD型デザインとキャラクター演出を独立した縦方向の機能単位に分ける。 |
| 必要リソース・未確認事項 | Next.js 15 / React 19、CSS Modules、ja/en JSON、Playwright Chromium E2Eを確認済み。Swallowは公式日本語ページへリンクする。掲載する作品は現行一覧を維持し、PainRecorderをDPSCalculatorに置き換える。 |
| 作業情報 | Issue: https://github.com/kyobankatu/Portfolio/issues/3 ／ 作業方式: 現チェックアウトから新ブランチ ／ Branch: `3-portfolio-hud-redesign` ／ PR base: `master` ／ 比較基点: `origin/master` `f485dfb4a61071dfef76249fcd77708664bc7945` ／ 作業開始HEAD: `988f3ff0ff0f49937105fb7bc86dd41f5fb3a11d` |
| テスト境界 | 合意済み。production buildをChromiumで開くE2Eを公開画面の境界として、掲載内容・リンク・キーボード操作・動きの軽減設定・デスクトップ／モバイル表示を確認する。外部リンク先の可用性や支援技術ごとの読み上げ品質は自動E2Eでは保証しない。 |
| CONTENTS検査 | `python C:\develop\shared\skills\contents\scripts\check_contents.py <repo> --exclude .claude --exclude test-results --exclude tmp --json`。`.claude`、生成された`test-results`、試作置場`tmp`はローカル専用として除外する。初回検査は15ディレクトリ、指摘なし。 |
| 基準検証 | `npm run build` 成功。`npm run test:e2e` 成功（3件）。`next start` がstandalone構成に関する警告を出すが、既存E2Eは完了している。 |
| 完了条件 | 調査結果と全phaseの目的・意図・編集ファイル・テストケース・完了条件をこの計画書とIssueコメントに記録し、Phase 0をcommitする。 |

## Phase 1 — HUD画面と掲載情報

| 項目 | 記入内容 |
| --- | --- |
| 目的 | 現行ポートフォリオを読みやすいHUD型アーケード画面へ刷新し、プロフィール・研究・作品・技術・ゲームへの興味・連絡先を日本語／英語で掲載する。 |
| 意図 | 配色、余白、タイポグラフィ、セクション構成を統一し、ゲーム風の見た目でも作品と本人の情報をすぐ把握できるようにする。 |
| 編集ファイル | `components/Home.jsx`（HUD構造と操作）、`components/Home.module.css`（デスクトップ／モバイル表示）、`components/portfolioContent.js`（作品・技術データと検証）、`app/globals.css`（全体色・基礎スタイル）、`app/layout.js`（タイトル・説明）、`locales/ja.json`・`locales/en.json`（文言・作品紹介）、`tests/unit/portfolioContent.test.js`（データ単体テスト）、`tests/integration/Home.test.jsx`（React画面結合テスト）、`tests/e2e/portfolio.spec.js`（本番画面E2E）、`tests/setup.js`・`vitest.config.js`（テスト設定）、`package.json`・`package-lock.json`（テストコマンドと依存）、ルート・`components/`・`tests/`各階層と`tests/unit/`・`tests/integration/`・`tests/e2e/`の`CONTENTS.md`、`CLAUDE.md`（開発案内）。 |
| テストケース | **単体**: 正常系—ja/enの辞書から全作品説明を組み立て、DPSCalculatorの説明・GitHub・公開URLを返す。異常系—必須説明が欠落・空文字なら作品キーを含むエラーを返す。**結合**: 正常系—Homeをrenderし、EN切替で見出し・研究内容・作品説明が英語になり、目次リンクのhref・選択状態・対象セクションが結び付く。異常系—不完全な辞書を注入した場合に欠落項目が明示され、`undefined`を画面に出さない。**E2E**: 本番ビルドで日本語／英語、作品・連絡先、Swallowリンク、実hash遷移を含むTab/Enter操作、390px／1440px表示を確認し、404ルートも維持する。 |
| 完了条件 | HUDの主要情報を日本語／英語で表示し、指定された連絡先・作品・研究テーマを満たす。`npm run test:unit`、本番E2E、ビルドとCONTENTS検査が成功する。 |

## Phase 2 — ブロックキャラクターの演出

| 項目 | 記入内容 |
| --- | --- |
| 目的 | ブロック型キャラクターがプロフィールを短く紹介し、ナビゲーション操作に控えめに反応する。 |
| 意図 | 遊び心を加えながら、読み込みや操作を待たせず、動きを望まない利用者にも配慮する。 |
| 編集ファイル | `components/Home.jsx`（キャラクターと選択中セクションの状態・意味付け）、`components/Home.module.css`（登場・待機・反応アニメーションと`prefers-reduced-motion`）、`tests/integration/Home.test.jsx`（選択状態と表示の結合ケース）、`tests/e2e/portfolio.spec.js`（即時表示・操作反応・動き軽減）、必要な場合のみ `components/CONTENTS.md` を更新。 |
| テストケース | **単体**: 正常系—有効なsection idで選択状態を更新する。異常系—未知のidでは既存の選択状態を保つ。**結合**: 正常系—目次クリックでhash・`aria-current`・紹介表示が一致する。異常系—対象セクションがDOMにない場合でも操作が例外を起こさず、他の目次が使える。**E2E**: `/`読込後に主要見出しとナビが即時に表示され、キャラクター演出の終了を待たない。通常設定では短い登場・待機演出、`prefers-reduced-motion: reduce`では動きなしで紹介・操作可能、マウス／Tab/Enterの選択後に対応セクションとキャラクター反応が一致する。 |
| 完了条件 | 演出が非ブロッキングで、動きの軽減設定に対応する。追加E2Eとビルド、CONTENTS検査が成功する。 |

## Phase N — 最終検証・分野別レビュー

| 項目 | 記入内容 |
| --- | --- |
| 目的・意図 | 全受け入れ条件、実装と説明の一致、応答性とアクセシビリティを確認し、変更前に合意した比較基点からの差分をレビューする。 |
| テストケース | `npm run test:unit`、`npm run build`、`npm run test:e2e`、`npm audit --omit=dev`、CONTENTS checkerを実行する。E2Eで日本語／英語、表示リンク、キーボード、通常／動き軽減、390px／1440px幅を確認する。依存監査の指摘はセキュリティレビューで影響を確認し、修正が必要なら変更一覧を提示して承諾後に修正phaseを挿入する。未実施項目は理由と範囲を記録する。 |
| レビュー分野 | frontend／backend／テストケース／md記入漏れ／docs記入漏れ／規約違反／セキュリティをそれぞれ別のサブエージェントが読み取り専用で確認する。 |
| 完了条件 | 全検証と7分野レビューを記録する。指摘修正は一覧を示してユーザー承認後、修正phaseを挿入してTDD・commitし、7分野レビューと全体検証を再実行する。修正がなくユーザーが最終了承したらPhase Nをcommitし、その後push、Issue計画コメント更新、PR作成へ進む。 |

## Phase checklist

- [x] Phase 0：調査・計画をローカルとIssueコメントに記録し、commitする。
- [x] Phase 1：HUD画面・掲載情報を実装し、単体／結合／E2E、ビルドとCONTENTS検査を通してcommitする。
- [ ] Phase 2：キャラクター演出・動きの軽減対応を実装し、E2EとCONTENTS検査を通してcommitする。
- [ ] Phase N：全体検証・7分野レビュー・ユーザー最終了承を完了する。

## Execution log

| Phase | Result | Commit SHA | Issue plan updated |
| --- | --- | --- | --- |
| 0 | Complete | `d6bb27e45ac75c014b1924ba86fe4e1351f7cc16` | Yes ([Issue comment](https://github.com/kyobankatu/Portfolio/issues/3#issuecomment-6216410535)) |
| 1 | Complete; 8 unit/integration cases, 3 Chromium E2E cases, production build, and CONTENTS checker passed | Pending SHA | Yes, pending final commit SHA |
| 2 | Pending | Pending | Pending |
| N | Pending | Pending | Pending |
