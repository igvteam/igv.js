import $ from "../vendor/jquery-3.3.1.slim.js"
import FeatureSource from './featureSource.js'
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import {createCheckbox} from "../igv-icons.js"
import {reverseComplementSequence} from "../util/sequenceUtils.js"
import {aminoAcidSequenceRenderThreshold, renderFeature} from "./render/renderFeature.js"
import {renderSnp} from "./render/renderSnp.js"
import {renderFusionJuncSpan} from "./render/renderFusionJunction.js"
import {StringUtils} from "../../node_modules/igv-utils/src/index.js"
import {ColorTable, PaletteColorTable} from "../util/colorPalletes.js"
import {isSecureContext, expandRegion} from "../util/igvUtils.js"
import {IGVColor} from "../../node_modules/igv-utils/src/index.js"
import {findFeatureAfterCenter} from "./featureUtils.js"

class FeatureTrack extends TrackBase {

    static defaultColor = 'rgb(0,0,150)'

    static defaults = {
        type: "annotation",
        maxRows: 1000, // protects against pathological feature packing cases (# of rows of overlapping feaures)
        displayMode: "EXPANDED", // COLLAPSED | EXPANDED | SQUISHED
        margin: 10,
        featureHeight: 14,
        useScore: false
    }

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {
        super.init(config)

        // Obscure option, not common or supoorted, included for backward compatibility
        this.labelDisplayMode = config.labelDisplayMode

        if (config._featureSource) {
            this.featureSource = config._featureSource
            delete config._featureSource
        } else if ('blat' !== config.type) {
            this.featureSource = config.featureSource ?
                config.featureSource :
                FeatureSource(config, this.browser.genome)
        }

        if ("FusionJuncSpan" === config.type) {
            this.render = config.render || renderFusionJuncSpan
            this.squishedRowHeight = config.squishedRowHeight || 50
            this.expandedRowHeight = config.expandedRowHeight || 50
            this.height = config.height || this.margin + 2 * this.expandedRowHeight
        } else if ('snp' === config.type) {
            this.render = config.render || renderSnp
            // colors ordered based on priority least to greatest
            this.snpColors = ['rgb(0,0,0)', 'rgb(0,0,255)', 'rgb(0,255,0)', 'rgb(255,0,0)']
            this.colorBy = 'function'
            this.expandedRowHeight = config.expandedRowHeight || 10
            this.squishedRowHeight = config.squishedRowHeight || 5
            this.height = config.height || 30
        } else {
            this.render = config.render || renderFeature
            this.arrowSpacing = 30
            // adjust label positions to make sure they're always visible
            monitorTrackDrag(this)
            this.squishedRowHeight = config.squishedRowHeight || 15
            this.expandedRowHeight = config.expandedRowHeight || 30
            this.height = config.height || this.margin + 2 * this.expandedRowHeight

            // Set colorBy fields considering legacy options for backward compatibility
            if (config.colorBy) {
                if (config.colorBy.field) {
                    config.colorTable = config.colorBy.pallete || config.colorBy.palette
                    config.colorBy = config.colorBy.field
                }
                this.colorBy = config.colorBy   // Can be undefined => default
                if (config.colorTable) {
                    this.colorTable = new ColorTable(config.colorTable)
                } else {
                    this.colorTable = new PaletteColorTable("Set1")
                }
            }
        }
    }

    async postInit() {

        if (typeof this.featureSource.getHeader === "function") {
            this.header = await this.featureSource.getHeader()
            if (this.disposed) return   // This track was removed during async load
        }

        // Set properties from track line
        if (this.header) {
            this.setTrackProperties(this.header)
        }

        if (this.visibilityWindow === undefined && typeof this.featureSource.defaultVisibilityWindow === 'function') {
            this.visibilityWindow = await this.featureSource.defaultVisibilityWindow()
        }

        this._initialColor = this.color || this.constructor.defaultColor
        this._initialAltColor = this.altColor || this.constructor.defaultColor

        return this

    }

    /**
     * Return true if this track can be searched for genome location by feature property.
     * This track is searchable if its featureSource is searchable.
     * @returns {boolean}
     */
    get searchable() {
        return this.featureSource.searchable
    }

    async search(locus) {
        if (this.featureSource && this.featureSource.searchable) {
            return this.featureSource.search(locus)
        } else {
            return undefined
        }
    }

    /**
     * Return boolean indicating if this track supports the whole genome view.  Generally this is non-indexed feature
     * tracks.
     *
     * @returns {*|boolean}
     */
    get supportsWholeGenome() {
        if (this.config.supportsWholeGenome !== undefined) {
            return this.config.supportsWholeGenome
        } else if (this.featureSource && typeof this.featureSource.supportsWholeGenome === 'function') {
            return this.featureSource.supportsWholeGenome()
        } else {
            if (this.visibilityWindow === undefined && (this.config.indexed === false || !this.config.indexURL)) {
                return true
            }
        }
    }

    async getFeatures(chr, start, end, bpPerPixel) {
        const visibilityWindow = this.visibilityWindow
        return this.featureSource.getFeatures({chr, start, end, bpPerPixel, visibilityWindow})
    }

    /**
     * The required height in pixels required for the track content.   This is not the visible track height, which
     * can be smaller (with a scrollbar) or larger.
     *
     * @param features
     * @returns {*}
     */
    computePixelHeight(features) {

        if (this.displayMode === "COLLAPSED") {
            return this.margin + this.expandedRowHeight
        } else {
            let maxRow = 0
            if (features && (typeof features.forEach === "function")) {
                for (let feature of features) {
                    if (feature.row && feature.row > maxRow) {
                        maxRow = feature.row
                    }
                }
            }

            const height = this.margin + (maxRow + 1) * ("SQUISHED" === this.displayMode ? this.squishedRowHeight : this.expandedRowHeight)
            return height

        }
    };

    /**
     *                 context: ctx,
     *                 pixelXOffset,
     *                 pixelWidth,
     *                 pixelHeight,
     *                 pixelTop,
     *                 bpStart,
     *                 bpEnd: bpEnd,
     *                 bpPerPixel,
     *                 windowFunction: this.windowFunction,
     *                 referenceFrame: this.referenceFrame,
     *                 selection: this.selection,
     *                 viewport: this,
     *                 viewportWidth: this.$viewport.width()
     * @param options
     */
    draw(options) {

        const {features, context, bpPerPixel, bpStart, bpEnd, pixelWidth, pixelHeight, referenceFrame} = options

        // If drawing amino acids fetch cached sequence interval.  It is not needed if track does not support AA, but
        // costs nothing since only a reference to a cached object is fetched.
        if (bpPerPixel < aminoAcidSequenceRenderThreshold) {
            options.sequenceInterval = this.browser.genome.getSequenceInterval(referenceFrame.chr, bpStart, bpEnd)
        }


        if (!this.isMergedTrack) {
            IGVGraphics.fillRect(context, 0, options.pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})
        }

        if (features) {

            const rowFeatureCount = []
            options.rowLastX = []
            options.rowLastLabelX = []
            for (let feature of features) {
                if (feature.start > bpStart && feature.end < bpEnd) {
                    const row = this.displayMode === "COLLAPSED" ? 0 : feature.row || 0
                    if (!rowFeatureCount[row]) {
                        rowFeatureCount[row] = 1
                    } else {
                        rowFeatureCount[row]++
                    }
                    options.rowLastX[row] = -Number.MAX_SAFE_INTEGER
                    options.rowLastLabelX[row] = -Number.MAX_SAFE_INTEGER
                }
            }
            const maxFeatureCount = Math.max(1, Math.max(...(rowFeatureCount.filter(c => !isNaN(c)))))
            const pixelsPerFeature = pixelWidth / maxFeatureCount

            let lastPxEnd = []
            const selectedFeatures = []
            for (let feature of features) {
                if (feature.end < bpStart) continue
                if (feature.start > bpEnd) break

                if (this.displayMode === 'COLLAPSED' && this.browser.qtlSelections.hasPhenotype(feature.name)) {
                    selectedFeatures.push(feature)
                }

                const row = this.displayMode === 'COLLAPSED' ? 0 : feature.row
                options.drawLabel = options.labelAllFeatures || pixelsPerFeature > 10
                const pxEnd = Math.ceil((feature.end - bpStart) / bpPerPixel)
                const last = lastPxEnd[row]
                if (!last || pxEnd > last) {

                    this.render.call(this, feature, bpStart, bpPerPixel, pixelHeight, context, options)

                    // Ensure a visible gap between features
                    const pxStart = Math.floor((feature.start - bpStart) / bpPerPixel)
                    if (last && pxStart - last <= 0) {
                        context.globalAlpha = 0.5
                        IGVGraphics.strokeLine(context, pxStart, 0, pxStart, pixelHeight, {'strokeStyle': "rgb(255, 255, 255)"})
                        context.globalAlpha = 1.0
                    }
                    lastPxEnd[row] = pxEnd
                }
            }

            // If any features are selected redraw them here.  This insures selected features are visible in collapsed mode
            for (let feature of selectedFeatures) {
                options.drawLabel = true
                this.render.call(this, feature, bpStart, bpPerPixel, pixelHeight, context, options)
            }

        } else {
            console.log("No feature list")
        }

    };

    clickedFeatures(clickState) {

        const y = clickState.y - this.margin
        const allFeatures = super.clickedFeatures(clickState)

        let row
        switch (this.displayMode) {
            case 'SQUISHED':
                row = Math.floor(y / this.squishedRowHeight)
                break
            case 'EXPANDED':
                row = Math.floor(y / this.expandedRowHeight)
                break
            default:
                row = undefined
        }

        return allFeatures.filter(function (feature) {
            return (row === undefined || feature.row === undefined || row === feature.row)
        })
    }

    /**
     * Return "popup data" for feature @ genomic location.  Data is an array of key-value pairs
     */
    popupData(clickState, features) {

        if (features === undefined) features = this.clickedFeatures(clickState)
        const genomicLocation = clickState.genomicLocation
        const data = []
        for (let feature of features) {

            // Whole genome hack, whole-genome psuedo features store the "real" feature in an _f field
            const f = feature._f || feature

            const featureData = (typeof f.popupData === "function") ?
                f.popupData(genomicLocation) :
                this.extractPopupData(f)

            if (featureData) {

                if (data.length > 0) {
                    data.push("<hr/><hr/>")
                }

                // If we have an infoURL, find the name property and create the link.  We do this at this level
                // to catch name properties in both custom popupData functions and the generic extractPopupData function

                const infoURL = this.infoURL || this.config.infoURL
                for (let fd of featureData) {
                    data.push(fd)
                    if (infoURL &&
                        fd.name &&
                        fd.name.toLowerCase() === "name" &&
                        fd.value &&
                        StringUtils.isString(fd.value) &&
                        !fd.value.startsWith("<")) {
                        const href = infoURL.replace("$$", feature.name)
                        fd.value = `<a target=_blank href=${href}>${fd.value}</a>`
                    }
                }


                //Array.prototype.push.apply(data, featureData);

                // If we have clicked over an exon number it.
                // Disabled for GFF and GTF files if the visibility window is < the feature length since we don't know if we have all exons
                const isGFF = "gff" === this.config.format || "gff3" === this.config.format || "gtf" === this.config.format
                if (f.exons && f.exons.length > 1) {
                    for (let i = 0; i < f.exons.length; i++) {
                        const exon = f.exons[i]
                        if (genomicLocation >= exon.start && genomicLocation <= exon.end) {
                            const exonNumber = isGFF ?
                                exon.number :
                                f.strand === "-" ? f.exons.length - i : i + 1
                            if (exonNumber) {
                                data.push('<hr/>')
                                data.push({name: "Exon Number", value: exonNumber})
                            }
                            break
                        }
                    }
                }
            }
        }

        return data

    }

    menuItemList() {

        const menuItems = []

        if (this.render === renderSnp) {
            menuItems.push('<hr/>')

            for (const colorScheme of ["function", "class"]) {

                const object = $(createCheckbox(`Color by ${colorScheme}`, colorScheme === this.colorBy))

                function colorSchemeHandler() {
                    this.colorBy = colorScheme
                    this.trackView.repaintViews()
                }

                menuItems.push({object, click: colorSchemeHandler})
            }
        }

        menuItems.push('<hr/>')

        const lut =
            {
                "COLLAPSED": "Collapse",
                "SQUISHED": "Squish",
                "EXPANDED": "Expand"
            }

        for (const displayMode of ["COLLAPSED", "SQUISHED", "EXPANDED"]) {

            const object = $(createCheckbox(lut[displayMode], displayMode === this.displayMode))

            function displayModeHandler() {
                this.displayMode = displayMode
                this.config.displayMode = displayMode
                this.trackView.checkContentHeight()
                this.trackView.repaintViews()
            }

            menuItems.push({object, click: displayModeHandler})
        }

        return menuItems

    };


    contextMenuItemList(clickState) {

        const features = this.clickedFeatures(clickState)

        if (undefined === features || 0 === features.length) {
            return undefined
        }

        if (features.length > 1) {
            features.sort((a, b) => (b.end - b.start) - (a.end - a.start))
        }
        const f = features[0]   // The shortest clicked feature

        if ((f.end - f.start) <= 1000000) {
            const list = [{
                label: 'View feature sequence',
                click: async () => {
                    let seq = await this.browser.genome.getSequence(f.chr, f.start, f.end)
                    if (!seq) {
                        seq = "Unknown sequence"
                    } else if (f.strand === '-') {
                        seq = reverseComplementSequence(seq)
                    }
                    this.browser.alert.present(seq)

                }
            }]

            if (isSecureContext() && navigator.clipboard !== undefined) {
                list.push(
                    {
                        label: 'Copy feature sequence',
                        click: async () => {
                            let seq = await this.browser.genome.getSequence(f.chr, f.start, f.end)
                            if (!seq) {
                                seq = "Unknown sequence"
                            } else if (f.strand === '-') {
                                seq = reverseComplementSequence(seq)
                            }
                            try {
                                await navigator.clipboard.writeText(seq)
                            } catch (e) {
                                console.error(e)
                                this.browser.alert.present(`error copying sequence to clipboard ${e}`)
                            }
                        }
                    }
                )
            }
            list.push('<hr/>')
            return list
        } else {
            return undefined
        }
    }

    description() {

        // if('snp' === this.type) {
        if (renderSnp === this.render) {
            let desc = "<html>" + this.name + '<hr/>'
            desc += '<em>Color By Function:</em><br>'
            desc += '<span style="color:red">Red</span>: Coding-Non-Synonymous, Splice Site<br>'
            desc += '<span style="color:green">Green</span>: Coding-Synonymous<br>'
            desc += '<span style="color:blue">Blue</span>: Untranslated<br>'
            desc += '<span style="color:black">Black</span>: Intron, Locus, Unknown<br><br>'
            desc += '<em>Color By Class:</em><br>'
            desc += '<span style="color:red">Red</span>: Deletion<br>'
            desc += '<span style="color:green">Green</span>: MNP<br>'
            desc += '<span style="color:blue">Blue</span>: Microsatellite, Named<br>'
            desc += '<span style="color:black">Black</span>: Indel, Insertion, SNP'
            desc += "</html>"
            return desc
        } else {
            return super.description()
        }

    };

    /**
     * Return color for feature.
     * @param feature
     * @returns {string}
     */

    getColorForFeature(f) {

        const feature = f._f || f    // f might be a "whole genome" wrapper

        let color

        if (f.name && this.browser.qtlSelections.hasPhenotype(f.name)) {
            color = this.browser.qtlSelections.colorForGene(f.name)
        } else if (this.altColor && "-" === feature.strand) {
            color = (typeof this.altColor === "function") ? this.altColor(feature) : this.altColor
        } else if (this.color) {
            color = (typeof this.color === "function") ? this.color(feature) : this.color  // Explicit setting via menu, or possibly track line if !config.color
        } else if (this.colorBy) {
            const value = feature.getAttributeValue ?
                feature.getAttributeValue(this.colorBy) :
                feature[this.colorBy]
            color = this.colorTable.getColor(value)
        } else if (feature.color) {
            color = feature.color   // Explicit color for feature
        }

        // If no explicit setting use the default
        if (!color) {
            color = FeatureTrack.defaultColor   // Track default
        }

        if (feature.alpha && feature.alpha !== 1) {
            color = IGVColor.addAlpha(color, feature.alpha)
        } else if (this.useScore && feature.score && !Number.isNaN(feature.score)) {
            // UCSC useScore option, for scores between 0-1000.  See https://genome.ucsc.edu/goldenPath/help/customTrack.html#TRACK
            const min = this.config.min ? this.config.min : this.viewLimitMin ? this.viewLimitMin : 0
            const max = this.config.max ? this.config.max : this.viewLimitMax ? this.viewLimitMax : 1000
            const alpha = getAlpha(min, max, feature.score)
            feature.alpha = alpha    // Avoid computing again
            color = IGVColor.addAlpha(color, alpha)
        }


        function getAlpha(min, max, score) {
            const binWidth = (max - min) / 9
            const binNumber = Math.floor((score - min) / binWidth)
            return Math.min(1.0, 0.2 + (binNumber * 0.8) / 9)
        }

        return color
    }


    /**
     * Called when the track is removed.  Do any needed cleanup here
     */
    dispose() {
        this.trackView = undefined
    }
}

/**
 * Monitors track drag events, updates label position to ensure that they're always visible.
 * @param track
 */
function monitorTrackDrag(track) {

    if (track.browser.on) {
        track.browser.on('trackdragend', onDragEnd)
        track.browser.on('trackremoved', unSubscribe)
    }

    function onDragEnd() {
        if (track.trackView && track.displayMode !== "SQUISHED") {
            // Repaint views to adjust feature name if center is moved out of view
            track.trackView.repaintViews()
        }
    }

    function unSubscribe(removedTrack) {
        if (track.browser.un && track === removedTrack) {
            track.browser.un('trackdragend', onDragEnd)
            track.browser.un('trackremoved', unSubscribe)
        }
    }

}


export default FeatureTrack
