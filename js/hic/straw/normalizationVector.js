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


import BinaryParser from "./binary.js"

/**
 * @author Jim Robinson
 */

const Short_MIN_VALUE = -32768;
const DOUBLE = 8
const FLOAT = 4
const LONG = 8;
const INT = 4;

class NormalizationVector {

    constructor(file, filePosition, nValues, dataType) {
        this.file = file;
        this.filePosition = filePosition;
        this.nValues = nValues;
        this.dataType = dataType;
        this.cache = undefined;
    }

    async getValues(start, end) {

        if(!this.cache || start < this.cache.start || end > this.cache.end) {
            const adjustedStart = Math.max(0, start - 1000);
            const adjustedEnd = Math.min(this.nValues, end + 1000);
            const startPosition = this.filePosition + adjustedStart * this.dataType;
            const n = adjustedEnd - adjustedStart;
            const sizeInBytes = n  * this.dataType;
            const data = await this.file.read(startPosition, sizeInBytes);
            if (!data) {
                return undefined;
            }
            const parser = new BinaryParser(new DataView(data));

            const values = [];
            for (let i = 0; i < n; i++) {
                values[i] = this.dataType === DOUBLE ? parser.getDouble() : parser.getFloat();

            }
            this.cache = {
                start: adjustedStart,
                end: adjustedEnd,
                values: values
            }
        }

        const sliceStart = start - this.cache.start;
        const sliceEnd = sliceStart + (end - start);
        return this.cache.values.slice(sliceStart, sliceEnd);
    }

    getKey() {
        return NormalizationVector.getKey(this.type, this.chrIdx, this.unit, this.resolution);
    }


    static getNormalizationVectorKey(type, chrIdx, unit, resolution) {
        return type + "_" + chrIdx + "_" + unit + "_" + resolution;
    }
}



export default NormalizationVector;
