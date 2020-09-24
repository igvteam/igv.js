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
import {DOMUtils, IGVColor} from '../node_modules/igv-utils/src/index.js';
import {ColorPicker} from '../node_modules/igv-ui/dist/igv-ui.js';

var dragged,
    dragDestination;

const TrackView = function (browser, $container, track) {

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
    const width = browser.calculateViewportWidth(browser.genomicStateList.length);

    // console.log(`TrackView ${ track.id }`);

    for (let genomicState of browser.genomicStateList) {
        const viewport = createViewport(this, browser.genomicStateList, browser.genomicStateList.indexOf(genomicState), width)
        this.viewports.push(viewport);
    }

    updateViewportShims(this.viewports, this.$viewportContainer)

    this.updateViewportForMultiLocus();

    const exclude = new Set(['ruler', 'sequence', 'ideogram']);

    if (false === exclude.has(this.track.type)) {
        this.attachScrollbar(this.$viewportContainer, this.viewports);
    }

    if (true === this.track.ignoreTrackMenu) {
        // do nothing
    } else {
        this.appendRightHandGutter($track);
    }

    if ('ideogram' === this.track.type || 'ruler' === this.track.type) {
        // do nothing
    } else {
        attachDragWidget.call(this, $track, this.$viewportContainer);
    }

    if (false === exclude.has(this.track.type)) {

        const config =
            {
                parent: this.trackDiv,
                top: undefined,
                left: undefined,
                width: 432,
                height: undefined,
                defaultColors: [this.track.color].map(rgb => IGVColor.rgbToHex(rgb)),
                colorHandler: rgb => this.setColor(rgb)
            };

        this.colorPicker = new ColorPicker(config);
    }

};

TrackView.prototype.renderSVGContext = function (context, offset) {

    for (let viewport of this.viewports) {

        const index = viewport.browser.genomicStateList.indexOf(viewport.genomicState);
        const {y, width} = viewport.$viewport.get(0).getBoundingClientRect();

        let o =
            {
                deltaX: offset.deltaX + index * width,
                deltaY: offset.deltaY + y
            };

        viewport.renderSVGContext(context, o);
    }

};

TrackView.prototype.attachScrollbar = function ($viewportContainer, viewports) {

    if ("hidden" === $viewportContainer.css("overflow-y")) {
        this.scrollbar = new TrackScrollbar($viewportContainer, viewports);
        $viewportContainer.append(this.scrollbar.$outerScroll);
    }

};

TrackView.prototype.removeViewportWithLocusIndex = function (index) {

    this.viewports[index].$viewport.remove();
    this.viewports.splice(index, 1);

    this.updateViewportForMultiLocus();
};

TrackView.prototype.updateViewportForMultiLocus = function () {

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

};

TrackView.prototype.appendLeftHandGutter = function ($parent) {

    var self = this,
        $leftHandGutter,
        $canvas;

    $leftHandGutter = $('<div class="igv-left-hand-gutter">');
    this.leftHandGutter = $leftHandGutter[0];
    $parent.append($leftHandGutter);

    if (typeof this.track.paintAxis === 'function') {

        if (this.track.dataRange) {

            $leftHandGutter.click(function (e) {
                self.browser.dataRangeDialog.configure({trackView: self});
                self.browser.dataRangeDialog.present($(self.trackDiv));
            });

            $leftHandGutter.addClass('igv-clickable');
        }

        $canvas = $('<canvas class ="igv-canvas">');
        $leftHandGutter.append($canvas);
        this.controlCanvas = $canvas.get(0);
        resizeControlCanvas.call(this, $leftHandGutter.outerWidth(), $leftHandGutter.outerHeight())

    }

}

TrackView.prototype.appendRightHandGutter = function ($parent) {
    let $div = $('<div class="igv-right-hand-gutter">');
    $parent.append($div);
    createTrackGearPopover.call(this, $div);
}

// Free function for juicebox -- do not attach to prototype!!!
function createTrackGearPopover($parent) {

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

function resizeControlCanvas(width, height) {

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

function attachDragWidget($track, $viewportContainer) {

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

TrackView.prototype.dataRange = function () {
    return this.track.dataRange ? this.track.dataRange : undefined;
};

TrackView.prototype.setDataRange = function (min, max) {
    if (min !== undefined) {
        this.track.dataRange.min = min;
    }
    if (max !== undefined) {
        this.track.dataRange.max = max;
    }
    this.repaintViews();
}

TrackView.prototype.setColor = function (color) {
    this.track.color = color;
    this.track.config.color = color;
    this.repaintViews(true);
};

TrackView.prototype.presentColorPicker = function () {
    this.colorPicker.show();
};

TrackView.prototype.setTrackHeight = function (newHeight, update, force) {

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


    resizeControlCanvas.call(this, $(this.leftHandGutter).outerWidth(), newHeight);


    if (this.track.paintAxis) {
        this.track.paintAxis(this.controlCtx, $(this.controlCanvas).width(), $(this.controlCanvas).height());
    }

    if (this.scrollbar) {
        this.scrollbar.update();
    }
}

TrackView.prototype.isLoading = function () {
    for (let i = 0; i < this.viewports.length; i++) {
        if (this.viewports[i].isLoading()) return true;
    }
};

TrackView.prototype.resize = function () {

    const viewportWidth = this.browser.calculateViewportWidth(this.browser.genomicStateList.length)

    for (let viewport of this.viewports) {
        viewport.setWidth(viewportWidth);
    }

    const $leftHandGutter = $(this.leftHandGutter);
    resizeControlCanvas.call(this, $leftHandGutter.outerWidth(), $leftHandGutter.outerHeight());

    this.updateViews(true);

};

/**
 * Repaint all viewports without loading any new data.   Use this for events that change visual aspect of data,
 * e.g. color, sort order, etc, but do not change the genomic state.
 */
TrackView.prototype.repaintViews = function () {
    this.viewports.forEach(function (viewport) {
        viewport.repaint();
    });
    if (this.track.paintAxis) {
        this.track.paintAxis(this.controlCtx, $(this.controlCanvas).width(), $(this.controlCanvas).height());
    }
}

/**
 * Update viewports to reflect current genomic state, possibly loading additional data.
 */
TrackView.prototype.updateViews = async function (force) {

    if (!(this.browser && this.browser.genomicStateList)) return;

    const visibleViewports = this.viewports.filter(vp => vp.isVisible())

    // Shift viewports left/right to current genomic state (pans canvas)
    visibleViewports.forEach(function (viewport) {
        viewport.shift();
    });

    // rpv: viewports whose image (canvas) does not fully cover current genomic range
    const rpV = viewportsToReload.call(this, force);

    // Trigger viewport to load features needed to cover current genomic range
    for (let vp of rpV) {
        await vp.loadFeatures()
    }

    if (this.disposed) return;   // Track was removed during load

    const isDragging = this.browser.dragObject;
    if (!isDragging && this.track.autoscale) {
        let allFeatures = [];
        for (let vp of visibleViewports) {
            const referenceFrame = vp.genomicState.referenceFrame;
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

    adjustTrackHeight.call(this);

}

/**
 * Return a promise to get all in-view features.  Used for group autoscaling.
 */
TrackView.prototype.getInViewFeatures = async function (force) {

    if (!(this.browser && this.browser.genomicStateList)) {
        return [];
    }

    // List of viewports that need reloading
    const rpV = viewportsToReload.call(this, force);
    const promises = rpV.map(function (vp) {
        return vp.loadFeatures();
    });

    await Promise.all(promises)

    let allFeatures = [];
    for (let vp of this.viewports) {
        if (vp.tile && vp.tile.features) {
            const referenceFrame = vp.genomicState.referenceFrame;
            const start = referenceFrame.start;
            const end = start + referenceFrame.toBP($(vp.contentDiv).width());
            allFeatures = allFeatures.concat(FeatureUtils.findOverlapping(vp.tile.features, start, end));
        }
    }
    return allFeatures;
};

function updateViewportShims(viewports, $viewportContainer) {

    const $trackContainer = $('#igv-track-container')
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

function viewportsToReload(force) {

    // List of viewports that need reloading
    const rpV = this.viewports.filter(function (viewport) {
        if (!viewport.isVisible()) {
            return false;
        }
        if (!viewport.checkZoomIn()) {
            return false;
        } else {
            const referenceFrame = viewport.genomicState.referenceFrame;
            const chr = viewport.genomicState.chromosome.name;
            const start = referenceFrame.start;
            const end = start + referenceFrame.toBP($(viewport.contentDiv).width());
            const bpPerPixel = referenceFrame.bpPerPixel;
            return force || (!viewport.tile || viewport.tile.invalidate || !viewport.tile.containsRange(chr, start, end, bpPerPixel));
        }
    });
    return rpV;
}

TrackView.prototype.checkContentHeight = function () {
    this.viewports.forEach(function (vp) {
        vp.checkContentHeight();
    })
    adjustTrackHeight.call(this);
}

function adjustTrackHeight() {

    var maxHeight = maxViewportContentHeight(this.viewports);
    if (this.track.autoHeight) {
        this.setTrackHeight(maxHeight, false);
    } else if (this.track.paintAxis) {   // Avoid duplication, paintAxis is already called in setTrackHeight
        this.track.paintAxis(this.controlCtx, $(this.controlCanvas).width(), $(this.controlCanvas).height());
    }

    if (this.scrollbar) {
        const currentTop = this.viewports[0].getContentTop();
        const newTop = Math.min(0, this.$viewportContainer.height() - minContentHeight(this.viewports));
        if (currentTop < newTop) {
            this.viewports.forEach(function (viewport) {
                $(viewport.contentDiv).css("top", newTop + "px");
            });
        }
        this.scrollbar.update();
    }
}

function maxViewportContentHeight(viewports) {
    const heights = viewports.map(viewport => viewport.getContentHeight());
    return Math.max(...heights);
}

function minContentHeight(viewports) {
    const heights = viewports.map((viewport) => viewport.getContentHeight());
    return Math.min(...heights);
}

/**
 * Do any cleanup here
 */
TrackView.prototype.dispose = function () {

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
};


TrackView.prototype.scrollBy = function (delta) {
    this.scrollbar.moveScrollerBy(delta);
};


function TrackScrollbar($viewportContainer, viewports) {

    const self = this;
    let lastY;

    const namespace = '.trackscrollbar' + DOMUtils.guid();
    this.namespace = namespace;

    this.$outerScroll = $('<div class="igv-scrollbar-outer-div">');
    this.$innerScroll = $('<div>');

    this.$outerScroll.append(this.$innerScroll);

    this.$viewportContainer = $viewportContainer;
    this.viewports = viewports;

    this.$innerScroll.on("mousedown", mouseDown);

    this.$innerScroll.on("click", function (event) {
        event.stopPropagation();
    });

    this.$outerScroll.on("click", function (event) {
        self.moveScrollerBy(event.offsetY - self.$innerScroll.height() / 2);
        event.stopPropagation();

    });

    function mouseDown(event) {

        event.preventDefault();

        const page = DOMUtils.pageCoordinates(event);

        lastY = page.y;

        $(document).on('mousemove' + namespace, mouseMove);
        $(document).on('mouseup' + namespace, mouseUp);
        $(document).on('mouseleave' + namespace, mouseUp);

        // prevents start of horizontal track panning)
        event.stopPropagation();
    }

    function mouseMove(event) {

        event.preventDefault();
        event.stopPropagation();

        const page = DOMUtils.pageCoordinates(event);
        self.moveScrollerBy(page.y - lastY);
        lastY = page.y;

    }

    function mouseUp(event) {
        $(document).off(self.namespace);
    }

};

TrackScrollbar.prototype.moveScrollerBy = function (delta) {

    const y = this.$innerScroll.position().top + delta;
    this.moveScrollerTo(y);

}

TrackScrollbar.prototype.moveScrollerTo = function (y) {


    const outerScrollHeight = this.$outerScroll.height();
    const innerScrollHeight = this.$innerScroll.height();

    const newTop = Math.min(Math.max(0, y), outerScrollHeight - innerScrollHeight);

    const contentDivHeight = maxViewportContentHeight(this.viewports);
    const contentTop = -Math.round(newTop * (contentDivHeight / this.$viewportContainer.height()));

    this.$innerScroll.css("top", newTop + "px");

    this.viewports.forEach(function (viewport) {
        viewport.setTop(contentTop)
    });

}

TrackScrollbar.prototype.dispose = function () {
    $(window).off(this.namespace);
    this.$innerScroll.off();
};

TrackScrollbar.prototype.update = function () {

    const viewportContainerHeight = this.$viewportContainer.height();

    const viewportContentHeight = maxViewportContentHeight(this.viewports);

    const innerScrollHeight = Math.round((viewportContainerHeight / viewportContentHeight) * viewportContainerHeight);

    // this.$outerScroll.show();
    // this.$innerScroll.height(innerScrollHeight);
    if (viewportContentHeight > viewportContainerHeight) {
        this.$outerScroll.show();
        this.$innerScroll.height(innerScrollHeight);
    } else {
        this.$outerScroll.hide();
    }
};

export {maxViewportContentHeight, updateViewportShims}
export default TrackView
