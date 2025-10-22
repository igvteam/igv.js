import { LinearScale } from '../util/scale.js'

/**
 * View model for gene/feature track rendering
 */
export class GeneViewModel {
    constructor(config, features, region, dimensions) {
        this.type = 'gene'
        this.name = config.name
        this.height = config.height
        this.color = config.color
        
        // Store data
        this.features = features || []
        this.region = region
        this.dimensions = dimensions
        
        // Create scale
        this.xScale = this.createXScale(region, dimensions.width)
        this.scale = { bpPerPixel: (region.end - region.start) / dimensions.width }
        this.width = dimensions.width
        this.height = config.height || 50
        this.margin = 10
        this.featureHeight = 14
        this.arrowSpacing = 30
        
        // Compute layout (row assignments to avoid overlaps)
        this.layout = this.computeLayout(features, region, dimensions.width)
        
        Object.freeze(this)
    }

    /**
     * Create X-axis scale (genomic position to pixel)
     */
    createXScale(region, width) {
        return new LinearScale(region.start, region.end, 0, width)
    }

    /**
     * Compute layout to pack features into rows
     */
    computeLayout(features, region, width) {
        if (!features || features.length === 0) {
            return { rows: [], rowCount: 0, rowHeight: 15 }
        }

        const rowHeight = 15
        const padding = 2
        const rows = []

        // Sort features by start position
        const sorted = [...features].sort((a, b) => a.start - b.start)

        for (const feature of sorted) {
            // Skip features outside region
            if (feature.end < region.start || feature.start > region.end) {
                continue
            }

            // Find first available row
            let row = 0
            let placed = false

            while (!placed) {
                if (!rows[row]) {
                    rows[row] = []
                }

                // Check if feature fits in this row
                const lastFeature = rows[row][rows[row].length - 1]
                if (!lastFeature || lastFeature.end < feature.start) {
                    rows[row].push(feature)
                    feature._row = row
                    feature._y = row * (rowHeight + padding)
                    placed = true
                } else {
                    row++
                }
            }
        }

        return {
            rows,
            rowCount: rows.length,
            rowHeight,
            padding
        }
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