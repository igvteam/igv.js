import TrackViewport from "./trackViewport.js"
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
        return this.viewportElement
    }

    initializationHelper() {
        // Create the multi-locus close button
        this.multiLocusCloseButton = document.createElement('div');
        this.multiLocusCloseButton.className = 'igv-multi-locus-close-button';
        this.viewportElement.appendChild(this.multiLocusCloseButton);

        const closeIcon = createIcon("times-circle");
        this.multiLocusCloseButton.appendChild(closeIcon);

        this.multiLocusCloseButton.addEventListener('click', () => {
            this.browser.removeMultiLocusPanel(this.referenceFrame);
        });

        // Create the ruler label
        this.rulerLabel = document.createElement('div');
        this.rulerLabel.className = 'igv-multi-locus-ruler-label';
        this.viewportElement.appendChild(this.rulerLabel);

        const rulerLabelDiv = document.createElement('div');
        this.rulerLabel.appendChild(rulerLabelDiv);

        this.rulerLabel.addEventListener('click', async (event) => {
            event.stopPropagation();
            await this.browser.gotoMultilocusPanel(this.referenceFrame);
        });

        // Create the tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'igv-ruler-tooltip';
        this.tooltip.style.height = `${this.viewportElement.clientHeight}px`;
        this.viewportElement.appendChild(this.tooltip);

        this.tooltipContent = document.createElement('div');
        this.tooltip.appendChild(this.tooltipContent);

        // Instantiate RulerSweeper
        this.rulerSweeper = new RulerSweeper(this, this.viewportElement.parentElement, this.browser, this.referenceFrame);

        // Attach mouse handlers
        this.attachMouseHandlers(GenomeUtils.isWholeGenomeView(this.referenceFrame.chr));

        // Initially hide the tooltip
        this.tooltip.style.display = 'none';

        // Dismiss locus label
        this.dismissLocusLabel();
    }

    presentLocusLabel(viewportWidth) {
        this.multiLocusCloseButton.style.display = 'block';

        this.rulerLabel.style.display = 'block';
        this.rulerLabel.style.backgroundColor = getChrColor(this.referenceFrame.chr);

        const textDiv = this.rulerLabel.querySelector('div');

        const { width } = this.rulerLabel.getBoundingClientRect();

        textDiv.innerHTML = `${this.referenceFrame.getMultiLocusLabel(viewportWidth)}`;
        const { width: textDivWidth } = textDiv.getBoundingClientRect();

        if (textDivWidth / width > 0.5) {
            textDiv.innerHTML = `${this.referenceFrame.getMultiLocusLabelBPLengthOnly(viewportWidth)}`;
        }

        //console.log(`${Date.now()} textDiv ${StringUtils.numberFormatter(Math.floor(textDivWidth))}`);
    }

// Use in conjunction with .igv-multi-locus-ruler-label-square-dot css class (_dom-misc.scss)
    dismissLocusLabel() {
        this.rulerLabel.style.display = 'none';
        this.multiLocusCloseButton.style.display = 'none';
    }

    attachMouseHandlers(isWholeGenomeView) {

        if (true === isWholeGenomeView) {

            this.viewportElement.addEventListener('click', (e) => {

                const {x: pixel} = DOMUtils.translateMouseCoordinates(e, this.viewportElement)
                const bp = Math.round(this.referenceFrame.start + this.referenceFrame.toBP(pixel))

                let searchString

                const {chr} = this.browser.genome.getChromosomeCoordinate(bp)

                if (1 === this.browser.referenceFrameList.length) {
                    searchString = chr
                } else {
                    const index = this.browser.referenceFrameList.indexOf(this.referenceFrame)
                    const loci = this.browser.referenceFrameList.map(({locusSearchString}) => locusSearchString)
                    loci[index] = chr
                    searchString = loci.join(' ')
                }

                this.browser.search(searchString)

            })

            this.viewportElement.style.cursor = 'pointer'
        } else {
            this.viewportElement.style.cursor = 'default'
        }

    }

    mouseMove(event) {
        if (this.browser.doShowCursorGuide) {
            if (currentViewport === undefined) {
                currentViewport = this;
                this.tooltip.style.display = "block";
            } else if (currentViewport.guid !== this.guid) {
                if (currentViewport.tooltip) {
                    currentViewport.tooltip.style.display = "none";
                }
                this.tooltip.style.display = "block";
                currentViewport = this;
            } else {
                this.tooltip.style.display = "block";
            }

            const isWholeGenome = (
                this.browser.isMultiLocusWholeGenomeView() ||
                GenomeUtils.isWholeGenomeView(this.referenceFrame.chr)
            );

            if (isWholeGenome) {
                this.tooltip.style.display = "none";
                return undefined;
            }

            const { x } = DOMUtils.translateMouseCoordinates(event, this.viewportElement);
            const { start, end, bpPerPixel } = this.referenceFrame;
            const bp = Math.round(0.5 + start + Math.max(0, x) * bpPerPixel);

            this.tooltipContent.textContent = StringUtils.numberFormatter(bp);

            const tooltipRect = this.tooltipContent.getBoundingClientRect();
            const viewportRect = this.viewportElement.getBoundingClientRect();

            const tooltipLeft = IGVMath.clamp(x, 0, viewportRect.width - tooltipRect.width);
            this.tooltip.style.left = `${tooltipLeft}px`;

            // hide tooltip when movement stops
            clearTimeout(timer);
            timer = setTimeout(() => {
                if (this.tooltip) this.tooltip.style.display = "none";
            }, toolTipTimeout);

            return { start, bp, end };
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
