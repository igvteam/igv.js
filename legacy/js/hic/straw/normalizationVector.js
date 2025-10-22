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
