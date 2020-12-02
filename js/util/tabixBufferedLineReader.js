import {buildOptions} from "../util/igvUtils.js";
import igvxhr from "../igvxhr.js";
import {bgzBlockSize, unbgzf} from "../bam/bgzf.js";

class TabixBufferedLineReader {

    constructor(config) {
        this.config = config;
        this.filePtr = 0;
        this.bufferPtr = 0;
        this.buffer;
    }

    async nextLine() {

        if(!this.bufferSize) {
            const bsizeOptions = buildOptions(this.config, {
                range: {
                    start: 0,
                    size: 26
                }
            });
            const abuffer = await igvxhr.loadArrayBuffer(this.config.url, bsizeOptions)
            this.bufferSize = bgzBlockSize(abuffer);
        }

        let result = undefined;

        try {
            while (true) {
                const length = this.buffer ? this.buffer.length : 0;
                while (this.bufferPtr < length) {
                    const c = String.fromCharCode(this.buffer[this.bufferPtr++]);
                    if (c === '\r') continue;
                    if (c === '\n') {
                        return result;
                    }
                    result = result ? result + c : c;
                }

                if (this.eof) {
                    return result;
                } else {
                    const options = buildOptions(this.config, {bgz: true, range: {start: this.filePtr, size: this.bufferSize}});
                    const data = await igvxhr.loadArrayBuffer(this.config.url, options);
                    this.filePtr += data.byteLength;
                    if (data.byteLength < this.bufferSize) {
                        this.eof = true; // Assumption
                    }
                    this.buffer = unbgzf(data);
                    this.bufferPtr = 0;
                }
            }
        } catch (e) {
            console.warn(e);
            this.eof = true;
            return result;
        }
    }

    // The ByteArrayDataWrapper does not do any trimming by default, can reuse the function
    async nextLineNoTrim() {
        return this.nextLine();
    }
}

export default TabixBufferedLineReader