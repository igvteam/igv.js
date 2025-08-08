import {IGVMath} from "../../node_modules/igv-utils/src/index.js"

const defaultColorScaleConfig = {min: 0, max: 3000, color: "rgb(0,0,255)"}

class ShoeboxColorScale {

    constructor(scale) {

        scale = scale || defaultColorScaleConfig
        this.max = scale.max
        this.min = scale.min || 0
        this.cache = []
        this.nbins = 1000
        this.binsize = (this.max - this.min) / this.nbins
        this.updateColor(scale.color || "rgb(0,0,255)")
        this.br = 255
        this.bg = 255
        this.bb = 255

    }

    updateColor(color) {
        const comps = color.substring(4).replace(")", "").split(",")
        if (comps.length === 3) {
            this.r = Number.parseInt(comps[0].trim())
            this.g = Number.parseInt(comps[1].trim())
            this.b = Number.parseInt(comps[2].trim())
        }
        this.cache = []
    }

    setMinMax(min, max) {
        this.min = min
        this.max = max
        this.cache = []
        this.binsize = (this.max - this.min) / this.nbins
    }

    getColor(value) {
         if (value <= this.min) return "white"
        else if (value >= this.max) return `rgb(${this.r},${this.g},${this.b})`

        const bin = Math.floor((Math.min(this.max, value) - this.min) / this.binsize)

        if (undefined === this.cache[bin]) {
            const alpha = (value - this.min) / (this.max - this.min)
            const beta = 1 - alpha
            this.cache[bin] = //`rgba(${this.r},${this.g},${this.b}, ${alpha})`
                `rgb(${ Math.floor(alpha*this.r + beta*this.br)},${Math.floor(alpha*this.g + beta*this.bg)},${Math.floor(alpha*this.b + beta*this.bb)})`
        }
        return this.cache[bin]
    }

    /**
     *
     * @returns {{min: (*|number), color: string, max}}
     */
    toJson() {
        return {
            min: this.min,
            max: this.max,
            color: `rgb(${this.r},${this.g},${this.b})`
        }
    }

    // For short-term backward compatibility
    static parse(str) {

        const tokens = str.split(",")

        const cs = {
            min: Number.parseFloat(tokens[0]),
            max: Number.parseFloat(tokens[1]),
            color: `${tokens[2]},${tokens[3]},${tokens[4]}`
        }
        return new ShoeboxColorScale(cs)
    }

}


export default ShoeboxColorScale
