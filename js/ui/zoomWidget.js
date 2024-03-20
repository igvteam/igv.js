import {createIcon} from "./utils/icons.js"
import * as DOMUtils from "./utils/dom-utils.js"

const sliderMin = 0
let sliderMax = 23
let sliderValueRaw = 0

const ZoomWidget = function (browser, parent) {

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

ZoomWidget.prototype.update = function (referenceFrameList) {

    const referenceFrame = referenceFrameList[0]
    const {bpLength} = referenceFrame.genome.getChromosome(referenceFrame.chr)
    const {start, end} = referenceFrame

    sliderMax = Math.ceil(Math.log2(bpLength / this.browser.minimumBases()))

    this.slider.max = `${sliderMax}`

    const scaleFactor = bpLength / (end - start)
    sliderValueRaw = Math.log2(scaleFactor)
    this.slider.value = `${Math.round(sliderValueRaw)}`

    const extent = end - start

    const derivedScalefactor = Math.pow(2, sliderValueRaw)

    const derivedExtent = bpLength / derivedScalefactor

    // referenceFrame.description('zoom.update')

    // console.log(`${ Date.now() } update - slider ${ this.slider.value } scaleFactor ${ Math.round(scaleFactor) } extent ${ StringUtils.numberFormatter(Math.round(extent)) }`)

    // console.log(`update - sliderMin ${ sliderMin } sliderValue ${ this.slider.value } sliderMax ${ sliderMax } scaleFactor ${ scaleFactor.toFixed(3) } derived-scaleFactor ${ derivedScalefactor.toFixed(3) }`)

}

ZoomWidget.prototype.enable = function () {

    // this.zoomInButton.style.color = appleCrayonPalette[ 'steel' ];
    // this.zoomInButton.style.pointerEvents = 'auto';
    //
    // this.zoomOutButton.style.color = appleCrayonPalette[ 'steel' ];
    // this.zoomOutButton.style.pointerEvents = 'auto';

    this.slider.disabled = false
}

ZoomWidget.prototype.disable = function () {

    // this.zoomInButton.style.color = appleCrayonPalette[ 'silver' ];
    // this.zoomInButton.style.pointerEvents = 'none';
    //
    // this.zoomOutButton.style.color = appleCrayonPalette[ 'silver' ];
    // this.zoomOutButton.style.pointerEvents = 'none';

    this.slider.disabled = true
}

ZoomWidget.prototype.hide = function () {
    this.zoomContainer.style.display = 'none'
}

ZoomWidget.prototype.show = function () {
    this.zoomContainer.style.display = 'block'
}

ZoomWidget.prototype.hideSlider = function () {
    this.slider.style.display = 'none'
}

ZoomWidget.prototype.showSlider = function () {
    this.slider.style.display = 'block'
}

function lerpAlvyRaySmith(a, b, t) {
    return a - t * (a - b)
}

export default ZoomWidget
