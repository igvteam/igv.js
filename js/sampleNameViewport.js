import ViewportBase from './viewportBase.js'
import IGVGraphics from './igv-canvas.js'
import {appleCrayonPalette, greyScale, randomGrey } from './util/colorPalletes'
import {drawSegTrackSampleNames} from './feature/segTrack.js'
import {drawVariantTrackSampleNames} from './variant/variantTrack.js'

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

    draw(features, canvasTop, height) {
        if ('seg' === this.trackView.track.config.format) {
            drawSegTrackSampleNames(this.ctx, features, canvasTop, height)
        } else if ('vcf' === this.trackView.track.config.format) {
            drawVariantTrackSampleNames(this.ctx, features, canvasTop, height)
        }
    }

    setTop(contentTop) {
        this.$content.css('top', `${ contentTop }px`);
    }

}

export { sampleNameViewportWidth }

export default SampleNameViewport
