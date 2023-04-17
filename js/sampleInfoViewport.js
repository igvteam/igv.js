import {DOMUtils} from '../node_modules/igv-ui/dist/igv-ui.js'
import {randomRGBConstantAlpha} from './util/colorPalletes.js'

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

        this.diagnosticColors = []
        for (let y = 0; y < this.ctx.canvas.height; y++) {
            this.diagnosticColors.push(randomRGBConstantAlpha(150, 250, 0.85))
        }

        this.contentTop = 0

        this.setWidth(width)

        // this.addMouseHandlers()
    }

    checkCanvas() {

        const dpi = window.devicePixelRatio
        const requiredHeight = this.viewport.clientHeight
        const requiredWidth = this.browser.sampleInfoViewportWidth

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

        if (!samples || samples.names.length === 0/* || samples.height < 1*/) {
            return
        }

        context.clearRect(0, 0, context.canvas.width, context.canvas.height)

        const viewportHeight = this.viewport.getBoundingClientRect().height
        let y = (samples.yOffset || 0) + this.contentTop    // contentTop will always be a negative number (top relative to viewport)

        const height = samples.height
        for (const name of samples.names) {

            if (y > viewportHeight) {
                break
            }

            if (y + height > 0) {

                context.fillStyle = this.diagnosticColors[ samples.names.indexOf(name) ]
                context.fillRect(0, y+1, context.canvas.width, height-2)

            }

            y += height
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
