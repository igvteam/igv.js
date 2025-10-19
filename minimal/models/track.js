/**
 * Immutable track configuration
 */
export class TrackConfig {
    constructor({type, url, name, color, height, graphType, indexed, format, order, windowFunction, metadata, ...options}) {
        // Infer type from format if not provided
        this.type = type || this.inferTypeFromFormat(format)
        this.url = url
        this.name = name || this.inferNameFromUrl(url)
        this.color = color || 'rgb(150, 150, 150)'
        this.height = height || 50
        this.graphType = graphType || 'bar'
        this.indexed = indexed !== undefined ? indexed : true
        this.format = format
        this.order = order
        this.windowFunction = windowFunction
        this.metadata = metadata
        this.options = options
        Object.freeze(this)
    }

    inferTypeFromFormat(format) {
        if (!format) return undefined
        
        const formatLower = format.toLowerCase()
        
        // Map common formats to track types
        if (formatLower === 'refgene' || formatLower === 'genepred' || formatLower === 'genepredext') {
            return 'refseq'
        } else if (formatLower === 'bigwig' || formatLower === 'wig' || formatLower === 'bedgraph') {
            return 'wig'
        } else if (formatLower === 'bed' || formatLower === 'gff' || formatLower === 'gtf') {
            return 'feature'
        } else if (formatLower === 'vcf') {
            return 'variant'
        } else if (formatLower === 'bam' || formatLower === 'cram') {
            return 'alignment'
        }
        
        return undefined
    }

    inferNameFromUrl(url) {
        if (!url) return 'Track'
        if (typeof url !== 'string') return 'Track'
        
        // Extract filename from URL
        const parts = url.split('/')
        const filename = parts[parts.length - 1]
        return filename.split('?')[0] // Remove query parameters
    }
}

