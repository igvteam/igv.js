/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var igv = (function (igv) {

    igv.GeneTrack = function (config) {
        this.config = config;
        this.url = config.url;
        this.featureSource = new igv.BedFeatureSource(this.config);
        this.label = config.label;
        this.id = config.id || config.label;
        this.height = 100;
        this.minHeight = this.height;
        this.maxHeight = this.height;
        this.order = config.order;

        this.render = renderGene;
    };

    /**
     *
     * @param canvas   an igv.Canvas
     * @param refFrame
     * @param bpStart
     * @param bpEnd
     * @param pixelWidth
     * @param pixelHeight
     * @param continuation  -  Optional.   called on completion, no arguments.
     */
    igv.GeneTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, pixelWidth, pixelHeight, continuation, task) {

//        console.log("geneTrack.draw " + refFrame.chr);

        var chr =  refFrame.chr,
            track = this;

        canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});


        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

                var gene, len;

            if (featureList) {

                len = featureList.length;

//                console.log("geneTrack.featureSource.getFeatures " + featureList.length);

                canvas.setProperties({fillStyle: "rgb(150,150,150)", strokeStyle: "rgb(150,150,150)"});

                for (var i = 0; i < len; i++) {
                    gene = featureList[i];
                    if (gene.end < bpStart) continue;
                    if (gene.start > bpEnd) break;

                    track.render(gene, bpStart, refFrame.bpPerPixel, canvas);
                }
            }
            else {
                console.log("No feature list");
            }

            if (continuation) continuation();
        },
        task);
    };

    igv.GeneTrack.prototype.drawLabel = function (ctx) {
//        ctx.save();
//        ctx.textAlign = 'right';
//        ctx.verticalAlign = 'center';
//        ctx.strokeStyle = "black";
//        ctx.fillText(this.label, 90, this.height / 2);
//        ctx.restore();

    }

    function renderGene(gene, bpStart, xScale, canvas) {

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