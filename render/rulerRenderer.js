import { LinearScale } from '../util/scale.js'

/**
 * Renderer for genomic ruler track
 * Draws tick marks, labels, and baseline
 */
export class RulerRenderer {
    /**
     * Render ruler track to canvas
     */
    static render(ctx, viewModel, dimensions) {
        const { ticks, region, height } = viewModel
        const { width } = dimensions
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height)
        
        // Create scale for position to pixel conversion
        const scale = new LinearScale(region.start, region.end, 0, width)
        
        // Draw each tick and label
        for (const tickBp of ticks) {
            const x = scale.toPixels(tickBp)
            
            // Only draw if tick is within visible area
            if (x >= 0 && x <= width) {
                this.drawTick(ctx, x, height)
                this.drawLabel(ctx, viewModel.formatTickLabel(tickBp), x, height)
            }
        }
        
        // Draw baseline at bottom
        this.drawBaseline(ctx, width, height)
    }
    
    /**
     * Draw a single tick mark (vertical line)
     */
    static drawTick(ctx, x, height) {
        const tickHeight = 6
        const shim = 2
        
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(Math.floor(x) + 0.5, height - tickHeight)
        ctx.lineTo(Math.floor(x) + 0.5, height - shim)
        ctx.stroke()
    }
    
    /**
     * Draw tick label (formatted number with unit)
     */
    static drawLabel(ctx, label, x, height) {
        const tickHeight = 6
        
        ctx.fillStyle = '#000000'
        ctx.font = '10px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        
        // Position label above tick, leaving room for tick mark
        const labelY = height - (tickHeight / 0.75)
        ctx.fillText(label, x, labelY)
    }
    
    /**
     * Draw baseline (horizontal line at bottom)
     */
    static drawBaseline(ctx, width, height) {
        const shim = 2
        
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, height - shim + 0.5)
        ctx.lineTo(width, height - shim + 0.5)
        ctx.stroke()
    }
    
    /**
     * Render "No data" message (not used for ruler, but required by interface)
     */
    static renderNoData(ctx, dimensions) {
        // Ruler always has data (ticks), so this is not used
    }
}

