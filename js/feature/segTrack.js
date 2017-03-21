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

    var sortDirection = "DESC";

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

        //   this.featureSource = config.sourceType === "bigquery" ?
        //       new igv.BigQueryFeatureSource(this.config) :
        this.featureSource = new igv.FeatureSource(this.config);

        this.supportsWholeGenome = true;


    };

    igv.SegTrack.prototype.menuItemList = function (popover) {

        var self = this;

        return [
            {
                name: ("SQUISHED" === this.displayMode) ? "Expand sample hgt" : "Squish sample hgt",
                click: function () {
                    popover.hide();
                    self.toggleSampleHeight();
                }
            }
        ];

    };

    igv.SegTrack.prototype.toggleSampleHeight = function () {

        this.displayMode = ("SQUISHED" === this.displayMode) ? "EXPANDED" : "SQUISHED";

        this.trackView.update();
    };

    igv.SegTrack.prototype.getFeatures = function (chr, bpStart, bpEnd) {

        var self = this;
        return new Promise(function (fulfill, reject) {
            // If no samples are defined, optionally query feature source.  This step was added to support the TCGA BigQuery
            if (self.sampleCount === 0 && (typeof self.featureSource.reader.allSamples == "function")) {
                self.featureSource.reader.allSamples().then(function (samples) {
                    samples.forEach(function (sample) {
                        self.samples[sample] = self.sampleCount;
                        self.sampleNames.push(sample);
                        self.sampleCount++;
                    })
                    self.featureSource.getFeatures(chr, bpStart, bpEnd).then(fulfill).catch(reject);
                }).catch(reject);
            }
            else {
                self.featureSource.getFeatures(chr, bpStart, bpEnd).then(fulfill).catch(reject);
            }
        });
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
            sampleHeight,
            border;

        sampleHeight = ("SQUISHED" === this.displayMode) ? this.sampleSquishHeight : this.sampleExpandHeight;
        border = ("SQUISHED" === this.displayMode) ? 0 : 1;

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

                y = myself.samples[segment.sample] * sampleHeight + border;

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

                igv.graphics.fillRect(ctx, px, y, pw, sampleHeight - 2 * border, {fillStyle: color});

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
    igv.SegTrack.prototype.sortSamples = function (chr, bpStart, bpEnd, direction) {

        var self = this,
            d2 = (direction === "ASC" ? 1 : -1);

        this.featureSource.getFeatures(chr, bpStart, bpEnd).then(function (featureList) {

            var segment,
                min,
                max,
                f,
                i,
                s,
                sampleNames,
                scores = {},
                bpLength = bpEnd - bpStart + 1;

            // Compute weighted average score for each sample
            for (i = 0; i < featureList.length; i++) {

                segment = featureList[i];

                if (segment.end < bpStart) continue;
                if (segment.start > bpEnd) break;

                min = Math.max(bpStart, segment.start);
                max = Math.min(bpEnd, segment.end);
                f = (max - min) / bpLength;

                s = scores[segment.sample];
                if (!s) s = 0;
                scores[segment.sample] = s + f * segment.value;

            }

            // Now sort sample names by score
            sampleNames = Object.keys(self.samples);
            sampleNames.sort(function (a, b) {

                var s1 = scores[a];
                var s2 = scores[b];
                if (!s1) s1 = Number.MAX_VALUE;
                if (!s2) s2 = Number.MAX_VALUE;

                if (s1 == s2) return 0;
                else if (s1 > s2) return d2;
                else return d2 * -1;

            });

            // Finally update sample hash
            for (i = 0; i < sampleNames.length; i++) {
                self.samples[sampleNames[i]] = i;
            }
            self.sampleNames = sampleNames;

            self.trackView.update();
            // self.trackView.$viewport.scrollTop(0);


        }).catch(function(error) {
            console.log(error);
        });
    };

    /**
     * Handle an alt-click.   TODO perhaps generalize this for all tracks (optional).
     *
     * @param genomicLocation
     * @param referenceFrame
     * @param event
     */
    igv.SegTrack.prototype.altClick = function (genomicLocation, referenceFrame, event) {

        // Define a region 5 "pixels" wide in genomic coordinates
        var bpWidth = referenceFrame.toBP(2.5);

        this.sortSamples(referenceFrame.chrName, genomicLocation - bpWidth, genomicLocation + bpWidth, sortDirection);

        sortDirection = (sortDirection === "ASC" ? "DESC" : "ASC");
    };

    igv.SegTrack.prototype.popupData = function (genomicLocation, xOffset, yOffset, referenceFrame) {

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
                var chr = referenceFrame.chrName;  // TODO -- this should be passed in
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

    igv.SegTrack.prototype.popupMenuItemList = function (config) {

        var self = this,
            $e,
            clickHandler;

        $e = $('<div>');
        $e.text('Sort by value');

        clickHandler = function () {

            self.altClick(config.genomicLocation, config.viewport.genomicState.referenceFrame);

            config.popover.hide();

        };

        return [{ name: undefined, object: $e, click: clickHandler, init: undefined }];

    };

    return igv;

})(igv || {});
