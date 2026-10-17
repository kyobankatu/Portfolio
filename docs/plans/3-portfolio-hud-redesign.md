# Issue #3: ポートフォリオHUD刷新

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
| 目的 | ブロック型キャラクターが現在のセクションを短く紹介し、ナビゲーション操作に控えめに反応する。 |
| 意図 | 遊び心を加えながら、読み込みや操作を待たせず、動きを望まない利用者にも配慮する。 |
| 編集ファイル | `components/Home.jsx`（選択セクションと紹介文の状態）、`components/Home.module.css`（短い登場・待機・反応アニメーションと`prefers-reduced-motion`）、`components/portfolioContent.js`（セクション選択状態の安全な判定）、`locales/ja.json`・`locales/en.json`（紹介文）、`tests/unit/portfolioContent.test.js`（有効・未知section id）、`tests/integration/Home.test.jsx`（選択状態と紹介表示）、`tests/e2e/portfolio.spec.js`（即時表示・操作反応・動き軽減）、必要な場合のみ`components/CONTENTS.md`を更新。 |
| テストケース | **単体**: 正常系—有効なsection idで選択状態と紹介文を更新する。異常系—未知のidでは既存の選択状態を保ち、紹介文も空にしない。**結合**: 正常系—目次クリックで`aria-current`・対象セクション・キャラクター紹介が一致する。異常系—未知のhashでも画面と既存の目次操作が使える。**E2E**: `/`読込後に主要見出しとナビが即時に表示され、演出の終了を待たない。通常設定では短い登場・待機演出、`prefers-reduced-motion: reduce`ではアニメーションなしで紹介・操作可能。目次クリックとTab/Enterで対応する紹介へ切り替わる。 |
| 完了条件 | 演出が非ブロッキングで、動きの軽減設定に対応する。追加E2Eとビルド、CONTENTS検査が成功する。 |

## Phase N — 最終検証・分野別レビュー

| 項目 | 記入内容 |
| --- | --- |
| 目的・意図 | 全受け入れ条件、実装と説明の一致、応答性とアクセシビリティを確認し、合意した比較基点からの差分をレビューする。 |
| テストケース | npm run test:unit、npm run build、npm run test:e2e、python -B -m unittest discover -s tests/deploy -v、npm audit、npm audit --omit=dev、CONTENTS checkerを実行する。E2Eで日本語／英語、リンク、キーボード、動きの軽減、390px／1440px幅を確認する。未実施項目は理由と範囲を記録する。 |
| レビュー分野 | frontend／backend／テストケース／md記入漏れ／docs記入漏れ／規約違反／セキュリティを別々のサブエージェントが読み取り専用で確認する。 |
| 完了条件 | 全体検証と7分野レビューが完了し、修正があれば承認済みの修正ラウンドと全分野の再レビューを終えて、ユーザーが最終成果を了承する。レビュー・修正の詳細は初期計画へ差し込まず、Issueの後続コメントに記録する。 |

## レビューと修正の記録

| 記録 | 結果 | Issueコメント | 関連コミット |
| --- | --- | --- | --- |
| 第1回レビュー — 指摘 | 8件を確認。すべてユーザー承認済み。 | [レビュー結果](https://github.com/kyobankatu/Portfolio/issues/3#issuecomment-6217564914) | — |
| 第1回修正 — 実装と検証 | ナビ・テスト・CI、依存・文書の修正完了。 | [修正計画と結果](https://github.com/kyobankatu/Portfolio/issues/3#issuecomment-6217567477) | 39458b9, 01327bb |
| 第2回レビュー — 文書状態 | 計画書に残った古い承認待ち表記を修正。 | [指摘と対応](https://github.com/kyobankatu/Portfolio/issues/3#issuecomment-6217569927) | 56da43e, 9d3a43f |
| 最終再レビュー | 9d3a43fを7分野で確認し、追加指摘なし。その後、ユーザー最終了承済み。Phase N完了。 | [最終レビュー](https://github.com/kyobankatu/Portfolio/issues/3#issuecomment-6217571535) | 0652aa7 |
| Copilot指摘修正・再レビュー | 文書lang同期、計画状態の整合、Issue計画の改行復元を完了。7分野再レビュー済み。追加P3提案2件は未承認のため未変更。 | [修正計画](https://github.com/kyobankatu/Portfolio/issues/3#issuecomment-6218203427)、[修正結果・再レビュー](https://github.com/kyobankatu/Portfolio/issues/3#issuecomment-6218302247) | 22cd330 |

**Issue運用**：Phase Nのレビュー結果、承認された修正計画、修正結果、再レビュー結果は、それぞれ新しいIssueコメントとして時系列に記録する。初期計画にはこの一覧とコメントへのリンクだけを残す。Phase Nはユーザーの最終了承後に完了とする。

## Phaseチェックリスト

- [x] Phase 0：調査・計画をローカルとIssueコメントに記録し、commitする。
- [x] Phase 1：HUD画面・掲載情報を実装し、単体／結合／E2E、ビルドとCONTENTS検査を通してcommitする。
- [x] Phase 2：キャラクター演出・動きの軽減対応を実装し、単体／結合／E2E、ビルドとCONTENTS検査を通してcommitする。
- [x] Phase N：全体検証・7分野レビュー・ユーザー最終了承を完了する。

## 実行記録

| Phase | 結果 | コミットSHA | Issue計画更新 |
| --- | --- | --- | --- |
| 0 | 完了 | d6bb27e45ac75c014b1924ba86fe4e1351f7cc16 | 済 ([初期計画](https://github.com/kyobankatu/Portfolio/issues/3#issuecomment-6216410535)) |
| 1 | 完了。単体／結合テスト8件、Chromium E2E 3件、本番ビルド、CONTENTS検査が成功 | 8d1e81c | 済 |
| 2 | 完了。単体／結合テスト10件、Chromium E2E 4件、本番ビルド、CONTENTS検査が成功 | ee9c092 | 済 |
| N | 完了。7分野の最終レビューで指摘なし。全検証成功、ユーザー最終了承済み | 0652aa7、0b11038 | 済 |
