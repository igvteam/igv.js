/**
 * Data source for RefSeq gene annotation tracks
 */
export class RefSeqSource {
    constructor(config) {
        this.config = config
        this.url = config.url
        this.format = config.format || 'refgene'
    }

    /**
     * Fetch gene annotation data for a region
     * @param {object} region - GenomicRegion object
     * @param {number} bpPerPixel - Base pairs per pixel (not used for genes)
     * @returns {Promise<Array>} Array of gene features
     */
    async fetch(region, bpPerPixel) {
        try {
            console.log('RefSeqSource: Fetching gene data for region:', region)
            
            const response = await fetch(this.url)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`)
            }

            // Handle gzipped data
            let text
            if (this.url.endsWith('.gz')) {
                const arrayBuffer = await response.arrayBuffer()
                const decompressed = await this.decompressGzip(arrayBuffer)
                text = new TextDecoder().decode(decompressed)
            } else {
                text = await response.text()
            }
            
            console.log('RefSeqSource: Fetched text, length:', text.length, 'first 200 chars:', text.substring(0, 200))
            const features = this.parseRefGeneData(text, region)
            
            console.log('RefSeqSource: Parsed', features.length, 'gene features')
            if (features.length > 0) {
                console.log('RefSeqSource: Sample feature:', features[0])
            }
            return features
        } catch (error) {
            console.error('Error fetching RefSeq data:', error)
            throw error
        }
    }

    /**
     * Parse RefSeq gene data format
     * @param {string} text - Raw RefSeq data
     * @param {object} region - GenomicRegion object
     * @returns {Array} Array of gene features
     */
    parseRefGeneData(text, region) {
        const lines = text.trim().split('\n')
        const features = []
        let skippedLines = 0
        let parsedLines = 0
        let matchedLines = 0
        
        console.log('RefSeqSource: Parsing', lines.length, 'lines for region', region.chr, region.start, '-', region.end)
        
        lines.forEach((line, index) => {
            if (line.startsWith('#') || line.trim() === '') {
                skippedLines++
                return // Skip comments and empty lines
            }
            
            try {
                parsedLines++
                const feature = this.parseRefGeneLine(line, region)
                if (feature) {
                    matchedLines++
                    features.push(feature)
                }
            } catch (error) {
                console.warn(`Error parsing RefSeq line ${index + 1}:`, error)
            }
        })
        
        console.log('RefSeqSource: Skipped', skippedLines, 'lines, parsed', parsedLines, 'lines, matched', matchedLines, 'features in region')
        return features
    }

    /**
     * Parse a single RefSeq line
     * @param {string} line - RefSeq line
     * @param {object} region - GenomicRegion object
     * @returns {object|null} Parsed feature or null if not in region
     */
    parseRefGeneLine(line, region) {
        const fields = line.split('\t')
        
        if (fields.length < 12) {
            return null // Invalid line
        }
        
        const [
            bin,
            name,
            chrom,
            strand,
            txStart,
            txEnd,
            cdsStart,
            cdsEnd,
            exonCount,
            exonStarts,
            exonEnds,
            score,
            name2,
            cdsStartStat,
            cdsEndStat,
            exonFrames
        ] = fields

        // Convert to 0-based coordinates (RefSeq is 0-based)
        const start = parseInt(txStart, 10)
        const end = parseInt(txEnd, 10)
        
        // Check if feature overlaps with the region
        if (chrom !== region.chr || end < region.start || start > region.end) {
            return null
        }

        // Parse exon information
        const exons = this.parseExons(exonStarts, exonEnds, start, end, region)
        
        return {
            type: 'gene',
            name: name2 || name,
            chr: chrom,
            start: start,
            end: end,
            strand: strand,
            exons: exons,
            transcriptStart: start,
            transcriptEnd: end,
            cdsStart: parseInt(cdsStart, 10),
            cdsEnd: parseInt(cdsEnd, 10),
            exonCount: parseInt(exonCount, 10),
            score: parseInt(score, 10)
        }
    }

    /**
     * Parse exon information from RefSeq line
     * @param {string} exonStarts - Comma-separated exon start positions
     * @param {string} exonEnds - Comma-separated exon end positions
     * @param {number} geneStart - Gene start position
     * @param {number} geneEnd - Gene end position
     * @param {object} region - GenomicRegion object
     * @returns {Array} Array of exon objects
     */
    parseExons(exonStarts, exonEnds, geneStart, geneEnd, region) {
        if (!exonStarts || !exonEnds) {
            return []
        }
        
        const starts = exonStarts.split(',').map(s => parseInt(s.trim(), 10))
        const ends = exonEnds.split(',').map(s => parseInt(s.trim(), 10))
        
        const exons = []
        
        for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
            const start = starts[i]
            const end = ends[i]
            
            if (!isNaN(start) && !isNaN(end) && end > start) {
                // Check if exon overlaps with region
                if (end >= region.start && start <= region.end) {
                    exons.push({
                        start: start,
                        end: end,
                        length: end - start
                    })
                }
            }
        }
        
        return exons
    }

    /**
     * Get the URL for this RefSeq source
     * @returns {string} RefSeq URL
     */
    getUrl() {
        return this.url
    }

    /**
     * Get the format of this RefSeq source
     * @returns {string} Format type
     */
    getFormat() {
        return this.format
    }

    /**
     * Decompress gzipped data using pako library
     * @param {ArrayBuffer} arrayBuffer - Gzipped data
     * @returns {Uint8Array} Decompressed data
     */
    async decompressGzip(arrayBuffer) {
        // Import pako dynamically since it's already loaded by igv-utils
        const pako = await import('/node_modules/igv-utils/src/pako.esm.js')
        return pako.inflate(new Uint8Array(arrayBuffer))
    }
}
