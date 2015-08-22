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

/**
 * Created by turner on 6/19/14.
 */
var cursor = (function (cursor) {

    cursor.CursorHistogram = function (cursorHistogramContainer, track) {

        this.track = track;
        this.canvasFillStyle = igv.greyScale(255);
        this.minMaxfillStyle = igv.rgbaColor(64, 64, 64, 0.5);
        this.minMaxEdgefillStyle = igv.rgbaColor(32, 32, 32, 1.0);

        if (cursorHistogramContainer) {

            this.createMarkupAndSetBinLength(cursorHistogramContainer);
        } else {

            this.bins = [];
            this.bins.length = 100;
        }

        this.maxCount = 0;
        this.initializeBins();

    };

    // Methods
    cursor.CursorHistogram.prototype.initializeBins = function () {

        var i, len;
        for (i=0, len=this.bins.length; i < len; i++) {
            this.bins[i] = 0;
        }

        this.maxCount = 0;
    };

    cursor.CursorHistogram.prototype.insertScore = function (score) {

        if (score < 0) {
            return;
        }

        var index = this.scoreIndex(score);
        //console.log("CursorHistogram.insertScore - index " + index);

        this.bins[ index ] += 1;
        this.maxCount = Math.max(this.maxCount, this.bins[ index ]);
    };

    cursor.CursorHistogram.prototype.scoreIndex = function (score) {

        var value,
            maxScore = this.track.max;

        // Handle edge condition
        if (score >= maxScore) {
            return (this.bins.length - 1);
        }

        value = (score / maxScore);
        value *= this.bins.length;

        return Math.floor(value);
    };

    // Render
    cursor.CursorHistogram.prototype.render = function (track) {

        var myself = this;
        var renderMinimumOverlay = function (minimum) {

            var height = (minimum/track.max) * myself.bins.length;
            igv.graphics.fillRect(myself.ctx, 0, myself.bins.length - height, myself.canvasWidth, height, { fillStyle: myself.minMaxfillStyle });
        };

        var renderMaximumOverlay = function (maximum) {

            var height = myself.bins.length - ((maximum/track.max) * myself.bins.length);
            igv.graphics.fillRect(myself.ctx, 0, 0, myself.canvasWidth, height, { fillStyle: myself.minMaxfillStyle });
        };

        // Clear canvas
        this.fillCanvasWithFillStyle(this.canvasFillStyle);

        // render histogram
        this.bins.forEach(function (count, index, counts) {

            var x,
                y,
                width,
                height,
                percent,
                color;

            if (count) {

                percent = (count/this.maxCount);

                // Symmetric centerline histogram. Pretty.
                x = ((1.0 - percent) / 2.0) * this.canvasWidth;

                // Asymmetric histogram. Meh.
//            x = (1.0 - percent) * this.canvasWidth;

                width = (percent) * this.canvasWidth;

                y = (counts.length - 1) - index;
                height = 1;

                color = (track.color) ? track.color : igv.rgbColor(128, 128, 128);

                igv.graphics.fillRect(myself.ctx, x, y, width, height, { fillStyle: color });
            }

        }, this);

        var renderTrackFilterOverlays = track.trackFilter.makeTrackFilterOverlayRenderer(renderMinimumOverlay, renderMaximumOverlay);
        renderTrackFilterOverlays();

    };

    cursor.CursorHistogram.prototype.fillCanvasWithFillStyle = function (fillStyle) {
        igv.graphics.fillRect(this.ctx, this.canvasWidth, this.canvasHeight, { fillStyle:fillStyle } );
    };

    function showX(count, index, counts) {

        var yPercent = index/(counts.length - 1),
            color = igv.rgbaColor(Math.floor(yPercent * 255), 0, 0, 0.75);

        igv.graphics.fillRect(this.ctx, index, 0, 1, counts.length, { fillStyle: color });

    }

    function showY(count, index, counts) {

        var yPercent = index/(counts.length - 1),
            color = igv.rgbaColor(Math.floor(yPercent * 255), 0, 0, 0.75);

        igv.graphics.fillRect(this.ctx, 0, index, counts.length, 1, { fillStyle: color });

    }

    // Markup
    cursor.CursorHistogram.prototype.createMarkupAndSetBinLength = function (parentDiv) {

        this.canvas = this.createCanvasAndSetBinLength(parentDiv);
        this.ctx =  this.canvas.getContext("2d");

        // Clear canvas
        this.fillCanvasWithFillStyle(this.canvasFillStyle);

    };

    cursor.CursorHistogram.prototype.createCanvasAndSetBinLength = function (parentDiv) {

        var cursorHistogramDiv = document.createElement('div');
        parentDiv.appendChild(cursorHistogramDiv);
        cursorHistogramDiv.className = "igv-cursor-histogram-div";

        this.cursorHistogramDiv = cursorHistogramDiv;
        this.bins = [];
        this.bins.length = cursorHistogramDiv.clientHeight;

        return this.createDOMCanvasWithParent(this.cursorHistogramDiv);


    };

    cursor.CursorHistogram.prototype.createDOMCanvasWithParent = function (parentDiv) {

        var DOMCanvas;

        DOMCanvas = document.createElement('canvas');
        parentDiv.appendChild(DOMCanvas);

        this.canvasWidth = parentDiv.clientWidth;
        this.canvasHeight = parentDiv.clientHeight;

        DOMCanvas.setAttribute('width', parentDiv.clientWidth);
        DOMCanvas.setAttribute('height', parentDiv.clientHeight);

        return DOMCanvas;
    };

    cursor.CursorHistogram.prototype.updateHeightAndInitializeHistogramWithTrack = function (track) {

        this.canvasHeight = this.cursorHistogramDiv.clientHeight;
        this.canvas.setAttribute('height', this.cursorHistogramDiv.clientHeight);

        this.bins = [];
        this.bins.length = this.cursorHistogramDiv.clientHeight;
        track.cursorModel.initializeHistogram(track);
     };

    return cursor;

})(cursor || {});

