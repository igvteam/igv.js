import TrackViewport from "./trackViewport.js"
import $ from "./vendor/jquery-3.3.1.slim.js"
import RulerSweeper from "./rulerSweeper.js"
import GenomeUtils from "./genome/genome.js"
import {DOMUtils, Icon, IGVMath, StringUtils} from "../node_modules/igv-utils/src/index.js"
import {getChrColor} from "./bam/bamTrack.js"

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
        this.$multiLocusCloseButton.get(0).appendChild(Icon.createIcon("times-circle"))

        this.$multiLocusCloseButton.click(() => {
            this.browser.removeMultiLocusPanel(this.referenceFrame)
        })

        this.$rulerLabel = $('<div>', {class: 'igv-multi-locus-ruler-label'})
        this.$viewport.append(this.$rulerLabel)

        this.$rulerLabel.click(async () => {

            await this.browser.gotoMultilocusPanel(this.referenceFrame)

            // const removals = this.browser.referenceFrameList.filter(r => this.referenceFrame !== r)
            // for (let referenceFrame of removals) {
            //     await this.browser.removeMultiLocusPanel(referenceFrame)
            // }

        })

        this.$tooltip = $('<div>', {class: 'igv-ruler-tooltip'})
        this.$tooltip.height(this.$viewport.height())

        this.$viewport.append(this.$tooltip)

        this.$tooltipContent = $('<div>')
        this.$tooltip.append(this.$tooltipContent)

        // viewportColumn.appendChild(this.$viewport.get(0))
        this.rulerSweeper = new RulerSweeper(this, this.$viewport.get(0).parentElement, this.browser, this.referenceFrame)


        this.attachMouseHandlers(GenomeUtils.isWholeGenomeView(this.referenceFrame.chr))

        this.$tooltip.hide()

        this.dismissLocusLabel()
    }

    presentLocusLabel(viewportWidth) {

        const createRulerLabelString = () => {
            const html = `<div>${this.referenceFrame.getMultiLocusLabel(viewportWidth)}</div>`
            return document.createRange().createContextualFragment(html).firstChild
        }

        this.$rulerLabel.get(0).innerHTML = ''
        this.$rulerLabel.get(0).style.backgroundColor = getChrColor(this.referenceFrame.chr)
        this.$rulerLabel.get(0).appendChild(createRulerLabelString())
        this.$rulerLabel.show()

        this.$multiLocusCloseButton.show()
    }

    // Use in conjuction with .igv-multi-locus-ruler-label-square-dot css class (_dom-misc.scss)
    presentLocusLabel_Square_Dot(viewportWidth) {

        const createRulerLabelSquare = () => {
            const html = `<div>
                                <?xml version="1.0" encoding="UTF-8"?>
                                <svg width="14px" height="14px" viewBox="0 0 93 93" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                    <g>
                                        <rect id="Rectangle" fill="${getChrColor(this.referenceFrame.chr)}" x="0" y="0" width="93" height="93"></rect>
                                    </g>
                                </svg>
                            </div>`
            return document.createRange().createContextualFragment(html).firstChild
        }

        const createRulerLabelDot = () => {
            const html = `<div>
                                <?xml version="1.0" encoding="UTF-8"?>
                                <svg width="14px" height="14px" viewBox="0 0 89 89" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                                    <g>
                                        <circle id="Oval" fill="${getChrColor(this.referenceFrame.chr)}" cx="44.5" cy="44.5" r="44.5"></circle>
                                    </g>
                                </svg>
                            </div>`
            return document.createRange().createContextualFragment(html).firstChild
        }

        const createRulerLabelString = () => {
            const html = `<div>${this.referenceFrame.getMultiLocusLabel(viewportWidth)}</div>`
            return document.createRange().createContextualFragment(html).firstChild
        }

        this.$rulerLabel.get(0).innerHTML = ''
        this.$rulerLabel.get(0).appendChild(createRulerLabelDot())
        this.$rulerLabel.get(0).appendChild(createRulerLabelString())
        this.$rulerLabel.show()

        this.$multiLocusCloseButton.show()
    }

    dismissLocusLabel() {
        this.$rulerLabel.hide()
        this.$multiLocusCloseButton.hide()
    }

    attachMouseHandlers(isWholeGenomeView) {

        this.namespace = `.ruler_track_viewport_${this.browser.referenceFrameList.indexOf(this.referenceFrame)}`

        this.$viewport.off(this.namespace)

        // console.log(`Ruler track ${ true === isWholeGenomeView ? 'is' : 'is not' } whole genome.`)

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

        if (true === this.browser.cursorGuideVisible) {

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
