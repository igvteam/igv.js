/**
 * Renderer for sequence tracks - draws DNA bases
 */
export class SequenceRenderer {
    /**
     * Render a sequence track to canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {object} viewModel - SequenceViewModel object
     * @param {object} dimensions - Canvas dimensions
     */
    static render(ctx, viewModel, dimensions) {
        const { sequenceBases } = viewModel
        const { width, height } = dimensions

        console.log('SequenceRenderer: Rendering sequence track', {
            name: viewModel.name,
            sequenceLength: sequenceBases?.sequence?.length || 0,
            basesCount: sequenceBases?.bases?.length || 0,
            dimensions: { width, height }
        })

        // Clear canvas
        ctx.clearRect(0, 0, width, height)

        if (!sequenceBases || !sequenceBases.bases || sequenceBases.bases.length === 0) {
            console.log('SequenceRenderer: No sequence bases, rendering no data message')
            this.renderNoData(ctx, dimensions)
            return
        }

        const options = viewModel.getRenderingOptions()
        console.log('SequenceRenderer: Rendering options', options)
        
        if (!options.showBases) {
            console.log('SequenceRenderer: Not showing bases, rendering zoomed out message')
            this.renderZoomedOut(ctx, dimensions, viewModel)
            return
        }

        console.log('SequenceRenderer: Rendering individual bases')

        // Set up text rendering
        ctx.font = `${options.fontSize}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Render each visible base
        const visibleBases = viewModel.getVisibleBases()
        console.log('SequenceRenderer: Visible bases count:', visibleBases.length)
        if (visibleBases.length > 0) {
            console.log('SequenceRenderer: First base:', visibleBases[0])
            console.log('SequenceRenderer: Last base:', visibleBases[visibleBases.length - 1])
        }
        
        visibleBases.forEach((base, index) => {
            if (index < 3) {
                console.log(`SequenceRenderer: Drawing base ${index}:`, base, 'bpPerPixel:', options.bpPerPixel)
            }
            this.renderBase(ctx, base, height, options)
        })

        // Draw grid lines if bases are large enough
        if (visibleBases.length > 0 && visibleBases[0].width > 8) {
            this.renderGridLines(ctx, visibleBases, height)
        }
    }

    /**
     * Render a single base
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {object} base - Base object with position and character
     * @param {number} height - Canvas height
     * @param {object} options - Rendering options
     */
    static renderBase(ctx, base, height, options) {
        const { base: baseChar, x, width } = base
        const bpPerPixel = options.bpPerPixel || 1
        const BP_PER_PIXEL_TEXT_THRESHOLD = 0.1  // Show text only if zoomed in beyond this

        // Get the fill color for this base
        const fillColor = options.baseColors[baseChar] || options.defaultColor

        if (bpPerPixel > BP_PER_PIXEL_TEXT_THRESHOLD) {
            // Zoomed out: draw colored bars only
            const FRAME_BORDER = 5
            const barHeight = height - FRAME_BORDER
            
            // Debug: log first 3 bars being drawn
            if (base.position < 68374556) {
                console.log(`SequenceRenderer.renderBase: Drawing bar for ${baseChar} at x=${x}, y=${FRAME_BORDER}, width=${width}, height=${barHeight}, color=${fillColor}`)
            }
            
            ctx.fillStyle = fillColor
            ctx.fillRect(x, FRAME_BORDER, width, barHeight)
        } else {
            // Zoomed in: draw text labels
            const centerX = x + width / 2
            const centerY = height / 2
            ctx.strokeStyle = fillColor
            ctx.lineWidth = 1
            ctx.strokeText(baseChar, centerX, centerY)
        }
    }

    /**
     * Render grid lines between bases
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} bases - Array of base objects
     * @param {number} height - Canvas height
     */
    static renderGridLines(ctx, bases, height) {
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)'
        ctx.lineWidth = 1
        
        bases.forEach(base => {
            ctx.beginPath()
            ctx.moveTo(base.x, 0)
            ctx.lineTo(base.x, height)
            ctx.stroke()
        })
    }

    /**
     * Render when zoomed out (no individual bases visible)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {object} dimensions - Canvas dimensions
     * @param {object} viewModel - SequenceViewModel object
     */
    static renderZoomedOut(ctx, dimensions, viewModel) {
        const { width, height } = dimensions
        
        // Draw a simple representation
        ctx.fillStyle = '#f0f0f0'
        ctx.fillRect(0, 0, width, height)
        
        // Draw sequence summary
        ctx.fillStyle = '#666666'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        const summary = viewModel.getSummary()
        const text = `DNA Sequence (${summary.totalBases} bases, GC: ${summary.gcContent.toFixed(1)}%)`
        ctx.fillText(text, width / 2, height / 2)
        
        // Draw a simple line representation
        ctx.strokeStyle = '#333333'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(10, height / 2)
        ctx.lineTo(width - 10, height / 2)
        ctx.stroke()
    }

    /**
     * Render when no data is available
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {object} dimensions - Canvas dimensions
     */
    static renderNoData(ctx, dimensions) {
        const { width, height } = dimensions
        
        // Draw background
        ctx.fillStyle = '#f8f8f8'
        ctx.fillRect(0, 0, width, height)
        
        // Draw border
        ctx.strokeStyle = '#cccccc'
        ctx.lineWidth = 1
        ctx.strokeRect(0, 0, width, height)
        
        // Draw message
        ctx.fillStyle = '#999999'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('No sequence data available', width / 2, height / 2)
    }

    /**
     * Get the preferred height for a sequence track
     * @param {object} viewModel - SequenceViewModel object
     * @returns {number} Preferred height in pixels
     */
    static getPreferredHeight(viewModel) {
        const options = viewModel.getRenderingOptions()
        return options.fontSize + 8 // Font size plus padding
    }
}
