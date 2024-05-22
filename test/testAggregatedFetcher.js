import "./utils/mockObjects.js"
import AggregatingFetcher from "../js/cram/aggregatingFetcher.js"
import {igvxhr} from "../node_modules/igv-utils/src/index.js"

import {assert} from 'chai'

suite("testAggregatingFetcher", function () {

    test("read", async function () {

        this.timeout(100000000)

        const url = 'test/data/misc/BufferedReaderTest.bin'

        //(key, start, end) => Promise({ headers, buffer })
        const fetch = async (url, start, end) => {
            const range = {start: start, size: end - start}
            const arrayBuffer = await igvxhr.loadArrayBuffer(url, range)
            return {
                buffer: Buffer.from(arrayBuffer)
            }
        }

        // const range = {start: 0, size: 256}
         const aggregator = new AggregatingFetcher({fetch})
        // const data = await aggregator.fetch(url, range.start, range.start + range.size)
        // const arrayBuffer = data.buffer.slice().buffer
        // const dataView = new DataView(arrayBuffer)
        // for (let i = 0; i < range.size; i++) {
        //     var expectedValue = -128 +  i
        //     var value = dataView.getInt8(i)
        //     assert.equal(expectedValue, value)
        // }

        // Multiple small requests
        const promises = []
        for(let i=0; i < 200; i += 10) {
            const range = {start: i, size: 10}
            promises.push(aggregator.fetch(url, range.start, range.start + range.size + 1))
        }
        let start =0
        const size = 10
        for(let p of promises) {
            const data = await p
            const arrayBuffer = data.buffer.slice().buffer
            const dataView = new DataView(arrayBuffer)
            for (let i = start; i < start + size; i++) {
                var expectedValue = -128 + i
                var value = dataView.getInt8(i)
                assert.equal(expectedValue, value)
            }
            start += 10
        }
    })
})
