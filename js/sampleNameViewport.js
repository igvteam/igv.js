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

        const viewportHeight = this.$viewport.height()

        const pixelHeight = Math.min(contentHeight, 3 * viewportHeight)

        const canvasTop = Math.max(0, -(this.$content.position().top) - viewportHeight)

        let devicePixelRatio
        if ("FILL" === this.trackView.track.displayMode) {
            devicePixelRatio = window.devicePixelRatio
        } else {
            devicePixelRatio = (this.trackView.track.supportHiDPI === false) ? 1 : window.devicePixelRatio
        }

        const canvas = $('<canvas class="igv-canvas">').get(0)
        const ctx = canvas.getContext("2d")

        const pixelWidth = sampleNameViewportWidth

        canvas.style.width = `${ pixelWidth }px`
        canvas.style.height = `${ pixelHeight }px`

        canvas.width = devicePixelRatio * pixelWidth
        canvas.height = devicePixelRatio * pixelHeight

        ctx.scale(devicePixelRatio, devicePixelRatio)

        canvas.style.top = `${ canvasTop }px`

        ctx.translate(0, -canvasTop)

        const drawConfiguration =
            {
                context: ctx,
                renderSVG: false,
                pixelWidth,
                pixelHeight,
                pixelTop: canvasTop,
                referenceFrame: this.referenceFrame,
                samples
            };

        this.draw(drawConfiguration)

        this.canvasVerticalRange = {top: canvasTop, bottom: canvasTop + pixelHeight}

        if (this.$canvas) {
            this.$canvas.remove()
        }
        this.$canvas = $(canvas)
        this.$content.append(this.$canvas)
        this.canvas = canvas
        this.ctx = ctx
    }

    draw({ context, pixelWidth, samples }) {

        if (!samples || samples.names.length === 0) {
            return
        }

        configureFont(context, fontConfigureTemplate, samples.height)

        const sampleNameXShim = 4
        let index = 0

        // context.clearRect(0, 0, context.canvas.width, context.canvas.height)

        for (let { y, h } of samples.rects) {

            context.save()

            context.fillStyle = appleCrayonRGB('snow')
            context.fillRect(0, y, pixelWidth, h)

            context.fillStyle = randomRGBConstantAlpha(180, 240, 0.5)
            context.fillRect(0, y, pixelWidth, h)

            context.restore()

            context.fillText(samples.names[ index ], sampleNameXShim, y + h)

            ++index
        }

        // for (let name of samples.names) {
        //     //console.log(`y = ${y} name=${name}`);
        //     context.save();
        //     context.fillStyle = 'white';
        //     context.fillRect(0, y, pixelWidth, sampleHeight);
        //     context.restore();
        //
        //     // left justified text
        //     // console.log(`drawSegTrackSampleNames y ${ y } h ${ h }`)
        //     context.fillText(name, sampleNameXShim, y + sampleHeight);
        //
        //     y += sampleHeight;
        // }
    }

    __drawSampleNames(featureMap, canvasTop, height, sampleNameRenderer) {

        this.featureMap = featureMap
        this.sampleNameRenderer = sampleNameRenderer

        // sync viewport top with track viewport top
        const { top } = this.trackView.viewports[ 0 ].$content.position()
        this.setTop(top)

        IGVGraphics.configureHighDPICanvas(this.ctx, this.$content.width(), height)

        // IGVGraphics.fillRect(this.ctx, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height, { 'fillStyle': appleCrayonRGBA('snow', 1) })
        IGVGraphics.fillRect(this.ctx, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height, { 'fillStyle': appleCrayonRGBA('snow', 1) })

        this.ctx.canvas.style.display = 'block'
        this.ctx.canvas.style.top = `${ canvasTop }px`

        console.log(`sample-name-viewport. content-css-top ${ this.$content.css('top') }. canvas-top ${ canvasTop }`)

        this.ctx.translate(0, -canvasTop)
        this.canvasTop = canvasTop

        configureFont(this.ctx, fontConfigureTemplate, featureMap)
        sampleNameRenderer(this.ctx, featureMap, this.$content.width(), height)
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

function drawSegTrackSampleNames(ctx, featureMap, canvasWidth, canvasHeight) {

    for (let [ key, value ] of featureMap) {

        if ('sampleHeight' === key) {
            continue
        }

        const { x, y, w, h, name } = value

        ctx.save()
        ctx.fillStyle = 'white'
        ctx.fillRect(0, y, canvasWidth, h)
        ctx.restore()

        // left justified text
        // console.log(`drawSegTrackSampleNames y ${ y } h ${ h }`)
        ctx.fillText(name, sampleNameXShim, y + h)

    }

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
