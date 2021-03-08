import ViewPort from "./viewport.js";
import $ from "./vendor/jquery-3.3.1.slim.js";
import RulerSweeper from "./rulerSweeper.js";
import GenomeUtils from "./genome/genome.js";
import {DOMUtils, StringUtils} from "../node_modules/igv-utils/src/index.js";
import {createIcon} from "./igv-icons.js";

class RulerViewport extends ViewPort {
    constructor(trackView, $viewportContainer, referenceFrame, width) {
        super(trackView, $viewportContainer, referenceFrame, width);
    }

    initializationHelper() {

        this.rulerSweeper = new RulerSweeper(this)

        appendMultiPanelCloseButton(this.browser, this.$viewport, this.referenceFrame)

        this.$rulerLabel = $('<div class = "igv-multi-locus-panel-label-div">')
        this.$content.append(this.$rulerLabel)

        this.$rulerLabel.click(() => this.browser.selectMultiLocusPanelWithReferenceFrame(this.referenceFrame))

        this.$tooltip = $('<div>', { class: 'igv-ruler-tooltip'})
        this.$tooltip.height(this.$viewport.height())

        this.$viewport.append(this.$tooltip)

        this.$tooltipContent = $('<div>')
        this.$tooltip.append(this.$tooltipContent)

        this.attachMouseHandlers( GenomeUtils.isWholeGenomeView(this.browser.referenceFrameList[0].chr) )

    }

    updateLocusLabel() {
        const str = this.referenceFrame.presentLocus(this.$viewport.width())
        this.$rulerLabel.text(str)
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

        } else {

            // const mousemove = `mousemove${ this.namespace }`
            // this.$viewport.on(mousemove, event => {
            //
            //     let { x } = DOMUtils.translateMouseCoordinates(event, this.$viewport.get(0))
            //
            //     const { start, bpPerPixel } = this.referenceFrame
            //
            //     const bp = Math.round(start + Math.max(0, x) * bpPerPixel)
            //
            //     this.$tooltip.css({ left: `${ x }px` })
            //     this.$tooltipContent.text( StringUtils.numberFormatter(bp) )
            // })

        }

    }

    mouseMove(event) {

        let { x } = DOMUtils.translateMouseCoordinates(event, this.$viewport.get(0))

        const { start, bpPerPixel } = this.referenceFrame

        const bp = Math.round(start + Math.max(0, x) * bpPerPixel)

        this.$tooltip.css({ left: `${ x }px` })
        this.$tooltipContent.text( StringUtils.numberFormatter(bp) )

    }

}

function appendMultiPanelCloseButton(browser, $viewport, referenceFrame) {

    $viewport.addClass('igv-viewport-ruler');

    const $close = $('<div class="igv-multi-locus-panel-close-container">');
    $viewport.append($close);

    $close.append(createIcon("times-circle"));

    $close.click(() => browser.removeMultiLocusPanelWithReferenceFrame(referenceFrame, true));

}

export default RulerViewport
