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

"use strict";


const EqtlTrack = igv.extend(igv.TrackBase,

    function (config, browser) {

        var url = config.url,
            label = config.name;

        this.config = config;
        this.url = url;
        this.name = label;
        this.pValueField = config.pValueField || "pValue";
        this.geneField = config.geneField || "geneSymbol";
        this.snpField = config.snpField || "snp";

        const min = config.minLogP || config.min;
        const max = config.maxLogP || config.max;
        this.dataRange = {
            min: min || 3.5,
            max: max || 25
        }
        if (!max) {
            this.autoscale = true;
        } else {
            this.autoscale = config.autoscale;
        }
        this.autoscalePercentile = (config.autoscalePercentile === undefined ? 98 : config.autoscalePercentile);


        this.background = config.background;    // No default
        this.divider = config.divider || "rgb(225,225,225)";
        this.dotSize = config.dotSize || 2;
        this.height = config.height || 100;
        this.autoHeight = false;
        this.disableButtons = config.disableButtons;

        // Limit visibility window to 2 mb,  gtex server gets flaky beyond that
        this.visibilityWindow = config.visibilityWindow === undefined ?
            2000000 : config.visibilityWindow >= 0 ? Math.min(2000000, config.visibilityWindow) : 2000000;

        this.featureSource = new igv.FeatureSource(config, browser.genome);

        igv.GtexUtils.gtexLoaded = true;

    });

EqtlTrack.prototype.paintAxis = function (ctx, pixelWidth, pixelHeight) {

    var track = this,
        yScale = (track.dataRange.max - track.dataRange.min) / pixelHeight;

    var font = {
        'font': 'normal 10px Arial',
        'textAlign': 'right',
        'strokeStyle': "black"
    };

    igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

    // Determine a tick spacing such that there is at least 10 pixels between ticks

    var n = Math.ceil((this.dataRange.max - this.dataRange.min) * 10 / pixelHeight);


    for (var p = 4; p <= track.dataRange.max; p += n) {

        var x1,
            x2,
            y1,
            y2,
            ref;

        // TODO: Dashes may not actually line up with correct scale. Ask Jim about this

        ref = 0.85 * pixelWidth;
        x1 = ref - 5;
        x2 = ref;

        y1 = y2 = pixelHeight - Math.round((p - track.dataRange.min) / yScale);

        igv.graphics.strokeLine(ctx, x1, y1, x2, y2, font); // Offset dashes up by 2 pixel

        if (y1 > 8) {
            igv.graphics.fillText(ctx, p, x1 - 1, y1 + 2, font);
        } // Offset numbers down by 2 pixels;
    }

    font['textAlign'] = 'center';

    igv.graphics.fillText(ctx, "-log10(pvalue)", pixelWidth / 4, pixelHeight / 2, font, {rotate: {angle: -90}});

};

EqtlTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {

    const pValueField = this.pValueField;

    return this.featureSource.getFeatures(chr, bpStart, bpEnd)
        .then(function (features) {
            features.forEach(function (f) {
                f.value = f[pValueField];
            })
            return features;
        })
};

EqtlTrack.prototype.draw = function (options) {

    var self = this,
        featureList = options.features,
        ctx = options.context,
        bpPerPixel = options.bpPerPixel,
        bpStart = options.bpStart,
        pixelWidth = options.pixelWidth,
        pixelHeight = options.pixelHeight,
        bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
        yScale = (self.dataRange.max - self.dataRange.min) / pixelHeight,
        selection = options.genomicState.selection;

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

        var radius = drawSelected ? 2 * self.dotSize : self.dotSize,
            eqtl,
            i,
            px,
            py,
            color,
            isSelected,
            snp,
            geneName,
            capped;

        for (i = 0; i < len; i++) {

            eqtl = featureList[i];
            px = (Math.round(eqtl.position - bpStart + 0.5)) / bpPerPixel;
            if (px < 0) continue;
            else if (px > pixelWidth) break;


            snp = eqtl.snp.toUpperCase();
            geneName = eqtl[self.geneField].toUpperCase();

            isSelected = selection &&
                (selection.snp === snp || selection.gene === geneName);

            if (!drawSelected || isSelected) {

                // Add eqtl's gene to the selection if this is the selected snp.
                // TODO -- this should not be done here in the rendering code.
                if (selection && selection.snp === snp) {
                    selection.addGene(geneName);
                }

                var mLogP = -Math.log(eqtl[self.pValueField]) / Math.LN10;
                if (mLogP >= self.dataRange.min) {

                    if (mLogP > self.dataRange.max) {
                        mLogP = self.dataRange.max;
                        capped = true;
                    } else {
                        capped = false;

                    }

                    py = Math.max(0 + radius, pixelHeight - Math.round((mLogP - self.dataRange.min) / yScale));
                    eqtl.px = px;
                    eqtl.py = py;

                    if (drawSelected && selection) {
                        color = selection.colorForGene(geneName);
                        igv.graphics.setProperties(ctx, {fillStyle: color, strokeStyle: "black"});
                    } else {
                        color = capped ? "rgb(150, 150, 150)" : "rgb(180, 180, 180)";
                        igv.graphics.setProperties(ctx, {fillStyle: color, strokeStyle: color});
                    }

                    igv.graphics.fillCircle(ctx, px, py, radius);
                    igv.graphics.strokeCircle(ctx, px, py, radius);
                }
            }
        }
    }

};

/**
 * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
 */
EqtlTrack.prototype.popupData = function (config) {

    let features = config.viewport.getCachedFeatures();
    if (!features || features.length === 0) return [];

    let genomicLocation = config.genomicLocation,
        xOffset = config.x,
        yOffset = config.y,
        referenceFrame = config.viewport.genomicState.referenceFrame,
        tolerance = 2 * this.dotSize * referenceFrame.bpPerPixel,
        dotSize = this.dotSize,
        tissue = this.name,
        popupData = [];

    features.forEach(function (feature) {
        if (feature.end >= genomicLocation - tolerance &&
            feature.start <= genomicLocation + tolerance &&
            feature.py - yOffset < 2 * dotSize) {

            if (popupData.length > 0) {
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


EqtlTrack.prototype.menuItemList = function () {

    var self = this,
        menuItems = [];

    menuItems.push(igv.dataRangeMenuItem(this.trackView));

    menuItems.push({
        object: igv.createCheckbox("Autoscale", self.autoscale),
        click: function () {
            var $fa = $(this).find('i');

            self.autoscale = !self.autoscale;

            if (true === self.autoscale) {
                $fa.removeClass('igv-fa-check-hidden');
                $fa.addClass('igv-fa-check-visible');
            } else {
                $fa.removeClass('igv-fa-check-visible');
                $fa.addClass('igv-fa-check-hidden');
            }

            self.config.autoscale = self.autoscale;
            self.trackView.setDataRange(undefined, undefined, self.autoscale);
        }
    });

    return menuItems;

};

EqtlTrack.prototype.doAutoscale = function (featureList) {

    if (featureList.length > 0) {

        var values = featureList
            .map(function (eqtl) {
                return -Math.log(eqtl.value) / Math.LN10
            });

        this.dataRange.max = igv.Math.percentile(values, this.autoscalePercentile);
    } else {
        // No features -- default
        const max = this.config.maxLogP || this.config.max;
        this.dataRange.max = max || 25
    }

    return this.dataRange;
}

export default EqtlTrack;