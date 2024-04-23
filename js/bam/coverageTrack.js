import paintAxis from "../util/paintAxis.js"
import {IGVColor, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import IGVGraphics from "../igv-canvas.js"
import {drawModifications} from "./mods/baseModificationCoverageRenderer.js"

const DEFAULT_COVERAGE_COLOR = "rgb(150, 150, 150)"

class CoverageTrack  {


    constructor(config, parent) {
        this.parent = parent
        this.featureSource = parent.featureSource

        this.paintAxis = paintAxis
        this.top = 0

        this.autoscale = config.autoscale || config.max === undefined
        if(config.coverageColor) {
            this.color = config.coverageColor
        }

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
        if (this.color) {
            color = this.color
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

export default CoverageTrack