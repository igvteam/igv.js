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

import $ from "../vendor/jquery-3.3.1.slim.js"
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

const pairCompatibleGroupOptions = new Set(["firstOfPairStrand"])

class BAMTrack extends TrackBase {

    static defaults = {
        alleleFreqThreshold: 0.2,
        visibilityWindow: 30000,
        showCoverage: true,
        showAlignments: true,
        height: 300,
        coverageTrackHeight: 50
    }

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {

        this.type = "alignment"
        this.featureSource = new BamSource(config, this.browser)
        this.coverageTrack = new CoverageTrack(config, this)
        this.alignmentTrack = new AlignmentTrack(config, this)

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
        this.browser.off('trackdragend', this._dragEnd)
    }

    setHighlightedReads(highlightedReads) {
        this.alignmentTrack.setHighlightedReads(highlightedReads)
        this.updateViews()
    }

    get expectedPairOrientation() {
        return this.alignmentTrack.expectedPairOrientation
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

        if (alignmentContainer.paired && !this._pairedEndStats && !this.config.maxFragmentLength) {
            const pairedEndStats = new PairedEndStats(alignmentContainer.allAlignments(), this.config)
            if (pairedEndStats.totalCount > 99) {
                this._pairedEndStats = pairedEndStats
            }
        }

        // Must pack before sorting
        alignmentContainer.pack(this)

        const sort = this.sortObject
        if (sort) {
            if (sort.chr === chr && sort.position >= bpStart && sort.position <= bpEnd) {
                alignmentContainer.sortRows(sort)
            }
        }


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

        // Color by items //////////////////////////////////////////////////
        menuItems.push('<hr/>')
        const $e = $('<div class="igv-track-menu-category">')
        $e.text('Color by:')
        menuItems.push({name: undefined, object: $e, click: undefined, init: undefined})

        const colorByMenuItems = []
        colorByMenuItems.push({key: 'none', label: 'none'})
        colorByMenuItems.push({key: 'strand', label: 'read strand'})
        if (this.alignmentTrack.hasPairs) {
            colorByMenuItems.push({key: 'firstOfPairStrand', label: 'first-of-pair strand'})
            colorByMenuItems.push({key: 'pairOrientation', label: 'pair orientation'})
            colorByMenuItems.push({key: 'tlen', label: 'insert size (TLEN)'})
            colorByMenuItems.push({key: 'unexpectedPair', label: 'pair orientation & insert size (TLEN)'})
        }
        const tagLabel = 'tag' + (this.alignmentTrack.colorByTag ? ' (' + this.alignmentTrack.colorByTag + ')' : '')
        colorByMenuItems.push({key: 'tag', label: tagLabel})
        for (let item of colorByMenuItems) {
            const selected = (this.alignmentTrack.colorBy === item.key)
            menuItems.push(this.colorByCB(item, selected))
        }


        // Group by items //////////////////////////////////////////////////
        menuItems.push('<hr/>')
        const $e2 = $('<div class="igv-track-menu-category">')
        $e2.text('Group by:')
        menuItems.push({name: undefined, object: $e2, click: undefined, init: undefined})

        const groupByMenuItems = []
        groupByMenuItems.push({key: 'none', label: 'none'})
        groupByMenuItems.push({key: 'strand', label: 'read strand'})
        if (this.alignmentTrack.hasPairs) {
            groupByMenuItems.push({key: 'firstOfPairStrand', label: 'first-of-pair strand'})
            groupByMenuItems.push({key: 'pairOrientation', label: 'pair orientation'})
            groupByMenuItems.push({key: 'mateChr', label: 'chromosome of mate'})
        }
        groupByMenuItems.push({key: 'chimeric', label: 'chimeric'})
        groupByMenuItems.push({key: 'supplementary', label: 'supplementary flag'})
        groupByMenuItems.push({key: 'readOrder', label: 'read order'})
        //groupByMenuItems.push({key: 'phase', label: 'phase'})
        groupByMenuItems.push({key: 'tag', label: 'tag'})

        for (let item of groupByMenuItems) {
            const selected = this.alignmentTrack.groupBy === undefined && item.key === 'none' || this.alignmentTrack.groupBy === item.key
            menuItems.push(this.groupByCB(item, selected))
        }


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
            object: $(createCheckbox("Show Coverage", this.showCoverage)),
            click: showCoverageHandler
        })

        function showAlignmentHandler() {
            this.showAlignments = !this.showAlignments
            adjustTrackHeight()
            this.trackView.checkContentHeight()
            this.trackView.repaintViews()
        }

        menuItems.push({
            object: $(createCheckbox("Show Alignments", this.showAlignments)),
            click: showAlignmentHandler
        })

        // Show all bases
        menuItems.push('<hr/>')
        menuItems.push({
            object: $(createCheckbox("Show all bases", this.showAllBases)),
            click: function showAllBasesHandler() {
                this.showAllBases = !this.showAllBases
                this.config.showAllBases = this.showAllBases
                this.trackView.repaintViews()
            }
        })

        // Show mismatches
        menuItems.push('<hr/>')
        menuItems.push({
            object: $(createCheckbox("Show mismatches", this.showMismatches)),
            click: function showMismatchesHandler() {
                this.showMismatches = !this.showMismatches
                this.config.showMismatches = this.showMismatches
                this.trackView.repaintViews()
            }
        })

        // Insertions
        menuItems.push({
            object: $(createCheckbox("Show insertions", this.showInsertions)),
            click: function showInsertionsHandler() {
                this.showInsertions = !this.showInsertions
                this.config.showInsertions = this.showInsertions
                this.trackView.repaintViews()
            }
        })

        // Soft clips
        menuItems.push({
            object: $(createCheckbox("Show soft clips", this.showSoftClips)),
            click: function showSoftClipsHandler() {
                this.showSoftClips = !this.showSoftClips
                this.config.showSoftClips = this.showSoftClips
                const alignmentContainers = this.getCachedAlignmentContainers()
                for (let ac of alignmentContainers) {
                    ac.pack(this)
                }
                this.trackView.repaintViews()
            }
        })

        // View as pairs
        if (this.alignmentTrack.hasPairs) {
            menuItems.push('<hr/>')
            menuItems.push({
                object: $(createCheckbox("View as pairs", this.viewAsPairs)),
                click: function viewAsPairsHandler() {
                    const b = !this.viewAsPairs
                    if (b && this.alignmentTrack.groupBy && !pairCompatibleGroupOptions.has(this.alignmentTrack.groupBy)) {
                        this.browser.alert.present(`'View as Pairs' is incompatible with 'Group By ${this.alignmentTrack.groupBy}'`)
                        return
                    }
                    this.viewAsPairs = b
                    this.config.viewAsPairs = this.viewAsPairs
                    const alignmentContainers = this.getCachedAlignmentContainers()
                    for (let ac of alignmentContainers) {
                        ac.pack(this)
                    }
                    this.trackView.checkContentHeight()
                    this.trackView.repaintViews()
                }
            })
        }

        // Add chords to JBrowse circular view, if present
        if (this.browser.circularView &&
            (this.alignmentTrack.hasPairs || this.alignmentTrack.hasSupplemental)) {
            menuItems.push('<hr/>')
            if (this.alignmentTrack.hasPairs) {
                menuItems.push({
                    label: 'Add discordant pairs to circular view',
                    click: function discordantPairsHandler() {
                        for (let viewport of this.trackView.viewports) {
                            this.addPairedChordsForViewport(viewport)
                        }
                    }
                })
            }
            if (this.alignmentTrack.hasSupplemental) {
                menuItems.push({
                    label: 'Add split reads to circular view',
                    click: function splitReadsHandler() {
                        for (let viewport of this.trackView.viewports) {
                            this.addSplitChordsForViewport(viewport)
                        }
                    }
                })
            }
        }


        // Display mode
        menuItems.push('<hr/>')
        const $dml = $('<div class="igv-track-menu-category">')
        $dml.text('Display mode:')
        menuItems.push({name: undefined, object: $dml, click: undefined, init: undefined})

        menuItems.push({
            object: $(createCheckbox("expand", this.alignmentTrack.displayMode === "EXPANDED")),
            click: function expandHandler() {
                this.alignmentTrack.displayMode = "EXPANDED"
                this.config.displayMode = "EXPANDED"
                this.trackView.checkContentHeight()
                this.trackView.repaintViews()
            }
        })

        menuItems.push({
            object: $(createCheckbox("squish", this.alignmentTrack.displayMode === "SQUISHED")),
            click: function squishHandler() {
                this.alignmentTrack.displayMode = "SQUISHED"
                this.config.displayMode = "SQUISHED"
                this.trackView.checkContentHeight()
                this.trackView.repaintViews()
            }
        })

        return menuItems
    }

    /**
     * Create a "color by" checkbox menu item, optionally initially checked
     * @param menuItem
     * @param showCheck
     * @returns {{init: undefined, name: undefined, click: clickHandler, object: (jQuery|HTMLElement|jQuery.fn.init)}}
     */
    colorByCB(menuItem, showCheck) {

        const $e = $(createCheckbox(menuItem.label, showCheck))

        if (menuItem.key !== 'tag') {

            function clickHandler() {
                if (menuItem.key === 'none') {
                    this.alignmentTrack.colorBy = undefined
                } else {
                    this.alignmentTrack.colorBy = menuItem.key
                }
                this.trackView.repaintViews()
            }

            return {name: undefined, object: $e, click: clickHandler, init: undefined}
        } else {

            function dialogPresentationHandler(ev) {

                this.browser.inputDialog.present({
                    label: 'Tag Name',
                    value: this.alignmentTrack.colorByTag ? this.alignmentTrack.colorByTag : '',
                    callback: (tag) => {
                        if (tag) {
                            this.alignmentTrack.colorBy = 'tag:' + tag
                            if (!this.alignmentTrack.tagColors) {
                                this.alignmentTrack.tagColors = new PaletteColorTable("Set1")
                            }
                        } else {
                            this.alignmentTrack.colorBy = undefined
                        }
                        this.trackView.repaintViews()
                    }
                }, ev)
            }

            return {name: undefined, object: $e, dialog: dialogPresentationHandler, init: undefined}

        }
    }

    get groupBy() {
        return this.alignmentTrack.groupBy
    }

    /**
     * Create a "group by" checkbox menu item, optionally initially checked
     * TODO -- combine with colorByCB
     * @param menuItem
     * @param showCheck
     * @returns {{init: undefined, name: undefined, click: clickHandler, object: (jQuery|HTMLElement|jQuery.fn.init)}}
     */
    groupByCB(menuItem, showCheck) {

        const $e = $(createCheckbox(menuItem.label, showCheck))

        if (menuItem.key !== 'tag') {

            function clickHandler() {
                if (menuItem.key === 'none') {
                    this.alignmentTrack.groupBy = undefined
                } else {
                    this.alignmentTrack.groupBy = menuItem.key
                }

                const alignmentContainers = this.getCachedAlignmentContainers()
                for (let ac of alignmentContainers) {
                    ac.pack(this)
                }
                this.trackView.checkContentHeight()
                this.trackView.repaintViews()
            }

            return {name: undefined, object: $e, click: clickHandler, init: undefined}
        } else {

            function dialogPresentationHandler(ev) {

                let currentTag = ''
                if (this.alignmentTrack.groupBy && this.alignmentTrack.groupBy.startsWith('tag:')) {
                    currentTag = this.alignmentTrack.groupBy.substring(4)
                }

                this.browser.inputDialog.present({
                    label: 'Tag Name',
                    value: currentTag,
                    callback: (tag) => {
                        if (tag) {
                            this.alignmentTrack.groupBy = 'tag:' + tag
                        } else {
                            this.alignmentTrack.groupBy = 'none'
                        }
                        const alignmentContainers = this.getCachedAlignmentContainers()
                        for (let ac of alignmentContainers) {
                            ac.pack(this)
                        }
                        this.trackView.checkContentHeight()
                        this.trackView.repaintViews()
                    }
                }, ev)
            }

            return {name: undefined, object: $e, dialog: dialogPresentationHandler, init: undefined}

        }
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
