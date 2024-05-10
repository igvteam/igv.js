import * as DOMUtils from "../ui/utils/dom-utils.js"
import {appleCrayonRGB, randomRGB, randomRGBConstantAlpha} from '../util/colorPalletes.js'
import IGVGraphics from "../igv-canvas.js"
import {attributeNamesMap, sampleDictionary} from "./sampleInfo.js"
import {sampleInfoTileWidth, sampleInfoTileXShim} from "./sampleInfoConstants.js"

const maxSampleNameViewportWidth = 200
const fudgeTextMetricWidth = 4
const maxFontSize = 10

const fontConfigureTemplate =
    {
        // font: '2pt sans-serif',
        textAlign: 'start',
        textBaseline: 'bottom',
        strokeStyle: 'black',
        fillStyle: 'black'
    }

class SampleNameViewport {

    constructor(trackView, column, unused, width) {

        this.guid = DOMUtils.guid()
        this.trackView = trackView

        this.browser = trackView.browser

        this.viewport = DOMUtils.div({class: 'igv-viewport'})

        column.appendChild(this.viewport)

        if (trackView.track.height) {
            this.viewport.style.height = `${trackView.track.height}px`
        }

        this.canvas = document.createElement('canvas')
        this.viewport.appendChild(this.canvas)
        this.ctx = this.canvas.getContext("2d")

        this.trackScrollDelta = 0

        this.contentTop = 0
        this.hitList = undefined

        this.sortDirection = 1

        this.setWidth(width)

        if (false === this.browser.showSampleNames) {
            this.hide()
        }

        this.addMouseHandlers()
    }

    checkCanvas() {

        const width = this.browser.sampleNameViewportWidth || 0
        this.ctx.canvas.width = width * window.devicePixelRatio
        this.ctx.canvas.style.width = `${width}px`

        this.ctx.canvas.height = this.viewport.clientHeight * window.devicePixelRatio
        this.ctx.canvas.style.height = `${this.viewport.clientHeight}px`

        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

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

        if (samples.names.length > 0) {
            if (true === this.browser.showSampleNames) {
                this.checkCanvas()
                this.draw({context: this.ctx, samples})

                if (undefined === this.browser.sampleNameViewportWidth) {
                    const lengths = samples.names.map(name => this.ctx.measureText(name).width)
                    this.browser.sampleNameViewportWidth = Math.min(maxSampleNameViewportWidth, fudgeTextMetricWidth + Math.ceil(Math.max(...lengths)))
                    this.browser.layoutChange()
                }

            }
        }

    }

    draw({context, samples}) {

        IGVGraphics.fillRect(context, 0, 0, context.canvas.width, samples.height, { fillStyle: appleCrayonRGB('snow') })

        if (samples && samples.names.length > 0) {
            const viewportHeight = this.viewport.getBoundingClientRect().height

            const tileHeight = samples.height
            const shim = tileHeight - 2 <= 1 ? 0 : 1

            let y = this.contentTop + samples.yOffset
            this.hitList = {}
            for (const sampleName of samples.names) {

                if (y > viewportHeight) {
                    break
                }
                if (y + tileHeight > 0) {
                    const x = 0
                    const yy = y + shim
                    const hh = tileHeight - (2 * shim)
                    // IGVGraphics.fillRect(context, x, yy, context.canvas.width, hh, { fillStyle: randomRGB(100, 250) })

                    drawTextInRect(context, sampleName, x + 2, yy, context.canvas.width, hh);
                }

                y += tileHeight
            }
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

        this.boundClickHandler = clickHandler.bind(this)
        this.viewport.addEventListener('contextmenu', this.boundClickHandler)

        function clickHandler(event) {

            event.preventDefault()
            event.stopPropagation()

            const config =
                {
                    label: 'Name Panel Width',
                    value: this.browser.sampleNameViewportWidth,
                    callback: newWidth => {
                        this.browser.sampleNameViewportWidth = parseInt(newWidth)
                        // for (let {sampleNameViewport} of this.browser.trackViews) {
                        //     sampleNameViewport.setWidth(this.browser.sampleNameViewportWidth)
                        // }
                        this.browser.layoutChange()
                    }
                }

            this.browser.inputDialog.present(config, event)
        }

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
                        this.viewport.setAttribute('title', `${value}`)
                        break
                    }
                }
            }
        }

    }

    removeMouseHandlers() {
        this.viewport.removeEventListener('contextmenu', this.boundClickHandler)
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

function getYFont(context, text, y, height) {
    const shim = getSampleNameYShim(context, text, height)
    return y + height - getSampleNameYShim(context, text, height)
}

function getSampleNameYShim(context, text, h) {
    const {actualBoundingBoxAscent, actualBoundingBoxDescent} = context.measureText(text)
    return (h - (actualBoundingBoxAscent + actualBoundingBoxDescent)) / 2
}

function configureFont(ctx, {textAlign, textBaseline, strokeStyle, fillStyle}, sampleHeight) {
    const pixels = Math.min(sampleHeight, maxFontSize)
    ctx.font = `${pixels}px sans-serif`
    ctx.textAlign = textAlign
    ctx.textBaseline = textBaseline
    ctx.fillStyle = fillStyle
}

function drawTextInRect(context, text, x, y, width, height) {

    const pixels = Math.min(height, maxFontSize)
    context.font = `${pixels}px sans-serif`
    context.textAlign = 'start'
    context.fillStyle = appleCrayonRGB('lead')

    const textX = x

    const metrics = context.measureText(text)
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    const textY = y + height / 2 + textHeight / 2

    context.fillText(text, textX, textY)
}

export default SampleNameViewport
