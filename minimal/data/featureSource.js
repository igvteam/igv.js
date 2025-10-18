/**
 * Data source for gene/feature files (bed, gff, etc.)
 * Simplified implementation for bed format
 */
export class FeatureSource {
    constructor(config) {
        this.url = config.url
    }

    /**
     * Fetch features for a genomic region
     * @param region - Genomic region
     * @param bpPerPixel - Basepairs per pixel (not used for text files, but kept for API consistency)
     */
    async fetch(region, bpPerPixel) {
        try {
            const response = await fetch(this.url)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const text = await response.text()
            return this.parseFeatures(text, region)
        } catch (error) {
            console.error('Error fetching feature data:', error)
            return []
        }
    }

    /**
     * Parse bed format features from text
     */
    parseFeatures(text, region) {
        const lines = text.split('\n')
        const features = []

        for (const line of lines) {
            // Skip comments and empty lines
            if (!line || line.startsWith('#') || line.startsWith('track') || 
                line.startsWith('browser')) {
                continue
            }

            const feature = this.parseBedLine(line)
            if (!feature) continue

            // Filter to region
            if (feature.chr !== region.chr) continue
            if (feature.end < region.start || feature.start > region.end) continue

            features.push(feature)
        }

        return features
    }

    /**
     * Parse a single BED format line
     * BED format: chr start end name score strand thickStart thickEnd itemRgb blockCount blockSizes blockStarts
     */
    parseBedLine(line) {
        const tokens = line.split('\t')
        if (tokens.length < 3) return null

        const chr = tokens[0]
        const start = parseInt(tokens[1])
        const end = parseInt(tokens[2])

        if (isNaN(start) || isNaN(end)) return null

        const feature = { chr, start, end }

        // Optional fields
        if (tokens.length > 3) feature.name = tokens[3]
        if (tokens.length > 4) feature.score = parseFloat(tokens[4])
        if (tokens.length > 5) feature.strand = tokens[5]
        if (tokens.length > 6) feature.thickStart = parseInt(tokens[6])
        if (tokens.length > 7) feature.thickEnd = parseInt(tokens[7])
        if (tokens.length > 8) feature.color = this.parseColor(tokens[8])

        // Parse exon structure from BED12 format
        if (tokens.length >= 12) {
            const blockCount = parseInt(tokens[9])
            const blockSizes = tokens[10].split(',').filter(s => s).map(s => parseInt(s))
            const blockStarts = tokens[11].split(',').filter(s => s).map(s => parseInt(s))

            if (blockCount > 0 && blockSizes.length === blockCount && blockStarts.length === blockCount) {
                feature.exons = []
                for (let i = 0; i < blockCount; i++) {
                    feature.exons.push({
                        start: start + blockStarts[i],
                        end: start + blockStarts[i] + blockSizes[i]
                    })
                }
            }
        }

        return feature
    }

    /**
     * Parse BED color format (R,G,B)
     */
    parseColor(colorString) {
        if (!colorString || colorString === '.' || colorString === '0') {
            return undefined
        }
        
        // Check if it's already a valid format
        if (colorString.startsWith('rgb') || colorString.startsWith('#')) {
            return colorString
        }
        
        // Assume R,G,B format
        return `rgb(${colorString})`
    }
}

