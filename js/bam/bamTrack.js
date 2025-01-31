/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import BamSource from "./bamSource.js"
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import {createCheckbox} from "../igv-icons.js"
import {PaletteColorTable} from "../util/colorPalletes.js"
import {StringUtils} from "../../node_modules/igv-utils/src/index.js"
import {makePairedAlignmentChords, makeSupplementalAlignmentChords, sendChords} from "../jbrowse/circularViewUtils.js"
import PairedEndStats from "./pairedEndStats.js"
import AlignmentTrack from "./alignmentTrack.js"
import CoverageTrack from "./coverageTrack.js"


class BAMTrack extends TrackBase {

    static defaults = {
        alleleFreqThreshold: 0.2,
        visibilityWindow: 30000,
        showCoverage: true,
        showAlignments: true,
        height: 300,
        coverageTrackHeight: 50,
        baseModificationThreshold: 0
    }

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {

        this.type = "alignment"
        this.featureSource = new BamSource(config, this.browser)

        const coverageTrackConfig = Object.assign({parent: this}, config)
        this.coverageTrack = new CoverageTrack(coverageTrackConfig, this)

        const alignmentTrackConfig = Object.assign({parent: this}, config)
        this.alignmentTrack = new AlignmentTrack(alignmentTrackConfig, this.browser)

        super.init(config)

        if (!this.showAlignments) {
            this._height = this.coverageTrackHeight
        }

        // The sort object can be an array in the case of multi-locus view, however if multiple sort positions
        // are present for a given reference frame the last one will take precedence
        if (config.sort) {
            if (Array.isArray(config.sort)) {
                // Legacy support
                this.assignSort(config.sort[0])
            } else {
                this.assignSort(config.sort)
            }
        }
    }

    dispose() {
        this.alignmentTrack.dispose()
    }


    setHighlightedReads(highlightedReads, highlightColor) {
        this.alignmentTrack.setHighlightedReads(highlightedReads, highlightColor)
        this.updateViews()
    }

    get expectedPairOrientation() {
        return this.alignmentTrack.expectedPairOrientation
    }

    get viewAsPairs() {
        return this.alignmentTrack.viewAsPairs
    }

    get colorBy() {
        return this.alignmentTrack.colorBy
    }

    set height(h) {
        this._height = h
        if (this.showAlignments) {
            this.alignmentTrack.height = this.showCoverage ? h - this.coverageTrackHeight : h
        }
    }

    get height() {
        return this._height
    }

    sort(options) {
        options = this.assignSort(options)

        for (let vp of this.trackView.viewports) {
            if (vp.containsPosition(options.chr, options.position)) {
                const alignmentContainer = vp.cachedFeatures
                if (alignmentContainer) {
                    alignmentContainer.sortRows(options)
                    vp.repaint()
                }
            }
        }
    }

    /**
     * Fix syntax problems for sort options.
     * @param options
     */
    assignSort(options) {
        // convert old syntax
        if (options.locus) {
            const range = StringUtils.parseLocusString(options.locus)
            options.chr = range.chr
            options.position = range.start
        } else {
            options.position--
        }
        options.direction = options.direction === "ASC" || options.direction === true

        // chr aliasing
        options.chr = this.browser.genome.getChromosomeName(options.chr)
        this.sortObject = options

        return this.sortObject
    }

    async getFeatures(chr, bpStart, bpEnd, bpPerPixel, viewport) {

        const alignmentContainer = await this.featureSource.getAlignments(chr, bpStart, bpEnd)
        alignmentContainer.viewport = viewport

        if (alignmentContainer.hasPairs && !this._pairedEndStats && !this.config.maxFragmentLength) {
            const pairedEndStats = new PairedEndStats(alignmentContainer.allAlignments(), this.config)
            if (pairedEndStats.totalCount > 99) {
                this._pairedEndStats = pairedEndStats
            }
        }

        // Must pack before sorting
        alignmentContainer.pack(this.alignmentTrack)

        const sort = this.sortObject
        if (sort) {
            if (sort.chr === chr && sort.position >= bpStart && sort.position <= bpEnd) {
                alignmentContainer.sortRows(sort)
            }
        }

        this.alignmentTrack.hasPairs = this.alignmentTrack.hasPairs || alignmentContainer.hasPairs

        return alignmentContainer
    }


    /**
     * Compute the pixel height required to display all content.  This is not the same as the viewport height
     * (track.height) which might include a scrollbar.
     *
     * @param alignmentContainer
     * @returns {number}
     */
    computePixelHeight(alignmentContainer) {
        return (this.showCoverage ? this.coverageTrackHeight : 0) +
            (this.showAlignments ? this.alignmentTrack.computePixelHeight(alignmentContainer) : 0)
    }

    draw(options) {

        IGVGraphics.fillRect(options.context, 0, options.pixelTop, options.pixelWidth, options.pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})

        if (true === this.showCoverage && this.coverageTrackHeight > 0) {
            this.trackView.axisCanvas.style.display = 'block'
            this.coverageTrack.draw(options)
        } else {
            this.trackView.axisCanvas.style.display = 'none'
        }

        if (true === this.showAlignments) {
            this.alignmentTrack.setTop(this.coverageTrack, this.showCoverage)
            this.alignmentTrack.draw(options)
        }
    }

    paintAxis(ctx, pixelWidth, pixelHeight) {

        this.coverageTrack.paintAxis(ctx, pixelWidth, this.coverageTrackHeight)

        // if (this.browser.isMultiLocusMode()) {
        //     ctx.clearRect(0, 0, pixelWidth, pixelHeight);
        // } else {
        //     this.coverageTrack.paintAxis(ctx, pixelWidth, this.coverageTrackHeight);
        // }
    }

    contextMenuItemList(config) {
        return this.alignmentTrack.contextMenuItemList(config)
    }

    popupData(clickState) {
        if (true === this.showCoverage && clickState.y >= this.coverageTrack.top && clickState.y < this.coverageTrackHeight) {
            return this.coverageTrack.popupData(clickState)
        } else {
            return this.alignmentTrack.popupData(clickState)
        }
    }

    /**
     * Return the features (alignment, coverage, downsampled interval) clicked on.  Needed for "onclick" event.
     * @param clickState
     * @param features
     */
    clickedFeatures(clickState) {

        let clickedObject
        if (true === this.showCoverage && clickState.y >= this.coverageTrack.top && clickState.y < this.coverageTrackHeight) {
            clickedObject = this.coverageTrack.getClickedObject(clickState)
        } else {
            clickedObject = this.alignmentTrack.getClickedObject(clickState)
        }
        return clickedObject ? [clickedObject] : undefined
    }

    hoverText(clickState) {
        if (true === this.showCoverage && clickState.y >= this.coverageTrack.top && clickState.y < this.coverageTrackHeight) {
            const clickedObject = this.coverageTrack.getClickedObject(clickState)
            if (clickedObject) {
                return clickedObject.hoverText()
            }
        }

    }

    menuItemList() {

        // Start with overage track items
        let menuItems = []

        menuItems = menuItems.concat(this.numericDataMenuItems())

        menuItems = menuItems.concat(this.alignmentTrack.menuItemList())

        // Show coverage / alignment options
        const adjustTrackHeight = () => {
            if (!this.autoHeight) {
                const h =
                    (this.showCoverage ? this.coverageTrackHeight : 0) +
                    (this.showAlignments ? this.alignmentTrack.height : 0)
                this.trackView.setTrackHeight(h)
            }
        }

        menuItems.push('<hr/>')

        function showCoverageHandler() {
            this.showCoverage = !this.showCoverage
            adjustTrackHeight()
            this.trackView.checkContentHeight()
            this.trackView.repaintViews()
        }

        menuItems.push({
            element: createCheckbox("Show Coverage", this.showCoverage),
            click: showCoverageHandler
        })

        function showAlignmentHandler() {
            this.showAlignments = !this.showAlignments
            adjustTrackHeight()
            this.trackView.checkContentHeight()
            this.trackView.repaintViews()
        }

        menuItems.push({
            element: createCheckbox("Show Alignments", this.showAlignments),
            click: showAlignmentHandler
        })


        return menuItems
    }


    /**
     * Return the current state of the track.  Used to create sessions and bookmarks.
     *
     * @returns {*|{}}
     */
    getState() {

        const config = super.getState()

        // Shared state
        if (this.sortObject) {
            config.sort = {
                chr: this.sortObject.chr,
                position: this.sortObject.position + 1,
                option: this.sortObject.option,
                direction: this.sortObject.direction ? "ASC" : "DESC"
            }
        }

        // Alignment track
        Object.assign(config, this.alignmentTrack.getState())

        return config
    }

    getCachedAlignmentContainers() {
        return this.trackView.viewports.map(vp => vp.cachedFeatures)
    }

    get dataRange() {
        return this.coverageTrack.dataRange
    }

    set dataRange(dataRange) {
        this.coverageTrack.dataRange = dataRange
    }

    get logScale() {
        return this.coverageTrack.logScale
    }

    set logScale(logScale) {
        this.coverageTrack.logScale = logScale
    }

    get autoscale() {
        return this.coverageTrack.autoscale
    }

    set autoscale(autoscale) {
        this.coverageTrack.autoscale = autoscale
    }

    /**
     * Add chords to the circular view for the given viewport, represented by its reference frame
     * @param refFrame
     */
    addPairedChordsForViewport(viewport) {

        const maxTemplateLength = this.maxTemplateLength
        const inView = []
        const refFrame = viewport.referenceFrame
        for (let a of viewport.cachedFeatures.allAlignments()) {
            if (a.end >= refFrame.start
                && a.start <= refFrame.end) {
                if (a.paired) {
                    if (a.end - a.start > maxTemplateLength) {
                        inView.push(a)
                    }
                } else {
                    if (a.mate
                        && a.mate.chr
                        && (a.mate.chr !== a.chr || Math.max(a.fragmentLength) > maxTemplateLength)) {
                        inView.push(a)
                    }
                }
            }
        }
        const chords = makePairedAlignmentChords(inView)
        sendChords(chords, this, refFrame, 0.02)
    }

    addSplitChordsForViewport(viewport) {

        const inView = []
        const refFrame = viewport.referenceFrame
        for (let a of viewport.cachedFeatures.allAlignments()) {

            const sa = a.hasTag('SA')
            if (a.end >= refFrame.start && a.start <= refFrame.end && sa) {
                inView.push(a)
            }
        }

        const chords = makeSupplementalAlignmentChords(inView)
        sendChords(chords, this, refFrame, 0.02)
    }

}

export default BAMTrack
