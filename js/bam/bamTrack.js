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
import PairedAlignment from "./pairedAlignment.js"
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import paintAxis from "../util/paintAxis.js"
import {createCheckbox} from "../igv-icons.js"
import {PaletteColorTable} from "../util/colorPalletes.js"
import {IGVColor, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import {makePairedAlignmentChords, makeSupplementalAlignmentChords, sendChords} from "../jbrowse/circularViewUtils.js"
import {isSecureContext} from "../util/igvUtils.js"
import PairedEndStats from "./pairedEndStats.js"
import {createBlatTrack, maxSequenceSize} from "../blat/blatTrack.js"
import {reverseComplementSequence} from "../util/sequenceUtils.js"
import {drawModifications} from "./mods/baseModificationCoverageRenderer.js"
import BaseModificationRenderer from "./mods/baseModificationRenderer.js"
import orientationTypes from "./orientationTypes.js"

const alignmentStartGap = 5
const downsampleRowHeight = 5
const DEFAULT_ALIGNMENT_COLOR = "rgb(185, 185, 185)"
const DEFAULT_COVERAGE_COLOR = "rgb(150, 150, 150)"
const DEFAULT_CONNECTOR_COLOR = "rgb(200, 200, 200)"
const DEFAULT_HIGHLIGHT_COLOR = "#00ff00"
const MINIMUM_BLAT_LENGTH = 20
const bisulfiteColorFw1 = "rgb(195, 195, 195)"
const bisulfiteColorRev1 = "rgb(195, 210, 195)"

const pairCompatibleGroupOptions = new Set(["firstOfPairStrand"])

class BAMTrack extends TrackBase {

    static defaults = {
        alleleFreqThreshold: 0.2,
        visibilityWindow: 30000,
        showCoverage: true,
        showAlignments: true,
        viewAsPairs: false,
        showSoftClips: false,
        showAllBases: false,
        showInsertions: true,
        showMismatches: true,
        height: 300,
        coverageTrackHeight: 50,
        colorBy: undefined,
        groupBy: undefined
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

        this.alignmentTrack.setTop(this.coverageTrack, this.showCoverage)

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

    set height(h) {
        this._height = h
        if (this.showAlignments) {
            this.alignmentTrack.height = this.showCoverage ? h - this.coverageTrackHeight : h
        }
    }

    get height() {
        return this._height
    }

    get minTemplateLength() {
        const configMinTLEN = this.config.minTLEN !== undefined ? this.config.minTLEN : this.config.minFragmentLength
        return (configMinTLEN !== undefined) ? configMinTLEN :
            this._pairedEndStats ? this._pairedEndStats.minTLEN : 0
    }

    get maxTemplateLength() {
        const configMaxTLEN = this.config.maxTLEN !== undefined ? this.config.maxTLEN : this.config.maxFragmentLength
        return (configMaxTLEN !== undefined) ? configMaxTLEN :
            this._pairedEndStats ? this._pairedEndStats.maxTLEN : 1000
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

        const colorByMenuItems = [{key: 'strand', label: 'read strand'}]
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
        groupByMenuItems.push({key: 'strand', label: 'strand'})
        groupByMenuItems.push({key: 'firstOfPairStrand', label: 'first-of-pair strand'})
        groupByMenuItems.push({key: 'mateChr', label: 'chromosome of mate'})
        groupByMenuItems.push({key: 'pairOrientation', label: 'pair orientation'})
        groupByMenuItems.push({key: 'chimeric', label: 'chimeric'})
        groupByMenuItems.push({key: 'supplementary', label: 'supplementary flag'})
        //groupByMenuItems.push({key: 'readOrder', label: 'read order'})
        //groupByMenuItems.push({key: 'phase', label: 'phase'})
        groupByMenuItems.push({key: 'tag', label: 'tag'})

        for (let item of groupByMenuItems) {
            const selected = this.groupBy === undefined && item.key === 'none' || this.groupBy === item.key
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
                    if (b && this.groupBy && !pairCompatibleGroupOptions.has(this.groupBy)) {
                        this.browser.alert.present(`'View as Pairs' is incompatible with 'Group By ${this.groupBy}'`)
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
                if (menuItem.key === this.alignmentTrack.colorBy) {
                    this.alignmentTrack.colorBy = 'none'
                    this.config.colorBy = 'none'
                } else {
                    this.alignmentTrack.colorBy = menuItem.key
                    this.config.colorBy = menuItem.key
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
                            this.alignmentTrack.colorBy = 'tag'
                            this.alignmentTrack.colorByTag = tag
                            if (!this.alignmentTrack.tagColors) {
                                this.alignmentTrack.tagColors = new PaletteColorTable("Set1")
                            }
                        } else {
                            this.alignmentTrack.colorBy = 'none'
                            this.alignmentTrack.colorByTag = ''
                        }
                        this.trackView.repaintViews()
                    }
                }, ev)
            }

            return {name: undefined, object: $e, dialog: dialogPresentationHandler, init: undefined}

        }
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
                    this.groupBy = undefined
                } else {
                    this.groupBy = menuItem.key
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
                if (this.groupBy && this.groupBy.startsWith('tag:')) {
                    currentTag = this.groupBy.substring(4)
                }

                this.browser.inputDialog.present({
                    label: 'Tag Name',
                    value: currentTag,
                    callback: (tag) => {
                        if (tag) {
                            this.groupBy = 'tag:' + tag
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

        if (this.sortObject) {
            config.sort = {
                chr: this.sortObject.chr,
                position: this.sortObject.position + 1,
                option: this.sortObject.option,
                direction: this.sortObject.direction ? "ASC" : "DESC"
            }
        }
        if (this.alignmentTrack.highlightedReads) {
            config.highlightedReads = Array.from(this.alignmentTrack.highlightedReads)
        }

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


class CoverageTrack {

    constructor(config, parent) {
        this.parent = parent
        this.featureSource = parent.featureSource

        this.paintAxis = paintAxis
        this.top = 0

        this.autoscale = config.autoscale || config.max === undefined
        if (!this.autoscale) {
            this.dataRange = {
                min: config.min || 0,
                max: config.max
            }
        }

    }

    get height() {
        return this.parent.coverageTrackHeight
    }

    draw(options) {

        const pixelTop = options.pixelTop
        const pixelBottom = pixelTop + options.pixelHeight
        const nucleotideColors = this.parent.browser.nucleotideColors

        if (pixelTop > this.height) {
            return //scrolled out of view
        }

        const ctx = options.context
        const alignmentContainer = options.features
        const coverageMap = alignmentContainer.coverageMap

        let sequence
        if (coverageMap.refSeq) {
            sequence = coverageMap.refSeq.toUpperCase()
        }

        const bpPerPixel = options.bpPerPixel
        const bpStart = options.bpStart
        const pixelWidth = options.pixelWidth
        const bpEnd = bpStart + pixelWidth * bpPerPixel + 1

        // paint for all coverage buckets
        // If alignment track color is != default, use it
        let color
        if (this.parent.coverageColor) {
            color = this.parent.coverageColor
        } else if (this.parent.color && typeof this.parent.color !== "function") {
            color = IGVColor.darkenLighten(this.parent.color, -35)
        } else {
            color = DEFAULT_COVERAGE_COLOR
        }
        IGVGraphics.setProperties(ctx, {
            fillStyle: color,
            strokeStyle: color
        })

        const w = Math.max(1, Math.ceil(1.0 / bpPerPixel))
        for (let i = 0, len = coverageMap.coverage.length; i < len; i++) {

            const bp = (coverageMap.bpStart + i)
            if (bp < bpStart) continue
            if (bp > bpEnd) break

            const item = coverageMap.coverage[i]
            if (!item) continue

            const h = Math.round((item.total / this.dataRange.max) * this.height)
            const y = this.height - h
            const x = Math.floor((bp - bpStart) / bpPerPixel)


            // IGVGraphics.setProperties(ctx, {fillStyle: "rgba(0, 200, 0, 0.25)", strokeStyle: "rgba(0, 200, 0, 0.25)" });
            IGVGraphics.fillRect(ctx, x, y, w, h)
        }

        // coverage mismatch coloring -- don't try to do this in above loop, color bar will be overwritten when w<1
        if (sequence) {
            for (let i = 0, len = coverageMap.coverage.length; i < len; i++) {

                const bp = (coverageMap.bpStart + i)
                if (bp < bpStart) continue
                if (bp > bpEnd) break

                const item = coverageMap.coverage[i]
                if (!item) continue

                const h = (item.total / this.dataRange.max) * this.height
                let y = this.height - h
                const x = Math.floor((bp - bpStart) / bpPerPixel)

                const refBase = sequence[i]

                if ("basemod2" === this.parent.colorBy || "basemod" === this.parent.colorBy) {
                    //context, pX, pBottom, dX, barHeight, pos, alignmentContainer
                    const threshold = 0.5   // TODD - parameter
                    drawModifications(ctx, x, this.height, w, h, bp, alignmentContainer, this.parent.colorBy, threshold)

                } else if (item.isMismatch(refBase)) {
                    IGVGraphics.setProperties(ctx, {fillStyle: nucleotideColors[refBase]})
                    IGVGraphics.fillRect(ctx, x, y, w, h)

                    let accumulatedHeight = 0.0
                    for (let nucleotide of ["A", "C", "T", "G"]) {

                        const count = item["pos" + nucleotide] + item["neg" + nucleotide]

                        // non-logoritmic
                        const hh = (count / this.dataRange.max) * this.height
                        y = (this.height - hh) - accumulatedHeight
                        accumulatedHeight += hh
                        IGVGraphics.setProperties(ctx, {fillStyle: nucleotideColors[nucleotide]})
                        IGVGraphics.fillRect(ctx, x, y, w, hh)
                    }
                }
            }
        }
    }

    getClickedObject(clickState) {

        let features = clickState.viewport.cachedFeatures
        if (!features || features.length === 0) return

        const genomicLocation = Math.floor(clickState.genomicLocation)
        const coverageMap = features.coverageMap
        const coverageMapIndex = Math.floor(genomicLocation - coverageMap.bpStart)
        return coverageMap.coverage[coverageMapIndex]
    }

    popupData(clickState) {

        const nameValues = []

        const coverage = this.getClickedObject(clickState)
        if (coverage) {
            const genomicLocation = Math.floor(clickState.genomicLocation)
            const referenceFrame = clickState.viewport.referenceFrame

            nameValues.push(referenceFrame.chr + ":" + StringUtils.numberFormatter(1 + genomicLocation))

            nameValues.push({name: 'Total Count', value: coverage.total})

            // A
            let tmp = coverage.posA + coverage.negA
            if (tmp > 0) tmp = tmp.toString() + " (" + Math.round((tmp / coverage.total) * 100.0) + "%, " + coverage.posA + "+, " + coverage.negA + "- )"
            nameValues.push({name: 'A', value: tmp})

            // C
            tmp = coverage.posC + coverage.negC
            if (tmp > 0) tmp = tmp.toString() + " (" + Math.round((tmp / coverage.total) * 100.0) + "%, " + coverage.posC + "+, " + coverage.negC + "- )"
            nameValues.push({name: 'C', value: tmp})

            // G
            tmp = coverage.posG + coverage.negG
            if (tmp > 0) tmp = tmp.toString() + " (" + Math.round((tmp / coverage.total) * 100.0) + "%, " + coverage.posG + "+, " + coverage.negG + "- )"
            nameValues.push({name: 'G', value: tmp})

            // T
            tmp = coverage.posT + coverage.negT
            if (tmp > 0) tmp = tmp.toString() + " (" + Math.round((tmp / coverage.total) * 100.0) + "%, " + coverage.posT + "+, " + coverage.negT + "- )"
            nameValues.push({name: 'T', value: tmp})

            // N
            tmp = coverage.posN + coverage.negN
            if (tmp > 0) tmp = tmp.toString() + " (" + Math.round((tmp / coverage.total) * 100.0) + "%, " + coverage.posN + "+, " + coverage.negN + "- )"
            nameValues.push({name: 'N', value: tmp})

            nameValues.push('<HR/>')
            nameValues.push({name: 'DEL', value: coverage.del.toString()})
            nameValues.push({name: 'INS', value: coverage.ins.toString()})
        }

        return nameValues

    }

}

class AlignmentTrack {

    constructor(config, parent) {

        this.parent = parent
        this.browser = parent.browser
        this.featureSource = parent.featureSource
        this.top = 0 === config.coverageTrackHeight ? 0 : config.coverageTrackHeight + 5
        this.displayMode = config.displayMode || "EXPANDED"
        this.alignmentRowHeight = config.alignmentRowHeight || 14
        this.squishedRowHeight = config.squishedRowHeight || 3

        this.negStrandColor = config.negStrandColor || "rgba(150, 150, 230, 0.75)"
        this.posStrandColor = config.posStrandColor || "rgba(230, 150, 150, 0.75)"
        this.insertionColor = config.insertionColor || "rgb(138, 94, 161)"
        this.insertionTextColor = config.insertionTextColor || "white"
        this.showInsertionText = config.showInsertionText === undefined ? false : !!config.showInsertionText
        this.deletionColor = config.deletionColor || "black"
        this.deletionTextColor = config.deletionTextColor || "black"
        this.showDeletionText = config.showDeletionText === undefined ? false : !!config.showDeletionText
        this.skippedColor = config.skippedColor || "rgb(150, 170, 170)"
        this.pairConnectorColor = config.pairConnectorColor

        this.smallTLENColor = config.smallTLENColor || config.smallFragmentLengthColor || "rgb(0, 0, 150)"
        this.largeTLENColor = config.largeTLENColor || config.largeFragmentLengthColor || "rgb(200, 0, 0)"

        this.pairOrientation = config.pairOrienation || 'fr'
        this.pairColors = {}
        this.pairColors["RL"] = config.rlColor || "rgb(0, 150, 0)"
        this.pairColors["RR"] = config.rrColor || "rgb(20, 50, 200)"
        this.pairColors["LL"] = config.llColor || "rgb(0, 150, 150)"

        this.colorBy = config.colorBy || "unexpectedPair"
        this.colorByTag = config.colorByTag ? config.colorByTag.toUpperCase() : undefined
        this.bamColorTag = config.bamColorTag === undefined ? "YC" : config.bamColorTag

        this.hideSmallIndels = config.hideSmallIndels
        this.indelSizeThreshold = config.indelSizeThreshold || 1

        if (config.highlightedReads) {
            this.setHighlightedReads(config.highlightedReads)
        }
        if (config.highlightColor) {
            this.highlightColor = config.highlightColor
        }

        this.hasPairs = false   // Until proven otherwise
        this.hasSupplemental = false

    }

    /**
     * Lazy initialize a base modification renderer
     *
     * @returns {BaseModificationRenderer}
     */
    get baseModRenderer() {
        if (!this._baseModRenderer) {
            this._baseModRenderer = new BaseModificationRenderer(this)
        }
        return this._baseModRenderer
    }

    setTop(coverageTrack, showCoverage) {
        this.top = (0 === coverageTrack.height || false === showCoverage) ? 0 : (5 + coverageTrack.height)
    }

    setHighlightedReads(highlightedReads) {
        if (!Array.isArray(highlightedReads) || !highlightedReads.every(i => typeof i === "string")) {
            throw new Error("AlignmentTrack.setHighlightedReads() only accept array of strings")
        }
        this.highlightedReads = new Set(highlightedReads)
    }

    /**
     * Compute the pixel height required to display all content.
     *
     * @param alignmentContainer
     * @returns {number|*}
     */
    computePixelHeight(alignmentContainer) {

        if (alignmentContainer.packedGroups) {
            let h = alignmentContainer.hasDownsampledIntervals() ? downsampleRowHeight + alignmentStartGap : 0
            const alignmentRowHeight = this.displayMode === "SQUISHED" ?
                this.squishedRowHeight :
                this.alignmentRowHeight
            for (let group of alignmentContainer.packedGroups.values()) {
                h += (alignmentRowHeight * group.length) + 10
            }
            return h + 5
        } else {
            return 0
        }
    }

    draw(options) {

        const alignmentContainer = options.features
        const ctx = options.context
        const bpPerPixel = options.bpPerPixel
        const bpStart = options.bpStart
        const pixelWidth = options.pixelWidth
        const bpEnd = bpStart + pixelWidth * bpPerPixel + 1
        const showSoftClips = this.parent.showSoftClips
        const showAllBases = this.parent.showAllBases
        const nucleotideColors = this.browser.nucleotideColors

        ctx.save()

        let referenceSequence = alignmentContainer.sequence
        if (referenceSequence) {
            referenceSequence = referenceSequence.toUpperCase()
        }
        let alignmentRowYInset = 0

        let pixelTop = options.pixelTop
        if (this.top) {
            ctx.translate(0, this.top)
        }
        const pixelBottom = pixelTop + options.pixelHeight

        if (alignmentContainer.hasDownsampledIntervals()) {
            alignmentRowYInset = downsampleRowHeight + alignmentStartGap

            alignmentContainer.downsampledIntervals.forEach(function (interval) {
                var xBlockStart = (interval.start - bpStart) / bpPerPixel,
                    xBlockEnd = (interval.end - bpStart) / bpPerPixel

                if (xBlockEnd - xBlockStart > 5) {
                    xBlockStart += 1
                    xBlockEnd -= 1
                }
                IGVGraphics.fillRect(ctx, xBlockStart, 2, (xBlockEnd - xBlockStart), downsampleRowHeight - 2, {fillStyle: "black"})
            })

        } else {
            alignmentRowYInset = 0
        }

        // Transient variable -- rewritten on every draw, used for click object selection
        this.alignmentsYOffset = alignmentRowYInset
        const alignmentRowHeight = this.displayMode === "SQUISHED" ?
            this.squishedRowHeight :
            this.alignmentRowHeight

        const packedAlignmentGroups = alignmentContainer.packedGroups

        if (packedAlignmentGroups) {

            let alignmentY = alignmentRowYInset
            for (let groupName of packedAlignmentGroups.keys()) {

                const group = packedAlignmentGroups.get(groupName)
                const packedAlignmentRows = group.rows
                const nRows = packedAlignmentRows.length
                group.pixelTop = alignmentY

                for (let rowIndex = 0; rowIndex < nRows; rowIndex++) {

                    const alignmentRow = packedAlignmentRows[rowIndex]
                    const alignmentHeight = alignmentRowHeight <= 4 ? alignmentRowHeight : alignmentRowHeight - 2

                    if (alignmentY > pixelBottom) {
                        break
                    } else if (alignmentY + alignmentHeight < pixelTop) {
                        alignmentY += alignmentRowHeight
                        continue
                    }

                    for (let alignment of alignmentRow.alignments) {

                        this.hasPairs = this.hasPairs || alignment.isPaired()
                        if (this.browser.circularView) {
                            // This is an expensive check, only do it if needed
                            this.hasSupplemental = this.hasSupplemental || alignment.hasTag('SA')
                        }

                        if ((alignment.start + alignment.lengthOnRef) < bpStart) continue
                        if (alignment.start > bpEnd) break
                        if (true === alignment.hidden) {
                            continue
                        }

                        if (alignment instanceof PairedAlignment) {

                            drawPairConnector.call(this, alignment, alignmentY, alignmentHeight)

                            drawSingleAlignment.call(this, alignment.firstAlignment, alignmentY, alignmentHeight)

                            if (alignment.secondAlignment) {
                                drawSingleAlignment.call(this, alignment.secondAlignment, alignmentY, alignmentHeight)
                            }

                        } else {
                            drawSingleAlignment.call(this, alignment, alignmentY, alignmentHeight)
                        }
                    }
                    alignmentY += alignmentRowHeight
                }

                group.pixelBottom = alignmentY

                if (this.parent.groupBy) {

                    ctx.save()
                    ctx.font = '400 12px sans-serif'
                    const textMetrics = ctx.measureText(groupName)
                    const w = Math.max(textMetrics.width, 20)
                    const x = -options.pixelXOffset + options.viewportWidth - w - 10
                    const h = 12
                    const baselineY = group.pixelTop + h - 1

                    ctx.textAlign = "center"
                    ctx.fillStyle = 'white'
                    ctx.strokeStyle = 'black'
                    ctx.beginPath()
                    ctx.roundRect(x, baselineY - h + 2, w, h, 2)
                    ctx.fill()
                    ctx.stroke()

                    ctx.fillStyle = 'black'
                    ctx.fillText(groupName, x + w / 2, baselineY)

                    IGVGraphics.dashedLine(ctx, 0, alignmentY, pixelWidth, alignmentY)

                    ctx.restore()

                    alignmentY += 10  // Group separator
                }
            }
        }
        ctx.restore()

        // alignment is a PairedAlignment
        function drawPairConnector(alignment, yRect, alignmentHeight) {

            var connectorColor = this.getConnectorColor(alignment.firstAlignment),
                xBlockStart = (alignment.connectingStart - bpStart) / bpPerPixel,
                xBlockEnd = (alignment.connectingEnd - bpStart) / bpPerPixel,
                yStrokedLine = yRect + alignmentHeight / 2

            if ((alignment.connectingEnd) < bpStart || alignment.connectingStart > bpEnd) {
                return
            }
            if (alignment.mq <= 0) {
                connectorColor = IGVColor.addAlpha(connectorColor, 0.15)
            }
            IGVGraphics.setProperties(ctx, {fillStyle: connectorColor, strokeStyle: connectorColor})
            IGVGraphics.strokeLine(ctx, xBlockStart, yStrokedLine, xBlockEnd, yStrokedLine)

        }

        function drawSingleAlignment(alignment, y, alignmentHeight) {


            if ((alignment.start + alignment.lengthOnRef) < bpStart || alignment.start > bpEnd) {
                return
            }

            const blocks = showSoftClips ? alignment.blocks : alignment.blocks.filter(b => 'S' !== b.type)

            let alignmentColor = this.getAlignmentColor(alignment)
            const outlineColor = alignmentColor
            if (alignment.mq <= 0) {
                alignmentColor = IGVColor.addAlpha(alignmentColor, 0.15)
            }
            IGVGraphics.setProperties(ctx, {fillStyle: alignmentColor, strokeStyle: outlineColor})

            // Save bases to draw into an array for later drawing, so they can be overlaid on insertion blocks,
            // which is relevant if we have insertions with size label
            const basesToDraw = []

            for (let b = 0; b < blocks.length; b++) {   // Can't use forEach here -- we need ability to break

                const block = blocks[b]

                // Somewhat complex test, neccessary to insure gaps are drawn.
                // If this is not the last block, and the next block starts before the orign (off screen to left) then skip.
                if ((b !== blocks.length - 1) && blocks[b + 1].start < bpStart) continue

                // drawBlock returns bases to draw, which are drawn on top of insertion blocks (if they're wider than
                // the space between two bases) like in Java IGV
                basesToDraw.push(...drawBlock.call(this, block, b))

                if ((block.start + block.len) > bpEnd) {
                    // Do this after drawBlock to insure gaps are drawn
                    break
                }
            }

            if (alignment.gaps) {
                const yStrokedLine = y + alignmentHeight / 2
                for (let gap of alignment.gaps) {
                    const sPixel = (gap.start - bpStart) / bpPerPixel
                    const ePixel = ((gap.start + gap.len) - bpStart) / bpPerPixel
                    const lineWidth = ePixel - sPixel
                    const gapLenText = gap.len.toString()
                    const gapTextWidth = gapLenText.length * 6
                    const gapCenter = sPixel + (lineWidth / 2)

                    const color = ("D" === gap.type) ? this.deletionColor : this.skippedColor

                    IGVGraphics.strokeLine(ctx, sPixel, yStrokedLine, ePixel, yStrokedLine, {
                        strokeStyle: color,
                        lineWidth: 2,
                    })

                    // Add gap width as text like Java IGV if it fits nicely and is a multi-base gap
                    if (this.showDeletionText && gap.len > 1 && lineWidth >= gapTextWidth + 8) {
                        const textStart = gapCenter - (gapTextWidth / 2)
                        IGVGraphics.fillRect(ctx, textStart - 1, y - 1, gapTextWidth + 2, 12, {fillStyle: "white"})
                        IGVGraphics.fillText(ctx, gapLenText, textStart, y + 10, {
                            'font': 'normal 10px monospace',
                            'fillStyle': this.deletionTextColor,
                        })
                    }
                }
            }

            if (alignment.insertions && this.parent.showInsertions) {
                let lastXBlockStart = -1
                for (let insertionBlock of alignment.insertions) {
                    if (this.hideSmallIndels && insertionBlock.len <= this.indelSizeThreshold) {
                        continue
                    }
                    if (insertionBlock.start < bpStart) {
                        continue
                    }
                    if (insertionBlock.start > bpEnd) {
                        break
                    }

                    const refOffset = insertionBlock.start - bpStart
                    const insertLenText = insertionBlock.len.toString()

                    const textPixelWidth = 2 + (insertLenText.length * 6)
                    const basePixelWidth = (!this.showInsertionText || insertionBlock.len === 1)
                        ? 2
                        : Math.round(insertionBlock.len / bpPerPixel)
                    const widthBlock = Math.max(Math.min(textPixelWidth, basePixelWidth), 2)

                    const xBlockStart = (refOffset / bpPerPixel) - (widthBlock / 2)
                    if ((xBlockStart - lastXBlockStart) > 2) {
                        const props = {fillStyle: this.insertionColor}

                        // Draw decorations like Java IGV to make an 'I' shape
                        IGVGraphics.fillRect(ctx, xBlockStart - 2, y, widthBlock + 4, 2, props)
                        IGVGraphics.fillRect(ctx, xBlockStart, y + 2, widthBlock, alignmentHeight - 4, props)
                        IGVGraphics.fillRect(ctx, xBlockStart - 2, y + alignmentHeight - 2, widthBlock + 4, 2, props)

                        // Show # of inserted bases as text if it's a multi-base insertion and the insertion block
                        // is wide enough to hold text (its size is capped at the text label size, but can be smaller
                        // if the browser is zoomed out and the insertion is small)
                        if (this.showInsertionText && insertionBlock.len > 1 && basePixelWidth > textPixelWidth) {
                            IGVGraphics.fillText(ctx, insertLenText, xBlockStart + 1, y + 10, {
                                'font': 'normal 10px monospace',
                                'fillStyle': this.insertionTextColor,
                            })
                        }
                        lastXBlockStart = xBlockStart
                    }
                }
            }

            for (let {bbox, baseColor, readChar} of basesToDraw) {
                const threshold = 1.0 / 10.0
                if (bpPerPixel <= threshold && bbox.height >= 8) {
                    // render letter
                    const fontHeight = Math.min(10, bbox.height)
                    ctx.font = '' + fontHeight + 'px sans-serif'
                    const center = bbox.x + (bbox.width / 2.0)
                    IGVGraphics.strokeText(ctx, readChar, center - (ctx.measureText(readChar).width / 2), fontHeight - 1 + bbox.y, {strokeStyle: baseColor})
                } else {

                    // render colored block
                    IGVGraphics.fillRect(ctx, bbox.x, bbox.y, bbox.width, bbox.height, {fillStyle: baseColor})
                }
            }

            if ("basemod2" === this.colorBy || "basemod" === this.parent.colorBy) {
                const context = (
                    {
                        ctx,
                        bpPerPixel,
                        bpStart,
                        bpEnd,
                        pixelEnd: pixelWidth
                    })
                this.baseModRenderer.drawModifications(alignment, y, alignmentHeight, context, this.parent.colorBy)
            }


            function drawBlock(block, b) {
                // Collect bases to draw for later rendering
                const blockBasesToDraw = []

                const offsetBP = block.start - alignmentContainer.start
                const blockStartPixel = (block.start - bpStart) / bpPerPixel
                const blockEndPixel = ((block.start + block.len) - bpStart) / bpPerPixel
                const blockWidthPixel = Math.max(1, blockEndPixel - blockStartPixel)

                //const arrowHeadWidthPixel = alignmentRowHeight / 2.0;
                const nomPixelWidthOnRef = 100 / bpPerPixel
                const arrowHeadWidthPixel = Math.min(alignmentRowHeight / 2.0, nomPixelWidthOnRef / 6)

                const isSoftClip = 'S' === block.type

                const strokeOutline =
                    alignment.mq <= 0 ||
                    this.selectedReadName === alignment.readName ||
                    isSoftClip ||
                    this.highlightedReads && this.highlightedReads.has(alignment.readName)

                let blockOutlineColor = outlineColor
                if (this.selectedReadName === alignment.readName) {
                    blockOutlineColor = 'red'
                } else if (isSoftClip) {
                    blockOutlineColor = 'rgb(50,50,50)'
                } else if (this.highlightedReads && this.highlightedReads.has(alignment.readName)) {
                    blockOutlineColor = this.highlightColor || DEFAULT_HIGHLIGHT_COLOR
                }

                const lastBlockPositiveStrand = (true === alignment.strand && b === blocks.length - 1)
                const lastBlockReverseStrand = (false === alignment.strand && b === 0)
                const lastBlock = lastBlockPositiveStrand | lastBlockReverseStrand

                if (lastBlock) {
                    let xListPixel
                    let yListPixel
                    if (lastBlockPositiveStrand) {
                        xListPixel = [
                            blockStartPixel,
                            blockEndPixel,
                            blockEndPixel + arrowHeadWidthPixel,
                            blockEndPixel,
                            blockStartPixel,
                            blockStartPixel]
                        yListPixel = [
                            y,
                            y,
                            y + (alignmentHeight / 2.0),
                            y + alignmentHeight,
                            y + alignmentHeight,
                            y]

                    }

                    // Last block on - strand ?
                    else if (lastBlockReverseStrand) {
                        xListPixel = [
                            blockEndPixel,
                            blockStartPixel,
                            blockStartPixel - arrowHeadWidthPixel,
                            blockStartPixel,
                            blockEndPixel,
                            blockEndPixel]
                        yListPixel = [
                            y,
                            y,
                            y + (alignmentHeight / 2.0),
                            y + alignmentHeight,
                            y + alignmentHeight,
                            y]

                    }
                    IGVGraphics.fillPolygon(ctx, xListPixel, yListPixel, {fillStyle: alignmentColor})

                    if (strokeOutline) {
                        IGVGraphics.strokePolygon(ctx, xListPixel, yListPixel, {strokeStyle: blockOutlineColor})
                    }
                }

                // Internal block
                else {
                    IGVGraphics.fillRect(ctx, blockStartPixel, y, blockWidthPixel, alignmentHeight, {fillStyle: alignmentColor})

                    if (strokeOutline) {
                        ctx.save()
                        ctx.strokeStyle = blockOutlineColor
                        ctx.strokeRect(blockStartPixel, y, blockWidthPixel, alignmentHeight)
                        ctx.restore()
                    }
                }


                // Read base coloring

                if (isSoftClip ||
                    showAllBases ||
                    this.parent.showMismatches && (referenceSequence && alignment.seq && alignment.seq !== "*")) {

                    const seq = alignment.seq ? alignment.seq.toUpperCase() : undefined
                    const qual = alignment.qual
                    const seqOffset = block.seqOffset
                    const widthPixel = Math.max(1, 1 / bpPerPixel)


                    for (let i = 0, len = block.len; i < len; i++) {

                        const xPixel = ((block.start + i) - bpStart) / bpPerPixel

                        if (xPixel + widthPixel < 0) continue   // Off left edge
                        if (xPixel > pixelWidth) break  // Off right edge

                        let readChar = seq ? seq.charAt(seqOffset + i) : ''
                        const refChar = offsetBP + i >= 0 ? referenceSequence.charAt(offsetBP + i) : ''

                        if (readChar === "=") {
                            readChar = refChar
                        }
                        if (readChar === "X" || refChar !== readChar || isSoftClip || showAllBases) {

                            let baseColor = nucleotideColors[readChar] || "rgb(0,0,0)"
                            if (!isSoftClip && qual !== undefined && qual.length > seqOffset + i) {
                                const readQual = qual[seqOffset + i]
                                baseColor = shadedBaseColor(readQual, baseColor)
                            }

                            blockBasesToDraw.push({
                                bbox: {
                                    x: xPixel,
                                    y: y,
                                    width: widthPixel,
                                    height: alignmentHeight
                                },
                                baseColor,
                                readChar,
                            })
                        }

                    }
                }

                return blockBasesToDraw
            }

            function renderBlockOrReadChar(context, bpp, bbox, color, char) {
                var threshold,
                    center

                threshold = 1.0 / 10.0
                if (bpp <= threshold && bbox.height >= 8) {

                    // render letter
                    const fontHeight = Math.min(10, bbox.height)
                    context.font = '' + fontHeight + 'px sans-serif'
                    center = bbox.x + (bbox.width / 2.0)
                    IGVGraphics.strokeText(context, char, center - (context.measureText(char).width / 2), fontHeight - 1 + bbox.y, {strokeStyle: color})
                } else {

                    // render colored block
                    IGVGraphics.fillRect(context, bbox.x, bbox.y, bbox.width, bbox.height, {fillStyle: color})
                }
            }
        }

    };

    popupData(clickState) {
        const clickedObject = this.getClickedObject(clickState)
        return clickedObject ? clickedObject.popupData(clickState.genomicLocation) : undefined
    };

    contextMenuItemList(clickState) {

        const viewport = clickState.viewport
        const list = []

        const sortByOption = (option) => {
            const cs = this.parent.sortObject
            const direction = (cs && cs.position === Math.floor(clickState.genomicLocation)) ? !cs.direction : true
            const newSortObject = {
                chr: viewport.referenceFrame.chr,
                position: Math.floor(clickState.genomicLocation),
                option: option,
                direction: direction,
                sortAsPairs: viewport.trackView.track.viewAsPairs
            }
            this.parent.sortObject = newSortObject
            viewport.cachedFeatures.sortRows(newSortObject)
            viewport.repaint()
        }
        list.push('<b>Sort by...</b>')
        list.push({label: '&nbsp; base', click: () => sortByOption("BASE")})
        list.push({label: '&nbsp; read strand', click: () => sortByOption("strand")})
        list.push({label: '&nbsp; start location', click: () => sortByOption("START")})
        list.push({label: '&nbsp; insert size', click: () => sortByOption("INSERT_SIZE")})
        list.push({label: '&nbsp; gap size', click: () => sortByOption("GAP_SIZE")})
        list.push({label: '&nbsp; chromosome of mate', click: () => sortByOption("MATE_CHR")})
        list.push({label: '&nbsp; mapping quality', click: () => sortByOption("MQ")})
        list.push({label: '&nbsp; read name', click: () => sortByOption("READ_NAME")})
        list.push({label: '&nbsp; aligned read length', click: () => sortByOption("ALIGNED_READ_LENGTH")})
        list.push({
            label: '&nbsp; tag', click: () => {
                const cs = this.parent.sortObject
                const direction = (cs && cs.position === Math.floor(clickState.genomicLocation)) ? !cs.direction : true
                const config =
                    {
                        label: 'Tag Name',
                        value: this.sortByTag ? this.sortByTag : '',
                        callback: (tag) => {
                            if (tag) {
                                const newSortObject = {
                                    chr: viewport.referenceFrame.chr,
                                    position: Math.floor(clickState.genomicLocation),
                                    option: "TAG",
                                    tag: tag,
                                    direction: direction
                                }
                                this.sortByTag = tag
                                this.parent.sortObject = newSortObject
                                viewport.cachedFeatures.sortRows(newSortObject)
                                viewport.repaint()
                            }
                        }
                    }
                this.browser.inputDialog.present(config, clickState.event)
            }
        })
        list.push('<hr/>')

        const clickedObject = this.getClickedObject(clickState)

        if (clickedObject) {

            const showSoftClips = this.parent.showSoftClips
            const clickedAlignment = (typeof clickedObject.alignmentContaining === 'function') ?
                clickedObject.alignmentContaining(clickState.genomicLocation, showSoftClips) :
                clickedObject
            if (clickedAlignment) {
                if (clickedAlignment.isPaired() && clickedAlignment.isMateMapped()) {
                    list.push({
                        label: 'View mate in split screen',
                        click: () => {
                            if (clickedAlignment.mate) {
                                const referenceFrame = clickState.viewport.referenceFrame
                                const chromosomeObject = this.browser.genome.getChromosome(clickedAlignment.mate.chr)
                                if (chromosomeObject) {
                                    this.selectedReadName = clickedAlignment.readName
                                    //this.browser.presentMultiLocusPanel(clickedAlignment, referenceFrame)
                                    const bpWidth = referenceFrame.end - referenceFrame.start
                                    const frameStart = clickedAlignment.mate.position - bpWidth / 2
                                    const frameEnd = clickedAlignment.mate.position + bpWidth / 2
                                    this.browser.addMultiLocusPanel(chromosomeObject.name, frameStart, frameEnd, referenceFrame)
                                } else {
                                    this.browser.alert.present(`Reference does not contain chromosome: ${clickedAlignment.mate.chr}`)
                                }
                            }
                        },
                        init: undefined
                    })
                }

                list.push({
                    label: 'View read sequence',
                    click: () => {
                        const seqstring = clickedAlignment.seq //.map(b => String.fromCharCode(b)).join("");
                        if (!seqstring || "*" === seqstring) {
                            this.browser.alert.present("Read sequence: *")
                        } else {
                            this.browser.alert.present(seqstring)
                        }
                    }
                })

                if (isSecureContext()) {
                    list.push({
                        label: 'Copy read sequence',
                        click: async () => {
                            const seq = clickedAlignment.seq //.map(b => String.fromCharCode(b)).join("");
                            try {
                                await navigator.clipboard.writeText(seq)
                            } catch (e) {
                                console.error(e)
                                this.browser.alert.present(`error copying sequence to clipboard ${e}`)
                            }

                        }
                    })
                }

                // TODO if genome supports blat
                const seqstring = clickedAlignment.seq
                if (seqstring && "*" != seqstring) {

                    if (seqstring.length < maxSequenceSize) {
                        list.push({
                            label: 'BLAT read sequence',
                            click: () => {
                                const sequence = clickedAlignment.isNegativeStrand() ? reverseComplementSequence(seqstring) : seqstring
                                const name = `${clickedAlignment.readName} - blat`
                                const title = `${this.parent.name} - ${name}`
                                createBlatTrack({sequence, browser: this.browser, name, title})
                            }
                        })
                    }

                    const softClips = clickedAlignment.softClippedBlocks()
                    if (softClips.left && softClips.left.len > MINIMUM_BLAT_LENGTH && softClips.left.len < maxSequenceSize) {
                        list.push({
                            label: 'BLAT left soft-clipped sequence',
                            click: () => {
                                const clippedSequence = seqstring.substr(softClips.left.seqOffset, softClips.left.len)
                                const sequence = clickedAlignment.isNegativeStrand() ? reverseComplementSequence(clippedSequence) : clippedSequence
                                const name = `${clickedAlignment.readName} - blat left clip`
                                const title = `${this.parent.name} - ${name}`
                                createBlatTrack({sequence, browser: this.browser, name, title})
                            }
                        })
                    }
                    if (softClips.right && softClips.right.len > MINIMUM_BLAT_LENGTH && softClips.right.len < maxSequenceSize) {
                        list.push({
                            label: 'BLAT right soft-clipped sequence',
                            click: () => {
                                const clippedSequence = seqstring.substr(softClips.right.seqOffset, softClips.right.len)
                                const sequence = clickedAlignment.isNegativeStrand() ? reverseComplementSequence(clippedSequence) : clippedSequence
                                const name = `${clickedAlignment.readName} - blat right clip`
                                const title = `${this.parent.name} - ${name}`
                                createBlatTrack({sequence, browser: this.browser, name, title})
                            }
                        })
                    }
                }

                list.push('<hr/>')
            }
        }

        // Experimental JBrowse feature
        if (this.browser.circularView && (this.hasPairs || this.hasSupplemental)) {
            if (this.hasPairs) {
                list.push({
                    label: 'Add discordant pairs to circular view',
                    click: () => {
                        this.parent.addPairedChordsForViewport(viewport)
                    }
                })
            }
            if (this.hasSupplemental) {
                list.push({
                    label: 'Add split reads to circular view',
                    click: () => {
                        this.parent.addSplitChordsForViewport(viewport)
                    }
                })
            }
            list.push('<hr/>')
        }

        return list

    }

    getClickedObject(clickState) {

        const viewport = clickState.viewport
        let features = viewport.cachedFeatures
        if (!features) return

        const y = clickState.y
        const offsetY = y - this.top
        const genomicLocation = clickState.genomicLocation
        const showSoftClips = this.parent.showSoftClips

        let minGroupY = Number.MAX_VALUE
        for (let group of features.packedGroups.values()) {
            minGroupY = Math.min(minGroupY, group.pixelTop)
            if (offsetY > group.pixelTop && offsetY <= group.pixelBottom) {

                const alignmentRowHeight = this.displayMode === "SQUISHED" ?
                    this.squishedRowHeight :
                    this.alignmentRowHeight

                let packedAlignmentsIndex = Math.floor((offsetY - group.pixelTop) / alignmentRowHeight)

                if (packedAlignmentsIndex >= 0 && packedAlignmentsIndex < group.length) {
                    const alignmentRow = group.rows[packedAlignmentsIndex]
                    const clicked = alignmentRow.alignments.filter(alignment => alignment.containsLocation(genomicLocation, showSoftClips))
                    if (clicked.length > 0) return clicked[0]
                }
            }
        }

        // If we get here check downsampled intervals
        if (offsetY < minGroupY && features.downsampledIntervals) {
            for (const interval of features.downsampledIntervals) {
                if (interval.start <= genomicLocation && interval.end >= genomicLocation) {
                    return interval
                }
            }
        }


    }

    /**
     * Return the color for connectors in paired alignment view.   If explicitly set return that, otherwise return
     * the alignment color, unless the color option can result in split colors (separte color for each mate).
     *
     * @param alignment
     * @returns {string}
     */
    getConnectorColor(alignment) {

        if (this.pairConnectorColor) {
            return this.pairConnectorColor
        }

        switch (this.colorBy) {
            case "strand":
            case "firstOfPairStrand":
            case "pairOrientation":
            case "tag":
                if (this.parent.color) {
                    return (typeof this.parent.color === "function") ? this.parent.color(alignment) : this.parent.color
                } else {
                    return DEFAULT_CONNECTOR_COLOR
                }
            default:
                return this.getAlignmentColor(alignment)

        }
    }

    getAlignmentColor(alignment) {

        let color = DEFAULT_ALIGNMENT_COLOR   // The default color if nothing else applies
        if (this.parent.color) {
            color = (typeof this.parent.color === "function") ? this.parent.color(alignment) : this.parent.color
        } else {
            color = DEFAULT_ALIGNMENT_COLOR
        }
        const option = this.colorBy
        switch (option) {
            case "strand":
                color = alignment.strand ? this.posStrandColor : this.negStrandColor
                break

            case "firstOfPairStrand":
                const s = alignment.firstOfPairStrand
                if (s !== undefined) {
                    color = s ? this.posStrandColor : this.negStrandColor
                }
                break

            case "unexpectedPair":
            case "pairOrientation":

                if (this.pairOrientation && alignment.pairOrientation) {
                    const oTypes = orientationTypes[this.pairOrientation]
                    if (oTypes) {
                        const pairColor = this.pairColors[oTypes[alignment.pairOrientation]]
                        if (pairColor) {
                            color = pairColor
                            break
                        }
                    }
                }
                if ("pairOrientation" === option) {
                    break
                }

            case "tlen":
            case "fragmentLength":

                if (alignment.mate && alignment.isMateMapped()) {
                    if (alignment.mate.chr !== alignment.chr) {
                        color = getChrColor(alignment.mate.chr)
                    } else if (this.parent.minTemplateLength && Math.abs(alignment.fragmentLength) < this.parent.minTemplateLength) {
                        color = this.smallTLENColor
                    } else if (this.parent.maxTemplateLength && Math.abs(alignment.fragmentLength) > this.parent.maxTemplateLength) {
                        color = this.largeTLENColor
                    }
                }
                break

            case "tag":
                const tagValue = alignment.tags()[this.colorByTag]
                if (tagValue !== undefined) {
                    if (this.bamColorTag === this.colorByTag) {
                        // UCSC style color option
                        color = "rgb(" + tagValue + ")"
                    } else {

                        if (!this.tagColors) {
                            this.tagColors = new PaletteColorTable("Set1")
                        }
                        color = this.tagColors.getColor(tagValue)
                    }
                }
                break
        }

        return color

    }

    get color() {
        return this.parent.color
    }

    get showSortClips() {
        return this.parent.showSoftClips
    }

    get showAllBases() {
        return this.parent.showAllBases
    }

    get nucleotideColors() {
        return this.browser.nucleotideColors
    }

    get minTemplateLength() {
        return this.parent.minTemplateLength

    }

    get maxTemplateLength() {
        return this.parent.maxTemplateLength
    }

    get colorBy() {
        return this.parent.colorBy
    }

    set colorBy(option) {
        this.parent.colorBy = option
    }
}

function shadedBaseColor(qual, baseColor) {

    const minQ = 5   //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MIN),
    const maxQ = 20  //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MAX);

    let alpha
    if (qual < minQ) {
        alpha = 0.1
    } else {
        alpha = Math.max(0.1, Math.min(1.0, 0.1 + 0.9 * (qual - minQ) / (maxQ - minQ)))
    }
    // Round alpha to nearest 0.1
    alpha = Math.round(alpha * 10) / 10.0

    if (alpha < 1) {
        baseColor = IGVColor.addAlpha(baseColor, alpha)
    }
    return baseColor
}

export function getChrColor(chr) {
    if (chrColorMap[chr]) {
        return chrColorMap[chr]
    } else if (chrColorMap["chr" + chr]) {
        const color = chrColorMap["chr" + chr]
        chrColorMap[chr] = color
        return color
    } else {
        const color = IGVColor.randomRGB(0, 255)
        chrColorMap[chr] = color
        return color
    }
}

const chrColorMap = {
    "chrX": "rgb(204, 153, 0)",
    "chrY": "rgb(153, 204, 0)",
    "chrUn": "rgb(50, 50, 50)",
    "chr1": "rgb(80, 80, 255)",
    "chrI": "rgb(139, 155, 187)",
    "chr2": "rgb(206, 61, 50)",
    "chrII": "rgb(206, 61, 50)",
    "chr2a": "rgb(216, 71, 60)",
    "chr2b": "rgb(226, 81, 70)",
    "chr3": "rgb(116, 155, 88)",
    "chrIII": "rgb(116, 155, 88)",
    "chr4": "rgb(240, 230, 133)",
    "chrIV": "rgb(240, 230, 133)",
    "chr5": "rgb(70, 105, 131)",
    "chr6": "rgb(186, 99, 56)",
    "chr7": "rgb(93, 177, 221)",
    "chr8": "rgb(128, 34, 104)",
    "chr9": "rgb(107, 215, 107)",
    "chr10": "rgb(213, 149, 167)",
    "chr11": "rgb(146, 72, 34)",
    "chr12": "rgb(131, 123, 141)",
    "chr13": "rgb(199, 81, 39)",
    "chr14": "rgb(213, 143, 92)",
    "chr15": "rgb(122, 101, 165)",
    "chr16": "rgb(228, 175, 105)",
    "chr17": "rgb(59, 27, 83)",
    "chr18": "rgb(205, 222, 183)",
    "chr19": "rgb(97, 42, 121)",
    "chr20": "rgb(174, 31, 99)",
    "chr21": "rgb(231, 199, 111)",
    "chr22": "rgb(90, 101, 94)",
    "chr23": "rgb(204, 153, 0)",
    "chr24": "rgb(153, 204, 0)",
    "chr25": "rgb(51, 204, 0)",
    "chr26": "rgb(0, 204, 51)",
    "chr27": "rgb(0, 204, 153)",
    "chr28": "rgb(0, 153, 204)",
    "chr29": "rgb(10, 71, 255)",
    "chr30": "rgb(71, 117, 255)",
    "chr31": "rgb(255, 194, 10)",
    "chr32": "rgb(255, 209, 71)",
    "chr33": "rgb(153, 0, 51)",
    "chr34": "rgb(153, 26, 0)",
    "chr35": "rgb(153, 102, 0)",
    "chr36": "rgb(128, 153, 0)",
    "chr37": "rgb(51, 153, 0)",
    "chr38": "rgb(0, 153, 26)",
    "chr39": "rgb(0, 153, 102)",
    "chr40": "rgb(0, 128, 153)",
    "chr41": "rgb(0, 51, 153)",
    "chr42": "rgb(26, 0, 153)",
    "chr43": "rgb(102, 0, 153)",
    "chr44": "rgb(153, 0, 128)",
    "chr45": "rgb(214, 0, 71)",
    "chr46": "rgb(255, 20, 99)",
    "chr47": "rgb(0, 214, 143)",
    "chr48": "rgb(20, 255, 177)",
}

export default BAMTrack
