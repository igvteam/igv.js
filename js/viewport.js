/**
 * Created by dat on 9/16/16.
 */

import $ from "./vendor/jquery-3.3.1.slim.js";
import C2S from "./canvas2svg.js";
import Popover from "./ui/popover.js";
import RulerSweeper from "./rulerSweeper.js";
import GenomeUtils from "./genome/genome.js";
import {createIcon} from "./igv-icons.js";
import {pageCoordinates, relativeDOMBBox, translateMouseCoordinates} from "./util/domUtils.js";
import {download} from "./util/igvUtils.js";

const NOT_LOADED_MESSAGE = 'Error loading track data';

function ViewPort(trackView, $container, genomicState, width) {

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

    // know the genomic state index
    const index = this.browser.genomicStateList.indexOf(genomicState);
    $div.data('genomicStateIndex', index);

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

        this.rulerSweeper = new RulerSweeper(this);

        trackView.track.appendMultiPanelCloseButton(this.$viewport, this.genomicState);

        this.$rulerLabel = $('<div class = "igv-multi-locus-panel-label-div">');

        this.$rulerLabel.click(function (e) {
            self.browser.selectMultiLocusPanelWithGenomicState(self.genomicState);
        });

        $(this.contentDiv).append(this.$rulerLabel);

        if (true === GenomeUtils.isWholeGenomeView(this.genomicState.referenceFrame)) {
            enableRulerTrackMouseHandlers.call(this);
        } else {
            disableRulerTrackMouseHandlers.call(this);
        }

    } else {
        addMouseHandlers.call(this);

        // const $spinnerContainer = $('<div class="igv-viewport-spinner">');
        // const dimen = 32;
        // $spinnerContainer.css({'font-size': dimen + 'px'});

        this.$spinner = $('<div class="igv-viewport-spinner">');
        this.$spinner.append(createIcon("spinner"));
        this.$viewport.append(this.$spinner);
        this.stopSpinner();

        if ("sequence" !== trackView.track.type) {

            this.popover = new Popover(this.browser.$content);

            let str = trackView.track.name.toLowerCase().split(' ').join('_');
            str = str + '_' + this.browser.genomicStateList.indexOf(this.genomicState);

            this.popover.$popover.attr('id', str);

            this.$zoomInNotice = createZoomInNotice.call(this, $(this.contentDiv));
        }
    }

    if (trackView.track.name) {

        this.$trackLabel = $('<div class="igv-track-label">');
        this.$viewport.append(this.$trackLabel);

        this.setTrackLabel(trackView.track.name);


        if (false === this.browser.trackLabelsVisible) {
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

            const page = pageCoordinates(e);

            self.popover.presentTrackContent(page.x, page.y, str);

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

function createZoomInNotice($parent) {

    const $notice = $('<div class="zoom-in-notice-container">');
    $parent.append($notice);

    const $e = $('<div>');
    $notice.append($e);
    $e.text('Zoom in to see features');

    $notice.hide();

    return $notice;
}

ViewPort.prototype.isVisible = function () {
    return this.$viewport.width()
};


// UI
ViewPort.prototype.setTrackLabel = function (label) {

    this.trackView.track.name = this.trackView.track.config.name = label;

    this.$trackLabel.empty();
    this.$trackLabel.html(label);

    const txt = this.$trackLabel.text();
    this.$trackLabel.attr('title', txt);
};


ViewPort.prototype.setWidth = function (width) {
    this.$viewport.outerWidth(width);
    this.canvas.style.width = (this.$viewport.width() + 'px');
    this.canvas.setAttribute('width', this.$viewport.width());
};

ViewPort.prototype.startSpinner = function () {

    const $spinner = this.$spinner;
    if ($spinner) {
        $spinner.addClass("igv-fa5-spin");
        $spinner.show();
    }
};

ViewPort.prototype.stopSpinner = function () {

    const $spinner = this.$spinner;
    if ($spinner) {
        $spinner.hide();
        $spinner.removeClass("igv-fa5-spin");
    }
};

ViewPort.prototype.showMessage = function (message) {
    if (!this.messageDiv) {
        this.messageDiv = document.createElement('div');
        this.messageDiv.className = 'igv-viewport-message';
        this.contentDiv.append(this.messageDiv)
    }
    this.messageDiv.textContent = message;
    this.messageDiv.style.display = 'inline-block'
};

ViewPort.prototype.hideMessage = function (message) {
    if (this.messageDiv)
        this.messageDiv.style.display = 'none'
};


ViewPort.prototype.checkZoomIn = function () {

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


    function showZoomInNotice() {
        const referenceFrame = this.genomicState.referenceFrame;
        if (referenceFrame.chrName.toLowerCase() === "all" && !this.trackView.track.supportsWholeGenome()) {
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
}

ViewPort.prototype.shift = function () {
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

ViewPort.prototype.setTop = function (contentTop) {

    const viewportHeight = this.$viewport.height()
    const viewTop = -contentTop
    const viewBottom = viewTop + viewportHeight
    $(this.contentDiv).css("top", contentTop + "px");

    if (!this.canvasVerticalRange ||
        this.canvasVerticalRange.bottom < viewBottom ||
        this.canvasVerticalRange.top > viewTop) {
        this.repaint()
    }
}

ViewPort.prototype.loadFeatures = async function () {


    const genomicState = this.genomicState;
    const referenceFrame = genomicState.referenceFrame;
    const chr = referenceFrame.chrName;

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
        const features = await getFeatures.call(this, referenceFrame.chrName, bpStart, bpEnd, referenceFrame.bpPerPixel);

        let roiFeatures = [];
        const roi = mergeArrays(this.browser.roi, this.trackView.track.roi)
        if (roi) {
            for (let r of roi) {
                const f = await
                    r.getFeatures(referenceFrame.chrName, bpStart, bpEnd, referenceFrame.bpPerPixel);
                roiFeatures.push({track: r, features: f})
            }
        }

        this.tile = new Tile(referenceFrame.chrName, bpStart, bpEnd, referenceFrame.bpPerPixel, features, roiFeatures);
        this.loading = false;
        this.hideMessage();
        this.stopSpinner();
        return this.tile;
    } catch (error) {
        this.showMessage(NOT_LOADED_MESSAGE);
        console.error(error)
    } finally {
        this.loading = false;
        this.stopSpinner();
    }
}


/**
 *
 * @param tile - the tile is created whenever features are loaded.  It contains the genomic state
 * representing the features,as well as the features.  The object evolved, at one time it was an image tile.
 * Should be renamed.
 */
ViewPort.prototype.repaint = async function (tile) {

    var self = this;

    //
    if (!tile) {
        tile = this.tile;
    }
    if (!tile) {
        return;
    }

    const isWGV = GenomeUtils.isWholeGenomeView(this.genomicState.referenceFrame);

    const features = tile.features;
    const roiFeatures = tile.roiFeatures;
    const genomicState = this.genomicState;
    const referenceFrame = genomicState.referenceFrame;
    const bpPerPixel = isWGV ? referenceFrame.initialEnd / this.$viewport.width() : tile.bpPerPixel;
    const bpStart = isWGV ? 0 : tile.startBP;
    const bpEnd = isWGV ? referenceFrame.initialEnd : tile.endBP;
    const pixelWidth = isWGV ? this.$viewport.width() : Math.ceil((bpEnd - bpStart) / bpPerPixel);

    // For deep tracks we paint a canvas == 3*viewportHeight centered on the current vertical scroll position
    const viewportHeight = this.$viewport.height()
    let pixelHeight = Math.min(self.getContentHeight(), 3 * viewportHeight);
    if (0 === pixelWidth || 0 === pixelHeight) {
        if (self.canvas) {
            $(self.canvas).remove();
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

    const drawConfiguration =
        {
            features: features,
            pixelWidth: pixelWidth,
            pixelHeight: pixelHeight,
            pixelTop: canvasTop,
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
    // ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);


    const pixelXOffset = Math.round((bpStart - referenceFrame.start) / referenceFrame.bpPerPixel);
    newCanvas.style.position = 'absolute';
    newCanvas.style.left = pixelXOffset + "px";
    newCanvas.style.top = canvasTop + "px";
    drawConfiguration.context = ctx;
    ctx.translate(0, -canvasTop)
    draw.call(this, drawConfiguration, features, roiFeatures);
    // ctx.translate(0, canvasTop);
    // ctx.restore();

    this.canvasVerticalRange = {top: canvasTop, bottom: canvasTop + pixelHeight}

    if (self.canvas) {
        $(self.canvas).remove();
    }
    $(self.contentDiv).append(newCanvas);

    self.canvas = newCanvas;
    self.ctx = ctx;


};

/**
 *
 * @param tile - the tile is created whenever features are loaded.  It contains the genomic state
 * representing the features,as well as the features.  The object evolved, at one time it was an image tile.
 * Should be renamed.
 */
ViewPort.prototype.toSVG = async function (tile) {

    const genomicState = this.genomicState;
    const referenceFrame = genomicState.referenceFrame;
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

    draw.call(this, drawConfiguration, features, roiFeatures);

    return ctx.getSerializedSvg(true);

};

function draw(drawConfiguration, features, roiFeatures) {

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


function viewIsReady() {
    return this.browser && this.browser.genomicStateList && this.genomicState.referenceFrame;
}

function enableRulerTrackMouseHandlers() {

    const index = this.browser.genomicStateList.indexOf(this.genomicState);
    const namespace = '.ruler_track_viewport_' + index;

    // console.log(' enable ruler mouse handler ' + index);

    let self = this;
    this.$viewport.on('click' + namespace, (e) => {

        const pixel = translateMouseCoordinates(e, self.$viewport.get(0)).x;
        const bp = Math.round(self.genomicState.referenceFrame.start + self.genomicState.referenceFrame.toBP(pixel));

        let searchString;

        if (1 === self.browser.genomicStateList.length) {
            searchString = self.browser.genome.getChromosomeCoordinate(bp).chr;
        } else {

            let loci = self.browser.genomicStateList.map((genomicState) => {
                return genomicState.locusSearchString;
            });

            loci[self.browser.genomicStateList.indexOf(self.genomicState)] = self.browser.genome.getChromosomeCoordinate(bp).chr;

            searchString = loci.join(' ');
        }

        self.browser.search(searchString);
    });


}

function disableRulerTrackMouseHandlers() {


    const index = this.browser.genomicStateList.indexOf(this.genomicState);
    const namespace = '.ruler_track_viewport_' + index;

    // console.log('disable ruler mouse handler ' + index);

    this.$viewport.off(namespace);
}

ViewPort.prototype.setContentHeight = function (contentHeight) {
    // Maximum height of a canvas is ~32,000 pixels on Chrome, possibly smaller on other platforms
    contentHeight = Math.min(contentHeight, 32000);

    $(this.contentDiv).height(contentHeight);

    if (this.tile) this.tile.invalidate = true;
};

ViewPort.prototype.getContentHeight = function () {
    return $(this.contentDiv).height();
};

ViewPort.prototype.getContentTop = function () {
    return this.contentDiv.offsetTop;
}

ViewPort.prototype.isLoading = function () {
    return this.loading;
};

ViewPort.prototype.saveImage = function () {

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
    download(filename, data);
};

ViewPort.prototype.renderSVGContext = async function (context, offset) {

    let str = this.trackView.track.name || this.trackView.track.id;
    str = str.replace(/\W/g, '');

    const genomicStateIndex = this.browser.genomicStateList.indexOf(this.genomicState);
    const id = str.toLowerCase() + '_genomic_state_index_' + genomicStateIndex;

    // If present, paint axis canvas. Only in first multi-locus panel.
    if (0 === genomicStateIndex && typeof this.trackView.track.paintAxis === 'function') {

        const bbox = this.trackView.controlCanvas.getBoundingClientRect();
        context.addTrackGroupWithTranslationAndClipRect((id + '_axis'), offset.deltaX - bbox.width, offset.deltaY, bbox.width, bbox.height, 0);

        context.save();
        this.trackView.track.paintAxis(context, bbox.width, bbox.height);
        context.restore();
    }

    const yScrollDelta = $(this.contentDiv).position().top;
    const dx = offset.deltaX + (genomicStateIndex * context.multiLocusGap);
    const dy = offset.deltaY + yScrollDelta;
    const {width, height} = this.$viewport.get(0).getBoundingClientRect();

    context.addTrackGroupWithTranslationAndClipRect(id, dx, dy, width, height, -yScrollDelta);

    let {referenceFrame} = this.genomicState;
    let {start: bpStart, bpPerPixel} = referenceFrame;
    context.save();

    const drawConfig =
        {
            context: context,

            viewport: this,

            referenceFrame,

            genomicState: this.genomicState,

            pixelWidth: width,
            pixelHeight: height,

            viewportWidth: width,

            viewportContainerX: 0,
            viewportContainerWidth: this.browser.viewportContainerWidth(),

            bpStart,
            bpEnd: bpStart + (width * bpPerPixel),

            bpPerPixel,

            selection: this.selection
        };

    const features = this.tile ? this.tile.features : [];
    const roiFeatures = this.tile ? this.tile.roiFeatures : undefined;
    draw.call(this, drawConfig, features, roiFeatures);

    if (this.$trackLabel && true === this.browser.trackLabelsVisible) {
        renderTrackLabelSVG.call(this, context);
    }

    context.restore();

};

ViewPort.prototype.saveSVG = function () {

    const width = this.$viewport.width();
    const height = this.$viewport.height();

    const context = new C2S(
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

        });

    const { start, bpPerPixel } = this.genomicState.referenceFrame;

    const drawConfiguration =
        {
            viewport: this,
            context,
            top: -$(this.contentDiv).position().top,
            pixelTop: 0,
            pixelWidth: width,
            pixelHeight: height,
            bpStart: start,
            bpEnd: start + (width * bpPerPixel),
            bpPerPixel,
            referenceFrame: this.genomicState.referenceFrame,
            genomicState: this.genomicState,
            selection: this.selection,
            viewportWidth: width,
            viewportContainerX: 0,
            viewportContainerWidth: this.browser.viewportContainerWidth()
        };

    draw.call(this, drawConfiguration, this.tile.features);

    if (this.$trackLabel && true === this.browser.trackLabelsVisible) {
        renderTrackLabelSVG.call(this, context);
    }

    const svg = drawConfiguration.context.getSerializedSvg(true);

    const data = URL.createObjectURL(new Blob([ svg ], { type: "application/octet-stream" }));

    const str = this.$trackLabel ? this.$trackLabel.text() : this.trackView.track.id;
    const filename = str + ".svg";
    download(filename, data);

};

function renderTrackLabelSVG(context) {

        const { x, y, width, height } = relativeDOMBBox(this.$viewport.get(0), this.$trackLabel.get(0));

        const { width: stringWidth } = context.measureText(this.$trackLabel.text());
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

/**
 * Called when the associated track is removed.  Do any needed cleanup here.
 */
ViewPort.prototype.dispose = function () {
    const self = this;

    if (this.popover) {
        this.popover.$popover.off();
        this.popover.$popover.empty();
        this.popover.$popover.remove();
    }

    $(this.canvas).off();
    $(this.canvas).empty();

    $(this.contentDiv).off();
    $(this.contentDiv).empty();

    this.$viewport.off();
    this.$viewport.empty();

    // Null out all properties -- this should not be neccessary, but just in case there is a
    // reference to self somewhere we want to free memory.
    Object.keys(this).forEach(function (key, i, list) {
        self[key] = undefined;
    })
};

ViewPort.prototype.getCachedFeatures = function () {
    return this.tile ? this.tile.features : [];
};

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

        if (self.popover) self.popover.presentTrackContextMenu(e, menuItems);

    });


    /**
     * Mouse click down,  notify browser for potential drag (pan), and record position for potential click.
     */
    this.$viewport.on('mousedown', function (e) {
        self.enableClick = true;
        browser.mouseDownOnViewport(e, self);
        mouseDownCoords = pageCoordinates(e);
    });

    this.$viewport.on('touchstart', function (e) {
        self.enableClick = true;
        browser.mouseDownOnViewport(e, self);
        mouseDownCoords = pageCoordinates(e);
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

        const mouseX = translateMouseCoordinates(e, self.$viewport.get(0)).x;
        const mouseXCanvas = translateMouseCoordinates(e, self.canvas).x;
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
                browser.zoomWithScaleFactor(0.5, centerBP, self)
            }


        } else {
            // single-click

            if (e.shiftKey && typeof self.trackView.track.shiftClick === "function") {

                self.trackView.track.shiftClick(xBP, e);

            } else if (typeof self.trackView.track.popupData === "function") {

                popupTimerID = setTimeout(function () {

                        var content = getPopupContent(e, self);
                        if (content) {
                            const page = pageCoordinates(e);
                            self.popover.presentTrackContent(page.x, page.y, content);
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
        const viewportCoords = translateMouseCoordinates(e, viewport.contentDiv);
        const canvasCoords = translateMouseCoordinates(e, viewport.canvas);
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

async function getFeatures(chr, start, end, bpPerPixel) {

    const track = this.trackView.track;

    if (this.tile && this.tile.containsRange(chr, start, end, bpPerPixel)) {
        return this.tile.features;

    } else if (typeof track.getFeatures === "function") {
        const features = await track.getFeatures(chr, start, end, bpPerPixel, this);
        this.cachedFeatures = features;      // TODO -- associate with "tile"
        this.checkContentHeight();
        return features;
    } else {
        return undefined;
    }
}

ViewPort.prototype.checkContentHeight = function () {

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
