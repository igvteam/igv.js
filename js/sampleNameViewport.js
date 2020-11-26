import ViewportBase from './viewportBase.js'
import IGVGraphics from './igv-canvas.js'
import {appleCrayonPalette, greyScale, randomGrey } from './util/colorPalletes'
import $ from "./vendor/jquery-3.3.1.slim";

const sampleNameViewportWidth = 128

class SampleNameViewport extends ViewportBase {

    constructor(trackView, $viewportContainer, referenceFrame, width) {
        super(trackView, $viewportContainer, referenceFrame, width)
    }

    initializationHelper() {
        this.canvas.height = this.$content.height()
        this.ctx = this.canvas.getContext("2d")
        const { width, height } = this.canvas
        IGVGraphics.fillRect(this.ctx, 0, 0, width, height, { 'fillStyle': appleCrayonPalette[ 'snow' ] })
    }

    draw(features, canvasTop, height) {

        this.canvas.height = height
        this.canvas.style.top = `${ canvasTop }px`
        this.ctx.translate(0, -canvasTop)

        // for (let y = 0; y < height; y++) {
        //     IGVGraphics.fillRect(this.ctx, 0, y, this.canvas.width, 1, { 'fillStyle': randomGrey(100, 200) })
        // }

        configureFont(this.ctx, defaultFont)

        const hitlist = {}
        for (let feature of features) {
            if (hitlist[ feature.row ]) {
                // skip
                console.log('skip')
            } else {
                hitlist[ feature.row ] = feature
                const { y, h } = feature.pixelRect
                IGVGraphics.fillRect(this.ctx, 0, y, this.canvas.width, h, { 'fillStyle': greyScale(0 === features.indexOf(feature) % 2 ? 255 : 245)})
                const string = feature.sampleKey || feature.sample
                this.ctx.fillText(string, 0, y + h)
            }
        }

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
