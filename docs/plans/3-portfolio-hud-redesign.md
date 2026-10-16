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
| 編集ファイル | `components/Home.jsx`（HUD構造、ナビ、作品・技術・連絡先）、`components/Home.module.css`（デスクトップ／モバイル表示）、`app/globals.css`（全体色・基礎スタイル）、`locales/ja.json`・`locales/en.json`（文言・作品紹介）、`tests/e2e/portfolio.spec.js`（受け入れE2E）、`CLAUDE.md`（画面構造・スタイル規約）、`docs/plans/CONTENTS.md`（本計画の索引）。 |
| テストケース | E2E: 日本語と英語それぞれで主要情報・セクションが表示される。E2E: PainRecorderを表示せずDPSCalculatorを表示し、既存作品のリンクを維持する。E2E: 研究にイベントカメラとLLMを表示しSwallow公式ページへリンクする。E2E: `ota.k.5051`のメールを表示せず、残りのメール・LinkedIn・GitHubを表示する。E2E: Tab/Enterでセクションナビとリンクを操作できる。E2E: 390px幅とデスクトップ幅で横スクロールや主要情報の欠落がない。 |
| 完了条件 | HUDの主要情報を日本語／英語で表示し、指定された連絡先・作品・研究テーマを満たす。新設E2Eが失敗状態から通り、ビルドとCONTENTS検査が成功する。 |

## Phase 2 — ブロックキャラクターの演出

| 項目 | 記入内容 |
| --- | --- |
| 目的 | ブロック型キャラクターがプロフィールを短く紹介し、ナビゲーション操作に控えめに反応する。 |
| 意図 | 遊び心を加えながら、読み込みや操作を待たせず、動きを望まない利用者にも配慮する。 |
| 編集ファイル | `components/Home.jsx`（キャラクターと選択中セクションの状態・意味付け）、`components/Home.module.css`（登場・待機・反応アニメーションと`prefers-reduced-motion`）、`tests/e2e/portfolio.spec.js`（表示即時性・操作反応・動き軽減のE2E）、必要な場合のみ `components/CONTENTS.md` を更新。 |
| テストケース | E2E: ページ読込直後から主要見出し・操作が利用可能で、キャラクター演出の終了を待たない。E2E: 通常設定ではキャラクターの短い登場／反応演出がある。E2E: `prefers-reduced-motion: reduce`では動きが抑制されても紹介文とナビが利用できる。E2E: マウス・キーボードのナビ操作後も選択先と表示内容が一致する。 |
| 完了条件 | 演出が非ブロッキングで、動きの軽減設定に対応する。追加E2Eとビルド、CONTENTS検査が成功する。 |

## Phase N — 最終検証・分野別レビュー

| 項目 | 記入内容 |
| --- | --- |
| 目的・意図 | 全受け入れ条件、実装と説明の一致、応答性とアクセシビリティを確認し、変更前に合意した比較基点からの差分をレビューする。 |
| テストケース | `npm run build`、`npm run test:e2e`、CONTENTS checkerを実行。E2Eで日本語／英語、表示リンク、キーボード、通常／動き軽減、390px／1440px幅を確認する。未実施項目は理由と範囲を記録する。 |
| レビュー分野 | frontend／backend／テストケース／md記入漏れ／docs記入漏れ／規約違反／セキュリティをそれぞれ別のサブエージェントが読み取り専用で確認する。 |
| 完了条件 | 全検証と7分野レビューを記録する。指摘修正は一覧を示してユーザー承認後、修正phaseを挿入してTDD・commitし、7分野レビューと全体検証を再実行する。修正がなくユーザーが最終了承したらPhase Nをcommitし、その後push、Issue計画コメント更新、PR作成へ進む。 |

## Phase checklist

- [ ] Phase 0：調査・計画をローカルとIssueコメントに記録し、commitする。
- [ ] Phase 1：HUD画面・掲載情報を実装し、E2EとCONTENTS検査を通してcommitする。
- [ ] Phase 2：キャラクター演出・動きの軽減対応を実装し、E2EとCONTENTS検査を通してcommitする。
- [ ] Phase N：全体検証・7分野レビュー・ユーザー最終了承を完了する。

## Execution log

| Phase | Result | Commit SHA | Issue plan updated |
| --- | --- | --- | --- |
| 0 | In progress | Pending | Pending |
| 1 | Pending | Pending | Pending |
| 2 | Pending | Pending | Pending |
| N | Pending | Pending | Pending |
