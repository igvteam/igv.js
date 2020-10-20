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
import FeatureUtils from "./feature/featureUtils.js";
import RulerTrack from "./rulerTrack.js";
import TrackGearPopover from "./ui/trackGearPopover.js";
import MenuUtils from "./ui/menuUtils.js";
import {createIcon} from "./igv-icons.js";
import {doAutoscale} from "./util/igvUtils.js";
import {DOMUtils, IGVColor, StringUtils} from '../node_modules/igv-utils/src/index.js';
import {ColorPicker} from '../node_modules/igv-ui/dist/igv-ui.js';

var dragged,
    dragDestination;

class TrackView {

    constructor(browser, $container, track) {

        this.browser = browser;
        this.track = track;
        track.trackView = this;

        const $track = $('<div class="igv-track">');
        this.trackDiv = $track.get(0);
        $container.append($track);

        this.namespace = '.trackview_' + DOMUtils.guid();

        if (this.track instanceof RulerTrack) {
            this.trackDiv.dataset.rulerTrack = "rulerTrack";
        }

        if (track.height) {
            this.trackDiv.style.height = track.height + "px";
        }

        this.appendLeftHandGutter($track);

        this.$viewportContainer = $('<div class="igv-viewport-container">');
        $track.append(this.$viewportContainer);

        this.viewports = [];
        const width = browser.calculateViewportWidth(browser.referenceFrameList.length);

        for (let referenceFrame of browser.referenceFrameList) {
            const viewport = createViewport(this, browser.referenceFrameList, browser.referenceFrameList.indexOf(referenceFrame), width)
            this.viewports.push(viewport);
        }

        updateViewportShims(this.viewports, this.$viewportContainer)

        this.updateViewportForMultiLocus();

        const exclude = new Set(['ruler', 'sequence', 'ideogram']);

        if (false === exclude.has(this.track.type)) {
            this.attachScrollbar($track, this.$viewportContainer, this.viewports)
        } else {
            const $shim = $('<div>', { class: 'igv-scrollbar-shim' })
            $track.append($shim)
        }

        if (true === this.track.ignoreTrackMenu) {
            // do nothing
        } else {
            this.appendRightHandGutter($track);
        }

        if ('ideogram' === this.track.type || 'ruler' === this.track.type) {
            // do nothing
        } else {
            this.attachDragWidget($track, this.$viewportContainer);
        }

        if (false === exclude.has(this.track.type)) {

            const defaultColors = this.track.color && StringUtils.isString(this.trackColor) ?
                [this.track.color].map(rgb => IGVColor.rgbToHex(rgb)) :
                undefined;

            const config =
                {
                    parent: this.trackDiv,
                    top: undefined,
                    left: undefined,
                    width: 432,
                    height: undefined,
                    defaultColors,
                    colorHandler: rgb => this.setColor(rgb)
                };

            this.colorPicker = new ColorPicker(config);
        }

    }

    renderSVGContext(context, offset) {

        for (let viewport of this.viewports) {

            const index = viewport.browser.referenceFrameList.indexOf(viewport.referenceFrame);
            const {y, width} = viewport.$viewport.get(0).getBoundingClientRect();

            let o =
                {
                    deltaX: offset.deltaX + index * width,
                    deltaY: offset.deltaY + y
                };

            viewport.renderSVGContext(context, o);
        }

    }

    attachScrollbar($track, $viewportContainer, viewports) {

        if ("hidden" === $viewportContainer.css("overflow-y")) {
            this.scrollbar = new TrackScrollbar($viewportContainer, viewports);
            $track.append(this.scrollbar.$outerScroll);
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

    appendLeftHandGutter($parent) {

        const $leftHandGutter = $('<div class="igv-left-hand-gutter">');
        this.leftHandGutter = $leftHandGutter[0];
        $parent.append($leftHandGutter);

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

    appendRightHandGutter($parent) {
        let $div = $('<div class="igv-right-hand-gutter">');
        $parent.append($div);
        this.createTrackGearPopover($div);
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
        this.repaintViews();
    }

    setColor(color) {
        this.track.color = color;
        this.track.config.color = color;
        this.repaintViews(true);
    }

    presentColorPicker() {
        this.colorPicker.show();
    }

    setTrackHeight(newHeight, update, force) {

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
            this.viewports.forEach(function (vp) {
                vp.setContentHeight(newHeight);
                if (vp.tile) vp.tile.invalidate = true;
            });
            this.repaintViews();
        }

        this.resizeControlCanvas($(this.leftHandGutter).outerWidth(), newHeight);

        if (this.track.paintAxis) {
            this.track.paintAxis(this.controlCtx, $(this.controlCanvas).width(), $(this.controlCanvas).height());
        }

        if (this.scrollbar) {
            this.scrollbar.update();
        }
    }

    isLoading() {
        for (let i = 0; i < this.viewports.length; i++) {
            if (this.viewports[i].isLoading()) return true;
        }
    }

    resize() {

        const viewportWidth = this.browser.calculateViewportWidth(this.browser.referenceFrameList.length)

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
                    allFeatures = allFeatures.concat(FeatureUtils.findOverlapping(vp.tile.features, start, end));
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
                allFeatures = allFeatures.concat(FeatureUtils.findOverlapping(vp.tile.features, start, end));
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

    createTrackGearPopover($parent) {

        let $trackGearContainer = $("<div>", {class: 'igv-trackgear-container'});
        $parent.append($trackGearContainer);

        $trackGearContainer.append(createIcon('cog'));

        this.trackGearPopover = new TrackGearPopover($parent);
        this.trackGearPopover.$popover.hide();

        $trackGearContainer.click(e => {
            e.preventDefault();
            e.stopPropagation();
            this.trackGearPopover.presentMenuList(-(this.trackGearPopover.$popover.width()), 0, MenuUtils.trackMenuItemList(this));
        });
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

class TrackScrollbar {

    constructor($viewportContainer, viewports) {

        let lastY;

        // Define mouse events first, use arrow function so "this" is in scope

        const mouseMove = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const page = DOMUtils.pageCoordinates(event);
            this.moveScrollerBy(page.y - lastY);
            lastY = page.y;
        }

        const mouseUp = (event) => {
            $(document).off(this.namespace);
        }

        const mouseDown = (event) => {
            event.preventDefault();
            const page = DOMUtils.pageCoordinates(event);
            lastY = page.y;
            $(document).on('mousemove' + namespace, mouseMove);
            $(document).on('mouseup' + namespace, mouseUp);
            $(document).on('mouseleave' + namespace, mouseUp);

            // prevents start of horizontal track panning)
            event.stopPropagation();
        }


        const namespace = '.trackscrollbar' + DOMUtils.guid();
        this.namespace = namespace;

        this.$outerScroll = $('<div class="igv-scrollbar-outer-div">');
        this.$innerScroll = $('<div>');

        this.$outerScroll.append(this.$innerScroll);

        this.$viewportContainer = $viewportContainer;
        this.viewports = viewports;

        this.$innerScroll.on("mousedown", mouseDown);

        this.$innerScroll.on("click", (event) => {
            event.stopPropagation();
        });

        this.$outerScroll.on("click", (event) => {
            this.moveScrollerBy(event.offsetY - this.$innerScroll.height() / 2);
            event.stopPropagation();

        });
    }

    moveScrollerBy(delta) {
        const y = this.$innerScroll.position().top + delta;
        this.moveScrollerTo(y);
    }

    moveScrollerTo(y) {

        const outerScrollHeight = this.$outerScroll.height();
        const innerScrollHeight = this.$innerScroll.height();

        const newTop = Math.min(Math.max(0, y), outerScrollHeight - innerScrollHeight);

        const contentDivHeight = maxViewportContentHeight(this.viewports);
        const contentTop = -Math.round(newTop * (contentDivHeight / this.$viewportContainer.height()));

        this.$innerScroll.css("top", newTop + "px");

        for (let viewport of this.viewports) {
            viewport.setTop(contentTop)
        }

    }

    dispose() {
        $(window).off(this.namespace);
        this.$innerScroll.off();
    }

    update() {

        const viewportContainerHeight = this.$viewportContainer.height();

        const viewportContentHeight = maxViewportContentHeight(this.viewports);

        const innerScrollHeight = Math.round((viewportContainerHeight / viewportContentHeight) * viewportContainerHeight);

        if (viewportContentHeight > viewportContainerHeight) {
            this.$innerScroll.show();
            this.$innerScroll.height(innerScrollHeight);
        } else {
            this.$innerScroll.hide();
        }
    }
}

export {maxViewportContentHeight, updateViewportShims}
export default TrackView
