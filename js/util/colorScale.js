import {IGVColor} from "../../node_modules/igv-utils/src/index.js"


const ColorScaleFactory = {

    fromJson: (obj) => {
        switch (obj.type) {
            case 'gradient':
                return new GradientColorScale(obj)
            case 'doubleGradient':
            case 'diverging':
                return new DivergingGradientScale(obj)
            default:
                throw Error("Unknown color scale type: " + obj)
        }
    },

    defaultGradientScale: function (min, max) {

        return new GradientColorScale({
            "type": "doubleGradient",
            "min": min,
            "max": max,
            "minColor": "rgb(46,56,183)",
            "maxColor": "rgb(164,0,30)"
        })
    },

    defaultDivergingScale: function (min, mid, max) {
        return new DivergingGradientScale({
            "type": "doubleGradient",
            "min": 0,
            "mid": 0.25,
            "max": 0.5,
            "minColor": "rgb(46,56,183)",
            "midColor": "white",
            "maxColor": "rgb(164,0,30)"
        })
    }
}

/**
 *
 * @param cs - object containing
 * 1) array of threshold values defining bin boundaries in ascending order
 * 2) array of colors for bins  (length == thresholds.length + 1)
 * @constructor
 */
class BinnedColorScale {
    constructor(cs) {
        this.thresholds = cs.thresholds
        this.colors = cs.colors
    }

    getColor(value) {

        for (let threshold of this.thresholds) {
            if (value < threshold) {
                return this.colors[this.thresholds.indexOf(threshold)]
            }
        }

        return this.colors[this.colors.length - 1]
    }
}


class GradientColorScale {
    constructor(config) {
        this.type = 'gradient'
        const fixed = {
            min: config.min !== undefined ? config.min : config.low,
            max: config.max !== undefined ? config.max : config.high,
            minColor: config.minColor || config.lowColor,
            maxColor: config.maxColor || config.highColor
        }
        this.setProperties(fixed)
    }

    setProperties({min, max, minColor, maxColor}) {
        this.type = 'gradient'
        this.min = min
        this.max = max
        this._lowColor = minColor
        this._highColor = maxColor
        this.lowComponents = IGVColor.rgbComponents(minColor)
        this.highComponents = IGVColor.rgbComponents(maxColor)
    }

    get minColor() {
        return this._lowColor
    }

    set minColor(c) {
        this._lowColor = c
        this.lowComponents = IGVColor.rgbComponents(c)
    }

    get maxColor() {
        return this._highColor
    }

    set maxColor(c) {
        this._highColor = c
        this.highComponents = IGVColor.rgbComponents(c)
    }

    getColor(value) {

        if (value <= this.min) return this.minColor
        else if (value >= this.max) return this.maxColor

        const frac = (value - this.min) / (this.max - this.min)
        const r = Math.floor(this.lowComponents[0] + frac * (this.highComponents[0] - this.lowComponents[0]))
        const g = Math.floor(this.lowComponents[1] + frac * (this.highComponents[1] - this.lowComponents[1]))
        const b = Math.floor(this.lowComponents[2] + frac * (this.highComponents[2] - this.lowComponents[2]))

        return "rgb(" + r + "," + g + "," + b + ")"
    }

    /**
     * Return a simple json-like object, not a literaly json string
     * @returns {{max, min, maxColor, minColor}}
     */
    toJson() {
        return {
            type: this.type,
            min: this.min,
            max: this.max,
            minColor: this.minColor,
            maxColor: this.maxColor
        }
    }

    clone() {
        return new GradientColorScale(this.toJson())
    }

}

class DivergingGradientScale {

    constructor(json) {
        this.type = 'diverging'
        this.lowGradientScale = new GradientColorScale({
            minColor: json.minColor || json.lowColor,
            maxColor: json.midColor,
            min: json.min !== undefined ? json.min : json.low,
            max: json.mid
        })
        this.highGradientScale = new GradientColorScale({
            minColor: json.midColor,
            maxColor: json.maxColor || json.highColor,
            min: json.mid,
            max: json.max !== undefined ? json.max : json.high
        })
    }

    getColor(value) {
        if (value < this.mid) {
            return this.lowGradientScale.getColor(value)
        } else {
            return this.highGradientScale.getColor(value)
        }
    }

    get min() {
        return this.lowGradientScale.min
    }

    set min(v) {
        this.lowGradientScale.min = v
    }

    get max() {
        return this.highGradientScale.max
    }

    set max(v) {
        this.highGradientScale.max = v
    }

    get mid() {
        return this.lowGradientScale.max
    }

    set mid(v) {
        this.lowGradientScale.max = v
        this.highGradientScale.min = v
    }

    get minColor() {
        return this.lowGradientScale.minColor
    }

    set minColor(c) {
        this.lowGradientScale.minColor = c
    }

    get maxColor() {
        return this.highGradientScale.maxColor
    }

    set maxColor(c) {
        this.highGradientScale.maxColor = c
    }

    get midColor() {
        return this.lowGradientScale.maxColor
    }

    set midColor(c) {
        this.lowGradientScale.maxColor = c
        this.highGradientScale.minColor = c
    }


    /**
     * Return a simple json-like object, not a literaly json string
     * @returns {{max, mid, min, maxColor, midColor, minColor}}
     */
    toJson() {
        return {
            type: this.type,
            min: this.min,
            mid: this.mid,
            max: this.max,
            minColor: this.minColor,
            midColor: this.midColor,
            maxColor: this.maxColor
        }
    }

    clone() {
        const json = this.toJson()
        return new DivergingGradientScale(json)
    }
}

class ConstantColorScale {
    constructor(color) {
        this.color = color
    }

    getColor() {
        return this.color
    }
}


export {BinnedColorScale, GradientColorScale, ConstantColorScale, DivergingGradientScale, ColorScaleFactory}
