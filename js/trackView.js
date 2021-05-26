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
import {doAutoscale} from "./util/igvUtils.js";
import {DOMUtils, IGVColor, StringUtils, FeatureUtils} from '../node_modules/igv-utils/src/index.js';
import {ColorPicker} from '../node_modules/igv-ui/dist/igv-ui.js';
import SampleNameViewport from './sampleNameViewport.js';
import TrackScrollbarControl from "./trackScrollbarControl.js";
import {randomRGB} from "./util/colorPalletes.js";

const scrollbarExclusionTypes = new Set(['ruler', 'sequence', 'ideogram'])
const colorPickerExclusionTypes = new Set(['ruler', 'sequence', 'ideogram'])

class TrackView {

    constructor(browser, columnContainer, track) {

        this.browser = browser;
        this.track = track;
        track.trackView = this;

        // add columns to columnContainer. One column per reference frame
        this.addDOMToColumnContainer(browser, columnContainer, browser.referenceFrameList)

        // colorPicker
        if (false === colorPickerExclusionTypes.has(this.track.type)) {
            this.configureColorPicker(columnContainer, track)
        }

    }

    addDOMToColumnContainer(browser, columnContainer, referenceFrameList) {

        this.axis = this.createAxis(browser, browser.axisColumn)

        this.viewports = []
        const viewportWidth = browser.calculateViewportWidth(referenceFrameList.length)
        const viewportColumns = columnContainer.querySelectorAll('.igv-column')
        for (let i = 0; i < viewportColumns.length; i++) {
            const viewport = createViewport(this, viewportColumns[i], referenceFrameList[i], viewportWidth)
            this.viewports.push(viewport)
        }

        if (referenceFrameList.length > 1 && 'ruler' === this.track.type) {
            for (let rulerViewport of this.viewports) {
                rulerViewport.presentLocusLabel()
            }
        }

        this.sampleNameViewport = new SampleNameViewport(this, $(browser.sampleNameColumn), undefined, browser.sampleNameViewportWidth)

        this.attachScrollbar(browser)

        this.attachDragHandle(browser)

        this.createTrackGearPopup(browser)

    }

    createAxis(browser, axisColumn) {

        const axis = DOMUtils.div()
        axisColumn.appendChild(axis)

        axis.style.height = `${ this.track.height }px`
        // axis.style.backgroundColor = randomRGB(150, 250)

        if (typeof this.track.paintAxis === 'function') {

            if (this.track.dataRange) {

                axis.addEventListener('click', () => {
                    browser.dataRangeDialog.configure(this)
                    browser.dataRangeDialog.present($(browser.columnContainer))
                })

             }

            this.resizeAxisCanvas(axis, axis.clientWidth, axis.clientHeight)
        }

        return axis
    }

    resizeAxisCanvas(axis, width, height) {

        if (this.axisCanvas) {
            this.axisCanvas.remove()
        }

        axis.style.width = `${ width }px`
        axis.style.height = `${ height }px`

        this.axisCanvas = document.createElement('canvas')
        axis.appendChild(this.axisCanvas);

        this.axisCanvasContext = this.axisCanvas.getContext('2d');

        this.axisCanvas.style.height = `${ height }px`
        this.axisCanvas.style.width = `${ width }px`

        this.axisCanvas.height = window.devicePixelRatio * height
        this.axisCanvas.width = window.devicePixelRatio * width

        this.axisCanvasContext.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    removeDOMFromColumnContainer() {

        this.axis.remove()

        for (let { $viewport } of this.viewports) {
            $viewport.remove()
        }

        this.sampleNameViewport.$viewport.remove()

    }

    configureColorPicker(columnContainer, track) {
        const trackColors = []
        const color = track.color || track.defaultColor;
        if (StringUtils.isString(color)) {
            trackColors.push(color);
        }

        if (track.altColor && StringUtils.isString(track.altColor)) {
            trackColors.push(track.altColor);
        }

        const defaultColors = trackColors.map(c => c.startsWith("#") ? c : c.startsWith("rgb(") ? IGVColor.rgbToHex(c) : IGVColor.colorNameToHex(c));
        const options =
            {
                parent: columnContainer,
                top: undefined,
                left: undefined,
                width: 432,
                height: undefined,
                defaultColors,
                colorHandler: color => {
                    track.color = color;
                    this.repaintViews();
                }
            };

        this.colorPicker = new ColorPicker(options);

        // alt color picker -- TODO pass handler in at "show" time and use 1 color picker
        options.colorHandler = color => {
            track.altColor = color;
            this.repaintViews();
        }
        this.altColorPicker = new ColorPicker(options);

    }

    renderSVGContext(context, { deltaX, deltaY }) {

        renderSVGAxis(context, this.track, this.axisCanvas, deltaX, deltaY)

        const { width:axisWidth } = this.axis.getBoundingClientRect()

        const { y } = this.viewports[ 0 ].$viewport.get(0).getBoundingClientRect()

        let delta =
            {
                deltaX: axisWidth + deltaX,
                deltaY: y + deltaY
            }

        for (let viewport of this.viewports) {
            viewport.renderSVGContext(context, delta)
            const { width } = viewport.$viewport.get(0).getBoundingClientRect()
            delta.deltaX += width
        }

        if (true === this.browser.showSampleNames) {
            this.sampleNameViewport.renderSVGContext(context, delta)
        }
    }

    attachScrollbar(browser) {

        if (false === scrollbarExclusionTypes.has(this.track.type)) {
            browser.trackScrollbarControl.addScrollbar(this)
        } else {
            browser.trackScrollbarControl.addScrollbarShim(this)
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

        if (typeof this.track.paintAxis === 'function') {
            this.resizeAxisCanvas(this.axis, this.axis.clientWidth, this.track.height);
            this.track.paintAxis(this.axisCanvasContext, this.axisCanvasContext.canvas.width, this.axisCanvasContext.canvas.height);
        }

        for (let { $viewport } of [...this.viewports, this.sampleNameViewport]) {
            $viewport.height(newHeight)
        }

        // If the track does not manage its own content height set it here
        if (typeof this.track.computePixelHeight !== "function") {

            for (let vp of this.viewports) {
                vp.setContentHeight(newHeight);
            }
        }

        this.repaintViews();

        if (false === scrollbarExclusionTypes.has(this.track.type)) {
            this.updateScrollbar()
        }

        this.dragHandle.style.height = `${ newHeight }px`
        this.gearContainer.style.height = `${ newHeight }px`

    }

    updateScrollbar() {

        const viewportHeight = this.viewports[ 0 ].$viewport.height();
        this.outerScroll.style.height = `${ viewportHeight }px`;

        const viewportContentHeight = maxViewportContentHeight(this.viewports);
        const innerScrollHeight = Math.round((viewportHeight / viewportContentHeight) * viewportHeight);

        if (viewportContentHeight > viewportHeight) {
            this.innerScroll.style.display = 'block'
            this.innerScroll.style.height = `${ innerScrollHeight }px`
        } else {
            this.innerScroll.style.display = 'none'
        }
    }

    isLoading() {
        for (let viewport of this.viewports) {
            if (viewport.isLoading()) return true;
        }
    }

    resize(viewportWidth) {

        for (let viewport of this.viewports) {
            viewport.setWidth(viewportWidth);
        }

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
            this.track.paintAxis(this.axisCanvasContext, this.axisCanvasContext.canvas.width, this.axisCanvasContext.canvas.height);
        }

        // Repaint sample names last
        this.repaintSamples();

    }

    repaintSamples() {

        if(typeof this.track.getSamples === 'function') {
            const samples = this.track.getSamples()
            this.sampleNameViewport.repaint(samples)
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

        // Very special case for variant tracks in multilocus view.  The # of rows to allocate to the variant (site)
        // section depends on data from all the views.  We only need to adjust this however if any data was loaded
        // (i.e. rpV.length > 0)
        if(typeof this.track.variantRowCount === 'function') {
            let maxRow = 0;
            for(let vp of this.viewports) {
                if (vp.tile && vp.tile.features) {
                    maxRow = Math.max(maxRow, vp.tile.features.reduce((a, f) => Math.max(a, f.row || 0), 0));
                }
            }
            const current = this.track.nVariantRows;
            if(current !== maxRow + 1) {
                this.track.variantRowCount(maxRow + 1);
                for (let vp of this.viewports) {
                    vp.checkContentHeight();
                }
            }
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

        // Repaint sample names last
        this.repaintSamples();
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

        for (let viewport of this.viewports) {
            viewport.checkContentHeight()
        }

        this.adjustTrackHeight()
    }

    DEPRICATED_adjustTrackHeight() {

        const maxHeight = maxViewportContentHeight(this.viewports);
        if (this.track.autoHeight) {
            this.setTrackHeight(maxHeight, false);
        } else if (typeof this.track.paintAxis) {
            this.track.paintAxis(this.axisCanvasContext, this.axisCanvas.width, this.axisCanvas.height);
        }

        if (false === scrollbarExclusionTypes.has(this.track.type)) {
            const currentTop = this.viewports[0].getContentTop();
            const heights = this.viewports.map((viewport) => viewport.getContentHeight());
            const minContentHeight = Math.min(...heights);
            const newTop = Math.min(0, this.viewports[ 0 ].$viewport.height() - minContentHeight);
            if (currentTop < newTop) {
                for (let { $content } of this.viewports) {
                    $content.css('top', `${ newTop }px`)
                }
            }
            this.updateScrollbar();
        }

    }

    adjustTrackHeight() {

        var maxHeight = maxViewportContentHeight(this.viewports);
        if (this.track.autoHeight) {
            this.setTrackHeight(maxHeight, false);
        } else if (this.track.paintAxis) {   // Avoid duplication, paintAxis is already called in setTrackHeight
            this.track.paintAxis(this.axisCanvasContext, this.axisCanvas.width, this.axisCanvas.height);
        }

        if (false === scrollbarExclusionTypes.has(this.track.type)) {

            const currentTop = this.viewports[0].getContentTop();

            const heights = this.viewports.map(viewport => viewport.getContentHeight());
            const minContentHeight = Math.min(...heights);
            const newTop = Math.min(0, this.viewports[ 0 ].$viewport.height() - minContentHeight);
            if (currentTop < newTop) {
                for (let viewport of this.viewports) {
                    viewport.$content.css('top', `${ newTop }px`)
                }
            }
            this.updateScrollbar();
        }
    }

    attachDragHandle(browser) {

        if ('ideogram' === this.track.type || 'ruler' === this.track.type) {
            browser.trackDragControl.addDragShim(this)
        } else {
            browser.trackDragControl.addDragHandle(browser, this)
        }

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

        this.axis.remove()

        for (let viewport of this.viewports) {
            viewport.dispose();
        }

        this.sampleNameViewport.$viewport.detach()

        if (this.outerScroll) {
            this.browser.trackScrollbarControl.removeScrollbar(this)
        }

        if (this.dragHandle) {
            this.browser.trackDragControl.removeDragHandle(this)
        }

        this.browser.trackGearControl.removeGearContainer(this)

        if (typeof this.track.dispose === "function") {
            this.track.dispose();
        }

        // TODO: Perhaps better done in track/trackBase
        const track = this.track;

        if (typeof track.dispose === 'function') {
            track.dispose();
        }

        for (let key of Object.keys(track)) {
            track[key] = undefined;
        }


        for (let key of Object.keys(this)) {
            this[key] = undefined;
        }

        if(this.alert) {
            this.alert.container.remove();    // This is quite obviously a hack, need a "dispose" method on AlertDialog
        }

        this.disposed = true;
    }

    scrollBy(delta) {
        TrackScrollbarControl.moveScroller(this, delta)
    }

    createTrackGearPopup(browser) {

        if (true === this.track.ignoreTrackMenu) {
            browser.trackGearControl.addGearShim(this)
        } else {
            browser.trackGearControl.addGearMenu(browser, this)
        }

    }
}

function renderSVGAxis(context, track, axisCanvas, deltaX, deltaY) {

    if (typeof track.paintAxis === 'function') {

        const { y, width, height } = axisCanvas.getBoundingClientRect()

        const str = (track.name || track.id).replace(/\W/g, '');
        const id = `${ str }_axis_guid_${ DOMUtils.guid() }`

        context.saveWithTranslationAndClipRect(id, deltaX, y + deltaY, width, height, 0);

        track.paintAxis(context, width, height)

        context.restore()
    }

}

// css - $igv-axis-column-width: 50px;
const igv_axis_column_width = 50;

function createAxisColumn(columnContainer) {
    const column = DOMUtils.div({ class: 'igv-axis-column' })
    columnContainer.appendChild(column)
    return column
}

function maxViewportContentHeight(viewports) {
    const heights = viewports.map(viewport => viewport.getContentHeight());
    return Math.max(...heights);
}

export {igv_axis_column_width, createAxisColumn, maxViewportContentHeight}
export default TrackView
