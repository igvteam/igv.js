/**
 *
 * @param feature
 * @param bpStart  genomic location of the left edge of the current canvas
 * @param xScale  scale in base-pairs per pixel
 * @param pixelHeight  pixel height of the current canvas
 * @param ctx  the canvas 2d context
 */
export function renderFusionJuncSpan(feature, bpStart, xScale, pixelHeight, ctx) {

    const rowHeight = (this.displayMode === "EXPANDED") ? this.expandedRowHeight : this.squishedRowHeight
    let py = this.margin
    if (this.displayMode !== "COLLAPSED" && feature.row !== undefined) {
        py += feature.row * rowHeight
    }

    const cy = py + 0.5 * rowHeight
    const topY = cy - 0.5 * rowHeight
    const bottomY = cy + 0.5 * rowHeight

    // draw the junction arc
    const junctionLeftPx = Math.round((feature.junction_left - bpStart) / xScale)
    const junctionRightPx = Math.round((feature.junction_right - bpStart) / xScale)

    ctx.beginPath()
    ctx.moveTo(junctionLeftPx, cy)
    ctx.bezierCurveTo(junctionLeftPx, topY, junctionRightPx, topY, junctionRightPx, cy)

    ctx.lineWidth = 1 + Math.log(feature.num_junction_reads) / Math.log(2)
    ctx.strokeStyle = 'blue'
    ctx.stroke()

    // draw the spanning arcs
    const spanningCoords = feature.spanning_frag_coords
    for (let i = 0; i < spanningCoords.length; i++) {

        const spanningInfo = spanningCoords[i]
        const spanLeftPx = Math.round((spanningInfo.left - bpStart) / xScale)
        const spanRightPx = Math.round((spanningInfo.right - bpStart) / xScale)

        ctx.beginPath()
        ctx.moveTo(spanLeftPx, cy)
        ctx.bezierCurveTo(spanLeftPx, bottomY, spanRightPx, bottomY, spanRightPx, cy)

        ctx.lineWidth = 1
        ctx.strokeStyle = 'purple'
        ctx.stroke()
    }
}