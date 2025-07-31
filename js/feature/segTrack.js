import FeatureSource from './featureSource.js'
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import {IGVMath} from "../../node_modules/igv-utils/src/index.js"
import {createCheckbox} from "../igv-icons.js"
import {GradientColorScale} from "../util/colorScale.js"
import {ColorTable} from "../util/colorPalletes.js"
import SampleInfo from "../sample/sampleInfo.js"
import HicColorScale from "../hic/hicColorScale.js"
import ShoeboxSource from "../hic/shoeboxSource.js"
import {doSortByAttributes} from "../sample/sampleUtils.js"
import {createElementWithString} from "../ui/utils/dom-utils.js"
import SEGFilterDialog from "../ui/components/segFilterDialog.js"
import FilterManagerDialog from "../ui/components/filterManagerDialog.js"

class SegTrack extends TrackBase {

    static defaults =
        {
            groupBy: undefined
        };

    static BUCKET_MARGIN_HEIGHT = 16

    constructor(config, browser) {
        super(config, browser)
        this._sampleKeys = []
        this.buckets = new Map()
        this.bucketedAttribute = undefined

        this.segFilterDialog = new SEGFilterDialog(browser.columnContainer)
        this.filterManagerDialog = new FilterManagerDialog(browser.columnContainer)
    }

    #sortDirections = new Map()

    init(config) {
        super.init(config)

        this.type = config.type || "seg"
        if (this.type === 'maf') this.type = 'mut'
        this.isLog = config.isLog
        this.displayMode = config.displayMode || "EXPANDED" // EXPANDED | SQUISHED
        this.height = config.height || 300
        this.maxHeight = config.maxHeight || 500
        this.squishedRowHeight = config.sampleSquishHeight || config.squishedRowHeight || 2
        this.expandedRowHeight = config.sampleExpandHeight || config.expandedRowHeight || 13
        this.sampleHeight = this.squishedRowHeight      // Initial value, will get overwritten when rendered

        // Explicitly set samples -- used to select a subset of samples from a dataset
        this.sampleKeys = []
        if (config.samples) {
            // Explicit setting, keys == names
            for (let s of config.samples) {
                const currentKeys = this.sampleKeys
                currentKeys.push(s)
                this.sampleKeys = currentKeys
            }
            this.explicitSamples = true
        }


        // Color settings
        if (config.color) {
            this.color = config.color    // Overrides defaults, can be a function
        } else if (config.colorTable) {
            this.colorTable = new ColorTable(config.colorTable)
        } else {
            switch (this.type) {
                case "mut":
                    this.colorTable = new ColorTable(MUT_COLORS)
                    break
                // case "shoebox":
                //     if (config.colorScale) this.sbColorScale = HicColorScale.parse(config.colorScale)
                //     break
                default:
                    // Color scales for "seg" (copy number) tracks.
                    this.posColorScale = new GradientColorScale(config.posColorScale || POS_COLOR_SCALE)
                    this.negColorScale = new GradientColorScale(config.negColorScale || NEG_COLOR_SCALE)
            }
        }


        // Create featureSource
        // Disable whole genome downsampling unless explicitly.
        const configCopy = Object.assign({}, this.config)
        configCopy.maxWGCount = configCopy.maxWGCount || Number.MAX_SAFE_INTEGER

        if ('shoebox' === this.type) {
            this.featureSource = new ShoeboxSource(configCopy, this.browser.genome)
            this.height = config.height || 500
            this.maxHeight = config.maxHeight || 800
            this.isLog = false
            this.squishedRowHeight = config.squishedRowHeight || 1
            this.displayMode = config.displayMode || "SQUISHED"
            this.visibilityWindow = config.visibilityWindow === undefined ? 1000000 : config.visibilityWindow
        } else {
            this.featureSource = FeatureSource(configCopy, this.browser.genome)
        }

        this.initialSort = config.sort

        if (config.groupBy){
            this.groupBy = config.groupBy
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

        this._initialColor = this.color || this.constructor.defaultColor
        this._initialAltColor = this.altColor || this.constructor.defaultColor

        // Initialize filters from track config (individual track filtering)
        if (this.config.filters){
            this._trackFilterObjects = await this.createFilterObjects(this.config.filters)
        }
        // Legacy support for filterConfigurations (for backward compatibility)
        else if (this.config.filterConfigurations){
            this._trackFilterObjects = await this.createFilterObjects(this.config.filterConfigurations)
        }

        this.didTrackDragEnd = undefined
        this.browser.on('trackdragend', () => this.didTrackDragEnd = true)
    }

    get sampleKeys() {
        return [...this._sampleKeys]
    }

    set sampleKeys(keys) {
        if (Array.isArray(keys)) {
            this._sampleKeys = [...keys]
        } else {
            this._sampleKeys = []
        }
    }

    menuItemList() {

        const menuItems = []

        if (true === doSortByAttributes(this.browser.sampleInfo, this.filteredSampleKeys)) {
            menuItems.push('<hr/>')
            menuItems.push("Sort by attribute:")
            for (const attribute of this.browser.sampleInfo.attributeNames) {

                if (this.filteredSampleKeys.some(s => {
                    const attrs = this.browser.sampleInfo.getAttributes(s)
                    return attrs && attrs[attribute]
                })) {

                    const element = document.createElement('div')
                    element.innerHTML = `&nbsp;&nbsp;${attribute.split(SampleInfo.emptySpaceReplacement).join(' ')}`

                    function attributeSort() {
                        this.sortByAttribute(attribute, (this.#sortDirections.get(attribute) || 1))
                    }

                    menuItems.push({element, click: attributeSort})
                }
            }
        }

        menuItems.push('<hr/>')
        menuItems.push("Group by attribute:")

        for (const attribute of [ 'None', ...this.browser.sampleInfo.attributeNames]) {

            let initialState = false
            if ('None' === attribute) {
                initialState = (undefined === this.groupBy)
            } else {
                initialState = (attribute === this.groupBy)
            }
            const element = createCheckbox(attribute, initialState)

            menuItems.push(
                {
                    element,
                    click: function groupByFunction(){
                        this.groupBy = 'None' === attribute ? undefined : attribute;
                        this.buckets.clear()
                        this.bucketedAttribute = this.groupBy
                        this.trackView.checkContentHeight()
                        this.trackView.repaintViews()
                    }
                })
        }

        const lut =
            {
                "SQUISHED": "Squish",
                "EXPANDED": "Expand",
                "FILL": "Fill"
            }

        if (this.type === 'shoebox' && this.sbColorScale) {
            menuItems.push('<hr/>')

            function dialogPresentationHandler(e) {
                this.browser.inputDialog.present({
                    label: 'Color Scale Threshold',
                    value: this.sbColorScale.threshold,
                    callback: () => {
                        const t = Number(this.browser.inputDialog.value, 10)
                        if (t) {
                            this.sbColorScale.setThreshold(t)
                            this.trackView.repaintViews()
                        }
                    }
                }, e)
            }

            menuItems.push({
                element: createElementWithString('<div>Set color scale threshold</div>'),
                dialog: dialogPresentationHandler
            })
        }

        menuItems.push('<hr/>')
        menuItems.push("DisplayMode:")
        const displayOptions = new Set([ 'mut', 'seg', 'shoebox' ] ).has(this.type)  ? ["SQUISHED", "EXPANDED", "FILL"] : ["SQUISHED", "EXPANDED"]
        for (let displayMode of displayOptions) {

            menuItems.push(
                {
                    element: createCheckbox(lut[displayMode], displayMode === this.displayMode),
                    click: function displayModeHandler() {
                        this.displayMode = displayMode
                        this.config.displayMode = displayMode
                        this.trackView.checkContentHeight()
                        this.trackView.repaintViews()
                        this.trackView.moveScroller(this.trackView.sampleNameViewport.trackScrollDelta)
                    }

                })
        }

        return menuItems

    }

    hasSamples() {
        return true   // SEG, MUT, and MAF tracks have samples by definition
    }

    getSamples() {
        return {
            names: this.metadataSampleKeys,
            height: this.sampleHeight,
            yOffset: 0
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

    get filteredSampleKeys() {
        return this.sampleKeys.filter(key => this.filter(key))
    }

    /**
     * Create filter objects with computed scores from filter specifications.
     * This method computes scores for each filter and returns the complete filter objects.
     *
     * @param filterSpecs - Array of filter specification objects
     * @returns {Promise<Array>} - Array of filter objects with computed scores
     */
    async createFilterObjects(filterSpecs) {
        const list = filterSpecs.map(filterSpec => { return { ...filterSpec } })

        // Compute scores for all filter objects
        const promises = list.map(filterSpec => this.computeRegionScores(filterSpec))
        const scores = await Promise.all(promises)

        // Assign scores back to filter objects
        list.forEach((filterSpec, index) => {
            filterSpec.scores = scores[index]
        })

        return list
    }

    /**
     * Set the sample filter objects.  This is used to filter samples from the set based on values over specified
     * genomic regions.   The values compared depend on the track data type:
     *   - "seg" and "shoebox" -- average value over the region
     *   - "mut" and "maf" -- count of features overlapping the region
     *
     * Multiple filters work in a pipeline fashion - each filter's output becomes the input for the next filter.
     * The method is asynchronous because it may need to fetch data from the server to compute the scores.
     * Computed scores are stored and used to filter the sample keys on demand.
     *
     * @param filterSpecs - Single filter object or array of filter objects
     * @returns {Promise<void>}
     */
    async setSampleFilter(filterSpecs) {
        if (!filterSpecs) {
            this._trackFilterObjects = undefined
        } else {
            this._trackFilterObjects = await this.createFilterObjects(filterSpecs)
            this.trackView.checkContentHeight()
        }

        this.trackView.repaintViews()
    }

    /**
     * Add a filter to this track's filter list
     * @param {Object} filterConfig - The filter configuration object
     * @returns {Promise<void>}
     */
    async addFilter(filterConfig) {
        const currentFilters = this._trackFilterObjects || []
        const updatedFilters = [...currentFilters, filterConfig]
        await this.setSampleFilter(updatedFilters)
    }

    /**
     * Remove a specific filter from this track by index
     * @param {number} index - Index of the filter to remove
     * @returns {Promise<void>}
     */
    async removeFilter(index) {
        const currentFilters = this._trackFilterObjects || []
        if (index >= 0 && index < currentFilters.length) {
            const newFilters = currentFilters.filter((_, i) => i !== index)
            await this.setSampleFilter(newFilters.length > 0 ? newFilters : undefined)
        }
    }

    /**
     * Clear all filters for this track
     * @returns {Promise<void>}
     */
    async clearFilters() {
        await this.setSampleFilter(undefined)
    }

    /**
     * Get the current filters for this track
     * @returns {Array} - Array of filter objects
     */
    getFilters() {
        return this._trackFilterObjects || []
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
                const { scores, ...filterSpec } = filterObj
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
                const direction = sort.direction === "DESC" ? 1 : -1;
                this.sortByAttribute(sort.attribute, direction)
            }
            this.initialSort = undefined  // Sample order is sorted,
        }
        return features
    }

    draw(config) {

        const {context, contentTop, pixelXOffset, viewport, viewportWidth, pixelWidth, pixelHeight, pixelTop, features, bpPerPixel, bpStart} = config

        IGVGraphics.fillRect(context, 0, pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})

        if (features && features.length > 0) {

            this.checkForLog(features)

            if (this.type === "shoebox" && !this.sbColorScale) {
                const threshold = this.featureSource.hicFile.percentile95 || 2000
                this.sbColorScale = new HicColorScale({threshold, r: 0, g: 0, b: 255})
            }

            this.metadataSampleKeys = undefined
            if (this.groupBy) {
                this.buckets.clear()
                this.bucketedAttribute = this.groupBy
                this.metadataSampleKeys = this.browser.sampleInfo.getGroupedSampleKeysByAttribute(this.filteredSampleKeys, this.buckets, this.bucketedAttribute)
                if (this.config.sort && this.config.sort.doSort) {
                    this.metadataSampleKeys = this.config.sort.doSort([ ...this.metadataSampleKeys ])
                }
            } else {
                this.metadataSampleKeys = this.filteredSampleKeys
                if (this.config.sort && this.config.sort.doSort) {
                    this.metadataSampleKeys = this.config.sort.doSort([ ...this.metadataSampleKeys ])
                }
            }

            const sampleIndexLUT = {}
            this.metadataSampleKeys.forEach((key, index)  => {
                sampleIndexLUT[key] = index
            })

            const bucketMarginHeight = this.getBucketMarginHeight()
            const bucketStartRows = this.getBucketStartRows();

            const { sampleHeight, border } = this.calculateDisplayProperties(
                this.displayMode,
                pixelHeight,
                bucketStartRows,
                bucketMarginHeight,
                this.filteredSampleKeys.length
            )
            this.sampleHeight = sampleHeight

            for (let segment of features) {
                segment.pixelRect = undefined   // !important, reset this in case segment is not drawn
            }

            const pixelBottom = pixelTop + pixelHeight
            const bpEnd = bpStart + pixelWidth * bpPerPixel + 1

            for (const feature of features) {
                if (this.isFeatureVisible(feature, bpStart, bpEnd, pixelTop, pixelBottom, this.sampleHeight, sampleIndexLUT, bucketMarginHeight, bucketStartRows, border)) {
                    this.renderFeature(feature, bpStart, bpEnd, bpPerPixel, this.sampleHeight, border, sampleIndexLUT, bucketMarginHeight, bucketStartRows, context)
                }
            }

            if (this.groupBy && viewport.doRenderBucketLabels) {
                this.renderBucketLabels(viewport, this.sampleHeight, bucketMarginHeight, bucketStartRows, contentTop)
            } else {
                const bucketLabels = viewport.viewportElement.querySelectorAll('.igv-attribute-group-label')
                for (const label of bucketLabels) {
                    label.remove()
                }
                const bucketLines = viewport.viewportElement.querySelectorAll('.igv-attribute-group-line')
                for (const line of bucketLines) {
                    line.remove()
                }
            }

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
     * has side effects (modifiying the samples hash).  This is unfortunate, but harmless.
     *
     * Note displayMode "FILL" is handled by the viewport
     *
     * @param features
     * @returns {number}
     */
    computePixelHeight(features) {
        if (!features) return 0
        const sampleHeight = ("SQUISHED" === this.displayMode) ? this.squishedRowHeight : this.expandedRowHeight
        this.updateSampleKeys(features)

        if (this.buckets && this.buckets.size > 0) {
            const aggregateBucketMarginHeight = (this.buckets.size - 1) * this.getBucketMarginHeight()
            return aggregateBucketMarginHeight + (this.filteredSampleKeys.length * sampleHeight)
        } else {
            return this.filteredSampleKeys.length * sampleHeight
        }
    }

    async sortByValue(sort, featureList) {

        const createValueComparator = (scores, direction) => {
            const d2 = (direction === "ASC" ? 1 : -1)
            return (a, b) => {
                let s1 = scores[a]
                let s2 = scores[b]
                if (!s1) s1 = d2 * Number.MAX_VALUE
                if (!s2) s2 = d2 * Number.MAX_VALUE
                if (s1 === s2) return 0
                else if (s1 > s2) return d2
                else return d2 * -1
            }
        }

        let {chr, start, end, position, direction} = sort

        if (position !== undefined) {
            start = position - 1
        }

        if (end === undefined) {
            end = start + 1
        }

        const scores = await this.computeRegionScores({chr, start, end}, featureList)

        this.config.sort = { ...sort }
        this.config.sort.doSort = sampleKeys => this.browser.sampleInfo.getSortedSampleKeysByComparator(sampleKeys, createValueComparator(scores, direction), this.buckets)

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

        const mutationTypes = filterObject.value ? new Set(filterObject.value) : undefined

        for (let segment of featureList) {
            if (segment.end >= start && segment.start <= end) {
                const sampleKey = segment.sampleKey || segment.sample

                if ("mut" === this.type) {
                    if (mutationTypes) {
                        const mutationType = segment.getAttribute("Variant_Classification")
                        if (mutationTypes.has(mutationType)) {
                            // Just count features overlapping region per sample
                            scores[sampleKey] = (scores[sampleKey] || 0) + 1
                        }
                    } else {
                        // Just count features overlapping region per sample
                        scores[sampleKey] = (scores[sampleKey] || 0) + 1
                    }
                } else {

                    const min = Math.max(start, segment.start)
                    const max = Math.min(end, segment.end)
                    const f = (max - min) / bpLength
                    scores[sampleKey] = (scores[sampleKey] || 0) + f * segment.value
                }
            }
        }

        return scores

    }

    sortByAttribute(attribute, sortDirection) {

        this.config.sort =
            {
                doSort: sampleKeys => this.browser.sampleInfo.getSortedSampleKeysByAttribute(sampleKeys, attribute, sortDirection, this.buckets),
                option: "ATTRIBUTE",
                attribute,
                direction: sortDirection === 1 ? "ASC" : "DESC"
            }

        this.#sortDirections.set(attribute, sortDirection * -1)
        this.trackView.repaintViews()
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

        const { genomicLocation, referenceFrame, viewport, event } = clickState

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


        // Add filter menu items based on track type
        if (this.type === 'seg') {
            menuItems.push('<hr/>')
            menuItems.push({
                label: 'Filter by value ...',
                click: () => {
                    const config = {
                        callback: async (threshold, op) => {
                            const chr = referenceFrame.chr
                            const start = Math.floor(genomicLocation - bpWidth)
                            const end = Math.floor(genomicLocation + bpWidth)

                            // Apply filter to this specific track
                            const filterConfig = { type: "VALUE", op, value: threshold, chr, start, end }
                            await this.addFilter(filterConfig)
                        }
                    }
                    this.segFilterDialog.present(event, config)
                }
            })

        }

        if (this._trackFilterObjects && this._trackFilterObjects.length > 0) {
            menuItems.push({
                label: 'Filters...',
                click: () => {
                    this.filterManagerDialog.present(this, event)
                }
            })

        }

        menuItems.push('<hr/>')

        return menuItems
    }

    get supportsWholeGenome() {
        return (this.config.indexed === false || !this.config.indexURL) && this.config.supportsWholeGenome !== false
    }

    updateSampleKeys(featureList) {
        if (this.explicitSamples) return

        const sampleKeySet = new Set(this.sampleKeys)
        for (let feature of featureList) {
            const sampleKey = feature.sampleKey || feature.sample
            if (!sampleKeySet.has(sampleKey)) {
                const keys = this.sampleKeys
                keys.push(sampleKey)
                this.sampleKeys = keys
                sampleKeySet.add(sampleKey)
            }
        }
    }

    /**
     * Calculate the position and bounds for a feature
     * @param {Object} feature - The feature to calculate position for
     * @param {Object} sampleIndexLUT - Lookup table for sample indices
     * @param {number} rowHeight - Height of each row
     * @param {number} bucketMarginHeight - Height of bucket margins
     * @param {Array} bucketStartRows - Array of bucket start row indices
     * @param {number} border - Border width
     * @returns {Object} - Object containing row, y, bottom properties
     */
    calculateFeaturePosition(feature, sampleIndexLUT, rowHeight, bucketMarginHeight, bucketStartRows, border) {

        const sampleKey = feature.sampleKey || feature.sample
        const row = sampleIndexLUT[sampleKey]

        const bucketMarginCount = bucketMarginHeight && bucketStartRows.length > 1 ? SegTrack.getBucketMarginCount(row, bucketStartRows) : 0

        const y = (row * rowHeight) + (bucketMarginCount * bucketMarginHeight) + border
        const bottom = y + rowHeight
        return { row, y, bottom }
    }

    /**
     * Check if a feature should be rendered based on genomic and pixel bounds
     * @param {Object} feature - The feature to check
     * @param {number} bpStart - Start position in base pairs
     * @param {number} bpEnd - End position in base pairs
     * @param {number} pixelTop - Top pixel position
     * @param {number} pixelBottom - Bottom pixel position
     * @param {number} rowHeight - Height of each row
     * @param {Object} sampleIndexLUT - Lookup table for sample indices
     * @param {number} bucketMarginHeight - Height of bucket margins
     * @param {Array} bucketStartRows - Array of bucket start row indices
     * @param {number} border - Border width
     * @returns {boolean} - True if feature should be rendered
     */
    isFeatureVisible(feature, bpStart, bpEnd, pixelTop, pixelBottom, rowHeight, sampleIndexLUT, bucketMarginHeight, bucketStartRows, border) {
        // Check genomic bounds
        if (feature.end < bpStart || feature.start > bpEnd) {
            return false
        }

        // Calculate position
        const { bottom, y } = this.calculateFeaturePosition(feature, sampleIndexLUT, rowHeight, bucketMarginHeight, bucketStartRows, border)

        // Check pixel bounds
        if (bottom < pixelTop || y > pixelBottom) {
            return false
        }

        return true
    }

    /**
     * Calculate the style properties (color, height, width, x position) for a feature
     * @param {Object} feature - The feature to style
     * @param {number} rowHeight - Height of each row
     * @param {number} border - Border width
     * @param {number} w - Width of the feature
     * @param {number} x - X position of the feature
     * @returns {Object} - Object containing color, h, w, x properties
     */
    calculateFeatureStyle(feature, rowHeight, border, w, x) {
        let color, h

        if (this.color) {
            color = typeof this.color === "function" ? this.color(feature) : this.color
        } else if (this.colorTable) {
            color = this.colorTable.getColor(feature.value.toLowerCase())
        }

        if ("mut" === this.type) {
            h = rowHeight - 2 * border
            if (w < 3) {
                w = 3
                x -= 1
            }
        } else if ("shoebox" === this.type) {
            color = this.sbColorScale.getColor(feature.value)
            let sh = rowHeight
            if (rowHeight < 0.25) {
                const f = 0.1 + 2 * Math.abs(feature.value)
                sh = Math.min(1, f * rowHeight)
            }
            h = sh - 2 * border
        } else {
            // Assume seg track
            let value = feature.value
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

        return { color, h, w, x }
    }

    /**
     * Render a single feature
     * @param {Object} feature - The feature to render
     * @param {number} bpStart - Start position in base pairs
     * @param {number} bpEnd - End position in base pairs
     * @param {number} bpPerPixel - Scale factor for x coordinates
     * @param {number} rowHeight - Height of each row
     * @param {number} border - Border width
     * @param {Object} sampleIndexLUT - Lookup table for sample indices
     * @param {number} bucketMarginHeight - Height of bucket margins
     * @param {Array} bucketStartRows - Array of bucket start row indices
     * @param {CanvasRenderingContext2D} context - Canvas context for drawing
     */
    renderFeature(feature, bpStart, bpEnd, bpPerPixel, rowHeight, border, sampleIndexLUT, bucketMarginHeight, bucketStartRows, context) {

        const { y } = this.calculateFeaturePosition(feature, sampleIndexLUT, rowHeight, bucketMarginHeight, bucketStartRows, border)

        // Calculate geometry
        const segmentStart = Math.max(feature.start, bpStart)
        let x = Math.round((segmentStart - bpStart) / bpPerPixel)
        const segmentEnd = Math.min(feature.end, bpEnd)
        const x1 = Math.round((segmentEnd - bpStart) / bpPerPixel)
        let w = Math.max(1, x1 - x)

        // Determine color and height based on track type
        const { color, h, w: finalW, x: finalX } = this.calculateFeatureStyle(feature, rowHeight, border, w, x)

        // Store pixel rect and draw
        feature.pixelRect = {x: finalX, y, w: finalW, h}
        context.fillStyle = color
        context.fillRect(finalX, y, finalW, h)
    }

    renderBucketLabels(viewport, rowHeight, bucketMarginHeight, bucketStartRows, top) {

        if (true === this.didTrackDragEnd) {
            console.log(`${ Date.now() } renderBucketLabels didTrackDragEnd(true) - Skip renderBucketLabels`)
            this.didTrackDragEnd = undefined
            return
        } else {
            console.log(`${ Date.now() } renderBucketLabels didTrackDragEnd(undefined)- DO renderBucketLabels`)
        }

        if (true === this.browser.isResizingWindow) {
            console.log(`${ Date.now() } renderBucketLabels isResizingWindow(true) - Skip renderBucketLabels`)
            return
        } else {
            console.log(`${ Date.now() } renderBucketLabels isResizingWindow(undefined) - DO renderBucketLabels`)
        }

        // discard all pre-existing bucket labels and lines
        const bucketLabels = viewport.viewportElement.querySelectorAll('.igv-attribute-group-label')
        for (const label of bucketLabels) {
            label.remove()
        }
        const bucketLines = viewport.viewportElement.querySelectorAll('.igv-attribute-group-line')
        for (const line of bucketLines) {
            line.remove()
        }

        let bucketIndex = 0
        const bucketKeys = Array.from(this.buckets.keys())

        const fudge = 4
        const lineOffset = bucketMarginHeight/2  // Offset above the label text
        for (const key of bucketKeys) {

            const bucketStartRow = bucketStartRows[bucketIndex]
            const bucketMarginCount = bucketMarginHeight && bucketStartRows.length > 1 ? SegTrack.getBucketMarginCount(bucketStartRow, bucketStartRows) : 0
            const y = top + (bucketStartRow * rowHeight) + (bucketMarginCount * bucketMarginHeight)

            // Create horizontal line above the label (skip for first group)
            if (bucketIndex > 0) {
                const horizontalLine = document.createElement('div')
                viewport.viewportElement.appendChild(horizontalLine)
                horizontalLine.className = 'igv-attribute-group-line'
                horizontalLine.style.top = `${y - lineOffset}px`
                horizontalLine.style.display = 'block'
            }

            // Create the label
            const attributeGroupLabel = document.createElement('div')
            viewport.viewportElement.appendChild(attributeGroupLabel)
            attributeGroupLabel.className = 'igv-attribute-group-label'
            attributeGroupLabel.style.top = `${y + fudge}px`
            attributeGroupLabel.textContent = key
            attributeGroupLabel.style.display = 'block'

            bucketIndex++
        }

    }

    /**
     * Calculate display properties based on display mode
     * @param {string} displayMode - The display mode (FILL, SQUISHED, EXPANDED)
     * @param {number} pixelHeight - Total pixel height available
     * @param {number} bucketStartRows - Array of bucket start row indices
     * @param {number} bucketMarginHeight - Height of bucket margins
     * @param {number} filteredSampleKeysLength - Number of filtered sample keys
     * @returns {Object} - Object containing sampleHeight and border properties
     */
    calculateDisplayProperties(displayMode, pixelHeight, bucketStartRows, bucketMarginHeight, filteredSampleKeysLength) {
        let sampleHeight, border

        switch (displayMode) {
            case "FILL":
                const marginPixelsTotalHeight = (bucketStartRows.length > 1 ? bucketMarginHeight * bucketStartRows.length - 1 : 0)
                const samplePixelsTotalHeight = pixelHeight - marginPixelsTotalHeight
                // console.log(`filteredSampleKeys: ${ filteredSampleKeysLength } pixelHeight: ${pixelHeight}, marginPixelsTotalHeight: ${marginPixelsTotalHeight}, samplePixelsTotalHeight: ${samplePixelsTotalHeight}`)
                sampleHeight = samplePixelsTotalHeight / filteredSampleKeysLength
                border = 0
                break

            case "SQUISHED":
                sampleHeight = this.squishedRowHeight
                border = 0
                break
            default:   // EXPANDED
                sampleHeight = this.expandedRowHeight
                border = 1
        }

        return { sampleHeight, border }
    }

    setTopHelper(viewport, contentTop) {
        if (this.groupBy && viewport.doRenderBucketLabels) {
            const bucketStartRows = this.getBucketStartRows()
            const bucketMarginHeight = this.getBucketMarginHeight()
            this.renderBucketLabels(viewport, this.sampleHeight, bucketMarginHeight, bucketStartRows, contentTop)
        }
    }

    getBucketStartRows() {
        let bucketStartRows = [];
        if (this.buckets) {
            let row = 0;
            for (let [bucketName, samplesArr] of this.buckets) {
                bucketStartRows.push(row);
                row += samplesArr.length;
            }
        }
        return bucketStartRows;
    }

    getBucketMarginHeight() {
        return this.buckets && this.buckets.size > 0 ? SegTrack.BUCKET_MARGIN_HEIGHT : 0
    }

    static getBucketMarginCount(rowIndex, bucketStartRows) {
        let count = 0;
        for (let i = 1; i < bucketStartRows.length; i++) {
            if (rowIndex >= bucketStartRows[i]) count++;
        }
        return count;
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
