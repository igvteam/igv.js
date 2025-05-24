import IGVGraphics from "../../igv-canvas.js"
import {aminoAcidSequenceRenderThreshold} from "./renderFeature.js"

export default class FeatureRenderer {
    constructor(config) {
        this.margin = config.margin || 10
        this.displayMode = config.displayMode || "EXPANDED"
        this.expandedRowHeight = config.expandedRowHeight || 30
        this.squishedRowHeight = config.squishedRowHeight || 15
        this.arrowSpacing = 30
    }

    draw(options) {
        const {features, context, bpPerPixel, bpStart, bpEnd, pixelWidth, pixelHeight, referenceFrame} = options

        // If drawing amino acids fetch cached sequence interval
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

            // Redraw selected features to ensure visibility in collapsed mode
            for (let feature of selectedFeatures) {
                options.drawLabel = true
                this.render.call(this, feature, bpStart, bpPerPixel, pixelHeight, context, options)
            }
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
} 