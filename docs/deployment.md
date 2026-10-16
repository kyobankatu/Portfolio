# PortfolioのCI/CD

`master → GitHub Actionsでテスト → GHCR → cp-1の5分間隔ポーリング → Kubernetes`

PRではテストだけを実行する。masterではテストした本番Dockerイメージを
`ghcr.io/kyobankatu/portfolio:sha-<40桁commit SHA>`として公開する。
cp-1は公開GitHub APIで`ci.yml`の成功を確認し、現在のmasterと一致するSHAだけを反映する。
デプロイ対象はnamespace `default`のDeployment／container `portfolio`に固定している。

検証jobは`contents: read`だけを持ち、PRではGHCRへ書き込めない。
masterの検証成功後、Dockerイメージをartifactで同じworkflow runの公開jobへ引き渡す。
公開jobだけに`packages: write`を与え、再ビルドせず、load後のイメージIDが検証時と一致することを確認して公開する。
引渡し用artifactはmaster実行時だけ作成し、保持期間は1日とする。
標準runnerのpublicリポジトリ実行時間は無料だが、artifact保存はアカウントの無料枠内で運用する。
保持を短くして圧縮する構成とし、利用量・課金上限は[GitHubの料金説明](https://docs.github.com/en/billing/concepts/product-billing/github-actions)で確認する。

## 必要な設定

- GitHub Actionsを有効にする。既存GHCR packageのSettings → Manage Actions accessで
  `kyobankatu/Portfolio`にWrite権限が必要。リポジトリに紐づいたpackageでは権限継承も確認する。
  初回master CIの公開ログで確認する。GITHUB_TOKEN以外のGitHub Secretは追加しない。
- GHCRはprivateのまま。クラスタのdefault ServiceAccountに既存の
  `ghcr-pull-secret`が設定されていること。内容を表示したりGitへ保存したりしない。
- cp-1でPython 3.10以降、kubectl、crontab、timeout、loggerを利用できること。
  実行ユーザーのkubectl contextが本番クラスタを指し、Deploymentのget／list／watch／patchが可能なこと。
  rollout statusにはlist／watchも必要。cp-1で次の権限確認がすべてyesとなり、rollout確認が成功することを確認する。

```text
kubectl -n default auth can-i get deployments.apps
kubectl -n default auth can-i list deployments.apps
kubectl -n default auth can-i watch deployments.apps
kubectl -n default auth can-i patch deployments.apps
kubectl -n default rollout status deployment/portfolio --timeout=180s
```

- 標準LinuxのGitHub-hosted runnerと既存サーバーを使う。課金runnerや新しい有料サービスは不要。
  GitHubからクラスタへ接続する鍵や公開ポートは追加しない。

## 設置と有効化

最終レビュー・ユーザー了承後に行う。ブランチのpushやPR作成だけでは本番反映されない。
masterへのマージ後、最初のCIとGHCR公開の成功を確認してから有効化する。

1. レビュー済みの`scripts/auto_deploy.py`をcp-1の
   `~/.local/lib/portfolio-deploy/auto_deploy.py`へコピーする。
   スクリプトはCIやネットワークから自身を自動更新しない。変更時は再レビューしてコピーする。
2. cp-1で`python3 ~/.local/lib/portfolio-deploy/auto_deploy.py --dry-run`を実行する。
   `dry-run`は候補確認まで行い、Deploymentを更新しない。
   `no-successful-ci`ならmasterの成功CIがまだないため、有効化せずCIを確認する。
   workflowがまだmasterに存在しない段階ではGitHub APIが404を返し、`HTTPError`で終了する。
3. 既存crontabをバックアップし、既存行を残して次の管理ブロックを1つ追加する。
   PATHは例の値を前提にせず、`command -v python3 kubectl timeout logger`で確認する。

```cron
# BEGIN portfolio-deploy
*/5 * * * * PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/timeout 280s /usr/bin/python3 /home/katumon/.local/lib/portfolio-deploy/auto_deploy.py 2>&1 | /usr/bin/logger -t portfolio-deploy
# END portfolio-deploy
```

4. 初回は手動で同じスクリプトを実行し、`deployed`または`already-current`と
   `kubectl -n default rollout status deployment/portfolio --timeout=180s`の成功を確認する。
   Service経由と実際の公開URLでも表示・言語切替を確認する。

スクリプトは更新時にreadiness／startup probeとRollingUpdate
（maxUnavailable 0、maxSurge 1）を設定する。新PodのHTTP確認が通るまで旧Podを残すため、
一時的に2Podを動かせる空きリソースが必要。`portfolio.yaml`は初期構築用であり、
稼働後にそのままapplyするとSHA指定をlatestへ戻すため、日常の更新には使わない。

## ログ・失敗時の動作

- `journalctl -t portfolio-deploy --since today`またはホストのsyslogでJSONログを確認する。
  定期処理の出口は`deployed`、`already-current`、`no-successful-ci`、`master-changed`、`locked`、`error`。
- 同時実行はflockで抑止する。ロックは`~/.local/state/portfolio-deploy/lock`に置く。
  APIは各15秒、kubectlは各200秒、cron全体は280秒で打ち切る。
- GitHub API障害・レート制限、失敗／未完了CIでは更新しない。
  通常は1回あたり2〜3 APIリクエストで、5分間隔なら24〜36回／時。
  同じ送信元IPの他ツールとGitHubの匿名API制限を共有する点に注意する。
- 更新直前にmasterを再確認し、DeploymentのresourceVersionも比較する。
  競合時は更新を止め、次回再評価する。ただしGitHubとKubernetes間に分散トランザクションはなく、
  最後の確認直後にmasterが動けば、その次のポーリングで新しい成功版に追随する。
- rollout失敗はエラー終了し、無条件の自動rollbackは行わない。
  更新前後のイメージは`updating`ログに記録する。新Podが起動できなくてもreadiness条件で旧Podを維持する。
  `kubectl -n default get pods -l app=portfolio`と`describe deployment portfolio`で原因を調べる。
  エラーログにはkubectlのstderrやAPIレスポンス本文を出さず、例外の種類を記録する。

## 停止・復旧

1. crontabの管理ブロックだけを削除し、他のcron行を残す。進行中の処理がないことも確認する。
2. 必要なら`kubectl -n default rollout undo deployment/portfolio`で直前のrevisionへ戻す。
   またはログに残した正常なSHAイメージを`kubectl set image`で指定する。
3. rollout status、Service、公開URLを確認する。原因を修正したcommitのmaster CI成功後に再開する。
   masterを修正せずにcronを再開すると、そのSHAが再選択される。

GHCR公開時に403ならpackageのActions accessとworkflowの`packages: write`を確認する。
ImagePullBackOffならタグの存在と既存pull secretの有効性を管理者側で確認する。
秘密値の表示・再発行・置換はこの設定作業では行わない。

## ローカル検証

```text
npm ci
npx playwright install chromium
docker build -t portfolio-ci:local .
docker run --rm -i portfolio-ci:local node --input-type=module
```

最後のコマンドの標準入力に`tools/check_runtime.mjs`を渡して実行環境を検査する。
イメージを`127.0.0.1:4173:3000`で起動し、`PORTFOLIO_BASE_URL=http://127.0.0.1:4173`を
設定して`npm run test:e2e`を実行する。デプロイ処理は
`python -B -m unittest discover -s tests/deploy -v`で検証する。
LinuxのflockケースはWindowsではskipされるためLinuxでも実行する。

参考：[GitHubのイメージ公開](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)、
[Next.js standalone出力](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)、
[Kubernetes Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)。
