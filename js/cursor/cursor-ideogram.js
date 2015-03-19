
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

    igv.CursorIdeoPanel = function () {

        this.div = document.createElement('div');

        this.div.style.height = "40px";

        var contentHeight = this.div.clientHeight;
        var contentWidth = this.div.clientWidth;
        var canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.width = "100%";
        canvas.style.height = contentHeight + "px";
        canvas.setAttribute('width', contentWidth);    //Must set the width & height of the canvas
        canvas.setAttribute('height', contentHeight);

        this.canvas = canvas;
        this.div.appendChild(canvas);

        this.ctx = canvas.getContext("2d");

    }

    igv.CursorIdeoPanel.prototype.resize = function () {

        var contentHeight = this.div.clientHeight,
            contentWidth = this.div.clientWidth,
            canvas = this.canvas;
        canvas.style.width = "100%";
        canvas.style.height = contentHeight;
        canvas.setAttribute('width', contentWidth);    //Must set the width & height of the canvas
        canvas.setAttribute('height', contentHeight);
        this.ideograms = {};
        this.repaint();
    }

    igv.CursorIdeoPanel.prototype.repaint = function () {

       if(true) return;

        var w = this.canvas.width;
        var h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        var image = this.image;
        if (!image) {
            image = document.createElement('canvas');
            image.width = w;
            image.height = h;
            var bufferCtx = image.getContext('2d');
            drawIdeogram(bufferCtx, w, h);
            //this.image = image;
        }

        this.ctx.drawImage(image, 0, 1);

        // TODO  Draw red box

        function drawIdeogram(bufferCtx, ideogramWidth, ideogramHeight) {
            console.log("Draw ideogram " + ideogramHeight);

            if(!igv.cursorModel) return;

            bufferCtx.strokeRect(0, 0, ideogramWidth, ideogramHeight);
            return;

            var model = igv.cursorModel,
                trackPanels = igv.trackViews,
                regionList = model.regions,  // TODO -- use filtered regions
                sampleInterval, dh, px, regionNumber, base,
                bh, tracks, len, region, maxFeatureHeight;

            if (!(model && trackPanels && trackPanels.length > 0 && regionList && regionList.length > 0)) return;

            tracks = [];
            trackPanels.forEach(function (trackPanel) {
                tracks.push(trackPanel.track);
            });


            // We'll sample frames and give each 1 pixel
            sampleInterval = regionList.length / ideogramWidth;

            bh = ideogramHeight - 2;
            dh = bh / tracks.length;

            gatherAllFeatureCaches(tracks, function (trackFeatureMap) {

                var chr, regionStart, regionEnd;

                px = 0;
                for (regionNumber = 0, len = regionList.length; regionNumber < len; regionNumber += sampleInterval) {

                    region = regionList[Math.round(regionNumber)];
                    chr = region.chr;
                    regionStart = region.location - model.regionWidth / 2;
                    regionEnd = region.location + model.regionWidth / 2;
                    maxFeatureHeight = dh;

                    // bufferCtx.strokeLine(px, 0, px, ideogramHeight, {fileStyle: "white"};

                    base = 1;
                    var cbase = 50;
                    trackFeatureMap.forEach(function (featureCache) {

                        var min = 0,
                            max = 1000,
                            regionFeatures,
                            color,
                            score,
                            alpha,
                            c;


                        color = [0,0,255];


                        if (featureCache) {
                            c = igv.randomRGB(cbase, 255);
                            bufferCtx.strokeLine(px, base, px, base + dh, {strokeStyle: c});


                        }
                        base += dh;
                        cbase += 50;
                    });

                    px++;
                }
            });
        }
    }

    /**
     * Gather all features for all tracks and return as a hash of track -> feature list.
     *
     * @param cursorTrackList
     * @param continuation
     */
    function gatherAllFeatureCaches(cursorTrackList, continuation) {

        var trackCount = cursorTrackList.length,
            trackFeatureMap = [];

        cursorTrackList.forEach(function (cursorTrack) {

            cursorTrack.featureSource.getFeatureCache(function (featureCache) {
                trackFeatureMap.push(featureCache);
                console.log(trackFeatureMap.length);
                if (trackFeatureMap.length === trackCount) {
                    continuation(trackFeatureMap);
                }
            })
        });


    }


    igv.testGatherAllFeatureCacches = function (trackList, continuation) {
        gatherAllFeatureCaches(trackList, continuation);
    }


    return igv;

}) (igv || {});