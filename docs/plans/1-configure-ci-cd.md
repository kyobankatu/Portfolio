# Issue #1：master更新からの自動公開・デプロイ

- Issue：https://github.com/kyobankatu/Portfolio/issues/1
- 作業方式：現在のチェックアウトで新ブランチへ切替（ユーザー選択済み）
- ブランチ：`1-configure-ci-cd`／PRのマージ先：`master`
- 比較基点：`0d17af39d5d35f15ee1a09a2a95206f6b793efad`
- 計画コメント：https://github.com/kyobankatu/Portfolio/issues/1#issuecomment-6212384184

## 進捗

- [x] Phase 0：現状調査、方式決定、計画とCONTENTS.md整備
- [x] Phase 1：本番DockerイメージのE2EとGitHub Actions／GHCR公開
- [x] Phase 2：成功したCIを取り込むデプロイ処理・検証・運用docs
- [x] Phase 3：承諾済みR1〜R6の修正、R7は比較演算子の規約変更で対応
- [x] Phase 4：承諾済みR8の修正、PR検証とGHCR公開の権限を分離
- [x] Phase 5（最終Phase N）：全体検証、セキュリティを含む7分野レビュー、ユーザー最終確認

## 合意済みの構成・検証範囲

`master更新 → GitHub Actionsで検証・Dockerイメージをビルド → E2E成功後にGHCRへshaタグで公開 → cp-1が成功したmasterのCIを5分間隔で確認 → Kubernetesを更新・起動確認`

- リポジトリはpublic。標準Linux GitHub-hosted runnerと既存サーバーを使う。
- GHCRイメージはprivate。GitHub ActionsはGITHUB_TOKENで公開し、Kubernetesは既存ServiceAccountの`ghcr-pull-secret`で取得する。秘密値は読み出したり記録したりしない。
- GitHubからサーバーへ接続せず、サーバー自身が公開GitHub APIから成功したCIを確認する。新しいSSH鍵や公開ポートは不要。
- ユーザーは本番用DockerイメージへのブラウザE2Eと、成功CIの選別・Kubernetes更新・失敗処理をテスト対象として了承済み。
- 現在の稼働：namespace `default`、Deployment／container `portfolio`、Service `portfolio:80 → 3000`、Podはworker-2。管理操作はcp-1。既存イメージは`ghcr.io/kyobankatu/portfolio:latest`。
- サーバー側の常駐設定はコードレビューと了承後に行う。PRの自動マージは行わない。masterへのマージ前に自動デプロイが有効になったとは報告しない。

## Phase 0

| 項目 | 内容 |
| --- | --- |
| 目的・意図 | 現行動作と認証を維持したまま、追加の有料サービスなしで自動反映する方式を決める |
| 編集ファイル | この計画書、各階層のCONTENTS.md |
| テストケース | 既存GitHub／サーバー構成の読み取り確認、索引検査 |
| 完了条件 | 計画をIssueコメントへ投稿し、索引検査が通る |

調査結果：既存workflowなし。cp-1でkubectlの取得・更新権限とcrontab利用を確認。GHCRの匿名取得は不可、ServiceAccountのimagePullSecretを確認。ローカルDockerエンジン起動済み。GitHub連携アプリのIssue書込は403だったが、既存Git認証でIssue作成・更新できた。CONTENTS.mdの初回検査は8ディレクトリ・指摘0件。

## Phase 1

| 項目 | 内容 |
| --- | --- |
| 目的 | PRで検証し、masterの検証成功時だけGHCRへ公開する |
| 意図 | E2Eしたものと同じDockerイメージをcommit SHAで特定できるようにする |
| 編集ファイル | `.github/workflows/ci.yml`、Dockerfile、next.config.js、`.dockerignore`、`.gitignore`、package.json／lock、playwright.config.js、tests/e2e、tools/check_contents.py、tools/check_runtime.mjs、関連索引 |
| テストケース | Docker内のトップ画面・言語切替・画像配信・404、イメージ内の非root実行と開発用ファイル除外、索引検査 |
| 完了条件 | 本番用イメージへのE2Eが通り、PRは公開せずmasterだけが公開するworkflowが揃う |

## Phase 2

| 項目 | 内容 |
| --- | --- |
| 目的 | cp-1から成功したmasterのCIを取り込み、安全に更新する |
| 意図 | 新たな認証情報の配布と外部からのクラスタ接続を避ける |
| 編集ファイル | scripts/auto_deploy.py、tests/deploy、portfolio.yaml、docs/deployment.md、README.md、関連索引 |
| テストケース | 成功／失敗／PR／古いSHA／別リポジトリのCI選別、API失敗・タイムアウト、更新競合、rollout失敗、既に更新済みの場合、dry-run、同時実行抑止 |
| 完了条件 | デプロイ処理のテストとcp-1での読み取り専用確認が通り、設置・有効化・復旧手順が揃う |

## Phase 3：承諾済みレビュー修正

| 項目 | 内容 |
| --- | --- |
| 目的 | R1〜R6の指摘を修正し、R7はユーザー指定どおり規約側で対応する |
| 意図 | 安全な更新設定の回帰を検出し、計画・索引・規約・運用手順を実態と揃える |
| 編集ファイル | tests/deploy/test_auto_deploy.py、CLAUDE.md、CONTENTS.md、docs/deployment.md、この計画書。併用skillはリポジトリ外のC:/develop/shared/skills/implementation-harness/SKILL.mdへセキュリティ分野を追加する |
| テストケース | patch適用後の対象イメージ・probe・RollingUpdate・deadlineの検証、各安全設定を除いたmutationで失敗すること、デプロイ全テスト、本番Docker E2E、索引検査、skill検証、文書とコマンドの照合 |
| 完了条件 | 承諾済み修正が検証を通りcommitされ、Issue計画が同期されている |

承諾：ユーザーはR1〜R6を修正するよう指示。R7はスクリプトの比較演算子を反転せず、CLAUDE.mdの演算子の制限を改める。implementation-harnessにセキュリティを追加し、以後は7分野でレビューする。

## Phase 4：R8の権限分離

| 項目 | 内容 |
| --- | --- |
| 目的 | PR検証にGHCRの書込権限を与えず、masterの検証成功後だけ公開する |
| 意図 | 検証と公開の信頼境界をjob単位で分け、E2Eで検証した同一イメージを維持する |
| 編集ファイル | .github/workflows/ci.yml、docs/deployment.md、関連CONTENTS.md、この計画書 |
| テストケース | 現行workflowでPRジョブの書込権限を検出して失敗、新構成で読取専用とmaster限定・成功依存を確認、docker save/load前後のイメージID一致、本番イメージE2E、デプロイ全テスト、workflow構文・索引検査 |
| 完了条件 | 権限分離と同一イメージの引渡しが検証を通り、commitとIssue計画更新が完了する |

承諾：ユーザーの「修正して」に基づきR8を修正する。公開jobは検証jobの成功に依存し、同じworkflow runのartifactのみを取得する。

## Phase 5（最終Phase N）

| 項目 | 内容 |
| --- | --- |
| 目的・意図 | 本番での自動更新を有効化する前に、実装・検証・運用を独立に確認する |
| テストケース | 本番用DockerイメージのE2E、デプロイ処理全テスト、索引検査、workflowと運用手順の照合 |
| レビュー結果 | frontend／backend／テストケース／mdの記入漏れ／docsの記入漏れ／規約違反／セキュリティを別のサブエージェントで確認する |
| 完了条件 | 修正箇所の表をユーザーへ提示し、必要な修正・再レビュー後に最終了承を得る |

## 検証・公開記録

- Phase 0 commit：`269bf4e`。
- Phase 1 commit：`34e700c`。
- Phase 2 commit：`458d240`。
- Phase 3 commit：`76a633a`。
- Phase 4 commit：`dd59412`。
- Phase 1：Dockerビルド成功。standalone実行イメージに対してE2E 3件成功、非root・開発ファイル除外検査成功。Next.jsのoptional peer依存でPlaywrightが残ることを実行検査で検出し、standalone出力へ変更して成功を確認。GHCRへの実公開は最終了承・push・masterマージ後に検証する。
- 既存依存関係のnpm auditは5件（high 4、critical 1）。Next.js等の既存バージョン由来であり、追加したPlaywrightの指摘はない。最終レビューの確認事項として残す。
- Phase 2：Linuxコンテナでデプロイ処理11件成功（flock競合・例外後の解放を含む）。cp-1でGitHub APIのmaster取得200、必要ツールの実パス、Deploymentの既存イメージとready 1を確認。dry-runは未公開workflowのAPIが404のためエラー終了し、クラスタは更新していない。候補を選ぶ実サーバーdry-runはmasterマージ後の確認として残す。GitHub Actionsは有効、workflow内の明示的なpackages writeで公開する。CONTENTS検査は15ディレクトリ・指摘0件。

- 索引検査：共通の既定除外を使用し、追加で`.claude/settings.local.json`、`test-results`、`playwright-report`を除外する。共通コマンドは `python -X utf8 tools/check_contents.py . --exclude .claude/settings.local.json --exclude test-results --exclude playwright-report`。秘密値やローカル設定内容は索引に転載しない。
- 各phaseのcommitと検証結果は完了時にここへ追記し、Issue計画コメントを同期する。
- push・サーバー設定の有効化・PR作成は最終了承後。GHCRの既存packageにGITHUB_TOKENで書き込む権限が必要であり、実際の公開結果で確認する。
- GitHub APIの障害／レート制限時は更新しない。CIが失敗・未完了の場合も現行版を維持する。rollout失敗の記録と復旧方法をdocsへ残す。

## Phase N：初回レビュー記録（修正承諾済み）

対象HEAD：`458d24012a58fd3e87166b938eb9c706de2f8a5d`。比較基点からの全差分を6つの独立したサブエージェントへ渡して確認した。

| 分野 | 結果・確認範囲 |
| --- | --- |
| frontend | 指摘なし。standaloneイメージへ独立したブラウザ確認を実施。表示・双方向翻訳・画像3点・CSS・404・ブラウザ例外なしを確認 |
| backend | 指摘なし。CI選別、master再確認、resourceVersion、固定対象、ロック、probe、rollout、公開条件を確認 |
| テストケース | R1。安全なrollout設定を外しても既存テストが通ることを変更なしで検証 |
| mdの記入漏れ | R2〜R4。計画・15索引と実体・編集方針・リンクを照合 |
| docsの記入漏れ | R5〜R6。設置・権限・cron・障害・停止・復旧・workflowとの一致を確認 |
| 規約違反 | R7。全差分・CLAUDE.md・skillsの手順・phaseコミットを照合 |

| ID・重要度 | 修正箇所 | 問題・推奨修正 | 検証 |
| --- | --- | --- | --- |
| R1・P2 | tests/deploy/test_auto_deploy.py | patch適用後のprobe・strategy・deadline・対象イメージを検証し、安全な更新設定の欠落を検出する | 対象設定を外すと失敗し、正しいpatchで成功すること |
| R2・P2 | この計画書 | 索引検査の共通除外にtest-results、playwright-reportも明記する | 記載コマンドとCIの除外一致・索引検査 |
| R3・P3 | CLAUDE.md | テスト基盤なしの説明をPlaywrightとデプロイテストの実態に更新する。規約ファイルのため明示承諾後に変更する | コマンドと実装の照合 |
| R4・P3 | CONTENTS.md | package-lock.jsonの生成元をpackage.jsonへのリンクで示す | リンクと索引検査 |
| R5・P2 | docs/deployment.md | rollout確認で必要なlist/watchも必要権限と事前確認に記載する | cp-1でget/list/watch/patchすべてyes、rollout status成功を追加確認済み |
| R6・P3 | docs/deployment.md | cronのPATHをコマンド行だけに適用し、後続の既存cronへ影響させない | cronの環境変数適用範囲の確認 |
| R7・P3 | tools/check_contents.py | 規約で避ける比較演算子を等価な向きに反転する。共有skillからのコピーとの差異も記録する | 索引検査と既存checkerテスト |

上表は初回指摘の履歴。ユーザーがR1〜R6の修正とR7の規約変更を承諾したため、Phase 3を挿入し、最終Phaseを4へ変更した。修正後はセキュリティを加えた7分野で再レビューする。
最終全体検証：本番イメージE2E 3件、Linuxデプロイテスト11件、実行環境検査、索引15ディレクトリ、YAML構文、git diff --checkはいずれも成功。
GHCR実公開、候補のあるcp-1 dry-run、初回SHAデプロイと公開URL確認は未実施。既存依存関係のaudit指摘5件は別途対応判断が必要。

## Phase 3：修正結果

- R1：JSON Patchをテスト用Deploymentへ適用し、対象イメージ・strategy・deadline・readiness/startup probeの最終状態を検証。4種類の安全設定を個別に除くmutationはすべて失敗し、正しい処理は成功した。
- R2：計画書の索引検査コマンドと除外設定をCIと統一した。
- R3：CLAUDE.mdにPlaywright・unittest・実行手順へのリンクを記載した。
- R4：CONTENTS.mdのlockファイル行に生成元package.jsonのリンクを追加した。
- R5：運用手順へget/list/watch/patchの必要権限と事前確認コマンドを記載した。cp-1で全権限yes、rollout確認成功を実施済み。
- R6：cronのPATHをデプロイコマンド行の環境変数に限定した。
- R7：ユーザー指定どおりCLAUDE.mdの比較演算子の規約を変更。tools/check_contents.pyは変更せず、共有skillのスクリプトとの一致を確認した。
- リポジトリ外のimplementation-harnessを更新し、セキュリティ担当の独立レビューと修正後の7分野再レビューを必須化。skill形式検証成功。
- 検証：本番イメージE2E 3件、Linuxデプロイテスト11件、索引15ディレクトリ・指摘0件、git diff --checkが成功。

## Phase N：7分野再レビュー履歴（R8修正承諾済み）

対象HEAD：`76a633ad717a0d3d19bfbfb390c861f9d0e57052`。7つの独立したサブエージェントが比較基点からの全差分と周辺コードを確認した。

| 分野 | 結果 |
| --- | --- |
| frontend | 新規指摘なし。実コンテナの表示・翻訳・画像・CSS・404・例外なしを再確認 |
| backend | 新規指摘なし。CI選別・競合・ロック・probe・rolloutを再確認。権限の指摘はセキュリティへ集約 |
| テストケース | R1解消。4種類の安全設定のmutation失敗と正しい処理の成功を独立再確認 |
| mdの記入漏れ | R2・R3・R4解消。計画・索引・規約の整合を確認 |
| docsの記入漏れ | R5・R6解消。必要権限・cron・運用手順の整合を確認 |
| 規約違反 | R7は指定どおり規約変更で解消。共有チェッカーは未変更 |
| セキュリティ | 新規指摘R8。既存依存関係のaudit指摘は今回追加したものではなく別課題として区別 |

| ID・分野・重要度 | 修正箇所 | 問題・根拠 | 修正内容と意図 | テストケース |
| --- | --- | --- | --- | --- |
| R8・セキュリティ・P2 | .github/workflows/ci.ymlのjob permissions | 同一リポジトリのPR検証jobにもpackages writeが付与される。公開stepの条件はjob全体のtoken権限を制限しない。通常のfork PRまで書込可能という指摘ではない | 検証jobをread-onlyにし、検証した同一イメージをartifactで引き継ぐmaster限定の公開jobだけにpackages writeを付ける | PRの検証jobがpackages writeを持たないこと、公開jobがmasterかつ検証成功時だけ実行されること、検証したイメージを公開すること |

ユーザーがR8の修正を承諾したためPhase 4を挿入し、最終Phaseを5へ変更した。修正後は7分野で再レビューする。最終push・本番設定は引き続き未実施。
セキュリティ補足：auditの5パッケージは比較基点と同じバージョン。Linux本番に該当しないWindows向けの問題や、画像最適化の入力経路の成立を確認できていない問題を含むため、現在の本番がリモートコード実行可能とは断定しない。依存更新は別途承諾を得て実施する。

根拠：[GitHubのtoken最小権限](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)。

## Phase 4：R8修正結果

- 検証jobを`verify`へ変更し`contents: read`のみ付与。公開を`publish`jobへ分離し、masterかつPR以外の場合に、verify成功を条件として実行する。
- masterのE2E成功後だけDockerイメージをsaveし、同じworkflow runのartifactを公開jobでloadする。検証時のイメージIDをjob出力で渡し、load後のID一致を必須とする。公開jobで再ビルドしない。
- artifact用Actionsは公式のreleaseをcommit SHAで固定。保持1日・圧縮あり。Actionsのartifact保存はアカウントの無料枠内で運用し、枠外課金の可能性を運用docsへ記載した。
- 検証：旧構成でPR jobの書込権限を検出し失敗、新構成で権限・master条件・成功依存・同一run artifact・ID検証の静的確認に成功。actionlint 1.7.12で構文・式検証成功。
- workflow内のsave/load shellブロックをLinuxコンテナで実行し、タグを一旦外してloadしてもイメージIDが一致することを確認した。
- 全体検証：本番イメージE2E 3件、Linuxデプロイテスト11件、CONTENTS 15ディレクトリ・指摘0件、git diff --check成功。
- 実際のGitHub上のartifact転送・GHCR公開はpushとmasterマージ後の確認事項として残る。

## Phase 5：最終7分野レビュー（最終了承待ち）

対象HEAD：`dd5941203bb16ea481b56c683d1a892c73f6873a`。7つの独立したサブエージェントが比較基点からの全差分と周辺コードを再確認した。

| 分野 | 結果・確認範囲 |
| --- | --- |
| frontend | 指摘なし。実コンテナで200・主要セクション・双方向翻訳・画像・CSS・404・例外なしを独立確認 |
| backend | 指摘なし。公開jobの成功まで含むCI選別、同一イメージ引渡し、競合・rollout処理を確認 |
| テストケース | 指摘なし。R1の回帰検出維持、R8の権限・成功依存・引渡し検証を確認 |
| mdの記入漏れ | 指摘なし。計画・承諾・phase履歴・索引15ディレクトリの実体との一致を確認 |
| docsの記入漏れ | 指摘なし。artifact・権限分離・無料枠・設置・停止・復旧手順を実装と照合 |
| 規約違反 | 指摘なし。33ファイル、現行規約、skill、承諾範囲、phaseコミットを確認 |
| セキュリティ | R8解消、新規指摘なし。PR検証の読取専用化、master限定公開、同一run・同一イメージの信頼境界を確認 |

最終検証：本番Docker E2E 3件、Linuxデプロイテスト11件、workflow権限検査、actionlint、workflowのsave/load実行とイメージID一致、索引15ディレクトリ、差分チェックが成功。
既存依存関係のaudit指摘5件は別課題として残す。実際のGitHub artifact転送・GHCR公開・候補付きcp-1 dry-run・初回SHAデプロイ・公開URL確認はmasterでのCI実行後に確認する。
ユーザー最終了承を受領。Phase 5を完了し、作業ブランチのpush、Issue計画コメント更新、PR作成へ進む。PRは自動マージせず、本番常駐設定はmasterの初回CI・公開成功確認後に行う。
