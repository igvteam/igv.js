# BigWig Support - Future Enhancement

## Current Status

The minimal core currently only supports text-based formats:
- ✅ BedGraph files (.bedgraph)
- ✅ Plain wig files (.wig) - fixedStep and variableStep formats
- ❌ BigWig files (.bw, .bigwig) - **Not yet implemented**

## Why BigWig Support is Needed

BigWig is a binary format used by ENCODE and many other genomic databases for large-scale data. Test case from `wholeLotaWIGs.html`:
```javascript
{
    name: "Homo sapiens GM13977 CTCF",
    url: "https://www.encodeproject.org/files/ENCFF000RQI/@@download/ENCFF000RQI.bigWig",
    format: "bigwig",
    type: "wig"
}
```

This currently fails with a helpful error message because BigWig is a complex binary format that requires specialized parsing.

## Complexity Assessment

BigWig support is **significantly more complex** than WIG/BedGraph because:

1. **Binary Format**: Requires binary parsing, not simple text parsing
2. **Compressed Data**: Uses internal compression (zlib/gzip)
3. **Indexed Structure**: Has R+ tree index for fast random access
4. **Multiple Dependencies**: Requires ~10 additional modules
5. **Range Requests**: Uses HTTP range requests for efficient partial file loading

## Required Dependencies

The existing BigWig implementation in `js/bigwig/` requires:

### Core BigWig Modules
- `bwReader.js` - Main BigWig parser (744 lines)
- `bwSource.js` - Data source wrapper
- `rpTree.js` - R+ tree index reader
- `chromTree.js` - Chromosome name index
- `bpTree.js` - B+ tree index
- `bbDecoders.js` - Binary data decoders
- `bufferedReader.js` - Buffered binary reading
- `trix.js` - Text search index (optional)

### External Dependencies
- `igv-utils` - BGZip, igvxhr, StringUtils
- `binary.js` - Binary parsing utilities
- `util/igvUtils.js` - buildOptions, isDataURL
- `util/ucscUtils.js` - parseAutoSQL

## Implementation Plan

### Option 1: Copy Existing Implementation (Recommended)

Copy the entire `js/bigwig/` directory and required utilities to `minimal/bigwig/`:

1. **Copy BigWig modules** to `minimal/bigwig/`
2. **Copy dependencies**: `binary.js`, utility functions
3. **Install igv-utils** package (already in node_modules)
4. **Create BigWigSource** wrapper for minimal core
5. **Update DataLoader** to detect and use BigWigSource

### 2. Create BigWigSource

```javascript
// minimal/data/bigwigSource.js
import BWReader from '../bigwig/bwReader.js'

export class BigWigSource {
    constructor(config) {
        this.url = config.url
        this.reader = new BWReader(config, null) // No genome needed for minimal core
    }

    async fetch(region) {
        await this.reader.loadHeader()
        const features = await this.reader.readFeatures(
            region.chr, region.start, region.chr, region.end, 
            1, // bpPerPixel - use 1 for full resolution
            'mean' // windowFunction
        )
        
        // Convert to our format: {chr, start, end, value}
        return features.map(f => ({
            chr: f.chr,
            start: f.start,
            end: f.end,
            value: f.value
        }))
    }
}
```

### 3. Update DataLoader

```javascript
// In minimal/data/dataLoader.js
import { BigWigSource } from './bigwigSource.js'

getSource(config) {
    switch (config.type) {
        case 'wig':
            // Check format
            if (config.format === 'bigwig' || 
                config.url.toLowerCase().includes('.bw') ||
                config.url.toLowerCase().includes('.bigwig')) {
                return new BigWigSource(config)
            } else {
                return new WigSource(config)
            }
        // ... other cases
    }
}
```

### 4. Handle Binary Data

The main difference is that BigWig files are binary and need:
- Binary parsing instead of text parsing
- Range requests for large files
- Proper error handling for network issues

## Current Error Handling

The minimal core now properly detects BigWig files and shows a helpful error message:

```javascript
// In wigSource.js - check happens BEFORE fetching
if (this.url.toLowerCase().endsWith('.bw') || 
    this.url.toLowerCase().endsWith('.bigwig')) {
    throw new Error('BigWig format not yet supported in minimal core. Please use bedgraph or wig files instead.')
}
```

This prevents downloading large binary files unnecessarily.

## Testing

A test page is available at `minimal/test-url-bigwig.html` that demonstrates the error handling.

Once BigWig support is implemented, the test case should work:

```javascript
const browser = await IGV.create(container, {
    locus: "chr10:1-120,250,001",
    tracks: [{
        type: 'wig',
        url: 'https://www.encodeproject.org/files/ENCFF059CKF/@@download/ENCFF059CKF.bigWig',
        format: 'bigwig',
        name: 'ENCODE BigWig Track'
    }]
})
```

## Current Workaround

For now, users can:
1. Use local bedgraph files
2. Convert BigWig to bedgraph using tools like `bigWigToBedGraph`
3. Use the existing full IGV.js for BigWig support

## Priority

This is a high-priority enhancement since most real-world genomic data is in BigWig format, especially from ENCODE and similar databases.
