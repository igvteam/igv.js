/**
 * Data source for sequence tracks - fetches DNA sequence data
 */
export class SequenceSource {
    constructor(config) {
        this.config = config
        this.sequenceUrl = config.fastaURL || config.twoBitURL || config.url
        this.format = config.format || this.detectFormat(this.sequenceUrl)
    }

    /**
     * Detect sequence format from URL
     * @param {string} url - Sequence URL
     * @returns {string} Format type
     */
    detectFormat(url) {
        if (!url) {
            return 'unknown'
        }
        const lowerUrl = url.toLowerCase()
        if (lowerUrl.includes('.2bit') || lowerUrl.includes('2bit')) {
            return '2bit'
        } else if (lowerUrl.includes('.fa') || lowerUrl.includes('.fasta')) {
            return 'fasta'
        }
        return 'fasta' // Default
    }

    /**
     * Fetch sequence data for a region
     * @param {object} region - GenomicRegion object
     * @param {number} bpPerPixel - Base pairs per pixel
     * @returns {Promise<Array>} Array of sequence data points
     */
    async fetch(region, bpPerPixel) {
        // Only fetch sequence data when zoomed in enough to see individual bases
        const SEQUENCE_THRESHOLD = 1.0 // Show bases when bpPerPixel < 1.0
        
        if (bpPerPixel >= SEQUENCE_THRESHOLD) {
            // Too zoomed out to show individual bases
            return []
        }

        try {
            console.log('SequenceSource: Fetching sequence for region:', region, 'bpPerPixel:', bpPerPixel)
            
            // For now, return a placeholder structure
            // In a full implementation, this would fetch actual sequence data
            // from the FASTA or 2bit file and parse it
            
            const sequenceData = this.generatePlaceholderSequence(region)
            console.log('SequenceSource: Generated', sequenceData.length, 'sequence characters')
            
            return sequenceData
        } catch (error) {
            console.error('Error fetching sequence data:', error)
            throw error
        }
    }

    /**
     * Generate placeholder sequence data for testing
     * @param {object} region - GenomicRegion object
     * @returns {Array} Array of sequence characters with positions
     */
    generatePlaceholderSequence(region) {
        const sequence = []
        const length = region.length
        
        // Generate a simple repeating pattern for testing
        const bases = ['A', 'T', 'G', 'C']
        
        for (let i = 0; i < Math.min(length, 1000); i++) { // Limit to 1000 bases for performance
            const position = region.start + i
            const base = bases[i % 4]
            
            sequence.push({
                position: position,
                base: base,
                chr: region.chr,
                start: position,
                end: position + 1
            })
        }
        
        return sequence
    }

    /**
     * Parse FASTA sequence data (placeholder implementation)
     * @param {string} fastaData - Raw FASTA data
     * @param {object} region - GenomicRegion object
     * @returns {Array} Parsed sequence data
     */
    parseFastaSequence(fastaData, region) {
        // This would parse actual FASTA format
        // For now, return placeholder data
        return this.generatePlaceholderSequence(region)
    }

    /**
     * Parse 2bit sequence data (placeholder implementation)
     * @param {ArrayBuffer} twoBitData - Raw 2bit data
     * @param {object} region - GenomicRegion object
     * @returns {Array} Parsed sequence data
     */
    parseTwoBitSequence(twoBitData, region) {
        // This would parse actual 2bit format
        // For now, return placeholder data
        return this.generatePlaceholderSequence(region)
    }

    /**
     * Get the URL for this sequence source
     * @returns {string} Sequence URL
     */
    getUrl() {
        return this.sequenceUrl
    }

    /**
     * Get the format of this sequence source
     * @returns {string} Format type
     */
    getFormat() {
        return this.format
    }
}
