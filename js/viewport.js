/**
 * Created by dat on 9/16/16.
 */
var igv = (function (igv) {

    igv.Viewport = function (trackView, $container, genomicState) {

        var self = this,
            description,
            $trackLabel,
            $spinner,
            dimen,
            $div;

        this.trackView = trackView;
        this.id = _.uniqueId('viewport_');
        this.genomicState = genomicState;

        this.$viewport = $('<div class="igv-viewport-div">');
        $container.append(this.$viewport);

        this.$viewport.data("viewport", this.id);
        this.$viewport.data("locusindex", this.genomicState.locusIndex);

        addViewportBorders(this.$viewport, this.genomicState.locusIndex, igv.browser.genomicStateList.length);

        this.setWidth(igv.browser.viewportContainerWidth() / this.genomicState.locusCount);

        this.contentDiv = $('<div class="igv-viewport-content-div">')[0];
        this.$viewport.append(this.contentDiv);

        if (trackView.track instanceof igv.SequenceTrack) {
            this.$viewport.addClass('igv-viewport-sequence');
        }

        if (trackView.track instanceof igv.RulerTrack) {
            $div = $('<div>', {class: 'igv-whole-genome-container'});
            $(this.contentDiv).append($div);
            $div.hide();
        }

        if (this.genomicState.locusCount > 1 && trackView.track instanceof igv.RulerTrack) {

            this.$viewport.addClass('igv-viewport-ruler');

            this.$close = $('<div class="igv-viewport-fa-close">');
            this.$closeButton = $('<i class="fas fa-times-circle">');
            this.$close.append(this.$closeButton);

            this.$close.click(function (e) {
                igv.browser.closeMultiLocusPanelWithGenomicState(self.genomicState);
            });

            this.$viewport.append(this.$close);
        }

        // track content canvas
        this.canvas = $('<canvas>')[0];

        $(this.contentDiv).append(this.canvas);

        this.canvas.setAttribute('width', this.contentDiv.clientWidth);
        this.canvas.setAttribute('height', this.contentDiv.clientHeight);
        this.ctx = this.canvas.getContext("2d");

        if (this.genomicState.locusCount > 1 && trackView.track instanceof igv.RulerTrack) {
            $(this.contentDiv).append(igv.browser.rulerTrack.locusLabelWithGenomicState(this.genomicState));
        }

        // zoom in to see features
        self.$zoomInNotice = createZoomInNotice();
        $(this.contentDiv).append(self.$zoomInNotice);


        function createZoomInNotice() {
            var $container,
                $child;

            $child = $('<div>');
            $child.text('Zoom in to see features');

            $container = $('<div class="zoom-in-notice-container">');
            $container.append($child);

            $container.hide();

            return $container;
        }

        if (trackView.track.name && 0 === this.genomicState.locusIndex) {

            if (typeof trackView.track.description === 'function') {
                description = trackView.track.description();
            } else {
                description = trackView.track.description || trackView.track.name;
            }

            $trackLabel = $('<div class="igv-track-label">');

            $trackLabel.html(trackView.track.name);

            $trackLabel.click(function (e) {
                self.popover.presentContent(e.pageX, e.pageY, description);
            });

            this.$viewport.append($trackLabel);

            if (igv.browser.$trackLabelToggle.hasClass('igv-nav-bar-toggle-button-on')) {
                $trackLabel.hide();
            }

        }

        if (trackView.track instanceof igv.RulerTrack) {
            // do nothing
        } else {
            this.addMouseHandlers();

            dimen = this.$viewport.height();
            if (dimen > 32) {
                dimen = 32;
            }

            $spinner = $('<div class="igv-viewport-spinner">');
            $spinner.css({'font-size': dimen + 'px'});

            // $spinner.append($('<i class="fas fa-cog fa-spin fa-fw">'));
            $spinner.append($('<i class="fas fa-spinner fa-spin fa-fw">'));
            this.$viewport.append($spinner);
            this.stopSpinner();

            this.popover = new igv.Popover(igv.browser.$content);

        }

        function addViewportBorders($viewport, locusIndex, lociCount) {

            if (1 === lociCount || locusIndex === lociCount - 1) {
                return;
            }

            $viewport.addClass('igv-viewport-div-border-right');

            // if (1 === lociCount || 0 === locusIndex) {
            //     $viewport.addClass('igv-viewport-div-border-left');
            // }

        }
    };

    igv.Viewport.prototype.setWidth = function (width) {
        var percentage;

        this.$viewport.width(width);
        percentage = this.$viewport.width() / this.$viewport.outerWidth();
        this.$viewport.width(Math.floor(percentage * width));
    };

    igv.Viewport.prototype.goto = function (chr, start, end) {

        if (igv.popover) {
            igv.popover.hide();
        }

        this.genomicState.referenceFrame.bpPerPixel = (Math.round(end) - Math.round(start)) / this.$viewport.width();
        this.genomicState.referenceFrame.start = Math.round(start);

        igv.browser.updateWithLocusIndex(this.genomicState.locusIndex);

    };

    igv.Viewport.prototype.startSpinner = function () {
        var $spinner = this.$viewport.find('.fa-spinner');
        $spinner.addClass("fa-spin");
        $spinner.show();
    };

    igv.Viewport.prototype.stopSpinner = function () {
        var $spinner = this.$viewport.find('.fa-spinner');
        $spinner.hide();
        $spinner.removeClass("fa-spin");
    };

    igv.Viewport.prototype.resize = function () {

        var contentWidth = igv.browser.viewportContainerWidth() / this.genomicState.locusCount;

        // console.log('viewport(' + this.id + ').resize - width: ' + contentWidth);

        if (contentWidth > 0) {
            this.setWidth(contentWidth);
            this.canvas.style.width = this.$viewport.width() + "px";
            this.canvas.setAttribute('width', this.$viewport.width());
            this.update();
        }
    };


    /**
     * Return a promise to adjust content height to accomodate features for current genomic state
     *
     * @returns {*}
     */
    igv.Viewport.prototype.adjustContentHeight = function () {

        var self = this,
            pixelWidth,
            bpWidth,
            bpStart,
            bpEnd,
            genomicState = self.genomicState,
            referenceFrame = genomicState.referenceFrame,
            chr,
            refFrameStart,
            chrLength;

        if (!viewIsReady.call(this) || !(typeof self.trackView.track.computePixelHeight === 'function') || showZoomInNotice.call(this)) {
            return Promise.resolve(this.getContentHeight());
        }

        chr = referenceFrame.chrName;

        // Expand the requested range so we can pan a bit without reloading.  But not beyond chromosome bounds
        chrLength = igv.browser.genome.getChromosome(chr).bpLength;
        pixelWidth = 3 * this.canvas.width;
        bpWidth = referenceFrame.toBP(pixelWidth);
        bpStart = Math.floor(Math.max(0, referenceFrame.start - bpWidth / 3));
        bpEnd = Math.ceil(Math.min(chrLength, bpStart + bpWidth));

        self.startSpinner();

        // console.log('get features');
        return getFeatures.call(self, chr, bpStart, bpEnd, referenceFrame.bpPerPixel)

            .then(function (features) {

                var currentContentHeight,
                    requiredContentHeight;

                self.stopSpinner();

                if (features) {

                    // Height of content div and content canvas
                    requiredContentHeight = self.trackView.track.computePixelHeight(features);
                    currentContentHeight = $(self.contentDiv).height();

                    if (requiredContentHeight !== currentContentHeight) {
                        self.setContentHeight(requiredContentHeight);
                    }

                    return self.getContentHeight();
                }
            })
    }

    igv.Viewport.prototype.update = function () {

        if (this.tile) {
            this.tile.invalidate = true;
        }
        this.repaint();

    };

    igv.Viewport.prototype.repaint = function () {

        var self = this,
            pixelWidth,
            bpWidth,
            bpStart,
            bpEnd,
            genomicState = self.genomicState,
            referenceFrame = genomicState.referenceFrame,
            chr,
            refFrameStart,
            refFrameEnd,
            drawConfiguration,
            buffer;

        if (!(viewIsReady.call(this))) {
            return;
        }

        // TODO -- show whole genome zoom in notice here
        if (showZoomInNotice.call(this)) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.$zoomInNotice.show();
            return;
        } else {
            this.$zoomInNotice.hide();
        }


        chr = referenceFrame.chrName;
        refFrameStart = referenceFrame.start;
        refFrameEnd = refFrameStart + referenceFrame.toBP(this.canvas.width);

        // Paint existing cached image, if any, while data loads.
        this.paintImage(chr, refFrameStart, refFrameEnd, referenceFrame.bpPerPixel);

        if (!tileIsValid.call(self, chr, refFrameStart, refFrameEnd, referenceFrame.bpPerPixel)) {

            //TODO -- if bpPerPixel (zoom level) changed repaint image from cached data => new optional track method to return
            //TODO -- cached features directly (not a promise for features).

            // Expand the requested range so we can pan a bit without reloading.  But not beyond chromosome bounds
            var chrLength = igv.browser.genome.getChromosome(chr).bpLength;

            pixelWidth = 3 * this.canvas.width;
            bpWidth = referenceFrame.toBP(pixelWidth);
            bpStart = Math.floor(Math.max(0, referenceFrame.start - bpWidth / 3));
            bpEnd = Math.ceil(Math.min(chrLength, bpStart + bpWidth));

            // Adjust pixel width in case bounds were clamped
            pixelWidth = (bpEnd - bpStart) / referenceFrame.bpPerPixel;

            if (self.loading && self.loading.start === bpStart && self.loading.end === bpEnd) {
                return;
            }

            self.loading = {start: bpStart, end: bpEnd};

            self.startSpinner();

            // console.log('get features');
            getFeatures.call(self, referenceFrame.chrName, bpStart, bpEnd, referenceFrame.bpPerPixel)

                .then(function (features) {

                    var roiPromises;

                    self.loading = undefined;

                    self.stopSpinner();

                    buffer = document.createElement('canvas');
                    buffer.width = pixelWidth;
                    buffer.height = self.canvas.height;
                    drawConfiguration =
                    {
                        features: features,
                        context: buffer.getContext('2d'),
                        pixelWidth: buffer.width,
                        pixelHeight: buffer.height,
                        bpStart: bpStart,
                        bpEnd: bpEnd,
                        bpPerPixel: referenceFrame.bpPerPixel,
                        referenceFrame: referenceFrame,
                        genomicState: genomicState,
                        selection: self.selection,
                        viewport: self,
                        viewportWidth: self.$viewport.width(),
                        viewportContainerX: genomicState.referenceFrame.toPixels(genomicState.referenceFrame.start - bpStart),
                        viewportContainerWidth: igv.browser.viewportContainerWidth()
                    };

                    if (features) {

                        drawConfiguration.features = features;

                        self.trackView.track.draw(drawConfiguration);

                        if (doRenderControlCanvas(genomicState, self.trackView)) {
                            renderControlCanvasWithTrackView(self.trackView);
                        }
                    }

                    if (igv.browser.roi) {
                        roiPromises = [];
                        igv.browser.roi.forEach(function (r) {
                            roiPromises.push(r.getFeatures(referenceFrame.chrName, bpStart, bpEnd))
                        });

                        return Promise.all(roiPromises)
                    }
                    else {
                        return undefined;   // No regions of interest
                    }
                })

                .then(function (roiArray) {

                    if (roiArray) {
                        var i, len;
                        for (i = 0, len = roiArray.length; i < len; i++) {
                            drawConfiguration.features = roiArray[i];
                            igv.browser.roi[i].draw(drawConfiguration);
                        }
                    }
                })

                .then(function (ignore) {

                    self.tile = new Tile(referenceFrame.chrName, bpStart, bpEnd, referenceFrame.bpPerPixel, buffer);
                    self.paintImage(chr, refFrameStart, refFrameEnd, referenceFrame.bpPerPixel);
                })

                .catch(function (error) {

                    console.error(error);

                    self.stopSpinner();

                    self.loading = false;

                    igv.presentAlert(error, undefined);

                });

        }

        function renderControlCanvasWithTrackView(trackView) {
            var buffer2;

            buffer2 = document.createElement('canvas');
            buffer2.width = trackView.controlCanvas.width;
            buffer2.height = trackView.controlCanvas.height;

            trackView.track.paintAxis(buffer2.getContext('2d'), buffer2.width, buffer2.height);

            trackView.controlCtx.drawImage(buffer2, 0, 0);

        }

        function doRenderControlCanvas(genomicState, trackView) {
            return (/*0 === genomicState.locusIndex &&*/ (typeof trackView.track.paintAxis === 'function') && trackView.controlCanvas.width > 0 && trackView.controlCanvas.height > 0);
        }

        function tileIsValid(chr, start, end, bpPerPixel) {
            return this.tile && !this.tile.invalidate && this.tile.containsRange(chr, start, end, bpPerPixel)
        }
    };


    function showZoomInNotice() {
        var referenceFrame = this.genomicState.referenceFrame;
        return (this.trackView.track.visibilityWindow !== undefined && this.trackView.track.visibilityWindow > 0 &&
            (referenceFrame.bpPerPixel * this.$viewport.width() > this.trackView.track.visibilityWindow)) ||
            (referenceFrame.chrName.toLowerCase() === "all" && !this.trackView.track.supportsWholeGenome);
    }

    function viewIsReady() {
        return igv.browser && igv.browser.genomicStateList && igv.browser.genomicStateList[this.genomicState.locusIndex].referenceFrame;
    }

    function getFeatures(chr, start, end, bpPerPixel) {
        var self = this;
        if (self.cachedFeatures && self.cachedFeatures.containsRange(chr, start, end, bpPerPixel)) {
            return Promise.resolve(self.cachedFeatures.features)
        }
        else {
            if (typeof self.trackView.track.getFeatures === "function") {
                return self.trackView.track.getFeatures(chr, start, end, bpPerPixel)
                    .then(function (features) {
                        self.cachedFeatures = new CachedFeatures(chr, start, end, bpPerPixel, features);
                        return features;
                    })
                    .catch(function (error) {
                        console.log(error);
                    })
            }
            else {
                Promise.resolve(undefined);
            }
        }
    }

    igv.Viewport.prototype.setContentHeight = function (contentHeight) {
        // Maximum height of a canvas is ~32,000 pixels on Chrome, possibly smaller on other platforms
        contentHeight = Math.min(contentHeight, 32000);
        $(this.contentDiv).height(contentHeight);
        $(this.canvas).height(contentHeight);
        this.canvas.setAttribute("height", contentHeight);
    };

    igv.Viewport.prototype.getContentHeight = function () {

        return $(this.contentDiv).height();

    }

    igv.Viewport.prototype.paintImage = function (chr, start, end, bpPerPixel) {

        var offset, sx, dx, scale, sWidth, dWidth, iHeight,
            tile = this.tile;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (tile && tile.containsRange(chr, start, end, bpPerPixel)) {
            this.xOffset = Math.round((tile.startBP - start) / tile.bpPerPixel);
            this.ctx.drawImage(tile.image, this.xOffset, 0);
            this.ctx.save();
            this.ctx.restore();
        } else if (tile && tile.overlapsRange(chr, start, end)) {

            var offset = Math.round((start - tile.startBP) / tile.bpPerPixel);
            if (offset > 0) {
                sx = offset;
                dx = 0;
            } else {
                sx = 0;
                dx = -offset;
            }

            dWidth = tile.image.width;
            if (bpPerPixel === tile.bpPerPixel) {
                sWidth = dWidth;
            } else {
                scale = bpPerPixel / tile.bpPerPixel;
                sWidth = Math.round(scale * dWidth);

            }

            iHeight = tile.image.height;

            this.ctx.drawImage(tile.image, sx, 0, sWidth, iHeight, dx, 0, dWidth, iHeight);
            this.ctx.save();
            this.ctx.restore();
        }
    };

    igv.Viewport.prototype.isLoading = function () {
        return !(undefined === this.loading);
    };

    igv.Viewport.prototype.addMouseHandlers = function () {

        var self = this,
            referenceFrame,
            isMouseDown,
            isDragging,
            lastMouseX,
            mouseDownX,
            canvasMouseDownX,
            lastClickTime,
            popupTimer;

        referenceFrame = lastMouseX = mouseDownX = undefined;
        isMouseDown = isDragging = false;

        this.$viewport.on('mousedown.viewport.pan', function (e) {

            var coords;

            e.preventDefault();

            if (igv.popover) {
                igv.popover.hide();
            }

            isMouseDown = true;

            coords = igv.translateMouseCoordinates(e, self.$viewport.get(0));
            mouseDownX = lastMouseX = coords.x;

            referenceFrame = self.genomicState.referenceFrame;
        });

        this.$viewport.on('mousemove.viewport.pan', igv.throttle(function (e) {

            var chromosome,
                coords,
                maxEnd,
                maxStart;

            e.preventDefault();

            coords = igv.translateMouseCoordinates(e, self.$viewport.get(0));

            if (referenceFrame && (true === isMouseDown)) {

                if (mouseDownX && Math.abs(coords.x - mouseDownX) > igv.browser.constants.dragThreshold) {

                    if (igv.browser.loadInProgress()) {
                        return;
                    }

                    isDragging = true;

                    referenceFrame.shiftPixels(lastMouseX - coords.x);

                    // clamp left
                    referenceFrame.start = Math.max(0, referenceFrame.start);

                    // clamp
                    chromosome = igv.browser.genome.getChromosome(referenceFrame.chrName);
                    maxEnd = chromosome.bpLength;
                    maxStart = maxEnd - (self.$viewport.width() * referenceFrame.bpPerPixel);

                    if (referenceFrame.start > maxStart) {
                        referenceFrame.start = maxStart;
                    }

                    igv.browser.updateLocusSearchWidget(_.first(igv.browser.genomicStateList));

                    igv.browser.repaintWithLocusIndex(self.genomicState.locusIndex);

                    igv.browser.fireEvent('trackdrag');
                }

                lastMouseX = coords.x;

            }

        }, 10));

        this.$viewport.on('mouseup.viewport.pan', mouseUpOrOut);

        this.$viewport.on('mouseleave.viewport.pan', mouseUpOrOut);

        $(self.canvas).on('mousedown.viewport.canvas', function (e) {
            e.preventDefault();
            canvasMouseDownX = igv.translateMouseCoordinates(e, self.canvas).x;
        });

        lastClickTime = 0;
        $(self.canvas).on('click.viewport.canvas', function (e) {

            var canvasMouseX,
                frame,
                location,
                time,
                newCenter,
                string,
                loci,
                chr;

            e.preventDefault();

            console.log('click.viewport.canvas');

            canvasMouseX = igv.translateMouseCoordinates(e, self.canvas).x;
            frame = self.genomicState.referenceFrame;
            location = Math.floor((frame.start) + frame.toBP(canvasMouseX));

            time = Date.now();

            if (time - lastClickTime < igv.browser.constants.doubleClickDelay) {

                // double-click

                if (popupTimer) {
                    window.clearTimeout(popupTimer);
                    popupTimer = undefined;
                }

                if (igv.browser.minimumBasesExtent() > Math.floor(self.$viewport.width() * frame.bpPerPixel / 2.0)) {

                    // do nothing

                } else {
                    newCenter = Math.round(frame.start + canvasMouseX * frame.bpPerPixel);
                    if ('all' === frame.chrName.toLowerCase()) {

                        chr = igv.browser.genome.getChromosomeCoordinate(newCenter).chr;

                        if (1 === self.genomicState.locusCount) {
                            string = chr;
                        } else {
                            loci = igv.browser.genomicStateList.map(function (g) {
                                return g.locusSearchString;
                            });
                            loci[self.genomicState.locusIndex] = chr;
                            string = loci.join(' ');
                        }

                        igv.browser.search(string);

                    } else {
                        frame.bpPerPixel /= 2;
                        frame.start = Math.round((newCenter + frame.start) / 2.0);
                        igv.browser.updateWithLocusIndex(self.genomicState.locusIndex);
                    }

                }

            } else {

                if (e.shiftKey && typeof self.trackView.track.shiftClick === "function") {

                    self.trackView.track.shiftClick(location, e);
                } else if (e.altKey) {

                    self.popover.presentTrackPopupMenu(e, self);
                } else if (Math.abs(canvasMouseX - canvasMouseDownX) <= igv.browser.constants.dragThreshold && self.trackView.track.popupData) {

                    popupTimer = window.setTimeout(function () {

                            self.popover.presentTrackPopup(e, self);

                            canvasMouseDownX = undefined;
                            popupTimer = undefined;
                        },
                        igv.browser.constants.doubleClickDelay);
                }
            }

            canvasMouseDownX = undefined;
            lastClickTime = time;
        });

        function mouseUpOrOut(e) {

            e.preventDefault();

            if (true === isDragging) {
                igv.browser.fireEvent('trackdragend');
                isDragging = false;
            }

            isMouseDown = false;
            mouseDownX = lastMouseX = undefined;
            referenceFrame = undefined;
        }

    };

    igv.Viewport.viewportWidthAtLocusIndex = function (locusIndex) {

        var viewport = igv.Viewport.viewportsWithLocusIndex(locusIndex)[0];
        return viewport.$viewport.width();
    };

    igv.Viewport.viewportsWithLocusIndex = function (locusIndex) {

        var list = [];
        igv.browser.trackViews.forEach(function (tv) {

            tv.viewports.forEach(function (vp) {

                if (locusIndex === vp.genomicState.locusIndex) {
                    list.push(vp);
                }

            });
        });

        return list;
    };

    igv.Viewport.viewportWithID = function (id) {

        var result = undefined;

        igv.browser.trackViews.forEach(function (tv) {
            if (undefined === result) {
                tv.viewports.forEach(function (vp) {
                    if (id === vp.id) {
                        result = vp;
                    }
                });
            }
        });

        return result;
    };


    var Tile = function (chr, tileStart, tileEnd, bpPerPixel, image) {
        this.chr = chr;
        this.startBP = tileStart;
        this.endBP = tileEnd;
        this.bpPerPixel = bpPerPixel;
        this.image = image;
    };

    Tile.prototype.containsRange = function (chr, start, end, bpPerPixel) {
        return this.bpPerPixel === bpPerPixel && start >= this.startBP && end <= this.endBP && chr === this.chr;
    };

    Tile.prototype.overlapsRange = function (chr, start, end) {
        return this.chr === chr && end >= this.startBP && start <= this.endBP;
    }

    var CachedFeatures = function (chr, tileStart, tileEnd, bpPerPixel, features) {
        this.chr = chr;
        this.startBP = tileStart;
        this.endBP = tileEnd;
        this.bpPerPixel = bpPerPixel;
        this.features = features;
    };

    CachedFeatures.prototype.containsRange = function (chr, start, end, bpPerPixel) {
        return this.bpPerPixel === bpPerPixel && start >= this.startBP && end <= this.endBP && chr === this.chr;
    };


    return igv;

})(igv || {});
