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
| 目的 | ブロック型キャラクターが現在のセクションを短く紹介し、ナビゲーション操作に控えめに反応する。 |
| 意図 | 遊び心を加えながら、読み込みや操作を待たせず、動きを望まない利用者にも配慮する。 |
| 編集ファイル | `components/Home.jsx`（選択セクションと紹介文の状態）、`components/Home.module.css`（短い登場・待機・反応アニメーションと`prefers-reduced-motion`）、`components/portfolioContent.js`（セクション選択状態の安全な判定）、`locales/ja.json`・`locales/en.json`（紹介文）、`tests/unit/portfolioContent.test.js`（有効・未知section id）、`tests/integration/Home.test.jsx`（選択状態と紹介表示）、`tests/e2e/portfolio.spec.js`（即時表示・操作反応・動き軽減）、必要な場合のみ`components/CONTENTS.md`を更新。 |
| テストケース | **単体**: 正常系—有効なsection idで選択状態と紹介文を更新する。異常系—未知のidでは既存の選択状態を保ち、紹介文も空にしない。**結合**: 正常系—目次クリックで`aria-current`・対象セクション・キャラクター紹介が一致する。異常系—未知のhashでも画面と既存の目次操作が使える。**E2E**: `/`読込後に主要見出しとナビが即時に表示され、演出の終了を待たない。通常設定では短い登場・待機演出、`prefers-reduced-motion: reduce`ではアニメーションなしで紹介・操作可能。目次クリックとTab/Enterで対応する紹介へ切り替わる。 |
| 完了条件 | 演出が非ブロッキングで、動きの軽減設定に対応する。追加E2Eとビルド、CONTENTS検査が成功する。 |

## Phase 3 — ナビゲーション同期・テスト・CIゲート

| 項目 | 記入内容 |
| --- | --- |
| 目的 | URL hash、選択中セクション、キャラクター紹介を直接アクセス・履歴操作でも同期させ、テストの検証力とCIゲートを補強する。 |
| 意図 | 実際の日本語／英語本文、キーボード操作、戻る／進むを検査し、単体・結合テストの失敗が公開を止めるようにする。 |
| 編集ファイル | `components/Home.jsx`（初期hashと`hashchange`同期）、`tests/integration/Home.test.jsx`（日英の研究・作品本文、初期hashと未知hash）、`tests/e2e/portfolio.spec.js`（目次Tab/Enter、hash履歴）、`.github/workflows/ci.yml`（`npm run test:unit`をverifyへ追加）。 |
| テストケース | **単体**: 有効hashは選択状態を解決し、未知idは有効な現在値を維持する。**結合**: 正常系—日英切替で研究・DPSCalculator本文が各辞書と一致し、hash初期表示とナビ紹介が同期する。異常系—未知hashでも現在の画面が使え、`undefined`を表示しない。**E2E**: Tabで目次項目へ進みEnterでhash・`aria-current`・紹介が更新される。直リンク・再読込・戻る／進むで状態が一致する。CI verifyで単体・結合テスト失敗がpublishを止める。 |
| 完了条件 | 単体／結合／E2E、本番build、workflow検証、CONTENTS検査が成功する。 |

## Phase 4 — 依存セキュリティ・開発文書整備

| 項目 | 記入内容 |
| --- | --- |
| 目的 | CIのNode 22環境と互換性を保って指摘された依存を更新し、既存開発規約と文書索引を実態に合わせる。 |
| 意図 | audit指摘を減らしつつproduction build・テストを維持する。開発規約の内容を保ち、翻訳対象と固定HUD表記を区別する。 |
| 編集ファイル | `package.json`・`package-lock.json`（Next.js、sharp、PostCSS、Vitest系依存）、`CLAUDE.md`（既存規約を維持してCommands／Architecture／Stylingを更新）、ルート`CONTENTS.md`（lockfile生成元リンク）。 |
| テストケース | **単体・結合・E2E**: 依存更新後も全ケースが通る。**Security**: `npm audit`と`npm audit --omit=dev`で残存指摘を確認し、残る場合は実行経路と理由を記録する。**Docs**: CONTENTS checkerが全対象ディレクトリで成功し、開発規約・locale記述が現行実装と一致する。 |
| 完了条件 | Node 22互換、audit結果の記録、単体／結合／E2E、本番build、CONTENTS検査が成功する。 |

## Phase N — 最終検証・分野別レビュー

| 項目 | 記入内容 |
| --- | --- |
| 目的・意図 | 全受け入れ条件、実装と説明の一致、応答性とアクセシビリティを確認し、変更前に合意した比較基点からの差分をレビューする。 |
| テストケース | `npm run test:unit`、`npm run build`、`npm run test:e2e`、`python -B -m unittest discover -s tests/deploy -v`、`npm audit --omit=dev`、CONTENTS checkerを実行する。E2Eで日本語／英語、表示リンク、キーボード、通常／動き軽減、390px／1440px幅を確認する。依存監査の指摘はセキュリティレビューで影響を確認し、修正が必要なら変更一覧を提示して承諾後に修正phaseを挿入する。未実施項目は理由と範囲を記録する。 |
| レビュー分野 | frontend／backend／テストケース／md記入漏れ／docs記入漏れ／規約違反／セキュリティをそれぞれ別のサブエージェントが読み取り専用で確認する。 |
| 完了条件 | 全検証と7分野レビューを記録する。指摘修正は一覧を示してユーザー承認後、修正phaseを挿入してTDD・commitし、7分野レビューと全体検証を再実行する。修正がなくユーザーが最終了承したらPhase Nをcommitし、その後push、Issue計画コメント更新、PR作成へ進む。 |

## Phase N review findings — user approved; repairs inserted into Phases 3 and 4

| 優先度 | 分野・箇所 | 指摘と提案する修正 |
| --- | --- | --- |
| P2 | Frontend: `components/Home.jsx` | `activeSection`はクリック時のみ変わるため、有効hashへの直接アクセス・再読込・戻る／進むでナビ選択とキャラクター紹介がURLとずれる。初期hashと`hashchange`を同期し、未知hashでは有効な現在値を保つ。ブラウザ履歴のE2Eを追加する。 |
| P2 | Tests: `tests/integration/Home.test.jsx`, `tests/e2e/portfolio.spec.js` | 英語切替テストが固定見出し・DPSCalculatorタイトル・Swallow URLしか確認せず、研究／作品説明が日本語のままでも通る。翻訳本文を両言語で検証する。E2EのTab/Enterは`#overview`までなので、目次へキーボード移動してhash・`aria-current`・紹介文が更新されるケースを追加する。 |
| P2 | CI: `.github/workflows/ci.yml` | `npm run test:unit`がverifyジョブで実行されず、新設単体・結合テストがmaster公開前のゲートになっていない。verifyに追加し、テスト失敗がpublishを止めることを検証する。 |
| P2 | Security: `package.json`, `package-lock.json` | 今回追加したVitest 3.2.7系に開発依存の監査指摘がある。Node 22 CIと互換の修正版へ更新し、全依存audit・テスト・ビルド・E2Eを再実行する。 |
| P2 | Security: `package-lock.json` | 作業開始時から存在するNext.js 15.5.13、PostCSS 8.4.31、sharp 0.34.5に本番依存auditのcritical 1件・high 2件が報告された。現在の静的portfolioに該当する攻撃入力経路はレビューで確認されていないが、修正版と互換性を検証して更新する。 |
| P2 | Docs/rules: `CLAUDE.md` | 開発案内の更新時に既存のMandatory Rules、変更前確認、Security Rules、Notationなどを削除した。既存ルールを戻し、必要なArchitecture／Commands／Styling記述のみ更新する。 |
| P3 | Docs: `CLAUDE.md` | locale JSONに全表示文言を置くという記述が、Home.jsx内の意図的な固定HUD見出し・ラベルと合わない。翻訳対象の文章と固定表記の範囲を区別する。 |
| P3 | CONTENTS: `CONTENTS.md` | `package-lock.json`の生成元である`package.json`へのリンクがない。生成元リンクを戻す。 |

これらの修正はユーザー承認待ち。レビューでは公開画面の直接的なXSS・秘密情報漏洩・不正な外部リンクは見つからなかった。 |

## Phase checklist

- [x] Phase 0：調査・計画をローカルとIssueコメントに記録し、commitする。
- [x] Phase 1：HUD画面・掲載情報を実装し、単体／結合／E2E、ビルドとCONTENTS検査を通してcommitする。
- [x] Phase 2：キャラクター演出・動きの軽減対応を実装し、単体／結合／E2E、ビルドとCONTENTS検査を通してcommitする。
- [x] Phase 3：hash同期・翻訳／キーボード検証・CIゲートを追加し、全テストとCONTENTS検査を通してcommitする。
- [ ] Phase 4：承認済み依存・文書修正を行い、audit・全テスト・CONTENTS検査を通してcommitする。
- [ ] Phase N：全体検証・修正後の7分野レビュー・ユーザー最終了承を完了する。

## Execution log

| Phase | Result | Commit SHA | Issue plan updated |
| --- | --- | --- | --- |
| 0 | Complete | `d6bb27e45ac75c014b1924ba86fe4e1351f7cc16` | Yes ([Issue comment](https://github.com/kyobankatu/Portfolio/issues/3#issuecomment-6216410535)) |
| 1 | Complete; 8 unit/integration cases, 3 Chromium E2E cases, production build, and CONTENTS checker passed | `8d1e81c` | Yes |
| 2 | Complete; 10 unit/integration cases, 4 Chromium E2E cases, production build, and CONTENTS checker passed | `ee9c092` | Yes |
| 3 | Complete; 12 unit/integration cases, 6 Chromium E2E cases, build, deployment tests, and CONTENTS checker passed; CI verify now runs `test:unit` | Pending SHA | Yes, pending final commit SHA |
| 4 | Pending | Pending | Pending |
| N | Pending re-review after correction phases | Pending | Pending |
