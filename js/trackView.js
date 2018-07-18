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
            config;

        this.browser = browser;
        this.track = track;
        track.trackView = this;

        $track = $('<div class="igv-track-div">');
        this.trackDiv = $track.get(0);
        $container.append($track);


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
            appendRightHandGutter.call(this, $(this.trackDiv));
        }

        if (this.track instanceof igv.RulerTrack) {
            // do nuthin
        } else {
            attachDragWidget.call(this, $(this.trackDiv), this.$viewportContainer);
        }

        // Create color picker.
        config =
        {
            // width = (29 * swatch-width) + border-width + border-width
            width: ((29 * 24) + 1 + 1),
            classes: ['igv-position-absolute']
        };

        this.$colorpicker_container = igv.genericContainer($track, config, function () {
            self.$colorpicker_container.toggle();
        });

        igv.createColorSwatchSelector(this.$colorpicker_container, function (rgb) {
            self.setColor(rgb);
        });

        this.$colorpicker_container.hide();

    };

    igv.TrackView.prototype.configureViewportContainer = function ($viewportContainer, viewports) {

        if ("hidden" === $viewportContainer.css("overflow-y")) {

            this.scrollbar = new TrackScrollbar($viewportContainer, viewports);

            $viewportContainer.append(this.scrollbar.$outerScroll);
        }

        return $viewportContainer;
    };

    igv.TrackView.prototype.removeViewportWithLocusIndex = function (index) {

        if (this.track instanceof igv.RulerTrack) {
            this.track.removeRulerSweeperWithLocusIndex(index);
        }

        this.viewports[index].$viewport.remove();
        this.viewports.splice(index, 1);

        this.decorateViewports();
    };

    igv.TrackView.prototype.viewportWithGenomicState = function (genomicState) {
        var i, viewport;
        for (i = 0; i < this.viewports.length; i++) {
            viewport = this.viewports[i];
            if (viewport.genomicState === genomicState) {
                return viewport;
            }
        }
        return undefined;
    };

    igv.TrackView.prototype.decorateViewports = function () {
        var self = this;

        this.viewports.forEach(function (viewport, index) {
            var $viewport;

            $viewport = viewport.$viewport;

            if (self.viewports.length > 1) {
                $viewport.find('.igv-viewport-fa-close').show();
                $viewport.find('.igv-viewport-content-ruler-div').show();
            } else {
                $viewport.find('.igv-viewport-fa-close').hide();
                $viewport.find('.igv-viewport-content-ruler-div').hide();
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
                // igv.dataRangeDialog.configureWithTrackView(self);
                igv.dataRangeDialog.configure({trackView: self});
                igv.dataRangeDialog.present($(self.trackDiv));
            });

            $leftHandGutter.addClass('igv-clickable');
        }

        $canvas = $('<canvas class ="igv-track-control-canvas">');
        $leftHandGutter.append($canvas);
        this.controlCanvas = $canvas.get(0);
        resizeControlCanvas.call(this, $leftHandGutter.outerWidth(), $leftHandGutter.outerHeight())
    }

    function appendRightHandGutter($parent) {

        var self = this,
            $gearButton, $fa;

        this.rightHandGutter = $('<div class="igv-right-hand-gutter">')[0];
        $parent.append($(this.rightHandGutter));

        $gearButton = igv.createWrappedIcon("cog");
        $(this.rightHandGutter).append($gearButton);

        $gearButton.click(function (e) {
            igv.popover.presentTrackGearMenu(e.pageX, e.pageY, self);
        });

    }

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

        var self = this,
            indexDestination,
            indexDragged;

        this.$trackDragScrim = $('<div class="igv-track-drag-scrim">');
        $viewportContainer.append(this.$trackDragScrim);
        this.$trackDragScrim.hide();

        self.$trackManipulationHandle = $('<div class="igv-track-manipulation-handle">');
        $track.append(self.$trackManipulationHandle);

        self.$trackManipulationHandle.on('mousedown.trackview', function (e) {
            e.preventDefault();
            self.isMouseDown = true;
            dragged = self;
        });

        self.$trackManipulationHandle.on('mouseup.trackview', function (e) {
            e.preventDefault();
            self.isMouseDown = undefined;
        });

        self.$trackManipulationHandle.on('mouseenter.trackview', function (e) {
            e.preventDefault();
            self.isMouseIn = true;
            dragDestination = self;

            if (undefined === dragged) {
                self.$trackDragScrim.show();
            } else if (self === dragged) {
                self.$trackDragScrim.show();
            }

            if ((dragDestination && dragged) && (dragDestination !== dragged)) {

                indexDestination = igv.browser.trackViews.indexOf(dragDestination);
                indexDragged = igv.browser.trackViews.indexOf(dragged);

                igv.browser.trackViews[indexDestination] = dragged;
                igv.browser.trackViews[indexDragged] = dragDestination;

                if (indexDestination < indexDragged) {
                    $(dragged.trackDiv).insertBefore($(dragDestination.trackDiv));
                } else {
                    $(dragged.trackDiv).insertAfter($(dragDestination.trackDiv));
                }

            }

        });

        self.$trackManipulationHandle.on('mouseleave.trackview', function (e) {
            e.preventDefault();
            self.isMouseIn = undefined;
            dragDestination = undefined;

            if (self !== dragged) {
                self.$trackDragScrim.hide();
            }

        });

        $(document).on('mouseup.document.trackview', function (e) {

            if (dragged) {
                dragged.$trackDragScrim.hide();
            }

            dragged = undefined;
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
        for (i = 0; i < this.viewports.length; i++) {
            if (this.viewports[i].isLoading()) return true;
        }
    };

    igv.TrackView.prototype.resize = function () {

        var width;

        width = igv.browser.viewportContainerWidth() / igv.browser.genomicStateList.length;

        if (width === 0) return;
        this.viewports.forEach(function (viewport) {
            viewport.setWidth(width);
        });

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
    igv.TrackView.prototype.updateViews = function (force) {

        if (!(igv.browser && igv.browser.genomicStateList)) return;

        if (igv.TrackView.DisableUpdates) return;

        let self = this, promises, rpV, groupAutoscale;

        this.viewports.forEach(function (viewport) {
            viewport.shift();
        });

        let isDragging = this.viewports.some(function (vp) {
            return vp.isDragging
        });

        // List of viewports that need reloading
        rpV = viewportsToReload.call(this, force);

        promises = rpV.map(function (vp) {
            return function () {
                return vp.loadFeatures();
            }
        });

        promiseSerial(promises)
            .then(function (tiles) {

                if (!isDragging && self.track.autoscale) {

                    var allFeatures = [];
                    self.viewports.forEach(function (vp) {
                        var referenceFrame, chr, start, end, cache;
                        referenceFrame = vp.genomicState.referenceFrame;
                        chr = referenceFrame.chrName;
                        start = referenceFrame.start;
                        end = start + referenceFrame.toBP($(vp.contentDiv).width());

                        if (vp.tile && vp.tile.features) {
                            if (self.track.autoscale) {
                                cache = new igv.FeatureCache(vp.tile.features);
                                allFeatures = allFeatures.concat(cache.queryFeatures(chr, start, end));
                            }
                            else {
                                allFeatures = allFeatures.concat(vp.tile.features);
                            }
                        }
                    });
                    self.track.dataRange = igv.WIGTrack.autoscale(allFeatures);
                }


            })
            .then(function (ignore) {

                // Must repaint all viewports if autoscaling
                if (!isDragging && (self.track.autoscale || self.track.autoscaleGroup)) {
                    self.viewports.forEach(function (vp) {
                        vp.repaint();
                    })
                }
                else {
                    rpV.forEach(function (vp) {
                        vp.repaint();
                    })
                }
            })

            .then(function (ignore) {
                adjustTrackHeight.call(self);
            })

            .catch(function (error) {
                console.error(error);
                // TODO -- inform user,  remove track
            })

    };

    /**
     * Return a promise to get all in-view features.  Used for group autoscaling.
     */
    igv.TrackView.prototype.getInViewFeatures = function (force) {

        if (!(igv.browser && igv.browser.genomicStateList)) {
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
                        chr = referenceFrame.chrName;
                        start = referenceFrame.start;
                        end = start + referenceFrame.toBP($(vp.contentDiv).width());
                        cache = new igv.FeatureCache(vp.tile.features);
                        allFeatures = allFeatures.concat(cache.queryFeatures(chr, start, end));
                    }
                });
                return allFeatures;
            })

    };


    function viewportsToReload(force) {

        var rpV;

        // List of viewports that need reloading
        rpV = this.viewports.filter(function (viewport) {

            if (!viewport.checkZoomIn()) {
                return false;
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


    function adjustTrackHeight() {

        var maxHeight = maxContentHeight(this.viewports);
        if (this.track.autoHeight) {
            this.setTrackHeight(maxHeight, false);
        }
        else if (this.track.paintAxis) {   // Avoid duplication, paintAxis is already called in setTrackHeight
            this.track.paintAxis(this.controlCtx, $(this.controlCanvas).width(), $(this.controlCanvas).height());
        }
        if (this.scrollbar) {
            this.scrollbar.update();
        }
    }

    function maxContentHeight(viewports) {
        var height = 0;
        viewports.forEach(function (viewport) {
            var hgt = viewport.getContentHeight();
            height = Math.max(hgt, height);
        });

        return height;
    }

    /**
     * Do any cleanup here
     */
    igv.TrackView.prototype.dispose = function () {

        if (this.$trackManipulationHandle) {
            this.$trackManipulationHandle.off();
        }

        if (this.$innerScroll) {
            this.$innerScroll.off();
        }

        $(window).off("mousemove.igv");
        $(window).off("mouseup.igv");

        if (typeof this.track.dispose === "function") {
            this.track.dispose();
        }

        var track = this.track;
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
            this[key] = undefined;
        })

    }

    function TrackScrollbar($viewportContainer, viewports) {

        var self = this,
            offY,
            contentDivHeight;

        contentDivHeight = maxContentHeight(viewports);

        this.$outerScroll = $('<div class="igv-scrollbar-outer-div">');
        this.$innerScroll = $('<div>');

        this.$outerScroll.append(this.$innerScroll);

        this.$viewportContainer = $viewportContainer;
        this.viewports = viewports;

        this.$innerScroll.on("mousedown", function (event) {

            event.preventDefault();

            offY = event.pageY - $(this).position().top;

            $(window).on("mousemove.igv", null, null, mouseMove);

            $(window).on("mouseup.igv", null, null, mouseUp);

            // <= prevents start of horizontal track panning)
            event.stopPropagation();
        });

        this.$innerScroll.on("click", function (event) {
            event.stopPropagation();
        });

        this.$outerScroll.on("click", function (event) {
            moveScrollerTo(event.offsetY - self.$innerScroll.height() / 2);
            event.stopPropagation();

        });

        function mouseMove(event) {

            event.preventDefault();
            moveScrollerTo(event.pageY - offY);
            event.stopPropagation();
        }

        function mouseUp(event) {
            $(window).off("mousemove.igv", null, mouseMove);
            $(window).off("mouseup.igv", null, mouseUp);
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

            contentDivHeight = maxContentHeight(viewports);

            contentTop = -Math.round(newTop * ( contentDivHeight / self.$viewportContainer.height() ));

            self.$innerScroll.css("top", newTop + "px");

            viewports.forEach(function (viewport) {
                $(viewport.contentDiv).css("top", contentTop + "px");
            });

        }
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
