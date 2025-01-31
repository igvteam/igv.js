import TrackBase from "../trackBase.js"
import HDF5IndexedReader from "./HDF5IndexedReader.js"
import {CNVpytorVCF} from "./cnvpytorVCF.js"
import FeatureSource from '../feature/featureSource.js'
import {createCheckbox} from "../igv-icons.js"
import IGVGraphics from "../igv-canvas.js"
import VariantTrack from "../variant/variantTrack.js"

class CNVPytorTrack extends TrackBase {

    static DEFAULT_TRACK_HEIGHT = 250

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {

        // NOTE -- don't use the "defaults" convention for this track, it will not work with VariantTrack.convertToPytor()
        this.featureType = 'numeric'
        this.type = "cnvpytor"
        if (!config.max) {
            this.defaultScale = true
            this.autoscale = false
        }
        if(!config.height) config.height = CNVPytorTrack.DEFAULT_TRACK_HEIGHT

        this.type = "cnvpytor"
        this.graphType = config.graphType || "points"
        this.bin_size = config.bin_size || 100000
        this.signal_name = config.signal_name || "rd_snp"
        this.cnv_caller = config.cnv_caller || '2D'
        this.colors = config.colors || ['gray', 'black', 'green', 'blue']
        this.hasChroms = {}
        super.init(config)

    }

    get supportsWholeGenome() {
        return true
    }

    get_signals() {
        let signals = []

        if (this.signal_name == 'rd_snp') {
            signals = ["RD_Raw", "RD_Raw_gc_coor", this.cnv_caller, "BAF1", "BAF2"]

        } else if (this.signal_name == 'rd') {
            signals = ["RD_Raw", "RD_Raw_gc_coor", this.cnv_caller]

        } else if (this.signal_name == 'snp') {
            signals = ["BAF1", "BAF2"]

        } else if (this.signal_name == 'cnh') {
            signals = [this.cnv_caller]
        }
        return signals
    }

    get_signal_colors() {

        let signal_colors = [
            {singal_name: 'RD_Raw', color: this.colors[0]},
            {singal_name: 'RD_Raw_gc_coor', color: this.colors[1]},
            {singal_name: 'ReadDepth', color: this.colors[2]},
            {singal_name: '2D', color: this.colors[2]},
            {singal_name: 'BAF1', color: this.colors[3]},
            {singal_name: 'BAF2', color: this.colors[3]},
        ]
        return signal_colors
    }

    async postInit() {

        if (this.config.format == 'vcf') {

            let allVariants
            if (this.featureSource) {
                allVariants = Object.values(this.featureSource.getAllFeatures()).flat()
            } else {
                this.featureSource = this.featureSource || FeatureSource(this.config, this.browser.genome)
                this.header = await this.getHeader()
                allVariants = this.featureSource.reader.features
            }

            const refGenome = this.browser.config.genome
            
            // Initializing CNVpytorVCF class
            const cnvpytor_obj = new CNVpytorVCF(allVariants, this.bin_size, refGenome)
            let wigFeatures
            let bafFeatures
            this.wigFeatures_obj = {}
            this.wigFeatures_obj[this.bin_size] = {}

            let dataWigs

            if (this.cnv_caller == '2D') {

                dataWigs = await cnvpytor_obj.read_rd_baf('2D')

                wigFeatures = dataWigs[0]
                bafFeatures = dataWigs[1]
                this.wigFeatures_obj[this.bin_size]['2D'] = wigFeatures[2]

                this.available_callers = ['2D']
            } else {
                dataWigs = await cnvpytor_obj.read_rd_baf()
                wigFeatures = dataWigs[0]
                bafFeatures = dataWigs[1]
                this.wigFeatures_obj[this.bin_size]['ReadDepth'] = wigFeatures[2]
                this.available_callers = ['ReadDepth']
            }

            this.wigFeatures_obj[this.bin_size]['RD_Raw'] = wigFeatures[0]
            this.wigFeatures_obj[this.bin_size]['RD_Raw_gc_coor'] = wigFeatures[1]
            this.wigFeatures_obj[this.bin_size]['BAF1'] = bafFeatures[0]
            this.wigFeatures_obj[this.bin_size]['BAF2'] = bafFeatures[1]

            this.available_bins = [this.bin_size]

            this.set_available_callers()

        } else {
            this.cnvpytor_obj = new HDF5IndexedReader(this.config.url, this.bin_size)
            // get chrom list that currently user viewing
            let chroms = [ ...new Set(this.browser.referenceFrameList.map(val => val.chr))]
            
            let aliasRecord = this.getAliasChromsList(chroms)
            this.wigFeatures_obj = await this.cnvpytor_obj.get_rd_signal(this.bin_size, aliasRecord)

            // Save the processed chroms names to check later for the availability
            this.update_hasChroms(this.wigFeatures_obj, chroms)

            this.available_bins = this.cnvpytor_obj.availableBins
            // reset the bin size if its not exits
            if(! this.available_bins.includes(this.bin_size)){
                this.bin_size = this.available_bins.at(-1);    
            }

            this.available_callers = this.cnvpytor_obj.callers
            this.set_available_callers()
        }

        this.tracks = []
        const p = []

        this.signals = this.get_signals()
        this.signal_colors = this.get_signal_colors()

        for (let bin_size in this.wigFeatures_obj) {
            let i = 0
            for (const [signal_name, wig] of Object.entries(this.wigFeatures_obj[bin_size])) {

                if (this.signals.includes(signal_name)) {
                    let tconf = {}
                    tconf.type = "wig"
                    tconf.isMergedTrack = true
                    tconf.features = wig
                    tconf.name = signal_name
                    tconf.color = this.signal_colors.filter(x => x.singal_name === signal_name).map(x => x.color)
                    const t = await this.browser.createTrack(tconf)
                    if (t) {
                        t.autoscale = false     // Scaling done from merged track
                        this.tracks.push(t)
                    } else {
                        console.warn("Could not create track " + tconf)
                    }

                    if (typeof t.postInit === 'function') {
                        p.push(t.postInit())
                    }
                    i++
                }
            }

        }


        this.flipAxis = this.config.flipAxis ? this.config.flipAxis : false
        this.logScale = this.config.logScale ? this.config.logScale : false
        this.autoscale = this.config.autoscale
        if (!this.autoscale) {
            this.dataRange = {
                min: this.config.min || 0,
                max: this.config.max
            }
        }
        for (let t of this.tracks) {
            t.autoscale = false
            t.dataRange = this.dataRange
        }

        return Promise.all(p)
    }

    getAliasChromsList(chroms){
        let aliasRecord = chroms.map(chr => {
            let records = this.browser.genome.chromAlias.aliasRecordCache.get(chr)
            return Object.values(records)
        })
        aliasRecord = aliasRecord.flat()
        return aliasRecord
    }
    
    set_available_callers() {
        if (!this.available_callers.includes(this.cnv_caller)) {
            if (this.available_callers.length > 0) {
                this.cnv_caller = this.available_callers[0]
            } else {
                this.cnv_caller = null
            }
        }
    }

    async getHeader() {

        if (!this.header) {
            if (typeof this.featureSource.getHeader === "function") {
                const header = await this.featureSource.getHeader()
                if (header) {
                    this.callSets = header.callSets || []
                }
                this.header = header
            }
            this.sampleKeys = this.callSets ? this.callSets.map(cs => cs.sample) : []
            this.sampleNames = this.sampleKeys
        }

        return this.header
    }

    get height() {
        return this._height
    }

    set height(h) {
        this._height = h
        if (this.tracks) {
            for (let t of this.tracks) {
                t.height = h
                t.config.height = h
            }
        }
    }

    menuItemList() {
        let items = []

        if (this.flipAxis !== undefined) {
            items.push({
                label: "Flip y-axis",
                click: function flipYAxisHandler() {
                    this.flipAxis = !this.flipAxis
                    this.trackView.repaintViews()
                }
            })
        }

        items = items.concat(this.numericDataMenuItems())

        items.push('<hr/>')
        items.push("Bin Sizes")
        for (let rd_bin of this.available_bins) {

            items.push({
                element: createCheckbox(rd_bin, rd_bin === this.bin_size),
                click: async function binSizesHandler() {
                    this.bin_size = rd_bin
                    // data loader image
                    this.trackView.startSpinner()

                    await this.recreate_tracks(rd_bin)
                    this.clearCachedFeatures()
                    this.trackView.updateViews()
                    this.trackView.repaintViews()
                }
            })
        }
        items.push('<hr/>')
        items.push("Signal Type")

        let signal_dct = {"rd_snp": "RD and BAF Likelihood", "rd": "RD Signal", "snp": "BAF Likelihood"}
        for (let signal_name in signal_dct) {

            items.push({
                element: createCheckbox(signal_dct[signal_name], signal_name === this.signal_name),
                click: async function signalTypeHandler() {
                    this.signal_name = signal_name
                    await this.recreate_tracks(this.bin_size)
                    this.clearCachedFeatures()
                    this.trackView.updateViews()
                    this.trackView.repaintViews()

                }
            })
        }

        // cnv caller setting
        items.push('<hr/>')
        items.push("CNV caller")
        for (let cnv_caller of this.available_callers) {

            items.push({
                element: createCheckbox(cnv_caller, cnv_caller === this.cnv_caller),
                click: async function cnvCallerHandler() {
                    this.cnv_caller = cnv_caller
                    // data loader image
                    this.trackView.startSpinner()

                    await this.recreate_tracks(this.bin_size)
                    this.clearCachedFeatures()
                    this.trackView.updateViews()
                    this.trackView.repaintViews()
                }
            })
        }

        // variant track conversion -- only if track was originally created from a VariantTrack
        if (this.variantState) {
            items.push('<hr/>')
            for (let cnv_caller of this.available_callers) {
                items.push({
                    label: 'Convert to variant track',
                    click: () => {
                        this.convertToVariant()
                    }
                })

            }
        }


        return items
    }

    async recreate_tracks(bin_size) {
        this.tracks = []
        const p = []

        if (!(bin_size in this.wigFeatures_obj)) {
            if(Object.keys(this.hasChroms).length > 0) {
                let chroms = [ ...new Set(this.browser.referenceFrameList.map(val => val.chr))]
                if(chroms[0] == "all"){
                    chroms = this.browser.genome.chromosomeNames
                }

                this.wigFeatures_obj = {...this.wigFeatures_obj, ...await this.cnvpytor_obj.get_rd_signal(bin_size, chroms)}
                this.update_hasChroms(this.wigFeatures_obj, chroms)
            } else{
                this.wigFeatures_obj = {...this.wigFeatures_obj, ...await this.cnvpytor_obj.get_rd_signal(bin_size)}
            }
            
        }

        this.signals = this.get_signals()
        this.signal_colors = this.get_signal_colors()

        let i = 0

        for (const [signal_name, wig] of Object.entries(this.wigFeatures_obj[bin_size])) {
            if (this.signals.includes(signal_name)) {
                let tconf = {}
                tconf.type = "wig"
                tconf.isMergedTrack = true
                tconf.features = wig
                tconf.name = signal_name
                tconf.color = this.signal_colors.filter(x => x.singal_name === signal_name).map(x => x.color)
                const t = await this.browser.createTrack(tconf)
                if (t) {
                    t.autoscale = false     // Scaling done from merged track
                    this.tracks.push(t)
                } else {
                    console.warn("Could not create track " + tconf)
                }

                if (typeof t.postInit === 'function') {
                    p.push(t.postInit())
                }
                i++
            }

        }


        this.flipAxis = this.config.flipAxis ? this.config.flipAxis : false
        this.logScale = this.config.logScale ? this.config.logScale : false
        this.autoscale = this.config.autoscale
        if (!this.autoscale) {
            this.dataRange = {
                min: this.config.min || 0,
                max: this.config.max
            }
        }
        for (let t of this.tracks) {
            t.autoscale = false
            t.dataRange = this.dataRange
        }
        return Promise.all(p)
    }

    update_hasChroms(wigFeatures, chroms){
        for (let binSize in wigFeatures){
            if (!this.hasChroms[binSize]) {
                this.hasChroms[binSize] = new Set();
            }
            chroms.forEach(item => this.hasChroms[binSize].add(item))

        }
        return this.hasChroms

    }

    async getFeatures(chr, bpStart, bpEnd, bpPerPixel) {
        
        if(Object.keys(this.hasChroms).length > 0) {
            
            // Need to find the current binSize
            if (this.hasChroms[this.bin_size].size != 0){
                let chroms = [ ...new Set(this.browser.referenceFrameList.map(val => val.chr))]
                if(chroms[0] == "all"){
                    chroms = this.browser.genome.chromosomeNames
                }
                let newChroms = chroms.filter(val => !this.hasChroms[this.bin_size].has(val))

                if(newChroms.length != 0){

                    let aliasRecords = this.getAliasChromsList(newChroms)
                    // update the hasChroms list
                    let tmp_wig = await this.cnvpytor_obj.get_rd_signal(this.bin_size, aliasRecords)

                    this.update_hasChroms(tmp_wig, newChroms)

                    // here we need to update the wig
                    // this part is probaby not required; code improve required
                    
                    for (let bin_size in tmp_wig){
                        for (const [signal_name, wig] of Object.entries(tmp_wig[bin_size])) {
                            await this.wigFeatures_obj[bin_size][signal_name].push(...wig)
                        }
                    }

                    for (let wig of this.tracks){
                        await wig.featureSource.updateFeatures(this.wigFeatures_obj[this.bin_size][wig.name] )
                    }
                }
            }

        }

        if (this.tracks) {
            const promises = this.tracks.map((t) => t.getFeatures(chr, bpStart, bpEnd, bpPerPixel))
            return Promise.all(promises)
        } else {
            return undefined  // This can happen if a redraw is triggered before the track has initialized.
        }
    }

    // TODO: refactor to igvUtils.js
    getScaleFactor(min, max, height, logScale) {
        const scale = logScale ? height / (Math.log10(max + 1) - (min <= 0 ? 0 : Math.log10(min + 1))) : height / (max - min)
        return scale
    }

    computeYPixelValue(yValue, yScaleFactor) {
        return (this.flipAxis ? (yValue - this.dataRange.min) : (this.dataRange.max - yValue)) * yScaleFactor
    }

    computeYPixelValueInLogScale(yValue, yScaleFactor) {
        let maxValue = this.dataRange.max
        let minValue = this.dataRange.min
        if (maxValue <= 0) return 0 // TODO:
        if (minValue <= -1) minValue = 0
        minValue = (minValue <= 0) ? 0 : Math.log10(minValue + 1)
        maxValue = Math.log10(maxValue + 1)
        yValue = Math.log10(yValue + 1)
        return ((this.flipAxis ? (yValue - minValue) : (maxValue - yValue)) * yScaleFactor)
    }

    draw(options) {

        // const mergedFeatures = options.features    // Array of feature arrays, 1 for each track
        const mergedFeatures = options.features
        if (!mergedFeatures) return

        if (this.defaultScale) {
            if (this.signal_name == 'rd_snp') {
                this.dataRange = {
                    min: this.config.min || this.dataRange.min || -1,
                    max: this.config.max || this.dataRange.max || 5
                }
            } else if (this.signal_name == 'rd') {
                this.dataRange = {
                    min: this.config.min || this.dataRange.min || 0,
                    max: this.config.max || this.dataRange.max || 5
                }
            } else if (this.signal_name == 'snp') {
                this.dataRange = {
                    min: this.config.min || this.dataRange.min || -1,
                    max: this.config.max || this.dataRange.max || 0
                }
            }
        }

        if (this.autoscale) {
            this.dataRange = autoscale(options.referenceFrame.chr, mergedFeatures)
        }

        if (this.tracks) {
            for (let i = 0, len = this.tracks.length; i < len; i++) {
                const trackOptions = Object.assign({}, options)
                trackOptions.features = mergedFeatures[i]
                this.tracks[i].dataRange = this.dataRange
                this.tracks[i].flipAxis = this.flipAxis
                this.tracks[i].logScale = this.logScale
                if (this.graphType) {
                    this.tracks[i].graphType = this.graphType
                }
                this.tracks[i].draw(trackOptions)
            }
        }

        // guides lines
        const scaleFactor = this.getScaleFactor(this.dataRange.min, this.dataRange.max, options.pixelHeight, this.logScale)
        const yScale = (yValue) => this.logScale
            ? this.computeYPixelValueInLogScale(yValue, scaleFactor)
            : this.computeYPixelValue(yValue, scaleFactor)

        // Draw guidelines
        if (this.config.hasOwnProperty('guideLines')) {
            for (let line of this.config.guideLines) {
                if (line.hasOwnProperty('color') && line.hasOwnProperty('y') && line.hasOwnProperty('dotted')) {
                    let y = yScale(line.y)
                    let props = {
                        'strokeStyle': line['color'],
                        'strokeWidth': 1
                    }
                    if (line['dotted']) IGVGraphics.dashedLine(options.context, 0, y, options.pixelWidth, y, 5, props)
                    else IGVGraphics.strokeLine(options.context, 0, y, options.pixelWidth, y, props)
                }
            }
        }

        let props = {
            'strokeStyle': 'lightgray',
            'strokeWidth': 0.5
        }
        let y = yScale(2)
        IGVGraphics.dashedLine(options.context, 0, y, options.pixelWidth, y, 5, props)

    }

    paintAxis(ctx, pixelWidth, pixelHeight) {

        var x1,
            x2,
            y1,
            y2,
            a,
            b,
            reference,
            shim,
            font = {
                'font': 'normal 10px Arial',
                'textAlign': 'right',
                'strokeStyle': "black"
            }

        if (undefined === this.dataRange || undefined === this.dataRange.max || undefined === this.dataRange.min) {
            return
        }

        let flipAxis = (undefined === this.flipAxis) ? false : this.flipAxis

        IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})

        reference = 0.95 * pixelWidth
        x1 = reference - 8
        x2 = reference

        //shim = 0.5 * 0.125;
        shim = .01
        y1 = y2 = shim * pixelHeight

        a = {x: x2, y: y1}

        // tick
        IGVGraphics.strokeLine(ctx, x1, y1, x2, y2, font)
        IGVGraphics.fillText(ctx, prettyPrint(flipAxis ? this.dataRange.min : this.dataRange.max), x1 + 4, y1 + 12, font)

        //shim = 0.25 * 0.125;
        y1 = y2 = (1.0 - shim) * pixelHeight

        b = {x: x2, y: y1}

        // tick
        IGVGraphics.strokeLine(ctx, x1, y1, x2, y2, font)
        IGVGraphics.fillText(ctx, prettyPrint(flipAxis ? this.dataRange.max : this.dataRange.min), x1 + 4, y1 - 4, font)

        IGVGraphics.strokeLine(ctx, a.x, a.y, b.x, b.y, font)

        function prettyPrint(number) {
            // if number >= 100, show whole number
            // if >= 1 show 1 significant digits
            // if <  1 show 2 significant digits

            // change the label for negative number to positive; For BAF likelihood section
            if(number < 0){
                return Math.abs(number)
            }

            if (number === 0) {
                return "0"
            } else if (Math.abs(number) >= 10) {
                return number.toFixed()
            } else if (number % 1 == 0) {
                return number.toFixed()
            } else if (Math.abs(number) >= 1) {
                return number.toFixed(1)
            } else {
                return number.toFixed(2)
            }
        }

        const scaleFactor = this.getScaleFactor(this.dataRange.min, this.dataRange.max, pixelHeight, this.logScale)
        const yScale = (yValue) => this.logScale
            ? this.computeYPixelValueInLogScale(yValue, scaleFactor)
            : this.computeYPixelValue(yValue, scaleFactor)

        const n = Math.ceil((this.dataRange.max - this.dataRange.min) / 10)
        for (let p = Math.ceil(this.dataRange.min + 1); p < Math.round(this.dataRange.max - 0.4); p += n) {
            const yp = yScale(p)
            IGVGraphics.strokeLine(ctx, 45, yp, 50, yp, font) // Offset dashes up by 2 pixel
            IGVGraphics.fillText(ctx, prettyPrint(flipAxis ? this.dataRange.max - p : p), 44, yp + 4, font)

        }

    }

    popupData(clickState, features) {

        const featuresArray = features || clickState.viewport.cachedFeatures

        if (featuresArray && featuresArray.length === this.tracks.length) {
            // Array of feature arrays, 1 for each track
            const popupData = []
            for (let i = 0; i < this.tracks.length; i++) {
                if (i > 0) popupData.push('<hr/>')
                popupData.push(`<div style=background-color:rgb(245,245,245);border-bottom-style:dashed;border-bottom-width:1px;padding-bottom:5px;padding-top:10px;font-weight:bold;font-size:larger >${this.tracks[i].name}</div>`)
                const trackPopupData = this.tracks[i].popupData(clickState, featuresArray[i])
                popupData.push(...trackPopupData)

            }
            return popupData
        }
    }

    /**
     * Applicable if this track was originally created from a VariantTrack -- attempt to convert it back
     * @returns {Promise<void>}
     */
    async convertToVariant() {

        if (this.variantState) {
            Object.setPrototypeOf(this, VariantTrack.prototype)
            this.init(this.variantState)
            await this.postInit()
            this.trackView.clearCachedFeatures()
            if(this.variantState.trackHeight) {
                this.trackView.setTrackHeight(this.variantState.trackHeight)
            }
            this.trackView.checkContentHeight()
            this.trackView.updateViews()
            delete this.variantState
        }
    }

}

function autoscale(chr, featureArrays) {

    let min = 0
    let max = -Number.MAX_VALUE
    for (let features of featureArrays) {
        for (let f of features) {
            if (typeof f.value !== 'undefined' && !Number.isNaN(f.value)) {
                min = Math.min(min, f.value)
                max = Math.max(max, f.value)
            }
        }
    }
    return {min: min, max: max}
}

export default CNVPytorTrack
