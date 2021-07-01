import ViewPort from "./viewport.js";
import $ from "./vendor/jquery-3.3.1.slim.js";
import RulerSweeper from "./rulerSweeper.js";
import GenomeUtils from "./genome/genome.js";
import {Icon, DOMUtils, IGVMath, StringUtils} from "../node_modules/igv-utils/src/index.js";

let timer
let currentViewport = undefined
const toolTipTimeout = 1e4

class RulerViewport extends ViewPort {

    constructor(trackView, $viewportColumn, referenceFrame, width) {
        super(trackView, $viewportColumn, referenceFrame, width);
    }

    initializationHelper() {

        this.rulerSweeper = new RulerSweeper(this)

        this.$multiLocusCloseButton = $('<div>', { class: 'igv-multi-locus-close-button' })
        this.$viewport.append(this.$multiLocusCloseButton);
        this.$multiLocusCloseButton.get(0).appendChild(Icon.createIcon("times-circle"));
        this.$multiLocusCloseButton.click(() => this.browser.removeMultiLocusPanel(this.referenceFrame));

        this.$rulerLabel = $('<div>', { class: 'igv-multi-locus-ruler-label' })
        this.$viewport.append(this.$rulerLabel)

        this.$rulerLabel.click(() => {
            const remove = this.browser.referenceFrameList.filter(r => this.referenceFrame !== r).pop();
            this.browser.removeMultiLocusPanel(remove)
        })

        this.$tooltip = $('<div>', { class: 'igv-ruler-tooltip' })
        this.$tooltip.height(this.$viewport.height())

        this.$viewport.append(this.$tooltip)

        this.$tooltipContent = $('<div>')
        this.$tooltip.append(this.$tooltipContent)

        this.attachMouseHandlers( GenomeUtils.isWholeGenomeView(this.browser.referenceFrameList[0].chr) )

        this.$tooltip.hide()
        this.dismissLocusLabel()

        this.browser.on('locuschange', referenceFrameList => {

            if (referenceFrameList.length > 1) {
                const viewportWidth = this.browser.calculateViewportWidth(referenceFrameList.length)
                this.presentLocusLabel(viewportWidth)
            }

        })


    }

    presentLocusLabel(viewportWidth) {
        this.$rulerLabel.text( this.referenceFrame.getPresentionLocus(viewportWidth) )
        this.$rulerLabel.show()
        this.$multiLocusCloseButton.show()
    }

    dismissLocusLabel() {
        this.$rulerLabel.hide()
        this.$multiLocusCloseButton.hide()
    }

    attachMouseHandlers(isWholeGenomeView) {

        this.namespace = `.ruler_track_viewport_${ this.browser.referenceFrameList.indexOf(this.referenceFrame) }`

        this.$viewport.off(this.namespace)

        if (true === isWholeGenomeView) {
            const index = this.browser.referenceFrameList.indexOf(this.referenceFrame)

            const click = `click${ this.namespace }`
            this.$viewport.on(click, (e) => {

                const { x:pixel } = DOMUtils.translateMouseCoordinates(e, this.$viewport.get(0));
                const bp = Math.round(this.referenceFrame.start + this.referenceFrame.toBP(pixel));

                let searchString;

                const { chr } = this.browser.genome.getChromosomeCoordinate(bp)

                if (1 === this.browser.referenceFrameList.length) {
                    searchString = chr
                } else {

                    let loci = this.browser.referenceFrameList.map(({ locusSearchString }) => locusSearchString);

                    loci[ index ] = chr;

                    searchString = loci.join(' ');
                }

                this.browser.search(searchString);
            })

        }

    }

    mouseMove(event) {

        if (true === this.browser.cursorGuideVisible) {

            if (undefined === currentViewport) {
                currentViewport = this
                this.$tooltip.show()
            } else if (currentViewport.guid !== this.guid) {
                currentViewport.$tooltip.hide()
                this.$tooltip.show()
                currentViewport = this
            } else {
                this.$tooltip.show()
            }

            const isWholeGenome = (this.browser.isMultiLocusWholeGenomeView() || GenomeUtils.isWholeGenomeView(this.browser.referenceFrameList[0].chr));

            if (isWholeGenome) {
                this.$tooltip.hide();
                return;
            }

            const { x } = DOMUtils.translateMouseCoordinates(event, this.$viewport.get(0))
            const { start, bpPerPixel } = this.referenceFrame
            const bp = Math.round(0.5 + start + Math.max(0, x) * bpPerPixel)

            this.$tooltipContent.text( StringUtils.numberFormatter(bp) )

            const { width:ww } = this.$tooltipContent.get(0).getBoundingClientRect()
            const { width:w } = this.$viewport.get(0).getBoundingClientRect()

            this.$tooltip.css({ left: `${ IGVMath.clamp(x, 0, w - ww) }px` })

            // hide tooltip when movement stops
            clearTimeout(timer)
            timer = setTimeout(() => this.$tooltip.hide(),toolTipTimeout)

        }

    }

    startSpinner() {}
    stopSpinner() {}

}

export default RulerViewport
