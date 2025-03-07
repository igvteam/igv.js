/**
 * Utility functions for ROI operations
 */

/**
 * Create a unique key for a region
 * @param {string} chr - Chromosome name
 * @param {number} start - Start position
 * @param {number} end - End position
 * @returns {string} A unique key for the region
 */
export function createRegionKey(chr, start, end) {
    return `${chr}:${start}-${end}`
}

/**
 * Parse a region key into its components
 * @param {string} regionKey - The region key to parse
 * @returns {Object} Object containing chr, start, end, and locus
 */
export function parseRegionKey(regionKey) {
    const [chr, locus] = regionKey.split(':')
    const [start, end] = locus.split('-').map(Number)
    return { chr, start, end, locus }
}

/**
 * Create a CSS selector for a region
 * @param {string} regionKey - The region key
 * @returns {string} A CSS selector for the region
 */
export function createSelector(regionKey) {
    return `[data-region="${regionKey}"]`
} 