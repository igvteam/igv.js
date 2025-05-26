import {aminoAcidSequenceRenderThreshold} from "./renderFeature.js"
import {renderFeature} from "./renderFeature.js"
import {renderSnp} from "./renderSnp.js"
import {renderFusionJuncSpan} from "./renderFusionJunction.js"
import IGVGraphics from "../../igv-canvas.js"

export default class FeatureRenderer {
    constructor(config) {
        this.margin = config.margin || 10
        this.displayMode = config.displayMode || "EXPANDED"
        this.expandedRowHeight = config.expandedRowHeight || 30
        this.squishedRowHeight = config.squishedRowHeight || 15
        this.arrowSpacing = 30
        this.featureHeight = config.featureHeight || 14
        this.labelDisplayMode = config.labelDisplayMode
        this.type = config.type
        this.snpColors = config.type === "SNP" ? ['rgb(0,0,0)', 'rgb(0,0,255)', 'rgb(0,255,0)', 'rgb(255,0,0)'] : undefined
        this.colorBy = config.colorBy
        this.color = config.color
        this.browser = config.browser
    }

    draw(options) {
        const {features, context, bpPerPixel, bpStart, bpEnd, pixelWidth, pixelHeight, referenceFrame} = options

        // If drawing amino acids fetch cached sequence interval
        if (bpPerPixel < aminoAcidSequenceRenderThreshold) {
            options.sequenceInterval = this.browser.genome.getSequenceInterval(referenceFrame.chr, bpStart, bpEnd)
        }

        // Replace IGVGraphics.fillRect with native canvas methods
        context.fillStyle = "rgb(255, 255, 255)"
        context.fillRect(0, options.pixelTop, pixelWidth, pixelHeight)

        if (features) {
            const rowFeatureCount = []
            options.rowLastX = []
            options.rowLastLabelX = []
            
            for (let feature of features) {
                if (this._filter && !this._filter(feature)) continue
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
                if (this._filter && !this._filter(feature)) continue
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
                    this.renderFeature(feature, bpStart, bpPerPixel, pixelHeight, context, options)

                    // Ensure a visible gap between features
                    const pxStart = Math.floor((feature.start - bpStart) / bpPerPixel)
                    if (last && pxStart - last <= 0) {
                        context.globalAlpha = 0.5
                        context.strokeStyle = "rgb(255, 255, 255)"
                        context.beginPath()
                        context.moveTo(pxStart, 0)
                        context.lineTo(pxStart, pixelHeight)
                        context.stroke()
                        context.globalAlpha = 1.0
                    }
                    lastPxEnd[row] = pxEnd
                }
            }

            // Redraw selected features to ensure visibility in collapsed mode
            for (let feature of selectedFeatures) {
                options.drawLabel = true
                this.renderFeature(feature, bpStart, bpPerPixel, pixelHeight, context, options)
            }
        }
    }

    renderFeature(feature, bpStart, xScale, pixelHeight, ctx, options) {
        switch(this.type) {
            case "SNP":
                renderSnp.call(this, feature, bpStart, xScale, pixelHeight, ctx)
                break
            case "FusionJuncSpan":
                renderFusionJuncSpan.call(this, feature, bpStart, xScale, pixelHeight, ctx)
                break
            default:
                renderFeature.call(this, feature, bpStart, xScale, pixelHeight, ctx, options)
        }
    }

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
    }

    getColorForFeature(feature) {
        if (this.colorBy === 'function') {
            return this.getColorByFunction(feature)
        } else if (this.colorBy === 'class') {
            return this.getColorByClass(feature)
        } else {
            return this.color || 'rgb(0,0,150)'
        }
    }

    getColorByFunction(feature) {
        const codingNonSynonSet = new Set(['nonsense', 'missense', 'stop-loss', 'frameshift', 'cds-indel'])
        const codingSynonSet = new Set(['coding-synon'])
        const spliceSiteSet = new Set(['splice-3', 'splice-5'])
        const untranslatedSet = new Set(['untranslated-5', 'untranslated-3'])
        const locusSet = new Set(['near-gene-3', 'near-gene-5'])
        const intronSet = new Set(['intron'])

        const funcArray = feature.func.split(',')
        const priorities = funcArray.map(func => {
            if (codingNonSynonSet.has(func) || spliceSiteSet.has(func)) {
                return 3
            } else if (codingSynonSet.has(func)) {
                return 2
            } else if (untranslatedSet.has(func)) {
                return 1
            } else {
                return 0
            }
        })

        const priority = Math.max(...priorities)
        return this.snpColors[priority]
    }

    getColorByClass(feature) {
        const cls = feature['class']
        if (cls === 'deletion') {
            return this.snpColors[3]
        } else if (cls === 'mnp') {
            return this.snpColors[2]
        } else if (cls === 'microsatellite' || cls === 'named') {
            return this.snpColors[1]
        } else {
            return this.snpColors[0]
        }
    }
}
