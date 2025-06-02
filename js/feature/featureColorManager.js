import {ColorTable, PaletteColorTable} from "../util/colorPalletes.js"
import {IGVColor} from 'igv-utils'

export default class FeatureColorManager {
    static defaultColor = 'rgb(0,0,150)'

    constructor(config) {
        this.color = config.color
        this.altColor = config.altColor
        this.colorBy = config.colorBy
        this.useScore = config.useScore || false
        this._initialColor = this.color || this.constructor.defaultColor
        this._initialAltColor = this.altColor || this.constructor.defaultColor

        // Set up color table if colorBy is specified
        if (config.colorBy)
            if (config.colorBy.field) {
                config.colorTable = config.colorBy.pallete || config.colorBy.palette
                config.colorBy = config.colorBy.field
            }
            this.colorBy = config.colorBy
            if (config.colorTable) {
                this.colorTable = new ColorTable(config.colorTable)
            } else {
                this.colorTable = new PaletteColorTable("Set1")
            }
        }
    }

    getColorForFeature(f) {
        const feature = f._f || f    // f might be a "whole genome" wrapper

        let color

        if (f.name && this.browser.qtlSelections.hasPhenotype(f.name)) {
            color = this.browser.qtlSelections.colorForGene(f.name)
        } else if (this.altColor && "-" === feature.strand) {
            color = (typeof this.altColor === "function") ? this.altColor(feature) : this.altColor
        } else if (this.color) {
            color = (typeof this.color === "function") ? this.color(feature) : this.color
        } else if (this.colorBy) {
            const value = feature.getAttributeValue ?
                feature.getAttributeValue(this.colorBy) :
                feature[this.colorBy]
            color = this.colorTable.getColor(value)
        } else if (feature.color) {
            color = feature.color
        }

        // If no explicit setting use the default
        if (!color) {
            color = FeatureColorManager.defaultColor
        }

        if (feature.alpha && feature.alpha !== 1) {
            color = IGVColor.addAlpha(color, feature.alpha)
        } else if (this.useScore && feature.score && !Number.isNaN(feature.score)) {
            const min = this.config.min ? this.config.min : this.viewLimitMin ? this.viewLimitMin : 0
            const max = this.config.max ? this.config.max : this.viewLimitMax ? this.viewLimitMax : 1000
            const alpha = this.getAlpha(min, max, feature.score)
            feature.alpha = alpha
            color = IGVColor.addAlpha(color, alpha)
        }

        return color
    }

    getAlpha(min, max, score) {
        const binWidth = (max - min) / 9
        const binNumber = Math.floor((score - min) / binWidth)
        return Math.min(1.0, 0.2 + (binNumber * 0.8) / 9)
    }
}
