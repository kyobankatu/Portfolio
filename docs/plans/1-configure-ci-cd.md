# Issue #1：master更新からの自動公開・デプロイ

- Issue：https://github.com/kyobankatu/Portfolio/issues/1
- 作業方式：現在のチェックアウトで新ブランチへ切替（ユーザー選択済み）
- ブランチ：`1-configure-ci-cd`／PRのマージ先：`master`
- 比較基点：`0d17af39d5d35f15ee1a09a2a95206f6b793efad`
- 計画コメント：https://github.com/kyobankatu/Portfolio/issues/1#issuecomment-6212384184

## 進捗

- [x] Phase 0：現状調査、方式決定、計画とCONTENTS.md整備
- [ ] Phase 1：本番DockerイメージのE2EとGitHub Actions／GHCR公開
- [ ] Phase 2：成功したCIを取り込むデプロイ処理・検証・運用docs
- [ ] Phase 3（最終Phase N）：全体検証、6分野レビュー、ユーザー最終確認

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
| 編集ファイル | `.github/workflows/ci.yml`、Dockerfile、`.dockerignore`、package.json／lock、playwright.config.js、tests/e2e、tools/check_contents.py、関連索引 |
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

## Phase 3（最終Phase N）

| 項目 | 内容 |
| --- | --- |
| 目的・意図 | 本番での自動更新を有効化する前に、実装・検証・運用を独立に確認する |
| テストケース | 本番用DockerイメージのE2E、デプロイ処理全テスト、索引検査、workflowと運用手順の照合 |
| レビュー結果 | frontend／backend／テストケース／mdの記入漏れ／docsの記入漏れ／規約違反を別のサブエージェントで確認する |
| 完了条件 | 修正箇所の表をユーザーへ提示し、必要な修正・再レビュー後に最終了承を得る |

## 検証・公開記録

- 索引検査：共通の既定除外を使用し、追加で`.claude/settings.local.json`を除外する。秘密値やローカル設定内容は索引に転載しない。
- 各phaseのcommitと検証結果は完了時にここへ追記し、Issue計画コメントを同期する。
- push・サーバー設定の有効化・PR作成は最終了承後。GHCRの既存packageにGITHUB_TOKENで書き込む権限が必要であり、実際の公開結果で確認する。
- GitHub APIの障害／レート制限時は更新しない。CIが失敗・未完了の場合も現行版を維持する。rollout失敗の記録と復旧方法をdocsへ残す。
