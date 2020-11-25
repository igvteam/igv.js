import ViewportBase from './viewportBase.js'
import IGVGraphics from './igv-canvas.js'
import {appleCrayonPalette, greyScale, randomGrey } from './util/colorPalletes'


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

    draw(features, height) {

        this.canvas.height = height

        // for (let y = 0; y < height; y++) {
        //     IGVGraphics.fillRect(this.ctx, 0, y, this.canvas.width, 1, { 'fillStyle': randomGrey(100, 200) })
        // }

        configureFont(this.ctx, defaultFont)

        const hitlist = {}
        for (let feature of features) {
            if (hitlist[ feature.row ]) {
                // skip
            } else {
                const i = features.indexOf(feature)
                hitlist[ feature.row ] = feature
                const { y, h } = feature.pixelRect
                IGVGraphics.fillRect(this.ctx, 0, y, this.canvas.width, h, { 'fillStyle': 0 === i % 2 ? appleCrayonPalette['snow'] : greyScale(245)})
                const string = feature.sampleKey || feature.sample
                this.ctx.fillText(string, 0, y + h)
            }
        }

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
