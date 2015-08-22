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

        igv.configTrack(this, config);

        this.color = config.color || cursor.defaultColor();

        this.config.indexed = false;  // NEVER use indexes for cursor
        this.featureSource = new igv.FeatureSource(config);
        this.featureSource.maxFeatureCount = MAX_FEATURE_COUNT;


        this.cursorModel = browser.cursorModel;
        this.referenceFrame = browser.referenceFrame;

        this.cursorHistogram = undefined;

    };

    cursor.CursorTrack.prototype.jsonRepresentation = function () {

        var json;

        json = {
            name: this.name,
            color: this.color,
            order: this.order,
            height: this.height,
            path: this.featureSource.config.url,
            trackFilter: this.trackFilter.jsonRepresentation()
        };

        return json;
    };

    cursor.CursorTrack.prototype.popupMenuItems = function (popover) {

        return [igv.colorPickerMenuItem(popover, this.trackView, "Set color", this.color)];

    };

    cursor.CursorTrack.prototype.popupData = function (genomicLocation, xOffset, yOffset) {

        // TODO - Cloned from featureTrack. Adapt as needed.
        //if (this.featureSource.featureCache) {
        //
        //    var chr = igv.browser.referenceFrame.chr,  // TODO -- this should be passed in
        //        tolerance = igv.browser.referenceFrame.bpPerPixel,  // We need some tolerance around genomicLocation, start with +/- 1 pixel
        //        featureList = this.featureSource.featureCache.queryFeatures(chr, genomicLocation - tolerance, genomicLocation + tolerance),
        //        row,
        //        popupData;
        //
        //    //if (this.displayMode != "COLLAPSED") {
        //    //    row = (Math.floor)(this.displayMode === "SQUISHED" ? yOffset / this.squishedRowHeight : yOffset / this.expandedRowHeight);
        //    //}
        //
        //    if (featureList && featureList.length > 0) {
        //
        //        popupData = [];
        //        featureList.forEach(function (feature) {
        //            if (feature.popupData &&
        //                feature.end >= genomicLocation - tolerance &&
        //                feature.start <= genomicLocation + tolerance) {
        //
        //                if (row === undefined || feature.row === undefined || row === feature.row) {
        //                    var featureData = feature.popupData(genomicLocation);
        //                    if (featureData) {
        //                        if (popupData.length > 0) {
        //                            popupData.push("<HR>");
        //                        }
        //                        Array.prototype.push.apply(popupData, featureData);
        //                    }
        //                }
        //            }
        //        });
        //
        //        return popupData;
        //    }
        //
        //}

        return null;
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

        if (this.featureSource.featureCache) {
            var featureCache = this.featureSource.featureCache;
            if(this.max === undefined) {
                var allFeatures;

                allFeatures = featureCache.allFeatures();

                featureCache.signalColumn = findSignalColumn(allFeatures);

                myself.max = percentile(allFeatures, 98, featureCache.signalColumn);

            }

            continuation(this.featureSource.featureCache);
        }
        else {

            // Check for the header (track line).  If we haven't loaded it yet do that first
            if (myself.header === undefined && myself.featureSource.getHeader) {
                myself.featureSource.getHeader(function (header) {
                    //console.log("Set header: " + header);
                    setHeader.call(myself, header);
                    myself.getFeatureCache(continuation);
                    return;
                });
            }


            function setHeader(header) {

                if (header) {
                    myself.header = header;
                    if (header.name && !myself.config.name) {
                        myself.name = header.name;
                        if (myself.trackLabelDiv) {
                            myself.trackLabelDiv.innerHTML = header.name;
                            myself.trackLabelDiv.title = header.name;
                        }
                    }
                    if (header.color && !myself.config.color) {
                        myself.color = "rgb(" + header.color + ")";
                        if (myself.cursorHistogram) myself.cursorHistogram.render(this);
                    }
                    if (header.height && !myself.config.trackHeight) {
                        myself.height = header.height;
                    }
                }
                else {
                    this.header = null;   // Insure it has a value other than undefined
                }

            }
        }
    }


    /**
     * Choose between "signal" and "score" columns, prefer signal
     *
     * @param allFeatures
     */
    function findSignalColumn(allFeatures) {

        allFeatures.forEach(function (feature) {
            if (feature.signal) return "signal";
        })
        return "score";

    }


    function percentile(featureList, per, signalColumn) {

        var idx = Math.floor(featureList.length * per / 100);

        featureList.sort(function (a, b) {

            if (a[signalColumn] > b[signalColumn]) return 1;
            else if (a[signalColumn] < b[signalColumn]) return -1;
            else return 0;
        });

        return featureList[idx][signalColumn]

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
    cursor.CursorTrack.prototype.draw = function (ctx, refFrame, start, end, width, height, continuation) {

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
                top,
                signalColumn = featureCache.signalColumn;

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
                igv.graphics.fillRect(ctx, 0, 0, width, height, {fillStyle: 'rgb(255, 255, 255)'});
            }

            igv.graphics.setProperties(ctx, {fillStyle: this.color, strokeStyle: this.color});

            for (regionNumber = Math.floor(start), len = regions.length;
                 regionNumber < len && regionNumber < end;
                 regionNumber += sampleInterval) {

                //igv.Canvas.setProperties.call(ctx, {fillStyle: igv.randomRGB(128, 255), strokeStyle: this.color});

                region = regions[regionNumber];

                chr = region.chr;
                regionBpStart = region.location - regionWidth / 2;
                regionBpEnd = region.location + regionWidth / 2;

                pxStart = Math.floor((regionNumber - start) * framePixelWidth + frameMargin / 2);

                pxEnd = framePixelWidth > 1 ?
                    Math.floor((regionNumber + 1 - start) * framePixelWidth - frameMargin / 2) :
                pxStart + 1;

                maxFeatureHeight = height;

                if (framePixelWidth > 2) {

                    regionFeatures = featureCache.queryFeatures(region.chr, regionBpStart, regionBpEnd);

                    for (i = 0, flen = regionFeatures.length; i < flen; i++) {

                        feature = regionFeatures[i];
                        if (feature.end >= regionBpStart && feature.start < regionBpEnd) {
                            score = feature[signalColumn];
                            scale = regionWidth / (framePixelWidth - frameMargin);    // BP per pixel
                            pStart = Math.min(pxEnd, Math.max(pxStart, pxStart + (feature.start - regionBpStart) / scale));
                            pEnd = Math.min(pxEnd, pxStart + (feature.end - regionBpStart) / scale);
                            pw = Math.max(1, pEnd - pStart);
                        }
                    }
                }
                else {

                    pw = pxEnd - pxStart;
                    score = region.getScore(featureCache, regionWidth);
                }
                if (score !== undefined && this.max > 0) {
                    // Height proportional to score
                    fh = Math.round(((score / this.max) * maxFeatureHeight));
                    top = height - fh;
                }
                else {
                    top = 0;
                    fh = height;
                }

                igv.graphics.fillRect(ctx, pxStart, top, pw, fh);


            }

            continuation();
        }
    };

    cursor.CursorTrack.prototype.drawLabel = function (ctx) {
        // draw label stuff
    };

    return cursor;

})
(cursor || {});
