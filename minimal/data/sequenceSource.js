/**
 * Data source for sequence tracks - fetches DNA sequence data from genome
 */
export class SequenceSource {
    constructor(config) {
        this.config = config
        this.sequenceLoader = null // Will be set by DataLoader
        this.bppSequenceThreshold = 10 // Don't fetch sequence if bpPerPixel > 10
    }

    /**
     * Set the sequence loader for fetching sequence
     * @param {object} sequenceLoader - Sequence loader with getSequence method
     */
    setSequenceLoader(sequenceLoader) {
        this.sequenceLoader = sequenceLoader
    }

    /**
     * Fetch sequence data for a region
     * @param {object} region - GenomicRegion object
     * @param {number} bpPerPixel - Base pairs per pixel
     * @returns {Promise<Object|null>} Sequence data object or null if too zoomed out
     */
    async fetch(region, bpPerPixel) {
        // Only fetch sequence data when zoomed in enough
        if (bpPerPixel > this.bppSequenceThreshold) {
            console.log('SequenceSource: Too zoomed out (bpPerPixel:', bpPerPixel, ')')
            return null
        }

        if (!this.sequenceLoader) {
            console.error('SequenceSource: No sequence loader set')
            return null
        }

        try {
            console.log('SequenceSource: Fetching sequence for', region.chr, ':', region.start, '-', region.end, 'bpPerPixel:', bpPerPixel)
            
            // Fetch the actual sequence string from the sequence loader
            const sequenceString = await this.sequenceLoader.getSequence(region.chr, region.start, region.end)
            
            if (!sequenceString) {
                console.error('SequenceSource: No sequence returned for region')
                return null
            }

            console.log('SequenceSource: Fetched', sequenceString.length, 'bases')
            
            // Return sequence data in the format expected by SequenceViewModel
            return {
                bpStart: region.start,
                sequence: sequenceString
            }
        } catch (error) {
            console.error('SequenceSource: Error fetching sequence data:', error)
            return null
        }
    }
}
