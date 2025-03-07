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

import {doAutoscale} from "./util/igvUtils.js"
import {createViewport} from "./util/viewportUtils.js"
import {FeatureUtils, IGVColor} from '../node_modules/igv-utils/src/index.js'
import * as DOMUtils from "./ui/utils/dom-utils.js"
import {createIcon} from "./ui/utils/icons.js"
import SampleInfoViewport from "./sample/sampleInfoViewport.js"
import SampleNameViewport from './sample/sampleNameViewport.js'
import MenuPopup from "./ui/menuPopup.js"
import {autoScaleGroupColorHash, multiTrackSelectExclusionTypes} from "./ui/menuUtils.js"
import {colorPalettes, hexToRGB} from "./util/colorPalletes.js"
import {isOverlayTrackCriteriaMet} from "./ui/overlayTrackButton.js"

const igv_axis_column_width = 50
const scrollbarExclusionTypes = new Set(['sequence', 'ruler', 'ideogram'])
const colorPickerExclusionTypes = new Set(['ruler', 'sequence', 'ideogram'])

class TrackView {

    constructor(browser, columnContainer, track) {

        this.namespace = `trackview-${DOMUtils.guid()}`

        this.browser = browser
        this.track = track
        track.trackView = this

        this.addDOMToColumnContainer(browser, columnContainer, browser.referenceFrameList)

    }

    /**
     * Start a spinner for the track on any of its viewports.  In practice this is called during initialization
     * when there is only one.
     */
    startSpinner() {
        if (this.viewports && this.viewports.length > 0) {
            this.viewports[0].startSpinner()
        }
    }

    stopSpinner() {
        if (this.viewports && this.viewports.length > 0) {
            this.viewports[0].stopSpinner()
        }
    }

    addDOMToColumnContainer(browser, columnContainer, referenceFrameList) {

        // Axis
        this.axis = this.createAxis(browser, this.track)

        this.createViewports(browser, columnContainer, referenceFrameList)

        // Sample Info
        this.sampleInfoViewport = new SampleInfoViewport(this, browser.columnContainer.querySelector('.igv-sample-info-column'), browser.getSampleInfoViewportWidth())

        // SampleName Viewport
        this.sampleNameViewport = new SampleNameViewport(this, browser.columnContainer.querySelector('.igv-sample-name-column'), undefined, browser.getSampleNameViewportWidth())

        // Track Scrollbar
        this.createTrackScrollbar(browser)

        // Track Drag
        this.createTrackDragHandle(browser)

        // Track Gear
        this.createTrackGearPopup(browser)

    }

    /**
     * Create a viewport object for each reference frame.  It is assumed that viewport DOM objects have already been
     * created.   Obviously this is rather fragile, refactoring here would be a good idea.
     *
     * @param browser
     * @param columnContainer
     * @param referenceFrameList
     */
    createViewports(browser, columnContainer, referenceFrameList) {

        this.viewports = []
        const viewportWidth = browser.calculateViewportWidth(referenceFrameList.length)
        const viewportColumns = columnContainer.querySelectorAll('.igv-column')
        for (let i = 0; i < viewportColumns.length; i++) {
            const viewport = createViewport(this, viewportColumns[i], referenceFrameList[i], viewportWidth)
            this.viewports.push(viewport)
        }
    }

    createAxis(browser, track) {

        const axis = DOMUtils.div()
        this.axis = axis

        browser.columnContainer.querySelector('.igv-axis-column').appendChild(axis)

        axis.dataset.tracktype = track.type

        axis.style.height = `${track.height}px`

        if (typeof track.paintAxis === 'function') {

            const {width, height} = axis.getBoundingClientRect()
            this.axisCanvas = document.createElement('canvas')
            this.axisCanvas.style.width = `${width}px`
            this.axisCanvas.style.height = `${height}px`
            axis.appendChild(this.axisCanvas)
        }

        if (false === multiTrackSelectExclusionTypes.has(this.track.type)) {

            this.trackSelectionContainer = DOMUtils.div()
            axis.appendChild(this.trackSelectionContainer)

            const html = `<input type="checkbox" name="track-select">`
            const input = document.createRange().createContextualFragment(html).firstChild
            this.trackSelectionContainer.appendChild(input)
            input.checked = this.track.selected || false

            input.addEventListener('change', event => {
                event.preventDefault()
                event.stopPropagation()
                this.track.selected = event.target.checked
                this.setDragHandleSelectionState(event.target.checked)
                this.browser.overlayTrackButton.setVisibility(isOverlayTrackCriteriaMet(this.browser))
            })

            this.enableTrackSelection(false)

        }

        return axis

    }

    resizeAxisCanvas(width, height) {

        this.axis.style.width = `${width}px`
        this.axis.style.height = `${height}px`

        if (typeof this.track.paintAxis === 'function') {
            // Size the canvas in CSS (logical) pixels.  The buffer size will be set when painted.
            this.axisCanvas.style.width = `${width}px`
            this.axisCanvas.style.height = `${height}px`

        }
    }

    renderSVGContext(context, {deltaX, deltaY}) {

        renderSVGAxis(context, this.track, this.axisCanvas, deltaX, deltaY)

        const {width: axisWidth} = this.axis.getBoundingClientRect()

        const {y} = this.viewports[0].viewportElement.getBoundingClientRect()

        let delta =
            {
                deltaX: axisWidth + deltaX,
                deltaY: y + deltaY
            }

        for (let viewport of this.viewports) {
            viewport.renderSVGContext(context, delta)
            const {width} = viewport.viewportElement.getBoundingClientRect()
            delta.deltaX += width
        }

        if (true === this.browser.sampleInfo.isInitialized() && true === this.browser.sampleInfoControl.showSampleInfo) {
            this.sampleInfoViewport.renderSVGContext(context, delta)
            const {width} = this.sampleInfoViewport.viewport.getBoundingClientRect()
            delta.deltaX += width
        }

        if (true === this.browser.showSampleNames) {
            this.sampleNameViewport.renderSVGContext(context, delta)
        }
    }

    presentColorPicker(colorSelection, event) {

        if (false === colorPickerExclusionTypes.has(this.track.type)) {

            let initialTrackColor

            if (colorSelection === 'color') {
                initialTrackColor = this.track._initialColor || this.track.constructor.defaultColor
            } else {
                initialTrackColor = this.track._initialAltColor || this.track.constructor.defaultColor
            }

            let colorHandlers
            const selected = this.browser.getSelectedTrackViews()
            if (selected.length > 0 && new Set(selected).has(this)) {

                colorHandlers =
                    {
                        color: rgbString => {
                            for (const trackView of selected) {
                                trackView.track.color = rgbString
                                trackView.repaintViews()
                            }
                        },
                        altColor: rgbString => {
                            for (const trackView of selected) {
                                trackView.track.altColor = rgbString
                                trackView.repaintViews()
                            }
                        },
                    };
            } else {
                colorHandlers =
                    {
                        color: hex => {
                            this.track.color = hexToRGB(hex)
                            this.repaintViews()
                        },
                        altColor: hex => {
                            this.track.altColor = hexToRGB(hex)
                            this.repaintViews()
                        }
                    };
            }

            const moreColorsPresentationColor = 'color' === colorSelection ? (this.track.color || this.track.constructor.defaultColor) : (this.track.altColor || this.track.constructor.defaultColor)
            this.browser.genericColorPicker.configure(initialTrackColor, colorHandlers[colorSelection], moreColorsPresentationColor)
            this.browser.genericColorPicker.present(event)

        }

    }

    setTrackHeight(newHeight, force) {

        if (!force) {
            if (this.track.minHeight) {
                newHeight = Math.max(this.track.minHeight, newHeight)
            }
            if (this.track.maxHeight) {
                newHeight = Math.min(this.track.maxHeight, newHeight)
            }
        }

        this.track.height = newHeight

        this.resizeAxisCanvas(this.axis.clientWidth, this.track.height)

        if (typeof this.track.paintAxis === 'function') {
            this.paintAxis()
        }

        for (let vp of this.viewports) {
            vp.setHeight(newHeight)
        }

        this.sampleInfoViewport.setHeight(newHeight)

        this.sampleNameViewport.viewport.style.height = `${newHeight}px`

        // If the track does not manage its own content height set it equal to the viewport height here
        if (typeof this.track.computePixelHeight !== "function") {
            for (let vp of this.viewports) {
                vp.setContentHeight(newHeight)
            }
        }

        this.repaintViews()

        this.updateScrollbar()

        this.dragHandle.style.height = `${newHeight}px`
        this.gearContainer.style.height = `${newHeight}px`

    }

    updateScrollbar() {

        const viewportHeight = this.viewports[0].viewportElement.clientHeight
        this.outerScroll.style.height = `${viewportHeight}px`

        if (false === scrollbarExclusionTypes.has(this.track.type)) {

            const viewportContentHeight = this.maxViewportContentHeight()
            const innerScrollHeight = Math.round((viewportHeight / viewportContentHeight) * viewportHeight)

            if (viewportContentHeight > viewportHeight) {
                this.innerScroll.style.display = 'block'
                this.innerScroll.style.height = `${innerScrollHeight}px`
            } else {
                this.innerScroll.style.display = 'none'
            }

        }

    }

    moveScroller(delta) {

        const y = this.innerScroll.offsetTop + delta
        const top = Math.min(Math.max(0, y), this.outerScroll.clientHeight - this.innerScroll.clientHeight)
        this.innerScroll.style.top = `${top}px`;

        const contentHeight = this.maxViewportContentHeight()
        const contentTop = -Math.round(top * (contentHeight / this.viewports[0].viewportElement.clientHeight))

        for (let viewport of this.viewports) {
            viewport.setTop(contentTop)
        }

        this.sampleInfoViewport.setTop(contentTop)

        this.sampleNameViewport.trackScrollDelta = delta
        this.sampleNameViewport.setTop(contentTop)

    }

    isLoading() {
        for (let viewport of this.viewports) {
            if (viewport.isLoading()) return true
        }
    }

    /**
     * Repaint all viewports without loading any new data.   Use this for events that change visual aspect of data,
     * e.g. color, sort order, etc, but do not change the genomic state.
     */
    repaintViews() {

        for (let viewport of this.viewports) {
            if (viewport.isVisible()) {
                viewport.repaint()
            }
        }

        if (typeof this.track.paintAxis === 'function') {
            this.paintAxis()
        }

        this.repaintSampleInfo()

        this.repaintSamples()
    }

    repaintSampleInfo() {

        this.sampleInfoViewport.repaint()
    }

    repaintSamples() {

        if (typeof this.track.getSamples === 'function') {
            const samples = this.track.getSamples()
            if (samples.names && samples.names.length > 0) {
                this.sampleNameViewport.repaint(samples)
            }

        }
    }

    // track labels
    setTrackLabelName(name) {
        this.viewports.forEach(viewport => viewport.setTrackLabel(name))
    }

    /**
     * Called in response to a window resize event, change in # of multilocus panels, or other event that changes
     * the width of the track view.
     *
     * @param viewportWidth  The width of each viewport in this track view.
     */
    resize(viewportWidth) {
        for (let viewport of this.viewports) {
            viewport.setWidth(viewportWidth)
        }
    }

    /**
     * Update viewports to reflect current genomic state, possibly loading additional data.
     *
     * @param force - if true, force a repaint even if no new data is loaded
     * @returns {Promise<void>}
     */
    async updateViews() {

        if (!(this.browser && this.browser.referenceFrameList)) return

        const visibleViewports = this.viewports.filter(viewport => viewport.isVisible())

        // Shift viewports left/right to current genomic state (pans canvas)
        visibleViewports.forEach(viewport => viewport.shift())

        // If dragging (panning) return
        if (this.browser.dragObject) {
            return
        }

        // Filter zoomed out views.  This has the side effect or turning off or no the zoomed out notice
        const viewportsToRepaint = visibleViewports.filter(vp => vp.needsRepaint()).filter(viewport => viewport.checkZoomIn())

        // Get viewports that require a data load
        const viewportsToReload = visibleViewports.filter(viewport => viewport.checkZoomIn()).filter(viewport => viewport.needsReload())

        // Trigger viewport to load features needed to cover current genomic range
        // NOTE: these must be loaded synchronously, do not user Promise.all,  not all file readers are thread safe
        for (let viewport of viewportsToReload) {
            await viewport.loadFeatures()
        }

        if (this.disposed) return   // Track was removed during load

        // Special case for variant tracks in multilocus view.  The # of rows to allocate to the variant (site)
        // section depends on data from all the views.  We only need to adjust this however if any data was loaded
        // (i.e. reloadableViewports.length > 0)
        if (this.track && typeof this.track.variantRowCount === 'function' && viewportsToReload.length > 0) {
            let maxRow = 0
            for (let viewport of this.viewports) {
                if (viewport.featureCache && viewport.featureCache.features) {
                    maxRow = Math.max(maxRow, viewport.featureCache.features.reduce((a, f) => Math.max(a, f.row || 0), 0))
                }
            }
            const current = this.track.nVariantRows
            if (current !== maxRow + 1) {
                this.track.variantRowCount(maxRow + 1)
                for (let viewport of this.viewports) {
                    viewport.checkContentHeight()
                }
            }
        }

        // Autoscale
        let mergeAutocale
        if ("merged" === this.track.type) {
            // Merged tracks handle their own scaling
            mergeAutocale = this.track.updateScales(visibleViewports)

        } else if (this.track.autoscale) {
            let allFeatures = []
            for (let visibleViewport of visibleViewports) {
                const referenceFrame = visibleViewport.referenceFrame
                const start = referenceFrame.start
                const end = start + referenceFrame.toBP(visibleViewport.getWidth())

                if (visibleViewport.featureCache && visibleViewport.featureCache.features) {

                    // If the "features" object has a getMax function use it.  Currently alignmentContainer
                    // implements this for coverage and Merged track for its wig tracks.
                    if (typeof visibleViewport.featureCache.features.getMax === 'function') {
                        const max = visibleViewport.featureCache.features.getMax(start, end)
                        allFeatures.push({value: max})

                        // If the "features" object also has a getMin function use it.  Currently Merged track implements
                        // this for its wig tracks.
                        if (typeof visibleViewport.featureCache.features.getMin === 'function') {
                            const min = visibleViewport.featureCache.features.getMin(start, end)
                            allFeatures.push({value: min})
                        }

                    } else {
                        const viewFeatures = FeatureUtils.findOverlapping(visibleViewport.featureCache.features, start, end)
                        for (let f of viewFeatures) {
                            allFeatures.push(f)
                        }
                    }
                }
            }


            if (typeof this.track.doAutoscale === 'function') {
                this.track.dataRange = this.track.doAutoscale(allFeatures)
            } else {
                this.track.dataRange = doAutoscale(allFeatures)
            }
        }

        const refreshView = (this.track.autoscale || this.track.autoscaleGroup || this.track.type === 'ruler' || mergeAutocale || this.track.groupBy)
        for (let vp of visibleViewports) {
            if (viewportsToRepaint.includes(vp)) {
                vp.repaint()
            } else if (refreshView) {
                vp.refresh()
            }
        }

        this.adjustTrackHeight()

        this.repaintSampleInfo()

        this.repaintSamples()

        this.updateRulerViewportLabels()
    }

    clearCachedFeatures() {
        for (let viewport of this.viewports) {
            viewport.clearCache()
        }
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
     * Return a promise to get all in-view features across all viewports.  Used for group autoscaling.
     */
    async getInViewFeatures() {

        if (!(this.browser && this.browser.referenceFrameList)) {
            return []
        }

        let allFeatures = []
        const visibleViewports = this.viewports.filter(viewport => viewport.isVisible())
        for (let vp of visibleViewports) {

            const referenceFrame = vp.referenceFrame
            const {chr, start, bpPerPixel} = vp.referenceFrame
            const end = start + referenceFrame.toBP(vp.getWidth())
            const needsReload = !vp.featureCache || !vp.featureCache.containsRange(chr, start, end, bpPerPixel)

            if (needsReload) {
                await vp.loadFeatures()
            }
            if (vp.featureCache && vp.featureCache.features) {

                if (typeof vp.featureCache.features.getMax === 'function') {
                    const max = vp.featureCache.features.getMax(start, end)
                    allFeatures.push({value: max})
                } else {
                    const vpFeatures = typeof vp.featureCache.queryFeatures === 'function' ?
                        vp.featureCache.queryFeatures(chr, start, end) :
                        FeatureUtils.findOverlapping(vp.featureCache.features, start, end)
                    allFeatures = allFeatures.concat(vpFeatures)
                }
            }
        }
        return allFeatures
    }

    checkContentHeight() {

        for (let viewport of this.viewports) {
            viewport.checkContentHeight()
        }
        this.adjustTrackHeight()

    }

    adjustTrackHeight() {

        var contentHeight = this.maxViewportContentHeight()
        if (this.track.autoHeight) {
            this.setTrackHeight(contentHeight, false)
        } else if (this.track.paintAxis) {   // Avoid duplication, paintAxis is already called in setTrackHeight
            this.paintAxis()
        }

        if (false === scrollbarExclusionTypes.has(this.track.type)) {

            // Adjust scrollbar, if needed, to insure content is in view
            const currentTop = this.viewports[0].getContentTop()
            const viewportHeight = this.viewports[0].viewportElement.clientHeight
            const minTop = Math.min(0, viewportHeight - contentHeight)
            if (currentTop < minTop) {
                for (let viewport of this.viewports) {
                    viewport.setTop(minTop)
                }
            }
            this.updateScrollbar()
        }
    }

    createTrackScrollbar(browser) {

        const outerScroll = DOMUtils.div()
        browser.columnContainer.querySelector('.igv-scrollbar-column').appendChild(outerScroll)
        outerScroll.style.height = `${this.track.height}px`
        this.outerScroll = outerScroll

        if (false === scrollbarExclusionTypes.has(this.track.type)) {
            const innerScroll = DOMUtils.div()
            outerScroll.appendChild(innerScroll)
            this.innerScroll = innerScroll

            this.addTrackScrollMouseHandlers(browser)
        }

    }

    createTrackDragHandle(browser) {

        if ('sequence' !== this.track.type && true === multiTrackSelectExclusionTypes.has(this.track.type)) {
            this.dragHandle = DOMUtils.div({class: 'igv-track-drag-shim'})
        } else {
            this.dragHandle = DOMUtils.div({class: 'igv-track-drag-handle'})
            this.dragHandle.classList.add('igv-track-drag-handle-color')
        }

        browser.columnContainer.querySelector('.igv-track-drag-column').appendChild(this.dragHandle)
        this.dragHandle.style.height = `${this.track.height}px`
        this.addTrackDragMouseHandlers(browser)
    }

    createTrackGearPopup(browser) {

        this.gearContainer = DOMUtils.div()
        browser.columnContainer.querySelector('.igv-gear-menu-column').appendChild(this.gearContainer)
        this.gearContainer.style.height = `${this.track.height}px`

        if (true === this.track.ignoreTrackMenu) {
            // do nothing
        } else {

            this.gear = DOMUtils.div()
            this.gearContainer.appendChild(this.gear)
            this.gear.appendChild(createIcon('cog'))

            this.trackGearPopup = new MenuPopup(this.gear)

            this.boundTrackGearClickHandler = trackGearClickHandler.bind(this)
            this.gear.addEventListener('click', this.boundTrackGearClickHandler)

            function trackGearClickHandler(event) {
                event.preventDefault()
                event.stopPropagation()

                if ('none' === this.trackGearPopup.popover.style.display) {

                    for (const otherTrackView of browser.trackViews.filter(t => t !== this && undefined !== t.trackGearPopup)) {
                        otherTrackView.trackGearPopup.popover.style.display = 'none'
                    }

                    this.trackGearPopup.presentMenuList(this, browser.menuUtils.trackMenuItemList(this))
                } else {
                    this.trackGearPopup.popover.style.display = 'none'
                }
            }

        }

    }

    addTrackScrollMouseHandlers(browser) {

        // Mouse Down
        this.boundTrackScrollMouseDownHandler = trackScrollMouseDownHandler.bind(this)
        this.innerScroll.addEventListener('mousedown', this.boundTrackScrollMouseDownHandler)

        function trackScrollMouseDownHandler(event) {

            event.stopPropagation()

            const {y} = DOMUtils.pageCoordinates(event)

            this.innerScroll.dataset.yDown = y.toString();

            this.boundColumnContainerMouseMoveHandler = columnContainerMouseMoveHandler.bind(this)
            browser.columnContainer.addEventListener('mousemove', this.boundColumnContainerMouseMoveHandler)

            function columnContainerMouseMoveHandler(event) {

                event.stopPropagation()

                const {y} = DOMUtils.pageCoordinates(event)

                this.moveScroller(y - parseInt(this.innerScroll.dataset.yDown))

                this.innerScroll.dataset.yDown = y.toString();


            }
        }

        this.boundColumnContainerMouseUpHandler = columnContainerMouseUpHandler.bind(this)
        browser.columnContainer.addEventListener('mouseup', this.boundColumnContainerMouseUpHandler)
        browser.columnContainer.addEventListener('mouseleave', this.boundColumnContainerMouseUpHandler)

        function columnContainerMouseUpHandler(event) {
            browser.columnContainer.removeEventListener('mousemove', this.boundColumnContainerMouseMoveHandler)
        }

    }

    removeTrackScrollMouseHandlers() {
        if (false === scrollbarExclusionTypes.has(this.track.type)) {
            this.innerScroll.removeEventListener('mousedown', this.boundTrackScrollMouseDownHandler)
            this.browser.columnContainer.removeEventListener('mouseup', this.boundColumnContainerMouseUpHandler)
            this.browser.columnContainer.removeEventListener('mousemove', this.boundColumnContainerMouseMoveHandler)
            this.browser.columnContainer.removeEventListener('mouseleave', this.boundColumnContainerMouseMoveHandler)
        }
    }

    addTrackDragMouseHandlers(browser) {

        if ('sequence' === this.track.type || false === multiTrackSelectExclusionTypes.has(this.track.type)) {

            let currentDragHandle = undefined

            // Mouse Down
            this.boundTrackDragMouseDownHandler = trackDragMouseDownHandler.bind(this)
            this.dragHandle.addEventListener('mousedown', this.boundTrackDragMouseDownHandler)

            function trackDragMouseDownHandler(event) {

                event.preventDefault()

                currentDragHandle = event.target
                if (false === this.track.selected || 'sequence' === this.track.type) {
                    currentDragHandle.classList.remove('igv-track-drag-handle-color')
                    currentDragHandle.classList.add('igv-track-drag-handle-hover-color')
                }

                browser.startTrackDrag(this)

            }

            // Mouse Up
            this.boundDocumentTrackDragMouseUpHandler = documentTrackDragMouseUpHandler.bind(this)
            document.addEventListener('mouseup', this.boundDocumentTrackDragMouseUpHandler)

            function documentTrackDragMouseUpHandler(event) {

                browser.endTrackDrag()

                if (currentDragHandle && event.target !== currentDragHandle) {

                    if (false === this.track.selected || 'sequence' === this.track.type) {
                        currentDragHandle.classList.remove('igv-track-drag-handle-hover-color')
                        currentDragHandle.classList.add('igv-track-drag-handle-color')
                    }

                }

                currentDragHandle = undefined
            }

            // Mouse Enter
            this.boundTrackDragMouseEnterHandler = trackDragMouseEnterHandler.bind(this)
            this.dragHandle.addEventListener('mouseenter', this.boundTrackDragMouseEnterHandler)

            function trackDragMouseEnterHandler(event) {
                event.preventDefault()

                if (undefined === currentDragHandle) {
                    if (false === this.track.selected || 'sequence' === this.track.type) {
                        event.target.classList.remove('igv-track-drag-handle-color')
                        event.target.classList.add('igv-track-drag-handle-hover-color')
                    }
                }

                browser.updateTrackDrag(this)

            }

            // Mouse Out
            this.dragHandle.addEventListener('mouseout', event => {
                event.preventDefault()

                if (undefined === currentDragHandle) {
                    if (false === this.track.selected || 'sequence' === this.track.type) {
                        event.target.classList.remove('igv-track-drag-handle-hover-color')
                        event.target.classList.add('igv-track-drag-handle-color')
                    }
                }
            })

            this.boundTrackDragMouseOutHandler = trackDragMouseOutHandler.bind(this)
            this.dragHandle.addEventListener('mouseout', this.boundTrackDragMouseOutHandler)

            function trackDragMouseOutHandler(event) {
                event.preventDefault()

                if (undefined === currentDragHandle) {
                    if (false === this.track.selected || 'sequence' === this.track.type) {
                        event.target.classList.remove('igv-track-drag-handle-hover-color')
                        event.target.classList.add('igv-track-drag-handle-color')
                    }
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

    removeTrackGearMouseHandlers() {
        if (true === this.track.ignoreTrackMenu) {
            // do nothing
        } else {
            this.gear.removeEventListener('click', this.boundTrackGearClickHandler)
        }

    }

    removeDOMFromColumnContainer() {

        // Axis
        this.axis.remove()
        this.removeViewportsFromColumnContainer()

        // Sample Info Viewport
        this.sampleInfoViewport.dispose()

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

    removeViewportsFromColumnContainer() {
        // Track Viewports
        for (let viewport of this.viewports) {
            viewport.viewportElement.remove()
        }
    }

    /**
     * Do any cleanup here
     */
    dispose() {

        this.axis.remove()

        for (let viewport of this.viewports) {
            viewport.dispose()
        }

        this.sampleInfoViewport.dispose()

        this.sampleNameViewport.dispose()

        this.removeTrackScrollMouseHandlers()
        this.outerScroll.remove()

        this.removeTrackDragMouseHandlers()
        this.dragHandle.remove()

        this.removeTrackGearMouseHandlers()
        this.gearContainer.remove()

        if (typeof this.track.dispose === "function") {
            this.track.dispose()
        }

        for (let key of Object.keys(this)) {
            this[key] = undefined
        }

        if (this.alert) {
            this.alert.container.remove()    // This is quite obviously a hack, need a "dispose" method on AlertDialog
        }

        this.disposed = true
    }

    paintAxis() {

        if (typeof this.track.paintAxis === 'function') {

            // Set the canvas buffer size, this is the resolution it is drawn at.  This is done here in case the browser
            // has been drug between screens at different dpi resolutions since the last repaint
            const {width, height} = this.axisCanvas.getBoundingClientRect()
            const dpi = window.devicePixelRatio || 1
            this.axisCanvas.height = dpi * height
            this.axisCanvas.width = dpi * width

            // Get a scaled context to draw aon
            const axisCanvasContext = this.axisCanvas.getContext('2d')
            axisCanvasContext.scale(dpi, dpi)

            if (this.track.autoscaleGroup) {

                if (undefined === autoScaleGroupColorHash[this.track.autoscaleGroup]) {
                    const colorPalette = colorPalettes['Dark2']
                    const randomIndex = Math.floor(Math.random() * colorPalettes['Dark2'].length)
                    autoScaleGroupColorHash[this.track.autoscaleGroup] = colorPalette[randomIndex]
                }
                const rgba = IGVColor.addAlpha(autoScaleGroupColorHash[this.track.autoscaleGroup], 0.75)
                this.track.paintAxis(axisCanvasContext, width, height, rgba)
            } else {
                this.track.paintAxis(axisCanvasContext, width, height, undefined)
            }
        }
    }

    maxViewportContentHeight() {
        return Math.max(...this.viewports.map(viewport => viewport.getContentHeight()))
    }

    enableTrackSelection(doEnableMultiSelection) {

        const container = this.trackSelectionContainer

        if (!container || multiTrackSelectExclusionTypes.has(this.track.type)) {
            return
        }

        if (false !== doEnableMultiSelection) {
            container.style.display = 'grid'
        } else {
            // If disabling selection set track selection state to false
            this.track.selected = false

            const trackSelectInput = container.querySelector('[name=track-select]')
            trackSelectInput.checked = this.track.selected

            if (this.dragHandle) {
                this.setDragHandleSelectionState(false)
            }

            container.style.display = 'none'
        }
    }

    setDragHandleSelectionState(isSelected) {

        const dragHandle = this.dragHandle

        if (isSelected) {
            dragHandle.classList.remove('igv-track-drag-handle-color')
            dragHandle.classList.remove('igv-track-drag-handle-hover-color')
            dragHandle.classList.add('igv-track-drag-handle-selected-color')
        } else {
            dragHandle.classList.remove('igv-track-drag-handle-hover-color')
            dragHandle.classList.remove('igv-track-drag-handle-selected-color')
            dragHandle.classList.add('igv-track-drag-handle-color')
        }
    }

}

function renderSVGAxis(context, track, axisCanvas, deltaX, deltaY) {

    if (typeof track.paintAxis === 'function') {

        const {y, width, height} = axisCanvas.getBoundingClientRect()

        const str = (track.name || track.id).replace(/\W/g, '')
        const id = `${str}_axis_guid_${DOMUtils.guid()}`

        context.saveWithTranslationAndClipRect(id, deltaX, y + deltaY, width, height, 0)

        track.paintAxis(context, width, height)

        context.restore()
    }

}

export {igv_axis_column_width}

export default TrackView
