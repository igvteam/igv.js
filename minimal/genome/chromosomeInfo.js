/**
 * Chromosome metadata and name normalization
 */
export class ChromosomeInfo {
    constructor(chromosomes, nameMap) {
        this.chromosomes = chromosomes  // [{name, size}]
        this.nameMap = nameMap          // Map for aliases
        this.sizeMap = new Map()        // Map chromosome name to size
        
        // Build size map for quick lookups
        chromosomes.forEach(chr => {
            this.sizeMap.set(chr.name, chr.size)
        })
        
        // Make immutable
        Object.freeze(this.chromosomes)
        Object.freeze(this)
    }

    /**
     * Load chromosome information from a chromSizes URL
     * @param {string} chromSizesURL - URL to chromosome sizes file
     * @returns {Promise<ChromosomeInfo>} ChromosomeInfo instance
     */
    static async load(chromSizesURL) {
        try {
            const response = await fetch(chromSizesURL)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const text = await response.text()
            return this.parseChromSizes(text)
        } catch (error) {
            console.error('Error loading chromosome info:', error)
            throw new Error(`Failed to load chromosome info: ${error.message}`)
        }
    }

    /**
     * Parse chromosome sizes text format
     * @param {string} text - Chromosome sizes text
     * @returns {ChromosomeInfo} ChromosomeInfo instance
     */
    static parseChromSizes(text) {
        const lines = text.trim().split('\n')
        const chromosomes = []
        const nameMap = new Map()
        
        lines.forEach(line => {
            const parts = line.split('\t')
            if (parts.length >= 2) {
                const name = parts[0].trim()
                const size = parseInt(parts[1].trim(), 10)
                
                if (name && !isNaN(size)) {
                    chromosomes.push({ name, size })
                    
                    // Create aliases for common naming conventions
                    this.addAliases(name, nameMap)
                }
            }
        })
        
        return new ChromosomeInfo(chromosomes, nameMap)
    }

    /**
     * Add chromosome name aliases to the name map
     * @param {string} name - Original chromosome name
     * @param {Map} nameMap - Map to add aliases to
     */
    static addAliases(name, nameMap) {
        nameMap.set(name, name)
        
        // Common alias patterns
        if (name.startsWith('chr')) {
            // chr1 -> 1
            const numericName = name.substring(3)
            if (numericName === 'M') {
                nameMap.set('MT', name)
            } else {
                nameMap.set(numericName, name)
            }
        } else if (name === 'MT') {
            // MT -> chrM
            nameMap.set('chrM', name)
        } else if (/^\d+$/.test(name)) {
            // 1 -> chr1
            nameMap.set('chr' + name, name)
        } else if (name === 'X') {
            nameMap.set('chrX', name)
        } else if (name === 'Y') {
            nameMap.set('chrY', name)
        }
    }

    /**
     * Normalize a chromosome name to the canonical form
     * @param {string} chrName - Chromosome name to normalize
     * @returns {string} Normalized chromosome name
     */
    normalize(chrName) {
        if (!chrName) {
            return null
        }
        
        const normalized = this.nameMap.get(chrName)
        return normalized || chrName
    }

    /**
     * Get the size of a chromosome
     * @param {string} chrName - Chromosome name
     * @returns {number|null} Chromosome size or null if not found
     */
    getSize(chrName) {
        const normalizedName = this.normalize(chrName)
        return this.sizeMap.get(normalizedName) || null
    }

    /**
     * Check if a chromosome exists
     * @param {string} chrName - Chromosome name to check
     * @returns {boolean} True if chromosome exists
     */
    hasChromosome(chrName) {
        const normalizedName = this.normalize(chrName)
        return this.sizeMap.has(normalizedName)
    }

    /**
     * Get all chromosome names
     * @returns {Array<string>} Array of chromosome names
     */
    getChromosomeNames() {
        return this.chromosomes.map(chr => chr.name)
    }

    /**
     * Get chromosomes sorted by size (largest first)
     * @returns {Array<object>} Array of chromosome objects sorted by size
     */
    getChromosomesBySize() {
        return [...this.chromosomes].sort((a, b) => b.size - a.size)
    }

    /**
     * Validate a genomic region against chromosome information
     * @param {string} chr - Chromosome name
     * @param {number} start - Start position
     * @param {number} end - End position
     * @returns {boolean} True if region is valid
     */
    validateRegion(chr, start, end) {
        const normalizedChr = this.normalize(chr)
        const chrSize = this.getSize(normalizedChr)
        
        if (!chrSize) {
            return false
        }
        
        return start >= 0 && end <= chrSize && start < end
    }

    /**
     * Get the total genome size
     * @returns {number} Total size of all chromosomes
     */
    getTotalSize() {
        return this.chromosomes.reduce((total, chr) => total + chr.size, 0)
    }
}
