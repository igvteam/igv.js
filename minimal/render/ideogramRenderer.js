/**
 * Renderer for ideogram tracks - draws chromosome cytobands and viewport indicator
 */
export class IdeogramRenderer {
    /**
     * Render an ideogram track
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {object} viewModel - IdeogramViewModel instance
     */
    static render(ctx, viewModel) {
        const { scaledCytobands, viewport, dimensions } = viewModel
        const { width, height } = dimensions
        
        console.log('IdeogramRenderer: Rendering ideogram with', scaledCytobands.length, 'cytobands')
        
        if (scaledCytobands.length === 0) {
            console.log('IdeogramRenderer: No cytobands to render')
            return
        }
        
        const options = viewModel.getRenderingOptions()
        
        // Draw the ideogram
        this.drawIdeogram(ctx, scaledCytobands, width, height)
        
        // Draw viewport indicator if present
        if (viewport && options.showViewportIndicator) {
            this.drawViewportIndicator(ctx, viewport, width, height)
        }
        
        console.log('IdeogramRenderer: Rendering complete')
    }

    /**
     * Draw the ideogram with cytobands
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} scaledCytobands - Array of scaled cytoband objects
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    static drawIdeogram(ctx, scaledCytobands, width, height) {
        const shim = 1
        const shim2 = 0.5 * shim
        const ideogramTop = 0
        
        // Fill background
        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.fillRect(0, 0, width, height)
        
        const center = ideogramTop + height / 2
        
        // Create clipping path with rounded corners
        ctx.save()
        ctx.beginPath()
        this.roundRect(ctx, shim2, shim2 + ideogramTop, width - 2 * shim2, height - 2 * shim2, (height - 2 * shim2) / 2)
        ctx.clip()
        
        // Draw each cytoband
        const xC = []
        const yC = []
        
        for (let i = 0; i < scaledCytobands.length; i++) {
            const { cytoband, x, width: bandWidth } = scaledCytobands[i]
            const end = x + bandWidth
            
            if (cytoband.type === 'c') {
                // Draw centromere as triangle
                if (cytoband.name.charAt(0) === 'p') {
                    xC[0] = x
                    yC[0] = height + ideogramTop
                    xC[1] = x
                    yC[1] = ideogramTop
                    xC[2] = end
                    yC[2] = center
                } else {
                    xC[0] = end
                    yC[0] = height + ideogramTop
                    xC[1] = end
                    yC[1] = ideogramTop
                    xC[2] = x
                    yC[2] = center
                }
                
                ctx.fillStyle = 'rgb(150, 10, 10)'
                ctx.strokeStyle = 'rgb(150, 10, 10)'
                this.drawPolygon(ctx, xC, yC)
            } else {
                // Draw regular band
                const color = this.getCytobandColor(cytoband)
                ctx.fillStyle = color
                ctx.fillRect(x, shim + ideogramTop, bandWidth, height - 2 * shim)
            }
        }
        
        ctx.restore()
        
        // Draw border
        ctx.save()
        ctx.strokeStyle = 'rgb(41, 41, 41)'
        ctx.lineWidth = 1
        ctx.beginPath()
        this.roundRect(ctx, shim2, shim2 + ideogramTop, width - 2 * shim2, height - 2 * shim2, (height - 2 * shim2) / 2)
        ctx.stroke()
        ctx.restore()
    }

    /**
     * Draw viewport indicator (red box)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {object} viewport - Viewport object {x, width}
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    static drawViewportIndicator(ctx, viewport, canvasWidth, canvasHeight) {
        let { x, width } = viewport
        
        // Ensure viewport stays within bounds
        x = Math.max(0, x)
        x = Math.min(canvasWidth - width, x)
        
        ctx.save()
        
        // Draw red box
        ctx.strokeStyle = 'red'
        ctx.lineWidth = (width < 2) ? 1 : 2
        
        const xx = x + ctx.lineWidth / 2
        const ww = (width < 2) ? 1 : width - ctx.lineWidth
        const yy = ctx.lineWidth / 2
        const hh = canvasHeight - ctx.lineWidth
        
        ctx.strokeRect(xx, yy, ww, hh)
        
        ctx.restore()
    }

    /**
     * Get color for a cytoband based on stain value
     * @param {object} cytoband - Cytoband object
     * @returns {string} RGB color string
     */
    static getCytobandColor(cytoband) {
        if (cytoband.type === 'c') {
            // Centromere
            return 'rgb(150, 10, 10)'
        } else {
            let shade = 230 // Default for 'gneg'
            
            if (cytoband.type === 'p') {
                // gpos stain - darker based on stain intensity
                shade = Math.floor(230 - cytoband.stain / 100.0 * 230)
            }
            
            return `rgb(${shade}, ${shade}, ${shade})`
        }
    }

    /**
     * Draw a rounded rectangle path
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} radius - Corner radius
     */
    static roundRect(ctx, x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2
        if (height < 2 * radius) radius = height / 2
        
        ctx.moveTo(x + radius, y)
        ctx.arcTo(x + width, y, x + width, y + height, radius)
        ctx.arcTo(x + width, y + height, x, y + height, radius)
        ctx.arcTo(x, y + height, x, y, radius)
        ctx.arcTo(x, y, x + width, y, radius)
        ctx.closePath()
    }

    /**
     * Draw a polygon
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} xPoints - X coordinates
     * @param {Array} yPoints - Y coordinates
     */
    static drawPolygon(ctx, xPoints, yPoints) {
        if (xPoints.length !== yPoints.length || xPoints.length === 0) {
            return
        }
        
        ctx.beginPath()
        ctx.moveTo(xPoints[0], yPoints[0])
        
        for (let i = 1; i < xPoints.length; i++) {
            ctx.lineTo(xPoints[i], yPoints[i])
        }
        
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
    }
}

