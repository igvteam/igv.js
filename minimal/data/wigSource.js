/**
 * Data source for wig/bedgraph files
 * Simplified implementation that reads text files and parses bedgraph format
 */
export class WigSource {
    constructor(config) {
        this.url = config.url
        this.indexed = config.indexed !== undefined ? config.indexed : false
    }

    /**
     * Fetch data for a genomic region
     */
    async fetch(region) {
        try {
            const response = await fetch(this.url)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const text = await response.text()
            return this.parseData(text, region)
        } catch (error) {
            console.error('Error fetching wig data:', error)
            return []
        }
    }

    /**
     * Parse bedgraph/wig data from text
     */
    parseData(text, region) {
        const lines = text.split('\n')
        const data = []

        for (const line of lines) {
            // Skip comments and track lines
            if (!line || line.startsWith('#') || line.startsWith('track') || 
                line.startsWith('browser')) {
                continue
            }

            // Parse bedgraph format: chr start end value
            const tokens = line.split(/\s+/)
            if (tokens.length < 4) continue

            const chr = tokens[0]
            const start = parseInt(tokens[1])
            const end = parseInt(tokens[2])
            const value = parseFloat(tokens[3])

            // Skip if not in our region
            if (chr !== region.chr) continue
            if (end < region.start || start > region.end) continue

            if (!isNaN(start) && !isNaN(end) && !isNaN(value)) {
                data.push({ chr, start, end, value })
            }
        }

        return data
    }
}

