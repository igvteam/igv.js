import * as DOMUtils from "../ui/utils/dom-utils.js"
import {appleCrayonRGB} from '../util/colorPalletes.js'
import SampleInfo from './sampleInfo.js'
import {sampleInfoTileWidth, sampleInfoTileXShim} from "./sampleInfoConstants.js"
import IGVGraphics from "../igv-canvas.js"
import {defaultRulerHeight} from "../rulerTrack.js"
import {drawGroupDividers, GROUP_MARGIN_HEIGHT, NULL_GROUP} from "./sampleUtils.js"

const MaxSampleInfoColumnHeight = 128

class SampleInfoViewport {

    constructor(trackView, column, width) {

        this.guid = DOMUtils.guid()
        this.trackView = trackView
        this.isIdeogram = 'ideogram' === trackView.track.type

        this.browser = trackView.browser

        this.viewport = DOMUtils.div({class: 'igv-viewport'})

        column.appendChild(this.viewport)

        this.viewport.style.height = `${trackView.track.height}px`

        if (this.isIdeogram) {
            this.viewport.style.zIndex = 16
            this.viewport.style.overflow = 'visible'
        }

        this.canvas = document.createElement('canvas')
        this.viewport.appendChild(this.canvas)
        this.ctx = this.canvas.getContext("2d")
        this.ctx.font = '10px verdana'

        this.contentTop = 0
        this.hitList = undefined

        this.setWidth(width)

        this.addMouseHandlers()
    }


    resizeCanvas() {

        const dpi = window.devicePixelRatio
        const requiredWidth = this.browser.getSampleInfoViewportWidth()

        let requiredHeight
        if (this.browser.trackViews.length > 1 && this.isIdeogram) {
            const [at, bt] = [this.browser.ideogramTrackView.track, this.browser.rulerTrackView.track]
            requiredHeight = at.height + bt.height
        } else {
            requiredHeight = this.viewport.clientHeight
        }


        if (this.canvas.width !== requiredWidth * dpi || this.canvas.height !== requiredHeight * dpi) {
            const canvas = this.canvas
            canvas.width = requiredWidth * dpi
            canvas.height = requiredHeight * dpi
            canvas.style.width = `${requiredWidth}px`
            canvas.style.height = `${requiredHeight}px`
            this.ctx = this.canvas.getContext("2d")
            this.ctx.scale(dpi, dpi)

            if (this.isIdeogram) {
                IGVGraphics.fillRect(this.ctx, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height, {fillStyle: appleCrayonRGB('snow')})
            }

        }

    }

    setTop(contentTop) {

        if (typeof this.trackView.track.getSamples === 'function') {
            this.contentTop = contentTop
            this.repaint()
        }

    }

    setWidth(width) {
        this.viewport.innerWidth = width
        this.resizeCanvas()
    }

    setHeight(newHeight) {

        const w = this.browser.getSampleInfoViewportWidth()

        this.viewport.style.width = `${w}px`
        this.viewport.style.height = `${newHeight}px`

        const dpi = window.devicePixelRatio

        this.canvas.width = w * dpi
        this.canvas.height = newHeight * dpi

        this.canvas.style.width = `${w}px`
        this.canvas.style.height = `${newHeight}px`

        this.ctx = this.canvas.getContext('2d')
        this.ctx.scale(dpi, dpi)

        if (this.isIdeogram) {
            IGVGraphics.fillRect(this.ctx, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height, {fillStyle: appleCrayonRGB('snow')})
        }

    }

    repaint() {

        this.resizeCanvas()

        if (this.isIdeogram) {
            // Resize the rulertrack to create more space for the sample info columns.  TODO -- this should not be done on every repaint.
            if (this.browser.rulerTrackView) {
                this.browser.rulerTrackView.setTrackHeight(true === this.browser.sampleInfoControl.showSampleInfo ? this.calculateSampleInfoColumnHeight() : defaultRulerHeight, true)
            }
            this.renderSampleInfoColumns(this.ctx)
        }

        if (typeof this.trackView.track.getSamples === 'function') {
            const samples = this.trackView.track.getSamples()
            if (samples.names && samples.names.length > 0) {
                this.draw({context: this.ctx, samples})
            }
        }
    }

    calculateSampleInfoColumnHeight() {
        const lengths = this.browser.sampleInfo.attributeNames.map(name => this.ctx.measureText(name).width)
        const fudge = 4
        return fudge + Math.min(Math.max(...lengths), MaxSampleInfoColumnHeight)
    }

    draw({context, samples}) {

        context.clearRect(0, 0, context.canvas.width, context.canvas.height)

        context.fillStyle = appleCrayonRGB('snow')
        context.fillRect(0, 0, context.canvas.width, context.canvas.height)

        const viewportHeight = this.viewport.getBoundingClientRect().height
        const viewportWidth = this.viewport.getBoundingClientRect().width

        if (samples && samples.names.length > 0) {


            const attributeNames = this.browser.sampleInfo.attributeNames

            let shim = 1

            const tileHeight = samples.height
            shim = tileHeight - 2 * shim <= 1 ? 0 : 1

            let y = samples.yOffset - this.contentTop

            let rowIndex = 0
            this.hitList = {}

            for (const sampleName of samples.names) {

                const attributes = this.browser.sampleInfo.getAttributes(sampleName)
                if (attributes) {

                    let yy = y + shim
                    if (samples.groupIndeces && samples.groups.size > 0) {
                        yy += (samples.groupIndeces[rowIndex] + 1) * GROUP_MARGIN_HEIGHT
                    }
                    if (yy > viewportHeight) {
                        break
                    }
                    if (yy + tileHeight > 0) {

                        const hh = tileHeight - (2 * shim)

                        const attributeEntries = Object.entries(attributes)
                        for (const attributeEntry of attributeEntries) {

                            const [attribute, value] = attributeEntry

                            const index = attributeNames.indexOf(attribute)
                            const x = sampleInfoTileXShim + index * sampleInfoTileWidth

                            context.fillStyle = this.browser.sampleInfo.getAttributeColor(attribute, value)
                            context.fillRect(x, yy, sampleInfoTileWidth - 1, hh)

                            const key = `${Math.floor(x)}#${Math.floor(yy)}#${sampleInfoTileWidth}#${Math.ceil(hh)}`
                            this.hitList[key] = `${attribute}#${value}`
                        }
                    } // for (attributeEntries)

                } // if (attributes)

                y += tileHeight
                rowIndex++

            } // for (sample.names)

            drawGroupDividers(context,
                0,
                viewportWidth,
                viewportHeight,
                samples.yOffset - this.contentTop,
                samples.height,
                samples.groups)
        }

    }

    renderSampleInfoColumns(context) {

        const drawRotatedText = (ctx, text, x, y, width, height) => {

            const xShim = 2
            const yShim = 2

            ctx.save()
            ctx.font = '10px verdana'

            ctx.translate(x + width / 2, y + height)
            ctx.rotate(-Math.PI / 2)
            ctx.textAlign = 'left'
            ctx.fillStyle = appleCrayonRGB('lead')
            ctx.fillText(text, xShim, yShim)

            ctx.restore()
        }

        const attributeNames = this.browser.sampleInfo.attributeNames
        this.hitList = {}
        for (let i = 0; i < attributeNames.length; i++) {
            const x = (sampleInfoTileXShim + i * sampleInfoTileWidth)
            const w = (sampleInfoTileWidth - 1)
            const h = Math.round(context.canvas.height / window.devicePixelRatio)

            IGVGraphics.fillRect(context, x, 0, w, h, {fillStyle: appleCrayonRGB('snow')})
            // IGVGraphics.fillRect(context, x, 0, w, h, { fillStyle: randomRGB(150,250) })
            drawRotatedText(context, attributeNames[i], x, 0, w, h)

            const key = `${Math.floor(x)}#0#${w}#${Math.ceil(h)}`
            this.hitList[key] = `${attributeNames[i]}`

        }

    }

    renderSVGContext(context, {deltaX, deltaY}) {

        if (typeof this.trackView.track.getSamples === 'function') {

            const samples = this.trackView.track.getSamples()

            const yScrollDelta = 0   // This is not relevant, scrolling is handled in "draw"

            const {width, height} = this.viewport.getBoundingClientRect()

            const str = (this.trackView.track.name || this.trackView.track.id).replace(/\W/g, '')
            const id = `${str}_sample_names_guid_${DOMUtils.guid()}`

            context.saveWithTranslationAndClipRect(id, deltaX, deltaY + yScrollDelta, width, height, -yScrollDelta)

            this.draw({context, samples})

            context.restore()
        }
    }

    addMouseHandlers() {
        this.addMouseMoveHandler()
        this.addMouseClickHandler()
    }

    addMouseMoveHandler() {

        this.boundMouseMoveHandler = mouseMove.bind(this)
        this.viewport.addEventListener('mousemove', this.boundMouseMoveHandler)

        function mouseMove(event) {
            // event.stopPropagation()

            if (this.hitList) {

                const entries = Object.entries(this.hitList)

                if (this.isIdeogram) {

                    const getXY = (column, viewport) => {
                        const {marginTop} = window.getComputedStyle(viewport)
                        const {
                            x,
                            y
                        } = DOMUtils.translateMouseCoordinates(event, this.browser.columnContainer.querySelector('.igv-sample-info-column'))
                        return {x: Math.floor(x), y: Math.floor(y - parseInt(marginTop, 10))}
                    }

                    const column = this.browser.columnContainer.querySelector('.igv-sample-info-column')
                    const {x, y} = getXY(column, this.viewport)

                    column.setAttribute('title', '')
                    for (const [bbox, value] of entries) {

                        const [xx, yy, width, height] = bbox.split('#').map(str => parseInt(str, 10))
                        if (x < xx || x > xx + width || y < yy || y > yy + height) {
                            // do nothing
                        } else {
                            column.setAttribute('title', `${value}`)
                            break
                        }
                    }

                } else {

                    const {x, y} = DOMUtils.translateMouseCoordinates(event, this.viewport)

                    this.viewport.setAttribute('title', '')

                    for (const [bbox, value] of entries) {
                        const [xx, yy, width, height] = bbox.split('#').map(str => parseInt(str, 10))
                        if (x < xx || x > xx + width || y < yy || y > yy + height) {
                            // do nothing
                        } else {
                            const [a, b] = value.split('#')
                            this.viewport.setAttribute('title', `${a.split(SampleInfo.emptySpaceReplacement).join(' ')}: ${'-' === b ? '' : b}`)
                            break
                        }
                    }
                }

            }
        }
    }

    addMouseClickHandler() {

        this.boundMouseClickHandler = mouseClick.bind(this)
        this.viewport.addEventListener('click', this.boundMouseClickHandler)

        function mouseClick(event) {
            // event.stopPropagation()

            if (this.hitList) {

                const entries = Object.entries(this.hitList)

                if (this.isIdeogram) {

                    const getXY = (column, viewport) => {
                        const {marginTop} = window.getComputedStyle(viewport)
                        const {
                            x,
                            y
                        } = DOMUtils.translateMouseCoordinates(event, this.browser.columnContainer.querySelector('.igv-sample-info-column'))
                        return {x: Math.floor(x), y: Math.floor(y - parseInt(marginTop, 10))}
                    }

                    const column = this.browser.columnContainer.querySelector('.igv-sample-info-column')
                    const {x, y} = getXY(column, this.viewport)

                    for (const [bbox, value] of entries) {

                        const [xx, yy, width, height] = bbox.split('#').map(str => parseInt(str, 10))
                        if (x < xx || x > xx + width || y < yy || y > yy + height) {
                            // do nothing
                        } else {

                            const tracks = this.browser.findTracks(track => typeof track.sortByAttribute === 'function')
                            for (const track of tracks) {
                                track.sortByAttribute(value)
                            }

                            break
                        }
                    }

                } else {

                    const {x, y} = DOMUtils.translateMouseCoordinates(event, this.viewport)

                    for (const [bbox, value] of entries) {
                        const [xx, yy, width, height] = bbox.split('#').map(str => parseInt(str, 10))
                        if (x < xx || x > xx + width || y < yy || y > yy + height) {
                            // do nothing
                        } else {
                            const [a, b] = value.split('#')
                            break
                        }
                    }
                }

            }
        }
    }

    removeMouseHandlers() {
        this.viewport.removeEventListener('mousemove', this.boundMouseMoveHandler)
        this.viewport.removeEventListener('click', this.boundMouseClickHandler)
    }

    dispose() {
        this.removeMouseHandlers()
        this.viewport.remove()
    }

    show() {
        this.viewport.style.display = 'block'
    }

    hide() {
        this.viewport.style.display = 'none'
    }

}

export default SampleInfoViewport
