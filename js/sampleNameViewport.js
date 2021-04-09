import $ from './vendor/jquery-3.3.1.slim.js'
import {appleCrayonRGB} from './util/colorPalletes.js'
import {DOMUtils} from '../node_modules/igv-utils/src/index.js';

const sampleNameXShim = 4

const maxFontSize = 10

const fontConfigureTemplate =
    {
        // font: '2pt sans-serif',
        textAlign: 'start',
        textBaseline: 'bottom',
        strokeStyle: 'black',
        fillStyle: 'black'
    }

class SampleNameViewport { //extends ViewportBase {

    constructor(trackView, $viewportContainer, referenceFrame, width) {

        this.guid = DOMUtils.guid();
        this.trackView = trackView;
        this.referenceFrame = referenceFrame;

        this.browser = trackView.browser;

        this.$viewport = $('<div class="igv-viewport">');
        $viewportContainer.append(this.$viewport);

        this.$canvas = $('<canvas class ="igv-canvas">');
        this.$viewport.append(this.$canvas);

        this.canvas = this.$canvas.get(0);
        this.ctx = this.canvas.getContext("2d");

        this.contentTop = 0;

        this.setWidth(width);

    }

    checkCanvas() {

        const dpi = window.devicePixelRatio;
        const requiredHeight = this.$viewport.height();
        const requiredWidth = this.browser.sampleNameViewportWidth;

        if (this.canvas.width !== requiredWidth*dpi || this.canvas.height !== requiredHeight*dpi) {
            const canvas = this.canvas;
            canvas.width = requiredWidth * dpi;
            canvas.height = requiredHeight * dpi;
            canvas.style.width = `${requiredWidth}px`
            canvas.style.height = `${requiredHeight}px`
            this.ctx = this.canvas.getContext("2d");
            this.ctx.scale(dpi, dpi);
        }

    }


    setTop(contentTop) {
        this.contentTop = contentTop;
        const samples = this.trackView.track.getSamples();
        this.repaint(samples)
    }


    setWidth(width) {
        this.$viewport.width(width);
        this.checkCanvas();
    }

    async repaint(samples) {
        this.checkCanvas();
        this.draw({context: this.ctx, samples})
    }

    draw({context, samples}) {

        if (!samples || samples.names.length === 0) {
            return
        }

        configureFont(context, fontConfigureTemplate, samples.height);
        const sampleNameXShim = 4;

        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        context.fillStyle = appleCrayonRGB('lead');

        let y = (samples.yOffset || 0) + this.contentTop;    // contentTop will always be a negative number (top relative to viewport)

        for (let name of samples.names) {

            const text = name.toUpperCase();
            const yFont = getYFont(context, text, y, samples.height);
            context.fillText(text, sampleNameXShim, yFont);
            y += samples.height;
        }

    }

    renderSVGContext(context, {deltaX, deltaY}) {

        if (typeof this.trackView.track.getSamples === 'function') {

            const samples = this.trackView.track.getSamples();

            const yScrollDelta = 0;   // This is not relevant, scrolling is handled in "draw"

            const {width, height} = this.$viewport.get(0).getBoundingClientRect()

            const id = (this.trackView.track.name || this.trackView.track.id).replace(/\W/g, '')
            context.addTrackGroupWithTranslationAndClipRect(id, deltaX, deltaY + yScrollDelta, width, height, -yScrollDelta)

            this.draw({context, samples});
        }
    }

    //
    // drawSVGWithContext(context, width) {
    //
    //     if (typeof this.trackView.track.getSamples === 'function' && typeof this.trackView.track.computePixelHeight === 'function') {
    //
    //         const samples = this.trackView.track.getSamples();
    //         if (!samples || samples.names.length == 0) return;
    //
    //         context.save()
    //
    //         configureFont(context, fontConfigureTemplate, samples.height)
    //
    //         const sampleNameXShim = 4
    //
    //         let y = samples.yOffest || 0;
    //         for (let name of samples.names) {
    //
    //             context.fillStyle = appleCrayonRGB('snow')
    //             context.fillRect(0, y, width, samples.height)
    //
    //             context.fillStyle = appleCrayonRGB('lead')
    //
    //             const text = name.toUpperCase()
    //
    //             const yFont = getYFont(context, text, y, samples.height)
    //
    //             context.fillText(text, sampleNameXShim, yFont)
    //
    //             y += samples.height
    //         }
    //
    //         context.restore()
    //
    //     }
    //
    // }

    addMouseHandler(context, pixelTop, samples) {

        this.canvas.addEventListener('click', e => {

            if ('block' === this.hover.style.display) {
                this.hover.style.display = 'none'
                this.hover.textContent = ''
            } else {

                const {currentTarget, clientY} = e

                const {y: target_bbox_min_y} = currentTarget.getBoundingClientRect()

                const y = (clientY - target_bbox_min_y) + pixelTop

                let yMin = 0
                for (let name of samples.names) {

                    const yMax = getYFont(context, name.toUpperCase(), yMin, samples.height)
                    if (y < yMin || y > yMax) {
                        // do nothing
                    } else {

                        this.hover.style.top = `${yMin + this.contentTop}px`
                        this.hover.style.right = '0px'

                        this.hover.textContent = name.toUpperCase()
                        this.hover.style.display = 'block'
                    }

                    yMin += samples.height
                }

            }


        })

        this.canvas.addEventListener('mouseleave', () => {
            this.hover.style.display = 'none'
            this.hover.textContent = ''
        })
    }

}

function getYFont(context, text, y, height) {
    return y + height - getSampleNameYShim(context, text, height)
}

function getSampleNameYShim(context, text, h) {

    const {fontBoundingBoxAscent, fontBoundingBoxDescent} = context.measureText(text)
    return (h - (fontBoundingBoxAscent + fontBoundingBoxDescent)) / 2
}

function configureFont(ctx, {textAlign, textBaseline, strokeStyle, fillStyle}, sampleHeight) {
    const pixels = Math.min(sampleHeight, maxFontSize)
    ctx.font = `${pixels}px sans-serif`
    ctx.textAlign = textAlign
    ctx.textBaseline = textBaseline
    ctx.fillStyle = fillStyle
}

export {sampleNameXShim}

export default SampleNameViewport
