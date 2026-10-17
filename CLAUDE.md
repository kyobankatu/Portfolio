# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mandatory Rules

- Do not modify files unless explicitly instructed.
- Do not refactor existing code unless clearly requested.
- Prefer minimal, localized changes over large improvements.
- Stability and existing behavior are more important than code cleanliness.

## Change Proposal Requirement

Before making code changes:
- Explain what will change and why it is necessary.
- Describe potential risks or side effects.
- Wait for explicit approval before proceeding.

## Security Rules

- Never request or output secrets, API keys, or credentials.
- Do not log or print personal data.
- Assume production-like constraints even in development.

## Cost Awareness

- Keep responses concise.
- Avoid repeating large code blocks unless necessary.
- Prefer explanation over full implementation when possible.

## Notation

- Use four spaces for indentation.
- Avoid extra spaces and keep braces explicit where the language supports them.
- Choose comparison operators (`>`, `>=`, `<`, `<=`) in the direction that makes the condition easiest to read.
- Avoid `goto`.
- Prefer readable code.

## Model Usage Policy

- Use the Default (recommended) model for all tasks. The Default model is currently Sonnet.
- Do not switch to Opus unless explicitly instructed by the user.
- Prefer lower-cost models unless higher capability is required.

## Commands

```bash
npm install
npm run dev       # Start Next.js with HMR
npm run test:unit # Run unit and React integration tests
npm run build     # Build the production app
npm run start     # Serve the production build locally
npm run test:e2e  # Run Chromium E2E against the production build
```

Deployment controller tests use Python's unittest:

```bash
python -B -m unittest discover -s tests/deploy -v
```

For local production Docker E2E setup, see [deployment.md](docs/deployment.md#ローカル検証).

## Architecture

Next.js 15 App Router and React 19. The home page is statically generated at build time.

- `app/layout.js` sets page metadata, Japanese document language, and imports global styles.
- `app/page.js` renders the client-side `Home` portfolio screen.
- `app/globals.css` defines the dark canvas, browser defaults, focus indication, and reduced-motion baseline.
- `components/Home.jsx` renders the responsive HUD, language switch, section navigation, research, projects, skills, interests, and contacts.
- `components/Home.module.css` contains responsive HUD styles and character motion.
- `components/portfolioContent.js` defines project and skill data, localized content projection, and section selection validation.
- `locales/ja.json` and `locales/en.json` contain translated prose, project descriptions, and character introductions. Fixed HUD labels and technical category names may remain English; accessibility labels that describe controls should be localized.
- `tests/unit` tests content projection and invalid data; `tests/integration` tests rendered page behavior; `tests/e2e` checks the production build in Chromium.
- `.github/workflows/ci.yml` runs unit/integration tests and build verification before publishing.
- `public/avatar-placeholder.png` is served as `/avatar-placeholder.png`.

## Styling conventions

- Use the current dark HUD palette and responsive layout defined in `components/Home.module.css`.
- Keep component-specific styles in CSS Modules; reserve `app/globals.css` for document-wide behavior.
- Keep translated prose in both locale JSON files. Fixed HUD labels and technical category names may remain English; localize accessibility labels for controls.
- Keep motion brief and non-blocking, and honor `prefers-reduced-motion`.
- Update the nearest `CONTENTS.md` when adding or removing source files.
