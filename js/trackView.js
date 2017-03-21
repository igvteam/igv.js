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

        var self = this,
            element;

        this.track = track;
        track.trackView = this;

        this.browser = browser;

        this.trackDiv = $('<div class="igv-track-div">')[0];

        if (this.track instanceof igv.RulerTrack) {
            this.trackDiv.dataset.rulerTrack = "rulerTrack";
        }

        $(browser.trackContainerDiv).append(this.trackDiv);

        if (track.height) {
            this.trackDiv.style.height = track.height + "px";
        }

        this.appendLeftHandGutterDivToTrackDiv($(this.trackDiv));

        this.$viewportContainer = $('<div class="igv-viewport-container igv-viewport-container-shim">');
        $(this.trackDiv).append(this.$viewportContainer);

        this.viewports = [];
        _.each(_.range(_.size(browser.genomicStateList)), function(i) {
            self.viewports.push(new igv.Viewport(self, i));
        });

        this.configureViewportContainer(this.$viewportContainer, this.viewports);

        element = this.createRightHandGutter();
        if (element) {
            $(this.trackDiv).append(element);
        }

        // Track order repositioning widget
        this.attachDragWidget();

    };

    igv.TrackView.prototype.configureViewportContainer = function ($viewportContainer, viewports) {

        if ("hidden" === $viewportContainer.css("overflow-y")) {

            // TODO - Handle replacement for contentDiv. Use height calculating closure?
            this.scrollbar = new igv.TrackScrollbar($viewportContainer, viewports);
            // this.scrollbar.update();
            $viewportContainer.append(this.scrollbar.$outerScroll);
        }

        return $viewportContainer;
    };

    igv.TrackScrollbar = function ($viewportContainer, viewports) {

        var self = this,
            offY;

        contentDivHeight = maxContentHeightWithViewports(viewports);

        this.$outerScroll = $('<div class="igv-scrollbar-outer-div">');
        this.$innerScroll = $('<div>');

        this.$outerScroll.append(this.$innerScroll);

        this.$viewportContainer = $viewportContainer;
        this.viewports = viewports;

        this.$innerScroll.mousedown(function (event) {

            event.preventDefault();

            offY = event.pageY - $(this).position().top;

            $(window).on("mousemove .igv", null, null, mouseMove);

            $(window).on("mouseup .igv", null, null, mouseUp);

            // <= prevents start of horizontal track panning)
            event.stopPropagation();
        });

        this.$innerScroll.click(function (event) {
            event.stopPropagation();
        });

        this.$outerScroll.click(function (event) {
            moveScrollerTo(event.offsetY - self.$innerScroll.height()/2);
            event.stopPropagation();

        });

        function mouseMove(event) {

            event.preventDefault();

            moveScrollerTo(event.pageY - offY);
            event.stopPropagation();
        }

        function mouseUp(event) {
            $(window).off("mousemove .igv", null, mouseMove);
            $(window).off("mouseup .igv", null, mouseUp);
        }

        function moveScrollerTo(y) {

            var newTop,
                contentTop,
                contentDivHeight,
                outerScrollHeight,
                innerScrollHeight;

            outerScrollHeight = self.$outerScroll.height();
            innerScrollHeight = self.$innerScroll.height();

            newTop = Math.min(Math.max(0, y), outerScrollHeight - innerScrollHeight);

            contentDivHeight = maxContentHeightWithViewports(viewports);

            contentTop = -Math.round(newTop * ( contentDivHeight/self.$viewportContainer.height() ));

            self.$innerScroll.css("top", newTop + "px");

            _.each(viewports, function(viewport){
                $(viewport.contentDiv).css("top", contentTop + "px");
            });

        }
    };

    igv.TrackScrollbar.prototype.update = function () {

        var viewportContainerHeight,
            contentHeight,
            newInnerHeight;

        viewportContainerHeight = this.$viewportContainer.height();

        contentHeight = maxContentHeightWithViewports(this.viewports);

        newInnerHeight = Math.round((viewportContainerHeight / contentHeight) * viewportContainerHeight);

        if (contentHeight > viewportContainerHeight) {
            this.$outerScroll.show();
            this.$innerScroll.height(newInnerHeight);
        } else {
            this.$outerScroll.hide();
        }
    };

    function maxContentHeightWithViewports(viewports) {
        var height = 0;
        _.each(viewports, function(viewport){
            var hgt = $(viewport.contentDiv).height();
            height = Math.max(hgt, height);
        });

        return height;
    }

    igv.TrackView.prototype.attachDragWidget = function () {

        var self = this;

        self.$trackDragScrim = $('<div class="igv-track-drag-scrim">');
        self.$viewportContainer.append(self.$trackDragScrim);
        self.$trackDragScrim.hide();

        self.$trackManipulationHandle = $('<div class="igv-track-manipulation-handle">');
        $(self.trackDiv).append(self.$trackManipulationHandle);

        self.$trackManipulationHandle.mousedown(function (e) {
            e.preventDefault();
            self.isMouseDown = true;
            igv.browser.dragTrackView = self;
        });

        self.$trackManipulationHandle.mouseup(function (e) {
            self.isMouseDown = undefined;
        });

        self.$trackManipulationHandle.mouseenter(function (e) {

            self.isMouseIn = true;
            igv.browser.dragTargetTrackView = self;

            if (undefined === igv.browser.dragTrackView) {
                self.$trackDragScrim.show();
            } else if (self === igv.browser.dragTrackView) {
                self.$trackDragScrim.show();
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

        self.$trackManipulationHandle.mouseleave(function (e) {

            self.isMouseIn = undefined;
            igv.browser.dragTargetTrackView = undefined;

            if (self !== igv.browser.dragTrackView) {
                self.$trackDragScrim.hide();
            }

        });


    };

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
            $gearButton;

        if (this.track.ignoreTrackMenu) {
            return undefined;
        }

        $gearButton = $('<i class="fa fa-gear">');

        $gearButton.click(function (e) {
            igv.popover.presentTrackGearMenu(e.pageX, e.pageY, self);
        });

        this.rightHandGutter = $('<div class="igv-right-hand-gutter">')[0];
        $(this.rightHandGutter).append($gearButton);

        return this.rightHandGutter;

    };

    igv.TrackView.prototype.setContentHeightForViewport = function (viewport, height) {
        viewport.setContentHeight(height);

        if (this.scrollbar) {
            this.scrollbar.update();
        }

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

    igv.TrackView.prototype.isLoading = function () {

        var anyViewportIsLoading;

        anyViewportIsLoading = false;
        _.each(this.viewports, function(v) {
            if (false === anyViewportIsLoading) {
                anyViewportIsLoading = v.isLoading();
            }
        });

        return anyViewportIsLoading;
    };

    igv.TrackView.prototype.resize = function () {

        _.each(this.viewports, function(viewport){
            viewport.resize();
        });

        if (this.scrollbar) {
            this.scrollbar.update();
        }

    };

    igv.TrackView.prototype.update = function () {

        _.each(this.viewports, function(viewport) {
            viewport.update();
        });

        if (this.scrollbar) {
            this.scrollbar.update();
        }

    };

    igv.TrackView.prototype.repaint = function () {

        _.each(this.viewports, function(viewport) {
            viewport.repaint();
        });

    };

    return igv;


})(igv || {});
