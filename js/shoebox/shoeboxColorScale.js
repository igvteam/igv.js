/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

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

    }
    updateColor(color) {
        const comps = color.substring(4).replace(")", "").split(",")
        if (comps.length === 3) {
            this.r = Number.parseInt(comps[0].trim())
            this.g = Number.parseInt(comps[1].trim())
            this.b = Number.parseInt(comps[2].trim())
        }
    }

    setMinMax(min, max) {
        this.min = min
        this.max = max
        this.cache = []
        this.binsize = (this.max - this.min) / this.nbins
    }

    getColor(value) {
        const low = 0
        if (value < this.min) return "white"

        const bin = Math.floor((Math.min(this.max, value) - this.min) / this.binsize)
        if (undefined === this.cache[bin]) {
            const alpha = (IGVMath.clamp(value, low, this.max) - low) / (this.max - low)
            this.cache[bin] = `rgba(${this.r},${this.g},${this.b}, ${alpha})`
        }
        return this.cache[bin]
    }

    stringify() {
        return "" + this.min + "," + this.max + ',' + `rgb(${this.r},${this.g},${this.b})`
    }

    static parse(string) {

       const tokens = str.split(",")

       const cs = {
            min: Number.parseFloat(tokens[0]),
            max: Number.parseFloat(tokens[1]),
            color: tokens[2]
        }
        return new ShoeboxColorScale(cs)
    }

}


export default ShoeboxColorScale
