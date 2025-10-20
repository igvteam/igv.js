/**
 * Immutable representation of a genome assembly configuration
 */
export class GenomeConfig {
    constructor(config) {
        this.id = config.id
        this.name = config.name
        this.sequenceSource = config.twoBitURL || config.fastaURL
        this.chromSizesURL = config.chromSizesURL
        this.cytobandURL = config.cytobandURL
        this.aliasURL = config.aliasURL
        this.chromosomeOrder = config.chromosomeOrder
        this.defaultTracks = config.tracks || []
        this.wholeGenomeView = config.wholeGenomeView || false
        
        // Store original config for any additional properties
        this.originalConfig = config
        
        // Make immutable
        Object.freeze(this)
        Object.freeze(this.defaultTracks)
    }

    /**
     * Get the sequence source URL (preferring 2bit over fasta)
     * @returns {string|null} Sequence source URL
     */
    getSequenceSource() {
        return this.sequenceSource
    }

    /**
     * Get default tracks for this genome, including ideogram, sequence track if available
     * @param {object} config - Browser configuration object (optional)
     * @returns {Array} Array of default track configurations
     */
    getDefaultTracks(config = {}) {
        const tracks = []
        
        // Add ideogram track if cytobandURL exists and showIdeogram is true
        if (this.cytobandURL && config.showIdeogram) {
            tracks.push({
                type: "ideogram",
                name: "Ideogram",
                url: this.cytobandURL,
                order: -2000000,  // Render before sequence
                height: 16
            })
        }
        
        // Check if a sequence track already exists in defaultTracks
        const existingSequenceTrack = this.defaultTracks.find(t => t.type === 'sequence')
        
        if (this.sequenceSource) {
            if (existingSequenceTrack) {
                // If sequence track exists but has no URL, add the URL to it
                tracks.push({
                    ...existingSequenceTrack,
                    url: existingSequenceTrack.url || this.sequenceSource,
                    format: existingSequenceTrack.format || (this.sequenceSource.endsWith('.2bit') ? "2bit" : "fasta"),
                    height: existingSequenceTrack.height || 50
                })
            } else {
                // No sequence track exists, create one
                tracks.push({
                    type: "sequence",
                    name: "DNA Sequence",
                    url: this.sequenceSource,
                    format: this.sequenceSource.endsWith('.2bit') ? "2bit" : "fasta",
                    order: -1000000,  // Render after ideogram
                    height: 50
                })
            }
        }
        
        // Add other default tracks from genome registry (excluding any sequence track we already handled)
        const otherTracks = this.defaultTracks.filter(t => t.type !== 'sequence')
        return [...tracks, ...otherTracks]
    }

    /**
     * Check if this genome supports whole genome view
     * @returns {boolean} True if whole genome view is supported
     */
    supportsWholeGenomeView() {
        return this.wholeGenomeView
    }

    /**
     * Get chromosome order as an array
     * @returns {Array<string>} Array of chromosome names in order
     */
    getChromosomeOrder() {
        if (!this.chromosomeOrder) {
            return []
        }
        return this.chromosomeOrder.split(',')
    }

    /**
     * Convert back to a plain object (for compatibility)
     * @returns {object} Plain object representation
     */
    toObject() {
        return {
            id: this.id,
            name: this.name,
            twoBitURL: this.sequenceSource,
            fastaURL: this.sequenceSource,
            chromSizesURL: this.chromSizesURL,
            cytobandURL: this.cytobandURL,
            aliasURL: this.aliasURL,
            chromosomeOrder: this.chromosomeOrder,
            tracks: this.defaultTracks,
            wholeGenomeView: this.wholeGenomeView,
            ...this.originalConfig
        }
    }

    /**
     * Create a GenomeConfig from a plain object
     * @param {object} config - Plain configuration object
     * @returns {GenomeConfig} New GenomeConfig instance
     */
    static fromObject(config) {
        return new GenomeConfig(config)
    }

    /**
     * Validate that a configuration object has required fields
     * @param {object} config - Configuration to validate
     * @throws {Error} If configuration is invalid
     */
    static validate(config) {
        if (!config.id) {
            throw new Error('Genome configuration must have an "id" field')
        }
        
        if (!config.name) {
            throw new Error('Genome configuration must have a "name" field')
        }
        
        if (!config.chromSizesURL) {
            throw new Error('Genome configuration must have a "chromSizesURL" field')
        }
        
        // Either twoBitURL or fastaURL should be present for sequence data
        if (!config.twoBitURL && !config.fastaURL) {
            throw new Error('Genome configuration must have either "twoBitURL" or "fastaURL"')
        }
    }
}
