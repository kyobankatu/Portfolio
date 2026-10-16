# .

Portfolioの実装と運用に必要なファイル。

| 名前 | 役割 | 編集方針 |
| --- | --- | --- |
| [.gitignore](./.gitignore) | Git管理から除外するパス | 通常編集可 |
| [app/](./app/CONTENTS.md) | Next.jsのルートと全体レイアウト | 通常編集可 |
| [CLAUDE.md](./CLAUDE.md) | 既存の開発規約 | 通常編集可 |
| [components/](./components/CONTENTS.md) | 画面コンポーネントと専用スタイル | 通常編集可 |
| [Dockerfile](./Dockerfile) | 本番用Dockerイメージのビルド手順 | 通常編集可 |
| [docs/](./docs/CONTENTS.md) | 開発計画と運用説明 | 通常編集可 |
| [locales/](./locales/CONTENTS.md) | 日本語・英語の表示文言 | 通常編集可 |
| [next.config.js](./next.config.js) | Next.jsのビルド設定 | 通常編集可 |
| [package-lock.json](./package-lock.json) | 依存パッケージの固定バージョン | 生成元を編集（package.jsonとnpm installで更新） |
| [package.json](./package.json) | 依存関係と開発コマンド | 通常編集可 |
| [portfolio.yaml](./portfolio.yaml) | KubernetesのDeployment・Service・Ingress定義 | 通常編集可 |
| [public/](./public/CONTENTS.md) | ブラウザへ配信する静的アセット | 通常編集可 |
| [README.md](./README.md) | プロジェクト概要と開始手順 | 通常編集可 |
