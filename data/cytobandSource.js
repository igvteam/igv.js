import { Cytoband } from '../models/cytoband.js'
import BWReader from '../bigwig/bwReader.js'
import { BGZip } from 'igv-utils'

/**
 * Data source for cytoband tracks - fetches and parses cytoband data
 * Supports both text (.txt.gz) and BigBed (.bb) formats
 */
export class CytobandSource {
    constructor(config) {
        this.config = config
        this.url = config.url
        this.format = config.format || this.detectFormat(this.url)

        // Cache cytobands by chromosome
        this.cytobandCache = new Map()
    }

    /**
     * Detect cytoband format from URL
     * @param {string} url - Cytoband file URL
     * @returns {string} Format type ('bigbed' or 'text')
     */
    detectFormat(url) {
        if (!url) {
            return 'text'
        }
        const lowerUrl = url.toLowerCase()
        if (lowerUrl.endsWith('.bb') || lowerUrl.endsWith('.bigbed')) {
            return 'bigbed'
        }
        return 'text' // .txt.gz or .txt
    }

    /**
     * Fetch cytoband data for a region
     * @param {object} region - GenomicRegion object
     * @param {number} bpPerPixel - Base pairs per pixel (unused for cytobands)
     * @returns {Promise<Array>} Array of Cytoband objects
     */
    async fetch(region, bpPerPixel) {
        try {
            // console.log('CytobandSource: Fetching cytobands for chromosome:', region.chr, 'format:', this.format)

            // Check cache
            if (this.cytobandCache.has(region.chr)) {
                const cached = this.cytobandCache.get(region.chr)
                console.log('CytobandSource: Using cached cytobands:', cached.length)
                return cached
            }

            let cytobands
            if (this.format === 'bigbed') {
                cytobands = await this.fetchBigBed(region)
            } else {
                cytobands = await this.fetchText(region)
            }

            // Cache for this chromosome
            this.cytobandCache.set(region.chr, cytobands)

            // console.log('CytobandSource: Loaded', cytobands.length, 'cytobands for', region.chr)
            if (cytobands.length > 0) {
                // console.log('CytobandSource: Sample cytoband:', cytobands[0])
            }

            return cytobands
        } catch (error) {
            console.error('Error fetching cytoband data:', error)
            throw error
        }
    }

    /**
     * Fetch cytobands from BigBed format
     * @param {object} region - GenomicRegion object
     * @returns {Promise<Array>} Array of Cytoband objects
     */
    async fetchBigBed(region) {
        if (!this.bwReader) {
            this.bwReader = new BWReader({ url: this.url, ...this.config })
        }

        // Load header if not already loaded
        if (!this.bwReader.header) {
            await this.bwReader.loadHeader()
        }

        // Fetch features for the entire chromosome
        const features = await this.bwReader.readFeatures(region.chr, 0, Number.MAX_SAFE_INTEGER)

        // Convert to Cytoband objects
        // BigBed cytoband features have: chr, start, end, name, gieStain
        return features.map(f => new Cytoband(f.start, f.end, f.name, f.gieStain || f.stain || 'gneg'))
    }

    /**
     * Fetch cytobands from text format (.txt or .txt.gz)
     * @param {object} region - GenomicRegion object
     * @returns {Promise<Array>} Array of Cytoband objects
     */
    async fetchText(region) {
        // Fetch the file
        const response = await fetch(this.url)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`)
        }

        // Handle gzipped data
        let text
        if (this.url.endsWith('.gz')) {
            const arrayBuffer = await response.arrayBuffer()
            const decompressed = await this.decompressGzip(arrayBuffer)
            text = new TextDecoder().decode(decompressed)
        } else {
            text = await response.text()
        }

        // console.log('CytobandSource: Fetched text, length:', text.length)

        // Parse the text format
        return this.parseTextCytobands(text, region.chr)
    }

    /**
     * Decompress gzipped data
     * @param {ArrayBuffer} arrayBuffer - Gzipped data
     * @returns {Promise<Uint8Array>} Decompressed data
     */
    async decompressGzip(arrayBuffer) {
        try {
            const compressed = new Uint8Array(arrayBuffer)
            const decompressed = BGZip.ungzip(compressed)
            return decompressed
        } catch (error) {
            console.error('Error decompressing gzip data:', error)
            throw new Error(`Failed to decompress gzip data: ${error.message}`)
        }
    }

    /**
     * Parse text format cytoband data
     * Format: chr\tstart\tend\tname\tstain
     * Example: chr1\t0\t2300000\tp36.33\tgneg
     * @param {string} text - Raw text data
     * @param {string} chr - Chromosome to filter for
     * @returns {Array} Array of Cytoband objects for the specified chromosome
     */
    parseTextCytobands(text, chr) {
        const cytobands = []
        const lines = text.split('\n')

        for (let line of lines) {
            line = line.trim()
            if (!line || line.startsWith('#')) {
                continue
            }

            const tokens = line.split('\t')
            if (tokens.length < 5) {
                continue
            }

            const chrName = tokens[0]

            // Only include cytobands for the requested chromosome
            if (chrName === chr) {
                const start = parseInt(tokens[1])
                const end = parseInt(tokens[2])
                const name = tokens[3]
                const stain = tokens[4]

                cytobands.push(new Cytoband(start, end, name, stain))
            }
        }

        return cytobands
    }
}

