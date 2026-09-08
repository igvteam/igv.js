import "./utils/mockObjects.js"
import {assert} from 'chai'
import {igvxhr} from "../node_modules/igv-utils/src/index.js"
import ChunkLoader from "../js/bigwig/chunkLoader.js"
import BWReader from "../js/bigwig/bwReader.js"

/**
 * Wrap igvxhr.loadArrayBuffer to count requests for the duration of "fn".
 */
async function countRequests(fn) {
    const original = igvxhr.loadArrayBuffer.bind(igvxhr)
    const requests = []
    igvxhr.loadArrayBuffer = function (url, options) {
        requests.push(options && options.range ? options.range.size : -1)
        return original(url, options)
    }
    try {
        const result = await fn()
        return {result, requests}
    } finally {
        igvxhr.loadArrayBuffer = original
    }
}

suite("testChunkLoader", function () {

    const url = "test/data/bb/myBigBed2.bb"

    test("chunked reads match direct reads", async function () {

        const chunkLoader = new ChunkLoader(1024, 4)
        const ranges = [{start: 0, size: 64}, {start: 64, size: 100}, {start: 1000, size: 100}, {start: 5000, size: 8}]

        for (let range of ranges) {
            const expected = new Uint8Array(await igvxhr.loadArrayBuffer(url, {range}))
            const actual = new Uint8Array(await chunkLoader.loadArrayBuffer(url, {range}))
            assert.deepEqual(Array.from(actual), Array.from(expected), `range ${range.start}-${range.size}`)
        }
    })

    test("adjacent reads are coalesced into a single request", async function () {

        const chunkLoader = new ChunkLoader(65536, 4)
        const {requests} = await countRequests(async () => {
            for (let start = 0; start < 4096; start += 4) {
                await chunkLoader.loadArrayBuffer(url, {range: {start, size: 4}})
            }
        })
        assert.equal(requests.length, 1)
    })

    /**
     * Install a stubbed igvxhr serving "fileSize" synthetic bytes.  If "strict" the server rejects any range
     * extending past the end of the file with a 416 rather than clamping it, as some servers do.
     */
    function stubServer(fileSize, strict) {
        const file = new Uint8Array(fileSize).map((ignore, i) => i % 256)
        const original = {loadArrayBuffer: igvxhr.loadArrayBuffer, getContentLength: igvxhr.getContentLength}
        const stub = {requests: 0, contentLengthRequests: 0, file}
        igvxhr.loadArrayBuffer = async function (url, options) {
            stub.requests++
            const {start, size} = options.range
            if (start >= fileSize || (strict && start + size > fileSize)) {
                throw Error("416 Requested Range Not Satisfiable")
            }
            return file.buffer.slice(start, Math.min(fileSize, start + size))
        }
        igvxhr.getContentLength = async function () {
            stub.contentLengthRequests++
            return fileSize
        }
        stub.restore = () => Object.assign(igvxhr, original)
        return stub
    }

    test("reads at the end of file return the available bytes", async function () {

        const stub = stubServer(544, false)
        try {
            const chunkLoader = new ChunkLoader(256, 4)
            const data = await chunkLoader.loadArrayBuffer("file", {range: {start: 512, size: 32}})
            assert.deepEqual(Array.from(new Uint8Array(data)), Array.from(stub.file.slice(512, 544)))
        } finally {
            stub.restore()
        }
    })

    test("a truncated read is never returned in place of the requested range", async function () {

        const stub = stubServer(544, false)
        try {
            // The last chunk holds 32 bytes;  a request for 256 bytes from it cannot be satisfied from cache.
            const chunkLoader = new ChunkLoader(256, 4)
            const data = await chunkLoader.loadArrayBuffer("file", {range: {start: 512, size: 256}})
            assert.equal(data.byteLength, 32)   // What the server itself returns for that range
        } finally {
            stub.restore()
        }
    })

    test("a server that rejects ranges past EOF is handled", async function () {

        const stub = stubServer(544, true)
        try {
            const chunkLoader = new ChunkLoader(256, 4)

            // Chunk 2 (512-767) extends past EOF, so the chunk aligned request is rejected with a 416
            const data = await chunkLoader.loadArrayBuffer("file", {range: {start: 520, size: 8}})
            assert.deepEqual(Array.from(new Uint8Array(data)), Array.from(stub.file.slice(520, 528)))
            assert.equal(stub.contentLengthRequests, 1)

            // The file length is now known, so subsequent reads are clamped rather than retried
            const requests = stub.requests
            await chunkLoader.loadArrayBuffer("file", {range: {start: 300, size: 8}})
            assert.equal(stub.requests, requests + 1)
            assert.equal(stub.contentLengthRequests, 1)
        } finally {
            stub.restore()
        }
    })

    test("concurrent reads of the same chunk issue one request", async function () {

        const chunkLoader = new ChunkLoader(65536, 4)
        const {requests} = await countRequests(async () => {
            await Promise.all([0, 4, 8, 12].map(start => chunkLoader.loadArrayBuffer(url, {range: {start, size: 4}})))
        })
        assert.equal(requests.length, 1)
    })

    test("bigbed query request count", async function () {

        const {result, requests} = await countRequests(async () => {
            const reader = new BWReader({url, format: "bigbed"})
            return reader.readFeatures("chr7", 0, "chr7", Number.MAX_SAFE_INTEGER)
        })
        assert.equal(result.length, 3339)
        // Header + chrom tree + R-tree index + data.  Prior to chunk caching this took 12 requests, 4 of them
        // 4 bytes long.
        assert.isAtMost(requests.length, 4)
        assert.equal(requests.filter(size => size >= 0 && size <= 16).length, 0)
    })
})
