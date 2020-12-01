import ViewportBase from './viewportBase.js'
import IGVGraphics from './igv-canvas.js'
import {appleCrayonPalette, greyScale, randomGrey } from './util/colorPalletes'

const sampleNameViewportWidth = 128

class SampleNameViewport extends ViewportBase {

    constructor(trackView, $viewportContainer, referenceFrame, width) {
        super(trackView, $viewportContainer, referenceFrame, width)
    }

    initializationHelper() {

        this.$viewport.data('viewport-type', 'sample-name');

        this.canvas.height = this.$content.height()
        this.ctx = this.canvas.getContext("2d")
        const { width, height } = this.canvas
        IGVGraphics.fillRect(this.ctx, 0, 0, width, height, { 'fillStyle': appleCrayonPalette[ 'sky' ] })
    }

    drawTrackName(name) {

        configureFont(this.ctx, defaultFont)
        const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } = this.ctx.measureText(name)

        console.log(`sample name viewport - track name ${ name } width ${ Math.round(width) } h0 ${ Math.round(actualBoundingBoxAscent) } h1 ${ Math.round(actualBoundingBoxDescent) }`)
    }

    draw(features, canvasTop, height, sampleNameRenderer) {
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
