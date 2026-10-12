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

## No bundler (a project-wide rule)

Every igvteam JavaScript project, igv.js included, must run **directly in a browser as ES modules, with no bundler, transpiler, or import map**. That is why third-party imports are written as explicit relative paths into `node_modules`:

```js
import {StringUtils} from "../node_modules/igv-utils/src/index.js"        // js/locus.js
import DOMPurify from "../../../node_modules/dompurify/dist/purify.es.mjs" // js/ui/components/textbox.js
```

New code must follow the same rule:

- Never write a bare specifier (`import ... from "igv-utils"`) — the browser cannot resolve it.
- Path the `../` prefix to the file's depth below the repo root, and point at the package's ESM entry file (`src/index.js`, `dist/*.es.mjs`, …), never at a directory or a `package.json` `exports` alias.
- Only add a dependency that ships an ESM build usable straight from `node_modules`; CommonJS-only packages cannot be used this way.
- Rollup (`npm run build`) exists to produce `dist/` for consumers — it is not a prerequisite for running the code.

## Development loop

Develop against the source, not `dist/`: the HTML files under `dev/` import `../js/index.js` directly as an ES module. Serve the repo root over HTTP and open e.g. `dev/igvjs.html`. `npm run build:dev-dashboard` regenerates `dev/dev.html`, a searchable index of every page under `dev/`.

CI (`.github/workflows/ci_build.yml`) runs `npm ci && npm test` on the Node version in `.nvmrc`; `devEngines` in `package.json` sets the development minimum (Node 22.13).

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

**Prefer `IGVGraphics` (`js/igv-canvas.js`) over raw `ctx` calls** for canvas drawing. The same draw path is replayed against `canvas2svg.js` for SVG export (`renderSVGContext`), and `IGVGraphics` only uses the subset that survives that replay.

Raw `ctx` calls are *not* automatically a bug — `canvas2svg` implements most of the 2D API (`fillStyle`, `fillRect`, `strokeRect`, paths, `fillText`, `drawImage`, `clip`, gradients, …), so existing raw calls such as those in `js/bam/mods/baseModificationRenderer.js` export correctly. What breaks "Save SVG" is reaching for a member `canvas2svg` doesn't back:

- **Silent no-ops** (return `undefined`, no error, wrong or missing output in the SVG): `setTransform`, `getImageData`, `putImageData`, `createImageData`, `globalCompositeOperation`, `drawFocusRing`.
- **Missing entirely** (throws `TypeError` during export only, so it passes on-screen testing): `ellipse` (use `fillEllipse`/`strokeEllipse`), `roundRect`, `resetTransform`, `getLineDash`, `isPointInPath`, `filter`, `imageSmoothingEnabled`, `createConicGradient`.

So: don't rewrite working raw `ctx` code just to satisfy the rule, but check anything new against `js/canvas2svg.js` — and test "Save SVG", since neither failure mode shows up on screen.

### Data sources

`js/feature/featureSource.js` is a factory dispatching on `config.format`: static features, `BWSource` (bigwig/bigbed), `TDFSource`, Genbank, `vcf.list`, `hic`, else `TextFeatureSource` (which handles tribble/tabix indexes, gzip, and the parsers in `featureParser.js`). Binary/indexed formats live in their own directories: `js/bam` (BAM/CRAM/BAI/CSI, alignment packing, base mods), `js/bigwig`, `js/tdf`, `js/cram`, `js/htsget`, `js/variant`, `js/seg`-style parsers under `js/feature`.

### Genome

`js/genome/genome.js` plus 2bit/indexed-FASTA sequence readers, cytobands, and — importantly — the chromosome **alias** layer (`chromAlias*.js`). Chromosome naming (`chr1` vs `1` vs RefSeq accessions) is normalized there; feature readers and search should rely on it rather than string-matching chromosome names. UCSC track hubs are loaded via `js/ucsc/hub`.

### Load failures

Loading a genome or session keeps going when *optional* parts fail. The rule:

- **Required** (a failure aborts the load): the sequence file and a FASTA index that was specified. There must also be a starting locus: from the session or genome config, else the genome's first chromosome, which every sequence source supplies (a 2bit with an external `.bpt` index reads its first sequence name from the file header). If a given locus doesn't resolve, the browser falls back to that first chromosome. `Browser.#createGenome` keeps a check for a missing locus as a safety net.
- **A required failure leaves the browser unchanged**: the genome is built and checked before any browser state is cleared, so when `loadGenome`/`loadSession` rejects, the current genome and tracks are still there and the caller can carry on.
- **A required failure rejects with a message for the user**, since wrapping applications (igv-webapp) show `error.message` as is. A reader that fails on a required resource throws `LoadError(kind, url, cause)` (`js/util/loadFailure.js`), whose message says in one sentence which part failed and what happened to it, then the resource, then a hint if there is one, one per line (plain text with `\n`, which the alert dialog renders as line breaks). Don't say the same thing twice: "could not be read" followed by "could not be reached" is one statement too many. `Browser` wraps whatever fails the genome load with `genomeLoadError`, which leads with the genome: "Genome canFam4 could not be loaded: the 2bit sequence file could not be reached. / <url> / Check that the URL is correct. …", and a session file that cannot be read or parsed with `sessionLoadError`. When the part that failed *is* the thing being loaded (a session file, a track's file) say it once: "The session file could not be read: … / <url>", not "The session could not be loaded: the session file …". A session whose genome fails rejects with the genome's error. `explainLoadError` turns a request failure into words (status 0 is "could not be reached" plus a CORS hint, 404 "was not found", …), so don't put the raw `Error accessing resource … status: 0` in front of the user. The original error is kept as `cause`.
- **Optional genome parts that fail** (a 2bit `.bpt` index, chrom.sizes, the alias bigBed, the alias file, cytobands) are left out with a fallback where there is one (the 2bit's internal index, chromosomes loaded on demand, the next alias source). Readers don't touch the UI: they record the failure as `{kind, url, message, warning}` (built with `loadFailure` from `js/util/loadFailure.js`, the warning saying what failed and its likely consequence, e.g. "Loading this genome may be slow") and the `Genome` collects them in `genome.loadFailures`, which `Browser` reports with the rest of the load. Parts that load lazily (cytobands, aliases) fail after the load has returned: once the browser has taken the genome it sets `genome.onLoadFailure`, and such failures go to that, to be reported as they happen. Warn once, and load the source once, so a failure isn't retried on every redraw.
- **Tracks are loaded with `allSettled`**, so one bad track doesn't block the others. A track load that fails, at any step from parsing its config to `postInit`, rejects with `trackLoadError` ("Track b.wig could not be reached. / <url> / Check …"; a reader's `LoadError` for another part keeps both clauses: "Track b.bam could not be loaded: the index file was not found …"), which is what `loadTrack`/`loadTrackList` throw and what the viewport alerts when data fails to load later. `Browser` lists the genome's and the failed tracks' failures of a load in one alert, formatted with `describeLoadFailure`. There is no load-failure event or return value.
- **Alerts are queued** (`js/ui/components/alertDialog.js`): an alert presented while another is open, in any dialog on the page, waits until that one is dismissed. So any code can call `browser.alert.present()` without hiding another alert. A dialog that is removed from the page, or disposed of (`AlertDialog.dispose`, called from `Browser.dispose` and `Viewport.dispose`), is skipped and never blocks the queue; a dialog that has not yet been attached to the page (a browser created in a detached div) is not skipped, its alert shows once the div is attached.

### Session state

`browser.toJSON()` / `loadSessionObject()` round-trip the browser; `TrackBase.getState()` defines what a track contributes (only simple types, and only values differing from `constructor.defaults`). Legacy IGV-desktop XML sessions are converted in `js/session/igvXmlSession.js`.

### Third-party / generated — do not hand-edit

`js/vendor/**`, `js/canvas2svg.js`, `js/cram/cram-bundle.js`, `js/embedCss.js`, `css/igv.css`, `dist/**`. The first three are excluded from lint as shipped upstream.

## Git commit messages

- Keep commit messages concise.
- A single short subject line (under 50 characters) whenever possible; no body.
- No bulleted lists, no recaps of what changed file-by-file
- Add a body only when the *why* is genuinely non-obvious from the diff — then one or two sentences, not a summary of the change.

