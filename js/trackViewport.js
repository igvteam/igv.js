/**
 * Created by dat on 9/16/16.
 */

import $ from "./vendor/jquery-3.3.1.slim.js";
import {Popover, Alert} from '../node_modules/igv-ui/dist/igv-ui.js'
import Viewport from "./viewport.js";
import {DOMUtils, FileUtils} from "../node_modules/igv-utils/src/index.js";
import C2S from "./canvas2svg.js"
import GenomeUtils from "./genome/genome.js";

const NOT_LOADED_MESSAGE = 'Error loading track data';

let mouseDownCoords
let lastClickTime = 0;
let popupTimerID;

class TrackViewport extends Viewport {

    constructor(trackView, viewportColumn, referenceFrame, width) {
        super(trackView, viewportColumn, referenceFrame, width)
    }

    initializationHelper() {

        this.$spinner = $('<div>', {class: 'igv-loading-spinner-container'});
        this.$viewport.append(this.$spinner);
        this.$spinner.append($('<div>'));

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

        }

        this.stopSpinner();

        this.addMouseHandlers();

    }

    setTrackLabel(label) {

        this.$trackLabel.empty();
        this.$trackLabel.html(label);

        const txt = this.$trackLabel.text();
        this.$trackLabel.attr('title', txt);
    }

    startSpinner() {
        this.$spinner.show()
    }

    stopSpinner() {
        this.$spinner.hide()
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

    async loadFeatures() {

        const referenceFrame = this.referenceFrame;
        const chr = referenceFrame.chr;

        // Expand the requested range so we can pan a bit without reloading.  But not beyond chromosome bounds
        const chrLength = this.browser.genome.getChromosome(chr).bpLength;
        const pixelWidth = this.$content.width();// * 3;
        const bpWidth = pixelWidth * referenceFrame.bpPerPixel;
        const bpStart = Math.floor(Math.max(0, referenceFrame.start - bpWidth));
        const bpEnd = Math.ceil(Math.min(chrLength, referenceFrame.start + bpWidth + bpWidth));  // Add one screen width to end

        if (this.loading && this.loading.start === bpStart && this.loading.end === bpEnd) {
            return undefined;
        }
        this.loading = {start: bpStart, end: bpEnd};
        this.startSpinner();

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

        let {features, roiFeatures, bpPerPixel, startBP, endBP} = this.tile

        // const isWGV = GenomeUtils.isWholeGenomeView(this.browser.referenceFrameList[0].chr)
        const isWGV = GenomeUtils.isWholeGenomeView(this.referenceFrame.chr)
        let pixelWidth

        if (isWGV) {
            bpPerPixel = this.referenceFrame.end / this.$viewport.width()
            startBP = 0
            endBP = this.referenceFrame.end
            pixelWidth = this.$viewport.width()
        } else {
            pixelWidth = Math.ceil((endBP - startBP) / bpPerPixel)
        }

        // For deep tracks we paint a canvas == 3*viewportHeight centered on the current vertical scroll position
        const viewportHeight = this.$viewport.height()
        const contentHeight = this.getContentHeight()
        const minHeight = roiFeatures ? Math.max(contentHeight, viewportHeight) : contentHeight;  // Need to fill viewport for ROIs.
        let pixelHeight = Math.min(minHeight, 3 * viewportHeight);
        if (0 === pixelWidth || 0 === pixelHeight) {
            if (this.canvas) {
                $(this.canvas).remove();
            }
            return;
        }
        const canvasTop = Math.max(0, -(this.$content.position().top) - viewportHeight)

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
                pixelXOffset,
                pixelWidth,
                pixelHeight,
                pixelTop: canvasTop,
                bpStart: startBP,
                bpEnd: endBP,
                bpPerPixel,
                referenceFrame: this.referenceFrame,
                selection: this.selection,
                viewport: this,
                viewportWidth: this.$viewport.width()
            };

        this.draw(drawConfiguration, features, roiFeatures);

        this.canvasVerticalRange = {top: canvasTop, bottom: canvasTop + pixelHeight}

        if (this.$canvas) {
            this.$canvas.remove()
        }
        this.$canvas = $(newCanvas)
        this.$content.append(this.$canvas)
        this.canvas = newCanvas
        this.ctx = ctx
    }

    draw(drawConfiguration, features, roiFeatures) {

        // console.log(`${ Date.now() } viewport draw(). track ${ this.trackView.track.type }. content-css-top ${ this.$content.css('top') }. canvas-top ${ drawConfiguration.pixelTop }.`)

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

    // TODO: Nolonger used. Will discard
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
                        y: -this.$content.position().top,
                        width: pixelWidth,
                        height: pixelHeight
                    }

            });

        const drawConfiguration =
            {
                viewport: this,
                context: ctx,
                top: -this.$content.position().top,
                pixelTop: 0,   // for compatibility with canvas draw
                pixelWidth,
                pixelHeight,
                bpStart,
                bpEnd,
                bpPerPixel,
                referenceFrame: this.referenceFrame,
                selection: this.selection,
                viewportWidth: pixelWidth,
            };

        this.draw(drawConfiguration, features, roiFeatures);

        return ctx.getSerializedSvg(true);

    }

    containsPosition(chr, position) {
        if (this.referenceFrame.chr === chr && position >= this.referenceFrame.start) {
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
        const y = (-this.$content.position().top - canvasTop) * devicePixelRatio;

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
                        y: -this.$content.position().top,
                        width,
                        height
                    }

            }

        const context = new C2S(config);

        const str = (this.trackView.track.name || this.trackView.track.id).replace(/\W/g, '');

        const index = this.browser.referenceFrameList.indexOf(this.referenceFrame);
        const id = `${str}_referenceFrame_${index}_guid_${DOMUtils.guid()}`

        this.drawSVGWithContext(context, width, height, id, 0, 0, 0)

        const svg = context.getSerializedSvg(true);
        const data = URL.createObjectURL(new Blob([svg], {type: "application/octet-stream"}));

        FileUtils.download(`${id}.svg`, data);
    }

    // called by trackView.renderSVGContext() when rendering
    // entire browser as SVG

    renderSVGContext(context, {deltaX, deltaY}) {

        // Nothing to do if zoomInNotice is active
        if (this.$zoomInNotice && this.$zoomInNotice.is(":visible")) {
            return;
        }

        const str = (this.trackView.track.name || this.trackView.track.id).replace(/\W/g, '');

        const index = this.browser.referenceFrameList.indexOf(this.referenceFrame);
        const id = `${str}_referenceFrame_${index}_guid_${DOMUtils.guid()}`

        const {top: yScrollDelta} = this.$content.position();

        const {width, height} = this.$viewport.get(0).getBoundingClientRect();

        this.drawSVGWithContext(context, width, height, id, deltaX, deltaY + yScrollDelta, -yScrollDelta)

        if (this.$trackLabel && true === this.browser.trackLabelsVisible) {
            const {x, y, width, height} = DOMUtils.relativeDOMBBox(this.$viewport.get(0), this.$trackLabel.get(0));
            this.renderTrackLabelSVG(context, deltaX + x, deltaY + y, width, height)
        }

    }

    // render track label element called from renderSVGContext()
    renderTrackLabelSVG(context, tx, ty, width, height) {

        const str = (this.trackView.track.name || this.trackView.track.id).replace(/\W/g, '');
        const id = `${str}_track_label_guid_${DOMUtils.guid()}`

        context.saveWithTranslationAndClipRect(id, tx, ty, width, height, 0);

        context.fillStyle = "white";
        context.fillRect(0, 0, width, height);

        context.font = "12px Arial";
        context.fillStyle = 'rgb(68, 68, 68)';

        const {width: stringWidth} = context.measureText(this.$trackLabel.text());
        const dx = 0.25 * (width - stringWidth);
        const dy = 0.7 * (height - 12);
        context.fillText(this.$trackLabel.text(), dx, height - dy);

        context.strokeStyle = 'rgb(68, 68, 68)';
        context.strokeRect(0, 0, width, height);

        context.restore();

    }

    // called by renderSVGContext()
    drawSVGWithContext(context, width, height, id, x, y, yClipOffset) {

        context.saveWithTranslationAndClipRect(id, x, y, width, height, yClipOffset);

        let {start, bpPerPixel} = this.referenceFrame;

        const config =
            {
                context,
                viewport: this,
                referenceFrame: this.referenceFrame,
                top: yClipOffset,
                pixelTop: yClipOffset,
                pixelWidth: width,
                pixelHeight: height,
                bpStart: start,
                bpEnd: start + (width * bpPerPixel),
                bpPerPixel,
                viewportWidth: width,
                selection: this.selection
            };

        const features = this.tile ? this.tile.features : [];
        const roiFeatures = this.tile ? this.tile.roiFeatures : undefined;
        this.draw(config, features, roiFeatures);

        context.restore();

    }

    getCachedFeatures() {
        return this.tile ? this.tile.features : [];
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

        const $container = $('<div>', {class: 'igv-zoom-in-notice-container'})
        $parent.append($container);

        const $e = $('<div>');
        $container.append($e);

        $e.text('Zoom in to see features');

        $container.hide();

        return $container;
    }

    viewIsReady() {
        return this.browser && this.browser.referenceFrameList && this.referenceFrame;
    }

    addMouseHandlers() {

        this.addViewportContextMenuHandler(this.$viewport.get(0))

        this.addViewportMouseDownHandler(this.$viewport.get(0))

        this.addViewportTouchStartHandler(this.$viewport.get(0))

        this.addViewportMouseUpHandler(this.$viewport.get(0))

        this.addViewportTouchEndHandler(this.$viewport.get(0))

        this.addViewportClickHandler(this.$viewport.get(0))

        if (this.trackView.track.name && "sequence" !== this.trackView.track.config.type) {
            this.addTrackLabelClickHandler(this.$trackLabel.get(0))
        }

    }

    removeMouseHandlers() {

        this.removeViewportContextMenuHandler(this.$viewport.get(0))

        this.removeViewportMouseDownHandler(this.$viewport.get(0))

        this.removeViewportTouchStartHandler(this.$viewport.get(0))

        this.removeViewportMouseUpHandler(this.$viewport.get(0))

        this.removeViewportTouchEndHandler(this.$viewport.get(0))

        this.removeViewportClickHandler(this.$viewport.get(0))

        if (this.trackView.track.name && "sequence" !== this.trackView.track.config.type) {
            this.removeTrackLabelClickHandler(this.$trackLabel.get(0))
        }

    }

    addViewportContextMenuHandler(viewport) {

        this.boundContextMenuHandler = contextMenuHandler.bind(this)
        viewport.addEventListener('contextmenu', this.boundContextMenuHandler)

        function contextMenuHandler(event) {

            // Ignore if we are doing a drag.  This can happen with touch events.
            if (this.browser.dragObject) {
                return false;
            }

            const clickState = createClickState(event, this);

            if (undefined === clickState) {
                return false;
            }

            event.preventDefault();

            // Track specific items
            let menuItems = [];
            if (typeof this.trackView.track.contextMenuItemList === "function") {
                const trackMenuItems = this.trackView.track.contextMenuItemList(clickState);
                if (trackMenuItems) {
                    menuItems = trackMenuItems;
                }
            }

            // Add items common to all tracks
            if (menuItems.length > 0) {
                menuItems.push({label: $('<HR>')});
            }

            menuItems.push({label: 'Save Image (PNG)', click: () => this.saveImage()});
            menuItems.push({label: 'Save Image (SVG)', click: () => this.saveSVG()});

            this.browser.menuPopup.presentTrackContextMenu(event, menuItems)
        }

    }

    removeViewportContextMenuHandler(viewport) {
        viewport.removeEventListener('contextmenu', this.boundContextMenuHandler)
    }

    addViewportMouseDownHandler(viewport) {
        this.boundMouseDownHandler = mouseDownHandler.bind(this)
        viewport.addEventListener('mousedown', this.boundMouseDownHandler)
    }

    removeViewportMouseDownHandler(viewport) {
        viewport.removeEventListener('mousedown', this.boundMouseDownHandler)
    }

    addViewportTouchStartHandler(viewport) {
        this.boundTouchStartHandler = mouseDownHandler.bind(this)
        viewport.addEventListener('touchstart', this.boundTouchStartHandler)
    }

    removeViewportTouchStartHandler(viewport) {
        viewport.removeEventListener('touchstart', this.boundTouchStartHandler)
    }

    addViewportMouseUpHandler(viewport) {
        this.boundMouseUpHandler = mouseUpHandler.bind(this)
        viewport.addEventListener('mouseup', this.boundMouseUpHandler)
    }

    removeViewportMouseUpHandler(viewport) {
        viewport.removeEventListener('mouseup', this.boundMouseUpHandler)
    }

    addViewportTouchEndHandler(viewport) {
        this.boundTouchEndHandler = mouseUpHandler.bind(this)
        viewport.addEventListener('touchend', this.boundTouchEndHandler)
    }

    removeViewportTouchEndHandler(viewport) {
        viewport.removeEventListener('touchend', this.boundTouchEndHandler)
    }

    addViewportClickHandler(viewport) {

        this.boundClickHandler = clickHandler.bind(this)
        viewport.addEventListener('click', this.boundClickHandler)

        function clickHandler(event) {

            if (this.enableClick) {
                if (3 === event.which || event.ctrlKey) {
                    return;
                }

                // Close any currently open popups
                $('.igv-popover').hide();


                if (this.browser.dragObject || this.browser.isScrolling) {
                    return;
                }

                // Treat as a mouse click, its either a single or double click.
                // Handle here and stop propogation / default
                event.preventDefault();
                event.stopPropagation();

                const mouseX = DOMUtils.translateMouseCoordinates(event, this.$viewport.get(0)).x;
                const mouseXCanvas = DOMUtils.translateMouseCoordinates(event, this.canvas).x;
                const referenceFrame = this.referenceFrame;
                const xBP = Math.floor((referenceFrame.start) + referenceFrame.toBP(mouseXCanvas));

                const time = Date.now();

                if (time - lastClickTime < this.browser.constants.doubleClickDelay) {

                    // double-click
                    if (popupTimerID) {
                        window.clearTimeout(popupTimerID);
                        popupTimerID = undefined;
                    }

                    const centerBP = Math.round(referenceFrame.start + referenceFrame.toBP(mouseX));

                    let string;

                    if ('all' === this.referenceFrame.chr.toLowerCase()) {

                        const chr = this.browser.genome.getChromosomeCoordinate(centerBP).chr;

                        if (1 === this.browser.referenceFrameList.length) {
                            string = chr;
                        } else {
                            const loci = this.browser.referenceFrameList.map(({locusSearchString}) => locusSearchString)
                            const index = this.browser.referenceFrameList.indexOf(this.referenceFrame)
                            loci[index] = chr
                            string = loci.join(' ')
                        }

                        this.browser.search(string);

                    } else {
                        this.browser.zoomWithScaleFactor(0.5, centerBP, this.referenceFrame)
                    }


                } else {
                    // single-click

                    if (event.shiftKey && typeof this.trackView.track.shiftClick === "function") {

                        this.trackView.track.shiftClick(xBP, event);

                    } else if (typeof this.trackView.track.popupData === "function") {

                        popupTimerID = setTimeout(() => {

                                const content = getPopupContent(event, this);
                                if (content) {
                                    if (this.popover) this.popover.dispose()
                                    this.popover = new Popover(this.browser.columnContainer)
                                    this.popover.presentContentWithEvent(event, content)
                                }
                                window.clearTimeout(popupTimerID);
                                popupTimerID = undefined;
                            },
                            this.browser.constants.doubleClickDelay);
                    }
                }

                lastClickTime = time;

            }

        }

    }

    removeViewportClickHandler(viewport) {
        viewport.removeEventListener('click', this.boundClickHandler)
    }

    addTrackLabelClickHandler(trackLabel) {

        this.boundTrackLabelClickHandler = clickHandler.bind(this)
        trackLabel.addEventListener('click', this.boundTrackLabelClickHandler)

        function clickHandler(event) {

            event.stopPropagation();

            const {track} = this.trackView

            let str;
            if (typeof track.description === 'function') {
                str = track.description();
            } else if (track.description) {
                str = `<div>${track.description}</div>`
            } else {
                if (track.url) {
                    if (FileUtils.isFile(track.url)) {
                        str = `<div><b>Filename: </b>${track.url.name}`;
                    } else {
                        str = `<div><b>URL: </b>${track.url}`;
                    }
                } else {
                    str = track.name;

                }
            }

            if (this.popover) {
                this.popover.dispose()
            }

            this.popover = new Popover(this.browser.columnContainer, (track.name || 'unnamed'))

            this.popover.presentContentWithEvent(event, str)
        }

    }

    removeTrackLabelClickHandler(trackLabel) {
        trackLabel.removeEventListener('click', this.boundTrackLabelClickHandler)
    }

}

function mouseDownHandler(event) {
    this.enableClick = true;
    this.browser.mouseDownOnViewport(event, this);
    mouseDownCoords = DOMUtils.pageCoordinates(event);
}

function mouseUpHandler(event) {

    // Any mouse up cancels drag and scrolling
    if (this.browser.dragObject || this.browser.isScrolling) {
        this.browser.cancelTrackPan();
        event.preventDefault();
        event.stopPropagation();
        this.enableClick = false;   // Until next mouse down
    } else {
        this.browser.cancelTrackPan();
        this.browser.endTrackDrag();
    }
}

function createClickState(event, viewport) {

    const referenceFrame = viewport.referenceFrame;

    const viewportCoords = DOMUtils.translateMouseCoordinates(event, viewport.contentDiv);
    const canvasCoords = DOMUtils.translateMouseCoordinates(event, viewport.canvas);

    const genomicLocation = ((referenceFrame.start) + referenceFrame.toBP(viewportCoords.x));

    if (undefined === genomicLocation || null === viewport.tile) {
        return undefined;
    }

    return {
        event,
        viewport,
        referenceFrame,
        genomicLocation,
        x: viewportCoords.x,
        y: viewportCoords.y,
        canvasX: canvasCoords.x,
        canvasY: canvasCoords.y
    }

}

function getPopupContent(event, viewport) {

    const clickState = createClickState(event, viewport);

    if (undefined === clickState) {
        return;
    }

    let track = viewport.trackView.track;
    const dataList = track.popupData(clickState);

    const popupClickHandlerResult = viewport.browser.fireEvent('trackclick', [track, dataList]);

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

function formatPopoverText(nameValues) {

    const rows = nameValues.map(nameValue => {

        if (nameValue.name) {
            const str = `<span>${nameValue.name}</span>&nbsp&nbsp&nbsp${nameValue.value}`
            return `<div title="${nameValue.value}">${str}</div>`
        } else if ('<hr>' === nameValue) { // this can be retired if nameValue.html is allowed.
            return nameValue
        } else if (nameValue.html) {
            return nameValue.html
        } else {
            return `<div title="${nameValue}">${nameValue}</div>`
        }

    })

    return rows.join('')
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

export default TrackViewport
