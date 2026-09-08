import {igvxhr} from "../../node_modules/igv-utils/src/index.js"

const DEFAULT_CHUNK_SIZE = 65536
const DEFAULT_MAX_CHUNKS = 8

/**
 * A caching loader for the many small, scattered reads made while walking the R-tree and B+ tree indexes of a
 * bigbed/bigwig file, and while reading the file header.
 *
 * Reads are aligned to fixed size chunks which are cached, so the 4 byte node header read and the node body
 * that follows it -- and usually several sibling nodes as well -- are satisfied by a single http request.  Reads
 * larger than the chunk size bypass the cache;  the leaf data reads, which are consolidated by the callers, are
 * not cached here.
 *
 * Implements the subset of the igvxhr interface used by the index readers (loadArrayBuffer).
 */
export default class ChunkLoader {

    chunkCache = new Map()   // chunk index -> ArrayBuffer.  Map preserves insertion order, used for LRU eviction.
    pending = new Map()      // chunk index -> promise for an in-flight request covering that chunk

    constructor(chunkSize = DEFAULT_CHUNK_SIZE, maxChunks = DEFAULT_MAX_CHUNKS) {
        this.chunkSize = chunkSize
        this.maxChunks = maxChunks
    }

    /**
     * @param path
     * @param options - igvxhr options, including a byte {range: {start, size}}
     * @returns {Promise<ArrayBuffer>}
     */
    async loadArrayBuffer(path, options = {}) {

        const range = options.range
        if (!range || !range.size || range.size > this.chunkSize) {
            return igvxhr.loadArrayBuffer(path, options)
        }

        const firstChunk = Math.floor(range.start / this.chunkSize)
        const lastChunk = Math.floor((range.start + range.size - 1) / this.chunkSize)

        await this.#fetchChunks(path, options, firstChunk, lastChunk)

        // Assemble the requested range from the cached chunks
        const result = new Uint8Array(range.size)
        let bytesCopied = 0
        for (let i = firstChunk; i <= lastChunk; i++) {
            const chunk = this.#getChunk(i)
            if (!chunk) break
            const chunkStart = i * this.chunkSize
            const from = Math.max(0, range.start - chunkStart)
            const to = Math.min(chunk.byteLength, range.start + range.size - chunkStart)
            if (to <= from) break
            result.set(new Uint8Array(chunk, from, to - from), bytesCopied)
            bytesCopied += to - from
        }

        if (bytesCopied < range.size) {
            // The cached chunks did not cover the requested range.  This happens only if a chunk was truncated,
            // that is if the server returned fewer bytes than asked for.  Rather than hand back a short buffer,
            // discard the chunks and make the request the caller actually asked for.
            for (let i = firstChunk; i <= lastChunk; i++) {
                this.chunkCache.delete(i)
            }
            return igvxhr.loadArrayBuffer(path, options)
        }
        return result.buffer
    }

    /**
     * Fetch any chunks in the range [firstChunk, lastChunk] that are neither cached nor already in flight.
     * Runs of adjacent missing chunks are fetched with a single request.
     */
    async #fetchChunks(path, options, firstChunk, lastChunk) {

        const waitFor = []
        let runStart = -1
        for (let i = firstChunk; i <= lastChunk + 1; i++) {
            const missing = i <= lastChunk && !this.chunkCache.has(i) && !this.pending.has(i)
            if (missing) {
                if (runStart < 0) runStart = i
            } else {
                if (runStart >= 0) {
                    waitFor.push(this.#startRun(path, options, runStart, i - 1))
                    runStart = -1
                }
                if (i <= lastChunk && this.pending.has(i)) {
                    waitFor.push(this.pending.get(i))
                }
            }
        }
        await Promise.all(waitFor)
    }

    /**
     * Start a request for chunks [firstChunk, lastChunk], recording it so concurrent readers wait on it rather
     * than issuing a duplicate request.
     */
    #startRun(path, options, firstChunk, lastChunk) {
        const promise = this.#fetchRun(path, options, firstChunk, lastChunk)
        for (let i = firstChunk; i <= lastChunk; i++) {
            this.pending.set(i, promise)
        }
        return promise.finally(() => {
            for (let i = firstChunk; i <= lastChunk; i++) {
                if (this.pending.get(i) === promise) {
                    this.pending.delete(i)
                }
            }
        })
    }

    async #fetchRun(path, options, firstChunk, lastChunk) {

        const start = firstChunk * this.chunkSize
        const data = await this.#load(path, options, start, (lastChunk - firstChunk + 1) * this.chunkSize)

        for (let i = firstChunk; i <= lastChunk; i++) {
            const offset = (i - firstChunk) * this.chunkSize
            if (offset >= data.byteLength) break     // End of file
            const end = Math.min(data.byteLength, offset + this.chunkSize)
            this.#putChunk(i, data.slice(offset, end))
        }
    }

    /**
     * Load a byte range, clamping it to the end of the file.  A chunk aligned read routinely extends past the
     * end of the file -- the R tree index is near the end -- and while most servers simply return the bytes
     * that exist, some reject the range with a 416.  In that case get the file length and retry, as
     * BufferedReader does.
     */
    async #load(path, options, start, size) {

        if (this.fileSize !== undefined) {
            if (start >= this.fileSize) {
                throw Error(`Range start ${start} is beyond the end of ${path} (${this.fileSize} bytes)`)
            }
            size = Math.min(size, this.fileSize - start)
        }
        try {
            return await igvxhr.loadArrayBuffer(path, Object.assign({}, options, {range: {start, size}}))
        } catch (e) {
            if (this.fileSize !== undefined || !(e.message && e.message.startsWith("416"))) {
                throw e
            }
            const headOptions = Object.assign({}, options)
            delete headOptions.range
            this.fileSize = await igvxhr.getContentLength(path, headOptions)
            if (start >= this.fileSize) {
                throw e
            }
            const clamped = Math.min(size, this.fileSize - start)
            return igvxhr.loadArrayBuffer(path, Object.assign({}, options, {range: {start, size: clamped}}))
        }
    }

    #getChunk(index) {
        const chunk = this.chunkCache.get(index)
        if (chunk) {
            // Refresh LRU position
            this.chunkCache.delete(index)
            this.chunkCache.set(index, chunk)
        }
        return chunk
    }

    #putChunk(index, chunk) {
        this.chunkCache.set(index, chunk)
        while (this.chunkCache.size > this.maxChunks) {
            this.chunkCache.delete(this.chunkCache.keys().next().value)
        }
    }
}
