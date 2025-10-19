import { LinearScale } from '../util/scale.js'

/**
 * View model for sequence tracks
 */
export class SequenceViewModel {
    constructor(trackConfig, rawData, region, dimensions) {
        this.type = 'sequence'
        this.name = trackConfig.name || 'Sequence'
        this.region = region
        this.dimensions = dimensions
        
        // Transform raw sequence data into renderable format
        this.sequenceBases = this.buildSequenceBases(rawData, region, dimensions)
        this.color = trackConfig.color || '#000000'
        this.fontSize = trackConfig.fontSize || 12
        this.showBases = trackConfig.showBases !== false
    }

    /**
     * Build sequence bases for rendering
     * @param {Array} rawData - Raw sequence data from SequenceSource
     * @param {object} region - GenomicRegion object
     * @param {object} dimensions - Canvas dimensions
     * @returns {Array} Array of renderable base objects
     */
    buildSequenceBases(rawData, region, dimensions) {
        if (!rawData || rawData.length === 0) {
            return []
        }

        const bases = []
        const { width } = dimensions
        
        // Create scale for genomic position to pixel conversion
        const scale = new LinearScale(region.start, region.end, 0, width)
        
        // Calculate pixel positions for each base
        rawData.forEach(baseData => {
            const pixelX = scale.toPixels(baseData.position)
            
            bases.push({
                base: baseData.base,
                position: baseData.position,
                x: pixelX,
                width: Math.max(1, scale.toPixels(baseData.position + 1) - pixelX)
            })
        })
        
        return bases
    }

    /**
     * Get the bases that should be visible in the current view
     * @returns {Array} Array of visible bases
     */
    getVisibleBases() {
        return this.sequenceBases.filter(base => 
            base.x >= 0 && base.x <= this.dimensions.width
        )
    }

    /**
     * Get the color for a specific base
     * @param {string} base - Base character (A, T, G, C)
     * @returns {string} Color for the base
     */
    getBaseColor(base) {
        const baseColors = {
            'A': '#FF0000',  // Red
            'T': '#00FF00',  // Green
            'G': '#0000FF',  // Blue
            'C': '#FF8000'   // Orange
        }
        
        return baseColors[base] || this.color
    }

    /**
     * Check if bases should be displayed (based on zoom level)
     * @returns {boolean} True if bases should be shown
     */
    shouldShowBases() {
        if (!this.showBases) {
            return false
        }
        
        // Don't show bases if they would be too crowded
        const minBaseWidth = 8 // Minimum pixels per base
        const avgBaseWidth = this.dimensions.width / this.sequenceBases.length
        
        return avgBaseWidth >= minBaseWidth
    }

    /**
     * Get the height needed for this track
     * @returns {number} Track height in pixels
     */
    getHeight() {
        return this.dimensions.height || 20
    }

    /**
     * Get rendering options
     * @returns {object} Rendering options
     */
    getRenderingOptions() {
        return {
            showBases: this.shouldShowBases(),
            fontSize: this.fontSize,
            baseColors: {
                'A': this.getBaseColor('A'),
                'T': this.getBaseColor('T'),
                'G': this.getBaseColor('G'),
                'C': this.getBaseColor('C')
            },
            defaultColor: this.color
        }
    }

    /**
     * Get a summary of the sequence data
     * @returns {object} Summary information
     */
    getSummary() {
        const visibleBases = this.getVisibleBases()
        const baseCounts = { A: 0, T: 0, G: 0, C: 0 }
        
        visibleBases.forEach(base => {
            if (baseCounts.hasOwnProperty(base.base)) {
                baseCounts[base.base]++
            }
        })
        
        return {
            totalBases: this.sequenceBases.length,
            visibleBases: visibleBases.length,
            baseCounts: baseCounts,
            gcContent: (baseCounts.G + baseCounts.C) / (visibleBases.length || 1) * 100
        }
    }
}
