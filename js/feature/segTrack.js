import FeatureSource from './featureSource.js'
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import {IGVMath} from "../../node_modules/igv-utils/src/index.js"
import {createCheckbox} from "../igv-icons.js"
import {GradientColorScale} from "../util/colorScale.js"
import {ColorTable} from "../util/colorPalletes.js"
import SampleInfo from "../sample/sampleInfo.js"
import HicColorScale from "../hic/hicColorScale.js"
import {doSortByAttributes} from "../sample/sampleUtils.js"
import {drawGroupDividers, GROUP_MARGIN_HEIGHT} from "../sample/sampleUtils.js"

const NULL_GROUP = 'None'

class SegTrack extends TrackBase {

    static defaults =
        {
            type: 'seg',
            groupBy: NULL_GROUP,
            isLog: undefined,
            displayMode: "EXPANDED",
            height: 300,
            maxHeight: 500,
            squishedRowHeight: 2,
            expandedRowHeight: 13
        }


    constructor(config, browser) {
        super(config, browser)
        this.groups = new Map()
    }


    init(config) {

        super.init(config)

        if (this.type === 'maf') this.type = 'mut'
        this.sortDirections = new Map()
        this.sampleKeys = []
        this.groups = new Map()
        this.sampleHeight = this.squishedRowHeight      // Initial value, will get overwritten when rendered

        // Explicitly set samples -- used to select a subset of samples from a dataset
        if (config.samples) {
            for (let s of config.samples) {
                this.sampleKeys.push(s)
            }
            this.explicitSamples = true  // Samples are explicitly set, do not update from features
        }

        // Color settings
        if (config.color) {
            this.color = config.color    // Overrides defaults, can be a function
        } else if (config.colorTable) {
            this.colorTable = new ColorTable(config.colorTable)
        } else {
            if ('mut' === this.type) {
                this.colorTable = new ColorTable(MUT_COLORS)
            } else {
                // Color scales for "seg" (copy number) tracks.
                this.posColorScale = new GradientColorScale(config.posColorScale || POS_COLOR_SCALE)
                this.negColorScale = new GradientColorScale(config.negColorScale || NEG_COLOR_SCALE)
            }
        }


        // Create featureSource
        // Disable whole genome downsampling unless explicitly.
        const configCopy = Object.assign({}, this.config)
        configCopy.maxWGCount = configCopy.maxWGCount || Number.MAX_SAFE_INTEGER

        this.featureSource = FeatureSource(configCopy, this.browser.genome)

        this.initialSort = config.sort

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

        this._initialColor = this.color || this.constructor.defaultColor
        this._initialAltColor = this.altColor || this.constructor.defaultColor

        this.didTrackDragEnd = undefined
        this.browser.on('trackdragend', () => this.didTrackDragEnd = true)
    }

    menuItemList() {

        const menuItems = []

        if (true === doSortByAttributes(this.browser.sampleInfo, this.sampleKeys)) {
            menuItems.push('<hr/>')
            menuItems.push("Sort by attribute:")
            for (const attribute of this.browser.sampleInfo.attributeNames) {

                const sampleNames = this.sampleKeys
                if (sampleNames.some(s => {
                    const attrs = this.browser.sampleInfo.getAttributes(s)
                    return attrs && attrs[attribute]
                })) {

                    const element = document.createElement('div')
                    element.innerHTML = `&nbsp;&nbsp;${attribute.split(SampleInfo.emptySpaceReplacement).join(' ')}`

                    function attributeSort() {
                        this.sortByAttribute(attribute)
                    }

                    menuItems.push({element, click: attributeSort})
                }
            }
        }

        menuItems.push('<hr/>')
        menuItems.push("Group by attribute:")

        for (const attribute of [NULL_GROUP, ...this.browser.sampleInfo.attributeNames]) {

            let initialState = false
            if (NULL_GROUP === attribute) {
                initialState = (NULL_GROUP === this.groupBy)
            } else {
                initialState = (attribute === this.groupBy)
            }
            const element = createCheckbox(attribute, initialState)

            menuItems.push(
                {
                    element,
                    click: function groupByFunction() {
                        this.groupByAttribute(attribute)
                    }
                })
        }

        const lut =
            {
                "SQUISHED": "Squish",
                "EXPANDED": "Expand",
                "FILL": "Fill"
            }


        menuItems.push('<hr/>')
        menuItems.push("DisplayMode:")
        const displayOptions = 'seg' === this.type ? ["SQUISHED", "EXPANDED", "FILL"] : ["SQUISHED", "EXPANDED"]
        for (let displayMode of displayOptions) {

            menuItems.push(
                {
                    element: createCheckbox(lut[displayMode], displayMode === this.displayMode),
                    click: function displayModeHandler() {
                        this.displayMode = displayMode
                        this.config.displayMode = displayMode
                        this.trackView.checkContentHeight()
                        this.trackView.repaintViews()
                        this.createGroupLabels()
                    }
                })
        }

        return menuItems

    }

    hasSamples() {
        return true   // SEG, MUT, and MAF tracks have samples by definition
    }

    getSamples() {
        const groupIndeces = NULL_GROUP !== this.groupBy ?
            this.sampleKeys.map(sample => this.getGroupIndex(sample)) : undefined
        return {
            names: this.sampleKeys || [],
            height: this.sampleHeight,
            yOffset: 0,
            groups: this.groups,
            groupIndeces,
            groupMarginHeight: GROUP_MARGIN_HEIGHT
        }
    }

    /**
     * Filter function for sample keys. Applies multiple filters in pipeline fashion.
     * Each filter must pass for a sample to be included.
     *
     * @param sampleKey
     * @returns {boolean}
     */
    filter(sampleKey) {
        const filterObjects = this._trackFilterObjects || []

        if (filterObjects.length === 0) {
            return true
        }

        // Apply each filter in sequence - all must pass
        for (const filterObject of filterObjects) {
            const scores = filterObject.scores || {}
            const score = scores[sampleKey]

            if (this.type === 'seg') {
                if (filterObject.op === '>') {
                    if (!(score > filterObject.value)) return false
                } else if (filterObject.op === '<') {
                    if (!(score < filterObject.value)) return false
                }
            } else if (this.type === 'mut' || this.type === 'maf') {
                const hasMutations = 'HAS' === filterObject.op ? score : !score
                if (!hasMutations) return false
            }
        }

        return true
    }


    /**
     * Return the current state of the track. Used to create sessions and bookmarks.
     * @returns {Object} - Track state including filters
     */
    getState() {
        const state = super.getState()

        // Save current filters as part of track state
        if (this._trackFilterObjects && this._trackFilterObjects.length > 0) {
            // Convert filter objects to filter specs (remove computed scores)
            const filterSpecs = this._trackFilterObjects.map(filterObj => {
                const {scores, ...filterSpec} = filterObj
                return filterSpec
            })
            state.filters = filterSpecs
        }

        return state
    }

    async getFeatures(chr, start, end) {
        const features = await this.featureSource.getFeatures({chr, start, end})
        // New segments could conceivably add new samples
        this.updateSampleKeys(features)

        if (this.initialSort) {
            const sort = this.initialSort

            if (sort.option === undefined || sort.option.toUpperCase() === "VALUE") {
                const sortFeatures = (sort.chr === chr && sort.start >= start && sort.end <= end) ? features : undefined
                this.sortByValue(sort, sortFeatures)
            } else if ("ATTRIBUTE" === sort.option.toUpperCase() && sort.attribute) {
                const sortDirection = "DESC" === sort.direction ? 1 : -1
                this.sortByAttribute(sort.attribute, sortDirection)
            }
            this.initialSort = undefined  // Sample order is sorted,
        }
        return features
    }

    draw({context, pixelTop, pixelWidth, pixelHeight, features, bpPerPixel, bpStart}) {

        IGVGraphics.fillRect(context, 0, pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})


        if (features && features.length > 0) {

            this.checkForLog(features)

            if (this.type === "shoebox" && !this.sbColorScale) {
                const threshold = this.featureSource.hicFile.percentile95 || 2000
                this.sbColorScale = new HicColorScale({threshold, r: 0, g: 0, b: 255})
            }

            // Create a map for fast id -> row lookup
            const sampleRowIndeces = {}
            this.sampleKeys.forEach(function (sample, index) {
                sampleRowIndeces[sample] = index
            })

            let border
            switch (this.displayMode) {
                case "FILL":
                    this.sampleHeight = (pixelHeight - (this.groups.size + 1) * GROUP_MARGIN_HEIGHT) / this.sampleKeys.length
                    border = 0
                    break

                case "SQUISHED":
                    this.sampleHeight = this.squishedRowHeight
                    border = 0
                    break
                default:   // EXPANDED
                    this.sampleHeight = this.expandedRowHeight
                    border = 1
            }
            const rowHeight = this.sampleHeight

            for (let segment of features) {
                segment.pixelRect = undefined   // !important, reset this in case segment is not drawn
            }

            const pixelBottom = pixelTop + pixelHeight
            const bpEnd = bpStart + pixelWidth * bpPerPixel + 1
            const xScale = bpPerPixel

            this.sampleYStart = undefined
            let drawCount = 0
            for (let f of features) {

                if (f.end < bpStart || f.start > bpEnd) continue

                const sampleKey = f.sampleKey || f.sample
                f.row = sampleRowIndeces[sampleKey]
                let y =   f.row * rowHeight
                if( this.groups.size > 1) {
                   y += (this.getGroupIndex(sampleKey) + 1) * GROUP_MARGIN_HEIGHT
                }

                if (undefined === this.sampleYStart) {
                    this.sampleYStart = y
                }

                const bottom = y + rowHeight

                if (bottom < pixelTop || y > pixelBottom) {
                    continue
                }

                const segmentStart = Math.max(f.start, bpStart)
                // const segmentStart = segment.start;
                let x = Math.round((segmentStart - bpStart) / xScale)

                const segmentEnd = Math.min(f.end, bpEnd)
                // const segmentEnd = segment.end;
                const x1 = Math.round((segmentEnd - bpStart) / xScale)
                let w = Math.max(1, x1 - x)

                let color
                if (this.color) {
                    if (typeof this.color === "function") {
                        color = this.color(f)
                    } else {
                        color = this.color
                    }
                } else if (this.colorTable) {
                    color = this.colorTable.getColor(f.value.toLowerCase())
                }

                let h
                if ("mut" === this.type) {
                    h = rowHeight - 2 * border
                    if (w < 3) {
                        w = 3
                        x -= 1
                    }
                } else {
                    // Assume seg track
                    let value = f.value
                    if (!this.isLog) {
                        value = IGVMath.log2(value / 2)
                    }
                    if (value < -0.1) {
                        color = this.negColorScale.getColor(value)
                    } else if (value > 0.1) {
                        color = this.posColorScale.getColor(value)
                    } else {
                        color = "white"
                    }

                    let sh = rowHeight
                    if (rowHeight < 0.25) {
                        const f = 0.1 + 2 * Math.abs(value)
                        sh = Math.min(1, f * rowHeight)
                    }
                    h = sh - 2 * border
                }


                f.pixelRect = {x, y, w, h}

                // Use for diagnostic rendering
                // context.fillStyle = randomRGB(180, 240)
                context.fillStyle = color

                context.fillRect(x, y, w, h)
                drawCount++
            }

            if (NULL_GROUP !== this.groupBy) {
                drawGroupDividers(context,
                    pixelTop,
                    pixelWidth,
                    pixelHeight,
                    0,
                    this.sampleHeight,
                    this.groups,
                    GROUP_MARGIN_HEIGHT)
            }
        }
    }


    getGroupIndex(sampleKey) {
        const attributeValue = this.browser.sampleInfo.getAttributeValue(sampleKey, this.groupBy) || ""
        if (this.groups.has(attributeValue)) {
            return this.groups.get(attributeValue).index
        } else {
            return this.groups.size
        }
    }

    checkForLog(features) {
        if (this.isLog === undefined) {
            this.isLog = false
            for (let feature of features) {
                if (feature.value < 0) {
                    this.isLog = true
                    return
                }
            }
        }
    }

    /**
     * Optional method to compute pixel height to accomodate the list of features.  The implementation below
     * has side effects (modifiying the samples hash).
     *
     * Note displayMode "FILL" is handled by the viewport
     *
     * @param features
     * @returns {number}
     */
    computePixelHeight(features) {
        if (!features) return 0
        const sampleHeight = ("SQUISHED" === this.displayMode) ? this.squishedRowHeight : this.expandedRowHeight
        return this.sampleKeys.length * sampleHeight + (this.groups.size > 1 ? (this.groups.size + 1) * GROUP_MARGIN_HEIGHT : 0)
    }

    /**
     * Sort samples by the average value over the genomic range in the direction indicated (1 = ascending, -1 descending)
     */
    async sortByValue(sort, featureList) {

        const chr = sort.chr
        const start = sort.position !== undefined ? sort.position - 1 : sort.start
        const end = sort.end === undefined ? start + 1 : sort.end
        const scores = await this.computeRegionScores({chr, start, end}, featureList)
        const d2 = (sort.direction === "ASC" ? 1 : -1)

        this.sampleKeys.sort(function (a, b) {
            let s1 = scores[a]
            let s2 = scores[b]
            if (!s1) s1 = d2 * Number.MAX_VALUE
            if (!s2) s2 = d2 * Number.MAX_VALUE
            if (s1 === s2) return 0
            else if (s1 > s2) return d2
            else return d2 * -1
        })

        if (NULL_GROUP !== this.groupBy) {
            // If grouping by attribute, we need to re-group the samples
            this.sampleKeys = this.browser.sampleInfo.sortSampleKeysByAttribute(this.sampleKeys, this.groupBy, 1)
        }

        this.config.sort = sort
        this.trackView.repaintViews()
    }


    async computeRegionScores(filterObject, featureList) {

        const chr = filterObject.chr
        let start, end
        if (filterObject.position) {
            start = filterObject.position - 1
            end = start + 1
        } else {
            start = filterObject.start
            end = filterObject.end
        }

        if (!featureList) {
            featureList = await this.featureSource.getFeatures({chr, start, end})
        }
        if (!featureList) return

        this.updateSampleKeys(featureList)

        const scores = {}
        const bpLength = end - start + 1

        for (let segment of featureList) {
            if (segment.end < start) continue
            if (segment.start > end) break
            const sampleKey = segment.sampleKey || segment.sample

            if ("mut" === this.type) {
                // Just count features overlapping region per sample
                scores[sampleKey] = (scores[sampleKey] || 0) + 1
            } else {

                const min = Math.max(start, segment.start)
                const max = Math.min(end, segment.end)
                const f = (max - min) / bpLength
                scores[sampleKey] = (scores[sampleKey] || 0) + f * segment.value
            }
        }

        return scores
    }

    sortByAttribute(attribute, sortDirection) {

        sortDirection = sortDirection || this.sortDirections.get(attribute) || 1

        this.sampleKeys = this.browser.sampleInfo.sortSampleKeysByAttribute(this.sampleKeys, attribute, sortDirection)

        if (NULL_GROUP !== this.groupBy) {
            // If grouping by attribute, we need to re-group the samples
            this.sampleKeys = this.browser.sampleInfo.sortSampleKeysByAttribute(this.sampleKeys, this.groupBy, 1)
        }

        this.config.sort = {
            option: "ATTRIBUTE",
            attribute: attribute,
            direction: sortDirection === 1 ? "ASC" : "DESC"
        }
        this.sortDirections.set(attribute, sortDirection * -1)
        this.trackView.repaintViews()
    }

    groupByAttribute(attribute) {

        this.groupBy = attribute

        // Group samples by the specified attribute
        this.groups.clear()
        if (NULL_GROUP !== attribute) {
            this.sampleKeys = this.browser.sampleInfo.sortSampleKeysByAttribute(this.sampleKeys, attribute, 1)
            const sampleKeys = this.sampleKeys
            for (let sampleKey of sampleKeys) {
                const value = this.browser.sampleInfo.getAttributeValue(sampleKey, attribute) || ""
                if (value) {
                    if (!this.groups.has(value)) {
                        this.groups.set(value, {index: this.groups.size, count: 1})
                    } else {
                        this.groups.get(value).count += 1
                    }
                }
            }
        }

        this.trackView.checkContentHeight()
        this.trackView.repaintViews()
        this.createGroupLabels()
    }

    createGroupLabels() {

        const viewport = this.trackView.getLastViewport()
        viewport.overlayElement.innerHTML = ''   // Clear previous labels

        if (this.groups.size === 0) return

        let sampleHeight
        switch (this.displayMode) {
            case "EXPANDED":
                sampleHeight = this.expandedRowHeight
                break
            case "SQUISHED":
                sampleHeight = this.squishedRowHeight
                break
            default:   // FILL mode -- hopefully sample height has been set in the draw method
                const pixelHeight = viewport.viewportElement.getBoundingClientRect().height
                sampleHeight = (pixelHeight - (this.groups.size - 1) * GROUP_MARGIN_HEIGHT) / this.sampleKeys.length

        }

        let top = GROUP_MARGIN_HEIGHT
        for (const bucketKey of this.groups.keys()) {
            const labelDiv = document.createElement('div')
            labelDiv.className = 'igv-attribute-group-label'
            viewport.overlayElement.appendChild(labelDiv)
            labelDiv.innerText = bucketKey
            labelDiv.style.top = `${top}px`
            top += this.groups.get(bucketKey).count * sampleHeight + GROUP_MARGIN_HEIGHT
        }
    }

    clickedFeatures(clickState) {

        const allFeatures = super.clickedFeatures(clickState)
        const y = clickState.y
        return allFeatures.filter(function (feature) {
            const rect = feature.pixelRect
            return rect && y >= rect.y && y <= (rect.y + rect.h)
        })

    }

    hoverText(clickState) {
        const features = this.clickedFeatures(clickState)
        if (features && features.length > 0) {
            return `${features[0].sample}: ${features[0].value}`
        }
    }

    popupData(clickState, featureList) {

        if (featureList === undefined) featureList = this.clickedFeatures(clickState)

        const items = []

        for (let feature of featureList) {

            // Double line divider between features
            if (items.length > 0) {
                items.push('<hr/>')
                items.push('<hr/>')
            }

            // hack for whole genome features, which save the original feature as "_f"
            const f = feature._f || feature

            const data = (typeof f.popupData === 'function') ?
                f.popupData(this.type, this.browser.genome.id) :
                this.extractPopupData(f)
            Array.prototype.push.apply(items, data)

        }

        return items
    }

    contextMenuItemList(clickState) {

        const {genomicLocation, referenceFrame, viewport, event} = clickState

        const sortHandler = (sort) => {
            const features = viewport.cachedFeatures
            this.sortByValue(sort, features)
        }

        // We can't know genomic location intended with precision, define a buffer 5 "pixels" wide in genomic coordinates
        const bpWidth = referenceFrame.toBP(2.5)

        const menuItems = ["DESC", "ASC"].map(direction => {
            const dirLabel = direction === "DESC" ? "descending" : "ascending"
            const sortLabel = this.type === 'seg' || this.type === 'shoebox' ?
                `Sort by value (${dirLabel})` :
                `Sort by count (${dirLabel})`
            return {
                label: sortLabel,
                click: () => {
                    const sort = {
                        option: "VALUE",   // Either VALUE or ATTRIBUTE
                        direction,
                        chr: referenceFrame.chr,
                        start: Math.floor(genomicLocation - bpWidth),
                        end: Math.floor(genomicLocation + bpWidth)
                    }
                    sortHandler(sort)
                }
            }
        })

        menuItems.push('<hr/>')

        return menuItems
    }

    get supportsWholeGenome() {
        return (this.config.indexed === false || !this.config.indexURL) && this.config.supportsWholeGenome !== false
    }

    updateSampleKeys(featureList) {
        if (this.explicitSamples) return

        let newSamplesFound = false
        const sampleKeySet = new Set(this.sampleKeys)
        for (let feature of featureList) {
            const sampleKey = feature.sampleKey || feature.sample
            if (!sampleKeySet.has(sampleKey)) {
                const keys = this.sampleKeys
                keys.push(sampleKey)
                this.sampleKeys = keys
                sampleKeySet.add(sampleKey)
                newSamplesFound = true
            }
        }
        if (newSamplesFound && NULL_GROUP !== this.groupBy) {
            this.groupByAttribute(this.groupBy)

        }
    }

}

// Default copy number scales
const POS_COLOR_SCALE = {low: 0.1, high: 1.5, lowColor: 'rgb(255,255,255)', highColor: 'rgb(255,0,0)'}
const NEG_COLOR_SCALE = {low: -1.5, high: -0.1, lowColor: 'rgb(0,0,255)', highColor: 'rgb(255,255,255)'}
//const POS_COLOR_SCALE = {low: 0.1, lowR: 255, lowG: 255, lowB: 255, high: 1.5, highR: 255, highG: 0, highB: 0}
//const NEG_COLOR_SCALE = {low: -1.5, lowR: 0, lowG: 0, lowB: 255, high: -0.1, highR: 255, highG: 255, highB: 255}

// Mut and MAF file default color table
const MUT_COLORS = {

    "indel": "rgb(0,200,0)",
    "targeted region": "rgb(236,155,43)",
    "truncating": "rgb(	150,0,0)",
    "non-coding transcript": "rgb(0,0,150)",

    // Colors from https://www.nature.com/articles/nature11404
    "synonymous": "rgb(109,165,95)",
    "silent": "rgb(109,135,80)",
    "missense_mutation": "rgb(72,130,187)",
    "missense": "rgb(72,130,187)",
    "splice site": "rgb(143,83,155)",
    "splice_region": "rgb(143,83,155)",
    "nonsense": "rgb(216, 57,81)",
    "nonsense_mutation": "rgb(216, 57,81)",
    "frame_shift_del": "rgb(226,135,65)",
    "frame_shift_ins": "rgb(226,135,65)",
    "in_frame_del": "rgb(247,235,94)",
    "in_frame_ins": "rgb(247,235,94)",
    "*other*": "rgb(159,91,50)"
    //
    // 3'Flank
    // 3'UTR
    // 5'Flank
    // 5'UTR
    // Frame_Shift_Del
    // Frame_Shift_Ins
    // IGR
    // In_Frame_Del
    // In_Frame_Ins
    // Intron
    // Missense_Mutation
    // Nonsense_Mutation
    // Nonstop_Mutation
    // RNA
    // Silent
    // Splice_Region
    // Splice_Site
    // Translation_Start_Site
    // Variant_Classification

}


export default SegTrack
