import * as DOMUtils from "../ui/utils/dom-utils.js"
import {appleCrayonRGB} from '../util/colorPalletes.js'
import {attributeNames, emptySpaceReplacement, sampleDictionary} from './sampleInfo.js'
import {sampleInfoTileWidth, sampleInfoTileXShim} from "./sampleInfoConstants.js"

class SampleInfoViewport {

    constructor(trackView, column, width) {

        this.guid = DOMUtils.guid()
        this.trackView = trackView

        this.browser = trackView.browser

        this.viewport = DOMUtils.div({class: 'igv-viewport'})

        column.appendChild(this.viewport)

        this.viewport.style.height = `${trackView.track.height}px`

        this.canvas = document.createElement('canvas')
        this.viewport.appendChild(this.canvas)
        this.ctx = this.canvas.getContext("2d")

        this.contentTop = 0
        this.hitList = undefined

        this.sortDirection = 1

        this.setWidth(width)

        this.addMouseHandlers()
    }

    checkCanvas() {

        const dpi = window.devicePixelRatio
        const requiredHeight = this.viewport.clientHeight
        const requiredWidth = this.browser.getSampleInfoViewportWidth()

        if (this.canvas.width !== requiredWidth * dpi || this.canvas.height !== requiredHeight * dpi) {
            const canvas = this.canvas
            canvas.width = requiredWidth * dpi
            canvas.height = requiredHeight * dpi
            canvas.style.width = `${requiredWidth}px`
            canvas.style.height = `${requiredHeight}px`
            this.ctx = this.canvas.getContext("2d")
            this.ctx.scale(dpi, dpi)
        }

    }

    setTop(contentTop) {

        if (typeof this.trackView.track.getSamples === 'function') {
            this.contentTop = contentTop
            const samples = this.trackView.track.getSamples()
            this.repaint(samples)
        }

    }

    setWidth(width) {
        this.viewport.innerWidth = width
        this.checkCanvas()
    }

    async repaint(samples) {

        this.checkCanvas()
        this.draw({context: this.ctx, samples})
    }

    draw({context, samples}) {

        context.clearRect(0, 0, context.canvas.width, context.canvas.height)

        context.fillStyle = appleCrayonRGB('snow')
        context.fillRect(0, 0, context.canvas.width, context.canvas.height)

        if (sampleDictionary && samples && samples.names.length > 0) {
            // this.browser.sampleInfo.attributeNames

            const viewportHeight = this.viewport.getBoundingClientRect().height

            let shim = 1

            const tileHeight = samples.height

            shim = tileHeight - 2 * shim <= 1 ? 0 : 1

            let y = this.contentTop + samples.yOffset

            this.hitList = {}
            for (const sampleName of samples.names) {

                if (y > viewportHeight) {
                    break
                }

                if (y + tileHeight > 0) {

                    const attributes = this.browser.sampleInfo.getAttributes(sampleName)

                    if (attributes) {

                        const attributeEntries = Object.entries(attributes)

                        for (const attributeEntry of attributeEntries) {

                            const [attribute, value] = attributeEntry

                            context.fillStyle = this.browser.sampleInfo.getAttributeColor(attribute, value)

                            const index = attributeNames.indexOf(attribute)
                            const x = sampleInfoTileXShim + index * sampleInfoTileWidth
                            const yy = y + shim
                            const hh = tileHeight - (2 * shim)
                            context.fillRect(x, yy, sampleInfoTileWidth - 1, hh)

                            const key = `${Math.floor(x)}#${Math.floor(yy)}#${sampleInfoTileWidth}#${Math.ceil(hh)}`
                            this.hitList[key] = `${attribute}#${value}`

                        } // for (attributeEntries)

                    } // if (attributes)

                } // if (y + tileHeight > 0)

                y += tileHeight

            } // for (sample.names)

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
    }

    addMouseMoveHandler() {

        this.boundMouseMoveHandler = mouseMove.bind(this)
        this.viewport.addEventListener('mousemove', this.boundMouseMoveHandler)

        function mouseMove(event) {
            event.stopPropagation()

            if (this.hitList) {

                const entries = Object.entries(this.hitList)

                const {x, y} = DOMUtils.translateMouseCoordinates(event, this.viewport)

                this.viewport.setAttribute('title', '')

                for (const [bbox, value] of entries) {
                    const [xx, yy, width, height] = bbox.split('#').map(str => parseInt(str, 10))
                    if (x < xx || x > xx + width || y < yy || y > yy + height) {
                        // do nothing
                    } else {
                        const [a, b] = value.split('#')
                        this.viewport.setAttribute('title', `${a.split(emptySpaceReplacement).join(' ')}: ${'-' === b ? '' : b}`)
                        break
                    }
                }
            }
        }
    }

    removeMouseHandlers() {
        this.viewport.removeEventListener('mousemove', this.boundMouseMoveHandler)
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
