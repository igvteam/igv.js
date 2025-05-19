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


class SegTrack extends TrackBase {

    #sortDirections = new Map()

    constructor(config, browser) {
        super(config, browser)
    }

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
                this.sampleKeys.push(s)
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

                    const element = document.createElement('div');
                    element.innerHTML = `&nbsp;&nbsp;${attribute.split(SampleInfo.emptySpaceReplacement).join(' ')}`;

                    function attributeSort() {
                        const sortDirection = this.#sortDirections.get(attribute) || 1
                        this.sortByAttribute(attribute, sortDirection)
                        this.#sortDirections.set(attribute, sortDirection * -1)

                        this.config.sort = {
                            option: "ATTRIBUTE",
                            attribute: attribute,
                            direction: sortDirection === 1 ? "ASC" : "DESC"
                        }
                    }

                    menuItems.push({element, click: attributeSort})
                }
            }
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

            menuItems.push({ element: createElementWithString('<div>Set color scale threshold</div>'), dialog: dialogPresentationHandler})
        }

        menuItems.push('<hr/>')
        menuItems.push("DisplayMode:")
        const displayOptions = this.type === 'seg' || this.type === 'shoebox' ? ["SQUISHED", "EXPANDED", "FILL"] : ["SQUISHED", "EXPANDED"]
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
            names: this.sampleKeys,
            height: this.sampleHeight,
            yOffset: 0
        }
    }

    async getFeatures(chr, start, end) {
        const features = await this.featureSource.getFeatures({chr, start, end})
        // New segments could conceivably add new samples
        this.updateSampleKeys(features)

        if (this.initialSort) {
            const sort = this.initialSort
            if (sort.option === undefined || sort.option.toUpperCase() === "VALUE") {
                this.sortByValue(sort, features)
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
            const samples = {}
            this.sampleKeys.forEach(function (id, index) {
                samples[id] = index
            })

            let border
            switch (this.displayMode) {
                case "FILL":
                    this.sampleHeight = pixelHeight / this.sampleKeys.length
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
                f.row = samples[sampleKey]
                const y = f.row * rowHeight + border

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
                } else if ("shoebox" === this.type) {
                    color = this.sbColorScale.getColor(f.value)
                    let sh = rowHeight
                    if (rowHeight < 0.25) {
                        const f = 0.1 + 2 * Math.abs(f.value)
                        sh = Math.min(1, f * rowHeight)
                    }
                    h = sh - 2 * border
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

                // console.log(`${ this.type } render. y(${ y }) height(${ h })`)
                context.fillRect(x, y, w, h)
                drawCount++
            }
        } else {
            //console.log("No feature list");
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
        return this.sampleKeys.length * sampleHeight
    }

    /**
     * Sort samples by the average value over the genomic range in the direction indicated (1 = ascending, -1 descending)
     */
    async sortByValue(sort, featureList) {

        const chr = sort.chr
        let start, end
        if (sort.position) {
            start = sort.position - 1
            end = start + 1
        } else {
            start = sort.start
            end = sort.end
        }


        if (!featureList) {
            featureList = await this.featureSource.getFeatures({chr, start, end})
        }
        if (!featureList) return

        this.updateSampleKeys(featureList)

        const scores = {}
        const d2 = (sort.direction === "ASC" ? 1 : -1)

        const sortSeg = () => {
            // Compute weighted average score for each sample
            const bpLength = end - start + 1
            for (let segment of featureList) {
                if (segment.end < start) continue
                if (segment.start > end) break
                const min = Math.max(start, segment.start)
                const max = Math.min(end, segment.end)
                const f = (max - min) / bpLength
                const sampleKey = segment.sampleKey || segment.sample
                const s = scores[sampleKey] || 0
                scores[sampleKey] = s + f * segment.value
            }

            // Now sort sample names by score
            this.sampleKeys.sort(function (a, b) {
                let s1 = scores[a]
                let s2 = scores[b]
                if (!s1) s1 = d2 * Number.MAX_VALUE
                if (!s2) s2 = d2 * Number.MAX_VALUE
                if (s1 === s2) return 0
                else if (s1 > s2) return d2
                else return d2 * -1
            })
        }

        const sortMut = () => {
            // Compute weighted average score for each sample
            for (let segment of featureList) {
                if (segment.end < start) continue
                if (segment.start > end) break
                const sampleKey = segment.sampleKey || segment.sample
                if (!scores.hasOwnProperty(sampleKey) || segment.value.localeCompare(scores[sampleKey]) > 0) {
                    scores[sampleKey] = segment.value
                }
            }
            // Now sort sample names by score
            this.sampleKeys.sort(function (a, b) {
                let sa = scores[a] || ""
                let sb = scores[b] || ""
                return d2 * (sa.localeCompare(sb))
            })
        }

        if ("mut" === this.type) {
            sortMut()
        } else {
            sortSeg()
        }

        this.trackView.repaintViews()

    }

    sortByAttribute(attribute, sortDirection) {

        this.sampleKeys = this.browser.sampleInfo.getSortedSampleKeysByAttribute(this.sampleKeys, attribute, sortDirection)
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

        const genomicLocation = clickState.genomicLocation

        const sortHandler = (sort) => {
            const viewport = clickState.viewport
            const features = viewport.cachedFeatures
            this.sortByValue(sort, features)
        }

        // We can't know genomic location intended with precision, define a buffer 5 "pixels" wide in genomic coordinates
        const bpWidth = clickState.referenceFrame.toBP(2.5)

        return ["DESC", "ASC"].map(direction => {
            const dirLabel = direction === "DESC" ? "descending" : "ascending"
            const sortLabel = this.type === 'seg' || this.type === 'shoebox' ?
                `Sort by value (${dirLabel})` :
                `Sort by type (${dirLabel})`
            return {
                label: sortLabel,
                click: () => {
                    const sort = {
                        option: "VALUE",   // Either VALUE or ATTRIBUTE
                        direction,
                        chr: clickState.referenceFrame.chr,
                        start: Math.floor(genomicLocation - bpWidth),
                        end: Math.floor(genomicLocation + bpWidth)
                    }
                    sortHandler(sort)
                    this.config.sort = sort
                }
            }
        })
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
                this.sampleKeys.push(sampleKey)
                sampleKeySet.add(sampleKey)
            }
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
