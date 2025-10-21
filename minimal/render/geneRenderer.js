/**
 * Pure rendering functions for gene/feature tracks
 */
export class GeneRenderer {
    /**
     * Render gene/feature track to canvas
     */
    static render(ctx, viewModel, dimensions) {
        const { features, color } = viewModel

        // Clear canvas
        ctx.clearRect(0, 0, dimensions.width, dimensions.height)

        if (!features || features.length === 0) {
            this.renderNoData(ctx, dimensions)
            return
        }

        // In collapsed mode, all features render in the same row (row 0)
        // This matches legacy IGV behavior
        for (const feature of features) {
            this.renderFeature(ctx, feature, viewModel, color)
        }
    }

    /**
     * Render a single feature - based on legacy renderFeature.js
     */
    static renderFeature(ctx, feature, viewModel, defaultColor) {
        const { region, scale, width, margin, featureHeight, arrowSpacing } = viewModel
        const bpStart = region.start
        const xScale = scale.bpPerPixel
        const pixelHeight = viewModel.height || 50
        
        // Calculate coordinates like legacy code
        const coord = this.calculateFeatureCoordinates(feature, bpStart, xScale)
        const { px, px1, pw } = coord
        
        // In collapsed mode, all features render at the same y position
        const py = margin
        const h = featureHeight
        
        const cy = py + h / 2
        const h2 = h / 2
        const py2 = cy - h2 / 2
        
        // Use feature color if available, otherwise default
        const color = feature.color || defaultColor
        ctx.fillStyle = color
        ctx.strokeStyle = color
        
        const exonCount = feature.exons ? feature.exons.length : 0
        const step = arrowSpacing
        const direction = feature.strand === '+' ? 1 : feature.strand === '-' ? -1 : 0
        
        if (exonCount === 0) {
            // Single exon
            const xLeft = Math.max(0, px)
            const xRight = Math.min(width, px1)
            const width = xRight - xLeft
            
            ctx.fillRect(xLeft, py, width, h)
            
            if (direction !== 0) {
                this.drawArrows(ctx, xLeft, xRight, cy, step, direction, color)
            }
        } else {
            // Multi-exon transcript - draw center line for introns
            this.strokeLine(ctx, px + 1, cy, px1 - 1, cy)
            
            const xLeft = Math.max(0, px) + step / 2
            const xRight = Math.min(width, px1)
            this.drawArrows(ctx, xLeft, xRight, cy, step, direction, color)
            
            // Draw exons
            for (let i = 0; i < feature.exons.length; i++) {
                const exon = feature.exons[i]
                
                let ePx = Math.round((exon.start - bpStart) / xScale)
                let ePx1 = Math.round((exon.end - bpStart) / xScale)
                let ePw = Math.max(1, ePx1 - ePx)
                
                if (ePx + ePw < 0) continue  // Off the left edge
                if (ePx > width) break // Off the right edge
                
                if (exon.utr) {
                    ctx.fillRect(ePx, py2, ePw, h2) // Entire exon is UTR
                } else {
                    let ePxU
                    if (exon.cdStart) {
                        ePxU = Math.round((exon.cdStart - bpStart) / xScale)
                        ctx.fillRect(ePx, py2, ePxU - ePx, h2) // start is UTR
                        ePw -= (ePxU - ePx)
                        ePx = ePxU
                    }
                    if (exon.cdEnd) {
                        ePxU = Math.round((exon.cdEnd - bpStart) / xScale)
                        ctx.fillRect(ePxU, py2, ePx1 - ePxU, h2) // end is UTR
                        ePw -= (ePx1 - ePxU)
                        ePx1 = ePxU
                    }
                    
                    ePw = Math.max(ePw, 1)
                    ctx.fillRect(ePx, py, ePw, h)
                    
                    // Draw arrows on exons if they're wide enough
                    if (ePw > step + 5 && direction !== 0) {
                        this.drawArrows(ctx, ePx, ePx1, cy, step, direction, color)
                    }
                }
            }
        }
        
        // Draw label if there's room
        if (pw > 30 && feature.name) {
            this.renderLabel(ctx, feature, coord, py, h, color)
        }
    }


    /**
     * Render feature label - based on legacy renderFeatureLabel
     */
    static renderLabel(ctx, feature, coord, py, h, color) {
        const { px, px1 } = coord
        const centerX = (px + px1) / 2
        const labelY = py + h + 15 // Position below the feature
        
        ctx.fillStyle = color
        ctx.font = '10px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(feature.name, centerX, labelY)
    }

    /**
     * Render "No data" message
     */
    static renderNoData(ctx, dimensions) {
        ctx.fillStyle = 'rgb(128, 128, 128)'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('No features in region', dimensions.width / 2, dimensions.height / 2)
    }

    /**
     * Calculate feature coordinates - based on legacy calculateFeatureCoordinates
     */
    static calculateFeatureCoordinates(feature, bpStart, xScale) {
        let px = (feature.start - bpStart) / xScale
        let px1 = (feature.end - bpStart) / xScale
        let pw = px1 - px

        if (pw < 3) {
            pw = 3
            px -= 1.5
        }

        return { px, px1, pw }
    }

    /**
     * Draw a line between two points (replaces IGVGraphics.strokeLine)
     */
    static strokeLine(ctx, x1, y1, x2, y2) {
        x1 = Math.floor(x1) + 0.5
        y1 = Math.floor(y1) + 0.5
        x2 = Math.floor(x2) + 0.5
        y2 = Math.floor(y2) + 0.5
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
    }

    /**
     * Draw arrows along a line segment
     */
    static drawArrows(ctx, xLeft, xRight, cy, step, direction, color) {
        ctx.fillStyle = "white"
        ctx.strokeStyle = "white"
        for (let x = xLeft + step / 2; x < xRight; x += step) {
            // draw arrowheads along central line indicating transcribed orientation
            this.strokeLine(ctx, x - direction * 2, cy - 2, x, cy)
            this.strokeLine(ctx, x - direction * 2, cy + 2, x, cy)
        }
        ctx.fillStyle = color
        ctx.strokeStyle = color
    }
}