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

    igv.TrackView = function (track, browser, loci) {

        var self = this,
            element;

        this.track = track;
        this.browser = browser;

        this.trackDiv = $('<div class="igv-track-div">')[0];
        $(browser.trackContainerDiv).append(this.trackDiv);

        // Optionally override CSS height
        if (track.height) {          // Explicit height set, perhaps track.config.height?
            this.trackDiv.style.height = track.height + "px";
        }

        this.appendLeftHandGutterDivToTrackDiv($(this.trackDiv));

        // viewport container
        this.$viewportContainer = $('<div class="igv-viewport-container igv-viewport-container-shim">');
        $(this.trackDiv).append(this.$viewportContainer);

        this.viewports = [];
        loci.forEach(function (locus, i, locusList) {
            self.viewports.push(new igv.Viewport(self, locusList, i));
        });

        element = this.createRightHandGutter();
        if (element) {
            $(this.trackDiv).append(element);
        }

        this.trackDiv.appendChild(igv.spinner());

        // Track Drag & Drop
        makeTrackDraggable(this);

        this.viewports.forEach(function(viewport) {
            viewport.addTrackHandlers(self);
        });

    };

    function makeTrackDraggable(trackView) {

        trackView.$trackDragScrim = $('<div class="igv-track-drag-scrim">');
        trackView.$viewportContainer.append(trackView.$trackDragScrim);
        trackView.$trackDragScrim.hide();

        trackView.$trackManipulationHandle = $('<div class="igv-track-manipulation-handle">');
        $(trackView.trackDiv).append(trackView.$trackManipulationHandle);

        trackView.$trackManipulationHandle.mousedown(function (e) {
            trackView.isMouseDown = true;
            igv.browser.dragTrackView = trackView;
        });

        trackView.$trackManipulationHandle.mouseup(function (e) {
            trackView.isMouseDown = undefined;
        });

        trackView.$trackManipulationHandle.mouseenter(function (e) {

            trackView.isMouseIn = true;
            igv.browser.dragTargetTrackView = trackView;

            if (undefined === igv.browser.dragTrackView) {
                trackView.$trackDragScrim.show();
            } else if (trackView === igv.browser.dragTrackView) {
                trackView.$trackDragScrim.show();
            }

            if (igv.browser.dragTargetTrackView && igv.browser.dragTrackView) {

                if (igv.browser.dragTargetTrackView !== igv.browser.dragTrackView) {

                    if (igv.browser.dragTargetTrackView.track.order < igv.browser.dragTrackView.track.order) {

                        igv.browser.dragTrackView.track.order = igv.browser.dragTargetTrackView.track.order;
                        igv.browser.dragTargetTrackView.track.order = 1 + igv.browser.dragTrackView.track.order;
                    } else {

                        igv.browser.dragTrackView.track.order = igv.browser.dragTargetTrackView.track.order;
                        igv.browser.dragTargetTrackView.track.order = igv.browser.dragTrackView.track.order - 1;
                    }

                    igv.browser.reorderTracks();
                }
            }

        });

        trackView.$trackManipulationHandle.mouseleave(function (e) {

            trackView.isMouseIn = undefined;
            igv.browser.dragTargetTrackView = undefined;

            if (trackView !== igv.browser.dragTrackView) {
                trackView.$trackDragScrim.hide();
            }

        });

    }

    igv.TrackView.prototype.appendLeftHandGutterDivToTrackDiv = function ($track) {

        var self = this,
            $leftHandGutter,
            $canvas,
            w,
            h;

        if (this.track.paintAxis) {

            $leftHandGutter = $('<div class="igv-left-hand-gutter">');
            $track.append($leftHandGutter[0]);

            $canvas = $('<canvas class ="igv-track-control-canvas">');

            w = $leftHandGutter.outerWidth();
            h = $leftHandGutter.outerHeight();
            $canvas.attr('width', w);
            $canvas.attr('height', h);

            $leftHandGutter.append($canvas[0]);

            this.controlCanvas = $canvas[0];
            this.controlCtx = this.controlCanvas.getContext("2d");


            if (this.track.dataRange) {

                $leftHandGutter.click(function (e) {
                    igv.dataRangeDialog.configureWithTrackView(self);
                    igv.dataRangeDialog.show();
                });

                $leftHandGutter.addClass('igv-clickable');
            }

            this.leftHandGutter = $leftHandGutter[0];

        }

    };

    igv.TrackView.prototype.createRightHandGutter = function () {

        var self = this,
            gearButton;

        if (this.track.ignoreTrackMenu) {
            return undefined;
        }

        gearButton = $('<i class="fa fa-gear fa-20px igv-track-menu-gear igv-app-icon">');

        $(gearButton).click(function (e) {
            igv.popover.presentTrackMenu(e.pageX, e.pageY, self);
        });

        this.rightHandGutter = $('<div class="igv-right-hand-gutter">')[0];
        $(this.rightHandGutter).append(gearButton[0]);

        return this.rightHandGutter;

    };

    igv.TrackView.prototype.setTrackHeight = function (newHeight, update) {

        setTrackHeight_.call(this, newHeight, update || true);

    };

    function setTrackHeight_(newHeight, update) {

        var trackHeightStr;

        if (this.track.minHeight) {
            newHeight = Math.max(this.track.minHeight, newHeight);
        }

        if (this.track.maxHeight) {
            newHeight = Math.min(this.track.maxHeight, newHeight);
        }

        trackHeightStr = newHeight + "px";

        this.track.height = newHeight;

        $(this.trackDiv).height(newHeight);

        if (this.track.paintAxis) {
            this.controlCanvas.style.height = trackHeightStr;
            this.controlCanvas.setAttribute("height", $(this.trackDiv).height());
        }

        if (update === undefined || update === true) {
            this.update();
        }

    }

    igv.TrackView.prototype.resize = function () {
        this.viewports.forEach(function(viewport) {
            viewport.resize();
        });

    };

    igv.TrackView.prototype.update = function () {
        this.viewports.forEach(function(viewport) {
            viewport.update();
        });
    };

    igv.TrackView.prototype.repaint = function () {
        this.viewports.forEach(function(viewport) {
            viewport.repaint();
        });

    };

    return igv;


})(igv || {});
