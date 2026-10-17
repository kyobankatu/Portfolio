# components

React UI and the page data projection used by the portfolio screen.

| 名前 | 役割 | 編集方針 |
| --- | --- | --- |
| [Home.jsx](./Home.jsx) | Portfolio screen, language toggle, section navigation, content rendering, and localized Physics Toss use hint | 通常編集可 |
| [Home.module.css](./Home.module.css) | Responsive HUD layout, component styling, Physics Toss hint, and scroll-friendly touch interaction | 通常編集可 |
| [physicsTossController.js](./physicsTossController.js) | Opt-in Matter.js physics for sections and nested content, preserving position across target-mode changes, layout reflow and page scrolling (including sticky-sidebar synchronization), keyboard controls, motion preferences, touch scrolling, bounds, and reset | 通常編集可 |
| [portfolioContent.js](./portfolioContent.js) | Project, skill, and navigation definitions; validates localized project descriptions and section ids | 通常編集可 |
