/**
 * Created by jrobinso on 4/7/14.
 */


var igv = (function (igv) {


    igv.BufferedReader = function (path, contentLength, bufferSize) {
        this.path = path;
        this.contentLength = contentLength;
        this.bufferSize = bufferSize ? bufferSize : 512000;
        this.range = {start: -1, size: -1};
    }

    /**
     *
     * @param requestedRange - byte rangeas {start, size}
     * @param continutation - function to receive result
     * @param asUint8 - optional flag to return result as an UInt8Array
     */
    igv.BufferedReader.prototype.dataViewForRange = function (requestedRange, continutation, asUint8) {

        var bufferedReader = this,
            hasData = (this.data && (this.range.start <= requestedRange.start) &&
                ((this.range.start + this.range.size) >= (requestedRange.start + requestedRange.size))),
            bufferSize,
            loadRange,
            dataLoader;

        if (hasData) {
            subbuffer(bufferedReader, requestedRange, asUint8);
        }
        else {
            // Expand buffer size if needed, but not beyond content length
            bufferSize = Math.max(this.bufferSize, requestedRange.size);
            if (this.contentLength > 0) {
                bufferSize = Math.min(bufferSize, this.contentLength - requestedRange.start - 1);
            }

            loadRange = {start: requestedRange.start, size: bufferSize};

            igvxhr.loadArrayBuffer(this.path,
                {
                    range: {start: requestedRange.start, size: bufferSize},
                    success: function (arrayBuffer) {
                        // TODO -- handle error

                        bufferedReader.data = arrayBuffer;
                        bufferedReader.range = loadRange;
                        subbuffer(bufferedReader, requestedRange, asUint8);
                    }
                });

        }


        function subbuffer(bufferedReader, requestedRange, asUint8) {

            var bufferStart = requestedRange.start - bufferedReader.range.start,
                result = asUint8 ?
                    new Uint8Array(bufferedReader.data, bufferStart, requestedRange.size) :
                    new DataView(bufferedReader.data, bufferStart, requestedRange.size);
            continutation(result);
        }


    }


    return igv;

})(igv || {});