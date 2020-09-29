import ViewPort from "./viewport.js";
import $ from "./vendor/jquery-3.3.1.slim.js";
import RulerSweeper from "./rulerSweeper.js";
import GenomeUtils from "./genome/genome.js";
import {DOMUtils} from "../node_modules/igv-utils/src/index.js";
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

        this.namespace = `.ruler_track_viewport_${ this.browser.referenceFrameList.indexOf(this.referenceFrame) }`

        if (true === GenomeUtils.isWholeGenomeView(this.browser.referenceFrameList[0].chrName)) {
            enableTrackMouseHandlers.call(this)
        } else {
            this.$viewport.off(this.namespace)
        }

    }

    updateLocusLabel() {
        const str = this.referenceFrame.presentLocus(this.$viewport.width())
        this.$rulerLabel.text(str)
    }

}

function appendMultiPanelCloseButton(browser, $viewport, referenceFrame) {

    $viewport.addClass('igv-viewport-ruler');

    const $close = $('<div class="igv-multi-locus-panel-close-container">');
    $viewport.append($close);

    $close.append(createIcon("times-circle"));

    $close.click(() => browser.removeMultiLocusPanelWithReferenceFrame(referenceFrame, true));

}

function enableTrackMouseHandlers() {

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
    });


}

export default RulerViewport
