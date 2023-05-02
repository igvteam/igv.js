class BufferedFile {

    constructor(args) {
        this.file = args.file
        this.size = args.size || 64000
        this.position = 0
        this.bufferStart = 0
        this.bufferLength = 0
        this.buffer = undefined
    }


    async read(position, length) {

        const start = position
        const end = position + length
        const bufferStart = this.bufferStart
        const bufferEnd = this.bufferStart + this.bufferLength


        if (length > this.size) {
            // Request larger than max buffer size,  pass through to underlying file
            //console.log("0")
            this.buffer = undefined
            this.bufferStart = 0
            this.bufferLength = 0
            return this.file.read(position, length)
        }

        if (start >= bufferStart && end <= bufferEnd) {
            // Request within buffer bounds
            //console.log("1")
            const sliceStart = start - bufferStart
            const sliceEnd = sliceStart + length
            return this.buffer.slice(sliceStart, sliceEnd)
        }

        else if (start < bufferStart && end > bufferStart) {
            // Overlap left, here for completness but this is an unexpected case in straw.  We don't adjust the buffer.
            //console.log("2")
            const l1 = bufferStart - start
            const a1 = await this.file.read(position, l1)
            const l2 = length - l1
            if (l2 > 0) {
                //this.buffer = await this.file.read(bufferStart, this.size)
                const a2 = this.buffer.slice(0, l2)
                return concatBuffers(a1, a2)
            } else {
                return a1
            }

        }

        else if (start < bufferEnd && end > bufferEnd) {
            // Overlap right
            // console.log("3")
            const l1 = bufferEnd - start
            const sliceStart = this.bufferLength - l1
            const a1 = this.buffer.slice(sliceStart, this.bufferLength)

            const l2 = length - l1
            if (l2 > 0) {
                try {
                    this.buffer = await this.file.read(bufferEnd, this.size)
                    this.bufferStart = bufferEnd
                    this.bufferLength = this.buffer.byteLength
                    const a2 = this.buffer.slice(0, l2)
                    return concatBuffers(a1, a2)
                } catch (e) {
                    // A "unsatisfiable range" error is expected here if we overlap past the end of file
                    if (e.code && e.code === 416) {
                        return a1
                    }
                    else {
                        throw e
                    }
                }

            } else {
                return a1
            }

        }

        else {
            // No overlap with buffer
            // console.log("4")
            this.buffer = await this.file.read(position, this.size)
            this.bufferStart = position
            this.bufferLength = this.buffer.byteLength
            return this.buffer.slice(0, length)
        }

    }

}

/**
 * concatenates 2 array buffers.
 * Credit: https://gist.github.com/72lions/4528834
 *
 * @private
 * @param {ArrayBuffers} buffer1 The first buffer.
 * @param {ArrayBuffers} buffer2 The second buffer.
 * @return {ArrayBuffers} The new ArrayBuffer created out of the two.
 */
var concatBuffers = function (buffer1, buffer2) {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
};


export default BufferedFile;