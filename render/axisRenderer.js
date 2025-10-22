import { generateTicks, formatNumber } from '../util/scale.js'

/**
 * Renderer for Y-axis labels (for wig tracks)
 */
export class AxisRenderer {
    /**
     * Render Y-axis with ticks and labels
     */
    static render(ctx, viewModel, dimensions, axisWidth = 50) {
        const { dataRange } = viewModel

        // Clear axis area
        ctx.clearRect(0, 0, axisWidth, dimensions.height)

        // Generate tick marks
        const ticks = generateTicks(dataRange.min, dataRange.max, 5)

        // Draw ticks and labels
        ctx.fillStyle = 'black'
        ctx.font = '10px Arial'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'

        for (const tickValue of ticks) {
            const y = viewModel.getY(tickValue)
            const label = formatNumber(tickValue)

            // Draw tick mark
            ctx.strokeStyle = 'black'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(axisWidth - 5, y)
            ctx.lineTo(axisWidth, y)
            ctx.stroke()

            // Draw label
            ctx.fillText(label, axisWidth - 7, y)
        }

        // Draw axis line
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(axisWidth, 0)
        ctx.lineTo(axisWidth, dimensions.height)
        ctx.stroke()
    }
}

