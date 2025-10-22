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
     * @param region - Genomic region
     * @param bpPerPixel - Basepairs per pixel (not used for text files, but kept for API consistency)
     */
    async fetch(region, bpPerPixel) {
        try {
            const response = await fetch(this.url)
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`)
            }
            
            const text = await response.text()
            return this.parseData(text, region)
        } catch (error) {
            console.error('Error fetching wig data:', error)
            throw error // Re-throw so the browser can show the error
        }
    }

    /**
     * Parse bedgraph/wig data from text
     */
    parseData(text, region) {
        const lines = text.split('\n')
        const data = []
        let currentTrack = null

        for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine) continue

            // Handle track headers
            if (trimmedLine.startsWith('track')) {
                currentTrack = this.parseTrackHeader(trimmedLine)
                continue
            }

            // Handle fixedStep format
            if (trimmedLine.startsWith('fixedStep')) {
                currentTrack = this.parseFixedStepHeader(trimmedLine)
                continue
            }

            // Handle variableStep format
            if (trimmedLine.startsWith('variableStep')) {
                currentTrack = this.parseVariableStepHeader(trimmedLine)
                continue
            }

            // Skip comments and browser lines
            if (trimmedLine.startsWith('#') || trimmedLine.startsWith('browser')) {
                continue
            }

            // Parse data lines
            if (currentTrack) {
                const dataPoint = this.parseDataLine(trimmedLine, currentTrack)
                if (dataPoint && this.isInRegion(dataPoint, region)) {
                    data.push(dataPoint)
                }
                
                // Update current position for fixedStep tracks
                if (currentTrack.type === 'fixedStep') {
                    currentTrack.start += currentTrack.step
                }
            } else {
                // Try bedgraph format: chr start end value
                const tokens = trimmedLine.split(/\s+/)
                if (tokens.length >= 4) {
                    const chr = tokens[0]
                    const start = parseInt(tokens[1])
                    const end = parseInt(tokens[2])
                    const value = parseFloat(tokens[3])

                    if (!isNaN(start) && !isNaN(end) && !isNaN(value)) {
                        const dataPoint = { chr, start, end, value }
                        if (this.isInRegion(dataPoint, region)) {
                            data.push(dataPoint)
                        }
                    }
                }
            }
        }

        return data
    }

    /**
     * Parse track header line
     */
    parseTrackHeader(line) {
        // Extract track properties (simplified)
        return { type: 'track', properties: {} }
    }

    /**
     * Parse fixedStep header
     * Format: fixedStep chrom=<name> start=<position> step=<step> [span=<span>]
     */
    parseFixedStepHeader(line) {
        const params = this.parseHeaderParams(line)
        return {
            type: 'fixedStep',
            chr: params.chrom,
            start: parseInt(params.start),
            step: parseInt(params.step),
            span: parseInt(params.span) || 1
        }
    }

    /**
     * Parse variableStep header
     * Format: variableStep chrom=<name> [span=<span>]
     */
    parseVariableStepHeader(line) {
        const params = this.parseHeaderParams(line)
        return {
            type: 'variableStep',
            chr: params.chrom,
            span: parseInt(params.span) || 1
        }
    }

    /**
     * Parse header parameters
     */
    parseHeaderParams(line) {
        const params = {}
        const matches = line.match(/(\w+)=([^\s]+)/g)
        if (matches) {
            for (const match of matches) {
                const [key, value] = match.split('=')
                params[key] = value
            }
        }
        return params
    }

    /**
     * Parse data line based on current track format
     */
    parseDataLine(line, track) {
        const tokens = line.split(/\s+/)
        
        if (track.type === 'fixedStep') {
            // Fixed step: just the value
            const value = parseFloat(tokens[0])
            if (!isNaN(value)) {
                return {
                    chr: track.chr,
                    start: track.start,
                    end: track.start + track.span,
                    value: value
                }
            }
        } else if (track.type === 'variableStep') {
            // Variable step: position value
            if (tokens.length >= 2) {
                const position = parseInt(tokens[0])
                const value = parseFloat(tokens[1])
                if (!isNaN(position) && !isNaN(value)) {
                    return {
                        chr: track.chr,
                        start: position,
                        end: position + track.span,
                        value: value
                    }
                }
            }
        }
        
        return null
    }

    /**
     * Check if data point is in the specified region
     */
    isInRegion(dataPoint, region) {
        // WIG files use 1-based coordinates, so we need to convert
        // Our region uses 0-based coordinates
        const dataStart = dataPoint.start - 1  // Convert from 1-based to 0-based
        const dataEnd = dataPoint.end - 1      // Convert from 1-based to 0-based
        
        return dataPoint.chr === region.chr &&
               dataEnd >= region.start &&
               dataStart <= region.end
    }
}

