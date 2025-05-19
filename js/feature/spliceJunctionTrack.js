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

import FeatureSource from './featureSource.js'
import TrackBase from "../trackBase.js"
import IGVGraphics from "../igv-canvas.js"
import {PaletteColorTable} from "../util/colorPalletes.js"

let JUNCTION_MOTIF_PALETTE = new PaletteColorTable("Dark2")

// Lock in color-to-motif mapping so it's independent of data loading order. This list may not include all possible
// motif values as this varies depending on the RNA-seq pipeline. The current list is based on STAR v2.4 docs.
const someMotifValues = ['GT/AG', 'CT/AC', 'GC/AG', 'CT/GC', 'AT/AC', 'GT/AT', 'non-canonical']
someMotifValues.forEach(motif => {
    JUNCTION_MOTIF_PALETTE.getColor(motif)
})


class SpliceJunctionTrack extends TrackBase {

    static defaults = {
        margin: 10,
        colorByNumReadsThreshold: 5,
        height: 100
    }

    constructor(config, browser) {
        super(config, browser)
    }


    init(config) {

        super.init(config)

        this.type = config.type || 'junctions'

        if (config._featureSource) {
            this.featureSource = config._featureSource
            delete config._featureSource
        } else {
            this.featureSource = config.featureSource ?
                config.featureSource :
                FeatureSource(config, this.browser.genome)
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

    get supportsWholeGenome() {
        return false
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
        return this.height
    };

    draw(options) {

        const featureList = options.features
        const ctx = options.context
        const bpPerPixel = options.bpPerPixel
        const bpStart = options.bpStart
        const pixelWidth = options.pixelWidth
        const pixelHeight = options.pixelHeight
        const bpEnd = bpStart + pixelWidth * bpPerPixel + 1


        if (!this.isMergedTrack) {
            IGVGraphics.fillRect(ctx, 0, options.pixelTop, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"})
        }

        if (featureList) {


            // rendering context with values that only need to be computed once per render, rather than for each splice junction
            const junctionRenderingContext = {}

            junctionRenderingContext.referenceFrame = options.viewport.referenceFrame
            junctionRenderingContext.referenceFrameStart = junctionRenderingContext.referenceFrame.start
            junctionRenderingContext.referenceFrameEnd = junctionRenderingContext.referenceFrameStart +
                junctionRenderingContext.referenceFrame.toBP(options.viewport.getWidth())

            // For a given viewport, records where features that are < 2px in width have been rendered already.
            // This prevents wasteful rendering of multiple such features onto the same pixels.
            junctionRenderingContext.featureZoomOutTracker = {}

            for (let feature of featureList) {
                if (feature.end < bpStart) continue
                if (feature.start > bpEnd) break
                this.renderJunction(feature, bpStart, bpPerPixel, pixelHeight, ctx, junctionRenderingContext)
            }

        } else {
            console.log("No feature list")
        }

    };

    /**
     *
     * @param feature
     * @param bpStart  genomic location of the left edge of the current canvas
     * @param xScale  scale in base-pairs per pixel
     * @param pixelHeight  pixel height of the current canvas
     * @param ctx  the canvas 2d context
     */
    renderJunction(feature, bpStart, xScale, pixelHeight, ctx, junctionRenderingContext) {
        // cache whether this junction is rendered or filtered out. Use later to exclude non-rendered junctions from click detection.
        feature.isVisible = false

        const junctionLeftPx = Math.round((feature.start - bpStart) / xScale)
        const junctionRightPx = Math.round((feature.end - bpStart) / xScale)
        const junctionMiddlePx = (junctionLeftPx + junctionRightPx) / 2
        if (junctionRightPx - junctionLeftPx <= 3) {
            if (junctionMiddlePx in junctionRenderingContext.featureZoomOutTracker) {
                return
            }
            junctionRenderingContext.featureZoomOutTracker[junctionMiddlePx] = true
        }

        // TODO: cache filter and pixel calculations by doing them earlier when features are initially parsed?
        if (this.config.hideAnnotatedJunctions && feature.attributes.annotated_junction === "true") {
            return
        }
        if (this.config.hideUnannotatedJunctions && feature.attributes.annotated_junction === "false") {
            return
        }
        if (this.config.hideMotifs && this.config.hideMotifs.includes(feature.attributes.motif)) {
            return
        }
        if (this.config.hideStrand === feature.strand) {
            return
        }

        // check if splice junction is inside viewport
        if (this.config.minJunctionEndsVisible) {
            let numJunctionEndsVisible = 0
            if (feature.start >= junctionRenderingContext.referenceFrameStart && feature.start <= junctionRenderingContext.referenceFrameEnd) {
                numJunctionEndsVisible += 1
            }
            if (feature.end >= junctionRenderingContext.referenceFrameStart && feature.end <= junctionRenderingContext.referenceFrameEnd) {
                numJunctionEndsVisible += 1
            }
            if (numJunctionEndsVisible < this.config.minJunctionEndsVisible) {
                return
            }
        }

        let uniquelyMappedReadCount
        let multiMappedReadCount
        let totalReadCount
        if (feature.attributes.uniquely_mapped) {
            uniquelyMappedReadCount = parseInt(feature.attributes.uniquely_mapped)
            if (uniquelyMappedReadCount < this.config.minUniquelyMappedReads) {
                return
            }
            multiMappedReadCount = parseInt(feature.attributes.multi_mapped)
            totalReadCount = uniquelyMappedReadCount + multiMappedReadCount
            if (totalReadCount < this.config.minTotalReads) {
                return
            }
            if (totalReadCount > 0 && multiMappedReadCount / totalReadCount > this.config.maxFractionMultiMappedReads) {
                return
            }
            if (feature.attributes.maximum_spliced_alignment_overhang && parseInt(feature.attributes.maximum_spliced_alignment_overhang) < this.config.minSplicedAlignmentOverhang) {
                return
            }
        }

        let numSamplesWithThisJunction
        if (feature.attributes.num_samples_with_this_junction) {
            numSamplesWithThisJunction = parseInt(feature.attributes.num_samples_with_this_junction)
            if (this.config.minSamplesWithThisJunction && numSamplesWithThisJunction < this.config.minSamplesWithThisJunction) {
                return
            }
            if (this.config.maxSamplesWithThisJunction && numSamplesWithThisJunction > this.config.maxSamplesWithThisJunction) {
                return
            }
            if (feature.attributes.num_samples_total) {
                feature.attributes.percent_samples_with_this_junction = 100 * numSamplesWithThisJunction / Number(feature.attributes.num_samples_total)
                if (this.config.minPercentSamplesWithThisJunction) {
                    if (feature.attributes.percent_samples_with_this_junction < this.config.minPercentSamplesWithThisJunction ||
                        feature.attributes.percent_samples_with_this_junction > this.config.maxPercentSamplesWithThisJunction) {
                        return
                    }
                }
            }
        }

        const py = this.margin
        const rowHeight = pixelHeight

        const cy = py + 0.5 * rowHeight
        let topY = py
        const bottomY = py + rowHeight
        const bezierBottomY = bottomY - 10

        // draw the junction arc
        const bezierControlLeftPx = (junctionLeftPx + junctionMiddlePx) / 2
        const bezierControlRightPx = (junctionMiddlePx + junctionRightPx) / 2

        let lineWidth = 1
        if (feature.attributes.line_width) {
            lineWidth = Number(feature.attributes.line_width)
        } else {
            if (this.config.thicknessBasedOn === undefined || this.config.thicknessBasedOn === 'numUniqueReads') {
                lineWidth = uniquelyMappedReadCount
            } else if (this.config.thicknessBasedOn === 'numReads') {
                lineWidth = totalReadCount
            } else if (this.config.thicknessBasedOn === 'numSamplesWithThisJunction') {
                if (numSamplesWithThisJunction !== undefined) {
                    lineWidth = numSamplesWithThisJunction
                }
            }
            lineWidth = 1 + Math.log(lineWidth + 1) / Math.log(12)
        }

        let bounceHeight
        if (this.config.bounceHeightBasedOn === undefined || this.config.bounceHeightBasedOn === 'random') {
            // randomly but deterministically stagger topY coordinates to reduce overlap
            bounceHeight = (feature.start + feature.end) % 7
        } else if (this.config.bounceHeightBasedOn === 'distance') {
            bounceHeight = 6 * (feature.end - feature.start) / (junctionRenderingContext.referenceFrameEnd - junctionRenderingContext.referenceFrameStart)
        } else if (this.config.bounceHeightBasedOn === 'thickness') {
            bounceHeight = 2 * lineWidth
        }
        topY += rowHeight * Math.max(7 - bounceHeight, 0) / 10

        let color
        if (feature.attributes.color) {
            color = feature.attributes.color  // Explicit setting
        } else if (this.config.colorBy === undefined || this.config.colorBy === 'numUniqueReads') {
            color = uniquelyMappedReadCount > this.config.colorByNumReadsThreshold ? 'blue' : '#AAAAAA'  // color gradient?
        } else if (this.config.colorBy === 'numReads') {
            color = totalReadCount > this.config.colorByNumReadsThreshold ? 'blue' : '#AAAAAA'
        } else if (this.config.colorBy === 'isAnnotatedJunction') {
            color = feature.attributes.annotated_junction === "true" ? '#b0b0ec' : 'orange'
        } else if (this.config.colorBy === 'strand') {
            color = feature.strand === "+" ? '#b0b0ec' : '#ecb0b0'
        } else if (this.config.colorBy === 'motif') {
            color = JUNCTION_MOTIF_PALETTE.getColor(feature.attributes.motif)
        } else {
            color = '#AAAAAA'
        }

        let label = ""
        if (feature.attributes.label) {
            label = feature.attributes.label.replace(/_/g, " ")
        } else if (this.config.labelWith === undefined || this.config.labelWith === 'uniqueReadCount') {
            //default label
            label = uniquelyMappedReadCount
        } else if (this.config.labelWith === 'totalReadCount') {
            label = totalReadCount
        } else if (this.config.labelWith === 'numSamplesWithThisJunction') {
            if (numSamplesWithThisJunction !== undefined) {
                label = numSamplesWithThisJunction
            }
        } else if (this.config.labelWith === 'percentSamplesWithThisJunction') {
            if (feature.attributes.percent_samples_with_this_junction !== undefined) {
                label = feature.attributes.percent_samples_with_this_junction.toFixed(0) + '%'
            }
        } else if (this.config.labelWith === 'motif') {
            if (feature.attributes.motif !== undefined) {
                label += feature.attributes.motif
            }
        }

        if (this.config.labelWithInParen === 'uniqueReadCount') {
            label += ' (' + uniquelyMappedReadCount + ')'
        } else if (this.config.labelWithInParen === 'totalReadCount') {
            label += ' (' + totalReadCount + ')'
        } else if (this.config.labelWithInParen === 'multiMappedReadCount') {
            if (multiMappedReadCount > 0) {
                label += ' (+' + multiMappedReadCount + ')'
            }
        } else if (this.config.labelWithInParen === 'numSamplesWithThisJunction') {
            if (numSamplesWithThisJunction !== undefined) {
                label += ' (' + numSamplesWithThisJunction + ')'
            }
        } else if (this.config.labelWithInParen === 'percentSamplesWithThisJunction') {
            if (feature.attributes.percent_samples_with_this_junction !== undefined) {
                label += ' (' + feature.attributes.percent_samples_with_this_junction.toFixed(0) + '%)'
            }
        } else if (this.config.labelWithInParen === 'motif') {
            if (feature.attributes.motif !== undefined) {
                label += ` ${feature.attributes.motif}`
            }
        }

        // data source: STAR splice junctions (eg. SJ.out.tab file converted to bed).
        // .bed "name" field used to store unique + multi-mapped read counts, so:
        // feature.score:  unique spanning read counts
        // feature.name:   unique + multi-mapped spanning read counts
        //example feature:  { chr: "chr17", start: 39662344, end: 39662803, name: "59", row: 0, score: 38, strand: "+"}
        feature.isVisible = true
        ctx.beginPath()
        ctx.moveTo(junctionLeftPx, bezierBottomY)
        ctx.bezierCurveTo(bezierControlLeftPx, topY, bezierControlRightPx, topY, junctionRightPx, bezierBottomY)

        ctx.lineWidth = lineWidth
        ctx.strokeStyle = color
        ctx.stroke()

        const drawArrowhead = (ctx, x, y, size) => {
            //TODO draw better arrow heads: https://stackoverflow.com/questions/21052972/curved-thick-arrows-on-canvas
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(x - size / 2, y - size)
            ctx.lineTo(x + size / 2, y - size)
            ctx.lineTo(x, y)
            ctx.closePath()
            ctx.fill()
        }

        if (feature.attributes.left_shape || feature.attributes.right_shape) {
            ctx.fillStyle = color
            const arrowSize = ctx.lineWidth > 2 ? 10 : 7
            if (feature.attributes.left_shape) {
                drawArrowhead(ctx, junctionLeftPx, bezierBottomY, arrowSize)
            }
            if (feature.attributes.right_shape) {
                drawArrowhead(ctx, junctionRightPx, bezierBottomY, arrowSize)
            }
        }

        ctx.fillText(label, junctionMiddlePx - ctx.measureText(label).width / 2, (7 * topY + cy) / 8)
    }

    clickedFeatures(clickState) {

        const allFeatures = super.clickedFeatures(clickState)

        return allFeatures.filter(function (feature) {
            return (feature.isVisible && feature.attributes)
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

            const featureData = (typeof feature.popupData === "function") ?
                feature.popupData(genomicLocation) :
                this.extractPopupData(feature._f || feature, this.getGenomeId())

            if (featureData) {
                if (data.length > 0) {
                    data.push("<hr/><hr/>")
                }

                Array.prototype.push.apply(data, featureData)
            }
        }

        return data
    }

    /**
     * Called when the track is removed.  Do any needed cleanup here
     */
    dispose() {
        this.trackView = undefined
    }
}

export default SpliceJunctionTrack
