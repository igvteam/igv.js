import $ from './vendor/jquery-3.3.1.slim.js'
import {appleCrayonRGB, randomRGB} from './util/colorPalletes.js'
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

class SampleNameViewport {

    constructor(trackView, $column, unused, width) {

        this.guid = DOMUtils.guid();
        this.trackView = trackView;

        this.browser = trackView.browser;

        this.$viewport = $('<div class="igv-viewport">');
        $column.append(this.$viewport);

        if (trackView.track.height) {
            this.$viewport.get(0).style.height = `${ trackView.track.height }px`;
        }

        // this.$viewport.get(0).style.backgroundColor = randomRGB(150, 250);

        this.$canvas = $('<canvas>');
        this.$viewport.append(this.$canvas);

        this.canvas = this.$canvas.get(0);
        this.ctx = this.canvas.getContext("2d");

        this.contentTop = 0;

        this.setWidth(width);

        if (false === this.browser.showSampleNames) {
            this.hide()
        }

        this.$viewport.get(0).addEventListener('contextmenu', e => {

            e.preventDefault()
            e.stopPropagation()

            const config =
                {
                    label: 'Name Panel Width',
                    value: this.browser.sampleNameViewportWidth,
                    callback: newWidth => {
                        this.browser.sampleNameViewportWidth = parseInt(newWidth)
                        for (let { sampleNameViewport } of this.browser.trackViews) {
                            sampleNameViewport.setWidth(this.browser.sampleNameViewportWidth)
                        }
                        this.browser.resize()
                    }
                }

            this.browser.inputDialog.present(config, e);
        })

    }

    checkCanvas() {

        const dpi = window.devicePixelRatio;
        const requiredHeight = this.$viewport.height();
        const requiredWidth = this.browser.sampleNameViewportWidth;

        if (this.canvas.width !== requiredWidth * dpi || this.canvas.height !== requiredHeight * dpi) {
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

        if (typeof this.trackView.track.getSamples === 'function') {
            this.contentTop = contentTop;
            const samples = this.trackView.track.getSamples();
            this.repaint(samples);
        }

    }

    setWidth(width) {
        this.$viewport.width(width);
        this.checkCanvas();
    }

    show() {
        this.$viewport.show()
    }

    hide() {
        this.$viewport.hide()
    }

    async repaint(samples) {

        this.checkCanvas();
        this.draw({context: this.ctx, samples})
    }

    draw({context, samples}) {

        if (!samples || samples.names.length === 0 || samples.height < 1) {
            return
        }

        configureFont(context, fontConfigureTemplate, samples.height);
        const sampleNameXShim = 4;

        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        context.fillStyle = appleCrayonRGB('lead');

        const viewportHeight = this.$viewport.get(0).getBoundingClientRect().height;
        let y = (samples.yOffset || 0) + this.contentTop;    // contentTop will always be a negative number (top relative to viewport)

        for (let name of samples.names) {
            if (y > viewportHeight) break;
            if (y + samples.height > 0) {
                const text = name.toUpperCase();
                const yFont = getYFont(context, text, y, samples.height);
                context.fillText(text, sampleNameXShim, yFont);
            }
            y += samples.height;
        }
    }

    renderSVGContext(context, {deltaX, deltaY}) {

        if (typeof this.trackView.track.getSamples === 'function') {

            const samples = this.trackView.track.getSamples();

            const yScrollDelta = 0;   // This is not relevant, scrolling is handled in "draw"

            const {width, height} = this.$viewport.get(0).getBoundingClientRect()

            const str = (this.trackView.track.name || this.trackView.track.id).replace(/\W/g, '')
            const id = `${ str }_sample_names_guid_${ DOMUtils.guid() }`

            context.saveWithTranslationAndClipRect(id, deltaX, deltaY + yScrollDelta, width, height, -yScrollDelta)

            this.draw({context, samples});

            context.restore();
        }
    }

    addMouseHandler(context, pixelTop, samples) {



        return




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

function createSampleNameColumn(columnContainer) {
    const column = DOMUtils.div({ class: 'igv-sample-name-column' })
    columnContainer.appendChild(column)
    return column
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

export { createSampleNameColumn }

export default SampleNameViewport
