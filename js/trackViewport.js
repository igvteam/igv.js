/**
 * Created by dat on 9/16/16.
 */

import $ from "./vendor/jquery-3.3.1.slim.js"
import Popover from "./ui/popover.js"
import Viewport from "./viewport.js"
import {FileUtils} from "../node_modules/igv-utils/src/index.js"
import * as DOMUtils from "./ui/utils/dom-utils.js"
import C2S from "./canvas2svg.js"
import GenomeUtils from "./genome/genomeUtils.js"
import {bppSequenceThreshold} from "./sequenceTrack.js"

const NOT_LOADED_MESSAGE = 'Error loading track data'

let mouseDownCoords
let lastClickTime = 0
let lastHoverUpdateTime = 0
let popupTimerID
let trackViewportPopoverList = []

let popover

class TrackViewport extends Viewport {

    constructor(trackView, viewportColumn, referenceFrame, width) {
        super(trackView, viewportColumn, referenceFrame, width)
    }

    initializationHelper() {

        this.$spinner = $('<div>', {class: 'igv-loading-spinner-container'})
        this.$viewport.append(this.$spinner)
        this.$spinner.append($('<div>'))

        const track = this.trackView.track
        if ('sequence' !== track.type) {
            this.$zoomInNotice = this.createZoomInNotice(this.$viewport)
        }

        if ("sequence" !== track.id) {
            this.$trackLabel = $('<div class="igv-track-label">')
            this.$viewport.append(this.$trackLabel)
            this.setTrackLabel(track.name || "")
            if (false === this.browser.doShowTrackLabels) {
                this.$trackLabel.hide()
            }
            // Setting track height can affect label style
            if (this.trackView.track.height) {
                this.setHeight(this.trackView.track.height)
            }
        }

        this.stopSpinner()
        this.addMouseHandlers()

    }

    setContentHeight(contentHeight) {
        super.setContentHeight(contentHeight)
        if (this.featureCache) this.featureCache.redraw = true
    }

    setTrackLabel(label) {

        this.$trackLabel.empty()
        this.$trackLabel.html(label)

        const txt = this.$trackLabel.text()
        this.$trackLabel.attr('title', txt)
    }

    startSpinner() {
        this.$spinner.show()
    }

    stopSpinner() {
        if (this.$spinner) {
            this.$spinner.hide()
        }
    }

    /**
     * Test to determine if we are zoomed in far enough to see features. Applicable to tracks with visibility windows.
     *
     * As a side effect the viewports canvas is removed if zoomed out.
     *
     * @returns {boolean} true if we are zoomed in past visibility window, false otherwise
     */
    checkZoomIn() {

        const zoomedOutOfWindow = () => {
            if (this.referenceFrame.chr.toLowerCase() === "all" && !this.trackView.track.supportsWholeGenome) {
                return true
            } else {
                const visibilityWindow = this.trackView.track.visibilityWindow
                return (
                    visibilityWindow !== undefined && visibilityWindow > 0 &&
                    (this.referenceFrame.bpPerPixel * this.$viewport.width() > visibilityWindow))
            }
        }

        if (this.trackView.track && "sequence" === this.trackView.track.type && this.referenceFrame.bpPerPixel > bppSequenceThreshold) {
            $(this.canvas).remove()
            this.canvas = undefined
            //this.featureCache = undefined
            return false
        }

        if (!(this.viewIsReady())) {
            return false
        }


        if (zoomedOutOfWindow()) {

            // Out of visibility window
            if (this.canvas) {
                $(this.canvas).remove()
                this.canvas = undefined
                //this.featureCache = undefined
            }
            if (this.trackView.track.autoHeight) {
                const minHeight = this.trackView.minHeight || 0
                this.setContentHeight(minHeight)
            }
            if (this.$zoomInNotice) {
                this.$zoomInNotice.show()
            }
            return false
        } else {
            if (this.$zoomInNotice) {
                this.$zoomInNotice.hide()
            }
            return true
        }

    }

    /**
     * Adjust the canvas to the current genomic state.
     */
    shift() {
        const referenceFrame = this.referenceFrame
        if (this.canvas &&
            this.canvas._data &&
            this.canvas._data.referenceFrame.chr === this.referenceFrame.chr &&
            this.canvas._data.bpPerPixel === referenceFrame.bpPerPixel) {
            this.canvas._data.pixelShift = Math.round((this.canvas._data.bpStart - referenceFrame.start) / referenceFrame.bpPerPixel)
            this.canvas.style.left = this.canvas._data.pixelShift + "px"
        }
    }

    genomicRange() {
        return {
            start: this.referenceFrame.start,
            end: this.referenceFrame.start + this.referenceFrame.bpPerPixel * this.$viewport.width()
        }
    }

    /**
     * Set the content top of the current view.  This is triggered by scrolling.   If the current canvas extent is not
     * sufficient to cover the new vertical range repaint.
     *
     * @param contentTop - the "top" property of the virtual content div, 0 unless track is scrolled vertically
     *
     *
     */
    setTop(contentTop) {

        super.setTop(contentTop)

        if (!this.canvas) {
            this.repaint()
        } else {
            // See if currently painted canvas covers the vertical range of the viewport.  If not repaint
            const h = this.$viewport.height()
            const vt = contentTop + this.canvas._data.pixelTop
            const vb = vt + this.canvas._data.pixelHeight
            if (vt > 0 || vb < h) {
                this.repaint()
            }
        }

        // If data is loaded,  offset backing canvas to align with the contentTop visual offset.  If not data has
        // been loaded canvas will be undefined
        if(this.canvas && this.canvas._data) {
            let offset = contentTop + this.canvas._data.pixelTop
            this.canvas.style.top = `${offset}px`
        }
    }

    setHeight(h) {
        super.setHeight(h)
        const labelElement = this.$viewport.get(0).querySelector(".igv-track-label");
        if(labelElement) {
            // If the track height is small center the label vertically.
            if (h < 30) {
                //labelElement.classList.add("igv-vertical-center")
               // .igv-vertical-center {
               //      margin: 0 ;
               //      top: 50% ;
               //      -ms-transform: translateY(-50%);
               //      transform: translateY(-50%);
               //  }
                labelElement.style.margin = 0
                labelElement.style.top = "50%"
                labelElement.style.transform = "translateY(-50%)"
                labelElement.style["-ms-transform"] = "translateY(-50%)"
            } else {
                //labelElement.classList.remove("igv-vertical-center")
                labelElement.style.removeProperty("margin")
                labelElement.style.removeProperty("top")
                labelElement.style.removeProperty("transform")
                labelElement.style.removeProperty("-ms-transform")
            }
        }
    }

    async loadFeatures() {

        const referenceFrame = this.referenceFrame
        const chr = referenceFrame.chr

        // Expand the requested range so we can pan a bit without reloading.  But not beyond chromosome bounds
        const chromosome = await this.browser.genome.loadChromosome(chr)
        const chrLength = chromosome ? chromosome.bpLength : Number.MAX_SAFE_INTEGER
        const pixelWidth = this.$viewport.width()// * 3;
        const bpWidth = pixelWidth * referenceFrame.bpPerPixel
        const bpStart = Math.floor(Math.max(0, referenceFrame.start - bpWidth))
        const bpEnd = Math.ceil(Math.min(chrLength, referenceFrame.start + bpWidth + bpWidth))  // Add one screen width to end

        if (this.loading && this.loading.start === bpStart && this.loading.end === bpEnd) {
            return undefined
        }
        this.loading = {start: bpStart, end: bpEnd}
        this.startSpinner()

        try {
            const track = this.trackView.track
            const features = await this.getFeatures(track, chr, bpStart, bpEnd, referenceFrame.bpPerPixel)
            if (features) {
                let roiFeatures = []
                if (track.roiSets && track.roiSets.length > 0) {
                    for (let roiSet of track.roiSets) {
                        const features = await roiSet.getFeatures(chr, bpStart, bpEnd, referenceFrame.bpPerPixel)
                        roiFeatures.push({track: roiSet, features})
                    }
                }

                const mr = track && (track.resolutionAware)   //
                const windowFunction = this.windowFunction
                this.featureCache = new FeatureCache(chr, bpStart, bpEnd, referenceFrame.bpPerPixel, features, roiFeatures, mr, windowFunction)
                this.loading = false
                this.hideMessage()
                this.stopSpinner()
                return this.featureCache
            }
        } catch (error) {
            // Track might have been removed during load
            if (this.trackView && this.trackView.disposed !== true) {
                this.showMessage(NOT_LOADED_MESSAGE)
                this.browser.alert.present(error)
                console.error(error)
            }
        } finally {
            this.loading = false
            this.stopSpinner()
        }
    }

    get track() {
        return this.trackView.track
    }

    get windowFunction() {
        return this.track ? this.track.windowFunction : undefined
    }

    /**
     * Compute the genomic extent and needed pixelWidth to repaint the canvas for the current genomic state.
     * Normally the canvas is size 3X the width of the viewport, however there is no left-right panning for WGV so
     * canvas width is viewport width.
     * @returns {{bpEnd: *, pixelWidth: (*|number), bpStart: number}}
     */
    repaintDimensions() {
        const isWGV = GenomeUtils.isWholeGenomeView(this.referenceFrame.chr)
        const pixelWidth = isWGV ? this.$viewport.width() : 3 * this.$viewport.width()
        const bpPerPixel = this.referenceFrame.bpPerPixel
        const bpStart = this.referenceFrame.start - (isWGV ? 0 : this.$viewport.width() * bpPerPixel)
        const bpEnd = isWGV ? Number.MAX_SAFE_INTEGER : this.referenceFrame.start +  2 * this.$viewport.width() * bpPerPixel + 1
        return {
            bpStart, bpEnd, pixelWidth
        }
    }

    /**
     * Repaint the canvas using the cached features
     *
     */
    repaint() {

        if (undefined === this.featureCache) {
            return
        }

        const {features, roiFeatures} = this.featureCache

        // Canvas dimensions.
        // For deep tracks we paint a canvas == 3*viewportHeight centered on the current vertical scroll position
        const {bpStart, bpEnd, pixelWidth} = this.repaintDimensions()
        const viewportHeight = this.$viewport.height()
        const contentHeight = this.getContentHeight()
        const maxHeight = roiFeatures ? Math.max(contentHeight, viewportHeight) : contentHeight  // Need to fill viewport for ROIs.
        const pixelHeight = Math.min(maxHeight, 3 * viewportHeight)
        if (0 === pixelWidth || 0 === pixelHeight) {
            if (this.canvas) {
                $(this.canvas).remove()
            }
            return
        }
        const pixelTop = Math.max(0, -this.contentTop - Math.floor(pixelHeight / 3))

        const bpPerPixel = this.referenceFrame.bpPerPixel
        const pixelXOffset = Math.round((bpStart - this.referenceFrame.start) / bpPerPixel)
        const canvasTop = (this.contentTop || 0) + pixelTop
        const newCanvas = document.createElement('canvas')//  $('<canvas class="igv-canvas">').get(0)
        newCanvas.style.position = 'relative'
        newCanvas.style.display = 'block'
        newCanvas.style.width = pixelWidth + "px"
        newCanvas.style.height = pixelHeight + "px"
        newCanvas.style.left = pixelXOffset + "px"
        newCanvas.style.top = canvasTop + "px"

        // Always use high DPI if in "FILL" display mode, otherwise use track setting;
        const devicePixelRatio = ("FILL" === this.trackView.track.displayMode || this.trackView.track.supportHiDPI !== false) ?
            window.devicePixelRatio : 1
        newCanvas.width = devicePixelRatio * pixelWidth
        newCanvas.height = devicePixelRatio * pixelHeight

        const ctx = newCanvas.getContext("2d")
        ctx.scale(devicePixelRatio, devicePixelRatio)
        ctx.translate(0, -pixelTop)

        const drawConfiguration =
            {
                context: ctx,
                pixelXOffset,
                pixelWidth,
                pixelHeight,
                pixelTop,
                bpStart,
                bpEnd,
                bpPerPixel,
                pixelShift: pixelXOffset,              // Initial value, changes with track pan (drag)
                windowFunction: this.windowFunction,
                referenceFrame: this.referenceFrame,
                selection: this.selection,
                viewport: this,
                viewportWidth: this.$viewport.width()
            }

        this.draw(drawConfiguration, features, roiFeatures)

        if (this.canvas) {
            $(this.canvas).remove()
        }
        newCanvas._data = drawConfiguration
        this.canvas = newCanvas
        this.$viewport.append($(newCanvas))

    }

    refresh() {
        if (!(this.canvas && this.featureCache)) return

        const drawConfiguration = this.canvas._data
        drawConfiguration.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
        const {features, roiFeatures} = this.featureCache
        this.draw(drawConfiguration, features, roiFeatures)
    }

    /**
     * Draw the associated track.
     *
     * @param drawConfiguration
     * @param features
     * @param roiFeatures
     */
    draw(drawConfiguration, features, roiFeatures) {

        if (features) {
            drawConfiguration.features = features
            this.trackView.track.draw(drawConfiguration)
        }
        if (roiFeatures && roiFeatures.length > 0) {
            for (let r of roiFeatures) {
                drawConfiguration.features = r.features
                r.track.draw(drawConfiguration)
            }
        }
    }

    containsPosition(chr, position) {
        if (this.referenceFrame.chr === chr && position >= this.referenceFrame.start) {
            return position <= this.referenceFrame.calculateEnd(this.getWidth())
        } else {
            return false
        }
    }

    isLoading() {
        return this.loading
    }

    savePNG() {

        if (!this.canvas) return

        const canvasMetadata = this.canvas._data
        const canvasTop = canvasMetadata ? canvasMetadata.pixelTop : 0
        const devicePixelRatio = window.devicePixelRatio
        const w = this.$viewport.width() * devicePixelRatio
        const h = this.$viewport.height() * devicePixelRatio
        const x = -$(this.canvas).position().left * devicePixelRatio
        const y = (-this.contentTop - canvasTop) * devicePixelRatio

        const ctx = this.canvas.getContext("2d")
        const imageData = ctx.getImageData(x, y, w, h)
        const exportCanvas = document.createElement('canvas')
        const exportCtx = exportCanvas.getContext('2d')
        exportCanvas.width = imageData.width
        exportCanvas.height = imageData.height
        exportCtx.putImageData(imageData, 0, 0)

        // filename = this.trackView.track.name + ".png";
        const filename = (this.$trackLabel.text() ? this.$trackLabel.text() : "image") + ".png"
        const data = exportCanvas.toDataURL("image/png")
        FileUtils.download(filename, data)
    }

    saveSVG() {

        const marginTop = 32
        const marginLeft = 32

        let {width, height} = this.browser.columnContainer.getBoundingClientRect()

        const h_render = 8000

        const config =
            {
                width,
                height: h_render,
                backdropColor: 'white',
                multiLocusGap: 0,
                viewbox:
                    {
                        x: 0,
                        y: 0,
                        width,
                        height: h_render
                    }
            }

        const context = new C2S(config)

        const delta =
            {
                deltaX: marginLeft,
                deltaY: marginTop
            }

        this.renderSVGContext(context, delta, false)

        // reset height to trim away unneeded svg canvas real estate. Yes, a bit of a hack.
        context.setHeight(height)

        const str = (this.trackView.track.name || this.trackView.track.id).replace(/\W/g, '')
        const index = this.browser.referenceFrameList.indexOf(this.referenceFrame)

        const svg = context.getSerializedSvg(true)
        const data = URL.createObjectURL(new Blob([svg], {type: "application/octet-stream"}))

        const id = `${str}_referenceFrame_${index}_guid_${DOMUtils.guid()}`
        FileUtils.download(`${id}.svg`, data)

    }


    renderSVGContext(context, {deltaX, deltaY}, includeLabel = true) {

        const zoomInNotice = this.$zoomInNotice && this.$zoomInNotice.is(":visible")

        if (!zoomInNotice) {

            const {width, height} = this.$viewport.get(0).getBoundingClientRect()

            const str = (this.trackView.track.name || this.trackView.track.id).replace(/\W/g, '')
            const index = this.browser.referenceFrameList.indexOf(this.referenceFrame)
            const id = `${str}_referenceFrame_${index}_guid_${DOMUtils.guid()}`

            const x = deltaX
            const y = deltaY + this.contentTop
            const yClipOffset = -this.contentTop

            context.saveWithTranslationAndClipRect(id, x, y, width, height, yClipOffset)

            const {start, bpPerPixel} = this.referenceFrame
            const pixelXOffset = Math.round((start - this.referenceFrame.start) / bpPerPixel)

            const config =
                {
                    context,
                    viewport: this,
                    referenceFrame: this.referenceFrame,
                    top: yClipOffset,
                    pixelTop: yClipOffset,
                    pixelWidth: width,
                    pixelHeight: height,
                    pixelXOffset,
                    pixelShift: pixelXOffset,
                    bpStart: start,
                    bpEnd: start + (width * bpPerPixel),
                    bpPerPixel,
                    viewportWidth: width,
                    selection: this.selection
                }

            const features = this.featureCache ? this.featureCache.features : undefined
            const roiFeatures = this.featureCache ? this.featureCache.roiFeatures : undefined
            this.draw(config, features, roiFeatures)

            context.restore()
        }


        if (includeLabel && this.$trackLabel && this.browser.doShowTrackLabels) {
            const {x, y, width, height} = DOMUtils.relativeDOMBBox(this.$viewport.get(0), this.$trackLabel.get(0))
            this.renderTrackLabelSVG(context, deltaX + x, deltaY + y, width, height)
        }
    }

    // render track label element called from renderSVGContext()
    renderTrackLabelSVG(context, tx, ty, width, height) {

        const str = (this.trackView.track.name || this.trackView.track.id).replace(/\W/g, '')
        const id = `${str}_track_label_guid_${DOMUtils.guid()}`

        context.saveWithTranslationAndClipRect(id, tx, ty, width, height, 0)

        context.fillStyle = "white"
        context.fillRect(0, 0, width, height)

        context.font = "12px Arial"
        context.fillStyle = 'rgb(68, 68, 68)'

        const {width: stringWidth} = context.measureText(this.$trackLabel.text())
        const dx = 0.25 * (width - stringWidth)
        const dy = 0.7 * (height - 12)
        context.fillText(this.$trackLabel.text(), dx, height - dy)

        context.strokeStyle = 'rgb(68, 68, 68)'
        context.strokeRect(0, 0, width, height)

        context.restore()

    }

    get cachedFeatures() {
        return this.featureCache ? this.featureCache.features : []
    }

    clearCache() {
        this.featureCache = undefined
        if (this.canvas) this.canvas._data = undefined
    }

    async getFeatures(track, chr, start, end, bpPerPixel) {
        if (this.featureCache && this.featureCache.containsRange(chr, start, end, bpPerPixel, this.windowFunction)) {
            return this.featureCache.features
        } else if (typeof track.getFeatures === "function") {
            const features = await track.getFeatures(chr, start, end, bpPerPixel, this)
            this.checkContentHeight(features)
            return features
        } else {
            return undefined
        }
    }

    needsRepaint() {

        if (!this.canvas) return true

        const data = this.canvas._data
        return !data ||
            this.referenceFrame.start < data.bpStart ||
            this.referenceFrame.end > data.bpEnd ||
            this.referenceFrame.chr !== data.referenceFrame.chr ||
            this.referenceFrame.bpPerPixel != data.bpPerPixel ||
            this.windowFunction != data.windowFunction
    }

    needsReload() {
        if (!this.featureCache) return true
        const {chr, bpPerPixel} = this.referenceFrame
        const {bpStart, bpEnd} = this.repaintDimensions()
        return (!this.featureCache.containsRange(chr, bpStart, bpEnd, bpPerPixel, this.windowFunction))
    }

    createZoomInNotice($parent) {

        const $container = $('<div>', {class: 'igv-zoom-in-notice-container'})
        $parent.append($container)

        const $e = $('<div>')
        $container.append($e)

        $e.text('Zoom in to see features')

        $container.hide()

        return $container
    }

    viewIsReady() {
        return this.browser && this.browser.referenceFrameList && this.referenceFrame
    }

    addMouseHandlers() {

        const viewport = this.$viewport.get(0)

        this.addViewportContextMenuHandler(viewport)

        // Mouse down
        const md = (event) => {
            this.enableClick = true
            this.browser.mouseDownOnViewport(event, this)
            mouseDownCoords = DOMUtils.pageCoordinates(event)
        }
        viewport.addEventListener('mousedown', md)
        viewport.addEventListener('touchstart', md)

        // Mouse up
        const mu = (event) => {
            // Any mouse up cancels drag and scrolling
            if (this.browser.dragObject || this.browser.isScrolling) {
                this.browser.cancelTrackPan()
                // event.preventDefault();
                // event.stopPropagation();
                this.enableClick = false   // Until next mouse down
            } else {
                this.browser.cancelTrackPan()
                this.browser.endTrackDrag()
            }
        }
        viewport.addEventListener('mouseup', mu)
        viewport.addEventListener('touchend', mu)

        // Mouse move
        if (typeof this.trackView.track.hoverText === 'function') {
            viewport.addEventListener('mousemove', (event => {
                if (event.buttons === 0 && (Date.now() - lastHoverUpdateTime > 100)) {
                    lastHoverUpdateTime = Date.now()
                    const clickState = this.createClickState(event)
                    if (clickState) {
                        const tooltip = this.trackView.track.hoverText(clickState)
                        if (tooltip) {
                            this.$viewport[0].setAttribute("title", tooltip)
                        } else {
                            this.$viewport[0].removeAttribute("title")
                        }
                    }
                }
            }))
        }

        this.addViewportClickHandler(this.$viewport.get(0))

        if (this.trackView.track.name && "sequence" !== this.trackView.track.config.type) {
            this.addTrackLabelClickHandler(this.$trackLabel.get(0))
        }

    }

    addViewportContextMenuHandler(viewport) {

        viewport.addEventListener('contextmenu', (event) => {

            // Ignore if we are doing a drag.  This can happen with touch events.
            if (this.browser.dragObject) {
                return false
            }

            const clickState = this.createClickState(event)

            if (undefined === clickState) {
                return false
            }

            event.preventDefault()

            // Track specific items
            let menuItems = []
            if (typeof this.trackView.track.contextMenuItemList === "function") {
                const trackMenuItems = this.trackView.track.contextMenuItemList(clickState)
                if (trackMenuItems) {
                    menuItems = trackMenuItems
                }
            }

            // Add items common to all tracks
            if (menuItems.length > 0) {
                menuItems.push({label: $('<HR>')})
            }

            menuItems.push({label: 'Save Image (PNG)', click: () => this.savePNG()})
            menuItems.push({label: 'Save Image (SVG)', click: () => this.saveSVG()})

            this.browser.menuPopup.presentTrackContextMenu(event, menuItems)
        })

    }


    addViewportClickHandler(viewport) {

        viewport.addEventListener('click', (event) => {

            if (this.enableClick && this.canvas) {
                if (3 === event.which || event.ctrlKey) {
                    return
                }

                if (this.browser.dragObject || this.browser.isScrolling) {
                    return
                }

                // Treat as a mouse click, it's either a single or double click.
                // Handle here and stop propagation / default
                event.preventDefault()

                const mouseX = DOMUtils.translateMouseCoordinates(event, this.$viewport.get(0)).x
                const mouseXCanvas = DOMUtils.translateMouseCoordinates(event, this.canvas).x
                const referenceFrame = this.referenceFrame
                const xBP = Math.floor((referenceFrame.start) + referenceFrame.toBP(mouseXCanvas))

                const time = Date.now()

                if (time - lastClickTime < this.browser.constants.doubleClickDelay) {

                    // double-click
                    if (popupTimerID) {
                        window.clearTimeout(popupTimerID)
                        popupTimerID = undefined
                    }

                    const centerBP = Math.round(referenceFrame.start + referenceFrame.toBP(mouseX))

                    let string

                    if ('all' === this.referenceFrame.chr.toLowerCase()) {

                        const chr = this.browser.genome.getChromosomeCoordinate(centerBP).chr

                        if (1 === this.browser.referenceFrameList.length) {
                            string = chr
                        } else {
                            const loci = this.browser.referenceFrameList.map(({locusSearchString}) => locusSearchString)
                            const index = this.browser.referenceFrameList.indexOf(this.referenceFrame)
                            loci[index] = chr
                            string = loci.join(' ')
                        }

                        this.browser.search(string)

                    } else {
                        this.browser.zoomWithScaleFactor(0.5, centerBP, this.referenceFrame)
                    }


                } else {
                    // single-click

                    /*if (event.shiftKey && typeof this.trackView.track.shiftClick === "function") {

                        this.trackView.track.shiftClick(xBP, event)

                    } else */

                    if (typeof this.trackView.track.popupData === "function") {

                        popupTimerID = setTimeout(() => {

                                const content = this.getPopupContent(event)
                                if (content) {

                                    if (false === event.shiftKey) {

                                        if (popover) {
                                            popover.dispose()
                                        }

                                        if (trackViewportPopoverList.length > 0) {
                                            for (const gp of trackViewportPopoverList) {
                                                gp.dispose()
                                            }
                                            trackViewportPopoverList.length = 0
                                        }

                                        popover = new Popover(this.$viewport.get(0).parentElement, true, undefined, () => {
                                            popover.dispose()
                                        })

                                        popover.presentContentWithEvent(event, content)
                                    } else {

                                        let po = new Popover(this.$viewport.get(0).parentElement, true, undefined, () => {
                                            const index = trackViewportPopoverList.indexOf(po)
                                            trackViewportPopoverList.splice(index, 1)
                                            po.dispose()
                                        })

                                        trackViewportPopoverList.push(po)

                                        po.presentContentWithEvent(event, content)
                                    }

                                }
                                window.clearTimeout(popupTimerID)
                                popupTimerID = undefined
                            },
                            this.browser.constants.doubleClickDelay)
                    }
                }

                lastClickTime = time

            }
        })
    }

    addTrackLabelClickHandler(trackLabel) {

        trackLabel.addEventListener('click', (event) => {

            event.stopPropagation()

            const {track} = this.trackView

            let str
            if (typeof track.description === 'function') {
                str = track.description()
            } else if (track.description) {
                str = `<div>${track.description}</div>`
            }

            if (str) {
                if (undefined === this.popover) {
                    this.popover = new Popover(this.browser.columnContainer, true, (track.name || ''), undefined)
                }
                this.popover.presentContentWithEvent(event, str)
            }
        })
    }

    createClickState(event) {

        if (!this.canvas) return  // Can happen during initialization

        const referenceFrame = this.referenceFrame
        const viewportCoords = DOMUtils.translateMouseCoordinates(event, this.$viewport.get(0))
        const canvasCoords = DOMUtils.translateMouseCoordinates(event, this.canvas)
        const genomicLocation = (((referenceFrame.start) + referenceFrame.toBP(viewportCoords.x)))

        return {
            event,
            viewport: this,
            referenceFrame,
            genomicLocation,
            y: viewportCoords.y - this.contentTop,
            canvasX: canvasCoords.x,
            canvasY: canvasCoords.y
        }

    }

    getPopupContent(event) {

        const clickState = this.createClickState(event)

        if (undefined === clickState) {
            return
        }

        let track = this.trackView.track
        const dataList = track.popupData(clickState)

        const popupClickHandlerResult = this.browser.fireEvent('trackclick', [track, dataList])

        let content
        if (undefined === popupClickHandlerResult || true === popupClickHandlerResult) {
            // Indicates handler did not handle the result, or the handler wishes default behavior to occur
            if (dataList && dataList.length > 0) {
                content = formatPopoverText(dataList)
            }

        } else if (typeof popupClickHandlerResult === 'string') {
            content = popupClickHandlerResult
        }

        return content
    }

    dispose() {

        if (this.popover) {
            this.popover.dispose()
        }

        // if (trackViewportPopoverList) {
        //     for (let i = 0; i < trackViewportPopoverList.length; i++ ) {
        //         trackViewportPopoverList[ i ].dispose()
        //     }
        //
        //     trackViewportPopoverList = undefined
        // }

        super.dispose()
    }

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

class FeatureCache {

    constructor(chr, tileStart, tileEnd, bpPerPixel, features, roiFeatures, multiresolution, windowFunction) {
        this.chr = chr
        this.bpStart = tileStart
        this.bpEnd = tileEnd
        this.bpPerPixel = bpPerPixel
        this.features = features
        this.roiFeatures = roiFeatures
        this.multiresolution = multiresolution
        this.windowFunction = windowFunction
    }

    containsRange(chr, start, end, bpPerPixel, windowFunction) {

        if (windowFunction && windowFunction !== this.windowFunction) return false

        // For multi-resolution tracks allow for a 2X change in bpPerPixel
        const r = this.multiresolution ? this.bpPerPixel / bpPerPixel : 1

        return start >= this.bpStart && end <= this.bpEnd && chr === this.chr && r > 0.5 && r < 2
    }

    overlapsRange(chr, start, end) {
        return this.chr === chr && end >= this.bpStart && start <= this.bpEnd
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

export {trackViewportPopoverList}
export default TrackViewport
