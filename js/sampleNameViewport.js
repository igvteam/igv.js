import ViewportBase from './viewportBase.js'
import IGVGraphics from './igv-canvas.js'
import { appleCrayonRGB, appleCrayonRGBAlpha, appleCrayonPalette, greyScale, randomGrey } from './util/colorPalletes'
import $ from "./vendor/jquery-3.3.1.slim";

const sampleNameViewportWidth = 128

class SampleNameViewport extends ViewportBase {

    constructor(trackView, $viewportContainer, referenceFrame, width) {
        super(trackView, $viewportContainer, referenceFrame, width)
    }

    initializationHelper() {

        this.$viewport.data('viewport-type', 'sample-name')

        // multi-sample canvas
        this.ctx = this.canvas.getContext('2d')
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)

        // mono-sample canvas
        const $mono_sample_canvas = $('<canvas>', { class:'igv-mono-sample-canvas' })
        this.$viewport.append($mono_sample_canvas)

        this.mono_sample_ctx = $mono_sample_canvas.get(0).getContext('2d')
        this.mono_sample_ctx.clearRect(0, 0, this.mono_sample_ctx.canvas.width, this.mono_sample_ctx.canvas.height)

    }

    drawTrackName(name) {

        // hide multi-sample canvas
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)

        this.mono_sample_ctx.canvas.style.width = (`${ this.$viewport.width() }px`)
        this.mono_sample_ctx.canvas.setAttribute('width', this.$viewport.width())

        this.mono_sample_ctx.canvas.style.height = (`${ this.$viewport.height() }px`)
        this.mono_sample_ctx.canvas.setAttribute('height', this.$viewport.height())

        // IGVGraphics.fillRect(this.mono_sample_ctx, 0, 0, this.mono_sample_ctx.canvas.width, this.mono_sample_ctx.canvas.height, { 'fillStyle': appleCrayonRGBAlpha('strawberry', 0.75) })
        IGVGraphics.fillRect(this.mono_sample_ctx, 0, 0, this.mono_sample_ctx.canvas.width, this.mono_sample_ctx.canvas.height, { 'fillStyle': appleCrayonRGB('snow') })

        configureFont(this.mono_sample_ctx, defaultFont)
        const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } = this.mono_sample_ctx.measureText(name)

        this.mono_sample_ctx.fillText(name, (this.mono_sample_ctx.canvas.width - width)/2, this.mono_sample_ctx.canvas.height/2)

    }

    draw(features, canvasTop, height, sampleNameRenderer) {

        // hide mono-sample canvas
        this.mono_sample_ctx.clearRect(0, 0, this.mono_sample_ctx.canvas.width, this.mono_sample_ctx.canvas.height)

        configureFont(this.ctx, defaultFont)
        sampleNameRenderer(this.ctx, features, canvasTop, height)
    }

    setTop(contentTop) {
        this.$content.css('top', `${ contentTop }px`);
    }

}

const defaultFont =
    {
        // font: '6px sans-serif',
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'bottom',
        strokeStyle: 'black',
        fillStyle:'black'
    };

function configureFont(ctx, {font, textAlign, textBaseline, strokeStyle, fillStyle}) {
    ctx.font = font
    ctx.textAlign = textAlign
    ctx.textBaseline = textBaseline
    ctx.fillStyle = fillStyle
}

export { sampleNameViewportWidth }

export default SampleNameViewport
