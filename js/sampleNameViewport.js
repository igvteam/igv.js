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

class SampleNameViewport extends ViewportBase {

    constructor(trackView, $viewportContainer, referenceFrame, width) {
        super(trackView, $viewportContainer, referenceFrame, width)
    }

    initializationHelper() {

        this.$viewport.data('viewport-type', 'sample-name')

        // mono-sample canvas
        const $mono_sample_canvas = $('<canvas>', { class:'igv-mono-sample-canvas' })
        this.$viewport.append($mono_sample_canvas)

        this.mono_sample_ctx = $mono_sample_canvas.get(0).getContext('2d')

        this.featureMap = undefined

        this.canvas.addEventListener('mouseenter', ({ x, y }) => {
            console.log(`${ Date.now() } - mouseenter - x ${ x } y ${ y }`)
        })

        this.canvas.addEventListener('mousemove', ({ offsetY }) => {

            if (this.featureMap) {
                const result = getBBox(this.featureMap, offsetY)
                if (result) {

                    // console.log(`${ Date.now() } - mouse move - canvas top ${ this.ctx.canvas.style.top }`)

                    const { x: exe, y: wye , w, h } = result
                    // // console.log(`${ Date.now() } - y ${ wye } h ${ h }`)
                    IGVGraphics.fillRect(this.ctx, exe, wye, w, h, { 'fillStyle': randomRGBConstantAlpha(150, 250, 1) })
                }
            }
        })

        this.canvas.addEventListener('mouseleave', ({ x, y }) => {
            console.log(`${ Date.now() } - mouseleave - x ${ x } y ${ y }`)
        })

    }

    drawTrackName(name) {

        this.featureMap = undefined
        this.sampleNameRenderer = undefined
        this.trackName = name


        // Hide multi-sample canvas
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
        this.ctx.canvas.style.display = 'none'



        const w = this.$viewport.width()
        const h = this.$viewport.height()

        this.mono_sample_ctx.canvas.style.display = 'block'
        IGVGraphics.configureHighDPICanvas(this.mono_sample_ctx, w, h)

        IGVGraphics.fillRect(this.mono_sample_ctx, 0, 0, this.mono_sample_ctx.canvas.width, this.mono_sample_ctx.canvas.height, { 'fillStyle': appleCrayonRGBA('snow', 1) })

        configureFont(this.mono_sample_ctx, fontConfig)

        const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } = this.mono_sample_ctx.measureText(name)

        this.mono_sample_ctx.fillText(name, Math.round(w - 4), Math.round((h + actualBoundingBoxAscent)/2))

    }

    drawSampleNames(featureMap, canvasTop, height, sampleNameRenderer) {

        this.trackName = undefined
        this.featureMap = featureMap
        this.sampleNameRenderer = sampleNameRenderer

        // hide mono-sample canvas
        this.mono_sample_ctx.clearRect(0, 0, this.mono_sample_ctx.canvas.width, this.mono_sample_ctx.canvas.height)
        this.mono_sample_ctx.canvas.style.display = 'none'



        this.ctx.canvas.style.display = 'block'
        IGVGraphics.configureHighDPICanvas(this.ctx, this.$viewport.width(), height)

        IGVGraphics.fillRect(this.ctx, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height, { 'fillStyle': appleCrayonRGBA('snow', 1) })

        configureFont(this.ctx, fontConfig)

        this.ctx.canvas.style.top = `${ canvasTop }px`
        this.ctx.translate(0, -canvasTop)

        console.log(`${ Date.now() } - draw sample names - canvas top ${ this.ctx.canvas.style.top }`)

        sampleNameRenderer(this.ctx, featureMap, this.$viewport.width(), height)
    }

    setTop(contentTop) {
        this.$content.css('top', `${ contentTop }px`);
    }

    async renderSVGContext(context, { deltaX, deltaY }) {

        // console.log('SampleNameViewport - renderSVGContext(context, offset)')

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
