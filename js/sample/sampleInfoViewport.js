import {DOMUtils} from '../../node_modules/igv-ui/dist/igv-ui.js'
import {appleCrayonRGB} from '../util/colorPalletes.js'
import {emptySpaceReplacement, sampleDictionary} from './sampleInfo.js'

const sampleInfoTileWidth = 16

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

    static getSampleInfoColumnWidth(browser) {
        const found = browser.findTracks('type', 'seg')
        return (found.length > 0 && browser.sampleInfo.isInitialized()) ? browser.sampleInfo.getAttributeCount() * sampleInfoTileWidth : 0
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

    static async update(browser) {

        for (const {sampleNameViewport} of browser.trackViews) {
            sampleNameViewport.setWidth(SampleInfoViewport.getSampleInfoColumnWidth(browser))
        }

        await browser.layoutChange()

    }

    async repaint(samples) {

        this.checkCanvas()
        this.draw({context: this.ctx, samples})
    }

    draw({context, samples}) {

        context.clearRect(0, 0, context.canvas.width, context.canvas.height)

        context.fillStyle = appleCrayonRGB('snow')
        context.fillRect(0, 0, context.canvas.width, context.canvas.height)

        if (samples && samples.names.length > 0) {

            const viewportHeight = this.viewport.getBoundingClientRect().height

            let shim = 1

            const tileHeight = samples.height

            if (Math.abs(tileHeight - 2*shim) < 1) {
                shim = 0
            }

            let y = this.contentTop
            this.hitList = {}
            for (const name of samples.names) {

                if (y > viewportHeight) {
                    break
                }

                if (y + tileHeight > 0) {

                    if (sampleDictionary) {

                        const attributes = this.browser.sampleInfo.getAttributes(name)

                        if (attributes) {

                            const attributeEntries = Object.entries(attributes)

                            let x = 0;
                            for (const attributeEntry of attributeEntries) {

                                const [ attribute, value ] = attributeEntry

                                context.fillStyle = this.browser.sampleInfo.getAttributeColor(attribute, value)

                                const yy = y+shim
                                const hh = tileHeight-(2*shim)
                                context.fillRect(x, yy, sampleInfoTileWidth, hh)

                                const key = `${Math.floor(x)}#${Math.floor(yy)}#${sampleInfoTileWidth}#${Math.ceil(hh)}`
                                this.hitList[ key ] = `${attribute}#${value}`

                                x += sampleInfoTileWidth

                            } // for (attributeEntries)

                        } // if (attributes)

                    } // if (dictionary && dictionary[ name ])

                } // if (y + tileHeight > 0)

                y += tileHeight

            } // for (sample.names)

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

                const { x, y } = DOMUtils.translateMouseCoordinates(event, this.viewport)

                this.viewport.setAttribute('title', '')

                for (const [ bbox, value ] of entries) {
                    const [xx, yy, width, height ] = bbox.split('#').map(str => parseInt(str, 10))
                    if (x < xx || x > xx+width || y < yy || y > yy+height) {
                        // do nothing
                    } else {
                        const [ a, b ] = value.split('#')
                        this.viewport.setAttribute('title', `${ a.split(emptySpaceReplacement).join(' ') }: ${ '-' === b ? '' : b }`)
                        break
                    }
                }
            }
        }
    }

    removeMouseHandlers() {
        this.viewport.removeEventListener('mousemove', this.boundMouseMoveHandler)
    }
    show() {
        this.viewport.style.display = 'block'
    }

    hide() {
        this.viewport.style.display = 'none'
    }

    dispose() {
        this.removeMouseHandlers()
        this.viewport.remove()
    }
}

export default SampleInfoViewport
