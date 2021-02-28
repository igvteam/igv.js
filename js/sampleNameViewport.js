import $ from './vendor/jquery-3.3.1.slim.js'
import ViewportBase from './viewportBase.js'
import IGVGraphics from './igv-canvas.js'
import { appleCrayonRGB, appleCrayonRGBA, randomRGB, randomRGBConstantAlpha } from './util/colorPalletes.js'
import {IGVMath} from "../node_modules/igv-utils/src/index.js";

const sampleNameViewportWidth = 128
const sampleNameXShim = 4

const maxFontSize = 10

const fontConfigureTemplate =
    {
        // font: '2pt sans-serif',
        textAlign: 'start',
        textBaseline: 'bottom',
        strokeStyle: 'black',
        fillStyle:'black'
    }

class SampleNameViewport extends ViewportBase {

    constructor(trackView, $viewportContainer, referenceFrame, width) {
        super(trackView, $viewportContainer, referenceFrame, width)
    }

    initializationHelper() {

        this.$viewport.data('viewport-type', 'sample-name')

        const $hover = $('<div>', { class:'igv-sample-name-viewport-hover' })
        this.trackView.$viewportContainer.append($hover)

        this.featureMap = undefined
        this.canvasTop = undefined

        this.configureSampleNameHover($hover)

    }

    setTop(contentTop) {

        const viewportHeight = this.$viewport.height()
        const viewTop = -contentTop
        const viewBottom = viewTop + viewportHeight

        this.$content.css('top', `${ contentTop }px`)

        if (undefined === this.canvasVerticalRange || this.canvasVerticalRange.bottom < viewBottom || this.canvasVerticalRange.top > viewTop) {
            if(typeof this.trackView.track.getSamples === 'function' && typeof this.trackView.track.computePixelHeight === 'function') {

                const features = this.trackView.viewports[ 0 ].cachedFeatures
                const contentHeight = this.trackView.track.computePixelHeight(features)

                const samples = this.trackView.track.getSamples()
                this.repaint({ contentHeight, samples })
            }
        }

    }

    async repaint({ contentHeight, samples }) {

        console.log('sample name viewport - repaint')

        let devicePixelRatio
        if ("FILL" === this.trackView.track.displayMode) {
            devicePixelRatio = window.devicePixelRatio
        } else {
            devicePixelRatio = (this.trackView.track.supportHiDPI === false) ? 1 : window.devicePixelRatio
        }

        const canvas = $('<canvas class="igv-canvas">').get(0)

        const context = canvas.getContext("2d")

        canvas.style.width = `${ sampleNameViewportWidth }px`
        canvas.width = devicePixelRatio * sampleNameViewportWidth

        const viewportHeight = this.$viewport.height()
        const pixelHeight = Math.min(contentHeight, 3 * viewportHeight)

        canvas.style.height = `${ pixelHeight }px`
        canvas.height = devicePixelRatio * pixelHeight

        context.scale(devicePixelRatio, devicePixelRatio)

        const pixelTop = Math.max(0, -(this.$content.position().top) - viewportHeight)

        canvas.style.top = `${ pixelTop }px`

        context.translate(0, -pixelTop)

        this.draw({ context, pixelWidth: sampleNameViewportWidth, pixelTop, samples })

        this.canvasVerticalRange = {top: pixelTop, bottom: pixelTop + pixelHeight}

        if (this.$canvas) {
            this.$canvas.remove()
            this.canvas = this.ctx = null
        }

        this.$canvas = $(canvas)
        this.$content.append(this.$canvas)
        this.canvas = canvas
        this.ctx = context
    }

    draw({ context, pixelWidth, pixelTop, samples }) {

        if (!samples || samples.names.length === 0) {
            return
        }

        configureFont(context, fontConfigureTemplate, samples.height)

        const sampleNameXShim = 4

        context.clearRect(0, 0, context.canvas.width, context.canvas.height)

        let y = pixelTop
        for (let name of samples.names) {

            // context.save()

            // context.fillStyle = appleCrayonRGB('snow')
            // context.fillRect(0, y, pixelWidth, h)

            // context.fillStyle = randomRGBConstantAlpha(180, 240, 1)
            context.fillStyle = appleCrayonRGB('snow')
            context.fillRect(0, y, pixelWidth, samples.height)

            // context.restore()

            context.fillStyle = appleCrayonRGB('lead')

            const text = name.toUpperCase()
            const dy = getSampleNameYShim(context, text, samples.height)
            context.fillText(text, sampleNameXShim, y + samples.height - dy)

            y += samples.height
        }

    }

    configureSampleNameHover($hover) {

        this.ctx.canvas.addEventListener('mousemove', (e) => {

            const { currentTarget, clientX, clientY, screenX, screenY } = e

            if (this.featureMap && undefined !== this.canvasTop) {

                const { x:x_current_target, y:y_current_target, width: width_current_target } = currentTarget.getBoundingClientRect()

                // (clientY - y_current_target) is equivalent to event.offsetY which does not work correctly
                const dy = (clientY - y_current_target) + this.canvasTop
                const result = getBBox(this.featureMap, dy)

                if (result) {

                    const { width: width_viewport_container } = this.trackView.$viewportContainer.get(0).getBoundingClientRect()

                    const fudge = 3
                    const font_size = Math.min(this.trackView.track.expandedRowHeight, maxFontSize)
                    const cssConfig =
                        {
                            'font-size': `${ font_size }px`,
                            // left: width_viewport_container - width_current_target + sampleNameXShim,
                            right: 0,
                            top: result.y + this.$content.position().top - fudge
                        }

                    $hover.css(cssConfig)

                    $hover.text(result.name)
                }
            }
        })

        this.ctx.canvas.addEventListener('mouseenter', () => {
            $hover.show()
        })

        this.ctx.canvas.addEventListener('mouseleave', () => {
            $hover.hide()
        })

        $hover.hide()

    }

    renderSVGContext(context, { deltaX, deltaY }) {

        // return


        let id = this.trackView.track.name || this.trackView.track.id
        id = id.replace(/\W/g, '')

        const yScrollDelta = this.featureMap ? this.$content.position().top : 0

        const { width, height } = this.$viewport.get(0).getBoundingClientRect()

        context.addTrackGroupWithTranslationAndClipRect(id, deltaX, deltaY + yScrollDelta, width, height, -yScrollDelta)

        this.drawSVGWithContext(context, width, height)

    }

    drawSVGWithContext(context, width, height) {

        context.save()

        IGVGraphics.fillRect(context, 0, 0, width, height, { 'fillStyle': appleCrayonRGBA('snow', 1) })

        if (this.featureMap) {
            configureFont(context, fontConfigureTemplate, this.featureMap)
            this.sampleNameRenderer(context, this.featureMap, width, height)
        }

        context.restore()

    }

    static getCurrentWidth(browser) {
        if (false === browser.config.showSampleNames) {
            return 0
        } else if (false === browser.config.showSampleNameButton) {
            return sampleNameViewportWidth
        } else {
            return true === browser.sampleNameControl.sampleNamesVisible ? sampleNameViewportWidth : 0
        }
    }
}

function getSampleNameYShim(context, text, h) {

    const { fontBoundingBoxAscent, fontBoundingBoxDescent } = context.measureText(text)
    return (h - (fontBoundingBoxAscent + fontBoundingBoxDescent))/2
}
function getBBox(featureMap, y) {

    for (let [ key, value ] of featureMap) {

        if ('sampleHeight' === key) {
            continue
        }

        if (y < value.y || y > (value.h + value.y)) {

        } else {
            return value
        }
    }

    return undefined
}

function configureFont(ctx, { textAlign, textBaseline, strokeStyle, fillStyle }, sampleHeight) {
    const pixels = Math.min(sampleHeight, maxFontSize)
    ctx.font = `${ pixels }px sans-serif`
    ctx.textAlign = textAlign
    ctx.textBaseline = textBaseline
    ctx.fillStyle = fillStyle
}

export { sampleNameViewportWidth, sampleNameXShim }

export default SampleNameViewport
