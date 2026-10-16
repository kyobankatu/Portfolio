# Portfolio

かつもんのポートフォリオサイト。

## Stack

- **Next.js 15** (App Router) — static site generation
- **React 19**
- **CSS Modules** + global CSS

## Development

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build
npm run start    # preview production build
```

## CI/CD

masterの検証成功時にGHCRへ本番イメージを公開し、cp-1からKubernetesへ反映します。
設置・有効化・停止・復旧方法は[デプロイ手順](docs/deployment.md)を参照してください。
