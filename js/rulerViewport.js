import ViewPort from "./viewport.js";
import $ from "./vendor/jquery-3.3.1.slim.js";
import RulerSweeper from "./rulerSweeper.js";
import GenomeUtils from "./genome/genome.js";
import {translateMouseCoordinates} from "./util/domUtils.js";

class RulerViewport extends ViewPort {
    constructor(trackView, $viewportContainer, genomicState, width) {

        super(trackView, $viewportContainer, genomicState, width);

    }

    initializationHelper() {

        this.rulerSweeper = new RulerSweeper(this);
        this.trackView.track.appendMultiPanelCloseButton(this.$viewport, this.genomicState);

        this.$rulerLabel = $('<div class = "igv-multi-locus-panel-label-div">');
        this.$content.append(this.$rulerLabel);
        this.$rulerLabel.click(e => this.browser.selectMultiLocusPanelWithGenomicState(this.genomicState))

        if (true === GenomeUtils.isWholeGenomeView(this.genomicState.referenceFrame)) {
            enableTrackMouseHandlers.call(this);
        } else {
            disableTrackMouseHandlers.call(this);
        }

    }
}


function enableTrackMouseHandlers() {

    const index = this.browser.genomicStateList.indexOf(this.genomicState);
    const namespace = '.ruler_track_viewport_' + index;

    let self = this;
    this.$viewport.on('click' + namespace, (e) => {

        const pixel = translateMouseCoordinates(e, self.$viewport.get(0)).x;
        const bp = Math.round(self.genomicState.referenceFrame.start + self.genomicState.referenceFrame.toBP(pixel));

        let searchString;

        if (1 === self.browser.genomicStateList.length) {
            searchString = self.browser.genome.getChromosomeCoordinate(bp).chr;
        } else {

            let loci = self.browser.genomicStateList.map((genomicState) => {
                return genomicState.locusSearchString;
            });

            loci[self.browser.genomicStateList.indexOf(self.genomicState)] = self.browser.genome.getChromosomeCoordinate(bp).chr;

            searchString = loci.join(' ');
        }

        self.browser.search(searchString);
    });


}

function disableTrackMouseHandlers() {

    const index = this.browser.genomicStateList.indexOf(this.genomicState);
    const namespace = '.ruler_track_viewport_' + index;

    this.$viewport.off(namespace);
}

export default RulerViewport
