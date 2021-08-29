/**
 *
 * @param feature
 * @param bpStart  genomic location of the left edge of the current canvas
 * @param xScale  scale in base-pairs per pixel
 * @param pixelHeight  pixel height of the current canvas
 * @param ctx  the canvas 2d context
 */
export function renderFusionJuncSpan(feature, bpStart, xScale, pixelHeight, ctx) {
    var py;
    var rowHeight = (this.displayMode === "EXPANDED") ? this.expandedRowHeight : this.squishedRowHeight;

    if (this.display === "COLLAPSED") {
        py = this.margin;
    }

    if (this.displayMode === "SQUISHED" && feature.row !== undefined) {
        py = this.margin + rowHeight * feature.row;
    } else if (this.displayMode === "EXPANDED" && feature.row !== undefined) {
        py = this.margin + rowHeight * feature.row;
    }

    var cy = py + 0.5 * rowHeight;
    var topY = cy - 0.5 * rowHeight;
    var bottomY = cy + 0.5 * rowHeight;

    // draw the junction arc
    var junctionLeftPx = Math.round((feature.junction_left - bpStart) / xScale);
    var junctionRightPx = Math.round((feature.junction_right - bpStart) / xScale);

    ctx.beginPath();
    ctx.moveTo(junctionLeftPx, cy);
    ctx.bezierCurveTo(junctionLeftPx, topY, junctionRightPx, topY, junctionRightPx, cy);

    ctx.lineWidth = 1 + Math.log(feature.num_junction_reads) / Math.log(2);
    ctx.strokeStyle = 'blue';
    ctx.stroke();

    // draw the spanning arcs
    var spanningCoords = feature.spanning_frag_coords;
    for (var i = 0; i < spanningCoords.length; i++) {
        var spanningInfo = spanningCoords[i];

        var spanLeftPx = Math.round((spanningInfo.left - bpStart) / xScale);
        var spanRightPx = Math.round((spanningInfo.right - bpStart) / xScale);


        ctx.beginPath();
        ctx.moveTo(spanLeftPx, cy);
        ctx.bezierCurveTo(spanLeftPx, bottomY, spanRightPx, bottomY, spanRightPx, cy);

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'purple';
        ctx.stroke();
    }
}