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


    igv.configTrack = function(track, config) {
        track.url = config.url;
    }

    igv.BedTrack = function (config) {

        if (!config.type) config.type = igv.inferFileType(this.filename);

        igv.configTrack(this, config);

        this.featureSource = new igv.BedFeatureSource(this.config);

        if (this.type === "vcf") {
            this.render = renderVariant;
        }
        else {
            this.render = renderGene;
        }
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
    igv.BedTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, pixelWidth, pixelHeight, continuation, task) {

//        console.log("geneTrack.draw " + refFrame.chr);

        var chr = refFrame.chr,
            track = this;

        canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});


        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

                var gene, len;

                if (featureList) {

                    len = featureList.length;

                    canvas.setProperties({fillStyle: track.color, strokeStyle: track.color});
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

    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    igv.BedTrack.prototype.popupData = function (genomicLocation, xOffset, yOffset) {

        // We use the featureCache property rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        if (this.featureSource.featureCache) {

            var chr = igv.browser.referenceFrame.chr;  // TODO -- this should be passed in
            var tolerance = igv.browser.referenceFrame.bpPerPixel;  // We need some tolerance around genomicLocation, start with +/- 1 pixel
            var featureList = this.featureSource.featureCache.queryFeatures(chr, genomicLocation - tolerance, genomicLocation + tolerance);

            if (featureList && featureList.length > 0) {


                var popupData = [];
                featureList.forEach(function (feature) {
                    if (feature.popupData &&
                        feature.end >= genomicLocation - tolerance &&
                        feature.start <= genomicLocation + tolerance) {
                        var featureData = feature.popupData(genomicLocation);
                        if (featureData) {
                            if (popupData.length > 0) {
                                popupData.push("<HR>");
                            }
                            Array.prototype.push.apply(popupData, featureData);
                        }
                    }
                });
                return popupData;
            }

        }

        return null;
    }

    function renderGene(gene, bpStart, xScale, canvas) {

        var px, px1, pw, exonCount, cy, direction, exon, ePx, ePx1, ePw,
            py = 5,
            step = 8,
            h = 10;

        var normalTextStyle = {font: 'bold 10px Arial', fillStyle: "black", strokeStyle: "black"};

        px = Math.round((gene.start - bpStart) / xScale);
        px1 = Math.round((gene.end - bpStart) / xScale);
        pw = px1 - px;
        if (pw < 3) {
            pw = 3;
            px -= 1;
        }

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
        if (igv.selection) geneColor = igv.selection.colorForGene(gene.name); // TODO -- for gtex, figure out a better way to do this

        if ((px1 - px) > 10 || geneColor) {

            var geneStyle;
            if (geneColor) {
                geneStyle = {font: 'bold 12px Arial', fillStyle: geneColor, strokeStyle: geneColor}
            }
            else {
                geneStyle = normalTextStyle;
            }

            canvas.fillText(gene.name, px + ((px1 - px) / 2), py+20, geneStyle, {rotate: {angle: 45}});
        }
    }


    function renderVariant(variant, bpStart, xScale, canvas) {

        var px, px1, pw,
            py = 20,
            h = 10;


        px = Math.round((variant.start - bpStart) / xScale);
        px1 = Math.round((variant.end - bpStart) / xScale);
        pw = Math.max(1, px1 - px);
        if (pw < 3) {
            pw = 3;
            px -= 1;
        }

        canvas.fillRect(px, py, pw, h);


    }

    return igv;

})(igv || {});