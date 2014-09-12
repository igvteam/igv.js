var cursor = (function (cursor) {

    var MAX_FEATURE_COUNT = 100000000;

    cursor.CursorTrack = function (featureSource, cursorModel, referenceFrame, label, height) {

        this.featureSource = featureSource;
        this.cursorModel = cursorModel;
        this.referenceFrame = referenceFrame;

        this.label = label;
        this.color = cursor.defaultColor();

        this.cursorHistogram = undefined;

        this.featureSource.maxFeatureCount = MAX_FEATURE_COUNT;
        this.id = "";
        this.height = height;
        this.max = 1000;
        this.sortDirection = 1;
        this.renderMinX = 0;
        this.renderMaxX = 0;

    };

    cursor.defaultColor = function () {
       return "blue";
    };

    cursor.CursorTrack.prototype.isSorted = function () {
        return this.sortButton.style.color === "red";
    };

    cursor.CursorTrack.prototype.getFeatureCache = function (continuation) {

        var myself = this;

        if (this.featureCache) {
            continuation(this.featureCache);
        }
        else {
            this.featureSource.getFeatureCache(function (featureCache) {
                var name, color;

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

            regions = this.cursorModel.getRegionList();

            myself.renderMinX =  1000000;
            myself.renderMaxX = -1000000;

            if (!regions /*|| regions.length == 0*/) {
                continuation();
            }

            cursorModel = this.cursorModel;
            framePixelWidth = cursorModel.framePixelWidth; // region width in pixels
            regionWidth = cursorModel.regionWidth;
            frameMargin = cursorModel.frameMargin;
            scale = regionWidth / (framePixelWidth - frameMargin);

            sampleInterval = Math.max(1, Math.floor(1.0 / framePixelWidth));

            if (frameMargin > 0) {
                canvas.fillRect(0, 0, width, height, {fillStyle: 'rgb(250, 250, 250)'});
            }

            canvas.setProperties({ fillStyle: this.color, strokeStyle: this.color });


            for (regionNumber = Math.floor(start), len = regions.length;
                 regionNumber < len && regionNumber < end;
                 regionNumber += sampleInterval) {

                region = regions[regionNumber];

                chr = region.chr;
                regionBpStart = region.location - regionWidth / 2;
                regionBpEnd = region.location + regionWidth / 2;

                pxStart = (regionNumber - start) * framePixelWidth + frameMargin / 2;

                pxEnd = framePixelWidth > 1 ?
                    pxStart + framePixelWidth - frameMargin :
                    pxStart + 1;

                maxFeatureHeight = this.height;

                if (framePixelWidth > 2) {
                    regionFeatures = featureCache.queryFeatures(region.chr, regionBpStart, regionBpEnd);

                    for (i = 0, flen = regionFeatures.length; i < flen; i++) {

                        feature = regionFeatures[i];
                        if (feature.end >= regionBpStart && feature.start < regionBpEnd) {
                            score = feature.score;

                            pStart = Math.min(pxEnd, Math.max(pxStart, pxStart + (feature.start - regionBpStart) / scale));
                            pEnd = Math.min(pxEnd, pxStart + (feature.end - regionBpStart) / scale);
                            pw = Math.max(1, pEnd - pStart);

                            if (score) {
                                // Height proportional to score
                                fh = Math.round(((score / this.max) * maxFeatureHeight));
                                top = this.height - fh;
                            }
                            else {
                                top = 10;
                                fh = this.height - 20;
                            }

                            myself.renderMinX = Math.min(myself.renderMinX, pStart);
                            myself.renderMaxX = Math.max(myself.renderMaxX, pStart + pw);
                            canvas.fillRect(pStart, top, pw, fh);

                        }
                    }
                }
                else {
                    // Can't draw individual features, just use region score
                    score = region.getScore(featureCache, regionWidth);
                    pw = Math.max(1, framePixelWidth);
                    if (score > 0) {
                        // Height proportional to score
                        fh = Math.round(((score / this.max) * maxFeatureHeight));
                        top = this.height - fh;

                        myself.renderMinX = Math.min(myself.renderMinX, pxStart);
                        myself.renderMaxX = Math.max(myself.renderMaxX, pxStart + pw);
                        canvas.fillRect(pxStart, top, pw, fh);
                    } else if (score === 0) {
                        top = 10;
                        fh = this.height - 20;

                        myself.renderMinX = Math.min(myself.renderMinX, pxStart);
                        myself.renderMaxX = Math.max(myself.renderMaxX, pxStart + pw);
                        canvas.fillRect(pxStart, top, pw, fh);
                    }

                }
            }

            myself.renderMinX = Math.floor(myself.renderMinX);
            myself.renderMaxX = Math.floor(myself.renderMaxX);
            console.log("cursorTrack - referenceFrame.start " + myself.referenceFrame.start + " min | max = " + myself.renderMinX + " | " + myself.renderMaxX);
            continuation();
        }
    }

    cursor.CursorTrack.prototype.drawLabel = function (ctx) {
        // draw label stuff
    };

    return cursor;

})
(cursor || {});
