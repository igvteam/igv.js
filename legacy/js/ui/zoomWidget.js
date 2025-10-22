import {createIcon} from "./utils/icons.js"
import * as DOMUtils from "./utils/dom-utils.js"

const sliderMin = 0
let sliderMax = 23
let sliderValueRaw = 0

class ZoomWidget {
    constructor(config, browser, parent) {

        this.browser = browser

        this.zoomContainer = DOMUtils.div({class: 'igv-zoom-widget'})
        parent.appendChild(this.zoomContainer)

        // zoom out
        this.zoomOutButton = DOMUtils.div()
        this.zoomContainer.appendChild(this.zoomOutButton)
        this.zoomOutButton.appendChild(createIcon('minus-circle'))
        this.zoomOutButton.addEventListener('click', () => {
            // browser.zoomWithScaleFactor(2.0)
            browser.zoomOut()
        })

        // Range slider
        const el = DOMUtils.div()
        this.zoomContainer.appendChild(el)
        this.slider = document.createElement('input')
        this.slider.type = 'range'

        this.slider.min = `${sliderMin}`
        this.slider.max = `${sliderMax}`

        el.appendChild(this.slider)

        this.slider.addEventListener('change', e => {

            e.preventDefault()
            e.stopPropagation()

            const referenceFrame = browser.referenceFrameList[0]
            const {bpLength} = referenceFrame.genome.getChromosome(referenceFrame.chr)
            const {end, start} = referenceFrame

            const extent = end - start

            // bpLength/(end - start)
            const scaleFactor = Math.pow(2, e.target.valueAsNumber)

            // (end - start) = bpLength/scaleFactor
            const zoomedExtent = bpLength / scaleFactor

            // console.log(`zoom-widget - slider ${ e.target.value } scaleFactor ${ scaleFactor } extent-zoomed ${ StringUtils.numberFormatter(Math.round(zoomedExtent)) }`)

            browser.zoomWithScaleFactor(zoomedExtent / extent)

        })

        // zoom in
        this.zoomInButton = DOMUtils.div()
        this.zoomContainer.appendChild(this.zoomInButton)
        this.zoomInButton.appendChild(createIcon('plus-circle'))
        this.zoomInButton.addEventListener('click', () => {
            // browser.zoomWithScaleFactor(0.5)
            browser.zoomIn()
        })

        browser.on('locuschange', (referenceFrameList) => {

            if (this.browser.isMultiLocusMode()) {
                this.disable()
            } else {
                this.enable()
                this.update(referenceFrameList)
            }

        })

    }

    update(referenceFrameList) {

        if (this.slider) {
            const referenceFrame = referenceFrameList[0]
            const {bpLength} = referenceFrame.genome.getChromosome(referenceFrame.chr)
            const {start, end} = referenceFrame

            sliderMax = Math.ceil(Math.log2(bpLength / this.browser.minimumBases()))
            this.slider.max = `${sliderMax}`

            const scaleFactor = bpLength / (end - start)
            sliderValueRaw = Math.log2(scaleFactor)
            this.slider.value = `${Math.round(sliderValueRaw)}`
        }
    }


    enable() {

        // this.zoomInButton.style.color = appleCrayonPalette[ 'steel' ];
        // this.zoomInButton.style.pointerEvents = 'auto';
        //
        // this.zoomOutButton.style.color = appleCrayonPalette[ 'steel' ];
        // this.zoomOutButton.style.pointerEvents = 'auto';

        if (this.slider) this.slider.disabled = false
    }

    disable() {

        // this.zoomInButton.style.color = appleCrayonPalette[ 'silver' ];
        // this.zoomInButton.style.pointerEvents = 'none';
        //
        // this.zoomOutButton.style.color = appleCrayonPalette[ 'silver' ];
        // this.zoomOutButton.style.pointerEvents = 'none';

        if (this.slider) this.slider.disabled = true
    }

    hide() {
        this.zoomContainer.style.display = 'none'
    }

    show() {
        this.zoomContainer.style.display = 'block'
    }

    hideSlider() {
        if (this.slider) this.slider.style.display = 'none'
    }

    showSlider() {
        if (this.slider) this.slider.style.display = 'block'
    }
}

export default ZoomWidget
