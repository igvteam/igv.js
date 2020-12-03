import {buildOptions} from "../util/igvUtils.js";
import igvxhr from "../igvxhr.js";
import {bgzBlockSize, unbgzf} from "../bam/bgzf.js";

class BGZipLineReader {

    constructor(config) {
        this.config = config;
        this.filePtr = 0;
        this.bufferPtr = 0;
        this.buffer;
    }

    async nextLine() {

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
                    await this.readNextBlock()
                }
            }
        } catch (e) {
            console.warn(e);
            this.eof = true;
            return result;
        }
    }

    async readNextBlock() {

        const bsizeOptions = buildOptions(this.config, {
            range: {
                start: this.filePtr,
                size: 26
            }
        });
        const abuffer = await igvxhr.loadArrayBuffer(this.config.url, bsizeOptions)
        const bufferSize = bgzBlockSize(abuffer);
        //console.log(`next block ${this.filePtr}  ${bufferSize}`);

        if (bufferSize === 0) {
            this.eof = true;
            this.buffer = undefined;
        } else {

            const options = buildOptions(this.config, {range: {start: this.filePtr, size: bufferSize}});
            const data = await igvxhr.loadArrayBuffer(this.config.url, options);
            if (data.byteLength < bufferSize) {
                this.eof = true; // Assumption
            }
            this.buffer = unbgzf(data);
            this.bufferPtr = 0;
            this.filePtr += data.byteLength; //data.byteLength;
        }
    }

    // BGZipLineReader does not do any trimming by default, can reuse the function
    async nextLineNoTrim() {
        return this.nextLine();
    }
}

export default BGZipLineReader