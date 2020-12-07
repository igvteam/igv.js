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


import $ from "./vendor/jquery-3.3.1.slim.js";
import {createViewport} from "./viewportFactory.js";
import RulerTrack from "./rulerTrack.js";
import MenuPopup from "./ui/menuPopup.js";
import MenuUtils from "./ui/menuUtils.js";
import {createIcon} from "./igv-icons.js";
import {doAutoscale} from "./util/igvUtils.js";
import {DOMUtils, IGVColor, StringUtils, FeatureUtils} from '../node_modules/igv-utils/src/index.js';
import {ColorPicker} from '../node_modules/igv-ui/dist/igv-ui.js';
import SampleNameViewport, { sampleNameViewportWidth } from './sampleNameViewport.js';
import TrackScrollbar from './trackScrollbar.js';

let dragged
let dragDestination

class TrackView {

    constructor(browser, $container, track) {

        this.browser = browser;
        this.track = track;

        track.trackView = this;

        const $track = $('<div class="igv-track">');
        this.trackDiv = $track.get(0);
        $container.append($track);

        this.namespace = '.trackview_' + DOMUtils.guid();

        if (track instanceof RulerTrack) {
            this.trackDiv.dataset.rulerTrack = "rulerTrack";
        }

        if (track.height) {
            this.trackDiv.style.height = track.height + "px";
        }

        // left hand gutter
        this.appendLeftHandGutter($track);

        this.$viewportContainer = $('<div class="igv-viewport-container">');
        $track.append(this.$viewportContainer);

        // this.sampleNameViewport = new SampleNameViewport(this, this.$viewportContainer, browser.referenceFrameList, sampleNameViewportWidth)
        this.sampleNameViewport = new SampleNameViewport(this, this.$viewportContainer, undefined, sampleNameViewportWidth)

        // viewport container DOM elements
        populateViewportContainer(browser, browser.referenceFrameList, this)

        // Track drag handle
        if ('ideogram' === track.type || 'ruler' === track.type) {
            // do nothing
        } else {
            this.attachDragWidget($track, this.$viewportContainer);
        }

        // right hand gutter
        if (true === track.ignoreTrackMenu) {
            // do nothing
        } else {
            this.appendRightHandGutter($track);
        }

        // color picker

        const trackColors = []
        const color = track.color || track.defaultColor;
        if (StringUtils.isString(color)) {
            trackColors.push(color);
        }

        if (track.altColor && StringUtils.isString(track.altColor)) {
            trackColors.push(track.altColor);
        }

        const defaultColors = trackColors.map(c => {
            return c.startsWith("#") ? c :
                c.startsWith("rgb(") ?
                    IGVColor.rgbToHex(c) :
                    IGVColor.colorNameToHex(c);
        });
        const options =
            {
                parent: this.trackDiv,
                top: undefined,
                left: undefined,
                width: 432,
                height: undefined,
                defaultColors,
                colorHandler: color => {
                    this.track.color = color;
                    this.repaintViews();
                }
            };

        this.colorPicker = new ColorPicker(options);

        // alt color picker -- TODO pass handler in at "show" time and use 1 color picker
        options.colorHandler = (color) => {
            this.track.altColor = color;
            this.repaintViews();
        }
        this.altColorPicker = new ColorPicker(options);


    }

    async renderSVGContext(context, { deltaX, deltaY }) {

        const list = [ this.sampleNameViewport, ...this.viewports ]

        let sampleNameViewportWidth = undefined
        for (let viewport of list) {

            const { y, width } = viewport.$viewport.get(0).getBoundingClientRect()

            if (0 === list.indexOf(viewport)) {

                await viewport.renderSVGContext(context, { deltaX, deltaY: y + deltaY })
                sampleNameViewportWidth = width
            } else {

                const index = viewport.browser.referenceFrameList.indexOf(viewport.referenceFrame)

                let offset =
                    {
                        deltaX: sampleNameViewportWidth + index * width + deltaX,
                        deltaY: y + deltaY
                    };

                await viewport.renderSVGContext(context, offset)
            }
        }
    }

    attachScrollbar($track, $viewportContainer, viewports) {

        if ("hidden" === $viewportContainer.find('.igv-viewport').css("overflow-y")) {
            this.scrollbar = new TrackScrollbar($viewportContainer, viewports)
            this.scrollbar.$outerScroll.insertAfter($viewportContainer)

            if ('ruler' === this.track.type || 'ideogram' === this.track.type) {
                this.scrollbar.disableMouseHandlers()
            }
        }

    }

    removeViewportForReferenceFrame(referenceFrame) {

        let index = -1;
        for (let i = 0; i < this.viewports.length; i++) {
            if (this.viewports[i].referenceFrame === referenceFrame) {
                index = i;
                break;
            }
        }

        if (index >= 0) {
            this.viewports[index].$viewport.remove();
            this.viewports.splice(index, 1);
            this.updateViewportForMultiLocus();
        }
    }

    updateViewportForMultiLocus() {

        if ('ruler' === this.track.type) {

            if (this.viewports.length > 1) {
                this.$viewportContainer.find('.igv-multi-locus-panel-close-container').show()
                this.$viewportContainer.find('.igv-multi-locus-panel-label-div').show()
                this.track.updateLocusLabel()
            } else {
                this.$viewportContainer.find('.igv-multi-locus-panel-close-container').hide()
                this.$viewportContainer.find('.igv-multi-locus-panel-label-div').hide()
            }

        }

    }

    appendLeftHandGutter($track) {

        const $leftHandGutter = $('<div class="igv-left-hand-gutter">');
        this.leftHandGutter = $leftHandGutter[0];
        $track.append($leftHandGutter);

        if (typeof this.track.paintAxis === 'function') {

            if (this.track.dataRange) {

                $leftHandGutter.click((e) => {
                    this.browser.dataRangeDialog.configure({trackView: self});
                    this.browser.dataRangeDialog.present($(self.trackDiv));
                });

                $leftHandGutter.addClass('igv-clickable');
            }

            const $canvas = $('<canvas class ="igv-canvas">');
            $leftHandGutter.append($canvas);
            this.controlCanvas = $canvas.get(0);
            this.resizeControlCanvas($leftHandGutter.outerWidth(), $leftHandGutter.outerHeight())
        }
    }

    dataRange() {
        return this.track.dataRange ? this.track.dataRange : undefined;
    }

    setDataRange(min, max) {
        if (min !== undefined) {
            this.track.dataRange.min = min;
        }
        if (max !== undefined) {
            this.track.dataRange.max = max;
        }
        this.track.autoscale = false;
        this.repaintViews();
    }

    presentColorPicker(option) {
        if (option === "altColor") {
            this.altColorPicker.show();
        } else {
            this.colorPicker.show();
        }
    }

    setTrackHeight(newHeight, force) {

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
            for (let vp of this.viewports) {
                vp.setContentHeight(newHeight);
            }
        }
        this.repaintViews();

        this.resizeControlCanvas($(this.leftHandGutter).outerWidth(), newHeight);

        if (this.scrollbar) {
            this.scrollbar.update();
        }
    }

    isLoading() {
        for (let i = 0; i < this.viewports.length; i++) {
            if (this.viewports[i].isLoading()) return true;
        }
    }

    resize(viewportWidth) {

        for (let viewport of this.viewports) {
            viewport.setWidth(viewportWidth);
        }

        const $leftHandGutter = $(this.leftHandGutter);
        this.resizeControlCanvas($leftHandGutter.outerWidth(), $leftHandGutter.outerHeight());

        this.updateViews(true);
    }

    /**
     * Repaint all viewports without loading any new data.   Use this for events that change visual aspect of data,
     * e.g. color, sort order, etc, but do not change the genomic state.
     */
    repaintViews() {

        for (let viewport of this.viewports) {
            viewport.repaint();
        }

        if (this.track.paintAxis) {
            this.track.paintAxis(this.controlCtx, $(this.controlCanvas).width(), $(this.controlCanvas).height());
        }
    }

    /**
     * Update viewports to reflect current genomic state, possibly loading additional data.
     */
    async updateViews(force) {

        if (!(this.browser && this.browser.referenceFrameList)) return;

        const visibleViewports = this.viewports.filter(vp => vp.isVisible())

        // Shift viewports left/right to current genomic state (pans canvas)
        visibleViewports.forEach(function (viewport) {
            viewport.shift();
        });

        // rpv: viewports whose image (canvas) does not fully cover current genomic range
        const rpV = this.viewportsToReload(force);

        // Trigger viewport to load features needed to cover current genomic range
        for (let vp of rpV) {
            await vp.loadFeatures()
        }

        if (this.disposed) return;   // Track was removed during load

        const isDragging = this.browser.dragObject;
        if (!isDragging && this.track.autoscale) {
            let allFeatures = [];
            for (let vp of visibleViewports) {
                const referenceFrame = vp.referenceFrame;
                const start = referenceFrame.start;
                const end = start + referenceFrame.toBP($(vp.contentDiv).width());
                if (vp.tile && vp.tile.features) {
                    if (typeof vp.tile.features.getMax === 'function') {
                        const max = vp.tile.features.getMax(start, end);
                        allFeatures.push({value: max});
                    } else {
                        allFeatures = allFeatures.concat(FeatureUtils.findOverlapping(vp.tile.features, start, end));
                    }
                }
            }
            if (typeof this.track.doAutoscale === 'function') {
                this.track.dataRange = this.track.doAutoscale(allFeatures);
            } else {
                this.track.dataRange = doAutoscale(allFeatures);
            }
        }


        // Must repaint all viewports if autoscaling
        if (!isDragging && (this.track.autoscale || this.track.autoscaleGroup)) {
            for (let vp of visibleViewports) {
                vp.repaint();
            }
        } else {
            for (let vp of rpV) {
                vp.repaint();
            }
        }

        this.adjustTrackHeight();
    }

    /**
     * Return a promise to get all in-view features.  Used for group autoscaling.
     */
    async getInViewFeatures(force) {

        if (!(this.browser && this.browser.referenceFrameList)) {
            return [];
        }

        // List of viewports that need reloading
        const rpV = this.viewportsToReload(force);
        const promises = rpV.map(function (vp) {
            return vp.loadFeatures();
        });

        await Promise.all(promises)

        let allFeatures = [];
        for (let vp of this.viewports) {
            if (vp.tile && vp.tile.features) {
                const referenceFrame = vp.referenceFrame;
                const start = referenceFrame.start;
                const end = start + referenceFrame.toBP($(vp.contentDiv).width());

                if (typeof vp.tile.features.getMax === 'function') {
                    const max = vp.tile.features.getMax(start, end);
                    allFeatures.push({value: max});
                } else {
                    allFeatures = allFeatures.concat(FeatureUtils.findOverlapping(vp.tile.features, start, end));
                }
            }
        }
        return allFeatures;
    }


    checkContentHeight() {
        this.viewports.forEach(function (vp) {
            vp.checkContentHeight();
        })
        this.adjustTrackHeight();
    }

    adjustTrackHeight() {

        var maxHeight = maxViewportContentHeight(this.viewports);
        if (this.track.autoHeight) {
            this.setTrackHeight(maxHeight, false);
        } else if (this.track.paintAxis) {   // Avoid duplication, paintAxis is already called in setTrackHeight
            this.track.paintAxis(this.controlCtx, $(this.controlCanvas).width(), $(this.controlCanvas).height());
        }

        if (this.scrollbar) {
            const currentTop = this.viewports[0].getContentTop();
            const heights = this.viewports.map((viewport) => viewport.getContentHeight());
            const minContentHeight = Math.min(...heights);
            const newTop = Math.min(0, this.$viewportContainer.height() - minContentHeight);
            if (currentTop < newTop) {
                this.viewports.forEach(function (viewport) {
                    $(viewport.contentDiv).css("top", newTop + "px");
                });
            }
            this.scrollbar.update();
        }
    }

    resizeControlCanvas(width, height) {

        var devicePixelRatio = window.devicePixelRatio;

        if (this.leftHandGutter) {

            if (this.controlCanvas) {
                $(this.controlCanvas).remove();
            }

            var $canvas = $('<canvas class ="igv-canvas">');
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

    attachDragWidget($track, $viewportContainer) {

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

    viewportsToReload(force) {

        // List of viewports that need reloading
        const rpV = this.viewports.filter(function (viewport) {
            if (!viewport.isVisible()) {
                return false;
            }
            if (!viewport.checkZoomIn()) {
                return false;
            } else {
                const referenceFrame = viewport.referenceFrame;
                const chr = viewport.referenceFrame.chr;
                const start = referenceFrame.start;
                const end = start + referenceFrame.toBP($(viewport.contentDiv).width());
                const bpPerPixel = referenceFrame.bpPerPixel;
                return force || (!viewport.tile || viewport.tile.invalidate || !viewport.tile.containsRange(chr, start, end, bpPerPixel));
            }
        });
        return rpV;
    }

    /**
     * Do any cleanup here
     */
    dispose() {

        const self = this;

        if (this.$trackManipulationHandle) {
            this.$trackManipulationHandle.off();
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

        this.disposed = true;
    }

    scrollBy(delta) {
        this.scrollbar.moveScrollerBy(delta);
    }

    appendRightHandGutter($parent) {
        let $div = $('<div class="igv-right-hand-gutter">')
        $parent.append($div)
        this.createTrackGearPopup($div)
    }

    createTrackGearPopup($parent) {

        let $container = $("<div>", {class: 'igv-trackgear-container'});
        $parent.append($container);

        $container.append(createIcon('cog'));

        this.trackGearPopup = new MenuPopup($parent);
        this.trackGearPopup.$popover.hide();

        $container.click(e => {
            e.preventDefault();
            e.stopPropagation();
            this.trackGearPopup.presentMenuList(-(this.trackGearPopup.$popover.width()), 0, MenuUtils.trackMenuItemList(this));
        });
    }
}


function emptyViewportContainers(trackViews) {

    for (let trackView of trackViews) {

        if (trackView.scrollbar) {
            trackView.scrollbar.$outerScroll.remove()
            trackView.scrollbar = null
            trackView.scrollbar = undefined
        }

        for (let viewport of trackView.viewports) {

            if (viewport.rulerSweeper) {
                viewport.rulerSweeper.$rulerSweeper.remove();
            }

            if (viewport.popover) {
                viewport.popover.dispose()
            }

            viewport.$viewport.remove();
        }

        delete trackView.viewports;

        delete trackView.scrollbar;
    }
}

function populateViewportContainer(browser, referenceFrameList, trackView) {

    const width = browser.computeViewportWidth(referenceFrameList.length, browser.getViewportContainerWidth());

    trackView.viewports = [];

    for (let referenceFrame of referenceFrameList) {
        const viewport = createViewport(trackView, referenceFrameList, referenceFrameList.indexOf(referenceFrame), width)
        trackView.viewports.push(viewport);
    }

    updateViewportShims(trackView.viewports, trackView.$viewportContainer)

    trackView.updateViewportForMultiLocus();

    trackView.attachScrollbar($(trackView.trackDiv), trackView.$viewportContainer, [...trackView.viewports, trackView.sampleNameViewport])

}

function updateViewportShims(viewports, $viewportContainer) {

    const $trackContainer = $('.igv-track-container')
    $trackContainer.find('.igv-multi-locus-separator').remove()

    const {x: tx} = documentOffset($trackContainer.get(0))

    $viewportContainer.find('.igv-viewport-multi-locus-gap-shim').remove()

    if (viewports.length > 1) {
        for (let viewport of viewports) {
            if (viewports.indexOf(viewport) <= viewports.length - 2) {
                const {$viewport} = viewport

                const $shim = $('<div class="igv-viewport-multi-locus-gap-shim">')
                $shim.insertAfter($viewport);

                const {x: sx} = documentOffset($shim.get(0))
                // console.log(`trackContainer x ${ tx }. shim x ${ sx }`)

                const $multilLocusSeparator = $('<div class="igv-multi-locus-separator">')
                $trackContainer.append($multilLocusSeparator)
                $multilLocusSeparator.get(0).style.left = `${sx - tx}px`

            }
        }
    }

}

function documentOffset(el) {
    const {x, y} = el.getBoundingClientRect()
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft
    const scrollY = window.pageYOffset || document.documentElement.scrollTop
    return {x: x + scrollX, y: y + scrollY}
}

function maxViewportContentHeight(viewports) {
    const heights = viewports.map(viewport => viewport.getContentHeight());
    return Math.max(...heights);
}

export {maxViewportContentHeight, updateViewportShims, emptyViewportContainers, populateViewportContainer}

export default TrackView
