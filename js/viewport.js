/**
 * Created by dat on 9/16/16.
 */
var igv = (function (igv) {

    var NOT_LOADED_MESSAGE = 'Error loading track data';

    igv.Viewport = function (trackView, $container, genomicState, width) {

        var self = this,
            $spinnerContainer,
            dimen,
            $div,
            $canvas,
            rulerSweeper;

        this.trackView = trackView;
        this.genomicState = genomicState;

        // viewport
        this.$viewport = $('<div class="igv-viewport-div">');
        $container.append(this.$viewport);

        // viewport-content
        $div = $("<div>", {class: 'igv-viewport-content-div'});
        this.$viewport.append($div);
        $div.height(this.$viewport.height());
        this.contentDiv = $div.get(0);

        // viewport canvas
        $canvas = $('<canvas>');
        $(this.contentDiv).append($canvas);
        this.canvas = $canvas.get(0);
        this.ctx = this.canvas.getContext("2d");

        this.setWidth(width);


        if (trackView.track instanceof igv.SequenceTrack) {
            this.$viewport.addClass('igv-viewport-sequence');
        }

        if (trackView.track instanceof igv.RulerTrack) {

            this.$wholeGenomeContainer = $('<div>', {class: 'igv-whole-genome-container'});
            $(this.contentDiv).append(this.$wholeGenomeContainer);

            rulerSweeper = new igv.RulerSweeper(this);
            trackView.track.rulerSweepers.push(rulerSweeper);
            rulerSweeper.layoutWholeGenome();

            trackView.track.appendMultiPanelCloseButton(this.$viewport, this.genomicState);

            this.$rulerLabel = $('<div class = "igv-viewport-content-ruler-div">');

            this.$rulerLabel.click(function (e) {
                igv.browser.selectMultiLocusPanelWithGenomicState(self.genomicState);
            });

            $(this.contentDiv).append(this.$rulerLabel);


        } else {
            addMouseHandlers.call(this);

            dimen = Math.min(32, this.$viewport.height());
            $spinnerContainer = $('<div class="igv-viewport-spinner">');
            $spinnerContainer.css({'font-size': dimen + 'px'});

            this.$spinner = igv.createIcon("spinner");
            $spinnerContainer.append(this.$spinner);
            this.$viewport.append($spinnerContainer);
            this.stopSpinner();
            this.popover = new igv.Popover(igv.browser.$content);

        }

        if (trackView.track instanceof igv.SequenceTrack) {
            // do nuthin
        } else if (trackView.track instanceof igv.RulerTrack) {
            // do nuthin
        } else {
            self.$zoomInNotice = createZoomInNotice.call(this, $(this.contentDiv));
        }

        if (trackView.track.name && 0 === igv.browser.genomicStateList.indexOf(this.genomicState)) {

            this.$trackLabel = $('<div class="igv-track-label">');
            this.$viewport.append(this.$trackLabel);

            igv.setTrackLabel(this.$trackLabel, trackView.track, trackView.track.name);

            if (false === igv.browser.trackLabelsVisible) {
                this.$trackLabel.hide();
            }

            this.$trackLabel.click(function (e) {
                var str;

                e.stopPropagation();

                if (typeof trackView.track.description === 'function') {
                    str = trackView.track.description();
                } else {
                    str = trackView.track.name;
                }
                self.popover.presentContent(e.pageX, e.pageY, str);

            });
            this.$trackLabel.mousedown(function (e) {
                // Prevent bubbling
                e.stopPropagation();
            });
            this.$trackLabel.mouseup(function (e) {
                // Prevent  bubbling
                e.stopPropagation();
            });
            this.$trackLabel.mousemove(function (e) {
                // Prevent  bubbling
                e.stopPropagation();
            });


        }

    };

    function createZoomInNotice($parent) {
        var $e,
            $notice;

        $notice = $('<div class="zoom-in-notice-container">');
        $parent.append($notice);

        $e = $('<div>');
        $notice.append($e);
        $e.text('Zoom in to see features');

        $notice.hide();

        return $notice;
    }

    igv.Viewport.prototype.setWidth = function (width) {
        this.$viewport.outerWidth(width);
        this.canvas.style.width = (this.$viewport.width() + 'px');
        this.canvas.setAttribute('width', this.$viewport.width());
    };

    //.fa5-spin {
    //    -webkit-animation: fa5-spin 2s infinite linear;
    //    animation: fa5-spin 2s infinite linear; }

    igv.Viewport.prototype.startSpinner = function () {
        var $spinner = this.$spinner;
        if ($spinner) {
            $spinner.addClass("fa5-spin");
            $spinner.show();
        }
    };

    igv.Viewport.prototype.stopSpinner = function () {
        var $spinner = this.$spinner;
        if ($spinner) {
            $spinner.hide();
            $spinner.removeClass("fa5-spin");
        }
    };

    igv.Viewport.prototype.showMessage = function (message) {
        if (!this.messageDiv) {
            this.messageDiv = document.createElement('div')
            this.messageDiv.className = 'igv-viewport-message'
            this.contentDiv.append(this.messageDiv)
        }
        this.messageDiv.textContent = message
        this.messageDiv.style.display = 'inline-block'
    }

    igv.Viewport.prototype.hideMessage = function (message) {
        if (this.messageDiv)
            this.messageDiv.style.display = 'none'
    }


    igv.Viewport.prototype.checkZoomIn = function () {

        if (!(viewIsReady.call(this))) {
            return false;
        }

        if (this.$zoomInNotice) {
            if (showZoomInNotice.call(this)) {
                if (this.canvas) {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                }
                this.$zoomInNotice.show();
                return false;
            } else {
                this.$zoomInNotice.hide();
                return true;
            }
        }

        return true;
    }

    igv.Viewport.prototype.shift = function () {
        var self = this;
        var referenceFrame = self.genomicState.referenceFrame;
        if (self.canvas && self.tile && self.tile.chr === referenceFrame.chrName && self.tile.bpPerPixel === referenceFrame.bpPerPixel) {
            var pixelOffset = Math.round((self.tile.startBP - referenceFrame.start) / referenceFrame.bpPerPixel);
            self.canvas.style.left = pixelOffset + "px";
        }
    }

    igv.Viewport.prototype.loadFeatures = function () {

        var self = this,
            pixelWidth,
            bpWidth,
            bpStart,
            bpEnd,
            genomicState = self.genomicState,
            referenceFrame = genomicState.referenceFrame,
            chr;

        chr = referenceFrame.chrName;

        // Expand the requested range so we can pan a bit without reloading.  But not beyond chromosome bounds
        var chrLength = igv.browser.genome.getChromosome(chr).bpLength;

        pixelWidth = $(self.contentDiv).width() * 3;
        bpWidth = pixelWidth * referenceFrame.bpPerPixel;
        bpStart = Math.floor(Math.max(0, referenceFrame.start - bpWidth / 3));
        bpEnd = Math.ceil(Math.min(chrLength, bpStart + bpWidth));


        if (self.loading && self.loading.start === bpStart && self.loading.end === bpEnd) {
            return Promise.resolve(undefined);
        }

        self.loading = {start: bpStart, end: bpEnd};

        self.startSpinner();

        // console.log('get features');
        return getFeatures.call(self, referenceFrame.chrName, bpStart, bpEnd, referenceFrame.bpPerPixel, self)

            .then(function (features) {
                self.hideMessage();
                self.tile = new Tile(referenceFrame.chrName, bpStart, bpEnd, referenceFrame.bpPerPixel, features);
                self.loading = false;
                self.stopSpinner();
                return self.tile;
            })

            .catch(function (error) {
                self.showMessage(NOT_LOADED_MESSAGE);
                self.loading = false;
                self.stopSpinner();
                throw error;
            })
    }

    /**
     *
     * @param force
     */
    igv.Viewport.prototype.repaint = function (tile) {

        var self = this,
            pixelWidth, bpStart, bpEnd, bpPerPixel, features, genomicState, referenceFrame, drawConfiguration,
            newCanvas, ctx, pixelHeight, devicePixelRatio, pixelOffset;

        if (!tile) tile = this.tile;
        if (!tile) return;

        genomicState = this.genomicState;
        referenceFrame = this.genomicState.referenceFrame;
        bpStart = tile.startBP;
        bpEnd = tile.endBP;
        bpPerPixel = tile.bpPerPixel;
        features = tile.features;

        pixelWidth = Math.ceil((bpEnd - bpStart) / bpPerPixel);
        pixelHeight = self.getContentHeight();
        devicePixelRatio = window.devicePixelRatio;
        newCanvas = $('<canvas>').get(0);
        newCanvas.style.width = pixelWidth + "px";
        newCanvas.style.height = pixelHeight + "px";
        newCanvas.width = devicePixelRatio * pixelWidth;
        newCanvas.height = devicePixelRatio * pixelHeight;
        ctx = newCanvas.getContext("2d");
        ctx.scale(devicePixelRatio, devicePixelRatio);

        pixelOffset = Math.round((bpStart - referenceFrame.start) / referenceFrame.bpPerPixel);
        newCanvas.style.position = 'absolute';
        newCanvas.style.left = pixelOffset + "px";
        newCanvas.style.top = self.canvas.style.top + "px";


        drawConfiguration =
        {
            features: features,
            context: ctx,
            pixelWidth: pixelWidth,
            pixelHeight: pixelHeight,
            bpStart: bpStart,
            bpEnd: bpEnd,
            bpPerPixel: bpPerPixel,
            referenceFrame: referenceFrame,
            genomicState: genomicState,
            selection: self.selection,
            viewport: self,
            viewportWidth: self.$viewport.width(),
            viewportContainerX: referenceFrame.toPixels(referenceFrame.start - bpStart),
            viewportContainerWidth: igv.browser.viewportContainerWidth()
        };

        ctx.save();

        if (features) {

            drawConfiguration.features = features;

            self.trackView.track.draw(drawConfiguration);

        }

        if (igv.browser.roi) {
            var roiPromises = igv.browser.roi.map(function (r) {
                return r.getFeatures(referenceFrame.chrName, bpStart, bpEnd)
            });

            Promise.all(roiPromises)
                .then(function (roiArray) {
                    for (var i = 0; i < roiArray.length; i++) {
                        drawConfiguration.features = roiArray[i];
                        igv.browser.roi[i].draw(drawConfiguration);
                    }
                })
                .catch(function (error) {
                    console.error(error);
                    self.loading = false;
                    alert("ERROR DRAWING REGIONS OF INTEREST");
                })
        }

        ctx.restore();

        if (self.canvas) {
            $(self.canvas).remove();
        }

        self.canvas = newCanvas;
        self.ctx = ctx;
        $(self.contentDiv).append(newCanvas);

    };


    function showZoomInNotice() {
        var referenceFrame = this.genomicState.referenceFrame;
        return (this.trackView.track.visibilityWindow !== undefined && this.trackView.track.visibilityWindow > 0 &&
            (referenceFrame.bpPerPixel * this.$viewport.width() > this.trackView.track.visibilityWindow)) ||
            (referenceFrame.chrName.toLowerCase() === "all" && !this.trackView.track.supportsWholeGenome);
    }

    function viewIsReady() {
        return igv.browser && igv.browser.genomicStateList && this.genomicState.referenceFrame;
    }


    igv.Viewport.prototype.setContentHeight = function (contentHeight) {
        // Maximum height of a canvas is ~32,000 pixels on Chrome, possibly smaller on other platforms
        contentHeight = Math.min(contentHeight, 32000);

        $(this.contentDiv).height(contentHeight);

        if (this.tile) this.tile.invalidate = true;
    };

    igv.Viewport.prototype.getContentHeight = function () {
        return $(this.contentDiv).height();
    };

    igv.Viewport.prototype.isLoading = function () {
        return this.loading;
    };

    igv.Viewport.prototype.saveImage = function () {

        var data, a, filename, w, h, x, y, imageData, exportCanvas, exportCtx;

        if (!this.ctx) return;

        var devicePixelRatio = window.devicePixelRatio;
        w = this.$viewport.width() * devicePixelRatio;
        h = this.$viewport.height() * devicePixelRatio;
        x = -$(this.canvas).position().left * devicePixelRatio;
        y = -$(this.contentDiv).position().top * devicePixelRatio;

        imageData = this.ctx.getImageData(x, y, w, h);
        exportCanvas = document.createElement('canvas');
        exportCtx = exportCanvas.getContext('2d');
        exportCanvas.width = imageData.width;
        exportCanvas.height = imageData.height;
        exportCtx.putImageData(imageData, 0, 0);

        // filename = this.trackView.track.name + ".png";
        filename = this.$trackLabel.text() + ".png";
        data = exportCanvas.toDataURL("image/png");
        a = document.createElement('a');
        a.href = data;
        a.download = filename || "image.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    /**
     * Called when the associated track is removed.  Do any needed cleanup here.
     */
    igv.Viewport.prototype.dispose = function () {

        this.$viewport.off();
        this.$viewport.empty();
        $(this.contentDiv).off();
        $(this.contentDiv).empty();
        $(this.canvas).off();
        $(this.canvas).empty();
        if (this.popover) {
            $(this.popover).off();
            $(this.popover).empty();
        }
        Object.keys(this).forEach(function (key) {
            this[key] = undefined;
        })
    }
    
    igv.Viewport.prototype.getCachedFeatures = function () {
        return this.tile ? this.tile.features : [];
    }

    var Tile = function (chr, tileStart, tileEnd, bpPerPixel, features) {
        this.chr = chr;
        this.startBP = tileStart;
        this.endBP = tileEnd;
        this.bpPerPixel = bpPerPixel;
        this.features = features;
    };

    Tile.prototype.containsRange = function (chr, start, end, bpPerPixel) {
        return this.bpPerPixel === bpPerPixel && start >= this.startBP && end <= this.endBP && chr === this.chr;
    };

    Tile.prototype.overlapsRange = function (chr, start, end) {
        return this.chr === chr && end >= this.startBP && start <= this.endBP;
    };

    function addMouseHandlers() {

        var self = this,
            lastMouseX,
            mouseDownX,
            lastClickTime,
            popupTimer;

        lastClickTime = 0;

        this.$viewport.on("contextmenu", function (e) {

            var trackLocationState,
                menuItems;

            trackLocationState = createTrackLocationState(e, self);

            e.preventDefault();

            if (undefined === trackLocationState) {
                return
            }

            var config =
            {
                viewport: self,
                genomicState: self.genomicState,
                genomicLocation: trackLocationState.genomicLocation,
                x: trackLocationState.x,
                y: trackLocationState.y
            };

            // Track specific items
            menuItems = [];
            if (typeof self.trackView.track.contextMenuItemList === "function") {
                menuItems = self.trackView.track.contextMenuItemList(config);
            }

            // Add items common to all tracks
            if (menuItems.length > 0) {
                menuItems.push({label: $('<HR>')});
            }
            menuItems.push(
                {
                    label: 'Save Image',
                    click: function () {
                        self.saveImage();
                    }
                });

            self.popover.presentTrackContextMenu(e, menuItems);

        });


        /**
         * Mouse click down,  notify browser for potential drag (pan), and record position for potential click.
         */
        this.$viewport.on('mousedown', function (e) {
            mouseDownX = igv.translateMouseCoordinates(e, self.$viewport.get(0)).x;
            igv.browser.mouseDownOnViewport(e, self);

        });


        /**
         * Mouse is released.  Ignore if this is a context menu click, or the end of a drag action.   If neither of
         * those, it is a click.
         */
        this.$viewport.on('mouseup', function (e) {

            var mouseX,
                mouseXCanvas,
                referenceFrame,
                xBP,
                time,
                centerBP,
                string,
                loci,
                chr;

            if (3 === e.which || e.ctrlKey || self.isDragging || mouseDownX === undefined) {
                return;
            }

            // This is a mouse click.  Handle it here, stop bubbling.
            e.preventDefault();

            mouseX = igv.translateMouseCoordinates(e, self.$viewport.get(0)).x;
            mouseXCanvas = igv.translateMouseCoordinates(e, self.canvas).x;
            referenceFrame = self.genomicState.referenceFrame;
            xBP = Math.floor((referenceFrame.start) + referenceFrame.toBP(mouseXCanvas));

            time = Date.now();

            if (time - lastClickTime < igv.browser.constants.doubleClickDelay) {

                // double-click
                if (popupTimer) {
                    window.clearTimeout(popupTimer);
                    popupTimer = undefined;
                }

                centerBP = Math.round(referenceFrame.start + referenceFrame.toBP(mouseX));
                if ('all' === referenceFrame.chrName.toLowerCase()) {

                    chr = igv.browser.genome.getChromosomeCoordinate(centerBP).chr;

                    if (1 === igv.browser.genomicStateList.length) {
                        string = chr;
                    } else {
                        loci = igv.browser.genomicStateList.map(function (g) {
                            return g.locusSearchString;
                        });
                        loci[igv.browser.genomicStateList.indexOf(self.genomicState)] = chr;
                        string = loci.join(' ');
                    }

                    igv.browser.search(string);

                } else {
                    igv.browser.zoomInWithViewport(self, centerBP);
                }


            } else {

                if (e.shiftKey && typeof self.trackView.track.shiftClick === "function") {
                    self.trackView.track.shiftClick(xBP, e);
                } else if (typeof self.trackView.track.popupData === "function") {

                    popupTimer = window.setTimeout(function () {

                            var content = getPopupContent(e, self);
                            if (content) {
                                self.popover.presentTrackPopup(e, content);
                            }
                            popupTimer = undefined;
                        },
                        igv.browser.constants.doubleClickDelay);
                }
            }

            mouseDownX = lastMouseX = undefined;
            lastClickTime = time;
        });

        /**
         * Mouse has moved out of the viewport.  Cancel pending click.
         */
        this.$viewport.on('mouseout', function (e) {
            mouseDownX = lastMouseX = lastClickTime = undefined;
        });


        function createTrackLocationState(e, viewport) {

            var referenceFrame = viewport.genomicState.referenceFrame,
                genomicLocation,
                viewportCoords,
                xOrigin;

            viewportCoords = igv.translateMouseCoordinates(e, viewport.$viewport);
            genomicLocation = ((referenceFrame.start) + referenceFrame.toBP(viewportCoords.x));  //Math.floor

            if (undefined === genomicLocation || null === viewport.tile) {
                return undefined;
            }

            return {genomicLocation: genomicLocation, x: viewportCoords.x, y: viewportCoords.y}

        }

        /**
         * Return markup for popup info window
         *
         * @param e
         * @param viewport
         * @returns {*}
         */
        function getPopupContent(e, viewport) {

            var track = viewport.trackView.track,
                trackLocationState,
                dataList,
                popupClickHandlerResult,
                content,
                config;

            trackLocationState = createTrackLocationState(e, viewport);
            if (undefined === trackLocationState) {
                return;
            }

            config =
            {
                viewport: viewport,
                genomicLocation: trackLocationState.genomicLocation,
                x: trackLocationState.x,
                y: trackLocationState.y
            };
            dataList = track.popupData(config);

            popupClickHandlerResult = igv.browser.fireEvent('trackclick', [track, dataList]);

            if (undefined === popupClickHandlerResult) {
                if (dataList && dataList.length > 0) {
                    content = formatPopoverText(dataList);
                }

            } else if (typeof popupClickHandlerResult === 'string') {
                content = popupClickHandlerResult;
            }

            return content;
        }

        /**
         * Format markup for popover text from an array of name value pairs [{name, value}]
         */
        function formatPopoverText(nameValueArray) {

            var markup = "<table class=\"igv-popover-table\">";

            nameValueArray.forEach(function (nameValue) {

                if (nameValue.name) {
                    markup += "<tr><td class=\"igv-popover-td\">" + "<div class=\"igv-popover-name-value\">" + "<span class=\"igv-popover-name\">" + nameValue.name + "</span>" + "<span class=\"igv-popover-value\">" + nameValue.value + "</span>" + "</div>" + "</td></tr>";
                } else {
                    // not a name/value pair
                    markup += "<tr><td>" + nameValue.toString() + "</td></tr>";
                }
            });

            markup += "</table>";
            return markup;


        }
    }

    function getFeatures(chr, start, end, bpPerPixel) {

        var self = this,
            track;

        track = self.trackView.track;

        if (self.tile && self.tile.containsRange(chr, start, end, bpPerPixel)) {
            return Promise.resolve(self.tile.features);
        }
        else if (typeof track.getFeatures === "function") {

            return track.getFeatures(chr, start, end, bpPerPixel)

                .then(function (features) {

                    self.cachedFeatures = features;      // TODO -- associate with "tile"

                    self.checkContentHeight();

                    return features;

                })
        }
        else {
            return Promise.resolve(undefined);
        }
    }

    igv.Viewport.prototype.checkContentHeight = function () {

        let track = this.trackView.track;

        if (typeof track.computePixelHeight === 'function') {
            let features = this.cachedFeatures;

            if (features) {
                let requiredContentHeight = track.computePixelHeight(features);
                let currentContentHeight = $(this.contentDiv).height();
                if (requiredContentHeight !== currentContentHeight) {
                    this.setContentHeight(requiredContentHeight);
                }
            }
        }
    }

    return igv;

})
(igv || {});
