/**
 * View model for ideogram tracks - transforms cytoband data for rendering
 */
export class IdeogramViewModel {
    constructor(trackConfig, cytobands, region, dimensions) {
        this.type = 'ideogram'
        this.name = trackConfig.name
        this.cytobands = cytobands
        this.region = region
        this.dimensions = dimensions
        this.height = trackConfig.height || 16
        
        // Calculate chromosome length from cytobands
        this.chromosomeLength = this.calculateChromosomeLength(cytobands)
        
        // Scale cytobands to pixel coordinates
        this.scaledCytobands = this.scaleCytobands(cytobands, dimensions.width)
        
        // Calculate viewport indicator position
        this.viewport = this.calculateViewport(region, dimensions.width)
        
        // Make immutable
        Object.freeze(this)
        Object.freeze(this.scaledCytobands)
        Object.freeze(this.viewport)
    }

    /**
     * Calculate chromosome length from cytobands
     * @param {Array} cytobands - Array of Cytoband objects
     * @returns {number} Chromosome length in base pairs
     */
    calculateChromosomeLength(cytobands) {
        if (!cytobands || cytobands.length === 0) {
            return 0
        }
        
        // The last cytoband's end position is the chromosome length
        return cytobands[cytobands.length - 1].end
    }

    /**
     * Scale cytobands to pixel coordinates
     * @param {Array} cytobands - Array of Cytoband objects
     * @param {number} pixelWidth - Width in pixels
     * @returns {Array} Array of scaled cytobands with pixel positions
     */
    scaleCytobands(cytobands, pixelWidth) {
        if (!cytobands || cytobands.length === 0 || this.chromosomeLength === 0) {
            return []
        }
        
        const scale = pixelWidth / this.chromosomeLength
        
        return cytobands.map(cytoband => ({
            cytoband: cytoband,
            x: cytoband.start * scale,
            width: (cytoband.end - cytoband.start) * scale
        }))
    }

    /**
     * Calculate viewport indicator position and width
     * @param {object} region - GenomicRegion object
     * @param {number} pixelWidth - Width in pixels
     * @returns {object|null} Viewport indicator {x, width} or null if full chromosome visible
     */
    calculateViewport(region, pixelWidth) {
        if (!this.chromosomeLength || this.chromosomeLength === 0) {
            return null
        }
        
        const viewportBP = region.length
        
        // If viewport shows entire chromosome, don't show indicator
        if (viewportBP >= this.chromosomeLength) {
            return null
        }
        
        const percentWidth = viewportBP / this.chromosomeLength
        const percentX = region.start / this.chromosomeLength
        
        let x = Math.floor(percentX * pixelWidth)
        let width = Math.floor(percentWidth * pixelWidth)
        
        // Ensure viewport indicator stays within bounds
        x = Math.max(0, x)
        x = Math.min(pixelWidth - width, x)
        
        return { x, width }
    }

    /**
     * Get rendering options for the ideogram
     * @returns {object} Rendering options
     */
    getRenderingOptions() {
        return {
            name: this.name,
            height: this.height,
            showViewportIndicator: this.viewport !== null
        }
    }
}

