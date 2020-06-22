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
import ViewPort from "./viewport.js";
import FeatureUtils from "./feature/featureUtils.js";
import RulerTrack from "./rulerTrack.js";
import TrackGearPopover from "./ui/trackGearPopover.js";
import GenericContainer from "./ui/genericContainer.js";
import MenuUtils from "./ui/menuUtils.js";
import {createIcon} from "./igv-icons.js";
import {guid, pageCoordinates} from "./util/domUtils.js";
import {doAutoscale} from "./util/igvUtils.js";
import {createColorSwatchSelector} from "./ui/ui-utils.js"


var dragged,
    dragDestination;

const TrackView = function (browser, $container, track) {

    var self = this,
        width,
        $track;

    this.browser = browser;
    this.track = track;
    track.trackView = this;

    $track = $('<div class="igv-track-div">');
    this.trackDiv = $track.get(0);
    $container.append($track);

    this.namespace = '.trackview_' + guid();

    if (this.track instanceof RulerTrack) {
        this.trackDiv.dataset.rulerTrack = "rulerTrack";
    }

    if (track.height) {
        this.trackDiv.style.height = track.height + "px";
    }

    this.appendLeftHandGutter($(this.trackDiv));

    // if (typeof track.paintAxis === 'function') {
    //     appendLeftHandGutter.call(this, $(this.trackDiv));
    // }

    this.$viewportContainer = $('<div class="igv-viewport-container">');
    $(this.trackDiv).append(this.$viewportContainer);

    this.viewports = [];
    width = this.browser.viewportContainerWidth() / this.browser.genomicStateList.length;
    browser.genomicStateList.forEach(function (genomicState) {

        var viewport;
        viewport = new ViewPort(self, self.$viewportContainer, genomicState, width);
        self.viewports.push(viewport);

    });

    this.decorateViewports();

    this.configureViewportContainer(this.$viewportContainer, this.viewports);

    if (true === this.track.ignoreTrackMenu) {
        // do nothing
    } else {
        this.appendRightHandGutter($(this.trackDiv));
    }

    if (this.track instanceof RulerTrack) {
        // do nuthin
    } else {
        attachDragWidget.call(this, $(this.trackDiv), this.$viewportContainer);
    }

    if ("sequence" === this.track.type) {
        // do nothing
    } else if (this.track instanceof RulerTrack) {
        // do nothing
    } else {
        this.createColorPicker();
    }


};

TrackView.prototype.renderSVGContext = function (context, offset) {

    for (let viewport of this.viewports) {

        const index = viewport.browser.genomicStateList.indexOf(viewport.genomicState);
        const bbox = viewport.$viewport.get(0).getBoundingClientRect();

        let o =
            {
                deltaX: offset.deltaX + index * viewport.$viewport.width(),
                deltaY: offset.deltaY + bbox.y
            };

        viewport.renderSVGContext(context, o);
    }

};

TrackView.prototype.configureViewportContainer = function ($viewportContainer, viewports) {

    if ("hidden" === $viewportContainer.css("overflow-y")) {

        this.scrollbar = new TrackScrollbar($viewportContainer, viewports, this.browser.$root);

        $viewportContainer.append(this.scrollbar.$outerScroll);
    }

    return $viewportContainer;
};

TrackView.prototype.removeViewportWithLocusIndex = function (index) {

    this.viewports[index].$viewport.remove();
    this.viewports.splice(index, 1);

    this.decorateViewports();
};

TrackView.prototype.decorateViewports = function () {
    var self = this;

    this.viewports.forEach(function (viewport, index) {
        var $viewport;

        $viewport = viewport.$viewport;

        if (self.viewports.length > 1) {
            $viewport.find('.igv-multi-locus-panel-close-container').show();
            $viewport.find('.igv-multi-locus-panel-label-div').show();
        } else {
            $viewport.find('.igv-multi-locus-panel-close-container').hide();
            $viewport.find('.igv-multi-locus-panel-label-div').hide();
        }

        if (index < self.viewports.length && (1 + index) !== self.viewports.length) {
            $viewport.addClass('igv-viewport-div-border-right');
        } else {
            $viewport.removeClass('igv-viewport-div-border-right');
        }

    });

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

        $canvas = $('<canvas class ="igv-track-control-canvas">');
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

    let $cogContainer = $("<div>", {class: 'igv-trackgear-container'});
    $parent.append($cogContainer);

    $cogContainer.append(createIcon('cog'));

    this.trackGearPopover = new TrackGearPopover($parent);
    this.trackGearPopover.$popover.hide();

    let self = this;
    $cogContainer.click(function (e) {
        e.preventDefault();
        e.stopPropagation();
        self.trackGearPopover.presentMenuList(-(self.trackGearPopover.$popover.width()), 0, MenuUtils.trackMenuItemList(self));
    });

}

function resizeControlCanvas(width, height) {

    var devicePixelRatio = window.devicePixelRatio;

    if (this.leftHandGutter) {

        if (this.controlCanvas) {
            $(this.controlCanvas).remove();
        }

        var $canvas = $('<canvas class ="igv-track-control-canvas">');
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

TrackView.prototype.setDataRange = function (min, max, autoscale) {

    if (min !== undefined) {
        this.track.dataRange.min = min;
        this.track.config.min = min;
    }

    if (max !== undefined) {
        this.track.dataRange.max = max;
        this.track.config.max = max;
    }

    this.track.autoscale = autoscale;
    this.track.config.autoScale = autoscale;

    if (autoscale) {
        this.updateViews();
    } else {
        this.repaintViews();
    }
};

TrackView.prototype.setColor = function (color) {
    this.track.color = color;
    this.track.config.color = color;
    this.repaintViews(true);
};

TrackView.prototype.createColorPicker = function () {

    const config =
        {
            $parent: $(this.trackDiv),

            width: 384,

            height: undefined,
            closeHandler: () => {
                this.colorPicker.$container.hide();
                this.colorPicker.$container.get(0).style.top = 0;
                this.colorPicker.$container.get(0).style.left = 0;
            }
        };

    this.colorPicker = new GenericContainer(config);

    createColorSwatchSelector(this.colorPicker.$container, rgb => this.setColor(rgb), this.track.color);

    this.colorPicker.$container.hide();

};

TrackView.prototype.presentColorPicker = function () {
    this.colorPicker.$container.get(0).style.top = 0;
    this.colorPicker.$container.get(0).style.left = 0;
    this.colorPicker.$container.show();
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

    var width;

    width = this.browser.viewportContainerWidth() / this.browser.genomicStateList.length;

    if (width === 0) return;
    this.viewports.forEach(function (viewport) {
        viewport.setWidth(width);
    });

    var $leftHandGutter = $(this.leftHandGutter);
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
 * Functional code to execute a series of promises (actually promise factories) sequntially.
 * Credit: Joel Thoms  https://hackernoon.com/functional-javascript-resolving-promises-sequentially-7aac18c4431e
 *
 * @param funcs
 */
const promiseSerial = funcs =>
    funcs.reduce((promise, func) =>
            promise.then(result => func().then(Array.prototype.concat.bind(result))),
        Promise.resolve([]))


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
        // if (vp.tile && vp.tile.features && vp.tile.features.length === 0 && 'all' === vp.genomicState.referenceFrame.chrName) {
        //     vp.checkZoomIn();
        // }
    }

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
            const chr = referenceFrame.chrName;
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

    var maxHeight = this.maxContentHeight();
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

TrackView.prototype.maxContentHeight = function () {
    return maxContentHeight(this.viewports);
}

function maxContentHeight(viewports) {
    const heights = viewports.map((viewport) => viewport.getContentHeight());
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

};


TrackView.prototype.scrollBy = function (delta) {
    this.scrollbar.moveScrollerBy(delta);
};


const TrackScrollbar = function ($viewportContainer, viewports, rootDiv) {

    const self = this;
    let lastY;

    const namespace = '.trackscrollbar' + guid();
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

        const page = pageCoordinates(event);

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

        const page = pageCoordinates(event);
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

    const contentDivHeight = maxContentHeight(this.viewports);
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

    var viewportContainerHeight,
        contentHeight,
        newInnerHeight;

    viewportContainerHeight = this.$viewportContainer.height();

    contentHeight = maxContentHeight(this.viewports);

    newInnerHeight = Math.round((viewportContainerHeight / contentHeight) * viewportContainerHeight);

    if (contentHeight > viewportContainerHeight) {
        this.$outerScroll.show();
        this.$innerScroll.height(newInnerHeight);
    } else {
        this.$outerScroll.hide();
    }
};

export default TrackView
