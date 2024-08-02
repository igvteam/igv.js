import {igvxhr, FileUtils} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"
import Buffer from "./buffer/buffer.js"

export default class FileHandler {

    constructor(source, config) {
        this.position = 0
        this.url = source
        this.config = config
        if (FileUtils.isFile(source) || config.cacheFetches === false) {
            this.useCache = false
        } else {
            this.useCache = true
            this.cache = new BufferCache({
                fetch: (start, length) => this._fetch(start, length),
                fetchSize: config.fetchSize || 10000
            })
        }
    }

    async _fetch(position, length) {

        const loadRange = {start: position, size: length}
        this._stat = {size: undefined}
        const arrayBuffer = await igvxhr.loadArrayBuffer(this.url, buildOptions(this.config, {range: loadRange}))
        return Buffer.from(arrayBuffer)
    }

    async read(buffer, offset = 0, length = Infinity, position = 0) {

        if(this.useCache) {
            await this.cache.get(buffer, offset, position, length)
        } else {
            const buf = await this._fetch(position, length)
            buf.copy(buffer, offset)
        }
        return {bytesRead: length, buffer}
    }

    async readFile() {
        const arrayBuffer = await igvxhr.loadArrayBuffer(this.url, buildOptions(this.config))
        return Buffer.from(arrayBuffer)
    }

    async stat() {
        if (!this._stat) {
            const buf = Buffer.allocUnsafe(10)
            await this.read(buf, 0, 10, 0)
            if (!this._stat)
                throw new Error(`unable to determine size of file at ${this.url}`)
        }
        return this._stat
    }
}

class BufferCache {

    constructor({fetch, fetchSize = 30000}) {
        this.fetch = fetch
        this.position = 0
        this.buffer = Buffer.allocUnsafe(0)
        this.fetchSize = fetchSize
    }

    async get(outputBuffer, offset, start, length) {

        if (outputBuffer.length < offset + length) {
            throw new Error('output buffer not big enough for request')
        }

        if (start >= this.position && start + length <= this.position + this.buffer.length) {
            // Complete overlap
        } else {
            const l = Math.max(length, this.fetchSize)
            this.buffer = await this.fetch(start, l)
            this.position = start

        }

        const targetStart = offset
        const sourceStart = start - this.position
        const sourceEnd = sourceStart + length

        this.buffer.copy(outputBuffer, targetStart, sourceStart, sourceEnd)

    }
}
