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
        const { sequenceBases, getRenderingOptions } = viewModel
        const { width, height } = dimensions

        // Clear canvas
        ctx.clearRect(0, 0, width, height)

        if (!sequenceBases || sequenceBases.length === 0) {
            this.renderNoData(ctx, dimensions)
            return
        }

        const options = getRenderingOptions()
        
        if (!options.showBases) {
            this.renderZoomedOut(ctx, dimensions, viewModel)
            return
        }

        // Set up text rendering
        ctx.font = `${options.fontSize}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Render each visible base
        const visibleBases = viewModel.getVisibleBases()
        
        visibleBases.forEach(base => {
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
        const centerX = x + width / 2
        const centerY = height / 2

        // Draw background rectangle
        ctx.fillStyle = this.getBaseBackgroundColor(baseChar, options)
        ctx.fillRect(x, 0, width, height)

        // Draw base character
        ctx.fillStyle = this.getBaseTextColor(baseChar, options)
        ctx.fillText(baseChar, centerX, centerY)
    }

    /**
     * Get background color for a base
     * @param {string} base - Base character
     * @param {object} options - Rendering options
     * @returns {string} Background color
     */
    static getBaseBackgroundColor(base, options) {
        const baseBackgrounds = {
            'A': 'rgba(255, 200, 200, 0.3)',  // Light red
            'T': 'rgba(200, 255, 200, 0.3)',  // Light green
            'G': 'rgba(200, 200, 255, 0.3)',  // Light blue
            'C': 'rgba(255, 220, 200, 0.3)'   // Light orange
        }
        
        return baseBackgrounds[base] || 'rgba(240, 240, 240, 0.3)'
    }

    /**
     * Get text color for a base
     * @param {string} base - Base character
     * @param {object} options - Rendering options
     * @returns {string} Text color
     */
    static getBaseTextColor(base, options) {
        return options.baseColors[base] || options.defaultColor
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
