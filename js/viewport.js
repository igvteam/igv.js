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
        this.locusIndex = locusIndex;
        this.viewportContainerPercentage = igv.browser.kitchenSinkList[ this.locusIndex ].viewportContainerPercentage;

        this.$viewport = $('<div class="igv-viewport-div">');

        // TODO diagnostic coloring
        this.$viewport.css("background-color", igv.randomRGBConstantAlpha(200, 255, 0.75));

        this.id = _.uniqueId('viewport_');
        this.$viewport.data( "viewport", this.id );

        this.$viewport.data( "locusindex", this.locusIndex );

        this.$viewport.width( igv.browser.kitchenSinkList[ this.locusIndex ].viewportWidth );

        trackView.$viewportContainer.append( this.$viewport );

        this.contentDiv = $('<div class="igv-content-div">')[0];
        this.$viewport.append(this.contentDiv);

        // track content canvas
        this.canvas = $('<canvas class = "igv-content-canvas">')[0];
        $(this.contentDiv).append(this.canvas);
        this.canvas.setAttribute('width', this.contentDiv.clientWidth);
        this.canvas.setAttribute('height', this.contentDiv.clientHeight);
        this.ctx = this.canvas.getContext("2d");

        // zoom in to see features
        if (trackView.track.visibilityWindow !== undefined) {
            self.$zoomInNotice = $('<div class="zoom-in-notice">');
            self.$zoomInNotice.text('Zoom in to see features');
            $(this.contentDiv).append(self.$zoomInNotice);
            self.$zoomInNotice.hide();
        }

        // TODO: dat - move scrollbars to $viewportContainer
        // scrollbar,  default is to set overflow ot hidden and use custom scrollbar, but this can be overriden so check
        // if ("hidden" === this.$viewport.css("overflow-y")) {
        //     this.scrollbar = new TrackScrollbar(this.$viewport.get(0), this.contentDiv);
        //     this.scrollbar.update();
        //     this.$viewport.append(this.scrollbar.outerScrollDiv);
        // }

        if (trackView.track.name) {

            description = trackView.track.description || trackView.track.name;
            $trackLabel = $('<div class="igv-track-label">');

            $trackLabel.html(trackView.track.name);

            $trackLabel.click(function (e) {
                igv.popover.presentTrackPopup(e.pageX, e.pageY, description, false);
            });

            this.$viewport.append($trackLabel);
        }

        this.addMouseHandlers(trackView);

        if (trackView.track instanceof igv.RulerTrack) {

            // do nothing
        } else {
            dimen = this.$viewport.height();
            if (dimen > 32) {
                dimen = 32;
            }
            console.log('$viewport height ' + dimen);
            $spinner = $('<div class="igv-viewport-spinner">');
            $spinner.css({ 'font-size' : dimen + 'px'});

            $spinner.append($('<i class="fa fa-cog fa-spin fa-fw">'));
            // $spinner.append($('<i class="fa fa-spinner fa-pulse fa-fw">'));
            this.$viewport.append($spinner);
        }
    };

    igv.Viewport.prototype.addMouseHandlers = function (trackView) {

        var self = this,
            isMouseDown = false,
            lastMouseX = undefined,
            mouseDownX = undefined,
            lastClickTime = 0,
            popupTimer,
            doubleClickDelay;

        if (trackView.track instanceof igv.RulerTrack) {

            trackView.trackDiv.dataset.rulerTrack = "rulerTrack";

            // ruler sweeper widget surface
            this.$rulerSweeper = $('<div class="igv-ruler-sweeper-div">');
            $(self.contentDiv).append(this.$rulerSweeper);

            this.addRulerMouseHandlers();

        } else {

            doubleClickDelay = igv.browser.constants.doubleClickDelay;

            $(this.canvas).mousedown(function (e) {

                var canvasCoords = igv.translateMouseCoordinates(e, self.canvas);
                isMouseDown = true;
                lastMouseX = canvasCoords.x;
                mouseDownX = lastMouseX;


            });

            $(this.canvas).click(function (e) {

                var canvasCoords,
                    referenceFrame = igv.browser.kitchenSinkList[ self.locusIndex ].referenceFrame,
                    genomicLocation,
                    time;

                // Sets pageX and pageY for browsers that don't support them
                e = $.event.fix(e);

                e.stopPropagation();

                canvasCoords = igv.translateMouseCoordinates(e, self.canvas);
                genomicLocation = Math.floor((referenceFrame.start) + referenceFrame.toBP(canvasCoords.x));
                time = Date.now();

                if (!referenceFrame) {
                    return;
                }

                if (time - lastClickTime < doubleClickDelay) {
                    // This is a double-click

                    if (popupTimer) {
                        // Cancel previous timer
                        window.clearTimeout(popupTimer);
                        popupTimer = undefined;
                    }

                    var newCenter = Math.round(referenceFrame.start + canvasCoords.x * referenceFrame.bpPerPixel);
                    referenceFrame.bpPerPixel /= 2;
                    igv.browser.goto(referenceFrame.chrName, newCenter);
                } else {

                    if (e.shiftKey) {

                        if (trackView.track.shiftClick && self.tile) {
                            trackView.track.shiftClick(genomicLocation, e);
                        }

                    } else if (e.altKey) {

                        if (trackView.track.altClick && self.tile) {
                            trackView.track.altClick(genomicLocation, e);
                        }

                    } else if (Math.abs(canvasCoords.x - mouseDownX) <= igv.browser.constants.dragThreshold && trackView.track.popupData) {

                        popupTimer = window.setTimeout(function () {

                                var popupData,
                                    xOrigin;

                                if (undefined === genomicLocation) {
                                    return;
                                }
                                if (null === self.tile) {
                                    return;
                                }
                                xOrigin = Math.round(referenceFrame.toPixels((self.tile.startBP - referenceFrame.start)));
                                popupData = trackView.track.popupData(genomicLocation, canvasCoords.x - xOrigin, canvasCoords.y, referenceFrame);

                                var handlerResult = igv.browser.fireEvent('trackclick', [trackView.track, popupData]);

                                // (Default) no external handlers or no input from handlers
                                if (handlerResult === undefined) {
                                    if (popupData && popupData.length > 0) {
                                        igv.popover.presentTrackPopup(e.pageX, e.pageY, igv.formatPopoverText(popupData), false);
                                    }
                                    // A handler returned custom popover HTML to override default format
                                } else if (typeof handlerResult === 'string') {
                                    igv.popover.presentTrackPopup(e.pageX, e.pageY, handlerResult, false);
                                }
                                // If handler returned false then we do nothing and let the handler manage the click

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

        this.$viewport.mousedown(function (e) {

            mouseDownXY = igv.translateMouseCoordinates(e, self.contentDiv);

            left = mouseDownXY.x;
            rulerSweepWidth = 0;
            self.$rulerSweeper.css({"display": "inline", "left": left + "px", "width": rulerSweepWidth + "px"});

            isMouseIn = true;
        });

        $(this.contentDiv).mousedown(function (e) {
            isMouseDown = true;
        });

        this.$viewport.mousemove(function (e) {

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
        });

        this.$viewport.mouseup(function (e) {

            var extent,
                referenceFrame;

            if (isMouseDown) {

                // End sweep
                isMouseDown = false;
                isMouseIn = false;

                self.$rulerSweeper.css({"display": "none", "left": 0 + "px", "width": 0 + "px"});

                referenceFrame = igv.browser.kitchenSinkList[ self.locusIndex ].referenceFrame;

                extent = {};
                extent.start = referenceFrame.start + (left * referenceFrame.bpPerPixel);
                extent.end = extent.start + rulerSweepWidth * referenceFrame.bpPerPixel;

                if (rulerSweepWidth > rulerSweepThreshold) {
                    igv.validateLocusExtent(igv.browser.genome.getChromosome(referenceFrame.chrName), extent);
                    self.goto(referenceFrame.chrName, extent.start, extent.end);
                }
            }

        });

    };

    igv.Viewport.prototype.goto = function (chr, start, end) {

        var self = this,
            referenceFrame = igv.browser.kitchenSinkList[ this.locusIndex ].referenceFrame;

        if (igv.popover) {
            igv.popover.hide();
        }

        referenceFrame.bpPerPixel = (Math.round(end) - Math.round(start)) / this.$viewport.width();
        referenceFrame.start = Math.round(start);

        igv.browser.updateWithLocusIndex(self.locusIndex);

        // _.each(igv.browser.trackViews, function(tv){
        //     _.each(tv.viewports, function(vp){
        //         if (vp.locusIndex === self.locusIndex) {
        //             vp.update();
        //         }
        //     });
        // });
    };

    igv.Viewport.prototype.resize = function () {

        var contentWidth  = this.viewportContainerPercentage * this.trackView.$viewportContainer.width();
        if (contentWidth > 0) {
            this.$viewport.width(contentWidth);
            this.canvas.style.width = contentWidth + "px";
            this.canvas.setAttribute('width', contentWidth);
            this.update();
        }
    };

    igv.Viewport.prototype.update = function () {

        this.tile = null;
        if (this.scrollbar) this.scrollbar.update();
        this.repaint();

    };

    igv.Viewport.prototype.repaint = function () {

        var self = this,
            pixelWidth,
            bpWidth,
            bpStart,
            bpEnd,
            ctx,
            referenceFrame = igv.browser.kitchenSinkList[ self.locusIndex ].referenceFrame,
            chr,
            refFrameStart,
            refFrameEnd;

        // TODO: dat - implement this for viewport. Was in trackView.
        // if (!(viewIsReady.call(this))) {
        //     return;
        // }

        if (this.trackView.track.visibilityWindow !== undefined && this.trackView.track.visibilityWindow > 0) {
            if (referenceFrame.bpPerPixel * this.$viewport.width() > this.trackView.track.visibilityWindow) {
                this.tile = null;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                igv.stopSpinnerAtParentElement(this.trackView.trackDiv);

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
            this.paintImage();
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

            // igv.startSpinnerAtParentElement(this.trackView.trackDiv);

            this.trackView.track.getFeatures(referenceFrame.chrName, bpStart, bpEnd, referenceFrame.bpPerPixel)

                .then(function (features) {
                    var buffer,
                        requiredHeight;

                    self.loading = false;
                    // igv.stopSpinnerAtParentElement(self.trackView.trackDiv);

                    if (features) {

                        if (typeof self.trackView.track.computePixelHeight === 'function') {
                            requiredHeight = self.trackView.track.computePixelHeight(features);
                            if (requiredHeight != self.contentDiv.clientHeight) {
                                self.setContentHeight(requiredHeight);
                            }
                        }

                        buffer = document.createElement('canvas');
                        buffer.width = pixelWidth;
                        buffer.height = self.canvas.height;
                        ctx = buffer.getContext('2d');

                        self.trackView.track.draw({
                            features: features,
                            context: ctx,
                            bpStart: bpStart,
                            bpPerPixel: referenceFrame.bpPerPixel,
                            pixelWidth: buffer.width,
                            pixelHeight: buffer.height,
                            referenceFrame: referenceFrame,
                            viewportWidth: self.$viewport.width()
                        });

                        // TODO: dat - implement this for viewport. Was in trackView .
                        // if (self.trackView.track.paintAxis && self.trackView.controlCanvas.width > 0 && self.trackView.controlCanvas.height > 0) {
                        //
                        //     var buffer2 = document.createElement('canvas');
                        //     buffer2.width = self.trackView.controlCanvas.width;
                        //     buffer2.height = self.trackView.controlCanvas.height;
                        //
                        //     var ctx2 = buffer2.getContext('2d');
                        //
                        //     self.trackView.track.paintAxis(ctx2, buffer2.width, buffer2.height);
                        //
                        //     self.controlCtx.drawImage(buffer2, 0, 0);
                        // }

                        self.tile = new Tile(referenceFrame.chrName, bpStart, bpEnd, referenceFrame.bpPerPixel, buffer);
                        self.paintImage();

                    } else {
                        self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
                    }

                })
                .catch(function (error) {
                    self.loading = false;

                    if (error instanceof igv.AbortLoad) {
                        console.log("Aborted ---");
                    } else {
                        igv.stopSpinnerAtParentElement(self.trackView.trackDiv);
                        igv.presentAlert(error);
                    }
                });
        }

        // TODO: dat - implement this for viewport. Was in trackView .
        // function viewIsReady() {
        //     return self.track && self.browser && self.browser.referenceFrame;
        // }

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

        if (this.scrollbar) {
            this.scrollbar.update();
        }
    };

    igv.Viewport.prototype.paintImage = function () {

        var referenceFrame = igv.browser.kitchenSinkList[ this.locusIndex ].referenceFrame;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.tile) {
            this.xOffset = Math.round(referenceFrame.toPixels(this.tile.startBP - referenceFrame.start));
            this.ctx.drawImage(this.tile.image, this.xOffset, 0);
            this.ctx.save();
            this.ctx.restore();
        }
    };

    igv.Viewport.viewportsWithLocusIndex = function (locusIndex) {

        var list = [];
        _.each(igv.browser.trackViews, function(tv){

            _.each(tv.viewports, function(vp) {

                if (locusIndex === vp.locusIndex) {
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

    TrackScrollbar = function (viewportDiv, contentDiv) {

        var self = this,
            outerScrollDiv = $('<div class="igv-scrollbar-outer-div">')[0],
            innerScrollDiv = $('<div class="igv-scrollbar-inner-div">')[0],
            offY;

        $(outerScrollDiv).append(innerScrollDiv);

        this.viewportDiv = viewportDiv;
        this.contentDiv = contentDiv;
        this.outerScrollDiv = outerScrollDiv;
        this.innerScrollDiv = innerScrollDiv;


        $(this.innerScrollDiv).mousedown(function (event) {
            offY = event.pageY - $(innerScrollDiv).position().top;
            $(window).on("mousemove .igv", null, null, mouseMove);
            $(window).on("mouseup .igv", null, null, mouseUp);
            event.stopPropagation();     // <= prevents start of horizontal track panning);
        });

        $(this.innerScrollDiv).click(function (event) {
            event.stopPropagation();  // "Eat" clicks on the inner div to prevent them bubbling up to outer
        });

        $(this.outerScrollDiv).click(function (event) {
            moveScrollerTo(event.offsetY - $(innerScrollDiv).height() / 2);
            event.stopPropagation();

        });

        function mouseMove(event) {
            moveScrollerTo(event.pageY - offY);
            event.stopPropagation();
        }

        function mouseUp(event) {
            $(window).off("mousemove .igv", null, mouseMove);
            $(window).off("mouseup .igv", null, mouseUp);
        }

        function moveScrollerTo(y) {
            var H = $(outerScrollDiv).height(),
                h = $(innerScrollDiv).height(),
                newTop = Math.min(Math.max(0, y), H - h),
                contentTop = -Math.round(newTop * ($(contentDiv).height() / $(self.viewportDiv).height()));

            $(innerScrollDiv).css("top", newTop + "px");
            $(contentDiv).css("top", contentTop + "px");
        }
    };

    TrackScrollbar.prototype.update = function () {
        var viewportHeight = $(this.viewportDiv).height(),
            contentHeight = $(this.contentDiv).height(),
            newInnerHeight = Math.round((viewportHeight / contentHeight) * viewportHeight);
        if (contentHeight > viewportHeight) {
            $(this.outerScrollDiv).show();
            $(this.innerScrollDiv).height(newInnerHeight);
        }
        else {
            $(this.outerScrollDiv).hide();
        }
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
        this.paintImage();
    };

    return igv;

}) (igv || {});
