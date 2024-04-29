import TrackViewport from "./trackViewport.js"
import $ from "./vendor/jquery-3.3.1.slim.js"
import RulerSweeper from "./rulerSweeper.js"
import GenomeUtils from "./genome/genomeUtils.js"
import {IGVMath, StringUtils} from "../node_modules/igv-utils/src/index.js"
import * as DOMUtils from "./ui/utils/dom-utils.js"
import {createIcon} from "./ui/utils/icons.js"
import {getChrColor} from "./util/getChrColor.js"

let timer
let currentViewport = undefined
const toolTipTimeout = 1e4

class RulerViewport extends TrackViewport {

    constructor(trackView, $viewportColumn, referenceFrame, width) {
        super(trackView, $viewportColumn, referenceFrame, width)
    }

    get contentDiv() {
        return this.$viewport.get(0)
    }

    initializationHelper() {

        this.$multiLocusCloseButton = $('<div>', {class: 'igv-multi-locus-close-button'})
        this.$viewport.append(this.$multiLocusCloseButton)
        this.$multiLocusCloseButton.get(0).appendChild(createIcon("times-circle"))

        this.$multiLocusCloseButton.click(() => {
            this.browser.removeMultiLocusPanel(this.referenceFrame)
        })

        this.$rulerLabel = $('<div>', {class: 'igv-multi-locus-ruler-label'})
        this.$viewport.append(this.$rulerLabel)

        const labelToggleHandler = e => {

            e.stopPropagation()

            const el = e.target
            const [ a, b ] = this.$rulerLabel.get(0).querySelectorAll('div')

            if (el.isEqualNode(a)) {
                a.style.display = 'none'
                b.style.display = 'block'
            } else {
                b.style.display = 'none'
                a.style.display = 'block'
            }

        }

        let div
        div = document.createElement('div')
        this.$rulerLabel.append($(div))

        this.$rulerLabel.get(0).addEventListener('click', async event => {
            event.stopPropagation()
            await this.browser.gotoMultilocusPanel(this.referenceFrame)
        })

        this.$tooltip = $('<div>', {class: 'igv-ruler-tooltip'})
        this.$tooltip.height(this.$viewport.height())

        this.$viewport.append(this.$tooltip)

        this.$tooltipContent = $('<div>')
        this.$tooltip.append(this.$tooltipContent)

        this.rulerSweeper = new RulerSweeper(this, this.$viewport.get(0).parentElement, this.browser, this.referenceFrame)

        this.attachMouseHandlers(GenomeUtils.isWholeGenomeView(this.referenceFrame.chr))

        this.$tooltip.hide()

        this.dismissLocusLabel()
    }

    presentLocusLabel(viewportWidth) {

        this.$multiLocusCloseButton.show()

        this.$rulerLabel.show()
        this.$rulerLabel.get(0).style.backgroundColor = getChrColor(this.referenceFrame.chr)

        const textDiv = this.$rulerLabel.get(0).querySelector('div')

        const { width } = this.$rulerLabel.get(0).getBoundingClientRect()

        textDiv.innerHTML = `${ this.referenceFrame.getMultiLocusLabel(viewportWidth) }`
        const { width:textDivWidth } = textDiv.getBoundingClientRect()

        if (textDivWidth/width > 0.5) {
            textDiv.innerHTML = `${ this.referenceFrame.getMultiLocusLabelBPLengthOnly(viewportWidth) }`
        }

        //console.log(`${ Date.now() } textDiv ${ StringUtils.numberFormatter(Math.floor(textDivWidth)) }`)

    }

    // Use in conjuction with .igv-multi-locus-ruler-label-square-dot css class (_dom-misc.scss)
    dismissLocusLabel() {
        this.$rulerLabel.hide()
        this.$multiLocusCloseButton.hide()
    }

    attachMouseHandlers(isWholeGenomeView) {

        this.namespace = `.ruler_track_viewport_${this.browser.referenceFrameList.indexOf(this.referenceFrame)}`

        this.$viewport.off(this.namespace)

        if (true === isWholeGenomeView) {

            const index = this.browser.referenceFrameList.indexOf(this.referenceFrame)

            const click = `click${this.namespace}`
            this.$viewport.on(click, (e) => {

                const {x: pixel} = DOMUtils.translateMouseCoordinates(e, this.$viewport.get(0))
                const bp = Math.round(this.referenceFrame.start + this.referenceFrame.toBP(pixel))

                let searchString

                const {chr} = this.browser.genome.getChromosomeCoordinate(bp)

                if (1 === this.browser.referenceFrameList.length) {
                    searchString = chr
                } else {

                    let loci = this.browser.referenceFrameList.map(({locusSearchString}) => locusSearchString)

                    loci[index] = chr

                    searchString = loci.join(' ')
                }

                this.browser.search(searchString)
            })

            this.$viewport.get(0).style.cursor = 'pointer'
        } else {
            this.$viewport.get(0).style.cursor = 'default'
        }

    }

    mouseMove(event) {

        if (true === this.browser.doShowCursorGuide) {

            if (undefined === currentViewport) {
                currentViewport = this
                this.$tooltip.show()
            } else if (currentViewport.guid !== this.guid) {
                if (currentViewport.$tooltip) {
                    currentViewport.$tooltip.hide()
                }
                this.$tooltip.show()
                currentViewport = this
            } else {
                this.$tooltip.show()
            }

            const isWholeGenome = (this.browser.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(this.referenceFrame.chr))

            if (isWholeGenome) {
                this.$tooltip.hide()
                return
            }

            const {x} = DOMUtils.translateMouseCoordinates(event, this.$viewport.get(0))
            const {start, bpPerPixel} = this.referenceFrame
            const bp = Math.round(0.5 + start + Math.max(0, x) * bpPerPixel)

            this.$tooltipContent.text(StringUtils.numberFormatter(bp))

            const {width: ww} = this.$tooltipContent.get(0).getBoundingClientRect()
            const {width: w} = this.$viewport.get(0).getBoundingClientRect()

            this.$tooltip.css({left: `${IGVMath.clamp(x, 0, w - ww)}px`})

            // hide tooltip when movement stops
            clearTimeout(timer)
            timer = setTimeout(() => {
                if (this.$tooltip) this.$tooltip.hide()
            }, toolTipTimeout)

        }

    }

    startSpinner() {
    }

    stopSpinner() {
    }

    dispose() {
        this.rulerSweeper.dispose()
        super.dispose()
    }

}

export default RulerViewport
