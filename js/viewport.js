/**
 * Created by dat on 9/16/16.
 */



var igv = (function (igv) {

    "use strict";

    const NOT_LOADED_MESSAGE = 'Error loading track data';
    const MAX_PIXEL_HEIGHT = 32000;
    const MAX_PIXEL_COUNT = 200000000;

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


        if ("sequence" === trackView.track.type) {
            this.$viewport.addClass('igv-viewport-sequence');
        }

        if ('ruler' === trackView.track.type) {

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

            const dimen = 32;
            const $spinnerContainer = $('<div class="igv-viewport-spinner">');
            $spinnerContainer.css({'font-size': dimen + 'px'});

            this.$spinner = igv.createIcon("spinner");
            $spinnerContainer.append(this.$spinner);
            this.$viewport.append($spinnerContainer);
            this.stopSpinner();
            this.popover = new igv.Popover(self.browser.$content);

        }

        if ("sequence" === trackView.track.type) {
            // do nuthin
        } else if ('ruler' === trackView.track.type) {
            // do nuthin
        } else {
            self.$zoomInNotice = createZoomInNotice.call(this, $(this.contentDiv));
        }

        if (trackView.track.name) {

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
     * @param tile - the tile is created whenever features are loaded.  It contains the genomic state
     * representing the features,as well as the features.  The object evolved, at one time it was an image tile.
     * Should be renamed.
     */
    igv.Viewport.prototype.repaint = function (tile) {

        var self = this;

        //
        if (!tile) {
            tile = this.tile;
        }
        if (!tile) {
            return;
        }

        const genomicState = this.genomicState;
        const referenceFrame = genomicState.referenceFrame;
        const bpPerPixel = tile.bpPerPixel;
        const features = tile.features;
        const bpStart = tile.startBP;
        const bpEnd = tile.endBP;
        let pixelWidth = Math.ceil((bpEnd - bpStart) / bpPerPixel);
        let pixelHeight = self.getContentHeight();
        if (pixelWidth == 0 || pixelHeight === 0) {
            if (self.canvas) {
                $(self.canvas).remove();
            }
            return;
        }

        // Set limits on canvas size.  See https://github.com/igvteam/igv.js/issues/792
        const devicePixelRatio = (this.trackView.track.supportHiDPI === false) ? 1 : window.devicePixelRatio;
        const origPixelHeight = pixelHeight;
        pixelHeight = Math.min(Math.floor(MAX_PIXEL_COUNT / (pixelWidth * devicePixelRatio)), pixelHeight);
        pixelHeight = Math.min(Math.floor(MAX_PIXEL_HEIGHT) / (devicePixelRatio * devicePixelRatio), pixelHeight);
        if(pixelHeight < origPixelHeight) {
            console.error("Maximum pixel height exceeded for track " + this.trackView.track.name);
        }

        console.log(pixelHeight);

        const drawConfiguration =
            {
                features: features,
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
        drawConfiguration.context = ctx;

        ctx.save();

        draw.call(this, drawConfiguration, features);

        ctx.restore();

        if (self.canvas) {
            $(self.canvas).remove();
        }

        self.canvas = newCanvas;
        self.ctx = ctx;
        $(self.contentDiv).append(newCanvas);


    };

    /**
     *
     * @param tile - the tile is created whenever features are loaded.  It contains the genomic state
     * representing the features,as well as the features.  The object evolved, at one time it was an image tile.
     * Should be renamed.
     */
    igv.Viewport.prototype.toSVG = function (tile) {

        const genomicState = this.genomicState;
        const referenceFrame = genomicState.referenceFrame;
        const bpPerPixel = tile.bpPerPixel;
        const features = tile.features;
        const pixelWidth = this.$viewport.width();
        const pixelHeight = this.$viewport.height();
        const bpStart = referenceFrame.start;
        const bpEnd = referenceFrame.start + pixelWidth * referenceFrame.bpPerPixel;

        const ctx = new C2S(
            {
                // svg
                width: pixelWidth,
                height: pixelHeight,
                viewbox:
                    {
                        x: 0,
                        y: -$(this.contentDiv).position().top,
                        width: pixelWidth,
                        height: pixelHeight
                    }

            });

        const drawConfiguration =
            {
                viewport: this,
                context: ctx,
                pixelWidth: pixelWidth,
                pixelHeight: pixelHeight,
                bpStart: bpStart,
                bpEnd: bpEnd,
                bpPerPixel: bpPerPixel,
                referenceFrame: referenceFrame,
                genomicState: this.genomicState,
                selection: this.selection,
                viewportWidth: pixelWidth,
                viewportContainerX: 0,
                viewportContainerWidth: this.browser.viewportContainerWidth()
            };

        draw.call(this, drawConfiguration, features);

        return ctx.getSerializedSvg(true);

    };

    function draw(drawConfiguration, features) {


        if (features) {
            drawConfiguration.features = features;
            this.trackView.track.draw(drawConfiguration);
        }

        const self = this;
        const browser = this.browser;
        if (browser.roi) {

            const roiPromises = browser.roi.map(function (r) {
                return r.getFeatures(drawConfiguration.referenceFrame.chrName, drawConfiguration.bpStart, drawConfiguration.bpEnd);
            });


            Promise.all(roiPromises)

                .then(function (roiArray) {
                    for (let roi of roiArray) {
                        drawConfiguration.features = roi;
                        roi.draw(drawConfiguration);
                    }
                })
                .catch(function (error) {
                    console.error(error);
                    self.loading = false;
                    browser.presentAlert("ERROR DRAWING REGIONS OF INTEREST", self.$viewport);
                })
        }
    }


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
        const filename = (this.$trackLabel.text() ? this.$trackLabel.text() : "image") + ".png";
        const data = exportCanvas.toDataURL("image/png");
        igv.download(filename, data);
    };

    igv.Viewport.prototype.renderSVGContext = function (context, offset) {

        const yScrollDelta = $(this.contentDiv).position().top;
        const viewportBBox = this.$viewport.get(0).getBoundingClientRect();


        let str = this.trackView.track.name || this.trackView.track.id;
        str = str.replace(/\W/g, '');

        const index = this.browser.genomicStateList.indexOf(this.genomicState);
        const id = str.toLowerCase() + '_genomic_index_' + index;

        // If present, paint axis canvas. Only in first multi-locus panel

        if (0 === index && typeof this.trackView.track.paintAxis === 'function') {

            const w = $(this.trackView.controlCanvas).width();
            const h = $(this.trackView.controlCanvas).height();

            context.addTrackGroupWithTranslationAndClipRect((id + '_axis'), offset.deltaX - w, offset.deltaY, w, h, 0);

            context.save();
            this.trackView.track.paintAxis(context, w, h);
            context.restore();
        }

        const dx = offset.deltaX + (index * context.multiLocusGap);
        const dy = offset.deltaY + yScrollDelta;
        let group = context.addTrackGroupWithTranslationAndClipRect(id, dx, dy, viewportBBox.width, viewportBBox.height, -yScrollDelta);

        if ('ruler' === this.trackView.track.type && igv.isWholeGenomeView(this.genomicState.referenceFrame)) {
            drawWholeGenomeRuler.call(this, context, group);
        } else {

            const width = this.$viewport.width();
            const height = this.$viewport.height();

            let referenceFrame = this.genomicState.referenceFrame;

            context.save();

            const drawConfig =
                {
                    context: context,

                    viewport: this,

                    referenceFrame: referenceFrame,

                    genomicState: this.genomicState,

                    pixelWidth: width,
                    pixelHeight: height,

                    viewportWidth: width,

                    viewportContainerX: 0,
                    viewportContainerWidth: this.browser.viewportContainerWidth(),

                    bpStart: referenceFrame.start,
                    bpEnd: referenceFrame.start + width * referenceFrame.bpPerPixel,

                    bpPerPixel: referenceFrame.bpPerPixel,

                    selection: this.selection
                };

            const features = this.tile ? this.tile.features : [];

            draw.call(this, drawConfig, features);

            context.restore();

        }


    };

    function drawWholeGenomeRuler(svgContext, group) {

        const index = this.browser.genomicStateList.indexOf(this.genomicState);
        const rulerSweeper = this.trackView.track.rulerSweepers[index];

        let dx;
        let dy;
        let $selection = rulerSweeper.viewport.$wholeGenomeContainer.find('div');
        $selection.each(function (i) {
            const domRect = $(this).get(0).getBoundingClientRect();

            if (0 === i) {
                dx = domRect.x;
                dy = domRect.y;
            }

            let x = domRect.x - dx;
            let y = domRect.y - dy;
            let w = domRect.width;
            let h = domRect.height;

            let stroke_dash_array;
            if (i === $selection.length - 1) {
                stroke_dash_array = '0 ' + w + ' 0 ' + h + ' 0 ' + w + ' 0 ' + h;
            } else {
                stroke_dash_array = '0 ' + w + ' ' + h + ' ' + w + ' 0 ' + h;
            }

            const stroke_width = 1;
            let rect_settings =
                {
                    x: x,
                    width: w,
                    y: y,
                    height: h,

                    // fill: igv.Color.randomRGB(200, 255),
                    fill: 'white',

                    'stroke-width': stroke_width,
                    'stroke': 'black',
                    'stroke-dasharray': stroke_dash_array
                };

            let rect = svgContext.__createElement('rect', rect_settings, true);
            group.appendChild(rect);

            let text_settings =
                {
                    "font-family": 'sans-serif',
                    "font-size": '10px',
                    "font-style": 'normal',
                    "font-weight": 'normal',
                    "text-anchor": 'middle',
                    "dominant-baseline": 'middle',
                    x: x + w / 2,
                    y: y + h / 2,
                    fill: 'grey'
                };

            let text = svgContext.__createElement('text', text_settings, true);
            group.appendChild(text);

            let str = $(this).find('span').text();
            text.appendChild(svgContext.__document.createTextNode(str));

        });

    }

    igv.Viewport.prototype.saveSVG = function () {
        const str = this.$trackLabel ? this.$trackLabel.text() : this.trackView.track.id;
        const filename = str + ".svg";
        const svg = this.toSVG(this.tile);
        const data = URL.createObjectURL(new Blob([svg], {
            type: "application/octet-stream"
        }));
        igv.download(filename, data);
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
        let mouseDownCoords;

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
                    label: 'Save Image (PNG)',
                    click: function () {
                        self.saveImage();
                    }
                });

            menuItems.push(
                {
                    label: 'Save Image (SVG)',
                    click: function () {
                        self.saveSVG();
                    }
                });

            self.popover.presentTrackContextMenu(e, menuItems);

        });


        /**
         * Mouse click down,  notify browser for potential drag (pan), and record position for potential click.
         */
        this.$viewport.on('mousedown', function (e) {
            self.enableClick = true;
            browser.mouseDownOnViewport(e, self);
            mouseDownCoords = igv.pageCoordinates(e);
        });

        this.$viewport.on('touchstart', function (e) {
            self.enableClick = true;
            browser.mouseDownOnViewport(e, self);
            mouseDownCoords = igv.pageCoordinates(e);
        });

        /**
         * Mouse is released.  Ignore if this is a context menu click, or the end of a drag action.   If neither of
         * those, it is a click.
         */
        this.$viewport.on('mouseup', handleMouseUp);

        this.$viewport.on('touchend', handleMouseUp);

        this.$viewport.on('click', function (e) {
            if (self.enableClick) {
                handleClick(e);
            }
        });

        function handleMouseUp(e) {


            // Any mouse up cancels drag and scrolling
            if (self.browser.isDragging || self.browser.isScrolling) {
                self.browser.cancelTrackPan();
                e.preventDefault();
                e.stopPropagation();

                self.enableClick = false;   // Until next mouse down

                return;
            }

            self.browser.cancelTrackPan();
            self.browser.endTrackDrag();
        }

        function handleClick(e) {

            if (3 === e.which || e.ctrlKey) {
                return;
            }

            // Close any currently open popups
            $('.igv-popover').hide();


            if (browser.isDragging || browser.isScrolling) {
                return;
            }

            // // Interpret mouseDown + mouseUp < 5 pixels as a click.
            // if(!mouseDownCoords) {
            //     return;
            // }
            // const coords = igv.pageCoordinates(e);
            // const dx = coords.x - mouseDownCoords.x;
            // const dy = coords.y - mouseDownCoords.y;
            // const dist2 = dx*dx + dy*dy;
            // if(dist2 > 25) {
            //     mouseDownCoords = undefined;
            //     return;
            // }

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
                    browser.zoomWithScaleFactor(centerBP, self, 0.5)
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
            const canvasCoords = igv.translateMouseCoordinates(e, viewport.canvas);
            const genomicLocation = ((referenceFrame.start) + referenceFrame.toBP(viewportCoords.x));

            if (undefined === genomicLocation || null === viewport.tile) {
                return undefined;
            }

            return {
                viewport: viewport,
                referenceFrame: referenceFrame,
                genomicLocation: genomicLocation,
                x: viewportCoords.x,
                y: viewportCoords.y,
                canvasX: canvasCoords.x,
                canvasY: canvasCoords.y
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

        const self = this;

        const track = self.trackView.track;

        if (self.tile && self.tile.containsRange(chr, start, end, bpPerPixel)) {
            return Promise.resolve(self.tile.features);
        }
        else if (typeof track.getFeatures === "function") {

            return track.getFeatures(chr, start, end, bpPerPixel, self)

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
