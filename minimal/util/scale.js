/**
 * Scale utilities for axis calculations
 */

/**
 * Create a linear scale mapping data values to pixel values
 */
export class LinearScale {
    constructor(dataMin, dataMax, pixelMin, pixelMax) {
        this.dataMin = dataMin
        this.dataMax = dataMax
        this.pixelMin = pixelMin
        this.pixelMax = pixelMax
        this.pixelRange = pixelMax - pixelMin
        this.dataRange = dataMax - dataMin
    }

    /**
     * Convert data value to pixel position
     */
    toPixels(value) {
        if (this.dataRange === 0) return this.pixelMin
        const ratio = (value - this.dataMin) / this.dataRange
        return this.pixelMin + ratio * this.pixelRange
    }

    /**
     * Convert pixel position to data value
     */
    toData(pixel) {
        if (this.pixelRange === 0) return this.dataMin
        const ratio = (pixel - this.pixelMin) / this.pixelRange
        return this.dataMin + ratio * this.dataRange
    }
}

/**
 * Generate nice tick marks for an axis
 */
export function generateTicks(min, max, maxTicks = 5) {
    const range = max - min
    if (range === 0) return [min]

    // Calculate nice step size
    const roughStep = range / (maxTicks - 1)
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
    const residual = roughStep / magnitude
    
    let step
    if (residual > 5) {
        step = 10 * magnitude
    } else if (residual > 2) {
        step = 5 * magnitude
    } else if (residual > 1) {
        step = 2 * magnitude
    } else {
        step = magnitude
    }

    const ticks = []
    const start = Math.ceil(min / step) * step
    for (let tick = start; tick <= max; tick += step) {
        ticks.push(tick)
    }

    return ticks
}

/**
 * Format number for display on axis
 */
export function formatNumber(value) {
    if (Math.abs(value) >= 1e6) {
        return (value / 1e6).toFixed(1) + 'M'
    } else if (Math.abs(value) >= 1e3) {
        return (value / 1e3).toFixed(1) + 'K'
    } else if (Math.abs(value) < 0.01 && value !== 0) {
        return value.toExponential(2)
    } else {
        return value.toFixed(2)
    }
}

