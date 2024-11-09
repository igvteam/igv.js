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

    defaultGradientScale: function (low, high) {

        return new GradientColorScale({
            "type": "doubleGradient",
            "low": low,
            "high": high,
            "lowColor": "rgb(46,56,183)",
            "highColor": "rgb(164,0,30)"
        })
    },

    defaultDivergingScale: function (low, mid, high) {
        return new DivergingGradientScale({
            "type": "doubleGradient",
            "low": 0,
            "mid": 0.25,
            "high": 0.5,
            "lowColor": "rgb(46,56,183)",
            "midColor": "white",
            "highColor": "rgb(164,0,30)"
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
    constructor({low, high, lowColor, highColor}) {
        this.type = 'gradient'
        this.setProperties({low, high, lowColor, highColor})
    }

    setProperties({low, high, lowColor, highColor}) {
        this.type = 'gradient'
        this.low = low
        this.high = high
        this._lowColor = lowColor
        this._highColor = highColor
        this.lowComponents = IGVColor.rgbComponents(lowColor)
        this.highComponents = IGVColor.rgbComponents(highColor)
    }

    get lowColor() {
        return this._lowColor
    }

    set lowColor(c) {
        this._lowColor = c
        this.lowComponents = IGVColor.rgbComponents(c)
    }

    get highColor() {
        return this._highColor
    }

    set highColor(c) {
        this._highColor = c
        this.highComponents = IGVColor.rgbComponents(c)
    }

    getColor(value) {

        if (value <= this.low) return this.lowColor
        else if (value >= this.high) return this.highColor

        const frac = (value - this.low) / (this.high - this.low)
        const r = Math.floor(this.lowComponents[0] + frac * (this.highComponents[0] - this.lowComponents[0]))
        const g = Math.floor(this.lowComponents[1] + frac * (this.highComponents[1] - this.lowComponents[1]))
        const b = Math.floor(this.lowComponents[2] + frac * (this.highComponents[2] - this.lowComponents[2]))

        return "rgb(" + r + "," + g + "," + b + ")"
    }

    /**
     * Return a simple json-like object, not a literaly json string
     * @returns {{high, low, highColor, lowColor}}
     */
    toJson() {
        return {
            type: this.type,
            low: this.low,
            high: this.high,
            lowColor: this.lowColor,
            highColor: this.highColor
        }
    }

    clone() {
        return new GradientColorScale(this.toJson())
    }

}

class DivergingGradientScale {

    constructor({lowColor, midColor, highColor, low, mid, high}) {
        this.type = 'diverging'
        this.setProperties({lowColor, midColor, highColor, low, mid, high})
    }

    setProperties({lowColor, midColor, highColor, low, mid, high}) {

        this.lowGradientScale = new GradientColorScale({
            lowColor: lowColor,
            highColor: midColor,
            low: low,
            high: mid
        })
        this.highGradientScale = new GradientColorScale({
            lowColor: midColor,
            highColor: highColor,
            low: mid,
            high: high
        })
    }

    getColor(value) {
        if (value < this.mid) {
            return this.lowGradientScale.getColor(value)
        } else {
            return this.highGradientScale.getColor(value)
        }
    }

    get low() {
        return this.lowGradientScale.low
    }

    set low(v) {
        this.lowGradientScale.low = v
    }

    get high() {
        return this.highGradientScale.high
    }

    set high(v) {
        this.highGradientScale.high = v
    }

    get mid() {
        return this.lowGradientScale.high
    }

    set mid(v) {
        this.lowGradientScale.high = v
        this.highGradientScale.low = v
    }

    get lowColor() {
        return this.lowGradientScale.lowColor
    }

    set lowColor(c) {
        this.lowGradientScale.lowColor = c
    }

    get highColor() {
        return this.highGradientScale.highColor
    }

    set highColor(c) {
        this.highGradientScale.highColor = c
    }

    get midColor() {
        return this.lowGradientScale.highColor
    }

    set midColor(c) {
        this.lowGradientScale.highColor = c
        this.highGradientScale.lowColor = c
    }


    /**
     * Return a simple json-like object, not a literaly json string
     * @returns {{high, mid, low, highColor, midColor, lowColor}}
     */
    toJson() {
        return {
            type: this.type,
            low: this.lowGradientScale.low,
            mid: this.mid,
            high: this.highGradientScale.high,
            lowColor: this.lowGradientScale.lowColor,
            midColor: this.midColor,
            highColor: this.highGradientScale.highColor
        }
    }

    clone() {
        return new DivergingGradientScale(this.toJson())
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
