import {IGVMath} from "../../node_modules/igv-utils/src/index.js"

const defaultColorScaleConfig = {threshold: 2000, r: 0, g: 0, b: 255}

class HicColorScale {

    constructor(scale) {

        scale = scale || defaultColorScaleConfig
        this.threshold = scale.threshold;
        this.r = scale.r;
        this.g = scale.g;
        this.b = scale.b;
        this.cache = []
        this.nbins = 2000
        this.binsize = this.threshold / this.nbins
    }

    setThreshold(threshold) {
        this.threshold = threshold;
        this.cache = []
        this.binsize = this.threshold / this.nbins
    }

    getThreshold() {
        return this.threshold;
    }

    setColorComponents(components) {
        this.r = components.r;
        this.g = components.g;
        this.b = components.b;
        this.cache = []
    }

    getColorComponents() {
        return {
            r: this.r,
            g: this.g,
            b: this.b
        }
    }

    equals(cs) {
        return JSON.stringify(this) === JSON.stringify(cs);
    }

    getColor(value) {
        const low = 0;
        const bin = Math.floor(Math.min(this.threshold, value) / this.binsize)
        if (undefined === this.cache[bin]) {
            const alpha = (IGVMath.clamp(value, low, this.threshold) - low) / (this.threshold - low)
            this.cache[bin] = `rgba(${this.r},${this.g},${this.b}, ${alpha})`
        }
        return this.cache[bin]
    }

    stringify() {
        return "" + this.threshold + ',' + this.r + ',' + this.g + ',' + this.b;
    }
}


export default HicColorScale
