import { DOMUtils } from '../node_modules/igv-utils/src/index.js'
import $ from './vendor/jquery-3.3.1.slim.js'
import ViewportBase from './viewportBase.js'
import IGVGraphics from './igv-canvas.js'
import {
    appleCrayonRGB,
    appleCrayonRGBA,
    appleCrayonPalette,
    greyScale,
    randomGrey,
    randomRGBConstantAlpha
} from './util/colorPalletes.js'

const sampleNameViewportWidth = 128
const sampleNameXShim = 4

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

    drawSampleNames(featureMap, canvasTop, height, sampleNameRenderer) {

        this.featureMap = featureMap
        this.canvasTop = canvasTop
        this.sampleNameRenderer = sampleNameRenderer

        this.ctx.canvas.style.display = 'block'
        IGVGraphics.configureHighDPICanvas(this.ctx, this.$content.width(), height)

        // IGVGraphics.fillRect(this.ctx, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height, { 'fillStyle': appleCrayonRGBA('snow', 1) })
        IGVGraphics.fillRect(this.ctx, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height, { 'fillStyle': appleCrayonRGBA('snow', 1) })

        configureFont(this.ctx, leftJustifiedFontConfig)

        this.ctx.canvas.style.top = `${ canvasTop }px`
        this.ctx.translate(0, -canvasTop)

        sampleNameRenderer(this.ctx, featureMap, this.$content.width(), height)
    }

    configureSampleNameHover($hover) {

        this.ctx.canvas.addEventListener('mousemove', (e) => {

            const { currentTarget, clientX, clientY, screenX, screenY } = e

            if (this.featureMap && undefined !== this.canvasTop) {

                const { x:x_current_target_viewport, y:y_viewport } = currentTarget.getBoundingClientRect()

                // (clientY - y_viewport) is equivalent to event.offsetY which does not work correctly
                const dy = (clientY - y_viewport) + this.canvasTop
                const result = getBBox(this.featureMap, dy)

                if (result) {

                    const { y, name } = result

                    $hover.css({ left: (x_current_target_viewport - 18) + sampleNameXShim, top: y + this.$content.position().top })

                    $hover.text(name)

                    // const {    x: x_viewport } = $hover.get(0).getBoundingClientRect()
                    // const { left: x_position } = $hover.position()
                    // console.log(`current-target x-current-target-viewport ${ x_current_target_viewport }. hover x-viewport ${ x_viewport } x-position ${ x_position }`)

                }
            }
        })

        this.ctx.canvas.addEventListener('mouseenter', () => {
            $hover.show()
            // $hover.text('')
            // $hover.css({ height: 0 })
        })

        this.ctx.canvas.addEventListener('mouseleave', () => {
            $hover.hide()
            // $hover.text('')
            // $hover.css({ height: 0 })
        })

        $hover.hide()

    }

    setTop(contentTop) {
        this.$content.css('top', `${ contentTop }px`);
    }

    renderSVGContext(context, { deltaX, deltaY }) {

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

        configureFont(context, leftJustifiedFontConfig)

        if (this.featureMap) {
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

function getBBox(featureMap, y) {

    for (let [ key, value ] of featureMap) {
        if (y < value.y || y > (value.h + value.y)) {

        } else {
            return value
        }
    }

    return undefined
}

const fontConfig =
    {
        font: '10px sans-serif',
        textAlign: 'end', // start || end
        textBaseline: 'bottom',
        strokeStyle: 'black',
        fillStyle:'black'
    };

const rightJustifiedFontConfig =
    {
        font: '10px sans-serif',
        textAlign: 'end', // start || end
        textBaseline: 'bottom',
        strokeStyle: 'black',
        fillStyle:'black'
    };

const leftJustifiedFontConfig =
    {
        font: '10px sans-serif',
        textAlign: 'start', // start || end
        textBaseline: 'bottom',
        strokeStyle: 'black',
        fillStyle:'black'
    };

function configureFont(ctx, { font, textAlign, textBaseline, strokeStyle, fillStyle }) {
    ctx.font = font
    ctx.textAlign = textAlign
    ctx.textBaseline = textBaseline
    ctx.fillStyle = fillStyle
}

export { sampleNameViewportWidth, sampleNameXShim }

export default SampleNameViewport
