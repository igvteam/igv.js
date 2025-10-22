/**
 * View model for genomic ruler track
 * Calculates tick positions and labels with "nice" intervals
 */

// Nice intervals for tick spacing (in base pairs)
const NICE_INTERVALS = [
    1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000,
    20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000,
    10000000, 20000000, 50000000, 100000000
]

export class RulerViewModel {
    constructor(config, data, region, dimensions) {
        this.type = 'ruler'
        this.region = region
        this.dimensions = dimensions
        this.height = config.height || 40
        
        const visibleBpLength = region.end - region.start
        const { unit, divisor } = this.determineUnit(visibleBpLength)
        const intervalBp = this.findBestInterval(visibleBpLength, dimensions.width)
        const ticks = this.generateTicks(region.start, region.end, intervalBp)
        
        this.unit = unit
        this.divisor = divisor
        this.intervalBp = intervalBp
        this.ticks = ticks
        
        Object.freeze(this)
    }
    
    /**
     * Determine appropriate unit (BP, KB, MB) based on visible range
     */
    determineUnit(visibleBpLength) {
        if (visibleBpLength >= 1_000_000) {
            return { unit: 'mb', divisor: 1_000_000 }
        } else if (visibleBpLength >= 1_000) {
            return { unit: 'kb', divisor: 1_000 }
        } else {
            return { unit: 'bp', divisor: 1 }
        }
    }
    
    /**
     * Find the best "nice" interval for tick spacing
     * Ensures labels are 100-250 pixels apart
     */
    findBestInterval(visibleBpLength, pixelWidth) {
        const MIN_LABEL_SPACING_PX = 100
        const MAX_LABEL_SPACING_PX = 250
        
        const bpPerPixel = visibleBpLength / pixelWidth
        const minIntervalBp = MIN_LABEL_SPACING_PX * bpPerPixel
        const maxIntervalBp = MAX_LABEL_SPACING_PX * bpPerPixel
        
        // Find the first "nice" interval that's >= minIntervalBp and <= maxIntervalBp
        for (const interval of NICE_INTERVALS) {
            if (interval >= minIntervalBp && interval <= maxIntervalBp) {
                return interval
            }
        }
        
        // Fallback: return the smallest interval >= minIntervalBp
        for (const interval of NICE_INTERVALS) {
            if (interval >= minIntervalBp) {
                return interval
            }
        }
        
        // Ultimate fallback: return largest interval
        return NICE_INTERVALS[NICE_INTERVALS.length - 1]
    }
    
    /**
     * Generate tick positions at the calculated interval
     */
    generateTicks(startBp, endBp, intervalBp) {
        const ticks = []
        
        // Round start to nearest interval (floor)
        const firstTick = Math.floor(startBp / intervalBp) * intervalBp
        
        // Generate ticks from firstTick to endBp
        for (let bp = firstTick; bp <= endBp; bp += intervalBp) {
            if (bp >= startBp) {
                ticks.push(bp)
            }
        }
        
        return ticks
    }
    
    /**
     * Format a tick value for display
     */
    formatTickLabel(tickBp) {
        const value = tickBp / this.divisor
        
        // Format with appropriate precision
        let formattedValue
        if (value >= 1000) {
            // Add comma separators for thousands
            formattedValue = value.toLocaleString('en-US', { 
                maximumFractionDigits: 0 
            })
        } else if (value >= 1) {
            // Show up to 1 decimal place if needed
            formattedValue = value % 1 === 0 
                ? value.toString() 
                : value.toFixed(1)
        } else {
            // Show up to 2 decimal places for small values
            formattedValue = value.toFixed(2)
        }
        
        return `${formattedValue} ${this.unit.toUpperCase()}`
    }
}

