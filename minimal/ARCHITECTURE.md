# Architecture Guide

## The Minimal Core Philosophy

**Old IGV.js**: Kitchen sink - everything needed for every possible use case, tightly coupled.

**Minimal Core**: Essential only - what you need for static genomic visualization, loosely coupled.

## Layer Diagram

```
┌─────────────────────────────────────────────────────┐
│                   APPLICATION                        │
│  (Your React/Vue/Vanilla JS app)                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ IGV.create(container, config)
                   │
┌──────────────────▼──────────────────────────────────┐
│              PUBLIC API (index.js)                   │
│  - Validates inputs                                  │
│  - Creates browser instance                          │
│  - Returns handle                                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   │
┌──────────────────▼──────────────────────────────────┐
│         BROWSER COORDINATOR (browser.js)             │
│  - Orchestrates all layers                           │
│  - Manages lifecycle: load() → render() → destroy()  │
│  - NO business logic, just coordination              │
└─────┬────────┬────────┬────────┬─────────────────────┘
      │        │        │        │
      │        │        │        │
┌─────▼───┐ ┌─▼─────┐ ┌▼──────┐ ┌▼────────┐
│ MODELS  │ │ DATA  │ │ VIEW  │ │   UI    │
│         │ │ LAYER │ │ MODEL │ │ MANAGER │
└─────────┘ └───┬───┘ └───┬───┘ └───┬─────┘
                │         │         │
                │         │         │
        ┌───────▼─────────▼─────────▼───────┐
        │        RENDERING LAYER             │
        │  (Canvas drawing)                  │
        └────────────────────────────────────┘
```

## Data Flow

### Forward Flow (Config → Pixels)

```
1. User Config
   {
     locus: "chr1:1000-2000",
     tracks: [{ type: 'wig', url: '...' }]
   }
   ↓

2. Domain Models (Immutable)
   GenomicRegion { chr: "chr1", start: 1000, end: 2000 }
   TrackConfig { type: "wig", url: "...", color: "blue" }
   ↓

3. Data Fetching (Pure I/O)
   WigSource.fetch(region)
   → [{ chr, start, end, value }, ...]
   ↓

4. View Model (Render-Ready)
   WigViewModel {
     dataPoints: [...],
     xScale: LinearScale(1000, 2000, 0, 800),
     yScale: LinearScale(0, 100, 150, 0),
     color: "blue"
   }
   ↓

5. Rendering (Pure Function)
   WigRenderer.render(ctx, viewModel, dimensions)
   → Pixels on canvas
```

### No Backward Flow
- No events from renderer back to data
- No mutations of view models
- No state stored in renderers
- Unidirectional = Predictable

## Responsibility Matrix

| Layer | Responsibility | What It Does | What It Doesn't Do |
|-------|----------------|--------------|-------------------|
| **Models** | Data structures | Hold immutable state | Fetch, render, compute |
| **Data** | I/O operations | Read files, parse formats | Store state, know about browser |
| **ViewModel** | Transform data | Compute scales, positions | Fetch data, draw pixels |
| **Renderer** | Draw to canvas | Pure canvas operations | Load data, manage state |
| **UI** | DOM management | Create/destroy elements | Business logic, data fetching |
| **Browser** | Coordination | Connect all layers | Implement domain logic |

## Component Interactions

### Example: Rendering a Wig Track

```javascript
// 1. Browser creates track config
const trackConfig = new TrackConfig({
  type: 'wig',
  url: 'data.bedgraph',
  color: 'blue'
})

// 2. Browser asks DataLoader to fetch
const data = await dataLoader.load(trackConfig, region)
// DataLoader asks WigSource
// WigSource fetches and parses file
// Returns: [{ chr: 'chr1', start: 1000, end: 1100, value: 5.2 }, ...]

// 3. Browser asks ViewModelBuilder to transform
const viewModel = ViewModelBuilder.build(
  trackConfig,  // config
  data,         // raw data
  region,       // genomic region
  { width: 800, height: 100 }  // canvas dimensions
)
// ViewModelBuilder creates WigViewModel
// WigViewModel computes scales, prepares everything for rendering
// Returns: WigViewModel (immutable, frozen)

// 4. Browser asks UI to create canvas
const { canvas } = ui.createTrackUI(viewModel)

// 5. Browser asks Renderer to draw
const renderer = RendererRegistry.get('wig')  // Gets WigRenderer
renderer.render(ctx, viewModel, dimensions)
// WigRenderer draws bars/lines/points to canvas
```

### Key Insight

**Each layer only talks to its immediate neighbor:**
- Browser → DataLoader (not directly to WigSource)
- Browser → ViewModelBuilder (not directly to WigViewModel)
- Browser → RendererRegistry (not directly to WigRenderer)

This is **loose coupling**.

## Design Patterns Used

### 1. Factory Pattern
```javascript
// ViewModelBuilder factory
ViewModelBuilder.build(config, data, region, dimensions)
  → Returns appropriate ViewModel type

// RendererRegistry factory
RendererRegistry.get('wig')
  → Returns appropriate Renderer class
```

### 2. Strategy Pattern
```javascript
// Different rendering strategies for same data
WigRenderer.render(ctx, viewModel, dimensions)
  → Chooses bar/line/points based on viewModel.graphType
```

### 3. Immutable Data
```javascript
// All models are frozen
const region = new GenomicRegion(chr, start, end)
Object.freeze(region)

// Cannot mutate
region.start = 5000  // Error! (or silently fails)
```

### 4. Pure Functions
```javascript
// Renderers are pure functions
WigRenderer.render(ctx, viewModel, dimensions)
  // Same inputs → Same output
  // No side effects (except canvas drawing)
  // No state stored
```

### 5. Dependency Injection
```javascript
// Dependencies passed explicitly
class MinimalBrowser {
  constructor(container, config) {
    this.ui = new UIManager(container)
    this.dataLoader = new DataLoader()
  }
}

// Not created internally, injected at construction
```

## Comparison: Old vs New

### Old Architecture (Entangled)

```
TrackView
  ├─ knows about Browser
  ├─ knows about Track
  ├─ knows about Viewports
  ├─ manages DOM
  ├─ manages caching
  └─ coordinates rendering

Track
  ├─ knows about Browser
  ├─ knows about TrackView
  ├─ has FeatureSource
  ├─ has rendering logic
  ├─ has menu logic
  └─ has popup logic

Browser
  ├─ manages TrackViews
  ├─ manages ReferenceFrames
  ├─ manages Genome
  ├─ creates DOM
  ├─ handles events
  ├─ manages sessions
  └─ manages ROIs

Everything knows about everything!
```

### New Architecture (Separated)

```
Browser (coordinator)
  → uses DataLoader (data layer)
  → uses ViewModelBuilder (transformation layer)
  → uses UIManager (UI layer)
  → uses RendererRegistry (render layer)

DataLoader
  → uses WigSource OR FeatureSource
  → doesn't know about Browser
  → doesn't know about rendering

WigViewModel
  → doesn't know about data fetching
  → doesn't know about rendering
  → just transforms data → positions

WigRenderer
  → doesn't know about data fetching
  → doesn't know about view models creation
  → just draws what it's given

Clean separation!
```

## Benefits of This Architecture

### 1. Testability
```javascript
// Test each layer independently

// Test data layer
const source = new WigSource({ url: 'test.bed' })
const data = await source.fetch(region)
assert(Array.isArray(data))

// Test view model
const vm = new WigViewModel(config, data, region, dims)
assert(vm.xScale.toPixels(1500) === 400)

// Test renderer
const mockCtx = createMockCanvas2D()
WigRenderer.render(mockCtx, vm, dims)
assert(mockCtx.fillRect.called)
```

### 2. Maintainability
```javascript
// Change rendering without touching data layer
class WigRenderer {
  static render(ctx, viewModel, dimensions) {
    // NEW: Add gradient shading
    const gradient = ctx.createLinearGradient(...)
    // ... rest unchanged
  }
}

// Data layer, ViewModel layer = untouched
```

### 3. Extensibility
```javascript
// Add new track type without modifying existing code

// 1. Create new source
class HeatmapSource { ... }

// 2. Create new view model
class HeatmapViewModel { ... }

// 3. Create new renderer
class HeatmapRenderer { ... }

// 4. Register
RendererRegistry.register('heatmap', HeatmapRenderer)

// Done! No changes to existing code.
```

### 4. Debuggability
```javascript
// Easy to inspect at each stage
console.log('Region:', region)
console.log('Raw data:', data)
console.log('ViewModel:', viewModel)

// Each layer produces inspectable output
// No hidden state, no magical transformations
```

## Anti-Patterns Avoided

### ❌ God Object
**Problem**: Browser does everything  
**Solution**: Browser only coordinates, delegates work

### ❌ Tight Coupling
**Problem**: Track knows about Browser, Browser knows about Track  
**Solution**: Pass what's needed as parameters

### ❌ Hidden State
**Problem**: Features cached in viewport, scales in track, data in source  
**Solution**: ViewModel contains all state needed for rendering

### ❌ Circular Dependencies
**Problem**: A imports B, B imports A  
**Solution**: Unidirectional imports, layers don't import each other

### ❌ Side Effects
**Problem**: render() also fetches data, updates caches  
**Solution**: render() only draws, nothing else

## Summary

The minimal core achieves simplicity through:

1. **Separation**: Each layer has one job
2. **Immutability**: Data doesn't change unexpectedly
3. **Purity**: Functions produce same output for same input
4. **Explicitness**: Dependencies passed as parameters
5. **Unidirectionality**: Data flows one way

Result: **1,267 lines** instead of **7,350 lines**, and it's easier to understand, test, and extend.

---

**The secret**: Not adding features cleverly, but removing complexity ruthlessly.

