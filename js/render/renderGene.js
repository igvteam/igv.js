var igv = (function (igv) {


    igv.renderGene = function (gene, bpStart, xScale, canvas) {

        var px, px1, pw, exonCount, cy, direction, exon, ePx, ePx1, ePw,
            py = 20,
            step = 8,
            h = 10;

        var normalTextStyle = {font: 'bold 10px Arial', fillStyle: "black", strokeStyle: "black"};

        px = Math.round((gene.start - bpStart) / xScale);
        px1 = Math.round((gene.end - bpStart) / xScale);
        pw = Math.max(1, px1 - px);

        exonCount = gene.exons ? gene.exons.length : 0;

        if (exonCount == 0) {
            canvas.fillRect(px, py, pw, h);

        }
        else {
            cy = py + 5;
            canvas.strokeLine(px, cy, px1, cy);
            direction = gene.strand == '+' ? 1 : -1;
            for (var x = px + step / 2; x < px1; x += step) {
                canvas.strokeLine(x - direction * 2, cy - 2, x, cy);
                canvas.strokeLine(x - direction * 2, cy + 2, x, cy);
            }
            for (var e = 0; e < exonCount; e++) {
                exon = gene.exons[e];
                ePx = Math.round((exon.start - bpStart) / xScale);
                ePx1 = Math.round((exon.end - bpStart) / xScale);
                ePw = Math.max(1, ePx1 - ePx);
                canvas.fillRect(ePx, py, ePw, h);

            }
        }

        var geneColor;
        if (igv.selection) geneColor = igv.selection.colorForGene(gene.name);

        if ((px1 - px) > 10 || geneColor) {

            var geneStyle;
            if (geneColor) {
                geneStyle = {font: 'bold 12px Arial', fillStyle: geneColor, strokeStyle: geneColor}
            }
            else {
                geneStyle = normalTextStyle;
            }

            canvas.fillText(gene.name, px + ((px1 - px) / 2), 2 * py, geneStyle, {rotate: {angle: 45}});
        }
    }


    return igv;

})(igv || {});