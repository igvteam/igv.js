/**
 * Created by dat on 9/16/16.
 */
var igv = (function (igv) {

    igv.Viewport = function (trackView, locusIndex) {
        this.initializationHelper(trackView, locusIndex);
    };

    igv.Viewport.prototype.initializationHelper = function (trackView, locusIndex) {

        var self = this,
            description,
            $trackLabel,
            $spinner,
            dimen;

        this.trackView = trackView;
        this.id = _.uniqueId('viewport_');
        this.genomicState = igv.browser.genomicStateList[ locusIndex ];

        this.$viewport = $('<div class="igv-viewport-div">');
        this.$viewport.data( "viewport", this.id );
        this.$viewport.data( "locusindex", this.genomicState.locusIndex );

        addViewportBorders(this.$viewport, this.genomicState.locusIndex, _.size(igv.browser.genomicStateList));

        // TODO diagnostic coloring
        // this.$viewport.css("background-color", igv.randomRGBConstantAlpha(200, 255, 0.75));

        this.setWidth(igv.browser.viewportContainerWidth()/this.genomicState.locusCount);

        this.trackView.$viewportContainer.append( this.$viewport );

        this.contentDiv = $('<div class="igv-viewport-content-div">')[0];
        this.$viewport.append(this.contentDiv);

        if (trackView.track instanceof igv.SequenceTrack) {
            this.$viewport.addClass('igv-viewport-sequence');
        }

        if (this.genomicState.locusCount > 1) {

            if (trackView.track instanceof igv.RulerTrack) {

                this.$viewport.addClass('igv-viewport-ruler');

                this.$close = $('<div class="igv-viewport-fa-close">');
                this.$closeButton = $('<i class="fa fa-times-circle">');
                this.$close.append(this.$closeButton);

                this.$close.click(function (e) {
                    igv.browser.closeMultiLocusPanelWithGenomicState(self.genomicState);
                });

                this.$viewport.append(this.$close);
            }
        }

        // track content canvas
        this.canvas = $('<canvas>')[0];
        $(this.contentDiv).append(this.canvas);
        this.canvas.setAttribute('width', this.contentDiv.clientWidth);
        this.canvas.setAttribute('height', this.contentDiv.clientHeight);
        this.ctx = this.canvas.getContext("2d");

        if (this.genomicState.locusCount > 1) {
            if (trackView.track instanceof igv.RulerTrack) {
                $(this.contentDiv).append(igv.browser.rulerTrack.locusLabelWithViewport(this));
            }
        }

        // zoom in to see features
        if (trackView.track.visibilityWindow !== undefined || !trackView.track.supportsWholeGenome) {
            self.$zoomInNotice = createZoomInNotice();
            $(this.contentDiv).append(self.$zoomInNotice);
        }

        function createZoomInNotice () {
            var $container,
                $child;

            $child = $('<div">');
            $child.text('Zoom in to see features');

            $container = $('<div class="zoom-in-notice-container">');
            $container.append($child);

            $container.hide();

            return $container;
        }

        if (trackView.track.name && 0 === this.genomicState.locusIndex) {

            description = trackView.track.description || trackView.track.name;
            $trackLabel = $('<div class="igv-track-label">');

            $trackLabel.html(trackView.track.name);

            $trackLabel.click(function (e) {
                igv.popover.presentContent(e.pageX, e.pageY, description);
            });

            this.$viewport.append($trackLabel);

            if (igv.browser.$trackLabelToggle.hasClass('igv-nav-bar-toggle-button-on')) {
                $trackLabel.hide();
            }

        }

        this.addMouseHandlers();

        if (trackView.track instanceof igv.RulerTrack) {

            // do nothing
        } else {
            dimen = this.$viewport.height();
            if (dimen > 32) {
                dimen = 32;
            }

            $spinner = $('<div class="igv-viewport-spinner">');
            $spinner.css({ 'font-size' : dimen + 'px'});

            // $spinner.append($('<i class="fa fa-cog fa-spin fa-fw">'));
            $spinner.append($('<i class="fa fa-spinner fa-spin fa-fw">'));
            this.$viewport.append($spinner);
            this.stopSpinner();
        }

        function addViewportBorders ($viewport, locusIndex, lociCount) {

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
        percentage = this.$viewport.width()/this.$viewport.outerWidth();
        this.$viewport.width(Math.floor(percentage * width));
    };

    igv.Viewport.prototype.addMouseHandlers = function () {

        var self = this,
            isMouseDown = false,
            lastMouseX = undefined,
            mouseDownX = undefined,
            lastClickTime = 0,
            popupTimer,
            doubleClickDelay;

        if (self.trackView.track instanceof igv.RulerTrack) {
            self.addRulerMouseHandlers();
        } else {

            doubleClickDelay = igv.browser.constants.doubleClickDelay;

            // right-click
            $(self.canvas).contextmenu(function(e) {

                e.preventDefault();
                e = $.event.fix(e);
                e.stopPropagation();

                igv.popover.presentTrackPopupMenu(e, self);

            });

            $(self.canvas).mousedown(function (e) {
                var canvasCoords;

                e.preventDefault();

                isMouseDown = true;
                canvasCoords = igv.translateMouseCoordinates(e, self.canvas);
                lastMouseX = canvasCoords.x;
                mouseDownX = lastMouseX;
            });

            $(self.canvas).click(function (e) {

                var canvasCoords,
                    referenceFrame,
                    genomicLocation,
                    time,
                    newCenter,
                    widthBP,
                    chr;

                e.preventDefault();
                e = $.event.fix(e);
                e.stopPropagation();

                referenceFrame = self.genomicState.referenceFrame;
                if (undefined === referenceFrame) {
                    console.log('undefined === referenceFrame');
                    return;
                }

                canvasCoords = igv.translateMouseCoordinates(e, self.canvas);
                genomicLocation = Math.floor((referenceFrame.start) + referenceFrame.toBP(canvasCoords.x));
                time = Date.now();

                if (time - lastClickTime < doubleClickDelay) {
                    // This is a double-click

                    // if (_.size(igv.browser.genomicStateList) > 1) {
                    //     // ignore
                    // } else {

                    if (popupTimer) {
                        // Cancel previous timer
                        window.clearTimeout(popupTimer);
                        popupTimer = undefined;
                    }

                    if (igv.browser.minimumBasesExtent() > Math.floor(self.$viewport.width() * referenceFrame.bpPerPixel/2.0)) {
                        // do nothing
                    } else {
                        newCenter = Math.round(referenceFrame.start + canvasCoords.x * referenceFrame.bpPerPixel);
                        if(referenceFrame.chrName === "all") {
                            chr = igv.browser.genome.getChromosomeCoordinate(newCenter).chr;
                            igv.browser.search(chr);

                        } else {
                            self.genomicState.referenceFrame.bpPerPixel /= 2;
                            self.genomicState.referenceFrame.start = Math.round((newCenter + self.genomicState.referenceFrame.start)/2.0 );
                            igv.browser.updateWithLocusIndex(self.genomicState.locusIndex);

                        }

                    }

                    // }

                } else {

                    if (e.shiftKey) {

                        if (self.trackView.track.shiftClick && self.tile) {
                            self.trackView.track.shiftClick(genomicLocation, e);
                        }

                    } else if (e.altKey) {

                        if (self.trackView.track.altClick && self.tile) {
                            self.trackView.track.altClick(genomicLocation, referenceFrame, e);
                        }

                    } else if (Math.abs(canvasCoords.x - mouseDownX) <= igv.browser.constants.dragThreshold && self.trackView.track.popupDataWithConfiguration) {

                        popupTimer = window.setTimeout(function () {

                                igv.popover.presentTrackPopup(e, self);

                                mouseDownX = undefined;
                                popupTimer = undefined;
                            },
                            doubleClickDelay);
                    }
                }

                mouseDownX = undefined;
                isMouseDown = false;
                lastMouseX = undefined;
                lastClickTime = time;

            });

        }

    };

    igv.Viewport.prototype.addRulerMouseHandlers = function () {

        var self = this,
            isMouseDown = undefined,
            isMouseIn = undefined,
            mouseDownXY = undefined,
            mouseMoveXY = undefined,
            left,
            rulerSweepWidth,
            rulerSweepThreshold = 1,
            dx;

        this.removeRulerMouseHandlers();

        if ('all' === this.genomicState.chromosome.name) {
            return;
        }
        // self.trackView.trackDiv.dataset.rulerTrack = "rulerTrack";

        // ruler sweeper widget surface
        self.$rulerSweeper = $('<div class="igv-ruler-sweeper-div">');
        $(self.contentDiv).append(self.$rulerSweeper);

        this.$viewport.on({

            mousedown: function (e) {

                e.preventDefault();

                $(self.contentDiv).off();

                $(self.contentDiv).on({
                    mousedown: function (e) {
                        isMouseDown = true;
                    }
                });

                mouseDownXY = igv.translateMouseCoordinates(e, self.contentDiv);

                left = mouseDownXY.x;
                rulerSweepWidth = 0;
                self.$rulerSweeper.css({"display": "inline", "left": left + "px", "width": rulerSweepWidth + "px"});

                isMouseIn = true;
            },

            mousemove: function (e) {

                e.preventDefault();

                if (isMouseDown && isMouseIn) {

                    mouseMoveXY = igv.translateMouseCoordinates(e, self.contentDiv);
                    dx = mouseMoveXY.x - mouseDownXY.x;
                    rulerSweepWidth = Math.abs(dx);

                    if (rulerSweepWidth > rulerSweepThreshold) {

                        self.$rulerSweeper.css({"width": rulerSweepWidth + "px"});

                        if (dx < 0) {

                            if (mouseDownXY.x + dx < 0) {
                                isMouseIn = false;
                                left = 0;
                            } else {
                                left = mouseDownXY.x + dx;
                            }
                            self.$rulerSweeper.css({"left": left + "px"});
                        }
                    }
                }
            },

            mouseup: function (e) {

                var extent,
                    referenceFrame;

                if (isMouseDown) {

                    // End sweep
                    isMouseDown = false;
                    isMouseIn = false;

                    self.$rulerSweeper.css({"display": "none", "left": 0 + "px", "width": 0 + "px"});

                    referenceFrame = self.genomicState.referenceFrame;

                    extent = {};
                    extent.start = referenceFrame.start + (left * referenceFrame.bpPerPixel);
                    extent.end = extent.start + rulerSweepWidth * referenceFrame.bpPerPixel;

                    if (rulerSweepWidth > rulerSweepThreshold) {
                        igv.Browser.validateLocusExtent(igv.browser.genome.getChromosome(referenceFrame.chrName), extent);
                        self.goto(referenceFrame.chrName, extent.start, extent.end);
                    }
                }

            }
        });

    };

    igv.Viewport.prototype.removeRulerMouseHandlers = function () {
        $(this.contentDiv).off();
        this.$viewport.off();
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

        var contentWidth  = igv.browser.viewportContainerWidth()/this.genomicState.locusCount;

        // console.log('viewport(' + this.id + ').resize - width: ' + contentWidth);

        if (contentWidth > 0) {
            this.setWidth(contentWidth);
            this.canvas.style.width = this.$viewport.width() + "px";
            this.canvas.setAttribute('width', this.$viewport.width());
            this.update();
        }
    };

    igv.Viewport.prototype.update = function () {

        this.tile = null;

        this.repaint();

    };

    igv.Viewport.prototype.repaint = function () {

        var self = this,
            pixelWidth,
            bpWidth,
            bpStart,
            bpEnd,
            ctx,
            genomicState = self.genomicState,
            referenceFrame = genomicState.referenceFrame,
            chr,
            refFrameStart,
            refFrameEnd;

        if (!(viewIsReady.call(this))) {
            return;
        }

        if (this.$zoomInNotice && this.trackView.track.visibilityWindow !== undefined && this.trackView.track.visibilityWindow > 0) {
            if ((referenceFrame.bpPerPixel * this.$viewport.width() > this.trackView.track.visibilityWindow) ||
                (referenceFrame.chrName === "all" && !this.trackView.track.supportsWholeGenome)) {
                this.tile = null;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                self.stopSpinner();

                this.$zoomInNotice.show();
                return;
            } else {
                this.$zoomInNotice.hide();
            }
        }

        chr = referenceFrame.chrName;
        refFrameStart = referenceFrame.start;
        refFrameEnd = refFrameStart + referenceFrame.toBP(this.canvas.width);

        if (this.tile && this.tile.containsRange(chr, refFrameStart, refFrameEnd, referenceFrame.bpPerPixel)) {
            // console.log('paint pre-existing canvas');
            this.paintImageWithReferenceFrame(referenceFrame);
        } else {

            // Expand the requested range so we can pan a bit without reloading
            pixelWidth = 3 * this.canvas.width;
            bpWidth = Math.round(referenceFrame.toBP(pixelWidth));
            bpStart = Math.max(0, Math.round(referenceFrame.start - bpWidth / 3));
            bpEnd = bpStart + bpWidth;

            if (self.loading && self.loading.start === bpStart && self.loading.end === bpEnd) {
                return;
            }

            self.loading = { start: bpStart, end: bpEnd };

            self.startSpinner();

            // console.log('get features');
            this.trackView.track
                .getFeatures(referenceFrame.chrName, bpStart, bpEnd, referenceFrame.bpPerPixel)
                .then(function (features) {

                    var buffer,
                        requiredHeight;

                    // self.loading = false;
                    self.loading = undefined;

                    self.stopSpinner();

                    if (features) {

                        if (typeof self.trackView.track.computePixelHeight === 'function') {
                            requiredHeight = self.trackView.track.computePixelHeight(features);
                            if (requiredHeight != self.contentDiv.clientHeight) {
                                // self.setContentHeight(requiredHeight);
                                self.trackView.setContentHeightForViewport(self, requiredHeight)
                            }
                        }

                        buffer = document.createElement('canvas');
                        buffer.width = pixelWidth;
                        buffer.height = self.canvas.height;

                        self.drawConfiguration =
                            {

                                features: features,
                                context: buffer.getContext('2d'),

                                pixelWidth: buffer.width,
                                pixelHeight: buffer.height,

                                bpStart: bpStart,   // bpStart = Math.max(0, Math.round(referenceFrame.start - bpWidth / 3))
                                                    // bpWidth = Math.round(referenceFrame.toBP(pixelWidth))
                                                    // buffer.width = pixelWidth = 3 * this.canvas.width

                                bpEnd: bpEnd,

                                bpPerPixel: referenceFrame.bpPerPixel,

                                referenceFrame: referenceFrame,

                                genomicState: genomicState,

                                viewport: self,

                                viewportWidth: self.$viewport.width(),

                                viewportContainerX: genomicState.referenceFrame.toPixels(genomicState.referenceFrame.start - bpStart),

                                viewportContainerWidth: igv.browser.viewportContainerWidth()
                            };

                        // console.log('render features');
                        self.trackView.track.draw(self.drawConfiguration);

                        if (doRenderControlCanvas(genomicState, self.trackView)) {
                            renderControlCanvasWithTrackView(self.trackView);
                        }

                        self.tile = new Tile(referenceFrame.chrName, bpStart, bpEnd, referenceFrame.bpPerPixel, buffer);
                        self.paintImageWithReferenceFrame(referenceFrame);

                    } else {
                        self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
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
                        return (/*0 === genomicState.locusIndex &&*/ trackView.track.paintAxis && trackView.controlCanvas.width > 0 && trackView.controlCanvas.height > 0);
                    }
                })
                .catch(function (error) {

                    self.stopSpinner();

                    self.loading = false;

                    if (error instanceof igv.AbortLoad) {
                        console.log("Aborted ---");
                    } else {
                        igv.presentAlert(error);
                    }
                });
        }

        function viewIsReady() {
            return igv.browser && igv.browser.genomicStateList && igv.browser.genomicStateList[ self.genomicState.locusIndex ].referenceFrame;
        }

    };

    igv.Viewport.prototype.setContentHeight = function (newHeight) {

        // Maximum height of a canvas is ~32,000 pixels on Chrome, possibly smaller on other platforms
        newHeight = Math.min(newHeight, 32000);

        if (this.trackView.track.minHeight) {
            newHeight = Math.max(this.trackView.track.minHeight, newHeight);
        }

        var contentHeightStr = newHeight + "px";

        // TODO: dat - implement this for viewport. Was in trackView .
        // Optionally adjust the trackDiv and viewport height to fit the content height, within min/max bounds
        // if (this.trackView.track.autoHeight) {
        //     setTrackHeight_.call(this, newHeight, false);
        // }

        $(this.contentDiv).height(newHeight);
        this.canvas.style.height = contentHeightStr;
        this.canvas.setAttribute("height", newHeight);

        // TODO: dat - implement this for viewport. Was in trackView .
        // if (this.track.paintAxis) {
        //     this.controlCanvas.style.height = contentHeightStr;
        //     this.controlCanvas.setAttribute("height", newHeight);
        // }

    };

    igv.Viewport.prototype.paintImageWithReferenceFrame = function (referenceFrame) {

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.tile) {
            this.xOffset = Math.round(this.genomicState.referenceFrame.toPixels(this.tile.startBP - this.genomicState.referenceFrame.start));
            this.ctx.drawImage(this.tile.image, this.xOffset, 0);
            this.ctx.save();
            this.ctx.restore();
        }
    };

    igv.Viewport.prototype.isLoading = function () {
        return !(undefined === this.loading);
    };

    igv.Viewport.viewportWidthAtLocusIndex = function (locusIndex) {

        var viewport = _.first( igv.Viewport.viewportsWithLocusIndex(locusIndex) );
        return viewport.$viewport.width();
    };

    igv.Viewport.viewportsWithLocusIndex = function (locusIndex) {

        var list = [];
        _.each(igv.browser.trackViews, function(tv){

            _.each(tv.viewports, function(vp) {

                if (locusIndex === vp.genomicState.locusIndex) {
                    list.push(vp);
                }

            });
        });

        return list;
    };

    igv.Viewport.viewportWithID = function (id) {

        var result = undefined;

        _.each(igv.browser.trackViews, function(tv){
            if (undefined === result) {
                _.each(tv.viewports, function(vp) {
                    if (id === vp.id) {
                        result = vp;
                    }
                });
            }
        });

        return result;
    };

    Tile = function (chr, tileStart, tileEnd, scale, image) {
        this.chr = chr;
        this.startBP = tileStart;
        this.endBP = tileEnd;
        this.scale = scale;
        this.image = image;
    };

    Tile.prototype.containsRange = function (chr, start, end, scale) {
        return this.scale === scale && start >= this.startBP && end <= this.endBP && chr === this.chr;
    };

    // TODO: dat - Called from BAMTrack.altClick. Change call to redrawTile(viewPort, features)
    igv.Viewport.prototype.redrawTile = function (features) {

        var buffer;

        if (!this.tile) {
            return;
        }

        buffer = document.createElement('canvas');
        buffer.width = this.tile.image.width;
        buffer.height = this.tile.image.height;

        this.trackView.track.draw({
            features: features,
            context: buffer.getContext('2d'),
            bpStart: this.tile.startBP,
            bpPerPixel: this.tile.scale,
            pixelWidth: buffer.width,
            pixelHeight: buffer.height
        });


        this.tile = new Tile(this.tile.chr, this.tile.startBP, this.tile.endBP, this.tile.scale, buffer);
        this.paintImageWithReferenceFrame(this.genomicState.referenceFrame);
    };

    return igv;

}) (igv || {});
