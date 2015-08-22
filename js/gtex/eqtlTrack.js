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


    igv.EqtlTrack = function (config) {


        var url = config.url,
            label = config.name;

        this.config = config;
        this.url = url;
        this.name = label;
        this.pValueField = config.pValueField || "pValue";
        this.geneField = config.geneField || "geneName";
        this.minLogP = config.minLogP || 3.5;
        this.maxLogP = config.maxLogP || 25;
        this.background = config.background;    // No default
        this.divider = config.divider || "rgb(225,225,225)";
        this.dotSize = config.dotSize || 2;
        this.height = config.height || 100;
        this.autoHeight = false;
        this.disableButtons = config.disableButtons;

        this.featureSource = new igv.FeatureSource(config);


        this.onsearch = function (feature, source) {
            selectedFeature.call(this, feature, source);
        }
    }

    igv.EqtlTrack.prototype.paintAxis = function (ctx, pixelWidth, pixelHeight) {

        var track = this,
            yScale = (track.maxLogP - track.minLogP) / pixelHeight;

        var font = {
            'font': 'normal 10px Arial',
            'textAlign': 'right',
            'strokeStyle': "black"
        };

        igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        for (var p = 4; p <= track.maxLogP; p += 2) {
            var yp = pixelHeight - Math.round((p - track.minLogP) / yScale);
            // TODO: Dashes may not actually line up with correct scale. Ask Jim about this
            igv.graphics.strokeLine(ctx, 45, yp - 2, 50, yp - 2, font); // Offset dashes up by 2 pixel
            igv.graphics.fillText(ctx, p, 44, yp + 2, font); // Offset numbers down by 2 pixels; TODO: error
        }


        font['textAlign'] = 'center';


        igv.graphics.fillText(ctx, "-log10(pvalue)", pixelWidth / 2, pixelHeight / 2, font, {rotate: {angle: -90}});


    };


    igv.EqtlTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, continuation, task) {

        this.featureSource.getFeatures(chr, bpStart, bpEnd, continuation, task)
    }


    igv.EqtlTrack.prototype.draw = function (options) {

        var track = this,
            featureList = options.features,
            ctx = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            pixelHeight = options.pixelHeight,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            yScale = (track.maxLogP - track.minLogP) / pixelHeight;

        // Background
        if (this.background) igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': this.background});
        igv.graphics.strokeLine(ctx, 0, pixelHeight - 1, pixelWidth, pixelHeight - 1, {'strokeStyle': this.divider});

        if (ctx) {

            var len = featureList.length;


            ctx.save();


            // Draw in two passes, with "selected" eqtls drawn last
            drawEqtls(false);
            drawEqtls(true);


            ctx.restore();

        }

        function drawEqtls(drawSelected) {

            var radius = drawSelected ? 2 * track.dotSize : track.dotSize,
                eqtl, i, px, py, color, isSelected, snp, geneName, selection;


            //ctx.fillStyle = igv.selection.colorForGene(eqtl.geneName);
            igv.graphics.setProperties(ctx, {
                fillStyle: "rgb(180, 180, 180)",
                strokeStyle: "rgb(180, 180, 180)"
            });

            for (i = 0; i < len; i++) {

                eqtl = featureList[i];
                snp = eqtl.snp.toUpperCase();
                geneName = eqtl[track.geneField].toUpperCase();
                selection = igv.browser.selection;
                isSelected = selection &&
                (selection.snp === snp || selection.gene === geneName);

                if (drawSelected && !isSelected) continue;

                // Add eqtl's gene to the selection if this is the selected snp.
                // TODO -- this should not be done here in the rendering code.
                if (selection && selection.snp === snp) {
                    selection.addGene(geneName);
                }

                if (drawSelected && selection) {
                    color = selection.colorForGene(geneName);
                }

                if (drawSelected && color === undefined) continue;   // This should be impossible


                px = (Math.round(eqtl.position - bpStart + 0.5)) / bpPerPixel;
                if (px < 0) continue;
                else if (px > pixelWidth) break;

                var mLogP = -Math.log(eqtl[track.pValueField]) / Math.LN10;
                if (mLogP < track.minLogP) continue;

                py = Math.max(0 + radius, pixelHeight - Math.round((mLogP - track.minLogP) / yScale));
                eqtl.px = px;
                eqtl.py = py;

                if (color) igv.graphics.setProperties(ctx, {fillStyle: color, strokeStyle: "black"});
                igv.graphics.fillCircle(ctx, px, py, radius);
                igv.graphics.strokeCircle(ctx, px, py, radius);
            }
        }

    }


    function selectedFeature(feature, source) {
        console.log(feature + " " + source);

        // TODO -- temporary hack, determine type from the source
        var type = source === "gtex" ? "snp" : "gene";

        this.selection = new GtexSelection(type == 'gene' ? {gene: feature} : {snp: feature});
        igv.browser.update();
    }

    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    igv.EqtlTrack.prototype.popupData = function (genomicLocation, xOffset, yOffset) {

        // We use the featureCache property rather than method to avoid async load.  If the
        // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
        if (this.featureSource.featureCache) {

            var chr = igv.browser.referenceFrame.chr,  // TODO -- this should be passed in
                tolerance = 2 * this.dotSize * igv.browser.referenceFrame.bpPerPixel,
                featureList = this.featureSource.featureCache.queryFeatures(chr, genomicLocation - tolerance, genomicLocation + tolerance),
                dotSize = this.dotSize,
                tissue = this.name;

            if (featureList && featureList.length > 0) {


                var popupData = [];
                featureList.forEach(function (feature) {
                    if (feature.end >= genomicLocation - tolerance &&
                        feature.start <= genomicLocation + tolerance &&
                        feature.py - yOffset < 2 * dotSize) {

                        if(popupData.length > 0) {
                            popupData.push("<hr>");
                        }

                        popupData.push(
                            {name: "snp id", value: feature.snp},
                            {name: "gene id", value: feature.geneId},
                            {name: "gene name", value: feature.geneName},
                            {name: "p value", value: feature.pValue},
                            {name: "tissue", value: tissue});

                    }
                });
                return popupData;
            }
        }
    }

    GtexSelection = function (selection) {

        this.geneColors = {};
        this.gene = null;
        this.snp = null;
        this.genesCount = 0;

        if (selection.gene) {
            this.gene = selection.gene.toUpperCase();
            this.geneColors[this.gene] = brewer[this.genesCount++];

        }
        if (selection.snp) {
            this.snp = selection.snp.toUpperCase();
        }

    }

    GtexSelection.prototype.addGene = function (geneName) {
        if (!this.geneColors[geneName.toUpperCase()]) {
            this.geneColors[geneName.toUpperCase()] = brewer[this.genesCount++];
        }
    }

    GtexSelection.prototype.colorForGene = function (geneName) {
        return this.geneColors[geneName.toUpperCase()];
    }

    var brewer = new Array();
// Set +!
    brewer.push("rgb(228,26,28)");
    brewer.push("rgb(55,126,184)");
    brewer.push("rgb(77,175,74)");
    brewer.push("rgb(166,86,40)");
    brewer.push("rgb(152,78,163)");
    brewer.push("rgb(255,127,0)");
    brewer.push("rgb(247,129,191)");
    brewer.push("rgb(153,153,153)");
    brewer.push("rgb(255,255,51)");

// #Set 2
    brewer.push("rgb(102, 194, 165");
    brewer.push("rgb(252, 141, 98");
    brewer.push("rgb(141, 160, 203");
    brewer.push("rgb(231, 138, 195");
    brewer.push("rgb(166, 216, 84");
    brewer.push("rgb(255, 217, 47");
    brewer.push("rgb(229, 196, 148");
    brewer.push("rgb(179, 179, 179");

//#Set 3
    brewer.push("rgb( 141, 211, 199");
    brewer.push("rgb(255, 255, 179");
    brewer.push("rgb(190, 186, 218");
    brewer.push("rgb(251, 128, 114");
    brewer.push("rgb(128, 177, 211");
    brewer.push("rgb(253, 180, 98");
    brewer.push("rgb(179, 222, 105");
    brewer.push("rgb(252, 205, 229");
    brewer.push("rgb(217, 217, 217");
    brewer.push("rgb(188, 128, 189");
    brewer.push("rgb(204, 235, 197");
    brewer.push("rgb(255, 237, 111");


    return igv;

})(igv || {});
