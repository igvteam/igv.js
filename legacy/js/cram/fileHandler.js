import {igvxhr, FileUtils} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"


export default class FileHandler {

    constructor(source, config) {
        this.position = 0
        this.url = source
        this.config = config
        if (FileUtils.isFile(source) || config.cacheFetches === false) {
            this.useCache = false
        } else {
            this.useCache = true
            this.cache = new Cache({
                fetch: (start, length) => this._fetch(start, length),
                fetchSize: config.fetchSize || 10000
            })
        }
    }

    async _fetch(position, length) {
        const loadRange = {start: position, size: length}
        const arrayBuffer = await igvxhr.loadArrayBuffer(this.url, buildOptions(this.config, {range: loadRange}))
        return arrayBuffer
    }

    async read(length, position = 0) {

        let buf
        if (this.useCache) {
            buf = await this.cache.get(position, length)
        } else {
            buf = await this._fetch(position, length)
        }
        return new Uint8Array(buf)
    }

    async readFile() {
        const arrayBuffer = await igvxhr.loadArrayBuffer(this.url, buildOptions(this.config))
        return new Uint8Array(arrayBuffer)
    }

}

/**
 * A crude cache designed for observed access patterns of the cram-js library for cram files
 */

class Cache {

    maxChunkCount = 5
    chunks = []

    constructor({fetch, fetchSize = 30000}) {
        this.fetch = fetch
        this.fetchSize = fetchSize
    }

    async get(start, length) {

        const end = start + length
        for (let c of this.chunks) {
           // console.log("Cache hit")
            if (c.contains(start, end)) {
                const offset = start - c.start
                return c.buffer.slice(offset, offset + length)
            }
        }

        //console.log("Cache miss")
        const l = Math.max(length, this.fetchSize)
        const s = Math.max(0, start - 1000)
        const e = start + l + 1000
        const buffer = await this.fetch(s, e - s)
        const c = new Chunk(s, e, buffer)
        if (this.chunks.length > this.maxChunkCount) this.chunks.shift()
        this.chunks.push(c)

        const bufferStart = start - c.start
        const bufferEnd = bufferStart + length
        return buffer.slice(bufferStart, bufferEnd)

    }
}

class Chunk {

    constructor(start, end, buffer) {
        this.start = start
        this.end = end
        this.buffer = buffer
    }

    contains(start, end) {
        return start >= this.start && end <= this.end
    }
}
