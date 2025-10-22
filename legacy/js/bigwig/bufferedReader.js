
import {igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"

class BufferedReader {

    constructor(config, bufferSize = 512000) {
        this.path = config.url
        this.bufferSize = bufferSize
        this.range = {start: -1, size: -1}
        this.config = config
    }

    /**
     *
     * @param requestedRange - byte rangeas {start, size}
     * @param fulfill - function to receive result
     * @param asUint8 - optional flag to return result as an UInt8Array
     */
    async dataViewForRange(requestedRange, asUint8, retries = 0) {
        try {

            const hasData = (this.data && (this.range.start <= requestedRange.start) &&
                ((this.range.start + this.range.size) >= (requestedRange.start + requestedRange.size)))

            if (!hasData) {
                let bufferSize
                // If requested range size is specified, potentially expand buffer size
                if (requestedRange.size) {
                    bufferSize = Math.max(this.bufferSize, requestedRange.size)
                } else {
                    bufferSize = this.bufferSize
                }
                if (this.contentLength) {
                    bufferSize = Math.min(bufferSize, this.contentLength - requestedRange.start)
                }
                const loadRange = {start: requestedRange.start, size: bufferSize}
                const arrayBuffer = await igvxhr.loadArrayBuffer(this.path, buildOptions(this.config, {range: loadRange}))
                this.data = arrayBuffer
                this.range = loadRange
            }

            const len = this.data.byteLength
            const bufferStart = requestedRange.start - this.range.start
            return asUint8 ?
                new Uint8Array(this.data, bufferStart, len - bufferStart) :
                new DataView(this.data, bufferStart, len - bufferStart)
        } catch (e) {
            if (retries === 0 && e.message && e.message.startsWith("416")) {
                try {
                    this.contentLength = await igvxhr.getContentLength(this.path, buildOptions(this.config))
                    return this.dataViewForRange(requestedRange, asUint8, ++retries)
                } catch (e1) {
                    console.error(e1)
                }
                throw e
            }
        }
    }
}

export default BufferedReader
