/**
 * Pure rendering functions for gene/feature tracks
 */
export class GeneRenderer {
    /**
     * Render gene/feature track to canvas
     */
    static render(ctx, viewModel, dimensions) {
        const { features, layout, color } = viewModel

        // Clear canvas
        ctx.clearRect(0, 0, dimensions.width, dimensions.height)

        if (!features || features.length === 0) {
            this.renderNoData(ctx, dimensions)
            return
        }

        // Adjust height based on number of rows needed
        const neededHeight = layout.rowCount * (layout.rowHeight + layout.padding)
        
        // Render each feature
        for (const feature of features) {
            if (feature._row !== undefined) {
                this.renderFeature(ctx, feature, viewModel, color)
            }
        }
    }

    /**
     * Render a single feature
     */
    static renderFeature(ctx, feature, viewModel, defaultColor) {
        const x = viewModel.getX(Math.max(feature.start, viewModel.region.start))
        const width = viewModel.getWidth(
            Math.max(feature.start, viewModel.region.start),
            Math.min(feature.end, viewModel.region.end)
        )
        const y = feature._y
        const height = viewModel.layout.rowHeight

        // Use feature color if available, otherwise default
        const color = feature.color || defaultColor

        // Draw gene body
        if (feature.exons && feature.exons.length > 0) {
            // Draw introns as thin line
            this.renderIntrons(ctx, feature, viewModel, y + height / 2, color)
            
            // Draw exons as boxes
            for (const exon of feature.exons) {
                this.renderExon(ctx, exon, viewModel, y, height, color)
            }
        } else {
            // Simple feature - just a box
            ctx.fillStyle = color
            ctx.fillRect(x, y, width, height)
        }

        // Draw strand indicator
        if (feature.strand) {
            this.renderStrand(ctx, feature, viewModel, y, height)
        }

        // Draw label if there's room
        if (width > 30 && feature.name) {
            this.renderLabel(ctx, feature, viewModel, y, height)
        }
    }

    /**
     * Render introns as connecting lines
     */
    static renderIntrons(ctx, feature, viewModel, y, color) {
        const x1 = viewModel.getX(Math.max(feature.start, viewModel.region.start))
        const x2 = viewModel.getX(Math.min(feature.end, viewModel.region.end))

        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x1, y)
        ctx.lineTo(x2, y)
        ctx.stroke()
    }

    /**
     * Render an exon
     */
    static renderExon(ctx, exon, viewModel, y, height, color) {
        const x = viewModel.getX(Math.max(exon.start, viewModel.region.start))
        const width = viewModel.getWidth(
            Math.max(exon.start, viewModel.region.start),
            Math.min(exon.end, viewModel.region.end)
        )

        ctx.fillStyle = color
        ctx.fillRect(x, y, width, height)
        
        // Draw border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, width, height)
    }

    /**
     * Render strand indicator (arrows)
     */
    static renderStrand(ctx, feature, viewModel, y, height) {
        const x = viewModel.getX(Math.max(feature.start, viewModel.region.start))
        const width = viewModel.getWidth(
            Math.max(feature.start, viewModel.region.start),
            Math.min(feature.end, viewModel.region.end)
        )
        
        const arrowY = y + height / 2
        const arrowSpacing = 10
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.lineWidth = 1

        // Draw arrows based on strand
        if (feature.strand === '+') {
            for (let ax = x + 5; ax < x + width - 5; ax += arrowSpacing) {
                ctx.beginPath()
                ctx.moveTo(ax, arrowY - 3)
                ctx.lineTo(ax + 3, arrowY)
                ctx.lineTo(ax, arrowY + 3)
                ctx.stroke()
            }
        } else if (feature.strand === '-') {
            for (let ax = x + width - 5; ax > x + 5; ax -= arrowSpacing) {
                ctx.beginPath()
                ctx.moveTo(ax, arrowY - 3)
                ctx.lineTo(ax - 3, arrowY)
                ctx.lineTo(ax, arrowY + 3)
                ctx.stroke()
            }
        }
    }

    /**
     * Render feature label
     */
    static renderLabel(ctx, feature, viewModel, y, height) {
        const x = viewModel.getX(Math.max(feature.start, viewModel.region.start))
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.font = '10px Arial'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(feature.name, x + 3, y + height / 2)
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
}

