/**
 * Pure rendering functions for wig tracks
 */
export class WigRenderer {
    /**
     * Render wig track to canvas
     */
    static render(ctx, viewModel, dimensions) {
        const { dataPoints, color, graphType, dataRange } = viewModel

        // Clear canvas
        ctx.clearRect(0, 0, dimensions.width, dimensions.height)

        if (!dataPoints || dataPoints.length === 0) {
            this.renderNoData(ctx, dimensions)
            return
        }

        // Render based on graph type
        switch (graphType) {
            case 'line':
                this.renderLine(ctx, viewModel, dimensions)
                break
            case 'points':
                this.renderPoints(ctx, viewModel, dimensions)
                break
            case 'bar':
            default:
                this.renderBars(ctx, viewModel, dimensions)
                break
        }

        // Draw baseline if data includes negative values
        if (dataRange.min < 0) {
            this.renderBaseline(ctx, viewModel, dimensions)
        }
    }

    /**
     * Render as bars (histogram style)
     */
    static renderBars(ctx, viewModel, dimensions) {
        const { dataPoints, color, dataRange } = viewModel
        const baselineY = viewModel.getY(0)

        ctx.fillStyle = color

        for (const point of dataPoints) {
            const x = viewModel.getX(point.start)
            const width = viewModel.getWidth(point.start, point.end)
            const valueY = viewModel.getY(point.value)
            
            // Calculate bar height from baseline
            const height = Math.abs(valueY - baselineY)
            const y = Math.min(valueY, baselineY)

            // Draw bar
            if (width > 0 && height > 0) {
                ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(width), Math.ceil(height))
            }

            // Draw overflow indicators
            if (point.value > dataRange.max) {
                ctx.fillStyle = 'rgb(255, 0, 255)' // Magenta for overflow
                ctx.fillRect(Math.floor(x), 0, Math.ceil(width), 3)
                ctx.fillStyle = color
            } else if (point.value < dataRange.min) {
                ctx.fillStyle = 'rgb(255, 0, 255)'
                ctx.fillRect(Math.floor(x), dimensions.height - 3, Math.ceil(width), 3)
                ctx.fillStyle = color
            }
        }
    }

    /**
     * Render as connected line
     */
    static renderLine(ctx, viewModel, dimensions) {
        const { dataPoints, color } = viewModel

        if (dataPoints.length === 0) return

        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.beginPath()

        let firstPoint = true
        for (const point of dataPoints) {
            const x = viewModel.getX((point.start + point.end) / 2)
            const y = viewModel.getY(point.value)

            if (firstPoint) {
                ctx.moveTo(x, y)
                firstPoint = false
            } else {
                ctx.lineTo(x, y)
            }
        }

        ctx.stroke()
    }

    /**
     * Render as points
     */
    static renderPoints(ctx, viewModel, dimensions) {
        const { dataPoints, color } = viewModel
        const pointSize = 3

        ctx.fillStyle = color

        for (const point of dataPoints) {
            const x = viewModel.getX((point.start + point.end) / 2)
            const y = viewModel.getY(point.value)

            ctx.beginPath()
            ctx.arc(x, y, pointSize, 0, 2 * Math.PI)
            ctx.fill()
        }
    }

    /**
     * Render baseline at y=0
     */
    static renderBaseline(ctx, viewModel, dimensions) {
        const y = viewModel.getY(0)

        ctx.strokeStyle = 'rgb(128, 128, 128)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(dimensions.width, y)
        ctx.stroke()
    }

    /**
     * Render "No data" message
     */
    static renderNoData(ctx, dimensions) {
        ctx.fillStyle = 'rgb(128, 128, 128)'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('No data in region', dimensions.width / 2, dimensions.height / 2)
    }
}

