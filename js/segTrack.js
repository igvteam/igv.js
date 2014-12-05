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

        this.config = config;
        this.url = config.url;
        this.featureSource = new igv.BedFeatureSource(this.config);
        this.label = config.label;
        this.id = config.id || config.label;
        this.height = config.height || 100;
        this.minHeight = config.minHeight || 0;
        this.maxHeight = config.maxHeight || 500;
        this.sampleHeight = config.sampleHeight || 2;
        this.order = config.order;


        this.posColorScale = new igv.GradientColorScale(
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
        this.negColorScale = new igv.GradientColorScale(
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
    igv.SegTrack.prototype.draw = function (canvas, refFrame, bpStart, bpEnd, pixelWidth, pixelHeight, continuation, task) {

//        console.log("geneTrack.draw " + refFrame.chr);

        var chr = refFrame.chr,
            track = this

        canvas.fillRect(0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

       this.featureSource.getFeatures(chr, bpStart, bpEnd, function (featureList) {

                var segment, len, sample, i, y, color, value,
                    px, px1, pw,
                    xScale = refFrame.bpPerPixel;

                if (featureList) {

                    for (i = 0, len = featureList.length; i < len; i++) {
                        sample = featureList[i].sample;
                        if (!track.samples.hasOwnProperty(sample)) {
                            track.samples[sample] = track.sampleCount;
                            track.sampleCount++;
                        }
                    }

                    checkSize();

                    checkForLog(featureList);

                    for (i = 0, len = featureList.length; i < len; i++) {

                        segment = featureList[i];

                        if (segment.end < bpStart) continue;
                        if (segment.start > bpEnd) break;

                        y = track.samples[segment.sample] * track.sampleHeight;

                        value = segment.value;
                        if(!track.isLog) {
                            value = Math.log2(value/2);
                        }

                        if (value < -0.1) {
                            color = track.negColorScale.getColor(value);
                        }
                        else if (value > 0.1) {
                            color = track.posColorScale.getColor(value);
                        }
                        else {
                            color = "white";
                        }

                        px = Math.round((segment.start - bpStart) / xScale);
                        px1 = Math.round((segment.end - bpStart) / xScale);
                        pw = Math.max(1, px1 - px);

                        canvas.fillRect(px, y, pw, track.sampleHeight, {fillStyle: color});

                    }
                }
                else {
                    console.log("No feature list");
                }

                if (continuation) continuation();
            },
            task);


        function checkSize() {

            if (track.trackView) {

                var desiredHeight = track.sampleCount * track.sampleHeight;
                if (desiredHeight > track.trackView.contentDiv.clientHeight) {
                    track.trackView.setTrackHeight(desiredHeight);
                }

            }
        }

        function checkForLog(featureList) {
            var i;
            if (track.isLog === undefined) {
                track.isLog = false;
                for (i = 0; i < featureList.length; i++) {
                    if (featureList[i].value < 0) {
                        track.isLog = true;
                        return;
                    }
                }
            }
        }
    };


    /**
     * Sort samples by the average value over the genomic range in the direction indicated (1 = ascending, -1 descending)
     */
    igv.SegTrack.prototype.sortSamples = function (chr, bpStart, bpEnd, direction, callback) {

        var track = this,
            segment, min, max, f, i,
            len = bpEnd - bpStart,
            scores = {}, s, sampleNames;

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
            sampleNames = Object.keys(track.samples);
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
                track.samples[sampleNames[i]] = i;
            }

            callback();

        });
    }


    /**
     * Handle an alt-click.   TODO perhaps generalize this for all tracks (optional).
     *
     * @param event
     */
    igv.SegTrack.prototype.altClick = function (genomicLocation, event) {

        // Define a region 5 "pixels" wide in genomic coordinates
        var refFrame = igv.browser.referenceFrame,
            bpWidth = refFrame.toBP(2.5),
            bpStart = genomicLocation - bpWidth,
            bpEnd = genomicLocation + bpWidth,
            chr = refFrame.chr,
            track = this;

        this.sortSamples(chr, bpStart, bpEnd, sortDirection, function () {
            track.trackView.update();
        });

        sortDirection *= -1;
    }


    return igv;

})(igv || {});