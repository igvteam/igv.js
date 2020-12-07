/**
 * Created by dat on 9/16/16.
 */

import $ from "./vendor/jquery-3.3.1.slim.js";
import {Alert, Popover} from '../node_modules/igv-ui/dist/igv-ui.js';
import GenomeUtils from "./genome/genome.js";
import {createIcon} from "./igv-icons.js";
import ViewportBase from "./viewportBase.js";
import {DOMUtils, FileUtils} from "../node_modules/igv-utils/src/index.js";
import MenuPopup from "./ui/menuPopup.js";
import C2S from "./canvas2svg.js"

const NOT_LOADED_MESSAGE = 'Error loading track data';

class ViewPort extends ViewportBase {

    constructor(trackView, $viewportContainer, referenceFrame, width) {

        super(trackView, $viewportContainer, referenceFrame, width)

    }

    initializationHelper() {

        this.menuPopup = new MenuPopup(this.trackView.$viewportContainer)
        this.menuPopup.$popover.hide()

        this.addMouseHandlers();
        this.$spinner = $('<div class="igv-viewport-spinner">');
        this.$spinner.append(createIcon("spinner"));
        this.$viewport.append(this.$spinner);
        this.stopSpinner();

        const {track} = this.trackView
        if ('sequence' !== track.type) {
            this.$zoomInNotice = this.createZoomInNotice(this.$content);
        }

        if (track.name && "sequence" !== track.config.type) {

            this.$trackLabel = $('<div class="igv-track-label">');
            this.$viewport.append(this.$trackLabel);
            this.setTrackLabel(track.name);

            if (false === this.browser.trackLabelsVisible) {
                this.$trackLabel.hide();
            }

            this.$trackLabel.click(e => {
                let str;
                e.stopPropagation();
                if (typeof track.description === 'function') {
                    str = track.description();
                } else if (track.description) {
                    str = `<div title="${track.description}"><div>${track.description}</div></div>`
                } else {
                    str = `<div title="${track.name}"><div>${track.name}</div></div>`
                }

                if (this.popover) this.popover.dispose()
                this.popover = new Popover(this.trackView.$viewportContainer.get(0))
                this.popover.presentContentWithEvent(e, str)
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
    }

    setTrackLabel(label) {

        this.trackView.track.name = this.trackView.track.config.name = label;

        this.$trackLabel.empty();
        this.$trackLabel.html(label);

        const txt = this.$trackLabel.text();
        this.$trackLabel.attr('title', txt);
    }

    startSpinner() {
        const $spinner = this.$spinner;
        if ($spinner) {
            $spinner.addClass("igv-fa5-spin");
            $spinner.show();
        }
    }

    stopSpinner() {

        const $spinner = this.$spinner;
        if ($spinner) {
            $spinner.hide();
            $spinner.removeClass("igv-fa5-spin");
        }
    }

    checkZoomIn() {

        const showZoomInNotice = () => {
            const referenceFrame = this.referenceFrame;
            if (this.referenceFrame.chr.toLowerCase() === "all" && !this.trackView.track.supportsWholeGenome()) {
                return true;
            } else {
                const visibilityWindow = typeof this.trackView.track.getVisibilityWindow === 'function' ?
                    this.trackView.track.getVisibilityWindow() :
                    this.trackView.track.visibilityWindow;
                return (
                    visibilityWindow !== undefined && visibilityWindow > 0 &&
                    (referenceFrame.bpPerPixel * this.$viewport.width() > visibilityWindow));
            }
        }

        if (!(this.viewIsReady())) {
            return false;
        }

        if (this.$zoomInNotice) {
            if (showZoomInNotice()) {
                // Out of visibility window
                if (this.canvas) {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.tile = undefined;
                }
                this.$zoomInNotice.show();

                if (this.trackView.track.autoHeight) {
                    const minHeight = this.trackView.minHeight || 0;
                    this.setContentHeight(minHeight);
                }

                return false;
            } else {
                this.$zoomInNotice.hide();
                return true;
            }
        }

        return true;



    }

    shift() {
        const self = this;
        const referenceFrame = self.referenceFrame;

        if (self.canvas &&
            self.tile &&
            self.tile.chr === self.referenceFrame.chr &&
            self.tile.bpPerPixel === referenceFrame.bpPerPixel) {

            const pixelOffset = Math.round((self.tile.startBP - referenceFrame.start) / referenceFrame.bpPerPixel);
            self.canvas.style.left = pixelOffset + "px";
        }
    }

    setTop(contentTop) {

        const viewportHeight = this.$viewport.height()
        const viewTop = -contentTop
        const viewBottom = viewTop + viewportHeight
        this.$content.css("top", contentTop + "px");

        if (!this.canvasVerticalRange ||
            this.canvasVerticalRange.bottom < viewBottom ||
            this.canvasVerticalRange.top > viewTop) {
            this.repaint()
        }
    }

    async loadFeatures() {

        const referenceFrame = this.referenceFrame;
        const chr = referenceFrame.chr;

        // Expand the requested range so we can pan a bit without reloading.  But not beyond chromosome bounds
        const chrLength = this.browser.genome.getChromosome(chr).bpLength;
        const pixelWidth = $(this.contentDiv).width() * 3;
        const bpWidth = pixelWidth * referenceFrame.bpPerPixel;
        const bpStart = Math.floor(Math.max(0, referenceFrame.start - bpWidth / 3));
        const bpEnd = Math.ceil(Math.min(chrLength, bpStart + bpWidth));

        if (this.loading && this.loading.start === bpStart && this.loading.end === bpEnd) {
            return undefined;
        }
        this.loading = {start: bpStart, end: bpEnd};
        this.startSpinner();

        // console.log('get features');
        try {
            const features = await this.getFeatures(this.trackView.track, chr, bpStart, bpEnd, referenceFrame.bpPerPixel);
            let roiFeatures = [];
            const roi = mergeArrays(this.browser.roi, this.trackView.track.roi)
            if (roi) {
                for (let r of roi) {
                    const f = await
                        r.getFeatures(chr, bpStart, bpEnd, referenceFrame.bpPerPixel);
                    roiFeatures.push({track: r, features: f})
                }
            }

            this.tile = new Tile(chr, bpStart, bpEnd, referenceFrame.bpPerPixel, features, roiFeatures);
            this.loading = false;
            this.hideMessage();
            this.stopSpinner();
            return this.tile;
        } catch (error) {
            // Track might have been removed during load
            if (this.trackView && this.trackView.disposed !== true) {
                this.showMessage(NOT_LOADED_MESSAGE);
                Alert.presentAlert(error);
                console.error(error)
            }
        } finally {
            this.loading = false;
            this.stopSpinner();
        }
    }

    async repaint() {

        if (undefined === this.tile) {
            return;
        }

        let { features, roiFeatures, bpPerPixel, startBP, endBP } = this.tile

        const isWGV = GenomeUtils.isWholeGenomeView(this.browser.referenceFrameList[0].chr)
        let pixelWidth

        if (isWGV) {
            bpPerPixel = this.referenceFrame.initialEnd / this.$viewport.width()
            startBP = 0
            endBP = this.referenceFrame.initialEnd
            pixelWidth = this.$viewport.width()
        } else {
            pixelWidth = Math.ceil((endBP - startBP) / bpPerPixel)
        }

        // For deep tracks we paint a canvas == 3*viewportHeight centered on the current vertical scroll position
        const viewportHeight = this.$viewport.height();
        const minHeight = roiFeatures ? Math.max(this.getContentHeight(), viewportHeight) : this.getContentHeight();  // Need to fill viewport for ROIs.
        let pixelHeight = Math.min(minHeight, 3 * viewportHeight);
        if (0 === pixelWidth || 0 === pixelHeight) {
            if (this.canvas) {
                $(this.canvas).remove();
            }
            return;
        }
        const canvasTop = Math.max(0, -($(this.contentDiv).position().top) - viewportHeight)

        // Always use high DPI if in compressed display mode, otherwise use preference setting;
        let devicePixelRatio;
        if ("FILL" === this.trackView.track.displayMode) {
            devicePixelRatio = window.devicePixelRatio;
        } else {
            devicePixelRatio = (this.trackView.track.supportHiDPI === false) ? 1 : window.devicePixelRatio;
        }

        const pixelXOffset = Math.round((startBP - this.referenceFrame.start) / this.referenceFrame.bpPerPixel);

        const newCanvas = $('<canvas class="igv-canvas">').get(0);
        const ctx = newCanvas.getContext("2d");

        newCanvas.style.width = pixelWidth + "px";
        newCanvas.style.height = pixelHeight + "px";

        newCanvas.width = devicePixelRatio * pixelWidth;
        newCanvas.height = devicePixelRatio * pixelHeight;

        ctx.scale(devicePixelRatio, devicePixelRatio);

        newCanvas.style.left = pixelXOffset + "px";
        newCanvas.style.top = canvasTop + "px";

        ctx.translate(0, -canvasTop)

        const drawConfiguration =
            {
                context: ctx,
                renderSVG: false,
                features,
                pixelWidth,
                pixelHeight,
                pixelTop: canvasTop,
                bpStart: startBP,
                bpEnd: endBP,
                bpPerPixel,
                referenceFrame: this.referenceFrame,
                selection: this.selection,
                viewport: this,
                viewportWidth: this.$viewport.width(),
                viewportContainerX: this.referenceFrame.toPixels(this.referenceFrame.start - startBP),
                viewportContainerWidth: this.browser.getViewportContainerWidth()
            };

        this.draw(drawConfiguration, features, roiFeatures);

        this.canvasVerticalRange = {top: canvasTop, bottom: canvasTop + pixelHeight}

        if (this.canvas) {
            $(this.canvas).remove();
        }
        $(this.contentDiv).append(newCanvas);
        this.canvas = newCanvas;
        this.ctx = ctx;
    }

    draw(drawConfiguration, features, roiFeatures) {
        if (features) {
            drawConfiguration.features = features;
            this.trackView.track.draw(drawConfiguration);
        }
        if (roiFeatures) {
            for (let r of roiFeatures) {
                drawConfiguration.features = r.features;
                r.track.draw(drawConfiguration);
            }
        }
    }

    // render viewport as SVG
    async toSVG(tile) {

        // Nothing to do if zoomInNotice is active
        if (this.$zoomInNotice && this.$zoomInNotice.is(":visible")) {
            return;
        }

        const referenceFrame = this.referenceFrame;
        const bpPerPixel = tile.bpPerPixel;
        const features = tile.features;
        const roiFeatures = tile.roiFeatures;
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
                top: -$(this.contentDiv).position().top,
                pixelTop: 0,   // for compatibility with canvas draw
                pixelWidth,
                pixelHeight,
                bpStart,
                bpEnd,
                bpPerPixel,
                referenceFrame: this.referenceFrame,
                selection: this.selection,
                viewportWidth: pixelWidth,
                viewportContainerX: 0,
                viewportContainerWidth: this.browser.getViewportContainerWidth()
            };

        this.draw(drawConfiguration, features, roiFeatures);

        return ctx.getSerializedSvg(true);

    }

    setContentHeight(contentHeight) {
        // Maximum height of a canvas is ~32,000 pixels on Chrome, possibly smaller on other platforms
        contentHeight = Math.min(contentHeight, 32000);

        $(this.contentDiv).height(contentHeight);

        if (this.tile) this.tile.invalidate = true;
    }

    containsPosition(chr, position) {
        if(this.referenceFrame.chr === chr && position >= this.referenceFrame.start) {
            return position <= this.referenceFrame.calculateEnd(this.getWidth());
        } else {
            return false;
        }
    }

    isLoading() {
        return this.loading;
    }

    saveImage() {

        if (!this.ctx) return;

        const canvasTop = this.canvasVerticalRange ? this.canvasVerticalRange.top : 0;
        const devicePixelRatio = window.devicePixelRatio;
        const w = this.$viewport.width() * devicePixelRatio;
        const h = this.$viewport.height() * devicePixelRatio;
        const x = -$(this.canvas).position().left * devicePixelRatio;
        const y = (-$(this.contentDiv).position().top - canvasTop) * devicePixelRatio;

        const imageData = this.ctx.getImageData(x, y, w, h);
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        exportCanvas.width = imageData.width;
        exportCanvas.height = imageData.height;
        exportCtx.putImageData(imageData, 0, 0);

        // filename = this.trackView.track.name + ".png";
        const filename = (this.$trackLabel.text() ? this.$trackLabel.text() : "image") + ".png";
        const data = exportCanvas.toDataURL("image/png");
        FileUtils.download(filename, data);
    }

    saveSVG() {

        const {width, height} = this.$viewport.get(0).getBoundingClientRect();

        const config =
            {
                width,
                height,
                viewbox:
                    {
                        x: 0,
                        y: -$(this.contentDiv).position().top,
                        width,
                        height
                    }

            }

        const context = new C2S(config);
        this.drawSVGWithContext(context, width, height)
        const svg = context.getSerializedSvg(true);
        const data = URL.createObjectURL(new Blob([svg], {type: "application/octet-stream"}));
        const str = this.$trackLabel ? this.$trackLabel.text() : this.trackView.track.id;
        FileUtils.download(`${str}.svg`, data);
    }

    async renderSVGContext(context, offset) {

        // Nothing to do if zoomInNotice is active
        if (this.$zoomInNotice && this.$zoomInNotice.is(":visible")) {
            return;
        }

        let str = this.trackView.track.name || this.trackView.track.id;
        str = str.replace(/\W/g, '');

        const index = this.browser.referenceFrameList.indexOf(this.referenceFrame);
        const id = str.toLowerCase() + '_genomic_state_index_' + index;

        // If present, paint axis canvas. Only in first multi-locus panel.
        if (0 === index && typeof this.trackView.track.paintAxis === 'function') {

            const bbox = this.trackView.controlCanvas.getBoundingClientRect();
            context.addTrackGroupWithTranslationAndClipRect((id + '_axis'), offset.deltaX - bbox.width, offset.deltaY, bbox.width, bbox.height, 0);

            context.save();
            this.trackView.track.paintAxis(context, bbox.width, bbox.height);
            context.restore();
        }

        const yScrollDelta = $(this.contentDiv).position().top;
        const dx = offset.deltaX + (index * context.multiLocusGap);
        const dy = offset.deltaY + yScrollDelta;
        const { top, width, height } = this.$viewport.get(0).getBoundingClientRect();

        context.addTrackGroupWithTranslationAndClipRect(id, dx, dy, width, height, -yScrollDelta);

        this.drawSVGWithContext(context, width, height)

    }

    renderTrackLabelSVG(context) {

        const {x, y, width, height} = DOMUtils.relativeDOMBBox(this.$viewport.get(0), this.$trackLabel.get(0));

        const {width: stringWidth} = context.measureText(this.$trackLabel.text());
        context.fillStyle = "white";
        context.fillRect(x, y, width, height);

        context.font = "12px Arial";
        context.fillStyle = 'rgb(68, 68, 68)';

        const dx = 0.25 * (width - stringWidth);
        const dy = 0.7 * (height - 12);
        context.fillText(this.$trackLabel.text(), x + dx, y + height - dy);

        context.strokeStyle = 'rgb(68, 68, 68)';
        context.strokeRect(x, y, width, height);

    }

    drawSVGWithContext(context, width, height) {

        let {start, bpPerPixel} = this.referenceFrame;

        context.save();

        const top = -$(this.contentDiv).position().top;
        const config =
            {
                context,
                renderSVG: true,
                viewport: this,
                referenceFrame: this.referenceFrame,
                top: top,
                pixelTop: top,
                pixelWidth: width,
                pixelHeight: height,
                bpStart: start,
                bpEnd: start + (width * bpPerPixel),
                bpPerPixel,
                viewportWidth: width,
                viewportContainerX: 0,
                viewportContainerWidth: this.browser.getViewportContainerWidth(),
                selection: this.selection
            };

        const features = this.tile ? this.tile.features : [];
        const roiFeatures = this.tile ? this.tile.roiFeatures : undefined;
        this.draw(config, features, roiFeatures);

        if (this.$trackLabel && true === this.browser.trackLabelsVisible) {
            this.renderTrackLabelSVG(context);
        }

        context.restore();

    }

    getCachedFeatures() {
        return this.tile ? this.tile.features : [];
    }

    checkContentHeight() {

        let track = this.trackView.track;

        if ("FILL" === track.displayMode) {
            this.setContentHeight(this.$viewport.height())
        } else if (typeof track.computePixelHeight === 'function') {

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

    async getFeatures(track, chr, start, end, bpPerPixel) {

        if (this.tile && this.tile.containsRange(chr, start, end, bpPerPixel)) {
            return this.tile.features;
        } else if (typeof track.getFeatures === "function") {
            const features = await track.getFeatures(chr, start, end, bpPerPixel, this);
            this.cachedFeatures = features;
            this.checkContentHeight();
            return features;
        } else {
            return undefined;
        }
    }

    createZoomInNotice($parent) {

        const $notice = $('<div class="zoom-in-notice-container">');
        $parent.append($notice);

        const $e = $('<div>');
        $notice.append($e);
        $e.text('Zoom in to see features');

        $notice.hide();

        return $notice;
    }

    viewIsReady() {
        return this.browser && this.browser.referenceFrameList && this.referenceFrame;
    }

    addMouseHandlers() {

        const self = this;
        const browser = this.browser;

        let lastMouseX;
        let mouseDownCoords;

        let popupTimerID;

        let lastClickTime = 0;

        this.$viewport.on("contextmenu", function (e) {

            // Ignore if we are doing a drag.  This can happen with touch events.
            if (self.browser.dragObject) {
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
                const trackMenuItems = self.trackView.track.contextMenuItemList(clickState);
                if(trackMenuItems) {
                    menuItems = trackMenuItems;
                }
            }

            // Add items common to all tracks
            if (menuItems.length > 0) {
                menuItems.push({label: $('<HR>')});
            }

            menuItems.push({label: 'Save Image (PNG)', click: () => self.saveImage()});
            menuItems.push({label: 'Save Image (SVG)', click: () => self.saveSVG()});

            self.menuPopup.presentTrackContextMenu(e, menuItems)
        });


        /**
         * Mouse click down,  notify browser for potential drag (pan), and record position for potential click.
         */
        this.$viewport.on('mousedown', function (e) {
            self.enableClick = true;
            browser.mouseDownOnViewport(e, self);
            mouseDownCoords = DOMUtils.pageCoordinates(e);
        });

        this.$viewport.on('touchstart', function (e) {
            self.enableClick = true;
            browser.mouseDownOnViewport(e, self);
            mouseDownCoords = DOMUtils.pageCoordinates(e);
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
            if (self.browser.dragObject || self.browser.isScrolling) {
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


            if (browser.dragObject || browser.isScrolling) {
                return;
            }

            // // Interpret mouseDown + mouseUp < 5 pixels as a click.
            // if(!mouseDownCoords) {
            //     return;
            // }
            // const coords = pageCoordinates(e);
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

            const mouseX = DOMUtils.translateMouseCoordinates(e, self.$viewport.get(0)).x;
            const mouseXCanvas = DOMUtils.translateMouseCoordinates(e, self.canvas).x;
            const referenceFrame = self.referenceFrame;
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

                if ('all' === self.referenceFrame.chr.toLowerCase()) {

                    const chr = browser.genome.getChromosomeCoordinate(centerBP).chr;

                    if (1 === browser.referenceFrameList.length) {
                        string = chr;
                    } else {
                        let loci = browser.referenceFrameList.map(function (g) {
                            return g.locusSearchString;
                        });
                        loci[browser.referenceFrameList.indexOf(self.referenceFrame)] = chr;
                        string = loci.join(' ');
                    }

                    browser.search(string);

                } else {
                    browser.zoomWithScaleFactor(0.5, centerBP, self)
                }


            } else {
                // single-click

                if (e.shiftKey && typeof self.trackView.track.shiftClick === "function") {

                    self.trackView.track.shiftClick(xBP, e);

                } else if (typeof self.trackView.track.popupData === "function") {

                    popupTimerID = setTimeout(function () {

                            const content = getPopupContent(e, self);
                            if (content) {
                                if (self.popover) self.popover.dispose()
                                self.popover = new Popover(self.trackView.$viewportContainer.get(0))
                                self.popover.presentContentWithEvent(e, content)
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

            const referenceFrame = viewport.referenceFrame;
            const viewportCoords = DOMUtils.translateMouseCoordinates(e, viewport.contentDiv);
            const canvasCoords = DOMUtils.translateMouseCoordinates(e, viewport.canvas);
            const genomicLocation = ((referenceFrame.start) + referenceFrame.toBP(viewportCoords.x));

            if (undefined === genomicLocation || null === viewport.tile) {
                return undefined;
            }

            return {
                event: e,
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
            if (undefined === popupClickHandlerResult || true === popupClickHandlerResult) {
                // Indicates handler did not handle the result, or the handler wishes default behavior to occur
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
        function formatPopoverText(nameValues) {

            const rows = nameValues.map(nameValue => {

                if (nameValue.name) {
                    const str = `<span>${nameValue.name}</span>&nbsp&nbsp&nbsp${nameValue.value}`
                    return `<div title="${nameValue.value}">${str}</div>`
                } else if ('<hr>' === nameValue) {
                    return nameValue
                } else {
                    return `<div title="${nameValue}">${nameValue}</div>`
                }

            })

            return rows.join('')
        }
    }

}




var Tile = function (chr, tileStart, tileEnd, bpPerPixel, features, roiFeatures) {
    this.chr = chr;
    this.startBP = tileStart;
    this.endBP = tileEnd;
    this.bpPerPixel = bpPerPixel;
    this.features = features;
    this.roiFeatures = roiFeatures;
};

Tile.prototype.containsRange = function (chr, start, end, bpPerPixel) {
    return this.bpPerPixel === bpPerPixel && start >= this.startBP && end <= this.endBP && chr === this.chr;
};

Tile.prototype.overlapsRange = function (chr, start, end) {
    return this.chr === chr && end >= this.startBP && start <= this.endBP;
};


/**
 * Merge 2 arrays.  a and/or b can be undefined.  If both are undefined, return undefined
 * @param a An array or undefined
 * @param b An array or undefined
 */
function mergeArrays(a, b) {
    if (a && b) return a.concat(b)
    else if (a) return a
    else return b

}

export default ViewPort
