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

const fontConfigurations =
    {
        'FILL':
            {
                font: '2pt sans-serif',
                // font: '10px sans-serif',
                textAlign: 'start', // start || end
                textBaseline: 'bottom',
                strokeStyle: 'black',
                fillStyle:'black'
            },
        'SQUISHED':
            {
                font: '2pt sans-serif',
                // font: '10px sans-serif',
                textAlign: 'start', // start || end
                textBaseline: 'bottom',
                strokeStyle: 'black',
                fillStyle:'black'
            },
        'EXPANDED':
            {
                font: '10px sans-serif',
                textAlign: 'start', // start || end
                textBaseline: 'bottom',
                strokeStyle: 'black',
                fillStyle:'black'
            }

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

    drawSampleNames(featureMap, canvasTop, height, sampleNameRenderer) {

        this.featureMap = featureMap
        this.sampleNameRenderer = sampleNameRenderer

        const { top } = this.trackView.viewports[ 0 ].$content.position()
        this.setTop(top)

        // console.log(`sampleNameViewportContentPositionTop ${ this.$content.position().top } viewportContentPositionTop ${ this.trackView.viewports[ 0 ].$content.position().top }`)

        IGVGraphics.configureHighDPICanvas(this.ctx, this.$content.width(), height)

        // IGVGraphics.fillRect(this.ctx, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height, { 'fillStyle': appleCrayonRGBA('snow', 1) })
        IGVGraphics.fillRect(this.ctx, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height, { 'fillStyle': appleCrayonRGBA('snow', 1) })

        this.ctx.canvas.style.display = 'block'
        this.ctx.canvas.style.top = `${ canvasTop }px`
        
        this.ctx.translate(0, -canvasTop)
        this.canvasTop = canvasTop

        configureFont(this.ctx, fontConfigurations[ featureMap.get('displayMode') ])
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

                    $hover.css({ left: width_viewport_container - width_current_target + sampleNameXShim, top: result.y + this.$content.position().top })
                    // $hover.css({ left: (x_current_target - 18) + sampleNameXShim, top: y + this.$content.position().top })

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

    setTop(contentTop) {
        this.$content.css('top', `${ contentTop }px`)
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

        configureFont(context, fontConfigExpandedDisplayMode)

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

        if ('displayMode' === key) {
            continue
        }

        if (y < value.y || y > (value.h + value.y)) {

        } else {
            return value
        }
    }

    return undefined
}

function configureFont(ctx, { font, textAlign, textBaseline, strokeStyle, fillStyle }) {
    ctx.font = font
    ctx.textAlign = textAlign
    ctx.textBaseline = textBaseline
    ctx.fillStyle = fillStyle
}

export { sampleNameViewportWidth, sampleNameXShim }

export default SampleNameViewport
