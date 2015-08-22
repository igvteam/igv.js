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

    var sortDirection = 1;

    igv.SegTrack = function (config) {

        igv.configTrack(this, config);

        this.displayMode = config.displayMode || "SQUISHED"; // EXPANDED | SQUISHED

        this.maxHeight = config.maxHeight || 500;
        this.sampleSquishHeight = config.sampleSquishHeight || 2;
        this.sampleExpandHeight = config.sampleExpandHeight || 12;

        this.posColorScale = config.posColorScale ||
            new igv.GradientColorScale(
                {
                    low: 0.1,
                    lowR: 255,
                    lowG: 255,
                    lowB: 255,
                    high: 1.5,
                    highR: 255,
                    highG: 0,
                    highB: 0
                }
            );
        this.negColorScale = config.negColorScale ||
            new igv.GradientColorScale(
                {
                    low: -1.5,
                    lowR: 0,
                    lowG: 0,
                    lowB: 255,
                    high: -0.1,
                    highR: 255,
                    highG: 255,
                    highB: 255
                }
            );

        this.sampleCount = 0;
        this.samples = {};
        this.sampleNames = [];
        this.featureSource = new igv.FeatureSource(this.config);

    };

    igv.SegTrack.prototype.popupMenuItems = function (popover) {

        var myself = this;

        return [
            {
                name: ("SQUISHED" === this.displayMode) ? "Expand sample hgt" : "Squish sample hgt" ,
                click: function () {
                    popover.hide();
                    myself.toggleSampleHeight();
                }
            }
        ];

    };

    igv.SegTrack.prototype.toggleSampleHeight = function () {

        this.displayMode  = ("SQUISHED" === this.displayMode) ? "EXPANDED" : "SQUISHED";

        this.trackView.update();
    };

    igv.SegTrack.prototype.getFeatures = function (chr, bpStart, bpEnd, continuation, task) {

        this.featureSource.getFeatures(chr, bpStart, bpEnd, continuation, task)
    };

    igv.SegTrack.prototype.draw = function (options) {

        var myself = this,
            featureList,
            ctx,
            bpPerPixel,
            bpStart,
            pixelWidth,
            pixelHeight,
            bpEnd,
            segment,
            len,
            sample,
            i,
            y,
            color,
            value,
            px,
            px1,
            pw,
            xScale,
            sampleHeight;

        sampleHeight = ("SQUISHED" === this.displayMode) ? this.sampleSquishHeight : this.sampleExpandHeight;

        ctx = options.context;
        pixelWidth = options.pixelWidth;
        pixelHeight = options.pixelHeight;
        igv.graphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

        featureList = options.features;
        if (featureList) {

            bpPerPixel = options.bpPerPixel;
            bpStart = options.bpStart;
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1;
            xScale = bpPerPixel;

            for (i = 0, len = featureList.length; i < len; i++) {
                sample = featureList[i].sample;
                if (!this.samples.hasOwnProperty(sample)) {
                    this.samples[sample] = myself.sampleCount;
                    this.sampleNames.push(sample);
                    this.sampleCount++;
                }
            }

            checkForLog(featureList);

            for (i = 0, len = featureList.length; i < len; i++) {

                segment = featureList[i];

                if (segment.end < bpStart) continue;
                if (segment.start > bpEnd) break;

                y = myself.samples[segment.sample] * sampleHeight;

                value = segment.value;
                if (!myself.isLog) {
                    value = Math.log2(value / 2);
                }

                if (value < -0.1) {
                    color = myself.negColorScale.getColor(value);
                }
                else if (value > 0.1) {
                    color = myself.posColorScale.getColor(value);
                }
                else {
                    color = "white";
                }

                px = Math.round((segment.start - bpStart) / xScale);
                px1 = Math.round((segment.end - bpStart) / xScale);
                pw = Math.max(1, px1 - px);

                igv.graphics.fillRect(ctx, px, y, pw, sampleHeight, {fillStyle: color});

            }
        }
        else {
            console.log("No feature list");
        }


        function checkForLog(featureList) {
            var i;
            if (myself.isLog === undefined) {
                myself.isLog = false;
                for (i = 0; i < featureList.length; i++) {
                    if (featureList[i].value < 0) {
                        myself.isLog = true;
                        return;
                    }
                }
            }
        }
    };

    /**
     * Optional method to compute pixel height to accomodate the list of features.  The implementation below
     * has side effects (modifiying the samples hash).  This is unfortunate, but harmless.
     *
     * @param features
     * @returns {number}
     */
    igv.SegTrack.prototype.computePixelHeight = function (features) {

        var sampleHeight = ("SQUISHED" === this.displayMode) ? this.sampleSquishHeight : this.sampleExpandHeight;

        for (i = 0, len = features.length; i < len; i++) {
            sample = features[i].sample;
            if (!this.samples.hasOwnProperty(sample)) {
                this.samples[sample] = this.sampleCount;
                this.sampleNames.push(sample);
                this.sampleCount++;
            }
        }

        return this.sampleCount * sampleHeight;
    };

    /**
     * Sort samples by the average value over the genomic range in the direction indicated (1 = ascending, -1 descending)
     */
    igv.SegTrack.prototype.sortSamples = function (chr, bpStart, bpEnd, direction, callback) {

        var myself = this,
            segment,
            min,
            max,
            f,
            i,
            s,
            sampleNames,
            len = bpEnd - bpStart,
            scores = { };

        this.featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

            // Compute weighted average score for each sample
            for (i = 0, len = featureList.length; i < len; i++) {

                segment = featureList[i];

                if (segment.end < bpStart) continue;
                if (segment.start > bpEnd) break;

                min = Math.max(bpStart, segment.start);
                max = Math.min(bpEnd, segment.end);
                f = (max - min) / len;

                s = scores[segment.sample];
                if (!s) s = 0;
                scores[segment.sample] = s + f * segment.value;

            }

            // Now sort sample names by score
            sampleNames = Object.keys(myself.samples);
            sampleNames.sort(function (a, b) {

                var s1 = scores[a];
                var s2 = scores[b];
                if (!s1) s1 = Number.MAX_VALUE;
                if (!s2) s2 = Number.MAX_VALUE;

                if (s1 == s2) return 0;
                else if (s1 > s2) return direction;
                else return direction * -1;

            });

            // Finally update sample hash
            for (i = 0; i < sampleNames.length; i++) {
                myself.samples[sampleNames[i]] = i;
            }
            myself.sampleNames = sampleNames;

            callback();

        });
    };

    /**
     * Handle an alt-click.   TODO perhaps generalize this for all tracks (optional).
     *
     * @param genomicLocation
     * @param event
     */
    igv.SegTrack.prototype.altClick = function (genomicLocation, event) {

        // Define a region 5 "pixels" wide in genomic coordinates
        var refFrame = igv.browser.referenceFrame,
            bpWidth = refFrame.toBP(2.5),
            bpStart = genomicLocation - bpWidth,
            bpEnd = genomicLocation + bpWidth,
            chr = refFrame.chr,
            myself = this;

        this.sortSamples(chr, bpStart, bpEnd, sortDirection, function () {
            myself.trackView.update();
            $(myself.trackView.viewportDiv).scrollTop( 0 );
        });

        sortDirection *= -1;
    };

    igv.SegTrack.prototype.popupData = function (genomicLocation, xOffset, yOffset) {

        var sampleHeight = ("SQUISHED" === this.displayMode) ? this.sampleSquishHeight : this.sampleExpandHeight,
            sampleName,
            row,
            items;

        row = Math.floor(yOffset / sampleHeight);

        if (row < this.sampleNames.length) {

            sampleName = this.sampleNames[row];

            items = [
                {name: "Sample", value: sampleName}
            ];

            // We use the featureCache property rather than method to avoid async load.  If the
            // feature is not already loaded this won't work,  but the user wouldn't be mousing over it either.
            if (this.featureSource.featureCache) {
                var chr = igv.browser.referenceFrame.chr;  // TODO -- this should be passed in
                var featureList = this.featureSource.featureCache.queryFeatures(chr, genomicLocation, genomicLocation);
                featureList.forEach(function (f) {
                    if (f.sample === sampleName) {
                        items.push({name: "Value", value: f.value});
                    }
                });
            }

            return items;
        }

        return null;
    };


    return igv;

})(igv || {});