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
import FeatureSource from './featureSource.js'
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import {createCheckbox} from "../igv-icons.js"
import {reverseComplementSequence} from "../util/sequenceUtils.js"
import {renderFeature} from "./render/renderFeature.js"
import {renderSnp} from "./render/renderSnp.js"
import {renderFusionJuncSpan} from "./render/renderFusionJunction.js"
import {StringUtils} from "../../node_modules/igv-utils/src/index.js"
import {ColorTable, PaletteColorTable} from "../util/colorPalletes.js"
import {isSecureContext} from "../util/igvUtils.js"


class FeatureTrack extends TrackBase {

    constructor(config, browser) {
        super(config, browser)
    }

    init(config) {
        super.init(config)

        this.type = config.type || "annotation"

        // Set maxRows -- protects against pathological feature packing cases (# of rows of overlapping feaures)
        this.maxRows = config.maxRows === undefined ? 1000 : config.maxRows

        this.displayMode = config.displayMode || "EXPANDED"    // COLLAPSED | EXPANDED | SQUISHED
        this.labelDisplayMode = config.labelDisplayMode

        if (config._featureSource) {
            this.featureSource = config._featureSource
            delete config._featureSource
        } else {
            this.featureSource = config.featureSource ?
                config.featureSource :
                FeatureSource(config, this.browser.genome)
        }

        // Set default heights
        this.autoHeight = config.autoHeight
        this.margin = config.margin === undefined ? 10 : config.margin

        this.featureHeight = config.featureHeight || 14

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

        //UCSC useScore option
        this.useScore = config.useScore

        // JuiceboxJS compatibility
        if ('refgene' === config.format) {
            this.removable = true
            this.format = config.format
            console.log(`Feature Track - type ${ this.type } config.format(${ config.format }) format ${ this.format }`)
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

        return this

    }

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
    };


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

    draw(options) {

        const featureList = options.features
        const ctx = options.context
        const bpPerPixel = options.bpPerPixel
        const bpStart = options.bpStart
        const pixelWidth = options.pixelWidth
        const pixelHeight = options.pixelHeight
        const bpEnd = bpStart + pixelWidth * bpPerPixel + 1


        if (!this.config.isMergedTrack) {
            IGVGraphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})
        }

        if (featureList) {

            const rowFeatureCount = []
            options.rowLastX = []
            options.rowLastLabelX = []
            for (let feature of featureList) {
                if (feature.start > bpStart && feature.end < bpEnd) {
                    const row = this.displayMode === "COLLAPSED" ? 0 : feature.row || 0
                    if (rowFeatureCount[row] === undefined) {
                        rowFeatureCount[row] = 1
                    } else {
                        rowFeatureCount[row]++
                    }
                    options.rowLastX[row] = -Number.MAX_SAFE_INTEGER
                    options.rowLastLabelX[row] = -Number.MAX_SAFE_INTEGER
                }
            }
            const maxFeatureCount = Math.max(1, Math.max(...rowFeatureCount))
            const pixelsPerFeature = pixelWidth / maxFeatureCount

            let lastPxEnd = []
            for (let feature of featureList) {
                if (feature.end < bpStart) continue
                if (feature.start > bpEnd) break
                const row = this.displayMode === 'COLLAPSED' ? 0 : feature.row
                options.drawLabel = options.labelAllFeatures || pixelsPerFeature > 10
                const pxEnd = Math.ceil((feature.end - bpStart) / bpPerPixel)
                const last = lastPxEnd[row]
                if (!last || pxEnd > last) {
                    this.render.call(this, feature, bpStart, bpPerPixel, pixelHeight, ctx, options)

                    // Ensure a visible gap between features
                    const pxStart = Math.floor((feature.start - bpStart) / bpPerPixel)
                    if (last && pxStart - last <= 0) {
                        ctx.globalAlpha = 0.5
                        IGVGraphics.strokeLine(ctx, pxStart, 0, pxStart, pixelHeight, {'strokeStyle': "rgb(255, 255, 255)"})
                        ctx.globalAlpha = 1.0
                    }
                    lastPxEnd[row] = pxEnd
                }
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
                if (f.exons) {
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
            for (let colorScheme of ["function", "class"]) {
                menuItems.push({
                    object: $(createCheckbox('Color by ' + colorScheme, colorScheme === this.colorBy)),
                    click: () => {
                        this.colorBy = colorScheme
                        this.trackView.repaintViews()
                    }
                })
            }
        }

        menuItems.push('<hr/>')
        for (let displayMode of ["COLLAPSED", "SQUISHED", "EXPANDED"]) {
            const lut =
                {
                    "COLLAPSED": "Collapse",
                    "SQUISHED": "Squish",
                    "EXPANDED": "Expand"
                }

            menuItems.push(
                {
                    object: $(createCheckbox(lut[displayMode], displayMode === this.displayMode)),
                    click: () => {
                        this.displayMode = displayMode
                        this.config.displayMode = displayMode
                        this.trackView.checkContentHeight()
                        this.trackView.repaintViews()
                    }
                })
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
            track.trackView.repaintViews()      // TODO -- refine this to the viewport that was dragged after DOM refactor
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
