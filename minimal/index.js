import { MinimalBrowser } from './core/browser.js'

/**
 * Public API for minimal IGV browser
 */
export default {
    /**
     * Create and initialize a genome browser instance
     * 
     * @param {HTMLElement} container - DOM element to render into
     * @param {Object} config - Browser configuration
     * @param {string} config.locus - Genomic region (e.g., "chr1:1000-2000")
     * @param {Array} config.tracks - Array of track configurations
     * @returns {Promise<MinimalBrowser>} Browser instance
     * 
     * @example
     * const browser = await IGV.create(document.getElementById('igv'), {
     *   locus: 'chr1:1000000-1001000',
     *   tracks: [
     *     { type: 'wig', url: 'data.bedgraph', name: 'Signal', color: 'blue' }
     *   ]
     * })
     */
    async create(container, config) {
        // Validate inputs
        if (!container) {
            throw new Error('Container element is required')
        }
        
        if (!config) {
            throw new Error('Configuration object is required')
        }
        
        if (!config.locus) {
            throw new Error('Locus is required in configuration')
        }
        
        if (!config.tracks || config.tracks.length === 0) {
            throw new Error('At least one track is required in configuration')
        }
        
        // Create browser instance
        const browser = new MinimalBrowser(container, config)
        
        // Load data and render
        await browser.load()
        
        return browser
    },

    /**
     * Version information
     */
    version: '0.1.0-minimal'
}

