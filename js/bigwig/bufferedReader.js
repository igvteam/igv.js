/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {igvxhr} from "../../node_modules/igv-utils/src/index.js";
import {buildOptions} from "../util/igvUtils.js";

class BufferedReader {

    constructor(config, contentLength, bufferSize) {
        this.path = config.url;
        this.bufferSize = bufferSize ? bufferSize : 512000;
        this.range = {start: -1, size: -1};
        this.config = config;
    }

    /**
     *
     * @param requestedRange - byte rangeas {start, size}
     * @param fulfill - function to receive result
     * @param asUint8 - optional flag to return result as an UInt8Array
     */
    async dataViewForRange(requestedRange, asUint8) {

        const hasData = (this.data && (this.range.start <= requestedRange.start) &&
            ((this.range.start + this.range.size) >= (requestedRange.start + requestedRange.size)));

        if (!hasData) {
            let bufferSize;
            // If requested range size is specified, potentially expand buffer size
            if (requestedRange.size) {
                bufferSize = Math.max(this.bufferSize, requestedRange.size);
            } else {
                bufferSize = this.bufferSize;
            }
            const loadRange = {start: requestedRange.start, size: bufferSize};
            const arrayBuffer = await igvxhr.loadArrayBuffer(this.path, buildOptions(this.config, {range: loadRange}));
            this.data = arrayBuffer;
            this.range = loadRange;
        }

        const len = this.data.byteLength;
        const bufferStart = requestedRange.start - this.range.start
        return asUint8 ?
            new Uint8Array(this.data, bufferStart, len - bufferStart) :
            new DataView(this.data, bufferStart, len - bufferStart);
    }
}

export default BufferedReader
