/**
 * Created by dat on 9/16/16.
 */



var igv = (function (igv) {

    "use strict";

    var NOT_LOADED_MESSAGE = 'Error loading track data';

    igv.Viewport = function (trackView, $container, genomicState, width) {

        const self = this;

        this.trackView = trackView;
        this.genomicState = genomicState;
        this.browser = trackView.browser;

        // viewport
        this.$viewport = $('<div class="igv-viewport-div">');
        $container.append(this.$viewport);

        // viewport-content
        const $div = $("<div>", {class: 'igv-viewport-content-div'});
        this.$viewport.append($div);
        $div.height(this.$viewport.height());
        this.contentDiv = $div.get(0);

        // viewport canvas
        const $canvas = $('<canvas>');
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

            const rulerSweeper = new igv.RulerSweeper(this);
            trackView.track.rulerSweepers.push(rulerSweeper);
            rulerSweeper.layoutWholeGenome();

            trackView.track.appendMultiPanelCloseButton(this.$viewport, this.genomicState);

            this.$rulerLabel = $('<div class = "igv-viewport-content-ruler-div">');

            this.$rulerLabel.click(function (e) {
                self.browser.selectMultiLocusPanelWithGenomicState(self.genomicState);
            });

            $(this.contentDiv).append(this.$rulerLabel);


        } else {
            addMouseHandlers.call(this);

            const dimen = Math.min(32, this.$viewport.height());
            const $spinnerContainer = $('<div class="igv-viewport-spinner">');
            $spinnerContainer.css({'font-size': dimen + 'px'});

            this.$spinner = igv.createIcon("spinner");
            $spinnerContainer.append(this.$spinner);
            this.$viewport.append($spinnerContainer);
            this.stopSpinner();
            this.popover = new igv.Popover(self.browser.$content);

        }

        if (trackView.track instanceof igv.SequenceTrack) {
            // do nuthin
        } else if (trackView.track instanceof igv.RulerTrack) {
            // do nuthin
        } else {
            self.$zoomInNotice = createZoomInNotice.call(this, $(this.contentDiv));
        }

        if (trackView.track.name && 0 === self.browser.genomicStateList.indexOf(this.genomicState)) {

            this.$trackLabel = $('<div class="igv-track-label">');
            this.$viewport.append(this.$trackLabel);

            igv.setTrackLabel(this.$trackLabel, trackView.track, trackView.track.name);

            if (false === self.browser.trackLabelsVisible) {
                this.$trackLabel.hide();
            }

            this.$trackLabel.click(function (e) {
                let str;

                e.stopPropagation();

                if (typeof trackView.track.description === 'function') {
                    str = trackView.track.description();
                } else {
                    str = trackView.track.name;
                }

                const page = igv.pageCoordinates(e);

                self.popover.presentContent(page.x, page.y, str);

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

        const $notice = $('<div class="zoom-in-notice-container">');
        $parent.append($notice);

        const $e = $('<div>');
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
        const $spinner = this.$spinner;
        if ($spinner) {
            $spinner.addClass("fa5-spin");
            $spinner.show();
        }
    };

    igv.Viewport.prototype.stopSpinner = function () {
        const $spinner = this.$spinner;
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
                    this.tile = undefined;
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
        const self = this;
        const referenceFrame = self.genomicState.referenceFrame;

        if (self.canvas &&
            self.tile &&
            self.tile.chr === referenceFrame.chrName &&
            self.tile.bpPerPixel === referenceFrame.bpPerPixel) {

            const pixelOffset = Math.round((self.tile.startBP - referenceFrame.start) / referenceFrame.bpPerPixel);
            self.canvas.style.left = pixelOffset + "px";
        }
    }

    igv.Viewport.prototype.loadFeatures = function () {

        var self = this;

        const genomicState = self.genomicState;
        const referenceFrame = genomicState.referenceFrame;

        const chr = referenceFrame.chrName;

        // Expand the requested range so we can pan a bit without reloading.  But not beyond chromosome bounds
        const chrLength = this.browser.genome.getChromosome(chr).bpLength;

        const pixelWidth = $(self.contentDiv).width() * 3;
        const bpWidth = pixelWidth * referenceFrame.bpPerPixel;
        const bpStart = Math.floor(Math.max(0, referenceFrame.start - bpWidth / 3));
        const bpEnd = Math.ceil(Math.min(chrLength, bpStart + bpWidth));


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

        var self = this;

        if (!tile) {
            tile = this.tile;
        }
        if (!tile) {
            return;
        }

        const genomicState = this.genomicState;
        const referenceFrame = this.genomicState.referenceFrame;
        const bpStart = tile.startBP;
        const bpEnd = tile.endBP;
        const bpPerPixel = tile.bpPerPixel;
        const features = tile.features;

        const pixelWidth = Math.ceil((bpEnd - bpStart) / bpPerPixel);
        const pixelHeight = self.getContentHeight();
        const devicePixelRatio = window.devicePixelRatio;
        const newCanvas = $('<canvas>').get(0);
        newCanvas.style.width = pixelWidth + "px";
        newCanvas.style.height = pixelHeight + "px";
        newCanvas.width = devicePixelRatio * pixelWidth;
        newCanvas.height = devicePixelRatio * pixelHeight;
        const ctx = newCanvas.getContext("2d");
        ctx.scale(devicePixelRatio, devicePixelRatio);

        const pixelOffset = Math.round((bpStart - referenceFrame.start) / referenceFrame.bpPerPixel);
        newCanvas.style.position = 'absolute';
        newCanvas.style.left = pixelOffset + "px";
        newCanvas.style.top = self.canvas.style.top + "px";


        const drawConfiguration =
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
                viewportContainerWidth: this.browser.viewportContainerWidth()
            };

        ctx.save();

        if (features) {

            drawConfiguration.features = features;

            self.trackView.track.draw(drawConfiguration);

        }

        if (self.browser.roi) {

            const roiPromises = self.browser.roi.map(function (r) {
                return r.getFeatures(referenceFrame.chrName, bpStart, bpEnd)
            });

            const browser = self.browser;

            Promise.all(roiPromises)

                .then(function (roiArray) {
                    for (var i = 0; i < roiArray.length; i++) {
                        drawConfiguration.features = roiArray[i];
                        browser.roi[i].draw(drawConfiguration);
                    }
                })

                .catch(function (error) {
                    console.error(error);
                    self.loading = false;
                    browser.presentAlert("ERROR DRAWING REGIONS OF INTEREST", self.$viewport);
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

        const referenceFrame = this.genomicState.referenceFrame;

        return (
            this.trackView.track.visibilityWindow !== undefined &&
            this.trackView.track.visibilityWindow > 0 &&
            (referenceFrame.bpPerPixel * this.$viewport.width() > this.trackView.track.visibilityWindow)) ||
            (referenceFrame.chrName.toLowerCase() === "all" && !this.trackView.track.supportsWholeGenome());
    }

    function viewIsReady() {
        return this.browser && this.browser.genomicStateList && this.genomicState.referenceFrame;
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

        if (!this.ctx) return;

        const devicePixelRatio = window.devicePixelRatio;
        const w = this.$viewport.width() * devicePixelRatio;
        const h = this.$viewport.height() * devicePixelRatio;
        const x = -$(this.canvas).position().left * devicePixelRatio;
        const y = -$(this.contentDiv).position().top * devicePixelRatio;

        const imageData = this.ctx.getImageData(x, y, w, h);
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        exportCanvas.width = imageData.width;
        exportCanvas.height = imageData.height;
        exportCtx.putImageData(imageData, 0, 0);

        // filename = this.trackView.track.name + ".png";
        const filename = this.$trackLabel.text() + ".png";
        const data = exportCanvas.toDataURL("image/png");
        const a = document.createElement('a');
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
        const self = this;

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
        // Null out all properties -- this should not be neccessary, but just in case there is a
        // reference to self somewhere we want to free memory.
        Object.keys(this).forEach(function (key, i, list) {
            self[key] = undefined;
        })
    };

    igv.Viewport.prototype.getCachedFeatures = function () {
        return this.tile ? this.tile.features : [];
    };

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

        const self = this;
        const browser = this.browser;

        let lastMouseX;
        let mouseDownX;
        let popupTimerID;

        let lastClickTime = 0;

        this.$viewport.on("contextmenu", function (e) {

            // Ignore if we are doing a drag.  This can happen with touch events.
            if (self.browser.isDragging) {
                return false;
            }
            const clickState = createClickState(e, self);

            if (undefined === clickState) {
                return false;
            }


            e.preventDefault();

            // Track specific items
            let menuItems = [];
            if (typeof self.trackView.track.contextMenuItemList === "function") {
                menuItems = self.trackView.track.contextMenuItemList(clickState);
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
            browser.mouseDownOnViewport(e, self);

        });

        this.$viewport.on('touchstart', function (e) {
            browser.mouseDownOnViewport(e, self);
        });

        /**
         * Mouse is released.  Ignore if this is a context menu click, or the end of a drag action.   If neither of
         * those, it is a click.
         */
        this.$viewport.on('mouseup', handleMouseUp);

        function handleMouseUp(e) {

            // Any mouse up cancels drag and scrolling
            if (self.browser.isDragging || self.browser.isScrolling) {
                self.browser.cancelDrag();
                e.preventDefault();
                e.stopPropagation();
                return;
            }


            self.browser.cancelDrag();

            if (3 === e.which || e.ctrlKey) {
                return;
            }

            // Close any currently open popups
            $('.igv-popover').hide();

            // Treat as a mouse click, its either a single or double click.
            // Handle here and stop propogation / default
            e.preventDefault();
            e.stopPropagation();

            const mouseX = igv.translateMouseCoordinates(e, self.$viewport.get(0)).x;
            const mouseXCanvas = igv.translateMouseCoordinates(e, self.canvas).x;
            const referenceFrame = self.genomicState.referenceFrame;
            const xBP = Math.floor((referenceFrame.start) + referenceFrame.toBP(mouseXCanvas));

            const time = Date.now();

            if (time - lastClickTime < browser.constants.doubleClickDelay) {

                // double-click
                if (popupTimerID) {
                    window.clearTimeout(popupTimerID);
                    popupTimerID = undefined;
                }

                const centerBP = Math.round(referenceFrame.start + referenceFrame.toBP(mouseX));

                let string;

                if ('all' === referenceFrame.chrName.toLowerCase()) {

                    const chr = browser.genome.getChromosomeCoordinate(centerBP).chr;

                    if (1 === browser.genomicStateList.length) {
                        string = chr;
                    } else {
                        let loci = browser.genomicStateList.map(function (g) {
                            return g.locusSearchString;
                        });
                        loci[browser.genomicStateList.indexOf(self.genomicState)] = chr;
                        string = loci.join(' ');
                    }

                    browser.search(string);

                } else {
                    browser.zoomInWithViewport(self, centerBP);
                }


            } else {
                // single-click

                if (e.shiftKey && typeof self.trackView.track.shiftClick === "function") {

                    self.trackView.track.shiftClick(xBP, e);

                } else if (typeof self.trackView.track.popupData === "function") {

                    popupTimerID = setTimeout(function () {

                            var content = getPopupContent(e, self);
                            if (content) {
                                self.popover.presentTrackPopup(e, content);
                            }
                            clearTimeout(popupTimerID);
                            popupTimerID = undefined;
                        },
                        browser.constants.doubleClickDelay);
                }
            }

            lastClickTime = time;
        }

        function createClickState(e, viewport) {

            const referenceFrame = viewport.genomicState.referenceFrame;
            const viewportCoords = igv.translateMouseCoordinates(e, viewport.contentDiv);
            const genomicLocation = ((referenceFrame.start) + referenceFrame.toBP(viewportCoords.x));

            if (undefined === genomicLocation || null === viewport.tile) {
                return undefined;
            }

            return {
                viewport: viewport,
                referenceFrame: referenceFrame,
                genomicLocation: genomicLocation,
                x: viewportCoords.x,
                y: viewportCoords.y
            }

        }

        /**
         * Return markup for popup info window
         *
         * @param e
         * @param viewport
         * @returns {*}
         */
        function getPopupContent(e, viewport) {

            const clickState = createClickState(e, viewport);

            if (undefined === clickState) {
                return;
            }

            let track = viewport.trackView.track;
            const dataList = track.popupData(clickState);

            const popupClickHandlerResult = browser.fireEvent('trackclick', [track, dataList]);

            let content;
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
