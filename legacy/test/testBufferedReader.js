import "./utils/mockObjects.js"
import BufferedReader from "../js/bigwig/bufferedReader.js"
import {assert} from 'chai'

suite("testBigWig", function () {

    test("read", async function () {

        const url = 'test/data/misc/BufferedReaderTest.bin'

        const range = {start: 25, size: 100}
        const bufferedReader = new BufferedReader({url: url}, 16)

        const dataView = await bufferedReader.dataViewForRange(range)
        assert.ok(dataView)
        for (let i = 0; i < range.size; i++) {
            var expectedValue = -128 + range.start + i
            var value = dataView.getInt8(i)
            assert.equal(expectedValue, value)
        }
    })
})
