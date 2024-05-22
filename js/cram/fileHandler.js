import {igvxhr} from "../../node_modules/igv-utils/src/index.js"
import {buildOptions} from "../util/igvUtils.js"
import BufferCache from "./bufferCache.js"

export default class FileHandler {

    constructor(source, config) {
        this.position = 0
        this.url = source
        this.config = config
        this.cache = new BufferCache({
            fetch: (start, length) => this._fetch(start, length),
        })
    }

    async _fetch(position, length) {

        const loadRange = {start: position, size: length}
        this._stat = {size: undefined}
        const arrayBuffer = await igvxhr.loadArrayBuffer(this.url, buildOptions(this.config, {range: loadRange}))
        return Buffer.from(arrayBuffer)
    }

    async read(buffer, offset = 0, length = Infinity, position = 0) {

        if(length === 0) return

        let readPosition = position
        if (readPosition === null) {
            readPosition = this.position
            this.position += length
        }
        return this.cache.get(buffer, offset, length, position)
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
