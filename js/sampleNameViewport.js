import {DOMUtils} from '../node_modules/igv-utils/src/index.js'
import {appleCrayonRGB} from './util/colorPalletes.js'

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

        //this.trackScrollDelta = 0

        this.contentTop = 0

        this.setWidth(width)

        if (false === this.browser.showSampleNames) {
            this.hide()
        }

        this.addMouseHandlers()
    }

    checkCanvas() {

        const dpi = window.devicePixelRatio
        const requiredHeight = this.viewport.clientHeight
        const requiredWidth = this.browser.sampleNameViewportWidth

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

    show() {
        this.viewport.style.display = 'block'
    }

    hide() {
        this.viewport.style.display = 'none'
    }

    async repaint(samples) {

        this.checkCanvas()
        this.draw({context: this.ctx, samples})
    }

    draw({context, samples}) {

        if (!samples || samples.names.length === 0/* || samples.height < 1*/) {
            return
        }

        configureFont(context, fontConfigureTemplate, samples.height)
        const sampleNameXShim = 4

        context.clearRect(0, 0, context.canvas.width, context.canvas.height)

        context.fillStyle = appleCrayonRGB('lead')

        const viewportHeight = this.viewport.getBoundingClientRect().height
        let y = (samples.yOffset || 0) + this.contentTop    // contentTop will always be a negative number (top relative to viewport)

        for (let name of samples.names) {
            if (y > viewportHeight) {
                break
            }
            if (y + samples.height > 0) {
                const text = name
                const yFont = getYFont(context, text, y, samples.height)
                context.fillText(text, sampleNameXShim, yFont)

            }
            y += samples.height
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
        this.addViewportContextMenuHandler(this.viewport)
    }

    removeMouseHandlers() {
        this.removeViewportContextMenuHandler(this.viewport)
    }

    addViewportContextMenuHandler(viewport) {
        this.boundContextMenuHandler = contextMenuHandler.bind(this)
        viewport.addEventListener('contextmenu', this.boundContextMenuHandler)

        function contextMenuHandler(event) {

            event.preventDefault()
            event.stopPropagation()

            const config =
                {
                    label: 'Name Panel Width',
                    value: this.browser.sampleNameViewportWidth,
                    callback: newWidth => {
                        this.browser.sampleNameViewportWidth = parseInt(newWidth)
                        for (let {sampleNameViewport} of this.browser.trackViews) {
                            sampleNameViewport.setWidth(this.browser.sampleNameViewportWidth)
                        }
                        this.browser.layoutChange()
                    }
                }

            this.browser.inputDialog.present(config, event)
        }

    }

    removeViewportContextMenuHandler(viewport) {
        viewport.removeEventListener('contextmenu', this.boundContextMenuHandler)
    }

    dispose() {
        this.removeMouseHandlers()
        this.viewport.remove()
    }
}

function getYFont(context, text, y, height) {
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

export default SampleNameViewport
