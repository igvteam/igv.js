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

var cursor = (function (cursor) {

    var MAX_FEATURE_COUNT = 100000000;

    cursor.CursorTrack = function (config, browser) {

        this.config = config;
        this.url = config.url;
        this.featureSource = new igv.BedFeatureSource(config);
        this.featureSource.maxFeatureCount = MAX_FEATURE_COUNT;
        this.label = config.label;
        this.height = config.trackHeight || (browser.trackHeight || 100);
        this.color = config.color || cursor.defaultColor();

        this.cursorModel = browser.cursorModel;
        this.referenceFrame = browser.referenceFrame;

        this.cursorHistogram = undefined;

        this.id = "";
    };

    cursor.CursorTrack.prototype.jsonRepresentation = function () {

        var fs = this.featureSource,
            json;

        json = {
            label: this.label,
            color: this.color,
            order: this.order,
            height: this.height,
            path: fs.url,
            trackFilter: this.trackFilter.jsonRepresentation()
        };

        return json;
    };

    cursor.defaultColor = function () {
        return "rgb(  3, 116, 178)";
    };

    cursor.CursorTrack.prototype.isSortTrack = function () {

        var success = (this === this.cursorModel.browser.sortTrack);
        return success;
    };

    cursor.CursorTrack.prototype.getFeatureCache = function (continuation) {

        var myself = this;

        if (this.featureCache) {
            continuation(this.featureCache);
        }
        else {
            this.featureSource.getFeatureCache(function (featureCache) {

                var name, color;

                if (!myself.max) {
                    // Initial load -- set track max value
                    myself.max = maxValue(featureCache.allFeatures(), 98);
                }

                myself.featureCache = featureCache;

                // TODO -- fix this use of a side effect
                if (myself.featureSource.trackProperties) {
                    name = myself.featureSource.trackProperties["name"];
                    if (name) {
                        myself.label = name;
                        myself.labelButton.innerHTML = name;
                    }

                    color = myself.featureSource.trackProperties["color"];
                    if (color) {
                        myself.color = "rgb(" + color + ")";

                        if (myself.cursorHistogram) myself.cursorHistogram.render(myself);
                    }
                }

                continuation(featureCache);
            });
        }
    }

    function maxValue(featureList, percentile) {

        var idx = Math.floor(featureList.length * percentile / 100),
            s1, s2;

        featureList.sort(function (a, b) {
            if (a.score > b.score) return 1;
            else if (a.score < b.score) return -1;
            else return 0;
        });

        return featureList[idx].score

    }

    /**
     *
     * @param canvas -- an igv.Canvas  (not a Canvas2D)
     * @param refFrame -- reference frame for rendering
     * @param start -- start region (can be fractional)
     * @param end -- ignored
     * @param width -- pixel width
     * @param height -- pixel height
     * @param continuation -- called when done.  No arguments
     */
    cursor.CursorTrack.prototype.draw = function (canvas, refFrame, start, end, width, height, continuation) {

        var myself = this;

        this.getFeatureCache(function (featureCache) {
            drawFeatures.call(myself, featureCache);
        });

        function drawFeatures(featureCache) {

            var regionNumber,
                region,
                regions,
                len,
                cursorModel,
                framePixelWidth,
                regionWidth,
                scale,
                frameMargin,
                sampleInterval,
                chr,
                pxStart,
                pxEnd,
                maxFeatureHeight,
                regionFeatures,
                i,
                flen,
                feature,
                score,
                pStart,
                pEnd,
                pw,
                fh,
                regionBpStart,
                regionBpEnd,
                top;

            regions = this.cursorModel.regionsToRender();

            if (!regions /*|| regions.length == 0*/) {
                continuation();
            }

            cursorModel = this.cursorModel;
            framePixelWidth = cursorModel.framePixelWidth; // region width in pixels
            regionWidth = cursorModel.regionWidth;
            frameMargin = cursorModel.frameMargin;

            // Adjust the frame margin so it is no more than 1/4 the width of the region (in pixels)
            frameMargin = Math.floor(Math.min(framePixelWidth / 4), frameMargin);

            sampleInterval = Math.max(1, Math.floor(1.0 / framePixelWidth));

            if (frameMargin > 0) {
                canvas.fillRect(0, 0, width, height, { fillStyle: 'rgb(255, 255, 255)' });
            }

            canvas.setProperties({ fillStyle: this.color, strokeStyle: this.color });


            for (regionNumber = Math.floor(start), len = regions.length;
                 regionNumber < len && regionNumber < end;
                 regionNumber += sampleInterval) {

                region = regions[regionNumber];

                chr = region.chr;
                regionBpStart = region.location - regionWidth / 2;
                regionBpEnd = region.location + regionWidth / 2;

                pxStart = Math.floor((regionNumber - start) * framePixelWidth + frameMargin / 2);

                pxEnd = framePixelWidth > 1 ?
                    Math.floor((regionNumber + 1 - start) * framePixelWidth - frameMargin / 2) :
                    pxStart + 1;

                maxFeatureHeight = this.height;

                if (framePixelWidth > 2) {
                    regionFeatures = featureCache.queryFeatures(region.chr, regionBpStart, regionBpEnd);

                    for (i = 0, flen = regionFeatures.length; i < flen; i++) {

                        feature = regionFeatures[i];
                        if (feature.end >= regionBpStart && feature.start < regionBpEnd) {
                            score = feature.score;
                            scale = regionWidth / (framePixelWidth - frameMargin);    // BP per pixel
                            pStart = Math.min(pxEnd, Math.max(pxStart, pxStart + (feature.start - regionBpStart) / scale));
                            pEnd = Math.min(pxEnd, pxStart + (feature.end - regionBpStart) / scale);
                            pw = Math.max(1, pEnd - pStart);

                            if (score) {
                                // Height proportional to score
                                fh = Math.round(((score / this.max) * maxFeatureHeight));
                                top = this.height - fh;
                            }
                            else {
                                top = 0;
                                fh = this.height;
                            }
                            if (score > this.max) {
                                console.log(score);
                            }
                            canvas.fillRect(pStart, top, pw, fh);

                        }
                    }
                }
                else {
                    // Can't draw individual features, just use region score
                    score = region.getScore(featureCache, regionWidth);
                    pw = pxEnd - pxStart;
                    if (score > 0) {
                        // Height proportional to score
                        fh = Math.round(((score / this.max) * maxFeatureHeight));
                        top = this.height - fh;

                        canvas.fillRect(pxStart, top, pw, fh);
                    } else if (score === 0) {
                        top = 0;
                        //top = 10;
                        //fh = this.height - 20;
                        fh = this.height;

                        canvas.fillRect(pxStart, top, pw, fh);
                    }

                }
            }

            continuation();
        }
    }

    cursor.CursorTrack.prototype.drawLabel = function (ctx) {
        // draw label stuff
    };

    return cursor;

})
(cursor || {});
