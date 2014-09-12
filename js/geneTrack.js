var igv = (function (igv) {

    igv.GeneTrack = function (config) {
        this.url = config.url;
        this.featureSource = new igv.BedFeatureSource(this.url);
        this.label = config.label;
        this.id = config.id || config.label;
        this.height = 100;   // The preferred height
    }


    /**
     *
     * @param canvas   an igv.Canvas
     * @param bpStart
     * @param bpEnd
     * @param pixelWidth
     * @param pixelHeight
     * @param continuation  -  Optional.   called on completion, no arguments.
     */
    igv.GeneTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, pixelWidth, pixelHeight, continuation) {

        var chr, py, len, py, endBP, xScale, gene, px, px1, pw, exonCount, step, cy, py, direction,
            exon, ePx, ePx1, ePw;

        chr = refFrame.chr;

        canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});


        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

            var normalTextStyle = {font: 'bold 10px Arial', fillStyle: "black", strokeStyle: "black"};

            if (featureList) {

                len = featureList.length;

                canvas.setProperties({fillStyle: "rgb(150,150,150)", strokeStyle: "rgb(150,150,150)"});

                py = 20;

                for (var i = 0; i < len; i++) {
                    gene = featureList[i];
                    if (gene.end < bpStart) continue;
                    if (gene.start > bpEnd) break;

                    xScale = refFrame.bpPerPixel;

                    px = Math.round((gene.start - bpStart) / xScale);
                    px1 = Math.round((gene.end - bpStart) / xScale);
                    pw = Math.max(1, px1 - px);

                    exonCount = gene.exons ? gene.exons.length : 0;

                    if (exonCount == 0) {
                        canvas.fillRect(px, py, pw, 10);

                    }
                    else {
                        step = 8;
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
                            canvas.fillRect(ePx, py, ePw, 10);

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
            }

            if (continuation) continuation();
        });
    };

    igv.GeneTrack.prototype.drawLabel = function (ctx) {
//        ctx.save();
//        ctx.textAlign = 'right';
//        ctx.verticalAlign = 'center';
//        ctx.strokeStyle = "black";
//        ctx.fillText(this.label, 90, this.height / 2);
//        ctx.restore();

    }

    return igv;

})(igv || {});