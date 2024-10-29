import {IGVColor} from "../../node_modules/igv-utils/src/index.js"


const ColorScaleFactory = {

    fromJson: (obj) => {

        switch(obj.type) {
            case 'gradient':
                return new GradientColorScale(obj)
            case 'doubleGradient':
                return new DoubleGradientScale(obj)
            default:
                throw Error("Unknown color scale type: " + obj)
        }
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

/**
 *
 * @param scale - object with the following properties
 *           low
 *           lowR
 *           lowG
 *           lowB
 *           high
 *           highR
 *           highG
 *           highB
 *
 * @constructor
 */
class GradientColorScale {
    constructor({low, high, lowColor, highColor}) {

        this.low = low
        this.high = high
        this.diff = high - low
        this.lowColor = lowColor
        this.highColor = highColor
        this.lowComponents = IGVColor.rgbComponents(this.lowColor)
        this.highComponents = IGVColor.rgbComponents(this.highColor)
    }

    getColor(value) {

        if (value <= this.low) return this.lowColor
        else if (value >= this.high) return this.highColor

        const frac = (value - this.low) / this.diff
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
            low: this.low,
            high: this.high,
            lowColor: this.lowColor,
            highColor: this.highColor
        }
    }

}

class DoubleGradientScale {

    constructor({lowColor, midColor, highColor, low, mid, high}) {
        this.mid = mid
        this.midColor = midColor
        this.lowGradientScale = new GradientColorScale({lowColor, highColor: midColor, low, high: mid})
        this.highGradientScale = new GradientColorScale({lowColor: midColor, highColor, low: mid, high})
    }

    getColor(value) {
        if (value < this.mid) {
            return this.lowGradientScale.getColor(value)
        } else if(value > this.mid) {
            return this.highGradientScale.getColor(value)
        } else {
            return this.midColor
        }
    }


    /**
     * Return a simple json-like object, not a literaly json string
     * @returns {{high, low, highColor, lowColor}}
     */
    toJson() {
        return {
            low: this.low,
            mid: this.mid,
            high: this.high,
            lowColor: this.lowColor,
            midColor: this.midColor,
            highColor: this.highColor
        }
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


export {BinnedColorScale, GradientColorScale, ConstantColorScale, DoubleGradientScale, ColorScaleFactory}
