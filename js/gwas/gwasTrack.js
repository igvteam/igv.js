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

// Simple variant track for mpg prototype


var igv = (function (igv) {

    const DEFAULT_POPOVER_WINDOW = 100000000;

    igv.GWASTrack = function (config) {
        this.config = config;
        this.url = config.url;
        this.name = config.name;
        this.trait = config.trait;
        this.height = config.height || 100;   // The preferred height
        this.minLogP = config.minLogP || 0;
        this.maxLogP = config.maxLogP || 15;
        this.background = config.background;    // No default
        this.divider = config.divider || "rgb(225,225,225)";
        this.dotSize = config.dotSize || 4;
        this.popoverWindow = (config.popoverWindow === undefined ? DEFAULT_POPOVER_WINDOW : config.popoverWindow);

        this.description = config.description;  // might be null
        this.proxy = config.proxy;   // might be null

        this.portalURL = config.portalURL ? config.portalURL : window.location.origin;
        this.variantURL = config.variantURL || "http://www.type2diabetesgenetics.org/variant/variantInfo/";
        this.traitURL = config.traitURL || "http://www.type2diabetesgenetics.org/trait/traitInfo/";

        var cs = config.colorScale || {
            thresholds: [5e-8, 5e-4, 0.5],
            colors: ["rgb(255,50,50)", "rgb(251,100,100)", "rgb(251,170,170)", "rgb(227,238,249)"]
        };

        this.pvalue = config.pvalue ? config.pvalue : "PVALUE";

        this.colorScale = new igv.BinnedColorScale(cs);

        // An obvious hack -- the source should be passed in as an arbument
        if(config.format && ("gtexGWAS" === config.format)) {
            this.featureSource = new igv.FeatureSource(config);
        } else {
            this.featureSource = new igv.T2DVariantSource(config);
        }

    }


    igv.GWASTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, continuation, task) {

        this.featureSource.getFeatures(chr, bpStart, bpEnd, continuation, task)
    }


    igv.GWASTrack.prototype.draw = function (options) {

        var track = this,
            featureList = options.features,
            ctx = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            pixelHeight = options.pixelHeight,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            yScale = (track.maxLogP - track.minLogP) / pixelHeight,
            enablePopover = (bpEnd - bpStart) < DEFAULT_POPOVER_WINDOW;

        if (enablePopover) {
            this.po = [];
        }
        else {
            this.po = undefined;
        }

        if (this.background) igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': this.background});
        igv.graphics.strokeLine(ctx, 0, pixelHeight - 1, pixelWidth, pixelHeight - 1, {'strokeStyle': this.divider});

        var variant, pos, len, xScale, px, px1, pw, py, color, pvalue, val;

        if (featureList) {
            len = featureList.length;

            for (var i = 0; i < len; i++) {

                variant = featureList[i];

                pos = variant.start;     // TODO fixme

                if (pos < bpStart) continue;
                if (pos > bpEnd) break;

                pvalue = variant.pvalue || variant[track.pvalue];
                if (!pvalue) continue;

                color = track.colorScale.getColor(pvalue);
                val = -Math.log(pvalue) / 2.302585092994046;

                xScale = bpPerPixel;

                px = Math.round((pos - bpStart) / xScale);

                py = Math.max(track.dotSize, pixelHeight - Math.round((val - track.minLogP) / yScale));

                if (color) igv.graphics.setProperties(ctx, {fillStyle: color, strokeStyle: "black"});

                igv.graphics.fillCircle(ctx, px, py, track.dotSize);
                //canvas.strokeCircle(px, py, radius);

                if (enablePopover) track.po.push({x: px, y: py, feature: variant});

            }
        }

    };


    igv.GWASTrack.prototype.paintAxis = function (ctx, pixelWidth, pixelHeight) {

        var track = this,
            yScale = (track.maxLogP - track.minLogP) / pixelHeight;

        var font = {'font': 'normal 10px Arial',
            'textAlign': 'right',
            'strokeStyle': "black"};

        igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        for (var p = 2; p < track.maxLogP; p += 2) {
            var yp = pixelHeight - Math.round((p - track.minLogP) / yScale);
            // TODO: Dashes may not actually line up with correct scale. Ask Jim about this
            igv.graphics.strokeLine(ctx, 45, yp - 2, 50, yp - 2, font); // Offset dashes up by 2 pixel
            igv.graphics.fillText(ctx, p, 44, yp + 2, font); // Offset numbers down by 2 pixels;
        }


        font['textAlign'] = 'center';


        igv.graphics.fillText(ctx, "-log10(pvalue)", pixelWidth / 2, pixelHeight / 2, font, {rotate: {angle: -90}});


    };


    igv.GWASTrack.prototype.popupData = function (genomicLocation, xOffset, yOffset) {

        var i,
            len,
            p,
            dbSnp,
            url,
            data = [],
            chr,
            pos,
            pvalue;

        if (this.po) {
            for (i = 0, len = this.po.length; i < len; i++) {
                p = this.po[i];

                if (Math.abs(xOffset - p.x) < this.dotSize && Math.abs(yOffset - p.y) <= this.dotSize) {

                    chr = p.feature.CHROM || p.feature.chr;   // TODO fixme
                    pos = p.feature.POS || p.feature.start;   // TODO fixme
                    pvalue = p.feature[this.pvalue] || p.feature.pvalue;
                    dbSnp = p.feature.DBSNP_ID;


                    if (dbSnp) {
                        url = this.variantURL.startsWith("http") ? this.variantURL : this.portalURL + "/" + this.variantURL;
                        data.push("<a target='_blank' href='" + url + "' >" + dbSnp + "</a>");
                    }
                    data.push(chr + ":" + pos.toString());
                    data.push({name: 'p-value', value: pvalue});

                    if (p.feature.ZSCORE) {
                        data.push({name: 'z-score', value: p.feature.ZSCORE});
                    }

                    if (dbSnp) {
                        url = this.traitURL.startsWith("http") ? this.traitURL : this.portalURL + "/" + this.traitURL;
                        data.push("<a target='_blank' href='" + url + "'>" + "see all available statistics for this variant</a>");
                    }

                    if (i < len - 1) {
                        data.push("<p/>");
                    }
                }
            }
        } else {
            data.push("Popover not available at this resolution.")

        }
        return data;
    };


    return igv;

})(igv || {});