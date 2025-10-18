# IGV Minimal Core

A radically simplified genome browser implementation with clean separation of concerns.

## Architecture

The minimal core is built on strict separation of responsibilities:

```
Configuration
    ↓
Browser (Coordinator)
    ├─→ DataLoader → DataSources → Domain Models
    ├─→ ViewModelBuilder → TrackViewModels  
    ├─→ UIManager → DOM Elements + Canvas
    └─→ Renderers → Paint to Canvas
```

### Key Principles

1. **Unidirectional data flow**: Config → Data → ViewModel → Render
2. **Immutability**: Data structures never mutate
3. **Pure functions**: Renderers have no side effects
4. **Single responsibility**: Each class does ONE thing
5. **Explicit dependencies**: No hidden globals or browser references

## Structure

```
minimal/
  index.js              # Public API entry point
  core/
    browser.js          # Main browser coordinator
  data/
    dataLoader.js       # Orchestrates data fetching
    wigSource.js        # Wig/bedgraph data source
    featureSource.js    # Gene/refseq data source
  models/
    genomicRegion.js    # Domain model for regions
    track.js            # Track configuration model
  viewmodel/
    viewModelBuilder.js # Transforms data to renderable state
    wigViewModel.js     # Wig track view model
    geneViewModel.js    # Gene track view model
  render/
    wigRenderer.js      # Wig track canvas renderer
    geneRenderer.js     # Gene track canvas renderer
    axisRenderer.js     # Y-axis renderer
    rendererRegistry.js # Maps track types to renderers
  ui/
    uiManager.js        # DOM/canvas creation
    canvas.js           # Canvas wrapper utilities
  util/
    colors.js           # Color utilities
    scale.js            # Y-axis scale calculations
```

## Usage

### Basic Example

```javascript
import IGV from './minimal/index.js'

const browser = await IGV.create(
  document.getElementById('igv-container'),
  {
    locus: 'chr1:1000000-1001000',
    tracks: [
      {
        type: 'wig',
        url: 'data.bedgraph',
        name: 'Sample Track',
        color: 'blue',
        height: 100
      }
    ]
  }
)
```

### Update Locus

```javascript
await browser.setLocus('chr2:5000-6000')
```

### Cleanup

```javascript
browser.destroy()
```

## Supported Track Types

### Wig Tracks
- **Format**: bedgraph, wig
- **Config**:
  ```javascript
  {
    type: 'wig',
    url: 'path/to/file.bedgraph',
    name: 'Track Name',
    color: 'rgb(0, 0, 255)',
    height: 100,
    graphType: 'bar'  // 'bar', 'line', or 'points'
  }
  ```

### Feature/Gene Tracks
- **Format**: BED, BED12
- **Config**:
  ```javascript
  {
    type: 'refseq', // or 'gene', 'feature'
    url: 'path/to/genes.bed',
    name: 'Genes',
    color: 'rgb(0, 100, 150)',
    height: 150
  }
  ```

## What's Different from IGV.js

### Removed Complexity
- ❌ No pan/zoom
- ❌ No multi-locus views
- ❌ No complex event system
- ❌ No shadow DOM
- ❌ No session management
- ❌ No ROI manager
- ❌ No sample info panels
- ❌ No track menus
- ❌ No viewport caching

### What Remains
- ✅ Static track rendering
- ✅ Multiple track types
- ✅ Clean API
- ✅ Embeddable in any web app
- ✅ Self-contained instances
- ✅ ~1000 lines of core code

## Running the Demo

Open `demo.html` in a web browser (needs to be served via HTTP server due to ES6 modules):

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx http-server

# Then open: http://localhost:8000/minimal/demo.html
```

## Design Goals

1. **Embeddability**: Works in any web application without conflicts
2. **Simplicity**: Single-purpose, minimal API surface
3. **Maintainability**: Clean separation makes changes isolated
4. **Testability**: Pure functions and explicit dependencies
5. **Performance**: No unnecessary recomputation or caching complexity

## Future Extensions

The architecture supports plugins:
- Custom renderers for new track types
- Hover tooltips as optional plugin
- Export functionality as plugin
- Custom data sources

Register custom renderer:
```javascript
import { RendererRegistry } from './minimal/render/rendererRegistry.js'

class CustomRenderer {
  static render(ctx, viewModel, dimensions) {
    // Your rendering logic
  }
}

RendererRegistry.register('custom', CustomRenderer)
```

## Development

### Adding a New Track Type

1. Create a data source in `data/`
2. Create a view model in `viewmodel/`
3. Create a renderer in `render/`
4. Register in `rendererRegistry.js`
5. Update `DataLoader` to route to your source

### Key Extension Points

- **DataLoader.getSource()**: Add new data source types
- **ViewModelBuilder.build()**: Add new view model types
- **RendererRegistry**: Register new renderers

## License

Same as IGV.js (MIT)

