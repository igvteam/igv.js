/**
 * Genome resolution layer - resolves genome IDs to full genome configurations
 */
export class GenomeResolver {
    static #registry = null
    static #registryPromise = null

    /**
     * Resolve a genome ID or configuration object to a full GenomeConfig
     * @param {string|object} idOrConfig - Genome ID string or configuration object
     * @returns {Promise<object>} Full genome configuration object
     */
    static async resolve(idOrConfig) {
        if (typeof idOrConfig === 'string') {
            const registry = await this.getRegistry()
            const genomeConfig = registry[idOrConfig]
            
            if (!genomeConfig) {
                throw new Error(`Unknown genome ID: ${idOrConfig}`)
            }
            
            return genomeConfig
        } else if (idOrConfig && typeof idOrConfig === 'object') {
            // Already a configuration object, validate and return
            this.validateGenomeConfig(idOrConfig)
            return idOrConfig
        } else {
            throw new Error('Invalid genome configuration: must be a string ID or configuration object')
        }
    }

    /**
     * Get the genome registry, fetching it if not already cached
     * @returns {Promise<object>} Genome registry object
     */
    static async getRegistry() {
        if (this.#registry) {
            return this.#registry
        }

        if (this.#registryPromise) {
            return this.#registryPromise
        }

        this.#registryPromise = this.fetchRegistry()
        this.#registry = await this.#registryPromise
        
        return this.#registry
    }

    /**
     * Fetch the genome registry from the remote URL
     * @returns {Promise<object>} Genome registry object
     */
    static async fetchRegistry() {
        const GENOMES_URL = "https://igv.org/genomes/genomes3.json"
        
        try {
            const response = await fetch(GENOMES_URL)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const genomeArray = await response.json()
            
            // Convert array to object keyed by genome ID
            const registry = {}
            genomeArray.forEach(genome => {
                if (genome.id) {
                    registry[genome.id] = genome
                }
            })
            
            return registry
        } catch (error) {
            console.error('Error fetching genome registry:', error)
            throw new Error(`Failed to load genome registry: ${error.message}`)
        }
    }

    /**
     * Validate a genome configuration object
     * @param {object} config - Genome configuration to validate
     */
    static validateGenomeConfig(config) {
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

    /**
     * Clear the cached registry (useful for testing)
     */
    static clearCache() {
        this.#registry = null
        this.#registryPromise = null
    }
}
