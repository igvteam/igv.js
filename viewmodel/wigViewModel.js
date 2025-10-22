import { LinearScale } from '../util/scale.js'

/**
 * View model for wig track rendering - contains all computed state needed for rendering
 */
export class WigViewModel {
    constructor(config, dataPoints, region, dimensions) {
        this.type = 'wig'
        this.name = config.name
        this.height = config.height
        this.color = config.color
        this.graphType = config.graphType || 'bar'
        
        // Store data
        this.dataPoints = dataPoints || []
        this.region = region
        this.dimensions = dimensions
        
        // Compute scales and ranges
        this.dataRange = this.computeDataRange(dataPoints)
        this.yScale = this.createYScale(this.dataRange, dimensions.height)
        this.xScale = this.createXScale(region, dimensions.width)
        
        Object.freeze(this)
    }

    /**
     * Compute min/max values from data
     */
    computeDataRange(data) {
        if (!data || data.length === 0) {
            return { min: 0, max: 1 }
        }

        let min = Infinity
        let max = -Infinity

        for (const point of data) {
            if (point.value < min) min = point.value
            if (point.value > max) max = point.value
        }

        // Ensure we have some range
        if (min === max) {
            min = Math.floor(min)
            max = Math.ceil(max) + 1
        }

        // Include zero for wig tracks
        if (min > 0) min = 0
        if (max < 0) max = 0

        return { min, max }
    }

    /**
     * Create Y-axis scale (value to pixel)
     */
    createYScale(dataRange, height) {
        // Invert Y axis so higher values are at top
        return new LinearScale(dataRange.min, dataRange.max, height, 0)
    }

    /**
     * Create X-axis scale (genomic position to pixel)
     */
    createXScale(region, width) {
        return new LinearScale(region.start, region.end, 0, width)
    }

    /**
     * Get Y pixel position for a data value
     */
    getY(value) {
        return this.yScale.toPixels(value)
    }

    /**
     * Get X pixel position for a genomic position
     */
    getX(position) {
        return this.xScale.toPixels(position)
    }

    /**
     * Get pixel width for a genomic span
     */
    getWidth(start, end) {
        return this.xScale.toPixels(end) - this.xScale.toPixels(start)
    }
}

