# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Build:**
```bash
npm run build         # Full build: updates version, compiles SASS, bundles with rollup, copies artifacts
npm run build_iife    # Build IIFE format instead of ESM/UMD
npm run updateCSS     # Recompile SASS and regenerate embedded CSS only
```

**Test:**
```bash
npm test                                          # Run all tests
npx mocha -ui tdd test/testBAM.js                # Run a single test file
npx mocha -ui tdd --grep "BAM alignments" test/testBAM.js  # Run a single test by name
```

Tests use Mocha's TDD interface (`suite`/`test` syntax, not `describe`/`it`). Test files are in `test/` and are named `test*.js`.

## Architecture

### Entry Point and Browser Creation
- `js/index.js` — public API surface, re-exports from core modules
- `js/igv-create.js` — `createBrowser()` factory; constructs and initializes a `Browser` instance in a provided DOM element
- `js/browser.js` — central `Browser` class (~2500 lines); owns genome, tracks, reference frames, navigation, events, and session management

### Track System
- `js/trackFactory.js` — registry mapping track type strings (e.g. `"alignment"`, `"feature"`, `"variant"`) to constructor functions; extensible via `registerTrackClass()` / `registerTrackCreatorFunction()`
- `js/trackBase.js` — base class all tracks extend; handles config initialization, default properties, and shared behaviors
- Track implementations live in subdirectories by type: `js/bam/`, `js/feature/`, `js/variant/`, `js/gwas/`, `js/hic/`, etc.

### Rendering Pipeline
- `js/trackView.js` — `TrackView` wraps a track in DOM; one `TrackView` per track; manages axis column, viewports, and the gear/drag UI chrome
- `js/trackViewport.js` — `TrackViewport` renders a single genomic locus for a track onto a `<canvas>`; there is one viewport per reference frame per track (multi-locus view creates multiple viewports per track)
- `js/referenceFrame.js` — `ReferenceFrame` encapsulates a genomic locus (chromosome, start, bpp); the browser maintains a `referenceFrameList` array (one entry = single-locus, multiple = split-panel view)
- `js/igv-canvas.js` — `IGVGraphics` canvas drawing utilities

### Genome and Data Loading
- `js/genome/` — genome configuration, chromosome aliasing, sequence fetching
- `js/feature/featureSource.js` — creates the appropriate reader/parser for a given file format; the `FeatureSource` abstraction is used by most feature-based tracks
- `js/util/fileFormatUtils.js` — infers file format from URL/filename
- Network I/O is handled by `igv-utils` (imported from `node_modules/igv-utils/`)

### Build Outputs
Rollup produces four files in `dist/`:
- `igv.esm.js` / `igv.esm.min.js` — ES module format (package `main`/`module`)
- `igv.js` / `igv.min.js` — UMD format (package `browser`)

CSS is compiled from `css/` via SASS, then embedded as a JS string in `js/embedCss.js` and injected into a Shadow DOM root at runtime (style isolation).

### Extending the Library
- New track types: implement a class extending `TrackBase`, then call `igv.registerTrackClass(typeName, MyTrackClass)` before creating a browser
- New file formats: use `igv.registerFileFormats()` to associate extensions with track types
