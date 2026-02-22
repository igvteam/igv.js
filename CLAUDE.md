# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Full build (ESM + UMD outputs)
npm run build

# IIFE build only
npm run build_iife

# Recompile CSS only (SCSS → css/igv.css → js/embedCss.js)
npm run updateCSS

# Run all tests
npm test

# Run a single test file
npx mocha --ui tdd test/testBAM.js
```

## Architecture

igv.js is an embeddable genome browser library. The build pipeline produces four bundle artifacts in `dist/`:
- `igv.js` / `igv.min.js` — UMD (script include, AMD, CJS)
- `igv.esm.js` / `igv.esm.min.js` — ES module

**Entry point**: `js/index.js` exports the public API (`createBrowser`, `createTrack`, `removeBrowser`, etc.).

**Core class**: `js/browser.js` (`Browser`) owns the genome, reference frames, and all tracks. It is created via `igv-create.js:createBrowser(div, config)`.

**Track system**:
- `js/trackBase.js` — base class with shared config/color/menu logic; all tracks extend it
- `js/trackFactory.js` — maps type string → constructor (`alignment` → `BAMTrack`, `feature` → `FeatureTrack`, etc.); use `registerTrackClass` to add custom types
- Track implementations live in subdirectories by type: `js/bam/`, `js/feature/`, `js/variant/`, `js/bigwig/`, `js/cram/`, `js/cnvpytor/`, etc.
- The render layer is in `js/feature/render/`

**CSS pipeline**: `css/igv.scss` is the SCSS source. The build scripts compile it to `css/igv.css` (via `scripts/compileSass.cjs`) then inline it as `js/embedCss.js` (via `scripts/generateEmbedCss.js`). `js/browser.js` imports `./embedCss.js` and injects the CSS into a shadow root. **`js/embedCss.js` is a generated file — do not edit by hand.**

**Bundler**: Rollup (`rollup.config.js` for ESM+UMD, `rollup.config.iife.js` for IIFE). The build scripts in `scripts/` run in sequence: `updateVersion.cjs` → `compileSass.cjs` → `generateEmbedCss.js` → rollup → `copyArtifacts.cjs`.

**Version**: `js/version.js` is updated by `scripts/updateVersion.cjs` from `package.json`.

## Import conventions

Internal imports use relative paths. `igv-utils` is imported directly from `node_modules`:
```js
import {igvxhr, StringUtils} from "../node_modules/igv-utils/src/index.js"
```

## Tests

- Framework: Mocha (TDD `suite`/`test` API) + Chai (`assert`)
- Tests are in `test/test*.js`; test data is in `test/data/`
- `test/utils/mockObjects.js` sets up global DOM mocks (`document`, `window`, `XMLHttpRequest`, etc.) for Node — every test file imports it first for side effects
- Tests run against source files directly, not the dist bundle
- The `atob`/`btoa` globals are provided by the `atob`/`btoa` npm packages in `mockObjects.js`

## Key external dependencies (devDependencies used at runtime in source)

| Package | Usage |
|---|---|
| `igv-utils` | XHR, string/file/URI utilities, BGZip |
| `dompurify` | HTML sanitization |
| `vanilla-picker` | Color picker UI |
| `hic-straw` | Hi-C contact map data |
| `hdf5-indexed-reader` | HDF5 file support |
| `circular-view` | JBrowse circular view integration |
