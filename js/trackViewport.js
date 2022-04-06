/**
 * Created by dat on 9/16/16.
 */

import $ from "./vendor/jquery-3.3.1.slim.js"
import {Alert, Popover} from '../node_modules/igv-ui/dist/igv-ui.js'
import Viewport from "./viewport.js"
import {DOMUtils, FileUtils} from "../node_modules/igv-utils/src/index.js"
import C2S from "./canvas2svg.js"
import GenomeUtils from "./genome/genome.js"

const NOT_LOADED_MESSAGE = 'Error loading track data'

let mouseDownCoords
let lastClickTime = 0
let popupTimerID

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
            this.$zoomInNotice = this.createZoomInNotice(this.$content)
        }

        if (track.name && "sequence" !== track.id) {
            this.$trackLabel = $('<div class="igv-track-label">')
            this.$viewport.append(this.$trackLabel)
            this.setTrackLabel(track.name)
            if (false === this.browser.trackLabelsVisible) {
                this.$trackLabel.hide()
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

        if (this.trackView.track && "sequence" === this.trackView.track.type && this.referenceFrame.bpPerPixel > 1) {
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
            this.canvas._data.chr === this.referenceFrame.chr &&
            this.canvas._data.bpPerPixel === referenceFrame.bpPerPixel) {
            const pixelOffset = Math.round((this.canvas._data.startBP - referenceFrame.start) / referenceFrame.bpPerPixel)
            this.canvas.style.left = pixelOffset + "px"
        }
    }

    async loadFeatures() {

        const referenceFrame = this.referenceFrame
        const chr = referenceFrame.chr

        // Expand the requested range so we can pan a bit without reloading.  But not beyond chromosome bounds
        const chrLength = this.browser.genome.getChromosome(chr).bpLength
        const pixelWidth = this.$content.width()// * 3;
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
            let roiFeatures = []
            if (track.roiSets && track.roiSets.length > 0) {
                for (let roiSet of track.roiSets) {
                    const features = await roiSet.getFeatures(chr, bpStart, bpEnd, referenceFrame.bpPerPixel)
                    roiFeatures.push({track: roiSet, features})
                }
            }

            const mr = track && ("wig" === track.type || "merged" === track.type)   // wig tracks are potentially multiresolution (e.g. bigwig)
            this.featureCache = new FeatureCache(chr, bpStart, bpEnd, referenceFrame.bpPerPixel, features, roiFeatures, mr)
            this.loading = false
            this.hideMessage()
            this.stopSpinner()
            return this.featureCache
        } catch (error) {
            // Track might have been removed during load
            if (this.trackView && this.trackView.disposed !== true) {
                this.showMessage(NOT_LOADED_MESSAGE)
                Alert.presentAlert(error)
                console.error(error)
            }
        } finally {
            this.loading = false
            this.stopSpinner()
        }
    }

    repaintDimensions() {
        const isWGV = GenomeUtils.isWholeGenomeView(this.referenceFrame.chr)
        const pixelWidth = isWGV ? this.$viewport.width() : 3 * this.$viewport.width()
        const bpPerPixel = this.referenceFrame.bpPerPixel
        const startBP = this.referenceFrame.start - (isWGV ? 0 : pixelWidth / 3 * bpPerPixel)
        const endBP = this.referenceFrame.end + (isWGV ? 0 : pixelWidth / 3 * bpPerPixel)
        return {
            startBP, endBP, pixelWidth
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

        let {features, roiFeatures} = this.featureCache
        //this.tile.bpPerPixel = this.referenceFrame.bpPerPixel

        // const isWGV = GenomeUtils.isWholeGenomeView(this.browser.referenceFrameList[0].chr)
        const isWGV = GenomeUtils.isWholeGenomeView(this.referenceFrame.chr)

        // Canvas dimensions. There is no left-right panning for WGV so canvas width is viewport width.
        // For deep tracks we paint a canvas == 3*viewportHeight centered on the current vertical scroll position
        const {startBP, endBP, pixelWidth} = this.repaintDimensions()
        const viewportHeight = this.$viewport.height()
        const contentHeight = this.getContentHeight()
        const minHeight = roiFeatures ? Math.max(contentHeight, viewportHeight) : contentHeight  // Need to fill viewport for ROIs.
        const pixelHeight = Math.min(minHeight, 3 * viewportHeight)
        if (0 === pixelWidth || 0 === pixelHeight) {
            if (this.canvas) {
                $(this.canvas).remove()
            }
            return
        }
        const canvasTop = Math.max(0, -(this.$content.position().top) - viewportHeight)

        const bpPerPixel = this.referenceFrame.bpPerPixel
        //const startBP = this.referenceFrame.start - (isWGV ? 0 : pixelWidth / 3 * bpPerPixel)
        //const endBP = this.referenceFrame.end + (isWGV ? 0 : pixelWidth / 3 * bpPerPixel)
        const pixelXOffset = Math.round((startBP - this.referenceFrame.start) / bpPerPixel)

        const newCanvas = $('<canvas class="igv-canvas">').get(0)
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
            }

        this.draw(drawConfiguration, features, roiFeatures)

        this.featureCache.canvasTop = canvasTop
        this.featureCache.height = pixelHeight

        if (this.canvas) {
            $(this.canvas).remove()
        }
        newCanvas._data = {
            chr: this.featureCache.chr, bpPerPixel, startBP, endBP, pixelHeight, pixelTop: canvasTop
        }
        this.canvas = newCanvas
        this.$content.append($(newCanvas))

    }

    /**
     * Draw the associated track.
     *
     * @param drawConfiguration
     * @param features
     * @param roiFeatures
     */
    draw(drawConfiguration, features, roiFeatures) {

        // console.log(`${ Date.now() } viewport draw(). track ${ this.trackView.track.type }. content-css-top ${ this.$content.css('top') }. canvas-top ${ drawConfiguration.pixelTop }.`)

        if (features) {
            drawConfiguration.features = features
            this.trackView.track.draw(drawConfiguration)
        }
        if (roiFeatures) {
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

        const canvasMetadata = this.featureCache
        const canvasTop = canvasMetadata ? canvasMetadata.canvasTop : 0
        const devicePixelRatio = window.devicePixelRatio
        const w = this.$viewport.width() * devicePixelRatio
        const h = this.$viewport.height() * devicePixelRatio
        const x = -$(this.canvas).position().left * devicePixelRatio
        const y = (-this.$content.position().top - canvasTop) * devicePixelRatio

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

        const {width, height} = this.$viewport.get(0).getBoundingClientRect()

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

        const context = new C2S(config)

        const str = (this.trackView.track.name || this.trackView.track.id).replace(/\W/g, '')

        const index = this.browser.referenceFrameList.indexOf(this.referenceFrame)
        const id = `${str}_referenceFrame_${index}_guid_${DOMUtils.guid()}`

        this.drawSVGWithContext(context, width, height, id, 0, 0, 0)

        const svg = context.getSerializedSvg(true)
        const data = URL.createObjectURL(new Blob([svg], {type: "application/octet-stream"}))

        FileUtils.download(`${id}.svg`, data)
    }

    // called by trackView.renderSVGContext() when rendering
    // entire browser as SVG

    renderSVGContext(context, {deltaX, deltaY}) {

        // Nothing to do if zoomInNotice is active
        if (this.$zoomInNotice && this.$zoomInNotice.is(":visible")) {
            return
        }

        const str = (this.trackView.track.name || this.trackView.track.id).replace(/\W/g, '')

        const index = this.browser.referenceFrameList.indexOf(this.referenceFrame)
        const id = `${str}_referenceFrame_${index}_guid_${DOMUtils.guid()}`

        const {top: yScrollDelta} = this.$content.position()

        const {width, height} = this.$viewport.get(0).getBoundingClientRect()

        this.drawSVGWithContext(context, width, height, id, deltaX, deltaY + yScrollDelta, -yScrollDelta)

        if (this.$trackLabel && true === this.browser.trackLabelsVisible) {
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

    // called by renderSVGContext()
    drawSVGWithContext(context, width, height, id, x, y, yClipOffset) {

        context.saveWithTranslationAndClipRect(id, x, y, width, height, yClipOffset)

        let {start, bpPerPixel} = this.referenceFrame

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
            }

        const features = this.featureCache ? this.featureCache.features : []
        const roiFeatures = this.featureCache ? this.featureCache.roiFeatures : undefined
        this.draw(config, features, roiFeatures)

        context.restore()

    }

    get cachedFeatures() {
        return this.featureCache ? this.featureCache.features : []
    }

    async getFeatures(track, chr, start, end, bpPerPixel) {

        if (this.featureCache && this.featureCache.containsRange(chr, start, end, bpPerPixel)) {
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
            this.referenceFrame.start < data.startBP ||
            this.referenceFrame.end > data.endBP ||
            this.referenceFrame.chr !== data.chr ||
            this.referenceFrame.bpPerPixel != data.bpPerPixel
    }

    needsReload() {
        if (!this.featureCache) return true
        const referenceFrame = this.referenceFrame
        const chr = this.referenceFrame.chr
        const bpPerPixel = referenceFrame.bpPerPixel
        const {startBP, endBP} = this.repaintDimensions()
        return (!this.featureCache.containsRange(chr, startBP, endBP, bpPerPixel))
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

        const md = (event) => {
            this.enableClick = true
            this.browser.mouseDownOnViewport(event, this)
            mouseDownCoords = DOMUtils.pageCoordinates(event)
        }
        viewport.addEventListener('mousedown', md)
        viewport.addEventListener('touchstart', md)

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

            const clickState = createClickState(event, this)

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

            menuItems.push({label: 'Save Image (PNG)', click: () => this.saveImage()})
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

                // Close any currently open popups
                $('.igv-popover').hide()


                if (this.browser.dragObject || this.browser.isScrolling) {
                    return
                }

                // Treat as a mouse click, its either a single or double click.
                // Handle here and stop propogation / default
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

                    if (event.shiftKey && typeof this.trackView.track.shiftClick === "function") {

                        this.trackView.track.shiftClick(xBP, event)

                    } else if (typeof this.trackView.track.popupData === "function") {

                        popupTimerID = setTimeout(() => {

                                const content = getPopupContent(event, this)
                                if (content) {
                                    if (this.popover) this.popover.dispose()
                                    this.popover = new Popover(this.browser.columnContainer)
                                    this.popover.presentContentWithEvent(event, content)
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
                if (this.popover) {
                    this.popover.dispose()
                }
                this.popover = new Popover(this.browser.columnContainer, (track.name || ''))
                this.popover.presentContentWithEvent(event, str)
            }
        })
    }

}

function mouseDownHandler(event) {
    this.enableClick = true
    this.browser.mouseDownOnViewport(event, this)
    mouseDownCoords = DOMUtils.pageCoordinates(event)
}

function mouseUpHandler(event) {

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

function createClickState(event, viewport) {

    const referenceFrame = viewport.referenceFrame
    const viewportCoords = DOMUtils.translateMouseCoordinates(event, viewport.contentDiv)
    const canvasCoords = DOMUtils.translateMouseCoordinates(event, viewport.canvas)
    const genomicLocation = ((referenceFrame.start) + referenceFrame.toBP(viewportCoords.x))

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

    const clickState = createClickState(event, viewport)

    if (undefined === clickState) {
        return
    }

    let track = viewport.trackView.track
    const dataList = track.popupData(clickState)

    const popupClickHandlerResult = viewport.browser.fireEvent('trackclick', [track, dataList])

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

    constructor(chr, tileStart, tileEnd, bpPerPixel, features, roiFeatures, multiresolution) {
        this.chr = chr
        this.startBP = tileStart
        this.endBP = tileEnd
        this.bpPerPixel = bpPerPixel
        this.features = features
        this.roiFeatures = roiFeatures
        this.multiresolution = multiresolution
    }

    containsRange(chr, start, end, bpPerPixel) {

        // For multi-resolution tracks allow for a 2X change in bpPerPixel
        const r = this.multiresolution ? this.bpPerPixel / bpPerPixel : 1

        return start >= this.startBP && end <= this.endBP && chr === this.chr && r > 0.5 && r < 2
    }

    overlapsRange(chr, start, end) {
        return this.chr === chr && end >= this.startBP && start <= this.endBP
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

export default TrackViewport
