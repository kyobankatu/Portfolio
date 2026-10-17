# Issue #5: ポートフォリオにPhysics Toss演出を追加

## 合意した操作仕様

- 通常表示ではPhysics Tossを無効にし、ボタンを押した場合だけ有効にする。
- セクションの余白を掴むとセクション全体、見出し・段落・カードを掴むと個別の文章ブロックを動かす。文字は一字ずつ分割しない。
- 物理領域は画面全体とし、サイドバーを含めて対象同士に当たり判定を設ける。重力、投げる速度、画面端と床の衝突を扱う。
- モード解除時は物理演算を止めて元の配置へ戻す。専用リセットボタンも設ける。
- Spaceで掴む／離す、矢印キーで移動する。`prefers-reduced-motion`では慣性を止めるが、直接操作は残す。
- 既存リンクとナビゲーションを維持する。本番ChromiumでPCとモバイルの表示・操作を確認する。

## Phase 0 — 調査・計画

| 項目 | 記入内容 |
| --- | --- |
| 目的・意図 | 既存のHUDページ構造と一時試作を調査し、通常閲覧を保ったままPhysics Tossを段階導入できるよう、物理モード、対象選択、アクセシビリティを別phaseに分ける。 |
| 必要リソース・未確認事項 | Next.js 15 / React 19、CSS Modules、Vitest、Testing Library、production Chromium E2Eを確認済み。既存の本番依存に物理エンジンはない。`tmp/content-effects-runtime.js`の試作は作品カードだけを個別に動かし、対象同士の衝突は扱わないため、要求を満たすには衝突計算を追加する必要がある。[Matter.js公式API資料](https://brm.io/matter-js/docs/index.html)は2D剛体・衝突・Runnerを提供しているため候補とし、実装phaseでバンドル影響、クライアント限定ロード、ライセンス、脆弱性を確認する。全画面の多数DOM対象を同期する際の負荷とスクロール・リサイズ時の境界再計算をPhase 1〜3で計測・検証する。 |
| 作業情報 | Issue: https://github.com/kyobankatu/Portfolio/issues/5 ／ 作業方式: 現チェックアウトから新ブランチ ／ Branch: `5-physics-toss` ／ PR base: `master` ／ 比較基点: `origin/master` `ba5bc7d765c4ed5ef4681c619de39ec83db6603a` ／ 作業開始HEAD: `ba5bc7d765c4ed5ef4681c619de39ec83db6603a`。`.gitignore`の既存ローカル変更はこの作業に含めない。 |
| テスト境界 | 合意済み。本番ビルドをChromiumで開き、通常時の無効状態、トグル、セクション／文章ブロックのドラッグ、重力・対象同士の衝突・画面端／床、リセット、リンク維持、Space／矢印キー、`prefers-reduced-motion`、PC／モバイルを確認する。単体テストでは物理状態遷移・境界・リセット・不正入力、結合テストではDOM対象選択・イベントとリンクの共存を補う。 |
| CONTENTS検査 | 各phaseで`contents` skillの手順に従い、変更した階層の`CONTENTS.md`を更新してから次の検査を実行する: `python C:\develop\shared\skills\contents\scripts\check_contents.py C:\develop\WebApp\Portfolio --exclude .claude --exclude test-results --exclude playwright-report --exclude tmp`。`.claude`、生成物、試作`tmp`はローカル専用として除外する。Phase 0整備後に実行し、結果を記録する。 |
| 完了条件 | Issue本文・計画コメント・ローカル計画に合意した範囲と全phaseの目的・意図・編集ファイル・テストケース・完了条件が揃い、Phase 0をcommitする。 |

## Phase 1 — Physics Tossの起動とセクション物理

| 項目 | 記入内容 |
| --- | --- |
| 目的 | 初期オフのPhysics Tossボタンとリセットを追加し、オンにするとセクションを掴んで投げられる最小の物理動作を実装する。対象は掴むまで静止させ、操作した対象から物理演算を始める。 |
| 意図 | まずモードの開始・停止・復元と物理エンジンのライフサイクルを固め、通常閲覧への影響を分離する。 |
| 編集ファイル | `components/Home.jsx`（Physics Toss／Reset操作とモード状態）、`components/Home.module.css`（操作部と有効時の視覚状態）、`components/physicsTossController.js`（Matter.jsエンジン、DOM同期、境界・クリーンアップ）、`locales/ja.json`・`locales/en.json`（操作ラベル）、`package.json`・`package-lock.json`（物理依存）、`components/CONTENTS.md`・`tests/unit/CONTENTS.md`・`tests/integration/CONTENTS.md`・`tests/e2e/CONTENTS.md`（索引）、`tests/unit/physicsTossController.test.js`、`tests/integration/Home.test.jsx`、`tests/e2e/portfolio.spec.js`。 |
| テストケース | **単体**: 正常系—対象は掴むまで静止し、投げると重力で移動し、床に留まり、リセットで初期位置へ復元する。異常系—無効な寸法や破棄済みcontrollerへの操作で例外・RAFリークを起こさず、対象内リンクからドラッグを開始しない。**結合**: 初期オフでは通常レイアウト、オンで操作可能、オフで停止・復元、Resetで個別に復元する。**E2E**: 本番画面で初期オフを確認し、PCでセクションをドラッグして投げて移動を確認する。リンク・ナビゲーションは通常どおり操作でき、Resetは有効化時の配置、解除は通常配置に戻す。床境界は単体で検証し、対象同士の衝突はPhase 2でE2Eを含めて検証する。 |
| 完了条件 | Physics Tossの開始・停止・リセットが機能し、通常時にアニメーションや物理エンジンが走らない。単体／結合／E2E、build、CONTENTS検査が成功しcommitする。 |

## Phase 2 — 文章ブロックとサイドバーの衝突

| 項目 | 記入内容 |
| --- | --- |
| 目的 | 見出し・段落・カード・サイドバーの対象を個別の物理オブジェクトとして登録し、対象同士の当たり判定を実装する。セクション余白からはセクション全体を掴めるようにする。 |
| 意図 | セクション単位から粒度を広げ、ユーザーが選んだヒット領域の優先順位を定義する。子要素を掴んだ時に親セクションを同時操作しないようにする。 |
| 編集ファイル | `components/Home.jsx`（セクション・文章・カード・サイドバーの対象登録、入れ子のヒット判定）、`components/physicsTossController.js`（複数body登録、ドラッグ制約、衝突、DOM位置同期）、`components/Home.module.css`（hitbox・掴み状態）、`components/CONTENTS.md`、`tests/unit/physicsTossController.test.js`、`tests/integration/Home.test.jsx`、`tests/e2e/portfolio.spec.js`、関連する`tests/**/CONTENTS.md`。 |
| テストケース | **単体**: 正常系—異なるサイズの対象が重力で落下し、対象同士・壁・床で重ならず衝突する。子要素からのhit testは子だけを選び、余白からは親sectionを選ぶ。異常系—対象が消えた場合やpointercancel時に掴み状態・listener・bodyを残さない。**結合**: 段落・project card・sidebar項目を個別に動かし、section操作と競合しない。リンク上のpointerdownはドラッグを開始せずリンク遷移を維持する。**E2E**: PCでsectionと複数種類の文章ブロックを投げ、サイドバーを含む対象同士が衝突する。境界内に留まり、カード内リンク・ナビゲーションが動作する。ドラッグ中のpointercancel後も次の操作が可能。 |
| 完了条件 | 合意した対象と粒度で画面全体の物理挙動が動作し、ナビ・リンクが維持される。衝突・入れ子hit test・キャンセルの各検証、build、CONTENTS検査が成功しcommitする。 |

## Phase 3 — キーボード・動きの軽減・モバイル対応

| 項目 | 記入内容 |
| --- | --- |
| 目的 | Physics Tossをポインター以外からも操作できるようにし、動きを減らす設定と画面サイズ変化に対応する。 |
| 意図 | 遊びの操作性を保ちながら、アクセシビリティと実画面での安定性を最終段階に仕上げる。 |
| 編集ファイル | `components/Home.jsx`（Space／矢印キー、状態のARIA通知）、`components/Home.module.css`（focus、reduced-motion、touch affordance）、`components/physicsTossController.js`（キーボード移動、慣性停止、resize／scroll境界更新）、`locales/ja.json`・`locales/en.json`（操作説明と状態ラベル）、`components/CONTENTS.md`・`locales/CONTENTS.md`、`tests/unit/physicsTossController.test.js`、`tests/integration/Home.test.jsx`、`tests/e2e/portfolio.spec.js`、関連する`tests/**/CONTENTS.md`、必要なら`CLAUDE.md`（新しい操作規約）。 |
| テストケース | **単体**: 正常系—キー入力で掴む・移動・離すと状態が変わる。動きを減らす設定では投げた後の慣性・連続自動更新を停止する。異常系—無効キー、フォーカス外、解除後の入力は状態を壊さない。**結合**: Space／矢印操作、reduced-motion時の直接移動、ARIA状態、resize後の境界が同期し、リンク・ナビのキーボード操作を妨げない。**E2E**: PCと390px幅のChromiumでキー操作とタッチ相当のドラッグ、重力・衝突・床・Reset、通常リンクを確認する。`prefers-reduced-motion: reduce`では慣性が止まり、直接操作とResetは可能。通常オフでは常時アニメーションがない。 |
| 完了条件 | PC・モバイルで操作でき、動きを減らす設定に対応し、E2E・単体／結合テスト・build・CONTENTS検査が成功してcommitする。 |

## Phase N — 最終検証・分野別レビュー

| 項目 | 記入内容 |
| --- | --- |
| 目的・意図 | 全画面物理演算、通常閲覧、アクセシビリティ、応答性、説明と実装の一致を比較基点からレビューする。 |
| 編集ファイル | 最終レビューで修正が承認された場合に限り、該当する実装・テスト・ドキュメントと各階層の`CONTENTS.md`を編集する。計画・レビュー結果は本ファイルとIssue後続コメントに記録する。 |
| テストケース | `npm run test:unit`、production build、`npm run test:e2e`、`npm audit`、`npm audit --omit=dev`、CONTENTS skillのchecker。E2Eで通常／Physics Toss、section／block／sidebar、衝突、床、Reset、キーボード、リンク、reduced-motion、PC／モバイルを再確認する。未実施項目は理由・代替・未検証範囲を記録する。 |
| レビュー分野 | frontend／backend／テストケース／md記入漏れ／docs記入漏れ／規約違反／セキュリティを別々のサブエージェントが読み取り専用でレビューする。 |
| 完了条件 | 全検証と7分野レビュー、必要な承認済み修正ラウンドが完了し、ユーザーが最終成果を了承する。詳細はIssue後続コメントで記録する。 |

## Phaseチェックリスト

- [x] Phase 0：調査・計画をIssueとローカルに記録し、CONTENTS検査を通してcommitする。
- [x] Phase 1：Physics Tossの起動・停止・セクション物理を実装し、単体／結合／E2E、build、CONTENTS検査を通してcommitする。
- [ ] Phase 2：文章ブロック・サイドバーの物理と衝突を実装し、テスト・build・CONTENTS検査を通してcommitする。
- [ ] Phase 3：キーボード・reduced-motion・モバイル対応を実装し、テスト・build・CONTENTS検査を通してcommitする。
- [ ] Phase N：最終検証・7分野レビュー・ユーザー最終了承を完了する。

## Issue運用

Phase Nのレビュー結果、承認された修正計画、修正結果、再レビュー結果は後続Issueコメントとして時系列に記録する。Phase Nはユーザーの最終了承後に完了とする。
