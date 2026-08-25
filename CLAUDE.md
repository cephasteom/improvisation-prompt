# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`improv-prompt` is a minimal Vite + vanilla TypeScript app (no UI framework). It is currently the
stock Vite scaffold: a single entry point that renders markup into `#app` and wires up a counter
button.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — type-check with `tsc` (no emit) then produce a production build via `vite build`
- `npm run preview` — serve the production build locally

There is no test suite and no linter configured in this repo yet.

## Architecture

- `index.html` is the Vite entry HTML; it loads `src/main.ts` as an ES module.
- `src/main.ts` builds the page by injecting a template string into `#app`, then calls
  `setupCounter` to wire up interactivity. Static assets (images, SVGs) are imported directly in
  TS and resolved by Vite.
- `src/counter.ts` exports `setupCounter(element)`, a self-contained example of DOM state wired to
  a single element — the pattern to follow for adding new interactive behavior.
- `public/` holds files served as-is at the site root (favicon, `icons.svg` referenced via
  `<use href="/icons.svg#...">`).
- `tsconfig.json` targets ES2023/DOM, uses Vite's bundler module resolution, and enables strict
  linting-style checks (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`). No
  emit happens from `tsc` — Vite (esbuild) handles actual transpilation/bundling.
