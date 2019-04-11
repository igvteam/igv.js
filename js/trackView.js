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

    var dragged,
        dragDestination;

    igv.TrackView = function (browser, $container, track) {

        var self = this,
            width,
            $track,
            config,
            guid;

        this.browser = browser;
        this.track = track;
        track.trackView = this;

        $track = $('<div class="igv-track-div">');
        this.trackDiv = $track.get(0);
        $container.append($track);

        guid = igv.guid();
        this.namespace = '.trackview_' + guid;

        if (this.track instanceof igv.RulerTrack) {
            this.trackDiv.dataset.rulerTrack = "rulerTrack";
        }

        if (track.height) {
            this.trackDiv.style.height = track.height + "px";
        }

        if (typeof track.paintAxis === 'function') {
            appendLeftHandGutter.call(this, $(this.trackDiv));
        }

        this.$viewportContainer = $('<div class="igv-viewport-container">');
        $(this.trackDiv).append(this.$viewportContainer);

        this.viewports = [];
        width = this.browser.viewportContainerWidth() / this.browser.genomicStateList.length;
        browser.genomicStateList.forEach(function (genomicState) {

            var viewport;
            viewport = new igv.Viewport(self, self.$viewportContainer, genomicState, width);
            self.viewports.push(viewport);

        });

        this.decorateViewports();

        this.configureViewportContainer(this.$viewportContainer, this.viewports);

        if (true === this.track.ignoreTrackMenu) {
            // do nothing
        } else {
            igv.appendRightHandGutter.call(this, $(this.trackDiv));
        }

        if (this.track instanceof igv.RulerTrack) {
            // do nuthin
        } else {
            attachDragWidget.call(this, $(this.trackDiv), this.$viewportContainer);
        }

        if ("sequence" === this.track.type) {
            // do nothing
        } else if (this.track instanceof igv.RulerTrack) {
            // do nothing
        } else {
            this.createColorPicker();
        }


    };

    igv.TrackView.prototype.renderSVGContext = function (context, offset) {

        for (let viewport of this.viewports) {

            const index = viewport.browser.genomicStateList.indexOf(viewport.genomicState);
            const bbox = viewport.$viewport.get(0).getBoundingClientRect();

            let o =
                {
                    deltaX: offset.deltaX + index * viewport.$viewport.width(),
                    deltaY: offset.deltaY + bbox.y
                };

            viewport.renderSVGContext(context, o);
        }

    };

    igv.TrackView.prototype.configureViewportContainer = function ($viewportContainer, viewports) {

        if ("hidden" === $viewportContainer.css("overflow-y")) {

            this.scrollbar = new TrackScrollbar($viewportContainer, viewports, this.browser.$root);

            $viewportContainer.append(this.scrollbar.$outerScroll);
        }

        return $viewportContainer;
    };

    igv.TrackView.prototype.removeViewportWithLocusIndex = function (index) {

        this.viewports[index].$viewport.remove();
        this.viewports.splice(index, 1);

        this.decorateViewports();
    };

    igv.TrackView.prototype.decorateViewports = function () {
        var self = this;

        this.viewports.forEach(function (viewport, index) {
            var $viewport;

            $viewport = viewport.$viewport;

            if (self.viewports.length > 1) {
                $viewport.find('.igv-multi-locus-panel-close-container').show();
                $viewport.find('.igv-multi-locus-panel-label-div').show();
            } else {
                $viewport.find('.igv-multi-locus-panel-close-container').hide();
                $viewport.find('.igv-multi-locus-panel-label-div').hide();
            }

            if (index < self.viewports.length && (1 + index) !== self.viewports.length) {
                $viewport.addClass('igv-viewport-div-border-right');
            } else {
                $viewport.removeClass('igv-viewport-div-border-right');
            }

        });

    };

    function appendLeftHandGutter($parent) {

        var self = this,
            $leftHandGutter,
            $canvas;

        $leftHandGutter = $('<div class="igv-left-hand-gutter">');
        this.leftHandGutter = $leftHandGutter[0];
        $parent.append($leftHandGutter);

        if (this.track.dataRange) {

            $leftHandGutter.click(function (e) {
                self.browser.dataRangeDialog.configure({trackView: self});
                self.browser.dataRangeDialog.present($(self.trackDiv));
            });

            $leftHandGutter.addClass('igv-clickable');
        }

        $canvas = $('<canvas class ="igv-track-control-canvas">');
        $leftHandGutter.append($canvas);
        this.controlCanvas = $canvas.get(0);
        resizeControlCanvas.call(this, $leftHandGutter.outerWidth(), $leftHandGutter.outerHeight())
    }

    igv.appendRightHandGutter = function ($parent) {

        let $div = $('<div class="igv-right-hand-gutter">');
        $parent.append($div);

        igv.createTrackGearPopover.call(this, $div);
    };

    igv.createTrackGearPopover = function ($parent) {

        let $cogContainer = $("<div>", {class: 'igv-trackgear-container'});
        $parent.append($cogContainer);

        $cogContainer.append(igv.createIcon('cog'));

        this.trackGearPopover = new igv.TrackGearPopover($parent);
        this.trackGearPopover.$popover.hide();

        let self = this;
        $cogContainer.click(function (e) {
            e.preventDefault();
            e.stopPropagation();
            self.trackGearPopover.presentMenuList(-(self.trackGearPopover.$popover.width()), 0, igv.trackMenuItemList(self));
        });

    };

    function resizeControlCanvas(width, height) {

        var devicePixelRatio = window.devicePixelRatio;

        if (this.leftHandGutter) {

            if (this.controlCanvas) {
                $(this.controlCanvas).remove();
            }

            var $canvas = $('<canvas class ="igv-track-control-canvas">');
            this.controlCanvas = $canvas[0];
            $(this.leftHandGutter).append($canvas);

            this.controlCanvas.height = devicePixelRatio * height;
            this.controlCanvas.width = devicePixelRatio * width;
            this.controlCanvas.style.height = height + "px";
            this.controlCanvas.style.width = width + "px";
            this.controlCtx = this.controlCanvas.getContext("2d");
            this.controlCtx.scale(devicePixelRatio, devicePixelRatio);
        }
    }

    function attachDragWidget($track, $viewportContainer) {

        const self = this;
        const browser = this.browser;

        this.$trackDragScrim = $('<div class="igv-track-drag-scrim">');
        $viewportContainer.append(this.$trackDragScrim);
        this.$trackDragScrim.hide();

        self.$trackManipulationHandle = $('<div class="igv-track-manipulation-handle">');
        $track.append(self.$trackManipulationHandle);

        self.$trackManipulationHandle.on('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            self.$trackDragScrim.show();
            browser.startTrackDrag(self);
        });

        self.$trackManipulationHandle.on('mouseup', function (e) {
            e.preventDefault();
            e.stopPropagation();
            browser.endTrackDrag();
            self.$trackDragScrim.hide();
        });

        $track.on('mouseenter', function (e) {

            if (browser.dragTrack) {
                e.preventDefault();
                e.stopPropagation();
                browser.updateTrackDrag(self);
            }

        });

        self.$trackManipulationHandle.on('mouseleave', function (e) {

            if (!browser.dragTrack) {
                e.preventDefault();
                e.stopPropagation();
                self.$trackDragScrim.hide();
            }
        });
    }

    igv.TrackView.prototype.dataRange = function () {
        return this.track.dataRange ? this.track.dataRange : undefined;
    };

    igv.TrackView.prototype.setDataRange = function (min, max, autoscale) {

        if (min !== undefined) {
            this.track.dataRange.min = min;
            this.track.config.min = min;
        }

        if (max !== undefined) {
            this.track.dataRange.max = max;
            this.track.config.max = max;
        }

        this.track.autoscale = autoscale;
        this.track.config.autoScale = autoscale;

        this.repaintViews();
    };

    igv.TrackView.prototype.setColor = function (color) {
        this.track.color = color;
        this.track.config.color = color;
        this.repaintViews(true);
    };

    igv.TrackView.prototype.createColorPicker = function () {

        let self = this;

        const config =
            {
                $parent: $(this.trackDiv),

                width: 384,

                height: undefined,
                closeHandler: () => {
                    self.colorPicker.$container.hide();
                }
            };

        this.colorPicker = new igv.genericContainer(config);

        igv.createColorSwatchSelector(this.colorPicker.$container, rgb => this.setColor(rgb), this.track.color);

        self.colorPicker.$container.hide();

    };

    igv.TrackView.prototype.presentColorPicker = function () {
        const bbox = this.trackDiv.getBoundingClientRect();
        this.colorPicker.origin = {x: bbox.x, y: 0};
        this.colorPicker.$container.offset({left: this.colorPicker.origin.x, top: this.colorPicker.origin.y});
        this.colorPicker.$container.show();
    };

    igv.TrackView.prototype.setTrackHeight = function (newHeight, update, force) {

        if (!force) {
            if (this.track.minHeight) {
                newHeight = Math.max(this.track.minHeight, newHeight);
            }

            if (this.track.maxHeight) {
                newHeight = Math.min(this.track.maxHeight, newHeight);
            }
        }

        this.track.height = newHeight;
        this.track.config.height = newHeight;

        $(this.trackDiv).height(newHeight);

        // If the track does not manage its own content height set it here
        if (typeof this.track.computePixelHeight !== "function") {
            this.viewports.forEach(function (vp) {
                vp.setContentHeight(newHeight);
                if (vp.tile) vp.tile.invalidate = true;
            });
            this.repaintViews();
        }


        resizeControlCanvas.call(this, $(this.leftHandGutter).outerWidth(), newHeight);


        if (this.track.paintAxis) {
            this.track.paintAxis(this.controlCtx, $(this.controlCanvas).width(), $(this.controlCanvas).height());
        }

        if (this.scrollbar) {
            this.scrollbar.update();
        }
    }

    igv.TrackView.prototype.isLoading = function () {
        for (let i = 0; i < this.viewports.length; i++) {
            if (this.viewports[i].isLoading()) return true;
        }
    };

    igv.TrackView.prototype.resize = function () {

        var width;

        width = this.browser.viewportContainerWidth() / this.browser.genomicStateList.length;

        if (width === 0) return;
        this.viewports.forEach(function (viewport) {
            viewport.setWidth(width);
        });

        var $leftHandGutter = $(this.leftHandGutter);
        resizeControlCanvas.call(this, $leftHandGutter.outerWidth(), $leftHandGutter.outerHeight());

        this.updateViews(true);

    };

    /**
     * Repaint all viewports without loading any new data.   Use this for events that change visual aspect of data,
     * e.g. color, sort order, etc, but do not change the genomic state.
     */
    igv.TrackView.prototype.repaintViews = function () {
        this.viewports.forEach(function (viewport) {
            viewport.repaint();
        });
        if (this.track.paintAxis) {
            this.track.paintAxis(this.controlCtx, $(this.controlCanvas).width(), $(this.controlCanvas).height());
        }
    }


    /**
     * Functional code to execute a series of promises (actually promise factories) sequntially.
     * Credit: Joel Thoms  https://hackernoon.com/functional-javascript-resolving-promises-sequentially-7aac18c4431e
     *
     * @param funcs
     */
    const promiseSerial = funcs =>
        funcs.reduce((promise, func) =>
                promise.then(result => func().then(Array.prototype.concat.bind(result))),
            Promise.resolve([]))


    /**
     * Update viewports to reflect current genomic state, possibly loading additional data.
     */
    igv.TrackView.prototype.updateViews = async function (force) {

        if (!(this.browser && this.browser.genomicStateList)) return;

        const visibleViewports = this.viewports.filter(vp => vp.isVisible())

        visibleViewports.forEach(function (viewport) {
            viewport.shift();
        });

        // List of viewports that need reloading
        const rpV = viewportsToReload.call(this, force);
        for (let vp of rpV) {
            await vp.loadFeatures()
        }

        const isDragging = this.browser.isDragging;

        if (!isDragging && this.track.autoscale) {
            let allFeatures = [];
            for(let vp of visibleViewports) {
                const referenceFrame = vp.genomicState.referenceFrame;
                const start = referenceFrame.start;
                const end = start + referenceFrame.toBP($(vp.contentDiv).width());

                if (vp.tile && vp.tile.features) {
                        allFeatures = allFeatures.concat(igv.FeatureUtils.findOverlapping(vp.tile.features, start, end));

                }
            }

            if (typeof this.track.doAutoscale === 'function') {
                this.track.doAutoscale(allFeatures);
            } else {
                this.track.dataRange = igv.doAutoscale(allFeatures);
            }
        }


        // Must repaint all viewports if autoscaling
        if (!isDragging && (this.track.autoscale || this.track.autoscaleGroup)) {
            for(let vp of visibleViewports) {
                vp.repaint();
            }
        }
        else {
            for(let vp of rpV) {
                vp.repaint();
            }
        }

        adjustTrackHeight.call(this);

    }

    /**
     * Return a promise to get all in-view features.  Used for group autoscaling.
     */
    igv.TrackView.prototype.getInViewFeatures = function (force) {

        if (!(this.browser && this.browser.genomicStateList)) {
            return Promise.resolve([]);
        }

        var self = this, promises, rpV;

        // List of viewports that need reloading
        rpV = viewportsToReload.call(this, force);

        promises = rpV.map(function (vp) {
            return vp.loadFeatures();
        });

        return Promise.all(promises)

            .then(function (tiles) {
                var allFeatures = [];
                self.viewports.forEach(function (vp) {
                    if (vp.tile && vp.tile.features) {
                        var referenceFrame, chr, start, end, cache;
                        referenceFrame = vp.genomicState.referenceFrame;
                        start = referenceFrame.start;
                        end = start + referenceFrame.toBP($(vp.contentDiv).width());
                        allFeatures = allFeatures.concat(igv.FeatureUtils.findOverlapping(vp.tile.features, start, end));
                    }
                });
                return allFeatures;
            })

    };


    function viewportsToReload(force) {

        var rpV;

        // List of viewports that need reloading
        rpV = this.viewports.filter(function (viewport) {
            if (!viewport.isVisible()) {
                return false
            }
            if (!viewport.checkZoomIn()) {
                return false
            }
            else {
                var bpPerPixel, referenceFrame, chr, start, end;
                referenceFrame = viewport.genomicState.referenceFrame;
                chr = referenceFrame.chrName;
                start = referenceFrame.start;
                end = start + referenceFrame.toBP($(viewport.contentDiv).width());
                bpPerPixel = referenceFrame.bpPerPixel;
                return force || (!viewport.tile || viewport.tile.invalidate || !viewport.tile.containsRange(chr, start, end, bpPerPixel));
            }
        });

        return rpV;

    }

    igv.TrackView.prototype.checkContentHeight = function () {
        this.viewports.forEach(function (vp) {
            vp.checkContentHeight();
        })
        adjustTrackHeight.call(this);
    }

    function adjustTrackHeight() {

        var maxHeight = this.maxContentHeight();
        if (this.track.autoHeight) {
            this.setTrackHeight(maxHeight, false);
        }
        else if (this.track.paintAxis) {   // Avoid duplication, paintAxis is already called in setTrackHeight
            this.track.paintAxis(this.controlCtx, $(this.controlCanvas).width(), $(this.controlCanvas).height());
        }

        if (this.scrollbar) {
            const currentTop = this.viewports[0].getContentTop();
            const newTop = Math.min(0, this.$viewportContainer.height() - minContentHeight(this.viewports));
            if (currentTop < newTop) {
                this.viewports.forEach(function (viewport) {
                    $(viewport.contentDiv).css("top", newTop + "px");
                });
            }
            this.scrollbar.update();
        }
    }

    igv.TrackView.prototype.maxContentHeight = function () {
        return maxContentHeight(this.viewports);
    }

    function maxContentHeight(viewports) {
        const heights = viewports.map((viewport) => viewport.getContentHeight());
        return Math.max(...heights);
    }

    function minContentHeight(viewports) {
        const heights = viewports.map((viewport) => viewport.getContentHeight());
        return Math.min(...heights);
    }

    /**
     * Do any cleanup here
     */
    igv.TrackView.prototype.dispose = function () {

        const self = this;

        if (this.$trackManipulationHandle) {
            this.$trackManipulationHandle.off();
        }

        if (this.$innerScroll) {
            this.$innerScroll.off();
        }

        if (this.scrollbar) {
            this.scrollbar.dispose();
        }

        $(document).off(this.namespace);

        if (typeof this.track.dispose === "function") {
            this.track.dispose();
        }

        var track = this.track;
        if (typeof track.dispose === 'function') {
            track.dispose();
        }
        Object.keys(track).forEach(function (key) {
            track[key] = undefined;
        })

        this.viewports.forEach(function (viewport) {
            viewport.dispose();
        })


        if (dragged === this) {
            dragged = undefined;
        }

        if (dragDestination === this) {
            dragDestination = undefined;
        }

        Object.keys(this).forEach(function (key) {
            self[key] = undefined;
        })

    };


    igv.TrackView.prototype.scrollBy = function (delta) {
        console.log("scrollby " + delta)
        this.scrollbar.moveScrollerBy(delta);
    };

    igv.createColorSwatchSelector = function ($genericContainer, colorHandler, defaultColor) {

        let appleColors = Object.values(igv.appleCrayonPalette);

        if (defaultColor) {

            // Remove 'snow' color.
            appleColors.splice(11, 1);

            // Add default color.
            appleColors.unshift(igv.Color.rgbToHex(defaultColor));
        }

        for (let color of appleColors) {

            let $swatch = $('<div>', {class: 'igv-color-swatch'});
            $genericContainer.append($swatch);

            $swatch.css('background-color', color);

            if ('white' === color) {
                // do nothing
                console.log('-');
            } else {

                $swatch.hover(() => {
                        $swatch.get(0).style.borderColor = color;
                    },
                    () => {
                        $swatch.get(0).style.borderColor = 'white';
                    });

                $swatch.on('click.trackview', (event) => {
                    event.stopPropagation();
                    colorHandler(color);
                });

                $swatch.on('touchend.trackview', (event) => {
                    event.stopPropagation();
                    colorHandler(color);
                });

            }

        }

    };

    const TrackScrollbar = function ($viewportContainer, viewports, rootDiv) {

        const self = this;
        let lastY;

        const guid = igv.guid();
        const namespace = '.trackscrollbar' + guid;
        this.namespace = namespace;

        const $outerScroll = $('<div class="igv-scrollbar-outer-div">');
        this.$outerScroll = $outerScroll;
        this.$innerScroll = $('<div>');

        this.$outerScroll.append(this.$innerScroll);

        this.$viewportContainer = $viewportContainer;
        this.viewports = viewports;

        this.$innerScroll.on("mousedown", mouseDown);

        this.$innerScroll.on("click", function (event) {
            event.stopPropagation();
        });

        this.$outerScroll.on("click", function (event) {
            self.moveScrollerBy(event.offsetY - self.$innerScroll.height() / 2);
            event.stopPropagation();

        });

        function mouseDown(event) {

            event.preventDefault();

            const page = igv.pageCoordinates(event);

            lastY = page.y;

            $(document).on('mousemove' + namespace, mouseMove);
            $(document).on('mouseup' + namespace, mouseUp);
            $(document).on('mouseleave' + namespace, mouseUp);

            // prevents start of horizontal track panning)
            event.stopPropagation();
        }

        function mouseMove(event) {

            event.preventDefault();
            event.stopPropagation();

            const page = igv.pageCoordinates(event);
            self.moveScrollerBy(page.y - lastY);
            lastY = page.y;

        }

        function mouseUp(event) {
            $(document).off(self.namespace);
        }

    };

    TrackScrollbar.prototype.moveScrollerBy = function (delta) {

        const y = this.$innerScroll.position().top + delta;
        this.moveScrollerTo(y);

    }

    TrackScrollbar.prototype.moveScrollerTo = function (y) {


        const outerScrollHeight = this.$outerScroll.height();
        const innerScrollHeight = this.$innerScroll.height();

        const newTop = Math.min(Math.max(0, y), outerScrollHeight - innerScrollHeight);

        const contentDivHeight = maxContentHeight(this.viewports);
        const contentTop = -Math.round(newTop * (contentDivHeight / this.$viewportContainer.height()));

        this.$innerScroll.css("top", newTop + "px");

        this.viewports.forEach(function (viewport) {
            $(viewport.contentDiv).css("top", contentTop + "px");
        });

    }

    TrackScrollbar.prototype.dispose = function () {
        $(window).off(this.namespace);
    };

    TrackScrollbar.prototype.update = function () {

        var viewportContainerHeight,
            contentHeight,
            newInnerHeight;

        viewportContainerHeight = this.$viewportContainer.height();

        contentHeight = maxContentHeight(this.viewports);

        newInnerHeight = Math.round((viewportContainerHeight / contentHeight) * viewportContainerHeight);

        if (contentHeight > viewportContainerHeight) {
            this.$outerScroll.show();
            this.$innerScroll.height(newInnerHeight);
        } else {
            this.$outerScroll.hide();
        }
    };


    return igv;


})(igv || {});
