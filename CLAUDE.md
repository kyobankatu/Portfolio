# Development guide

## Commands

```bash
npm install
npm run dev       # Start Next.js with HMR
npm run test:unit # Run unit and React integration tests
npm run build     # Build the production app
npm run test:e2e  # Run Chromium E2E against the production build
```

Deployment controller tests use Python's unittest:

```bash
python -B -m unittest discover -s tests/deploy -v
```

For a local production Docker E2E setup, see [deployment.md](docs/deployment.md#ローカル検証).

## Architecture

Next.js 15 App Router and React 19. The home page is statically generated at build time.

- `app/layout.js` sets page metadata, Japanese document language, and imports global styles.
- `app/page.js` renders the client-side `Home` portfolio screen.
- `app/globals.css` defines the dark canvas, browser defaults, focus indication, and reduced-motion baseline.
- `components/Home.jsx` renders the HUD, language switch, navigation, research, projects, skills, interests, and contacts.
- `components/Home.module.css` contains responsive HUD styles and character motion.
- `components/portfolioContent.js` defines project and skill data and rejects missing localized project descriptions.
- `locales/ja.json` and `locales/en.json` hold all displayed copy and project descriptions.
- `tests/unit` tests data projection and invalid data; `tests/integration` tests rendered page behavior; `tests/e2e` checks the production build in Chromium.
- `public/avatar-placeholder.png` is served as `/avatar-placeholder.png`.

## Conventions

- Use four spaces for indentation.
- Keep page copy in both locale JSON files.
- Keep component-specific styles in CSS Modules; reserve `app/globals.css` for document-wide behavior.
- Keep motion brief and non-blocking, and honor `prefers-reduced-motion`.
- Update the nearest `CONTENTS.md` when adding or removing source files.
