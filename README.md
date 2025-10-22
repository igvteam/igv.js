# IGV Minimal Browser

A lightweight, embeddable genome browser with clean architecture and modern design.

## Features

- Clean, modular architecture with separation of concerns
- HiDPI/Retina display support
- Responsive layout with resize handling
- Gene name search (e.g., EGFR, TP53, BRCA1)
- Ideogram track with cytoband visualization
- Multiple track types: sequence, genes, WIG/BigWig
- Genomic ruler with adaptive tick spacing
- Zero build step - pure ES modules

## Installation

### From GitHub (Recommended)

```bash
npm install github:igvteam/igv.js#minimal-branch
```

### Usage

```javascript
import IGV from 'igv-minimal'

const browser = await IGV.create(
  document.getElementById('container'),
  {
    genome: "hg19",
    locus: "EGFR",
    showIdeogram: true,
    includeDefaultTracks: true,
    tracks: [
      {
        name: "Custom Signal",
        url: "https://example.com/data.bigWig",
        type: "wig",
        format: "bigwig",
        height: 128,
        color: "rgb(255, 41, 135)"
      }
    ]
  }
)
```

## API

### Create Browser
```javascript
const browser = await IGV.create(container, config)
```

### Navigate to Locus
```javascript
await browser.setLocus('chr1:1000000-2000000')
// or
await browser.setLocus('TP53')
```

### Cleanup
```javascript
browser.destroy()
```

## Configuration

### Genome
```javascript
{
  genome: "hg19",  // Genome ID or full config object
  locus: "chr1:1-100000",  // Initial locus
  showIdeogram: true,  // Show chromosome ideogram
  includeDefaultTracks: true  // Load sequence + RefSeq tracks
}
```

### Track Types

#### WIG/BigWig Track
```javascript
{
  type: "wig",
  format: "bigwig",  // or "bedgraph"
  url: "https://example.com/signal.bigWig",
  name: "Signal Track",
  color: "rgb(0, 150, 0)",
  height: 100
}
```

#### Gene/RefSeq Track
```javascript
{
  type: "refseq",
  url: "https://example.com/genes.bed",
  name: "Genes",
  color: "rgb(0, 100, 150)",
  height: 150
}
```

#### Sequence Track
```javascript
{
  type: "sequence",
  height: 50
  // URL comes from genome config
}
```

## Architecture

```
Configuration
    ↓
Browser (Orchestrator)
    ├─→ DataLoader → DataSources → Domain Models
    ├─→ ViewModelBuilder → TrackViewModels
    ├─→ UIManager → DOM + Canvas (HiDPI)
    └─→ Renderers → Pure rendering functions
```

### Key Principles
1. Unidirectional data flow
2. Immutable data structures
3. Pure rendering functions
4. Single responsibility per module
5. Explicit dependencies

## Project Structure

```
minimal/
  index.js              - Public API
  core/
    browser.js          - Main orchestrator
  data/
    dataLoader.js       - Data fetching coordination
    wigSource.js        - WIG/BigWig data source
    bigwigSource.js     - BigWig reader
    featureSource.js    - Gene/feature data source
    sequenceSource.js   - DNA sequence data source
    cytobandSource.js   - Cytoband data source
  genome/
    genomeResolver.js   - Genome configuration
    chromosomeInfo.js   - Chromosome metadata
    search.js           - Gene name search
    loadSequence.js     - Sequence loading
  models/
    genomicRegion.js    - Genomic region model
    track.js            - Track configuration
    genome.js           - Genome configuration
    cytoband.js         - Cytoband model
  viewmodel/
    viewModelBuilder.js - ViewModel factory
    wigViewModel.js     - WIG track ViewModel
    geneViewModel.js    - Gene track ViewModel
    sequenceViewModel.js - Sequence ViewModel
    ideogramViewModel.js - Ideogram ViewModel
    rulerViewModel.js   - Ruler ViewModel
  render/
    rendererRegistry.js - Renderer lookup
    wigRenderer.js      - WIG rendering
    geneRenderer.js     - Gene rendering
    sequenceRenderer.js - Sequence rendering
    ideogramRenderer.js - Ideogram rendering
    rulerRenderer.js    - Ruler rendering
  ui/
    uiManager.js        - DOM management
    canvas.js           - HiDPI canvas utilities
  util/
    colors.js           - Color utilities
    scale.js            - Scaling functions
    igvUtils.js         - Utility functions
  bigwig/
    bwReader.js         - BigWig file reader
    [...]               - BigWig support files
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support

Requires ES6 modules support (all modern browsers).

## Development

### Running the Demo

```bash
python -m http.server 8000
# Open: http://localhost:8000/minimal.html
```

### Adding Custom Track Types

1. Create data source in `data/`
2. Create ViewModel in `viewmodel/`
3. Create renderer in `render/`
4. Register in `rendererRegistry.js`

## Performance

- No build step required
- Lazy-loads data on demand
- HiDPI canvas rendering
- Efficient resize handling with debouncing

## License

MIT - see LICENSE file

## Legacy IGV.js

The full-featured IGV.js library has been archived to `legacy/`. This minimal browser focuses on core functionality with modern architecture.
