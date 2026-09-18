import "./utils/mockObjects.js"
import {assert} from 'chai'
import {Cache} from "../js/cram/fileHandler.js"

/**
 * Builds a fetch function over a synthetic "file" of the given size, where each byte equals its own
 * offset mod 256.  "maxResponseSize" caps the size of a single response, emulating an intermediary
 * that truncates range requests.
 */
function makeFetch(fileSize, maxResponseSize = Number.MAX_SAFE_INTEGER) {
    const calls = []
    const fetch = async (start, length) => {
        calls.push({start, length})
        const size = Math.max(0, Math.min(length, fileSize - start, maxResponseSize))
        const buffer = new ArrayBuffer(size)
        const bytes = new Uint8Array(buffer)
        for (let i = 0; i < size; i++) {
            bytes[i] = (start + i) % 256
        }
        return buffer
    }
    return {fetch, calls}
}

function assertBytes(buffer, start, length) {
    const bytes = new Uint8Array(buffer)
    assert.equal(bytes.length, length, `expected ${length} bytes at ${start}, got ${bytes.length}`)
    for (let i = 0; i < length; i++) {
        assert.equal(bytes[i], (start + i) % 256, `wrong byte at offset ${start + i}`)
    }
}

suite("testCramFileHandler", function () {

    test("reads within a cached chunk", async function () {
        const {fetch, calls} = makeFetch(1000000)
        const cache = new Cache({fetch, fetchSize: 10000})

        assertBytes(await cache.get(5000, 100), 5000, 100)
        assert.equal(calls.length, 1)

        // Satisfied by the chunk fetched above -- no second request
        assertBytes(await cache.get(5100, 200), 5100, 200)
        assert.equal(calls.length, 1)
    })

    test("a truncated response does not poison later reads", async function () {
        // The file is large, but nothing between here and it will return more than 5000 bytes at a time.
        const {fetch, calls} = makeFetch(1000000, 5000)
        const cache = new Cache({fetch, fetchSize: 10000})

        // Asks for ~11000 bytes from offset 0, receives 5000
        assertBytes(await cache.get(500, 100), 500, 100)
        assert.equal(calls.length, 1)

        // Offset 7000 lies inside the range that was *requested* but outside what arrived.  The cache
        // must go back to the server rather than report a hit and hand back a short buffer.
        assertBytes(await cache.get(7000, 100), 7000, 100)
        assert.equal(calls.length, 2)
    })

    test("a read running past the end of the file returns the available bytes", async function () {
        const {fetch} = makeFetch(2203)
        const cache = new Cache({fetch, fetchSize: 10000})

        assertBytes(await cache.get(0, 26), 0, 26)
        assertBytes(await cache.get(2100, 103), 2100, 103)

        // 2203 is the end of the file; a 50 byte read there yields what exists, not zero padding
        assertBytes(await cache.get(2180, 50), 2180, 23)
    })

    test("evicting chunks does not lose data", async function () {
        const {fetch} = makeFetch(1000000)
        const cache = new Cache({fetch, fetchSize: 10000})

        // More distinct regions than maxChunkCount, so the earliest chunks are evicted and refetched
        for (let i = 0; i < 10; i++) {
            assertBytes(await cache.get(i * 50000, 100), i * 50000, 100)
        }
        assertBytes(await cache.get(0, 100), 0, 100)
    })
})
