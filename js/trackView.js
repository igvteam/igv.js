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
            appendRightHandGutter.call(this, $(this.trackDiv));
        }

        if (this.track instanceof igv.RulerTrack) {
            // do nuthin
        } else {
            attachDragWidget.call(this, $(this.trackDiv), this.$viewportContainer);
            attachDragBottomBar.call(this, $(this.trackDiv), this.$viewportContainer);
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
            self.$colorpicker_container.hide();
        });

        this.$colorpicker_container.hide();

    };

    igv.TrackView.prototype.configureViewportContainer = function ($viewportContainer, viewports) {

        if ("hidden" === $viewportContainer.css("overflow-y")) {

            this.scrollbar = new TrackScrollbar($viewportContainer, viewports, this.browser.$root);

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

    function appendRightHandGutter($parent) {

        var self = this,
            $gearButton, $fa;

        const browser = this.browser;

        this.rightHandGutter = $('<div class="igv-right-hand-gutter">')[0];
        $parent.append($(this.rightHandGutter));

        $gearButton = igv.createWrappedIcon("cog");
        $(this.rightHandGutter).append($gearButton);

        $gearButton.click(handleClick);

        function handleClick(e) {
            const page = igv.pageCoordinates(e);
            browser.popover.presentTrackGearMenu(page.x, page.y, self, browser);
        }

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


    function attachDragBottomBar($track, $viewportContainer) {

        var self = this;

        var dragging = false; 
        var originalY; 
        var releaseY; 

        self.$trackviewDivDragbar = $('<div class="trackview_div_dragbar">');
        $(self.trackDiv).append(self.$trackviewDivDragbar);

       

        self.$trackviewDivDragbar.on('mousedown', function(e) {
            e.preventDefault();

            originalY = e.pageY;
            dragging = true;
            var ghostbar = $('<div>',
                            {id:'ghostbar',
                             css: {
                                    width: self.$trackviewDivDragbar.outerWidth(),
                                    bottom: e.pageY+2,
                                    left: self.$trackviewDivDragbar.offset().left
                                   }
                            }).appendTo('body');


            $(document).on('mousemove', function(e){
              ghostbar.css("top",e.pageY+2);
            });
            e.stopPropagation();
        });

        $(document).on('mouseup', function(e){
            e.preventDefault();
            if (dragging)
            {
                releaseY = e.pageY;
                self.setTrackHeight(self.track.height + releaseY - originalY);
                $('#ghostbar').remove();
                $(document).unbind('mousemove');
                dragging = false;
            }
            e.stopPropagation();
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

        if (!(this.browser && this.browser.genomicStateList)) return;

        if (igv.TrackView.DisableUpdates) return;

        let self = this, promises, rpV, groupAutoscale;

        this.viewports.forEach(function (viewport) {
            viewport.shift();
        });

        let isDragging = this.browser.isDragging;

        // List of viewports that need reloading
        rpV = viewportsToReload.call(this, force);

        // promises = rpV.map(function (vp) {
        //     return function () {
        //         return vp.loadFeatures();
        //     }
        // });
        // promiseSerial(promises)
        //
        //
        promises = rpV.map(function (vp) {
            return vp.loadFeatures();
        })

        Promise.all(promises)
            .then(function (tiles) {

                if (!isDragging && self.track.autoscale) {

                    var allFeatures = [];
                    self.viewports.forEach(function (vp) {
                        var referenceFrame, chr, start, end, cache;
                        referenceFrame = vp.genomicState.referenceFrame;
                        start = referenceFrame.start;
                        end = start + referenceFrame.toBP($(vp.contentDiv).width());

                        if (vp.tile && vp.tile.features) {
                            if (self.track.autoscale) {
                                allFeatures = allFeatures.concat(igv.FeatureUtils.findOverlapping(vp.tile.features, start, end));
                            }
                            else {
                                allFeatures = allFeatures.concat(vp.tile.features);
                            }
                        }
                    });

                    if (typeof self.track.doAutoscale === 'function') {
                        self.track.doAutoscale(allFeatures);
                    } else {
                        self.track.dataRange = igv.WIGTrack.doAutoscale(allFeatures);
                    }
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
            this.scrollbar.update();
        }
    }

    igv.TrackView.prototype.maxContentHeight = function () {
        return maxContentHeight(this.viewports);
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

    }


    igv.TrackView.prototype.scrollBy = function (delta) {
        this.scrollbar.moveScrollerBy(delta);
    }

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

            $outerScroll.on('mousemove' + namespace, mouseMove);
            $outerScroll.on('mouseup' + namespace, mouseUp);
            $outerScroll.on('mouseleave' + namespace, mouseUp);

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
            $outerScroll.off(self.namespace);
        }

        function cancelScroll(event) {

        }

        this.$viewportContainer.on("wheel", function(e) {

            e.preventDefault();   
            
            self.moveScrollerBy(-e.originalEvent.deltaY);
            e.stopPropagation();    
        }); 

    };

    TrackScrollbar.prototype.moveScrollerBy = function (delta) {


        const outerScrollHeight = this.$outerScroll.height();
        const innerScrollHeight = this.$innerScroll.height();

        const y = this.$innerScroll.position().top + delta;
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
