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

        this.track = track;
        this.browser = browser;

        if ("CURSOR" === browser.type) {

            this.cursorTrackContainer = $('<div class="igv-cursor-track-container">')[0];
            $(browser.trackContainerDiv).append(this.cursorTrackContainer);

            this.trackDiv = $('<div class="igv-track-div">')[0];
            $(this.cursorTrackContainer).append(this.trackDiv);
        } else {

            this.trackDiv = $('<div class="igv-track-div">')[0];
            $(browser.trackContainerDiv).append(this.trackDiv);
        }

        // Optionally override CSS height
        if (track.height) {
            this.trackDiv.style.height = track.height + "px";
        }

        // spinner
        this.trackDiv.appendChild(igv.spinner());

        this.addLeftHandGutterToParentTrackDiv(this.trackDiv);

        this.addViewportToParentTrackDiv(this.trackDiv);

        if ("CURSOR" === browser.type) {

            this.cursorHistogramContainer = $('<div class="igv-cursor-histogram-container">')[0];
            $(this.trackDiv).append(this.cursorHistogramContainer);

            this.track.cursorHistogram = new cursor.CursorHistogram(this.cursorHistogramContainer, this.track);
        }

        this.addRightHandGutterToParentTrackDiv(this.trackDiv);

        if (this.track instanceof igv.RulerTrack) {

            this.trackDiv.dataset.rulerTrack = "rulerTrack";

            // ruler sweeper widget surface
            this.rulerSweeper = $('<div class="igv-ruler-sweeper-div">');
            $(this.contentDiv).append(this.rulerSweeper[ 0 ]);

            addRulerTrackHandlers(this);

        } else {

            addTrackHandlers(this);

        }

    };

    igv.TrackView.prototype.addViewportToParentTrackDiv = function (trackDiv) {

        // viewport
        this.viewportDiv = $('<div class="igv-viewport-div">')[0];
        $(trackDiv).append(this.viewportDiv);

        // content  -- purpose of this div is to allow vertical scrolling on individual tracks,
        this.contentDiv = $('<div class="igv-content-div">')[0];
        $(this.viewportDiv).append(this.contentDiv);

        // track content canvas
        this.canvas = $('<canvas class = "igv-content-canvas">')[0];
        $(this.contentDiv).append(this.canvas);
        this.canvas.setAttribute('width', this.contentDiv.clientWidth);
        this.canvas.setAttribute('height', this.contentDiv.clientHeight);
        this.ctx = this.canvas.getContext("2d");

        this.viewportCreationHelper(this.viewportDiv);

    };

    igv.TrackView.prototype.viewportCreationHelper = function (viewportDiv) {

        var myself = this,
            labelButton,
            trackIconContainer;

        if ("CURSOR" !== this.browser.type) {


            if (this.track.description) {

                labelButton = document.createElement("button");
                viewportDiv.appendChild(labelButton);
                this.track.labelButton = labelButton;

                labelButton.className = "btn btn-xs btn-cursor-deselected igv-track-label-span-base";
                labelButton.style.position = "absolute";
                labelButton.style.top = "10px";
                labelButton.style.left = "10px";
                labelButton.innerHTML = this.track.label;

                labelButton.onclick = function (e) {
                    igv.popover.presentTrackPopup(e.pageX, e.pageY, myself.track.description);
                }

            } else {

                if (this.track.label) {
                    trackIconContainer = $('<div class="igv-app-icon-container">');
                    $(viewportDiv).append(trackIconContainer[ 0 ]);

                    this.track.labelSpan = $('<span class="igv-track-label-span-base">')[0];
                    this.track.labelSpan.innerHTML = this.track.label;
                    $(trackIconContainer).append(this.track.labelSpan);
                }

            }

        } // if ("CURSOR" !== this.browser.type)
    };

    igv.TrackView.prototype.addLeftHandGutterToParentTrackDiv = function (trackDiv) {

        // left hand gutter
        this.leftHandGutter = $('<div class="igv-left-hand-gutter">')[0];
        $(trackDiv).append(this.leftHandGutter);

        this.leftHandGutterCreationHelper(this.leftHandGutter);

    };

    igv.TrackView.prototype.leftHandGutterCreationHelper = function (leftHandGutter) {

        if (this.track.paintControl) {

            // control canvas.  Canvas width and height attributes must be set.  Its a canvas weirdness.
            this.controlCanvas = $('<canvas class ="igv-track-control-canvas">')[0];
            $(leftHandGutter).append(this.controlCanvas);

            this.controlCanvas.setAttribute('width', leftHandGutter.clientWidth);
            this.controlCanvas.setAttribute('height', leftHandGutter.clientHeight);
            this.controlCtx = this.controlCanvas.getContext("2d");
        }
    };

    igv.TrackView.prototype.addRightHandGutterToParentTrackDiv = function (trackDiv) {

        var trackManipulationIconBox;

        this.rightHandGutter = $('<div class="igv-right-hand-gutter">')[0];
        $(trackDiv).append(this.rightHandGutter);

        trackManipulationIconBox = $('<div class="igv-track-menu-icon-box">')[0];
        $(this.rightHandGutter).append(trackManipulationIconBox);

        this.rightHandGutterCreationHelper(trackManipulationIconBox);

    };

    igv.TrackView.prototype.rightHandGutterCreationHelper = function (trackManipulationIconBox) {

        var myself = this,
            gearButton;

        if (this.track.ignoreTrackMenu) {
            return;
        }

        gearButton = $('<i class="fa fa-gear fa-lg igv-track-menu-gear igv-app-icon" style="padding-top: 5px">');
        $(trackManipulationIconBox).append(gearButton[ 0 ]);

        $(gearButton).click(function (e) {
            igv.popover.presentTrackMenu(e.pageX, e.pageY, myself);
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

    igv.TrackView.prototype.setTrackHeight = function (newHeight, update) {

        var trackHeightStr;

        trackHeightStr = newHeight + "px";

        this.track.height = newHeight;
        this.trackDiv.style.height = trackHeightStr;

        if (this.track.paintControl) {
            this.controlCanvas.style.height = trackHeightStr;
            this.controlCanvas.setAttribute("height", newHeight);
        }
        this.viewportDiv.style.height = trackHeightStr;

        // Reset the canvas height attribute as its height might have changed
        this.canvas.setAttribute("height", this.canvas.clientHeight);

        if ("CURSOR" === this.browser.type) {
            this.track.cursorHistogram.updateHeightAndInitializeHistogramWithTrack(this.track);
        }
        if (update === undefined || update === true) this.update();
    };

    /**
     * Set the content height of the track
     *
     * @param newHeight
     * @param update
     */
    igv.TrackView.prototype.setContentHeight = function (newHeight, update) {

        contentHeightStr = newHeight + "px";
        if (this.track.paintControl) {
            this.controlCanvas.style.height = contentHeightStr;
            this.controlCanvas.setAttribute("height", newHeight);
        }
        this.contentDiv.style.height = contentHeightStr;
        this.canvas.setAttribute("height", this.canvas.clientHeight);

        //If the track defines a "nominal" height, increase viewport height up to that value
        //If newHeight is < current track div height, shrink the track div.
        //Don't override an explicit setting (i.e. set by user from menu).
        if (!this.heightSetExplicitly &&
            ((this.track.maxHeight && this.trackDiv.clientHeight < this.track.maxHeight) ||
            newHeight < this.trackDiv.clientHeight)) {
            this.setTrackHeight(Math.min(this.track.maxHeight, newHeight), false);
        }

        if (update === undefined || update === true) this.update();
    };

    igv.TrackView.prototype.update = function () {

        //console.log("Update");
        this.tile = null;
        this.repaint();

    };

    /**
     * Repaint the view, using a cached image if available.  If no image covering the view is available a new one
     * is created, delegating the draw details to the track object.
     *
     * NOTE:  This method is overriden in the CURSOR initialization code.
     */
    igv.TrackView.prototype.repaint = function () {

        if (!(viewIsReady.call(this))) {
            return;
        }

        var pixelWidth,
            bpWidth,
            bpStart,
            bpEnd,
            self = this,
            igvCanvas,
            referenceFrame = this.browser.referenceFrame,
            chr = referenceFrame.chr,
            refFrameStart = referenceFrame.start,
            refFrameEnd = refFrameStart + referenceFrame.toBP(this.canvas.width),
            success;


        if (!hasCachedImaged.call(this, chr, refFrameStart, refFrameEnd, referenceFrame.bpPerPixel)) {

            // First see if there is a load in progress that would satisfy the paint request
            if (this.currentLoadTask && (isNotIndexed(this.track) ||
                (this.currentLoadTask.end >= refFrameEnd && this.currentLoadTask.start <= refFrameStart))) {
                // Nothing to do but wait for current load task to complete
                //console.log("Skipping load");
            }

            else {

                // If there is a load in progress cancel it
                if (this.currentLoadTask) {
                    this.currentLoadTask.abort();
                }

                // Expand the requested range so we can pan a bit without reloading
                pixelWidth = 3 * this.canvas.width;
                bpWidth = Math.round(referenceFrame.toBP(pixelWidth));
                bpStart = Math.max(0, Math.round(referenceFrame.start - bpWidth / 3));
                bpEnd = bpStart + bpWidth;

                success = function (features) {

                    igv.stopSpinnerObject(self.trackDiv);
                    self.currentLoadTask = undefined;

                    if (features) {

                        // TODO -- adjust track height here.
                        if (self.track.computePixelHeight) {
                            var desiredHeight = self.track.computePixelHeight(features);
                            if (desiredHeight != self.contentDiv.clientHeight) {
                                self.setContentHeight(desiredHeight, false);
                            }
                        }

                        var buffer = document.createElement('canvas');
                        buffer.width = pixelWidth;
                        buffer.height = self.canvas.height;
                        igvCanvas = new igv.Canvas(buffer);

                        self.track.draw({
                            features: features,
                            context: igvCanvas,
                            bpStart: bpStart,
                            bpPerPixel: referenceFrame.bpPerPixel,
                            pixelWidth: buffer.width,
                            pixelHeight: buffer.height
                        });

                        if (self.track.paintControl) {

                            var buffer2 = document.createElement('canvas');
                            buffer2.width = self.controlCanvas.width;
                            buffer2.height = self.controlCanvas.height;

                            var bufferCanvas = new igv.Canvas(buffer2);

                            self.track.paintControl(bufferCanvas, buffer2.width, buffer2.height);

                            self.controlCtx.drawImage(buffer2, 0, 0);
                        }

                        self.tile = new Tile(referenceFrame.chr, bpStart, bpEnd, referenceFrame.bpPerPixel, buffer);
                        self.paintImage();
                    }

                };

                this.currentLoadTask = {
                    start: bpStart,
                    end: bpEnd,
                    //error: function(unused, xhr) {
                    //    igv.stopSpinnerObject(self.trackDiv);
                    //    self.browser.removeTrack(self.track);
                    //    window.alert("Unreachable track URL. Request status: " + xhr.status);
                    //},
                    abort: function () {
                        this.canceled = true;
                        if (this.xhrRequest) {
                            this.xhrRequest.abort();
                        }
                        //igv.stopSpinnerObject(self.trackDiv);
                        self.currentLoadTask = undefined;
                    }
                };

                igv.startSpinnerObject(self.trackDiv);

                this.track.getFeatures(referenceFrame.chr, bpStart, bpEnd, success, self.currentLoadTask);
            }

        }

        if (this.tile && this.tile.overlapsRange(referenceFrame.chr, refFrameStart, refFrameEnd)) {
            this.paintImage();
        }
        else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        /**
         * Return true if we have a cached image (the "tile") that covers the requested range at the requested resolution
         */
        function hasCachedImaged(chr, start, end, bpPerPixel) {
            return this.tile && this.tile.containsRange(chr, start, end, bpPerPixel);
        }


        function viewIsReady() {
            return this.track && this.browser && this.browser.referenceFrame;
        }

        /**
         * Return true if the track is known to be not indexed.
         * @param track
         */
        function isNotIndexed(track) {
            return track.featureSource && track.featureSource.indexed === false;
        }


    };

    function Tile(chr, tileStart, tileEnd, scale, image) {
        this.chr = chr;
        this.startBP = tileStart;
        this.endBP = tileEnd;
        this.scale = scale;
        this.image = image;
    }

    Tile.prototype.containsRange = function (chr, start, end, scale) {
        return this.scale === scale && start >= this.startBP && end <= this.endBP && chr === this.chr;
    };

    Tile.prototype.overlapsRange = function (chr, start, end) {
        return this.chr === chr && this.endBP >= start && this.startBP <= end;
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

    function addRulerTrackHandlers(trackView) {

        var isMouseDown = undefined,
            isMouseIn = undefined,
            mouseDownXY = undefined,
            mouseMoveXY = undefined,
            left,
            rulerSweepWidth,
            bppRealtime,
            ppbRealtime,
            ruleSweepWidthBP,
            rulerWidth,
            ppbThreshholdMet,
            dx;

        $(document).mousedown(function (e) {

            mouseDownXY = igv.translateMouseCoordinates(e, trackView.contentDiv);

            left = mouseDownXY.x;
            rulerSweepWidth = 0;
            trackView.rulerSweeper.css( { "display" : "inline", "left" : left + "px", "width" : rulerSweepWidth + "px" } );

            isMouseIn = true;
        });


        $(trackView.contentDiv).mousedown(function(e) {

            isMouseDown = true;
        });

        $(document).mousemove(function (e) {

            if (isMouseDown && isMouseIn) {

                mouseMoveXY = igv.translateMouseCoordinates(e, trackView.contentDiv);
                dx = mouseMoveXY.x - mouseDownXY.x;

                rulerSweepWidth = Math.abs(dx);
                trackView.rulerSweeper.css( { "width" : rulerSweepWidth + "px" } );
                if (dx < 0) {
                    left = mouseDownXY.x + dx;
                    trackView.rulerSweeper.css( { "left" : left + "px" } );
                }

                ruleSweepWidthBP = igv.browser.referenceFrame.bpPerPixel * rulerSweepWidth;
                rulerWidth = $(trackView.contentDiv).width();
                bppRealtime = ruleSweepWidthBP / rulerWidth;
                ppbRealtime = 1.0/bppRealtime;

                //console.log("bpp-rt " + Math.floor(bppRealtime) + " ppb-rt " + Math.floor(ppbRealtime));

                if (Math.floor(1.0/bppRealtime) > igv.browser.pixelPerBasepairThreshold()) {
                    ppbThreshholdMet = false;
                    trackView.rulerSweeper.css( { backgroundColor: 'rgba(64, 64, 64, 0.125)' } );
                } else {
                    ppbThreshholdMet = true;
                    trackView.rulerSweeper.css( { backgroundColor: 'rgba(68, 134, 247, 0.75)' } );
                }

            }

        });

        $(document).mouseup(function (e) {

            var locus,
                ss,
                ee;

            if (isMouseDown) {

                isMouseDown = false;
                isMouseIn = false;

                trackView.rulerSweeper.css( { "display" : "none", "left" : 0 + "px", "width" : 0 + "px" } );

                if (ppbThreshholdMet) {

                    ss = Math.floor(igv.browser.referenceFrame.start + (left * igv.browser.referenceFrame.bpPerPixel));
                    ee = ss + Math.floor(rulerSweepWidth * igv.browser.referenceFrame.bpPerPixel);

                    locus = igv.browser.referenceFrame.chr + ":" + igv.numberFormatter(ss) + "-" + igv.numberFormatter(ee);
                    igv.browser.search(locus, undefined);
                }

            }


        });

    }

    function addTrackHandlers(trackView) {

        // Register track handlers for popup.  Although we are not handling dragging here, we still need to check
        // for dragging on a mouseup

        var isMouseDown = false,
            lastMouseX = undefined,
            mouseDownX = undefined,
            popupTimer;

        $(trackView.canvas).mousedown(function (e) {

            var canvasCoords = igv.translateMouseCoordinates(e, trackView.canvas);

            if (igv.popover) {
                igv.popover.hide();
            }

            isMouseDown = true;
            lastMouseX = canvasCoords.x;
            mouseDownX = lastMouseX;


        });

        $(trackView.canvas).mouseup(function (e) {

            e = $.event.fix(e);   // Sets pageX and pageY for browsers that don't support them

            var canvasCoords = igv.translateMouseCoordinates(e, trackView.canvas),
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

                if(e.shiftKey) {

                    if (trackView.track.shiftClick && trackView.tile) {
                        trackView.track.shiftClick(genomicLocation, e);
                    }

                }
                else if (e.altKey) {

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
                                igv.popover.presentTrackPopup(e.pageX, e.pageY, igv.formatPopoverText(popupData));
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

    return igv;


})(igv || {});
