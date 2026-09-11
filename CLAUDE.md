# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run build          # full build -> dist/ ; also generates js/embedCss.js and stamps js/version.js
npm run updateCSS      # after editing css/*.scss: recompile SASS + regenerate js/embedCss.js
npm test               # mocha --ui tdd, runs test/*.js
npx eslint js          # lint (no npm script; config in eslint.config.js)
```

`js/embedCss.js` is generated from `css/igv.scss`, imported by `browser.js`, and not checked in — so it must exist before *anything* runs, including the Node tests. `npm install` covers this automatically (the `prepare` script runs `npm run build`); you only need to regenerate by hand after editing SCSS, or if you installed with `--ignore-scripts`. `js/version.js` is likewise rewritten from `package.json` on every build.

Tests use the **TDD interface** (`suite`/`test`, not `describe`/`it`) and **must be run from the repo root** — test data is referenced by repo-relative path (`test/data/...`).

```bash
npx mocha --ui tdd test/testBED.js              # single file
npx mocha --ui tdd test/testBED.js -g "BED query"  # single test
```

Every test file starts with `import "./utils/mockObjects.js"` (side-effect only), which installs globals — `document`, `window`, `File`, `XMLHttpRequest`, `DOMParser`, `atob`/`btoa` — so browser code runs under Node. `XMLHttpRequestMock` routes relative paths to the filesystem (with range-header support) and absolute URLs to the network, so most readers can be tested with no server. Genome fixtures come from `test/utils/MockGenome.js`.

## Development loop

Develop against the source, not `dist/`: the HTML files under `dev/` import `../js/index.js` directly as an ES module. Serve the repo root over HTTP and open e.g. `dev/igvjs.html`. `npm run build:dev-dashboard` regenerates `dev/dev.html`, a searchable index of every page under `dev/`.

CI (`.github/workflows/ci_build.yml`) runs `npm install && npm test` on Node 24.

## Architecture

Public API is `js/index.js` (the default export object); `igv.createBrowser(div, config)` lives in `js/igv-create.js`.

### Shadow DOM and CSS

`Browser` attaches a **shadow root** to the container div and adopts a stylesheet built from the generated `embedCss.js` string. igv.js styles are therefore fully isolated from the host page — and the reason a CSS edit is invisible until `npm run updateCSS` is run. Anything that queries the DOM must go through the shadow root, not `document`.

### Column layout (the key to multi-locus view)

`browser.columnContainer` is a flex row of columns created in a fixed order: axis, sample-info, sample-name, one `igv-column` **per locus** (separated by `igv-column-shim` elements), scrollbar, track drag handles, gear menu (gear can be moved to the left via `gearColumnPosition`). Multi-locus view is implemented by adding columns, not by nesting panels — see `viewportColumnManager.js`, `browser.addMultiLocusPanel`/`removeMultiLocusPanel`.

Each locus column is backed by a `ReferenceFrame` (`js/referenceFrame.js`) in `browser.referenceFrameList` holding `chr/start/end/bpPerPixel`. Panel widths are recomputed in `browser.calculateViewportWidth`.

### Track / TrackView / TrackViewport

Three distinct layers, easy to confuse:

- **Track** (`js/trackBase.js` + subclasses) — data + drawing, no DOM ownership. Holds config, state serialization (`getState`), menu items.
- **TrackView** (`js/trackView.js`) — one per track; owns that track's row across *all* columns: its axis canvas, scrollbar, drag handle, gear popup, and one `TrackViewport` per reference frame.
- **TrackViewport** (`js/trackViewport.js`) — one per (track, locus) cell; owns the canvas, the feature cache, mouse/click/popup handling, and per-cell SVG/PNG export.

Render pipeline: `browser.updateViews()` → collates `autoscaleGroup` tracks so a shared data range is computed across tracks before painting → `trackView.updateViews()` → each viewport decides `needsReload()` / `needsRepaint()` → `viewport.loadFeatures()` → `track.draw()`.

Caching conventions worth knowing before touching viewport code: features are loaded for **one screen width of padding on each side** so short pans don't refetch; the canvas is drawn **3× viewport width** (except whole-genome view, which is exactly viewport width) and shifted on pan. `FeatureCache` (bottom of `trackViewport.js`) keys on chr/range/bpPerPixel/windowFunction; `containsRange` drives both reload and repaint decisions.

### Adding a track type

Subclass `TrackBase` and implement `getFeatures(chr, start, end, bpPerPixel, viewport)`, `draw(options)`, `computePixelHeight(features)`, plus optional `popupData`, `menuItemList`, `postInit`. Register it in the `trackFunctions` map in `js/trackFactory.js` (which also maps legacy type aliases: `annotation`/`genes`/`snp` → `feature`, `maf`/`mut` → `seg`, …). External code registers via `igv.registerTrackClass` / `igv.registerTrackCreatorFunction`.

**All canvas drawing must go through `IGVGraphics` (`js/igv-canvas.js`)**, not raw `ctx` calls — the same draw path is replayed against `canvas2svg.js` for SVG export (`renderSVGContext`). Raw context calls silently break "Save SVG".

### Data sources

`js/feature/featureSource.js` is a factory dispatching on `config.format`: static features, `BWSource` (bigwig/bigbed), `TDFSource`, Genbank, `vcf.list`, `hic`, else `TextFeatureSource` (which handles tribble/tabix indexes, gzip, and the parsers in `featureParser.js`). Binary/indexed formats live in their own directories: `js/bam` (BAM/CRAM/BAI/CSI, alignment packing, base mods), `js/bigwig`, `js/tdf`, `js/cram`, `js/htsget`, `js/variant`, `js/seg`-style parsers under `js/feature`.

### Genome

`js/genome/genome.js` plus 2bit/indexed-FASTA sequence readers, cytobands, and — importantly — the chromosome **alias** layer (`chromAlias*.js`). Chromosome naming (`chr1` vs `1` vs RefSeq accessions) is normalized there; feature readers and search should rely on it rather than string-matching chromosome names. UCSC track hubs are loaded via `js/ucsc/hub`.

### Session state

`browser.toJSON()` / `loadSessionObject()` round-trip the browser; `TrackBase.getState()` defines what a track contributes (only simple types, and only values differing from `constructor.defaults`). Legacy IGV-desktop XML sessions are converted in `js/session/igvXmlSession.js`.

### Third-party / generated — do not hand-edit

`js/vendor/**`, `js/canvas2svg.js`, `js/cram/cram-bundle.js`, `js/embedCss.js`, `css/igv.css`, `dist/**`. The first three are excluded from lint as shipped upstream.

## Git commit messages

- Keep commit messages extremely concise.
- A single short subject line (under 50 characters) whenever possible; no body.
- No bulleted lists, no recaps of what changed file-by-file, no explanation of the reasoning.
- Add a body only when the *why* is genuinely non-obvious from the diff — then one or two sentences, not a summary of the change.
- Trailers (co-author, issue refs) are exempt from the "no body" rule.
