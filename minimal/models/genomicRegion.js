/**
 * Immutable representation of a genomic region
 */
export class GenomicRegion {
    constructor(chr, start, end) {
        this.chr = chr
        this.start = start
        this.end = end
        this.length = end - start
        Object.freeze(this)
    }

    /**
     * Parse a locus string in formats like:
     * - "chr1:1000-2000"
     * - "1:1000-2000"
     * - "chr1:1,000-2,000"
     */
    static parse(locusString, chromosomeInfo = null) {
        if (!locusString || typeof locusString !== 'string') {
            throw new Error('Invalid locus string')
        }

        // Remove commas
        const cleaned = locusString.replace(/,/g, '')

        // Parse chr:start-end format
        const match = cleaned.match(/^([^:]+):(\d+)-(\d+)$/)
        if (!match) {
            throw new Error(`Invalid locus format: ${locusString}. Expected format: chr:start-end`)
        }

        const [, chr, startStr, endStr] = match
        const start = parseInt(startStr, 10)
        const end = parseInt(endStr, 10)

        if (start >= end) {
            throw new Error(`Invalid locus: start (${start}) must be less than end (${end})`)
        }

        // Normalize chromosome name if chromosome info is available
        let normalizedChr = chr
        if (chromosomeInfo) {
            normalizedChr = chromosomeInfo.normalize(chr)
            
            // Validate chromosome exists
            if (!chromosomeInfo.hasChromosome(chr)) {
                throw new Error(`Unknown chromosome: ${chr}`)
            }
            
            // Validate region is within chromosome bounds
            if (!chromosomeInfo.validateRegion(normalizedChr, start, end)) {
                const chrSize = chromosomeInfo.getSize(normalizedChr)
                throw new Error(`Region ${start}-${end} is outside chromosome ${normalizedChr} bounds (0-${chrSize})`)
            }
        }

        return new GenomicRegion(normalizedChr, start, end)
    }

    toString() {
        return `${this.chr}:${this.start}-${this.end}`
    }
}

