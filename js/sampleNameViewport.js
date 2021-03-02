import $ from './vendor/jquery-3.3.1.slim.js'
import ViewportBase from './viewportBase.js'
import IGVGraphics from './igv-canvas.js'
import { appleCrayonRGB, appleCrayonRGBA} from './util/colorPalletes.js'

const sampleNameViewportWidth = 200
const sampleNameXShim = 4

const maxFontSize = 10

const fontConfigureTemplate =
    {
        // font: '2pt sans-serif',
        textAlign: 'start',
        textBaseline: 'bottom',
        strokeStyle: 'black',
        fillStyle:'black'
    }

class SampleNameViewport extends ViewportBase {

    constructor(trackView, $viewportContainer, referenceFrame, width) {
        super(trackView, $viewportContainer, referenceFrame, width)
    }

    initializationHelper() {
        this.$viewport.data('viewport-type', 'sample-name')

        this.hover = document.createElement('div')
        this.hover.classList.add('igv-sample-name-viewport-hover')

        this.trackView.$viewportContainer.append($(this.hover))
    }

    setTop(contentTop) {

        const viewportHeight = this.$viewport.height()
        const viewTop = -contentTop
        const viewBottom = viewTop + viewportHeight

        this.$content.css('top', `${ contentTop }px`)

        if (undefined === this.canvasVerticalRange || this.canvasVerticalRange.bottom < viewBottom || this.canvasVerticalRange.top > viewTop) {
            if(typeof this.trackView.track.getSamples === 'function' && typeof this.trackView.track.computePixelHeight === 'function') {

                const features = this.trackView.viewports[ 0 ].cachedFeatures
                const contentHeight = this.trackView.track.computePixelHeight(features)

                const samples = this.trackView.track.getSamples()
                this.repaint({ contentHeight, samples })
            }
        }

    }

    async repaint({ contentHeight, samples }) {

        console.log('sample name viewport - repaint')

        let devicePixelRatio
        if ("FILL" === this.trackView.track.displayMode) {
            devicePixelRatio = window.devicePixelRatio
        } else {
            devicePixelRatio = (this.trackView.track.supportHiDPI === false) ? 1 : window.devicePixelRatio
        }

        const canvas = document.createElement('canvas')
        canvas.classList.add('igv-canvas')

        const context = canvas.getContext("2d")

        canvas.style.width = `${ sampleNameViewportWidth }px`
        canvas.width = devicePixelRatio * sampleNameViewportWidth

        const viewportHeight = this.$viewport.height()
        const pixelHeight = Math.min(contentHeight, 3 * viewportHeight)

        canvas.style.height = `${ pixelHeight }px`
        canvas.height = devicePixelRatio * pixelHeight

        context.scale(devicePixelRatio, devicePixelRatio)

        const pixelTop = Math.max(0, -(this.$content.position().top) - viewportHeight)

        canvas.style.top = `${ pixelTop }px`

        context.translate(0, -pixelTop)

        this.draw({ context, pixelWidth: sampleNameViewportWidth, pixelTop, samples })

        this.canvasVerticalRange = {top: pixelTop, bottom: pixelTop + pixelHeight}

        if (this.$canvas) {
            this.$canvas.off()
            this.$canvas.remove()
            this.canvas = this.ctx = null
        }

        this.$canvas = $(canvas)
        this.$content.append(this.$canvas)
        this.canvas = canvas
        this.ctx = context

        this.addMouseHandler(pixelTop, samples)

    }

    draw({ context, pixelWidth, pixelTop, samples }) {

        if (!samples || samples.names.length === 0) {
            return
        }

        configureFont(context, fontConfigureTemplate, samples.height)

        const sampleNameXShim = 4

        context.clearRect(0, 0, context.canvas.width, context.canvas.height)

        let y = 0
        for (let name of samples.names) {

            // context.save()

            // context.fillStyle = appleCrayonRGB('snow')
            // context.fillRect(0, y, pixelWidth, h)

            // context.fillStyle = randomRGBConstantAlpha(180, 240, 1)
            context.fillStyle = appleCrayonRGB('snow')
            context.fillRect(0, y, pixelWidth, samples.height)

            // context.restore()

            context.fillStyle = appleCrayonRGB('lead')

            const text = name.toUpperCase()

            // const yFont = y + samples.height - getSampleNameYShim(context, text, samples.height)
            const yFont = getYFont(context, text, y, samples.height)

            // const diagnostic = `min ${ StringUtils.numberFormatter(y) } max ${ StringUtils.numberFormatter(y + samples.height) }`
            // context.fillText(diagnostic, sampleNameXShim, yFont)

            context.fillText(text, sampleNameXShim, yFont)

            y += samples.height
        }

    }

    renderSVGContext(context, { deltaX, deltaY }) {

        // return


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

        if (this.featureMap) {
            configureFont(context, fontConfigureTemplate, this.featureMap)
            this.sampleNameRenderer(context, this.featureMap, width, height)
        }

        context.restore()

    }

    addMouseHandler(pixelTop, samples) {

        this.canvas.addEventListener('click', e => {

            if ('block' === this.hover.style.display) {
                this.hover.style.display = 'none'
                this.hover.textContent = ''
            } else {

                const { currentTarget, clientY } = e

                const { y:target_bbox_min_y } = currentTarget.getBoundingClientRect()

                const y = (clientY - target_bbox_min_y) + pixelTop
                // console.log(`y ${ StringUtils.numberFormatter(y) }`)

                let yMin = 0
                for (let name of samples.names) {

                    const yMax = getYFont(context, name.toUpperCase(), yMin, samples.height)
                    if (y < yMin || y > yMax) {
                        // do nothing
                    } else {

                        this.hover.style.top = `${ yMin + this.$content.position().top }px`
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

function getYFont(context, text, y, height) {
    return y + height - getSampleNameYShim(context, text, height)
}

function getSampleNameYShim(context, text, h) {

    const { fontBoundingBoxAscent, fontBoundingBoxDescent } = context.measureText(text)
    return (h - (fontBoundingBoxAscent + fontBoundingBoxDescent))/2
}

function configureFont(ctx, { textAlign, textBaseline, strokeStyle, fillStyle }, sampleHeight) {
    const pixels = Math.min(sampleHeight, maxFontSize)
    ctx.font = `${ pixels }px sans-serif`
    ctx.textAlign = textAlign
    ctx.textBaseline = textBaseline
    ctx.fillStyle = fillStyle
}

export { sampleNameViewportWidth, sampleNameXShim }

export default SampleNameViewport
