import ViewPort from "./viewport.js";
import $ from "./vendor/jquery-3.3.1.slim.js";
import RulerSweeper from "./rulerSweeper.js";
import GenomeUtils from "./genome/genome.js";
import {DOMUtils} from "../node_modules/igv-utils/src/index.js";
import {createIcon} from "./igv-icons.js";

class RulerViewport extends ViewPort {
    constructor(trackView, $viewportContainer, genomicState, width) {
        super(trackView, $viewportContainer, genomicState, width);
    }

    initializationHelper() {

        this.rulerSweeper = new RulerSweeper(this)

        appendMultiPanelCloseButton(this.browser, this.$viewport, this.genomicState)

        this.$rulerLabel = $('<div class = "igv-multi-locus-panel-label-div">')
        this.$content.append(this.$rulerLabel)
        this.$rulerLabel.click(() => this.browser.selectMultiLocusPanelWithGenomicState(this.genomicState))

        this.namespace = `.ruler_track_viewport_${ this.browser.genomicStateList.indexOf(this.genomicState) }`

        if (true === GenomeUtils.isWholeGenomeView(this.browser.genomicStateList[0].chromosome.name)) {
            enableTrackMouseHandlers.call(this)
        } else {
            this.$viewport.off(this.namespace)
        }

    }

    updateLocusLabel() {
        const str = this.genomicState.presentLocus(this.$viewport.width())
        this.$rulerLabel.text(str)
    }

}

function appendMultiPanelCloseButton(browser, $viewport, genomicState) {

    $viewport.addClass('igv-viewport-ruler');

    const $close = $('<div class="igv-multi-locus-panel-close-container">');
    $viewport.append($close);

    $close.append(createIcon("times-circle"));

    $close.click(() => browser.removeMultiLocusPanelWithGenomicState(genomicState, true));

}

function enableTrackMouseHandlers() {

    const index = this.browser.genomicStateList.indexOf(this.genomicState)
    const click = `click${ this.namespace }`

    this.$viewport.on(click, (e) => {

        const { x:pixel } = DOMUtils.translateMouseCoordinates(e, this.$viewport.get(0));
        const bp = Math.round(this.genomicState.referenceFrame.start + this.genomicState.referenceFrame.toBP(pixel));

        let searchString;

        const { chr } = this.browser.genome.getChromosomeCoordinate(bp)

        if (1 === this.browser.genomicStateList.length) {
            searchString = chr
        } else {

            let loci = this.browser.genomicStateList.map(({ locusSearchString }) => locusSearchString);

            loci[ index ] = chr;

            searchString = loci.join(' ');
        }

        this.browser.search(searchString);
    });


}

export default RulerViewport
