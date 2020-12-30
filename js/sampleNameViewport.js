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

let yLast = undefined
let hLast = undefined

class SampleNameViewport extends ViewportBase {

    constructor(trackView, $viewportContainer, referenceFrame, width) {
        super(trackView, $viewportContainer, referenceFrame, width)
    }

    initializationHelper() {

        this.$viewport.data('viewport-type', 'sample-name')

        // track name canvas
        const $trackNameCanvas = $('<canvas>', { class:'igv-mono-sample-canvas' })
        this.$viewport.append($trackNameCanvas)

        this.track_name_ctx = $trackNameCanvas.get(0).getContext('2d')

        const $hover = $('<div>', { class:'igv-sample-name-viewport-hover' })

        this.trackView.$viewportContainer.append($hover)
        $hover.hide()

        this.featureMap = undefined
        this.canvasTop = undefined

        this.ctx.canvas.addEventListener('mousemove', ({ currentTarget, clientX, clientY, screenX, screenY }) => {

            if (this.featureMap && undefined !== this.canvasTop) {

                const { y:y_bbox } = currentTarget.getBoundingClientRect()

                // (clientY - y_bbox) is equivalent to event.offsetY which does not work correctly
                const wye = (clientY - y_bbox) + this.canvasTop
                const result = getBBox(this.featureMap, wye)

                if (result) {
                    this.showHover($hover, result, this.$content.position().top)
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

    }

    showHover($hover, { y, h, name }, contentTop) {
        const yFudge = -2
        const hFudge = 4
        $hover.css({ left: 0, top: y + contentTop + yFudge, height: h + hFudge })
        $hover.text(name)
    }

    drawTrackName(name) {

        this.trackName = name

        this.featureMap = undefined
        this.canvasTop = undefined
        this.sampleNameRenderer = undefined


        // hide sample name canvas
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
        this.ctx.canvas.style.display = 'none'



        const w = this.$viewport.width()
        const h = this.$viewport.height()

        this.track_name_ctx.canvas.style.display = 'block'
        IGVGraphics.configureHighDPICanvas(this.track_name_ctx, w, h)

        IGVGraphics.fillRect(this.track_name_ctx, 0, 0, this.track_name_ctx.canvas.width, this.track_name_ctx.canvas.height, { 'fillStyle': appleCrayonRGBA('snow', 1) })

        configureFont(this.track_name_ctx, fontConfig)

        const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } = this.track_name_ctx.measureText(name)

        this.track_name_ctx.fillText(name, Math.round(w - 4), Math.round((h + actualBoundingBoxAscent)/2))

    }

    drawSampleNames(featureMap, canvasTop, height, sampleNameRenderer) {

        this.trackName = undefined

        this.featureMap = featureMap
        this.canvasTop = canvasTop
        this.sampleNameRenderer = sampleNameRenderer

        // hide track name canvas
        this.track_name_ctx.clearRect(0, 0, this.track_name_ctx.canvas.width, this.track_name_ctx.canvas.height)
        this.track_name_ctx.canvas.style.display = 'none'



        this.ctx.canvas.style.display = 'block'
        IGVGraphics.configureHighDPICanvas(this.ctx, this.$content.width(), height)

        // IGVGraphics.fillRect(this.ctx, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height, { 'fillStyle': appleCrayonRGBA('snow', 1) })
        IGVGraphics.fillRect(this.ctx, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height, { 'fillStyle': appleCrayonRGBA('snow', 1) })

        configureFont(this.ctx, fontConfig)

        this.ctx.canvas.style.top = `${ canvasTop }px`
        this.ctx.translate(0, -canvasTop)

        // console.log(`drawSampleNames - canvas-top ${ canvasTop }`)

        sampleNameRenderer(this.ctx, featureMap, this.$content.width(), height)
    }

    setTop(contentTop) {
        this.$content.css('top', `${ contentTop }px`);
    }

    async renderSVGContext(context, { deltaX, deltaY }) {

        let id = this.trackView.track.name || this.trackView.track.id
        id = id.replace(/\W/g, '')

        const yScrollDelta = this.featureMap ? this.$content.position().top : 0
        const dy = deltaY + yScrollDelta

        const { width, height } = this.$viewport.get(0).getBoundingClientRect()

        context.addTrackGroupWithTranslationAndClipRect(id, deltaX, dy, width, height, -yScrollDelta)

        this.drawSVGWithContext(context, width, height)

    }

    drawSVGWithContext(context, width, height) {

        context.save()

        IGVGraphics.fillRect(context, 0, 0, width, height, { 'fillStyle': appleCrayonRGBA('snow', 1) })

        configureFont(context, fontConfig)

        if (this.trackName) {
            const { width: textWidth, actualBoundingBoxAscent, actualBoundingBoxDescent } = context.measureText(this.trackName)
            context.fillText(this.trackName, Math.round(width - 4), Math.round((height + actualBoundingBoxAscent)/2))
        } else if (this.featureMap) {
            this.sampleNameRenderer(context, this.featureMap, width, height)
        }

        context.restore()

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

function configureFont(ctx, { font, textAlign, textBaseline, strokeStyle, fillStyle }) {
    ctx.font = font
    ctx.textAlign = textAlign
    ctx.textBaseline = textBaseline
    ctx.fillStyle = fillStyle
}

export { sampleNameViewportWidth }

export default SampleNameViewport
