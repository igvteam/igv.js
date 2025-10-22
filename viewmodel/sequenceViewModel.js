import { LinearScale } from '../util/scale.js'

/**
 * View model for sequence tracks
 */
export class SequenceViewModel {
    constructor(trackConfig, rawData, region, dimensions) {
        this.type = 'sequence'
        this.name = trackConfig.name || 'Sequence'
        this.height = trackConfig.height || 50
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
     * @param {Object} rawData - Raw sequence data from SequenceSource { bpStart, sequence }
     * @param {object} region - GenomicRegion object
     * @param {object} dimensions - Canvas dimensions
     * @returns {Object} Sequence data for rendering
     */
    buildSequenceBases(rawData, region, dimensions) {
        if (!rawData || !rawData.sequence) {
            return { bpStart: region.start, sequence: '', bases: [] }
        }

        const bases = []
        const { width } = dimensions
        const { bpStart, sequence } = rawData
        
        // Create scale for genomic position to pixel conversion
        const scale = new LinearScale(region.start, region.end, 0, width)
        
        // Calculate pixel positions for each base in the sequence string
        for (let i = 0; i < sequence.length; i++) {
            const position = bpStart + i
            const pixelX = scale.toPixels(position)
            
            bases.push({
                base: sequence[i],
                position: position,
                x: pixelX,
                width: Math.max(1, scale.toPixels(position + 1) - pixelX)
            })
        }
        
        return { bpStart, sequence, bases }
    }

    /**
     * Get the bases that should be visible in the current view
     * @returns {Array} Array of visible bases
     */
    getVisibleBases() {
        return this.sequenceBases.bases.filter(base => 
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
     * Get the height needed for this track
     * @returns {number} Track height in pixels
     */
    getHeight() {
        return this.dimensions.height || 20
    }

    /**
     * Determine if individual bases should be shown
     * @returns {boolean} True if bases should be shown
     */
    shouldShowBases() {
        // Show bases if zoomed in enough (less than 10 bp per pixel)
        const bpPerPixel = this.region.length / this.dimensions.width
        return bpPerPixel < 10 && this.showBases
    }

    /**
     * Get rendering options
     * @returns {object} Rendering options
     */
    getRenderingOptions() {
        const bpPerPixel = this.region.length / this.dimensions.width
        return {
            showBases: this.shouldShowBases(),
            bpPerPixel: bpPerPixel,
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
            totalBases: this.sequenceBases.bases.length,
            visibleBases: visibleBases.length,
            baseCounts: baseCounts,
            gcContent: (baseCounts.G + baseCounts.C) / (visibleBases.length || 1) * 100
        }
    }
}
