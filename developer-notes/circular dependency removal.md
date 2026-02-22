# Circular Dependency Removal

**Date:** 2026-02-22
**Scope:** `js/` source tree
**Result:** 11 internal cycles eliminated; 245 tests pass; build clean

---

## Background

Rollup emitted circular dependency warnings for 11 cycles within the `js/` source tree during `npm run build`. Circular imports are not runtime errors in bundled code but can cause subtle initialization-order bugs and make the dependency graph harder to reason about.

One additional cycle in `node_modules/igv-utils` was identified but left alone (it is in a dependency we do not control).

---

## Strategies Used

Three strategies were applied, chosen per cycle based on the nature of the dependency:

1. **Remove unused import** — the import causing the cycle was simply dead code.
2. **Extract to shared file** — pure utilities or constants that logically belong to neither dependent module were moved to a new, neutral file.
3. **Dynamic import** — where a class or function is only needed inside an `async` method (not at module initialization), the static import was replaced with `await import(...)` at the call site.

---

## New Files Created

| File | Contents | Cycle(s) Fixed |
|---|---|---|
| `js/bam/bamConstants.js` | `COVERAGE_TRACK_HEIGHT = 50` | 2 |
| `js/feature/wigUtils.js` | `summarizeData`, `SummaryBinData` | 4 |
| `js/util/translationDict.js` | `translationDict` codon→amino acid map | 5, 6 |
| `js/util/browserDefaults.js` | `setDefaults`, `defaultOptions` | 8 |
| `js/roi/roiUtils.js` | `createRegionKey`, `parseRegionKey` | 9 |
| `js/ui/menuConstants.js` | `autoScaleGroupColorHash`, `multiTrackSelectExclusionTypes` | 11 |

---

## The 11 Cycles and Their Fixes

### Cycle 1: `bam/mods/baseModificationUtils.js` ↔ `bam/mods/baseModificationSet.js`

| Direction | Import |
|---|---|
| A | `baseModificationUtils.js` imports `BaseModificationSet` class |
| B | `baseModificationSet.js` imports `byteToUnsignedInt` from `baseModificationUtils.js` |

**Fix:** The import of `byteToUnsignedInt` in `baseModificationSet.js` was unused. Removed the import line.

**Files changed:** `baseModificationSet.js`

---

### Cycle 2: `bam/alignmentTrack.js` ↔ `bam/bamTrack.js`

| Direction | Import |
|---|---|
| A | `alignmentTrack.js` imported `BAMTrack` to access `BAMTrack.coverageTrackHeight` (one usage) |
| B | `bamTrack.js` imports `AlignmentTrack` class |

`BAMTrack.coverageTrackHeight` was just the literal `50` stored in `BAMTrack.static defaults`.

**Fix:** Created `js/bam/bamConstants.js` exporting `COVERAGE_TRACK_HEIGHT = 50`. Updated `alignmentTrack.js` to import from there and removed the `BAMTrack` import. Updated `bamTrack.js` to use the constant in its `static defaults`.

**Files changed:** `alignmentTrack.js`, `bamTrack.js`
**Files created:** `bamConstants.js`

---

### Cycle 3: `feature/featureSource.js` ↔ `feature/listFeatureSource.js`

| Direction | Import |
|---|---|
| A | `featureSource.js` imports `ListFeatureSource` class |
| B | `listFeatureSource.js` imports `FeatureSource` factory function |

`FeatureSource` was only used inside `ListFeatureSource`'s `async init()` method.

**Fix:** Replaced the static import in `listFeatureSource.js` with a dynamic import at the call site:
```js
const {default: FeatureSource} = await import('./featureSource.js')
```

**Files changed:** `listFeatureSource.js`

---

### Cycle 4: `feature/featureSource.js` → `feature/textFeatureSource.js` → `feature/wigTrack.js` → `feature/featureSource.js`

`textFeatureSource.js` imported `summarizeData` from `wigTrack.js`, and `wigTrack.js` imported `FeatureSource` from `featureSource.js`.

**Fix:** Created `js/feature/wigUtils.js` and moved `summarizeData` (and the supporting `SummaryBinData` class) there. Updated `wigTrack.js` to import from `wigUtils.js` (and removed the local definitions), updated `textFeatureSource.js` to import from `wigUtils.js`. `wigTrack.js` re-exports `summarizeData` to preserve any external API.

**Files changed:** `wigTrack.js`, `textFeatureSource.js`
**Files created:** `wigUtils.js`

---

### Cycles 5 & 6: `sequenceTrack.js` / `feature/exonUtils.js` → `blat/blatTrack.js` → `feature/featureTrack.js` → `feature/render/renderFeature.js` → `sequenceTrack.js`

Both `feature/exonUtils.js` and `feature/render/renderFeature.js` imported `translationDict` from `sequenceTrack.js`. `sequenceTrack.js` imports `createBlatTrack` from `blat/blatTrack.js`, which chains back through `featureTrack.js` → `renderFeature.js`.

`translationDict` is a static data structure (codon→amino acid mapping) with no runtime dependencies on `sequenceTrack`.

**Fix:** Created `js/util/translationDict.js` exporting `translationDict`. Updated `sequenceTrack.js` to import from there (and still re-exports it). Updated `exonUtils.js` and `renderFeature.js` to import from `util/translationDict.js`.

**Files changed:** `sequenceTrack.js`, `feature/exonUtils.js`, `feature/render/renderFeature.js`
**Files created:** `util/translationDict.js`

---

### Cycle 7: `ucsc/hub/hubParser.js` ↔ `ucsc/hub/hub.js`

| Direction | Import |
|---|---|
| A | `hubParser.js` imports `Hub` class |
| B | `hub.js` imported `loadStanzas` from `hubParser.js` |

`loadStanzas` was only called inside an `async` method in `hub.js`.

**Fix:** Replaced the static import in `hub.js` with a dynamic import at the call site:
```js
const {loadStanzas} = await import('./hubParser.js')
```

**Files changed:** `ucsc/hub/hub.js`

---

### Cycle 8: `browser.js` ↔ `igv-create.js`

| Direction | Import |
|---|---|
| A | `igv-create.js` imports `Browser` class |
| B | `browser.js` imported `setDefaults` from `igv-create.js` |

`setDefaults` and `defaultOptions` were pure utilities with no dependency on `Browser` state.

**Fix:** Created `js/util/browserDefaults.js` exporting both. Updated `browser.js` to import from there. Updated `igv-create.js` to import `setDefaults` from there and removed the local definitions; the export list in `igv-create.js` still exports `setDefaults` (now re-exported) to preserve the public API.

**Files changed:** `browser.js`, `igv-create.js`
**Files created:** `util/browserDefaults.js`

---

### Cycle 9: `roi/ROIManager.js` ↔ `roi/ROITable.js`

| Direction | Import |
|---|---|
| A | `ROIManager.js` imports `ROITable` class |
| B | `ROITable.js` imported `createRegionKey` and `parseRegionKey` from `ROIManager.js` |

`createRegionKey` and `parseRegionKey` were pure string utilities with no dependency on `ROIManager` state.

**Fix:** Created `js/roi/roiUtils.js` exporting both functions. Updated `ROIManager.js` to import from there and removed the local definitions (the re-export from `ROIManager.js` was preserved). Updated `ROITable.js` to import from `roiUtils.js`.

**Files changed:** `roi/ROIManager.js`, `roi/ROITable.js`
**Files created:** `roi/roiUtils.js`

---

### Cycle 10: `cnvpytor/cnvpytorTrack.js` ↔ `variant/variantTrack.js`

| Direction | Import |
|---|---|
| A | `cnvpytorTrack.js` imported `VariantTrack` (used in `Object.setPrototypeOf` inside `async convertToVariant()`) |
| B | `variantTrack.js` imported `CNVPytorTrack` (used in `Object.setPrototypeOf` inside a `setTimeout(async () => {...})`) |

Both usages were inside async contexts, not at module initialization.

**Fix:** Replaced both static imports with dynamic imports at the call site:

In `cnvpytorTrack.js`:
```js
const {default: VariantTrack} = await import('../variant/variantTrack.js')
```

In `variantTrack.js`:
```js
const {default: CNVPytorTrack} = await import('../cnvpytor/cnvpytorTrack.js')
```

**Files changed:** `cnvpytor/cnvpytorTrack.js`, `variant/variantTrack.js`

---

### Cycle 11: `trackView.js` ↔ `ui/menuUtils.js`

| Direction | Import |
|---|---|
| A | `trackView.js` imported `autoScaleGroupColorHash` and `multiTrackSelectExclusionTypes` from `menuUtils.js` |
| B | `menuUtils.js` imports `TrackView` class from `trackView.js` |

Both values were simple constants (`{}` and `new Set([...])`) with no dependencies.

**Fix:** Created `js/ui/menuConstants.js` exporting both constants. Updated `trackView.js` to import from `menuConstants.js`. Updated `menuUtils.js` to import from `menuConstants.js` and removed the local definitions; the exports from `menuUtils.js` were preserved (now re-exported) to maintain the existing API.

**Files changed:** `trackView.js`, `ui/menuUtils.js`
**Files created:** `ui/menuConstants.js`

---

## Verification

```
npm run build   # Only igv-utils external warning remains
npm test        # 245 tests pass
```
