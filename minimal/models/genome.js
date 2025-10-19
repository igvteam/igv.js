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
     * Get default tracks for this genome
     * @returns {Array} Array of default track configurations
     */
    getDefaultTracks() {
        return [...this.defaultTracks] // Return a copy
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
