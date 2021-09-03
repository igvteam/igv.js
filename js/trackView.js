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
import {DOMUtils, IGVColor, StringUtils, FeatureUtils, Icon} from '../node_modules/igv-utils/src/index.js';
import SampleNameViewportController from './sampleNameViewportController.js';
import MenuPopup from "./ui/menuPopup.js";
import MenuUtils from "./ui/menuUtils.js";

const scrollbarExclusionTypes = new Set(['ruler', 'sequence', 'ideogram'])
const colorPickerExclusionTypes = new Set(['ruler', 'sequence', 'ideogram'])

class TrackView {

    constructor(browser, columnContainer, track) {

        this.namespace = `trackview-${ DOMUtils.guid() }`

        this.browser = browser;
        this.track = track;
        track.trackView = this;

        this.addDOMToColumnContainer(browser, columnContainer, browser.referenceFrameList)

    }

    /**
     * Start a spinner for the track on any of its viewports.  In practice this is called during initialization
     * when there is only one.
     */
    startSpinner() {
        if (this.viewports && this.viewports.length > 0) {
            this.viewports[0].startSpinner();
        }
    }

    stopSpinner() {
        if (this.viewports && this.viewports.length > 0) {
            this.viewports[0].stopSpinner();
        }
    }

    addDOMToColumnContainer(browser, columnContainer, referenceFrameList) {

        // Axis
        this.axis = this.createAxis(browser, this.track)

        // Track Viewports
        this.viewports = []
        const viewportWidth = browser.calculateViewportWidth(referenceFrameList.length)
        const viewportColumns = columnContainer.querySelectorAll('.igv-column')
        for (let i = 0; i < viewportColumns.length; i++) {
            const viewport = createViewport(this, viewportColumns[i], referenceFrameList[i], viewportWidth)
            this.viewports.push(viewport)
        }

        // SampleName Viewport
        this.sampleNameViewport = new SampleNameViewportController(this, browser.sampleNameColumn, undefined, browser.sampleNameViewportWidth)

        // Track Scrollbar
        this.createTrackScrollbar(browser)

        // Track Drag
        this.createTrackDragHandle(browser)

        // Track Gear
        this.createTrackGearPopup(browser)

    }

    createAxis(browser, track) {

        const axis = DOMUtils.div();
        browser.axisColumn.appendChild(axis);

        axis.style.height = `${track.height}px`;
        // axis.style.backgroundColor = randomRGB(150, 250)

        if (typeof track.paintAxis === 'function') {
            if (track.dataRange) {
                axis.addEventListener('click', () => {
                    browser.dataRangeDialog.configure(this);
                    browser.dataRangeDialog.present($(browser.columnContainer));
                })
            }


            const {width, height} = axis.getBoundingClientRect();
            this.axisCanvas = document.createElement('canvas');
            this.axisCanvas.style.width = `${width}px`;
            this.axisCanvas.style.height = `${height}px`;
            axis.appendChild(this.axisCanvas);
        }

        return axis

    }

    resizeAxisCanvas(width, height) {

        // Size the canvas containing div.  Do we really need this?
        this.axis.style.width = `${width}px`;
        this.axis.style.height = `${height}px`;

        // Size the canvas in CSS (logical) pixels.  The buffer size will be set when painted.
        // TODO -- if
        this.axisCanvas.style.width = `${width}px`;
        this.axisCanvas.style.height = `${height}px`;
    }

    removeDOMFromColumnContainer() {

        // Axis
        if (this.boundAxisClickHander) {
            this.removeAxisEventListener(this.axis)
        }
        this.axis.remove()

        // Track Viewports
        for (let viewport of this.viewports) {
            viewport.removeMouseHandlers()
            viewport.$viewport.remove()
        }

        // SampleName Viewport
        this.sampleNameViewport.dispose()

        // empty trackScrollbar Column
        this.removeTrackScrollMouseHandlers()
        this.outerScroll.remove()

        // empty trackDrag Column
        this.removeTrackDragMouseHandlers()
        this.dragHandle.remove()

        // empty trackGear Column
        this.removeTrackGearMouseHandlers()
        this.gearContainer.remove()

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

    presentColorPicker(key) {

        if (false === colorPickerExclusionTypes.has(this.track.type)) {

            const trackColors = []

            const color = this.track.color || this.track.defaultColor;

            if (StringUtils.isString(color)) {
                trackColors.push(color);
            }

            if (this.track.altColor && StringUtils.isString(this.track.altColor)) {
                trackColors.push(this.track.altColor);
            }

            const defaultColors = trackColors.map(c => c.startsWith("#") ? c : c.startsWith("rgb(") ? IGVColor.rgbToHex(c) : IGVColor.colorNameToHex(c));

            const colorHandlers =
                {
                    color: color => {
                        this.track.color = color
                        this.repaintViews()
                    },
                    altColor: color => {
                        this.track.altColor = color
                        this.repaintViews()
                    }

                }

            this.browser.genericColorPicker.configure(defaultColors, colorHandlers)
            this.browser.genericColorPicker.setActiveColorHandler(key)
            this.browser.genericColorPicker.show()
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
            this.resizeAxisCanvas(this.axis.clientWidth, this.track.height);
            this.paintAxis();
        }

        for (let { $viewport } of this.viewports) {
            $viewport.height(newHeight)
        }

        this.sampleNameViewport.viewport.style.height = `${newHeight}px`

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

    moveScroller(delta) {

        const y = $(this.innerScroll).position().top + delta
        const top = Math.min(Math.max(0, y), this.outerScroll.clientHeight - this.innerScroll.clientHeight)
        $(this.innerScroll).css('top', `${ top }px`);

        const contentHeight = maxViewportContentHeight(this.viewports)
        const contentTop = -Math.round(top * (contentHeight / this.viewports[ 0 ].$viewport.height()))

        for (let viewport of this.viewports) {
            viewport.setTop(contentTop)
        }

        this.sampleNameViewport.trackScrollDelta = delta
        this.sampleNameViewport.setTop(contentTop)

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

        if (typeof this.track.paintAxis === 'function') {
            this.paintAxis();
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

    // track labels
    setTrackLabelName(name) {
        this.viewports.forEach(viewport => viewport.setTrackLabel(name));
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

        this.updateRulerViewportLabels()
    }

    updateRulerViewportLabels() {

        const viewportWidth = this.browser.calculateViewportWidth(this.viewports.length)

        for (let viewport of this.viewports) {
            if ('ruler' === this.track.type) {
                if (this.viewports.length > 1) {
                    viewport.presentLocusLabel(viewportWidth)
                } else {
                    viewport.dismissLocusLabel()
                }
            }
        }

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

    adjustTrackHeight() {

        var maxHeight = maxViewportContentHeight(this.viewports);
        if (this.track.autoHeight) {
            this.setTrackHeight(maxHeight, false);
        } else if (this.track.paintAxis) {   // Avoid duplication, paintAxis is already called in setTrackHeight
            this.paintAxis();
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

    createTrackScrollbar(browser) {

        const outerScroll = DOMUtils.div()
        browser.trackScrollbarColumn.appendChild(outerScroll)
        outerScroll.style.height = `${ this.track.height }px`
        this.outerScroll = outerScroll

        if (false === scrollbarExclusionTypes.has(this.track.type)) {
            const innerScroll = DOMUtils.div()
            outerScroll.appendChild(innerScroll)
            this.innerScroll = innerScroll

            this.addTrackScrollMouseHandlers(browser)
        }

    }

    createTrackDragHandle(browser) {

        const className = 'ideogram' === this.track.type || 'ruler' === this.track.type ? 'igv-track-drag-shim' : 'igv-track-drag-handle'
        this.dragHandle = DOMUtils.div({ class: className })
        browser.trackDragColumn.appendChild(this.dragHandle)
        this.dragHandle.style.height = `${ this.track.height }px`

        this.addTrackDragMouseHandlers(browser)

    }

    createTrackGearPopup(browser) {

        this.gearContainer = DOMUtils.div()
        browser.trackGearColumn.appendChild(this.gearContainer);
        this.gearContainer.style.height = `${ this.track.height }px`

        if (true === this.track.ignoreTrackMenu) {
            // do nothing
        } else {

            this.gear = DOMUtils.div()
            this.gearContainer.appendChild(this.gear)
            this.gear.appendChild(Icon.createIcon('cog'))

            this.trackGearPopup = new MenuPopup(this.gear);

            this.addTrackGearMouseHandlers()
        }

    }

    addAxisEventListener(axis) {

        this.boundAxisClickHander = axisClickHandler.bind(this)
        axis.addEventListener('click', this.boundAxisClickHander)

        function axisClickHandler(event) {
            this.browser.dataRangeDialog.configure(this)
            this.browser.dataRangeDialog.present($(this.browser.columnContainer))
        }

    }

    removeAxisEventListener(axis) {
        axis.removeEventListener('click', this.boundAxisClickHander)
    }

    addTrackScrollMouseHandlers(browser) {

        // Mouse Down
        this.boundTrackScrollMouseDownHandler = trackScrollMouseDownHandler.bind(this)
        this.innerScroll.addEventListener('mousedown', this.boundTrackScrollMouseDownHandler)

        function trackScrollMouseDownHandler(event) {

            event.stopPropagation()

            const { y } = DOMUtils.pageCoordinates(event)

            $(this.innerScroll).data('yDown', y.toString());

            this.boundColumnContainerMouseMoveHandler = columnContainerMouseMoveHandler.bind(this)
            browser.columnContainer.addEventListener('mousemove', this.boundColumnContainerMouseMoveHandler)

            function columnContainerMouseMoveHandler(event) {

                event.stopPropagation()

                const { y } = DOMUtils.pageCoordinates(event)

                this.moveScroller(y - parseInt( $(this.innerScroll).data('yDown') ))

                $(this.innerScroll).data('yDown', y.toString());

            }
        }

        this.boundColumnContainerMouseUpHandler = columnContainerMouseUpHandler.bind(this)
        browser.columnContainer.addEventListener('mouseup', this.boundColumnContainerMouseUpHandler)

        function columnContainerMouseUpHandler(event) {
            browser.columnContainer.removeEventListener('mousemove', this.boundColumnContainerMouseMoveHandler)
        }

    }

    removeTrackScrollMouseHandlers() {
        if (false === scrollbarExclusionTypes.has(this.track.type)) {
            this.innerScroll.removeEventListener('mousedown', this.boundTrackScrollMouseDownHandler)
            this.browser.columnContainer.removeEventListener('mouseup', this.boundColumnContainerMouseUpHandler)
            this.browser.columnContainer.removeEventListener('mousemove', this.boundColumnContainerMouseMoveHandler)
        }
    }

    addTrackDragMouseHandlers(browser) {

        if ('ideogram' === this.track.type || 'ruler' === this.track.type) {
            // do nothing
        } else {

            let currentDragHandle = undefined

            // Mouse Down
            this.boundTrackDragMouseDownHandler = trackDragMouseDownHandler.bind(this)
            this.dragHandle.addEventListener('mousedown', this.boundTrackDragMouseDownHandler)

            function trackDragMouseDownHandler(event) {

                event.preventDefault();

                currentDragHandle = event.target
                currentDragHandle.classList.add('igv-track-drag-handle-hover')

                browser.startTrackDrag(this);

            }

            // Mouse Up
            this.boundDocumentTrackDragMouseUpHandler = documentTrackDragMouseUpHandler.bind(this)
            document.addEventListener('mouseup', this.boundDocumentTrackDragMouseUpHandler)

            function documentTrackDragMouseUpHandler(event) {

                event.preventDefault();

                browser.endTrackDrag()

                let str = ''
                if (currentDragHandle && event.target !== currentDragHandle) {
                    str = ' - remove hover style'
                    currentDragHandle.classList.remove('igv-track-drag-handle-hover')
                }

                currentDragHandle = undefined
            }

            // Mouse Enter
            this.boundTrackDragMouseEnterHandler = trackDragMouseEnterHandler.bind(this)
            this.dragHandle.addEventListener('mouseenter', this.boundTrackDragMouseEnterHandler)

            function trackDragMouseEnterHandler(event) {
                event.preventDefault();

                if (undefined === currentDragHandle) {
                    event.target.classList.add('igv-track-drag-handle-hover')
                }

                browser.updateTrackDrag(this);

            }

            // Mouse Out
            this.dragHandle.addEventListener('mouseout', e => {
                e.preventDefault();

                if (undefined === currentDragHandle) {
                    e.target.classList.remove('igv-track-drag-handle-hover')
                }
            })

            this.boundTrackDragMouseOutHandler = trackDragMouseOutHandler.bind(this)
            this.dragHandle.addEventListener('mouseout', this.boundTrackDragMouseOutHandler)

            function trackDragMouseOutHandler(event) {
                event.preventDefault();

                if (undefined === currentDragHandle) {
                    event.target.classList.remove('igv-track-drag-handle-hover')
                }
            }

        }

    }

    removeTrackDragMouseHandlers() {

        if ('ideogram' === this.track.type || 'ruler' === this.track.type) {
            // do nothing
        } else {
            this.dragHandle.removeEventListener('mousedown', this.boundTrackDragMouseDownHandler)
            document.removeEventListener('mouseup', this.boundDocumentTrackDragMouseUpHandler)
            this.dragHandle.removeEventListener('mouseup', this.boundTrackDragMouseEnterHandler)
            this.dragHandle.removeEventListener('mouseout', this.boundTrackDragMouseOutHandler)
        }

    }

    addTrackGearMouseHandlers() {
        if (true === this.track.ignoreTrackMenu) {
            // do nothing
        } else {

            this.boundTrackGearClickHandler = trackGearClickHandler.bind(this)
            this.gear.addEventListener('click', this.boundTrackGearClickHandler)

            function trackGearClickHandler(event) {
                event.preventDefault();
                event.stopPropagation();
                this.trackGearPopup.presentMenuList(MenuUtils.trackMenuItemList(this));
            }

        }

    }

    removeTrackGearMouseHandlers() {
        if (true === this.track.ignoreTrackMenu) {
            // do nothing
        } else {
            this.gear.removeEventListener('click', this.boundTrackGearClickHandler)
        }

    }

    /**
     * Do any cleanup here
     */
    dispose() {

        this.removeAxisEventListener(this.axis)
        this.axis.remove()

        for (let viewport of this.viewports) {
            viewport.dispose();
        }

        this.sampleNameViewport.dispose()

        this.removeTrackScrollMouseHandlers()
        this.outerScroll.remove()

        this.removeTrackDragMouseHandlers()
        this.dragHandle.remove()

        this.removeTrackGearMouseHandlers()
        this.gearContainer.remove()

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

    paintAxis() {

        if (typeof this.track.paintAxis === 'function') {

            // Set the canvas buffer size, this is the resolution it is drawn at.  This is done here in case the browser
            // has been drug between screens at different dpi resolutions since the last repaint
            const {width, height} = this.axisCanvas.getBoundingClientRect();
            const dpi = window.devicePixelRatio || 1;
            this.axisCanvas.height = dpi * height
            this.axisCanvas.width = dpi * width

            // Get a scaled context to draw aon
            const axisCanvasContext = this.axisCanvas.getContext('2d');
            axisCanvasContext.scale(dpi, dpi)

            this.track.paintAxis(axisCanvasContext, width, height);
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

function maxViewportContentHeight(viewports) {
    const heights = viewports.map(viewport => viewport.getContentHeight());
    return Math.max(...heights);
}

export {igv_axis_column_width, maxViewportContentHeight}
export default TrackView
