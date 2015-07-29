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

/**
 * Created by jrobinso on 4/7/14.
 */


var igv = (function (igv) {


    igv.BufferedReader = function (config, contentLength, bufferSize) {
        this.path = config.url;
        this.contentLength = contentLength;
        this.bufferSize = bufferSize ? bufferSize : 512000;
        this.range = {start: -1, size: -1};
        this.config = config;
    }

    /**
     *
     * @param requestedRange - byte rangeas {start, size}
     * @param continutation - function to receive result
     * @param asUint8 - optional flag to return result as an UInt8Array
     */
    igv.BufferedReader.prototype.dataViewForRange = function (requestedRange, continutation, asUint8) {

        var self = this,
            hasData = (this.data && (this.range.start <= requestedRange.start) &&
            ((this.range.start + this.range.size) >= (requestedRange.start + requestedRange.size))),
            bufferSize,
            loadRange;

        if (hasData) {
            subbuffer(self, requestedRange, asUint8);
        }
        else {
            // Expand buffer size if needed, but not beyond content length
            bufferSize = Math.max(this.bufferSize, requestedRange.size);

            if (this.contentLength > 0 && requestedRange.start + bufferSize > this.contentLength) {
                loadRange = {start: requestedRange.start};
            }
            else {
                loadRange = {start: requestedRange.start, size: bufferSize};
            }

            igvxhr.loadArrayBuffer(self.path,
                {
                    headers: this.config.headers,
                    range: loadRange,
                    success: function (arrayBuffer) {
                        // TODO -- handle error

                        self.data = arrayBuffer;
                        self.range = loadRange;
                        subbuffer(self, requestedRange, asUint8);
                    }
                });

        }


        function subbuffer(bufferedReader, requestedRange, asUint8) {

            var len = bufferedReader.data.byteLength,
                bufferStart = requestedRange.start - bufferedReader.range.start,
                result = asUint8 ?
                    new Uint8Array(bufferedReader.data, bufferStart, len - bufferStart) :
                    new DataView(bufferedReader.data, bufferStart, len - bufferStart);
            continutation(result);
        }


    }


    return igv;

})(igv || {});