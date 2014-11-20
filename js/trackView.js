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

    igv.TrackView = function (track, browser) {

        var viewportDiv,
            trackIconContainer,
            trackHousingDiv,
            trackDiv,
            controlDiv,
            rightHandGutter,
            controlCanvas,
            contentDiv,
            canvas,
            labelSpan,
            spinnerFontAwesome;

        this.track = track;
        this.browser = browser;

        // track
        if ("CURSOR" === browser.type) {

            trackHousingDiv = $('<div class="igv-housing-div">')[0];
            $(browser.trackContainerDiv).append(trackHousingDiv);

            trackDiv = $('<div class="igv-track-div">')[0];
            $(trackHousingDiv).append(trackDiv);
            this.trackHousingDiv = trackHousingDiv;

        } else {

            trackDiv = $('<div class="igv-track-div">')[0];
            $(browser.trackContainerDiv).append(trackDiv);

        }

        if ("CURSOR" === browser.type) {

            addTrackViewCursorExtensions(this);
        }

        // Optionally override CSS height
        if (track.height) trackDiv.style.height = track.height + "px";

        this.trackDiv = trackDiv;

        // spinner
        spinnerFontAwesome = document.createElement("i");
        this.trackDiv.appendChild(spinnerFontAwesome);
        spinnerFontAwesome.className = "fa fa-spinner fa-2x fa-spin igv-spinner-fontawesome-start";

        // control div
        if ("CURSOR" === browser.type) {

            rightHandGutter = $('<div class="igv-track-righthand-gutter">')[0];
            $(trackDiv).append(rightHandGutter);

            this.righthandGutter = rightHandGutter;
        } else {

            controlDiv = $('<div class="igv-track-control-div">')[0];
            $(trackDiv).append(controlDiv);

            this.controlDiv = controlDiv;

            if (this.track.paintControl) {

                // control canvas.  Canvas width and height attributes must be set.  Its a canvas weirdness.
                controlCanvas = $('<canvas class ="igv-track-control-canvas">')[0];
                $(controlDiv).append(controlCanvas);
                controlCanvas.setAttribute('width', controlDiv.clientWidth);
                controlCanvas.setAttribute('height', controlDiv.clientHeight);
                this.controlCanvas = controlCanvas;
                this.controlCtx = controlCanvas.getContext("2d");
            }

        }

        // track icon container
        if ("CURSOR" === browser.type) {
            trackIconContainer = $('<div class = "igv-track-icon-container">')[0];
            $(trackDiv).append(trackIconContainer);
        }

        // viewport
        viewportDiv = $('<div class="igv-viewport-div">')[0];
        $(trackDiv).append(viewportDiv);
        this.viewportDiv = viewportDiv;

        // content  -- purpose of this div is to allow vertical scolling on individual tracks, although that is not implemented
        contentDiv = $('<div class="igv-content-div">')[0];
        $(viewportDiv).append(contentDiv);
        this.contentDiv = contentDiv;

        // track content canvas
        canvas = $('<canvas class = "igv-content-canvas">')[0];
        $(contentDiv).append(canvas);
        canvas.setAttribute('width', contentDiv.clientWidth);
        canvas.setAttribute('height', contentDiv.clientHeight);
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        if ("CURSOR" !== browser.type) {
            trackIconContainer = $('<div class = "igv-track-icon-container">')[0];
            $(viewportDiv).append(trackIconContainer);
        }


        if (track.label && "CURSOR" !== browser.type) {

            labelSpan = $('<span class="igv-track-label-span-base">')[0];
            labelSpan.innerHTML = track.label;
            $(trackIconContainer).append(labelSpan);

        }

        this.addRightHandGutterToParentTrackDiv(trackDiv);

        addTrackHandlers(this);

    };

    igv.TrackView.prototype.addRightHandGutterToParentTrackDiv = function (trackDiv) {

        var myself = this,
            removeButton = $('<i class="fa fa-times-circle igv-track-disable-button-fontawesome">')[0];

        $(this.contentDiv).append(removeButton);
        $(this.contentDiv).click(function () {
            myself.browser.removeTrack(myself.track);
        });

    };

    igv.TrackView.prototype.resize = function () {
        var canvas = this.canvas,
            contentDiv = this.contentDiv,
            contentWidth = this.viewportDiv.clientWidth;
        //      contentHeight = this.canvas.getAttribute("height");  // Maintain the current height

        contentDiv.style.width = contentWidth + "px";      // Not sure why css is not working for this
        //  contentDiv.style.height = contentHeight + "px";

        canvas.style.width = contentWidth + "px";
        canvas.setAttribute('width', contentWidth);    //Must set the width & height of the canvas
        this.update();
    };

    igv.TrackView.prototype.setTrackHeight = function (newHeight) {

        var newTrackHeight,
            trackHeightStr,
            minHeight = this.track.minHeight || 10,
            maxHeight = this.track.maxHeight || 1000;

        newTrackHeight = Math.max(minHeight, newHeight);
        newTrackHeight = Math.min(maxHeight, newTrackHeight);

        trackHeightStr = newTrackHeight + "px";
        this.track.height = newTrackHeight;
        this.trackDiv.style.height = trackHeightStr;

        if (this.track.paintControl) {
            this.controlCanvas.style.height = trackHeightStr;
            this.controlCanvas.setAttribute("height", newTrackHeight);
        }

        this.viewportDiv.style.height = trackHeightStr;
        this.contentDiv.style.height = newHeight + "px";

        this.canvas.style.height = newHeight + "px";
        this.canvas.setAttribute("height", newHeight);

        if (this.browser.type === "CURSOR") {
            this.track.cursorHistogram.updateHeightAndInitializeHistogramWithTrack(this.track);
        }


        this.update();
    };

    igv.TrackView.prototype.update = function () {
        this.tile = null;
        this.repaint();

    };

    igv.TrackView.prototype.repaint = function () {

        if (!this.track) {
            return;
        }

        var tileWidth,
            tileStart,
            tileEnd,
            buffer,
            myself = this,
            igvCanvas,
            referenceFrame = this.browser.referenceFrame,
            refFrameStart = referenceFrame.start,
            refFrameEnd = refFrameStart + referenceFrame.toBP(this.canvas.width),
            currentTask = this.currentTask;

        if (!this.tile || !this.tile.containsRange(referenceFrame.chr, refFrameStart, refFrameEnd, referenceFrame.bpPerPixel)) {

            // First see if there is a load in progress that would satisfy the paint request

            if (currentTask && currentTask.end >= refFrameEnd && currentTask.start <= refFrameStart) {

                // Nothing to do but wait for current load task to complete

            }

            else {

                if (currentTask) {
                    currentTask.abort();
                }

                buffer = document.createElement('canvas');
                buffer.width = 3 * this.canvas.width;
                buffer.height = this.canvas.height;
                igvCanvas = new igv.Canvas(buffer);

                tileWidth = Math.round(referenceFrame.toBP(buffer.width));
                tileStart = Math.max(0, Math.round(referenceFrame.start - tileWidth / 3));
                tileEnd = tileStart + tileWidth;

                igv.startSpinner(myself.trackDiv);

                this.currentTask = {
                    canceled: false,
                    chr: referenceFrame.chr,
                    start: tileStart,
                    end: tileEnd,
                    abort: function () {
                        this.canceled = true;
                        if (this.xhrRequest) {
                            this.xhrRequest.abort();
                        }
//                    spinner.stop();
                        igv.stopSpinner(myself.trackDiv);
                    }

                };

                myself.track.draw(igvCanvas, referenceFrame, tileStart, tileEnd, buffer.width, buffer.height, function (task) {

//                    spinner.stop();
                        igv.stopSpinner(myself.trackDiv);

                        if (task) console.log(task.canceled);

                        if (!(task && task.canceled)) {
                            myself.tile = new Tile(referenceFrame.chr, tileStart, tileEnd, referenceFrame.bpPerPixel, buffer);
                            myself.paintImage();
                        }
                        myself.currentTask = undefined;
                    },
                    myself.currentTask);

                if (myself.track.paintControl) {

                    var buffer2 = document.createElement('canvas');
                    buffer2.width = this.controlCanvas.width;
                    buffer2.height = this.controlCanvas.height;

                    var bufferCanvas = new igv.Canvas(buffer2);

                    myself.track.paintControl(bufferCanvas, buffer2.width, buffer2.height);

                    myself.controlCtx.drawImage(buffer2, 0, 0);
                }
            }

        }

        if (this.tile && this.tile.chr === referenceFrame.chr) {
            this.paintImage();
        }
        else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }


    };

    igv.TrackView.prototype.paintImage = function () {

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.tile) {
            this.xOffset = Math.round(this.browser.referenceFrame.toPixels(this.tile.startBP - this.browser.referenceFrame.start));
            this.ctx.drawImage(this.tile.image, this.xOffset, 0);
            this.ctx.save();
            this.ctx.restore();
        }
    };

    igv.TrackView.prototype.setSortButtonDisplay = function (onOff) {
        this.track.sortButton.style.color = onOff ? "red" : "black";
    };

    function Tile(chr, tileStart, tileEnd, scale, image) {
        this.chr = chr;
        this.startBP = tileStart;
        this.endBP = tileEnd;
        this.scale = scale;
        this.image = image;
    }

    Tile.prototype.containsRange = function (chr, start, end, scale) {
        var hit = this.scale == scale && start >= this.startBP && end <= this.endBP && chr === this.chr;
        return hit;
    };

    function addTrackHandlers(trackView) {

        // Register track handlers for popup.  Although we are not handling dragging here, we still need to check
        // for dragging on a mouseup

        var isMouseDown = false,
            lastMouseX = undefined,
            mouseDownX = undefined,
            canvas = trackView.canvas,
            popupTimer;

        $(canvas).mousedown(function (e) {

            var canvasCoords = igv.translateMouseCoordinates(e, canvas);

            if (igv.popover) igv.popover.hide();

            isMouseDown = true;
            lastMouseX = canvasCoords.x;
            mouseDownX = lastMouseX;


        });


        $(canvas).mouseup(function (e) {

            e = $.event.fix(e);   // Sets pageX and pageY for browsers that don't support them

            var canvasCoords = igv.translateMouseCoordinates(e, canvas),
                referenceFrame = trackView.browser.referenceFrame,
                genomicLocation = Math.floor((referenceFrame.start) + referenceFrame.toBP(canvasCoords.x));

            if (!referenceFrame) return;

            if (popupTimer) {
                // Cancel previous timer
                console.log("Cancel timer");
                window.clearTimeout(popupTimer);
                popupTimer = undefined;
            }

            else {

                if (e.altKey) {
                    if (trackView.track.altClick && trackView.tile) {
                        trackView.track.altClick(genomicLocation, e);
                    }
                } else if (Math.abs(canvasCoords.x - mouseDownX) <= igv.constants.dragThreshold && trackView.track.popupData) {
                    const doubleClickDelay = 300;

                    popupTimer = window.setTimeout(function () {

                            var popupData,
                                xOrigin;

                            if (undefined === genomicLocation) {
                                return;
                            }
                            if (null === trackView.tile) {
                                return;
                            }
                            xOrigin = Math.round(referenceFrame.toPixels((trackView.tile.startBP - referenceFrame.start)));
                            popupData = trackView.track.popupData(genomicLocation, canvasCoords.x - xOrigin, canvasCoords.y);
                            if (popupData && popupData.length > 0) {
                                igv.popover.show(e.pageX, e.pageY, igv.formatPopoverText(popupData));
                            }
                            mouseDownX = undefined;
                            popupTimer = undefined;
                        },
                        doubleClickDelay);
                }
            }

            mouseDownX = undefined;
            isMouseDown = false;
            lastMouseX = undefined;

        });


    }

    function addTrackViewCursorExtensions(trackView) {

        trackView.addRightHandGutterToParentTrackDiv = function (trackDiv) {

            var myself = this,
                trackManipulationIconBox,
                removeButton;

            this.trackManipulationContainer = $('<div class="igv-track-manipulation-container">')[0];
            $(trackDiv).append(this.trackManipulationContainer);

            trackManipulationIconBox = $('<div class="igv-track-manipulation-icon-box">')[0];
            $(this.trackManipulationContainer).append(trackManipulationIconBox);

            $(trackManipulationIconBox).append($('<i class="fa fa-chevron-circle-up   igv-track-manipulation-move-up">')[0]);
            $(trackManipulationIconBox).append($('<i class="fa fa-chevron-circle-down igv-track-manipulation-move-down">')[0]);

            $(trackManipulationIconBox).find("i.fa-chevron-circle-up").click(function () {
                myself.browser.reduceTrackOrder(myself)
            });

            $(trackManipulationIconBox).find("i.fa-chevron-circle-down").click(function () {
                myself.browser.increaseTrackOrder(myself)
            });

            removeButton = $('<i class="fa fa-times igv-track-manipulation-discard">')[0];
            $(trackManipulationIconBox).append(removeButton);

            $(removeButton).click(function () {
                myself.browser.removeTrack(myself.track);
            });

            this.track.cursorHistogram = new cursor.CursorHistogram(this.righthandGutter, this.track.max);

            igv.cursorAddTrackControlButtons(this, this.browser);

        };

    }

    return igv;
})
(igv || {});
